<?php

declare(strict_types=1);

require_once __DIR__ . '/../config.php';

session_start();

applyCorsHeaders();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

requireAuthenticatedUser();

const DATA_MAX_PATH_LENGTH = 500;
const DATA_MAX_NAME_LENGTH = 255;
const DATA_SEED_EXTENSIONS = ['pdf', 'mp3', 'm4a', 'musicxml', 'mxl', 'xml'];
const DATA_SEED_EXCLUDED_ROOTS = ['Recycle Bin', 'programmes'];

$action = (string) ($_REQUEST['action'] ?? 'list');

try {
    $pdo = resolveDatabase();
    ensureSchema($pdo);

    switch ($action) {
        case 'list':
            handleList($pdo);
            break;

        case 'search':
            handleSearch($pdo);
            break;

        case 'files':
            handleFiles($pdo);
            break;

        case 'chant_save':
            handleChantSave($pdo);
            break;

        case 'auteurs':
            handleAuteurs($pdo);
            break;

        case 'chant_detail':
            handleChantDetail($pdo);
            break;

        case 'chant_delete':
            handleChantDelete($pdo);
            break;

        case 'file_save':
            handleFileSave($pdo);
            break;

        case 'file_delete':
            handleFileDelete($pdo);
            break;

        case 'file_move':
            handleFileMove($pdo);
            break;

        case 'chant_options':
            handleChantOptions($pdo);
            break;

        case 'seed':
            handleSeed($pdo);
            break;

        default:
            throw new RuntimeException('Action non supportee.');
    }
} catch (Throwable $error) {
    respondJson(400, [
        'success' => false,
        'message' => $error->getMessage(),
    ]);
}

function respondJson(int $statusCode, array $payload): void
{
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function applyCorsHeaders(): void
{
    $origin = (string) ($_SERVER['HTTP_ORIGIN'] ?? '');
    $isAllowedOrigin = $origin === WEBAPP_ALLOWED_ORIGIN
        || $origin === 'null'
        || preg_match('/^https?:\/\/localhost(:\d+)?$/i', $origin) === 1
        || preg_match('/^https?:\/\/127\.0\.0\.1(:\d+)?$/i', $origin) === 1;

    if ($origin !== '' && $isAllowedOrigin) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Vary: Origin');
    }

    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Max-Age: 86400');
}

function requireAuthenticatedUser(): void
{
    if (empty($_SESSION['user'])) {
        respondJson(401, [
            'success' => false,
            'message' => 'Authentification requise.',
        ]);
    }
}

function resolveDatabase(): PDO
{
    $legacyConnectionFile = dirname(__DIR__, 2) . '/php/connexion.php';

    if (!file_exists($legacyConnectionFile)) {
        throw new RuntimeException('Configuration de base de donnees introuvable.');
    }

    require_once $legacyConnectionFile;

    if (!defined('serveur') || !defined('nom_bd') || !defined('db_user') || !defined('db_pass')) {
        throw new RuntimeException('Identifiants de base de donnees manquants.');
    }

    return new PDO(
        'mysql:host=' . serveur . ';dbname=' . nom_bd . ';charset=utf8mb4',
        db_user,
        db_pass,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]
    );
}

function ensureSchema(PDO $pdo): void
{
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS `Chant` (
            `ID` INT UNSIGNED NOT NULL AUTO_INCREMENT,
            `Nom` VARCHAR(255) NOT NULL,
            `Path` VARCHAR(500) NOT NULL DEFAULT \'\',
            `DateAjout` DATETIME NOT NULL,
            `Cote` TINYINT UNSIGNED NULL,
            `Informations` TEXT NULL,
            PRIMARY KEY (`ID`),
            KEY `idx_chant_path` (`Path`(191)),
            KEY `idx_chant_nom` (`Nom`(191))
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );

    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS `Fichier` (
            `ID` INT UNSIGNED NOT NULL AUTO_INCREMENT,
            `NomFichier` VARCHAR(255) NOT NULL,
            `DateAjout` DATETIME NOT NULL,
            `ChantID` INT UNSIGNED NOT NULL,
            `Tonalite` VARCHAR(16) NULL,
            `Accords` TINYINT(1) NOT NULL DEFAULT 0,
            `NbVoix` TINYINT UNSIGNED NULL,
            `Informations` TEXT NULL,
            PRIMARY KEY (`ID`),
            KEY `idx_fichier_chant` (`ChantID`),
            CONSTRAINT `fk_fichier_chant` FOREIGN KEY (`ChantID`)
                REFERENCES `Chant` (`ID`) ON DELETE CASCADE ON UPDATE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );

    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS `Auteur` (
            `ID` INT UNSIGNED NOT NULL AUTO_INCREMENT,
            `Nom` VARCHAR(255) NOT NULL,
            PRIMARY KEY (`ID`),
            UNIQUE KEY `uq_auteur_nom` (`Nom`(191))
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );

    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS `ChantAuteur` (
            `ChantID` INT UNSIGNED NOT NULL,
            `AuteurID` INT UNSIGNED NOT NULL,
            PRIMARY KEY (`ChantID`, `AuteurID`),
            KEY `idx_chant_auteur_auteur` (`AuteurID`),
            CONSTRAINT `fk_chant_auteur_chant` FOREIGN KEY (`ChantID`)
                REFERENCES `Chant` (`ID`) ON DELETE CASCADE ON UPDATE CASCADE,
            CONSTRAINT `fk_chant_auteur_auteur` FOREIGN KEY (`AuteurID`)
                REFERENCES `Auteur` (`ID`) ON DELETE CASCADE ON UPDATE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );
}

