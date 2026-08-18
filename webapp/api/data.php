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

        case 'chant_delete':
            handleChantDelete($pdo);
            break;

        case 'file_save':
            handleFileSave($pdo);
            break;

        case 'file_delete':
            handleFileDelete($pdo);
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

function isAdminUser(): bool
{
    return ($_SESSION['user']['role'] ?? '') === 'admin';
}

function requireWriteAccess(): void
{
    if (!isAdminUser()) {
        respondJson(403, [
            'success' => false,
            'message' => 'Droits insuffisants pour modifier la base.',
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
}

function requestValue(string $key): string
{
    $value = $_REQUEST[$key] ?? '';
    return is_string($value) ? trim($value) : '';
}

function normalizePath(string $value): string
{
    $value = str_replace('\\', '/', $value);
    $value = preg_replace('#/+#', '/', $value) ?? '';
    $value = trim($value, '/');

    if ($value === '') {
        return '';
    }

    foreach (explode('/', $value) as $segment) {
        if ($segment === '.' || $segment === '..') {
            throw new RuntimeException('Chemin invalide.');
        }
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
 * Level 1 + 2: sub-folders of the current path, then chants stored exactly at this path.
 */
function handleList(PDO $pdo): void
{
    $path = normalizePath(requestValue('path'));

    $folders = listChildFolders($pdo, $path);

    $statement = $pdo->prepare(
        'SELECT c.ID, c.Nom, c.Path, c.DateAjout, c.Cote, c.Informations,
                (SELECT COUNT(*) FROM `Fichier` f WHERE f.ChantID = c.ID) AS FileCount
         FROM `Chant` c
         WHERE c.Path = :path
         ORDER BY c.Nom ASC'
    );
    $statement->execute([':path' => $path]);

    respondJson(200, [
        'success' => true,
        'path' => $path,
        'parent' => $path === '' ? null : (string) preg_replace('#/?[^/]+$#', '', $path),
        'canEdit' => isAdminUser(),
        'folders' => $folders,
        'chants' => array_map('mapChantRow', $statement->fetchAll()),
    ]);
}

function listChildFolders(PDO $pdo, string $path): array
{
    if ($path === '') {
        $statement = $pdo->query('SELECT DISTINCT `Path` FROM `Chant` WHERE `Path` <> \'\'');
        $rows = $statement->fetchAll();
        $prefix = '';
    } else {
        $statement = $pdo->prepare(
            'SELECT DISTINCT `Path` FROM `Chant` WHERE `Path` LIKE :prefix ESCAPE \'\\\\\''
        );
        $statement->execute([':prefix' => likeEscape($path) . '/%']);
        $rows = $statement->fetchAll();
        $prefix = $path . '/';
    }

    $names = [];
    foreach ($rows as $row) {
        $candidate = (string) $row['Path'];
        if ($prefix !== '' && strpos($candidate, $prefix) !== 0) {
            continue;
        }

        $remainder = substr($candidate, strlen($prefix));
        if ($remainder === '' || $remainder === false) {
            continue;
        }

        $segment = explode('/', $remainder)[0];
        if ($segment !== '') {
            $names[$segment] = true;
        }
    }

    $folders = [];
    foreach (array_keys($names) as $name) {
        $folders[] = [
            'name' => $name,
            'path' => $prefix . $name,
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
            'canEdit' => isAdminUser(),
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
        'canEdit' => isAdminUser(),
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
        'canEdit' => isAdminUser(),
        'files' => array_map('mapFileRow', $statement->fetchAll()),
    ]);
}

function handleChantSave(PDO $pdo): void
{
    requireWriteAccess();

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

    respondJson(200, [
        'success' => true,
        'id' => $id,
    ]);
}

function handleChantDelete(PDO $pdo): void
{
    requireWriteAccess();

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
    requireWriteAccess();

    $id = nullableInt('id', 1, PHP_INT_MAX);
    $chantId = nullableInt('chant_id', 1, PHP_INT_MAX);
    $nomFichier = normalizeName(requestValue('nom_fichier'), 'Le nom du fichier');
    $tonalite = nullableText('tonalite', 16);
    $accords = booleanValue('accords');
    $nbVoix = nullableInt('nb_voix', 0, 32);
    $informations = nullableText('informations');

    if ($chantId === null) {
        throw new RuntimeException('Chaque fichier doit etre lie a un chant.');
    }

    $exists = $pdo->prepare('SELECT 1 FROM `Chant` WHERE ID = :id');
    $exists->execute([':id' => $chantId]);
    if ($exists->fetchColumn() === false) {
        throw new RuntimeException('Le chant lie est introuvable.');
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

function handleFileDelete(PDO $pdo): void
{
    requireWriteAccess();

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

function mapChantRow(array $row): array
{
    return [
        'id' => (int) $row['ID'],
        'nom' => (string) $row['Nom'],
        'path' => (string) $row['Path'],
        'dateAjout' => (string) $row['DateAjout'],
        'cote' => $row['Cote'] === null ? null : (int) $row['Cote'],
        'informations' => $row['Informations'] === null ? '' : (string) $row['Informations'],
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