function requestValue(string $key): string
{
    $value = $_REQUEST[$key] ?? '';
    return is_string($value) ? trim($value) : '';
}

function normalizePath(string $value): string
{
    $value = trim(str_replace('\\', '/', $value), '/');

    if ($value === '') {
        return '';
    }

    if (strpos($value, '/') !== false) {
        throw new RuntimeException('Le dossier ne peut contenir qu\'un seul niveau (pas de "/").');
    }

    if ($value === '.' || $value === '..') {
        throw new RuntimeException('Chemin invalide.');
    }

    if (mb_strlen($value) > DATA_MAX_PATH_LENGTH) {
        throw new RuntimeException('Chemin trop long.');
    }

    return $value;
}

function normalizeName(string $value, string $label): string
{
    if ($value === '') {
        throw new RuntimeException($label . ' est obligatoire.');
    }

    if (mb_strlen($value) > DATA_MAX_NAME_LENGTH) {
        throw new RuntimeException($label . ' est trop long.');
    }

    return $value;
}

function nullableInt(string $key, int $min, int $max): ?int
{
    $raw = requestValue($key);
    if ($raw === '') {
        return null;
    }

    if (!ctype_digit($raw)) {
        throw new RuntimeException('Valeur numerique invalide.');
    }

    $value = (int) $raw;
    if ($value < $min || $value > $max) {
        throw new RuntimeException('Valeur numerique hors limites.');
    }

    return $value;
}

function nullableText(string $key, int $maxLength = 5000): ?string
{
    $value = requestValue($key);
    if ($value === '') {
        return null;
    }

    return mb_substr($value, 0, $maxLength);
}

function booleanValue(string $key): int
{
    $value = mb_strtolower(requestValue($key));
    return in_array($value, ['1', 'true', 'on', 'oui', 'yes'], true) ? 1 : 0;
}

function currentTimestamp(): string
{
    date_default_timezone_set('Europe/Paris');
    return date('Y-m-d H:i:s');
}

function likeEscape(string $value): string
{
    return str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $value);
}

/**
 * Level 1 + 2: folders (only at the root, Path is a single folder name),
 * then chants stored in the selected folder.
 */
function handleList(PDO $pdo): void
{
    $path = normalizePath(requestValue('path'));

    $folders = $path === '' ? listRootFolders($pdo) : [];

    $statement = $pdo->prepare(
        'SELECT c.ID, c.Nom, c.Path, c.DateAjout, c.Cote, c.Informations,
                (SELECT COUNT(*) FROM `Fichier` f WHERE f.ChantID = c.ID) AS FileCount,
                (SELECT GROUP_CONCAT(a.Nom ORDER BY a.Nom SEPARATOR \', \')
                 FROM `ChantAuteur` ca INNER JOIN `Auteur` a ON a.ID = ca.AuteurID
                 WHERE ca.ChantID = c.ID) AS Auteurs
         FROM `Chant` c
         WHERE c.Path = :path
         ORDER BY c.Nom ASC'
    );
    $statement->execute([':path' => $path]);

    respondJson(200, [
        'success' => true,
        'path' => $path,
        'parent' => $path === '' ? null : '',
        'canEdit' => true,
        'folders' => $folders,
        'chants' => array_map('mapChantRow', $statement->fetchAll()),
    ]);
}

function listRootFolders(PDO $pdo): array
{
    $rows = $pdo->query('SELECT DISTINCT `Path` FROM `Chant` WHERE `Path` <> \'\' ORDER BY `Path` ASC')->fetchAll();

    $folders = [];
    foreach ($rows as $row) {
        $name = (string) $row['Path'];
        $folders[] = [
            'name' => $name,
            'path' => $name,
        ];
    }

    usort($folders, static fn (array $a, array $b): int => strcasecmp($a['name'], $b['name']));

    return $folders;
}

function handleSearch(PDO $pdo): void
{
    $term = requestValue('q');

    if (mb_strlen($term) < 2) {
        respondJson(200, [
            'success' => true,
            'canEdit' => true,
            'chants' => [],
        ]);
    }

    $pattern = '%' . likeEscape($term) . '%';

    $statement = $pdo->prepare(<<<'SQL'
        SELECT DISTINCT c.ID, c.Nom, c.Path, c.DateAjout, c.Cote, c.Informations,
               (SELECT COUNT(*) FROM `Fichier` f2 WHERE f2.ChantID = c.ID) AS FileCount
        FROM `Chant` c
        LEFT JOIN `Fichier` f ON f.ChantID = c.ID
        WHERE c.Nom LIKE :nom ESCAPE '\\'
           OR c.Path LIKE :path ESCAPE '\\'
           OR f.NomFichier LIKE :file ESCAPE '\\'
        ORDER BY c.Path ASC, c.Nom ASC
        LIMIT 300
        SQL
    );
    $statement->execute([
        ':nom' => $pattern,
        ':path' => $pattern,
        ':file' => $pattern,
    ]);

    respondJson(200, [
        'success' => true,
        'canEdit' => true,
        'chants' => array_map('mapChantRow', $statement->fetchAll()),
    ]);
}

/**
 * Level 3: files linked to a given chant.
 */
function handleFiles(PDO $pdo): void
{
    $chantId = nullableInt('chant_id', 1, PHP_INT_MAX);
    if ($chantId === null) {
        throw new RuntimeException('Identifiant de chant manquant.');
    }

    $statement = $pdo->prepare(
        'SELECT ID, NomFichier, DateAjout, ChantID, Tonalite, Accords, NbVoix, Informations
         FROM `Fichier`
         WHERE ChantID = :chant
         ORDER BY NomFichier ASC'
    );
    $statement->execute([':chant' => $chantId]);

    respondJson(200, [
        'success' => true,
        'chantId' => $chantId,
        'canEdit' => true,
        'files' => array_map('mapFileRow', $statement->fetchAll()),
    ]);
}

function handleChantSave(PDO $pdo): void
{
    $id = nullableInt('id', 1, PHP_INT_MAX);
    $nom = normalizeName(requestValue('nom'), 'Le nom du chant');
    $path = normalizePath(requestValue('path'));
    $cote = nullableInt('cote', 0, 5);
    $informations = nullableText('informations');

    if ($id === null) {
        $statement = $pdo->prepare(
            'INSERT INTO `Chant` (Nom, Path, DateAjout, Cote, Informations)
             VALUES (:nom, :path, :date, :cote, :informations)'
        );
        $statement->execute([
            ':nom' => $nom,
            ':path' => $path,
            ':date' => currentTimestamp(),
            ':cote' => $cote,
            ':informations' => $informations,
        ]);
        $id = (int) $pdo->lastInsertId();
    } else {
        $current = $pdo->prepare('SELECT Nom, Path FROM `Chant` WHERE ID = :id');
        $current->execute([':id' => $id]);
        $currentRow = $current->fetch();

        if ($currentRow === false) {
            throw new RuntimeException('Chant introuvable.');
        }

        if ((string) $currentRow['Nom'] !== $nom || (string) $currentRow['Path'] !== $path) {
            renameChantFolder((string) $currentRow['Path'], (string) $currentRow['Nom'], $path, $nom);
        }

        $statement = $pdo->prepare(
            'UPDATE `Chant`
             SET Nom = :nom, Path = :path, Cote = :cote, Informations = :informations
             WHERE ID = :id'
        );
        $statement->execute([
            ':nom' => $nom,
            ':path' => $path,
            ':cote' => $cote,
            ':informations' => $informations,
            ':id' => $id,
        ]);
    }

    saveChantAuteurs($pdo, $id, requestValue('auteurs'));

    respondJson(200, [
        'success' => true,
        'id' => $id,
    ]);
}

/**
 * Authors are entered as a comma separated list and created on the fly.
 */
function saveChantAuteurs(PDO $pdo, int $chantId, string $rawAuteurs): void
{
    $names = [];
    foreach (explode(',', $rawAuteurs) as $name) {
        $name = mb_substr(trim($name), 0, DATA_MAX_NAME_LENGTH);
        if ($name !== '' && !in_array($name, $names, true)) {
            $names[] = $name;
        }
    }

    $delete = $pdo->prepare('DELETE FROM `ChantAuteur` WHERE ChantID = :chant');
    $findAuteur = $pdo->prepare('SELECT ID FROM `Auteur` WHERE Nom = :nom');
    $insertAuteur = $pdo->prepare('INSERT INTO `Auteur` (Nom) VALUES (:nom)');
    $link = $pdo->prepare('INSERT INTO `ChantAuteur` (ChantID, AuteurID) VALUES (:chant, :auteur)');

    $pdo->beginTransaction();

    try {
        $delete->execute([':chant' => $chantId]);

        foreach ($names as $name) {
            $findAuteur->execute([':nom' => $name]);
            $auteurId = $findAuteur->fetchColumn();

            if ($auteurId === false) {
                $insertAuteur->execute([':nom' => $name]);
                $auteurId = $pdo->lastInsertId();
            }

            $link->execute([':chant' => $chantId, ':auteur' => $auteurId]);
        }

        $pdo->commit();
    } catch (Throwable $error) {
        $pdo->rollBack();
        throw $error;
    }
}

/**
 * Everything known about one chant: metadata, authors and linked files.
 */
function handleChantDetail(PDO $pdo): void
{
    $id = nullableInt('id', 1, PHP_INT_MAX);
    if ($id === null) {
        throw new RuntimeException('Identifiant de chant manquant.');
    }

    $statement = $pdo->prepare(
        'SELECT c.ID, c.Nom, c.Path, c.DateAjout, c.Cote, c.Informations,
                (SELECT COUNT(*) FROM `Fichier` f WHERE f.ChantID = c.ID) AS FileCount,
                (SELECT GROUP_CONCAT(a.Nom ORDER BY a.Nom SEPARATOR \', \')
                 FROM `ChantAuteur` ca INNER JOIN `Auteur` a ON a.ID = ca.AuteurID
                 WHERE ca.ChantID = c.ID) AS Auteurs
         FROM `Chant` c
         WHERE c.ID = :id'
    );
    $statement->execute([':id' => $id]);
    $chant = $statement->fetch();

    if ($chant === false) {
        throw new RuntimeException('Chant introuvable.');
    }

    $files = $pdo->prepare(
        'SELECT ID, NomFichier, DateAjout, ChantID, Tonalite, Accords, NbVoix, Informations
         FROM `Fichier`
         WHERE ChantID = :chant
         ORDER BY NomFichier ASC'
    );
    $files->execute([':chant' => $id]);

    respondJson(200, [
        'success' => true,
        'chant' => mapChantRow($chant),
        'files' => array_map('mapFileRow', $files->fetchAll()),
        'programmes' => loadChantProgrammes($pdo, $id),
    ]);
}

/**
 * Programmes are managed by programme.php, so their tables may not exist yet.
 */
function loadChantProgrammes(PDO $pdo, int $chantId): array
{
    try {
        $statement = $pdo->prepare(
            'SELECT DISTINCT p.ID, p.Date, p.Lieu, p.Occasion, p.Paroisse
             FROM `ProgrammeChant` pc
             INNER JOIN `Programme` p ON p.ID = pc.ProgrammeID
             WHERE pc.ChantID = :chant
             ORDER BY p.Date DESC'
        );
        $statement->execute([':chant' => $chantId]);
    } catch (Throwable $error) {
        return [];
    }

    return array_map(static fn (array $row): array => [
        'id' => (int) $row['ID'],
        'date' => (string) $row['Date'],
        'lieu' => (string) $row['Lieu'],
        'occasion' => (string) $row['Occasion'],
        'paroisse' => (string) $row['Paroisse'],
    ], $statement->fetchAll());
}

function handleAuteurs(PDO $pdo): void
{
    $rows = $pdo->query('SELECT ID, Nom FROM `Auteur` ORDER BY Nom ASC')->fetchAll();

    respondJson(200, [
        'success' => true,
        'auteurs' => array_map(static fn (array $row): array => [
            'id' => (int) $row['ID'],
            'nom' => (string) $row['Nom'],
        ], $rows),
    ]);
}

function handleChantDelete(PDO $pdo): void
{
    $id = nullableInt('id', 1, PHP_INT_MAX);
    if ($id === null) {
        throw new RuntimeException('Identifiant de chant manquant.');
    }

    $statement = $pdo->prepare('DELETE FROM `Chant` WHERE ID = :id');
    $statement->execute([':id' => $id]);

    respondJson(200, [
        'success' => true,
        'deleted' => $statement->rowCount(),
    ]);
}

function handleFileSave(PDO $pdo): void
{
    $id = nullableInt('id', 1, PHP_INT_MAX);
    $chantId = nullableInt('chant_id', 1, PHP_INT_MAX);
    $upload = pendingUpload();
    $nomFichier = normalizeName(
        requestValue('nom_fichier') !== '' ? requestValue('nom_fichier') : (string) ($upload['name'] ?? ''),
        'Le nom du fichier'
    );
    $tonalite = nullableText('tonalite', 16);
    $accords = booleanValue('accords');
    $nbVoix = nullableInt('nb_voix', 0, 32);
    $informations = nullableText('informations');

    if ($chantId === null) {
        throw new RuntimeException('Chaque fichier doit etre lie a un chant.');
    }

    $chant = $pdo->prepare('SELECT Nom, Path FROM `Chant` WHERE ID = :id');
    $chant->execute([':id' => $chantId]);
    $chantRow = $chant->fetch();
    if ($chantRow === false) {
        throw new RuntimeException('Le chant lie est introuvable.');
    }

    if ($upload !== null) {
        $nomFichier = storeUploadedFile($upload, (string) $chantRow['Path'], (string) $chantRow['Nom'], $nomFichier);
    }

    if ($id === null) {
        $statement = $pdo->prepare(
            'INSERT INTO `Fichier` (NomFichier, DateAjout, ChantID, Tonalite, Accords, NbVoix, Informations)
             VALUES (:nom, :date, :chant, :tonalite, :accords, :nbvoix, :informations)'
        );
        $statement->execute([
            ':nom' => $nomFichier,
            ':date' => currentTimestamp(),
            ':chant' => $chantId,
            ':tonalite' => $tonalite,
            ':accords' => $accords,
            ':nbvoix' => $nbVoix,
            ':informations' => $informations,
        ]);
        $id = (int) $pdo->lastInsertId();
    } else {
        $current = $pdo->prepare(
            'SELECT f.NomFichier, c.Nom AS ChantNom, c.Path AS ChantPath
             FROM `Fichier` f
             INNER JOIN `Chant` c ON c.ID = f.ChantID
             WHERE f.ID = :id'
        );
        $current->execute([':id' => $id]);
        $currentRow = $current->fetch();

        if ($currentRow === false) {
            throw new RuntimeException('Fichier introuvable.');
        }

        if ((string) $currentRow['NomFichier'] !== $nomFichier) {
            renameStoredFile(
                (string) $currentRow['ChantPath'],
                (string) $currentRow['ChantNom'],
                (string) $currentRow['NomFichier'],
                (string) $chantRow['Path'],
                (string) $chantRow['Nom'],
                $nomFichier
            );
        }

        $statement = $pdo->prepare(
            'UPDATE `Fichier`
             SET NomFichier = :nom, ChantID = :chant, Tonalite = :tonalite,
                 Accords = :accords, NbVoix = :nbvoix, Informations = :informations
             WHERE ID = :id'
        );
        $statement->execute([
            ':nom' => $nomFichier,
            ':chant' => $chantId,
            ':tonalite' => $tonalite,
            ':accords' => $accords,
            ':nbvoix' => $nbVoix,
            ':informations' => $informations,
            ':id' => $id,
        ]);
    }

    respondJson(200, [
        'success' => true,
        'id' => $id,
    ]);
}

function pendingUpload(): ?array
{
    if (!isset($_FILES['file']) || !is_array($_FILES['file'])) {
        return null;
    }

    $file = $_FILES['file'];
    $error = (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE);

    if ($error === UPLOAD_ERR_NO_FILE) {
        return null;
    }

    if ($error !== UPLOAD_ERR_OK) {
        throw new RuntimeException('Echec du televersement (code ' . $error . ').');
    }

    return [
        'name' => basename((string) ($file['name'] ?? '')),
        'tmp_name' => (string) ($file['tmp_name'] ?? ''),
    ];
}

/**
 * Saves the uploaded file inside /pdf/<Path>/<Nom du chant>/ and returns the stored name.
 */
function storeUploadedFile(array $upload, string $chantPath, string $chantName, string $requestedName): string
{
    $fileName = validateFileName($requestedName !== '' ? $requestedName : $upload['name']);

    $extension = strtolower((string) pathinfo($fileName, PATHINFO_EXTENSION));
    if (!in_array($extension, DATA_SEED_EXTENSIONS, true)) {
        throw new RuntimeException('Extension de fichier non autorisee.');
    }

    $targetDir = chantDirectory($chantPath, $chantName);

    if (!is_dir($targetDir) && !mkdir($targetDir, 0775, true) && !is_dir($targetDir)) {
        throw new RuntimeException('Impossible de creer le dossier du chant.');
    }

    $destination = $targetDir . DIRECTORY_SEPARATOR . $fileName;
    if (file_exists($destination)) {
        throw new RuntimeException('Un fichier portant ce nom existe deja dans ce chant.');
    }

    if (!move_uploaded_file($upload['tmp_name'], $destination)) {
        throw new RuntimeException('Impossible d\'enregistrer le fichier sur le serveur.');
    }

    return $fileName;
}

/**
 * Keeps the chant folder on disk in sync when its name or parent folder changes.
 */
function renameChantFolder(string $sourcePath, string $sourceName, string $targetPath, string $targetName): void
{
    $source = chantDirectory($sourcePath, $sourceName);

    if (!is_dir($source)) {
        return;
    }

    $destination = chantDirectory($targetPath, $targetName);

    if ($source === $destination) {
        return;
    }

    if (file_exists($destination)) {
        throw new RuntimeException('Un dossier portant ce nom existe deja.');
    }

    $parent = dirname($destination);
    if (!is_dir($parent) && !mkdir($parent, 0775, true) && !is_dir($parent)) {
        throw new RuntimeException('Impossible de creer le dossier parent.');
    }

    if (!rename($source, $destination)) {
        throw new RuntimeException('Impossible de renommer le dossier sur le serveur.');
    }
}

/**
 * Keeps the file on disk in sync when its name (or owning chant) changes.
 */
function renameStoredFile(
    string $sourcePath,
    string $sourceChant,
    string $sourceName,
    string $targetPath,
    string $targetChant,
    string $targetName
): void {
    $source = chantDirectory($sourcePath, $sourceChant) . DIRECTORY_SEPARATOR . validateFileName($sourceName);

    if (!is_file($source)) {
        return;
    }

    $fileName = validateFileName($targetName);
    $extension = strtolower((string) pathinfo($fileName, PATHINFO_EXTENSION));
    if (!in_array($extension, DATA_SEED_EXTENSIONS, true)) {
        throw new RuntimeException('Extension de fichier non autorisee.');
    }

    $targetDir = chantDirectory($targetPath, $targetChant);
    $destination = $targetDir . DIRECTORY_SEPARATOR . $fileName;

    if (file_exists($destination)) {
        throw new RuntimeException('Un fichier portant ce nom existe deja dans ce chant.');
    }

    if (!is_dir($targetDir) && !mkdir($targetDir, 0775, true) && !is_dir($targetDir)) {
        throw new RuntimeException('Impossible de creer le dossier du chant.');
    }

    if (!rename($source, $destination)) {
        throw new RuntimeException('Impossible de renommer le fichier sur le serveur.');
    }
}

function chantDirectory(string $chantPath, string $chantName): string
{
    $pdfRoot = realpath(dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . 'pdf');
    if ($pdfRoot === false || !is_dir($pdfRoot)) {
        throw new RuntimeException('Dossier /pdf introuvable.');
    }

    $segments = array_filter(
        [validateFolderName($chantPath), validateFolderName($chantName)],
        static fn (string $segment): bool => $segment !== ''
    );

    return $pdfRoot . DIRECTORY_SEPARATOR . implode(DIRECTORY_SEPARATOR, $segments);
}

function validateFileName(string $name): string
{
    $name = trim($name);

    if ($name === '' || $name === '.' || $name === '..') {
        throw new RuntimeException('Nom de fichier invalide.');
    }

    if (strpbrk($name, "/\\\0") !== false) {
        throw new RuntimeException('Le nom de fichier ne peut pas contenir de separateur.');
    }

    return mb_substr($name, 0, DATA_MAX_NAME_LENGTH);
}

function validateFolderName(string $name): string
{
    $name = trim($name);

    if ($name === '') {
        return '';
    }

    if ($name === '.' || $name === '..' || strpbrk($name, "/\\\0") !== false) {
        throw new RuntimeException('Nom de dossier invalide.');
    }

    return $name;
}

function handleFileDelete(PDO $pdo): void
{
    $id = nullableInt('id', 1, PHP_INT_MAX);
    if ($id === null) {
        throw new RuntimeException('Identifiant de fichier manquant.');
    }

    $statement = $pdo->prepare('DELETE FROM `Fichier` WHERE ID = :id');
    $statement->execute([':id' => $id]);

    respondJson(200, [
        'success' => true,
        'deleted' => $statement->rowCount(),
    ]);
}

/**
 * Moves the physical file into the target chant folder, then relinks the row.
 */
function handleFileMove(PDO $pdo): void
{
    $id = nullableInt('id', 1, PHP_INT_MAX);
    $targetChantId = nullableInt('chant_id', 1, PHP_INT_MAX);

    if ($id === null || $targetChantId === null) {
        throw new RuntimeException('Fichier ou chant de destination manquant.');
    }

    $statement = $pdo->prepare(
        'SELECT f.NomFichier, f.ChantID, c.Nom AS ChantNom, c.Path AS ChantPath
         FROM `Fichier` f
         INNER JOIN `Chant` c ON c.ID = f.ChantID
         WHERE f.ID = :id'
    );
    $statement->execute([':id' => $id]);
    $file = $statement->fetch();

    if ($file === false) {
        throw new RuntimeException('Fichier introuvable.');
    }

    if ((int) $file['ChantID'] === $targetChantId) {
        respondJson(200, ['success' => true, 'moved' => false]);
    }

    $statement = $pdo->prepare('SELECT Nom, Path FROM `Chant` WHERE ID = :id');
    $statement->execute([':id' => $targetChantId]);
    $target = $statement->fetch();

    if ($target === false) {
        throw new RuntimeException('Chant de destination introuvable.');
    }

    $fileName = validateFileName((string) $file['NomFichier']);
    $source = chantDirectory((string) $file['ChantPath'], (string) $file['ChantNom']) . DIRECTORY_SEPARATOR . $fileName;
    $targetDir = chantDirectory((string) $target['Path'], (string) $target['Nom']);
    $destination = $targetDir . DIRECTORY_SEPARATOR . $fileName;

    if (is_file($source)) {
        if (file_exists($destination)) {
            throw new RuntimeException('Un fichier portant ce nom existe deja dans le chant de destination.');
        }

        if (!is_dir($targetDir) && !mkdir($targetDir, 0775, true) && !is_dir($targetDir)) {
            throw new RuntimeException('Impossible de creer le dossier du chant de destination.');
        }

        if (!rename($source, $destination)) {
            throw new RuntimeException('Impossible de deplacer le fichier sur le serveur.');
        }
    }

    $statement = $pdo->prepare('UPDATE `Fichier` SET ChantID = :chant WHERE ID = :id');
    $statement->execute([':chant' => $targetChantId, ':id' => $id]);

    respondJson(200, [
        'success' => true,
        'moved' => true,
    ]);
}

function handleChantOptions(PDO $pdo): void
{
    $rows = $pdo->query('SELECT ID, Nom, Path FROM `Chant` ORDER BY Path ASC, Nom ASC')->fetchAll();

    respondJson(200, [
        'success' => true,
        'chants' => array_map(static fn (array $row): array => [
            'id' => (int) $row['ID'],
            'nom' => (string) $row['Nom'],
            'path' => (string) $row['Path'],
        ], $rows),
    ]);
}

/**
 * First-time population: walks the /pdf tree and creates one Chant per folder
 * containing files, plus one Fichier per file found in that folder.
 */
function handleSeed(PDO $pdo): void
{
    $reset = booleanValue('reset');

    if ($reset) {
        $pdo->exec('DELETE FROM `Fichier`');
        $pdo->exec('DELETE FROM `Chant`');
    } elseif ((int) $pdo->query('SELECT COUNT(*) FROM `Chant`')->fetchColumn() > 0) {
        throw new RuntimeException('La base contient deja des chants. Utilisez la reinitialisation pour repartir de zero.');
    }

    $pdfRoot = realpath(dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . 'pdf');
    if ($pdfRoot === false || !is_dir($pdfRoot)) {
        throw new RuntimeException('Dossier /pdf introuvable.');
    }

    $grouped = collectSeedEntries($pdfRoot);

    $insertChant = $pdo->prepare(
        'INSERT INTO `Chant` (Nom, Path, DateAjout, Cote, Informations) VALUES (:nom, :path, :date, NULL, NULL)'
    );
    $insertFile = $pdo->prepare(
        'INSERT INTO `Fichier` (NomFichier, DateAjout, ChantID, Tonalite, Accords, NbVoix, Informations)
         VALUES (:nom, :date, :chant, NULL, 0, NULL, NULL)'
    );

    $chantCount = 0;
    $fileCount = 0;

    $pdo->beginTransaction();

    try {
        foreach ($grouped as $entry) {
            $insertChant->execute([
                ':nom' => $entry['nom'],
                ':path' => $entry['path'],
                ':date' => $entry['date'],
            ]);
            $chantId = (int) $pdo->lastInsertId();
            $chantCount += 1;

            foreach ($entry['files'] as $file) {
                $insertFile->execute([
                    ':nom' => $file['nom'],
                    ':date' => $file['date'],
                    ':chant' => $chantId,
                ]);
                $fileCount += 1;
            }
        }

        $pdo->commit();
    } catch (Throwable $error) {
        $pdo->rollBack();
        throw $error;
    }

    respondJson(200, [
        'success' => true,
        'chants' => $chantCount,
        'fichiers' => $fileCount,
    ]);
}

function collectSeedEntries(string $pdfRoot): array
{
    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($pdfRoot, FilesystemIterator::SKIP_DOTS),
        RecursiveIteratorIterator::LEAVES_ONLY
    );

    $grouped = [];

    foreach ($iterator as $file) {
        if (!$file->isFile()) {
            continue;
        }

        $extension = strtolower($file->getExtension());
        if (!in_array($extension, DATA_SEED_EXTENSIONS, true)) {
            continue;
        }

        $relative = str_replace('\\', '/', substr($file->getPathname(), strlen($pdfRoot) + 1));
        $segments = explode('/', $relative);
        if (in_array($segments[0], DATA_SEED_EXCLUDED_ROOTS, true)) {
            continue;
        }

        // A Chant is a folder, so files sitting directly in /pdf are ignored.
        array_pop($segments);
        if (!$segments) {
            continue;
        }

        $chantName = mb_substr((string) array_pop($segments), 0, DATA_MAX_NAME_LENGTH);
        if ($chantName === '') {
            continue;
        }

        // Path holds a single folder name: keep only the direct parent folder.
        $chantPath = mb_substr((string) (array_pop($segments) ?? ''), 0, DATA_MAX_PATH_LENGTH);
        $key = mb_strtolower($chantPath . '/' . $chantName);

        if (!isset($grouped[$key])) {
            $grouped[$key] = [
                'nom' => $chantName,
                'path' => $chantPath,
                'date' => formatTimestamp(@filemtime($file->getPath())),
                'files' => [],
            ];
        }

        $grouped[$key]['files'][] = [
            'nom' => mb_substr($file->getBasename(), 0, DATA_MAX_NAME_LENGTH),
            'date' => formatTimestamp($file->getMTime()),
        ];
    }

    ksort($grouped);

    return $grouped;
}

function formatTimestamp($timestamp): string
{
    date_default_timezone_set('Europe/Paris');

    if (!is_int($timestamp) || $timestamp <= 0) {
        return date('Y-m-d H:i:s');
    }

    return date('Y-m-d H:i:s', $timestamp);
}

function mapChantRow(array $row): array
{
    return [
        'id' => (int) $row['ID'],
        'nom' => (string) $row['Nom'],
        'path' => (string) $row['Path'],
        'dateAjout' => (string) $row['DateAjout'],
        'cote' => $row['Cote'] === null ? null : (int) $row['Cote'],
        'informations' => $row['Informations'] === null ? '' : (string) $row['Informations'],
        'auteurs' => isset($row['Auteurs']) && $row['Auteurs'] !== null ? (string) $row['Auteurs'] : '',
        'fileCount' => (int) ($row['FileCount'] ?? 0),
    ];
}

function mapFileRow(array $row): array
{
    return [
        'id' => (int) $row['ID'],
        'nomFichier' => (string) $row['NomFichier'],
        'dateAjout' => (string) $row['DateAjout'],
        'chantId' => (int) $row['ChantID'],
        'tonalite' => $row['Tonalite'] === null ? '' : (string) $row['Tonalite'],
        'accords' => (int) $row['Accords'] === 1,
        'nbVoix' => $row['NbVoix'] === null ? null : (int) $row['NbVoix'],
        'informations' => $row['Informations'] === null ? '' : (string) $row['Informations'],
    ];
}
