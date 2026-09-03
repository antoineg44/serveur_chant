<?php

declare(strict_types=1);

require_once __DIR__ . '/../config.php';

session_start();

applyCorsHeaders();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

const DATA_MAX_PATH_LENGTH = 500;
const DATA_MAX_NAME_LENGTH = 255;
const DATA_SEED_EXTENSIONS = ['pdf', 'mp3', 'm4a', 'musicxml', 'mxl', 'xml'];
const DATA_SEED_EXCLUDED_ROOTS = ['Recycle Bin', 'programmes'];

// YMusic project (search/download proxy). Called server-side because its API is
// CORS-restricted to its own origin.
const YMUSIC_INTERFACE_URL = 'https://musiques.partitions.ovh/php/yt/interface.php';
const YMUSIC_BASE_URL = 'https://musiques.partitions.ovh';
const YMUSIC_AUDIO_EXTENSIONS = ['mp3', 'm4a', 'wav', 'webm', 'ogg', 'oga', 'opus', 'aac', 'flac'];

$action = (string) ($_REQUEST['action'] ?? 'list');

// The homepage displays aggregate stats publicly, without requiring a login.
$publicActions = ['stats'];
if (!(in_array($action, $publicActions, true) && $_SERVER['REQUEST_METHOD'] === 'GET')) {
    requireAuthenticatedUser();
}

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

        case 'search_advanced':
            handleSearchAdvanced($pdo);
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

        case 'categories':
            handleCategories($pdo);
            break;

        case 'chant_categorie_add':
            handleChantCategorieAdd($pdo);
            break;

        case 'temps_liturgiques':
            handleTempsLiturgiques($pdo);
            break;

        case 'stats':
            handleStats($pdo);
            break;

        case 'chant_detail':
            handleChantDetail($pdo);
            break;

        case 'chant_by_file':
            handleChantByFile($pdo);
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

        case 'ymusic_search':
            handleYmusicSearch();
            break;

        case 'ymusic_stream':
            handleYmusicStream();
            break;

        case 'ymusic_import':
            handleYmusicImport($pdo);
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
            `Path` VARCHAR(50) NOT NULL DEFAULT \'\',
            `DateAjout` DATETIME NOT NULL,
            `Cote` VARCHAR(20) NULL,
            `Informations` TEXT NULL,
            `Supprimer` TINYINT(1) NOT NULL DEFAULT 0,
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
            `Supprimer` TINYINT(1) NOT NULL DEFAULT 0,
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

    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS `Categorie` (
            `ID` INT UNSIGNED NOT NULL AUTO_INCREMENT,
            `Nom` VARCHAR(255) NOT NULL,
            PRIMARY KEY (`ID`),
            UNIQUE KEY `uq_categorie_nom` (`Nom`(191))
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );

    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS `ChantCategorie` (
            `ChantID` INT UNSIGNED NOT NULL,
            `CategorieID` INT UNSIGNED NOT NULL,
            PRIMARY KEY (`ChantID`, `CategorieID`),
            KEY `idx_chant_categorie_categorie` (`CategorieID`),
            CONSTRAINT `fk_chant_categorie_chant` FOREIGN KEY (`ChantID`)
                REFERENCES `Chant` (`ID`) ON DELETE CASCADE ON UPDATE CASCADE,
            CONSTRAINT `fk_chant_categorie_categorie` FOREIGN KEY (`CategorieID`)
                REFERENCES `Categorie` (`ID`) ON DELETE CASCADE ON UPDATE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );

    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS `TempsLiturgique` (
            `ID` INT UNSIGNED NOT NULL AUTO_INCREMENT,
            `Nom` VARCHAR(255) NOT NULL,
            PRIMARY KEY (`ID`),
            UNIQUE KEY `uq_temps_liturgique_nom` (`Nom`(191))
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );

    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS `ChantTempsLiturgique` (
            `ChantID` INT UNSIGNED NOT NULL,
            `TempsLiturgiqueID` INT UNSIGNED NOT NULL,
            PRIMARY KEY (`ChantID`, `TempsLiturgiqueID`),
            KEY `idx_chant_temps_liturgique_temps` (`TempsLiturgiqueID`),
            CONSTRAINT `fk_chant_temps_liturgique_chant` FOREIGN KEY (`ChantID`)
                REFERENCES `Chant` (`ID`) ON DELETE CASCADE ON UPDATE CASCADE,
            CONSTRAINT `fk_chant_temps_liturgique_temps` FOREIGN KEY (`TempsLiturgiqueID`)
                REFERENCES `TempsLiturgique` (`ID`) ON DELETE CASCADE ON UPDATE CASCADE
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

function normalizeMultiLevelPath(string $value): string
{
    $value = trim(str_replace('\\', '/', $value), '/');

    if ($value === '') {
        return '';
    }

    $parts = [];
    foreach (explode('/', $value) as $part) {
        if ($part === '' || $part === '.') {
            continue;
        }

        if ($part === '..') {
            throw new RuntimeException('Chemin invalide.');
        }

        $parts[] = $part;
    }

    $normalized = implode('/', $parts);

    if (mb_strlen($normalized) > DATA_MAX_PATH_LENGTH) {
        throw new RuntimeException('Chemin trop long.');
    }

    return $normalized;
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
                (SELECT COUNT(*) FROM `Fichier` f WHERE f.ChantID = c.ID AND f.Supprimer = 0) AS FileCount,
                (SELECT GROUP_CONCAT(a.Nom ORDER BY a.Nom SEPARATOR \', \')
                 FROM `ChantAuteur` ca INNER JOIN `Auteur` a ON a.ID = ca.AuteurID
                 WHERE ca.ChantID = c.ID) AS Auteurs,
                (SELECT GROUP_CONCAT(cat.Nom ORDER BY cat.Nom SEPARATOR \', \')
                 FROM `ChantCategorie` cc INNER JOIN `Categorie` cat ON cat.ID = cc.CategorieID
                 WHERE cc.ChantID = c.ID) AS Categories,
                (SELECT GROUP_CONCAT(tl.Nom ORDER BY tl.Nom SEPARATOR \', \')
                 FROM `ChantTempsLiturgique` ctl INNER JOIN `TempsLiturgique` tl ON tl.ID = ctl.TempsLiturgiqueID
                 WHERE ctl.ChantID = c.ID) AS TempsLiturgiques
         FROM `Chant` c
         WHERE c.Path = :path AND c.Supprimer = 0
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
    $rows = $pdo->query('SELECT DISTINCT `Path` FROM `Chant` WHERE `Path` <> \'\' AND `Supprimer` = 0 ORDER BY `Path` ASC')->fetchAll();

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
               (SELECT COUNT(*) FROM `Fichier` f2 WHERE f2.ChantID = c.ID AND f2.Supprimer = 0) AS FileCount,
               (SELECT GROUP_CONCAT(a.Nom ORDER BY a.Nom SEPARATOR ', ')
                FROM `ChantAuteur` ca INNER JOIN `Auteur` a ON a.ID = ca.AuteurID
                WHERE ca.ChantID = c.ID) AS Auteurs,
               (SELECT GROUP_CONCAT(cat.Nom ORDER BY cat.Nom SEPARATOR ', ')
                FROM `ChantCategorie` cc3 INNER JOIN `Categorie` cat ON cat.ID = cc3.CategorieID
                WHERE cc3.ChantID = c.ID) AS Categories,
               (SELECT GROUP_CONCAT(tl.Nom ORDER BY tl.Nom SEPARATOR ', ')
                FROM `ChantTempsLiturgique` ctl2 INNER JOIN `TempsLiturgique` tl ON tl.ID = ctl2.TempsLiturgiqueID
                WHERE ctl2.ChantID = c.ID) AS TempsLiturgiques
        FROM `Chant` c
        LEFT JOIN `Fichier` f ON f.ChantID = c.ID AND f.Supprimer = 0
        WHERE c.Supprimer = 0
          AND (c.Nom LIKE :nom ESCAPE '\\'
           OR c.Path LIKE :path ESCAPE '\\'
           OR f.NomFichier LIKE :file ESCAPE '\\')
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
 * Complex search combining an optional free-text term with Categorie and/or Cote filters.
 */
function handleSearchAdvanced(PDO $pdo): void
{
    $term = requestValue('q');
    $cote = requestValue('cote');
    $categorieId = nullableInt('categorie_id', 1, PHP_INT_MAX);
    $tempsLiturgiqueId = nullableInt('temps_liturgique_id', 1, PHP_INT_MAX);
    $sort = requestValue('sort');

    $conditions = ['c.Supprimer = 0'];
    $params = [];

    if ($term !== '') {
        $conditions[] = '(c.Nom LIKE :nom ESCAPE \'\\\\\' OR c.Path LIKE :path ESCAPE \'\\\\\')';
        $pattern = '%' . likeEscape($term) . '%';
        $params[':nom'] = $pattern;
        $params[':path'] = $pattern;
    }

    if ($cote !== '') {
        $conditions[] = 'c.Cote LIKE :cote ESCAPE \'\\\\\'';
        $params[':cote'] = '%' . likeEscape($cote) . '%';
    }

    if ($categorieId !== null) {
        $conditions[] = 'EXISTS (
            SELECT 1 FROM `ChantCategorie` cc
            WHERE cc.ChantID = c.ID AND cc.CategorieID = :categorie
        )';
        $params[':categorie'] = $categorieId;
    }

    if ($tempsLiturgiqueId !== null) {
        $conditions[] = 'EXISTS (
            SELECT 1 FROM `ChantTempsLiturgique` ctl4
            WHERE ctl4.ChantID = c.ID AND ctl4.TempsLiturgiqueID = :temps_liturgique
        )';
        $params[':temps_liturgique'] = $tempsLiturgiqueId;
    }

    $orderBy = match ($sort) {
        'programmes_desc' => 'ProgrammeCount DESC, c.Nom ASC',
        'programmes_asc' => 'ProgrammeCount ASC, c.Nom ASC',
        default => 'c.Path ASC, c.Nom ASC',
    };

    $statement = $pdo->prepare(
        'SELECT c.ID, c.Nom, c.Path, c.DateAjout, c.Cote, c.Informations,
                (SELECT COUNT(*) FROM `Fichier` f WHERE f.ChantID = c.ID AND f.Supprimer = 0) AS FileCount,
                (SELECT GROUP_CONCAT(a.Nom ORDER BY a.Nom SEPARATOR \', \')
                 FROM `ChantAuteur` ca INNER JOIN `Auteur` a ON a.ID = ca.AuteurID
                 WHERE ca.ChantID = c.ID) AS Auteurs,
                (SELECT GROUP_CONCAT(cat.Nom ORDER BY cat.Nom SEPARATOR \', \')
                 FROM `ChantCategorie` cc2 INNER JOIN `Categorie` cat ON cat.ID = cc2.CategorieID
                 WHERE cc2.ChantID = c.ID) AS Categories,
                (SELECT GROUP_CONCAT(tl.Nom ORDER BY tl.Nom SEPARATOR \', \')
                 FROM `ChantTempsLiturgique` ctl3 INNER JOIN `TempsLiturgique` tl ON tl.ID = ctl3.TempsLiturgiqueID
                 WHERE ctl3.ChantID = c.ID) AS TempsLiturgiques,
                (SELECT COUNT(*) FROM `ProgrammeChant` pc WHERE pc.ChantID = c.ID) AS ProgrammeCount
         FROM `Chant` c
         WHERE ' . implode(' AND ', $conditions) . '
         ORDER BY ' . $orderBy . '
         LIMIT 300'
    );
    $statement->execute($params);

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
         WHERE ChantID = :chant AND Supprimer = 0
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
    $cote = nullableText('cote', 20);
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
    saveChantCategories($pdo, $id, requestValue('categories'));
    saveChantTempsLiturgiques($pdo, $id, requestValue('temps_liturgiques'));

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
 * Categories are entered as a comma separated list and created on the fly,
 * the same way authors are.
 */
function saveChantCategories(PDO $pdo, int $chantId, string $rawCategories): void
{
    $names = [];
    foreach (explode(',', $rawCategories) as $name) {
        $name = mb_substr(trim($name), 0, DATA_MAX_NAME_LENGTH);
        if ($name !== '' && !in_array($name, $names, true)) {
            $names[] = $name;
        }
    }

    $delete = $pdo->prepare('DELETE FROM `ChantCategorie` WHERE ChantID = :chant');
    $findCategorie = $pdo->prepare('SELECT ID FROM `Categorie` WHERE Nom = :nom');
    $insertCategorie = $pdo->prepare('INSERT INTO `Categorie` (Nom) VALUES (:nom)');
    $link = $pdo->prepare('INSERT INTO `ChantCategorie` (ChantID, CategorieID) VALUES (:chant, :categorie)');

    $pdo->beginTransaction();

    try {
        $delete->execute([':chant' => $chantId]);

        foreach ($names as $name) {
            $findCategorie->execute([':nom' => $name]);
            $categorieId = $findCategorie->fetchColumn();

            if ($categorieId === false) {
                $insertCategorie->execute([':nom' => $name]);
                $categorieId = $pdo->lastInsertId();
            }

            $link->execute([':chant' => $chantId, ':categorie' => $categorieId]);
        }

        $pdo->commit();
    } catch (Throwable $error) {
        $pdo->rollBack();
        throw $error;
    }
}

/**
 * Temps liturgiques are entered as a comma separated list and created on the fly,
 * the same way categories are.
 */
function saveChantTempsLiturgiques(PDO $pdo, int $chantId, string $rawTempsLiturgiques): void
{
    $names = [];
    foreach (explode(',', $rawTempsLiturgiques) as $name) {
        $name = mb_substr(trim($name), 0, DATA_MAX_NAME_LENGTH);
        if ($name !== '' && !in_array($name, $names, true)) {
            $names[] = $name;
        }
    }

    $delete = $pdo->prepare('DELETE FROM `ChantTempsLiturgique` WHERE ChantID = :chant');
    $findTempsLiturgique = $pdo->prepare('SELECT ID FROM `TempsLiturgique` WHERE Nom = :nom');
    $insertTempsLiturgique = $pdo->prepare('INSERT INTO `TempsLiturgique` (Nom) VALUES (:nom)');
    $link = $pdo->prepare('INSERT INTO `ChantTempsLiturgique` (ChantID, TempsLiturgiqueID) VALUES (:chant, :temps)');

    $pdo->beginTransaction();

    try {
        $delete->execute([':chant' => $chantId]);

        foreach ($names as $name) {
            $findTempsLiturgique->execute([':nom' => $name]);
            $tempsLiturgiqueId = $findTempsLiturgique->fetchColumn();

            if ($tempsLiturgiqueId === false) {
                $insertTempsLiturgique->execute([':nom' => $name]);
                $tempsLiturgiqueId = $pdo->lastInsertId();
            }

            $link->execute([':chant' => $chantId, ':temps' => $tempsLiturgiqueId]);
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
                (SELECT COUNT(*) FROM `Fichier` f WHERE f.ChantID = c.ID AND f.Supprimer = 0) AS FileCount,
                (SELECT GROUP_CONCAT(a.Nom ORDER BY a.Nom SEPARATOR \', \')
                 FROM `ChantAuteur` ca INNER JOIN `Auteur` a ON a.ID = ca.AuteurID
                 WHERE ca.ChantID = c.ID) AS Auteurs,
                (SELECT GROUP_CONCAT(cat.Nom ORDER BY cat.Nom SEPARATOR \', \')
                 FROM `ChantCategorie` cc INNER JOIN `Categorie` cat ON cat.ID = cc.CategorieID
                 WHERE cc.ChantID = c.ID) AS Categories,
                (SELECT GROUP_CONCAT(tl.Nom ORDER BY tl.Nom SEPARATOR \', \')
                 FROM `ChantTempsLiturgique` ctl INNER JOIN `TempsLiturgique` tl ON tl.ID = ctl.TempsLiturgiqueID
                 WHERE ctl.ChantID = c.ID) AS TempsLiturgiques
         FROM `Chant` c
         WHERE c.ID = :id AND c.Supprimer = 0'
    );
    $statement->execute([':id' => $id]);
    $chant = $statement->fetch();

    if ($chant === false) {
        throw new RuntimeException('Chant introuvable.');
    }

    $files = $pdo->prepare(
        'SELECT ID, NomFichier, DateAjout, ChantID, Tonalite, Accords, NbVoix, Informations
         FROM `Fichier`
         WHERE ChantID = :chant AND Supprimer = 0
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

function handleChantByFile(PDO $pdo): void
{
    $filePath = normalizeMultiLevelPath(requestValue('path'));
    if ($filePath === '') {
        throw new RuntimeException('Chemin de fichier manquant.');
    }

    $parts = explode('/', $filePath);
    if (count($parts) < 2) {
        throw new RuntimeException('Chemin de fichier invalide.');
    }

    $fileName = array_pop($parts);
    $chantName = array_pop($parts);
    $chantPath = implode('/', $parts);

    $statement = $pdo->prepare(
        'SELECT c.ID
         FROM `Chant` c
         INNER JOIN `Fichier` f ON f.ChantID = c.ID
         WHERE c.Nom = :nom
           AND c.Path = :path
           AND c.Supprimer = 0
           AND f.NomFichier = :fichier
           AND f.Supprimer = 0
         LIMIT 1'
    );
    $statement->execute([
        ':nom' => $chantName,
        ':path' => $chantPath,
        ':fichier' => $fileName,
    ]);
    $chant = $statement->fetch();

    if ($chant === false) {
        throw new RuntimeException('Chant introuvable pour ce fichier.');
    }

    respondJson(200, [
        'success' => true,
        'chantId' => (int) $chant['ID'],
    ]);
}

/**
 * Programmes are managed by programme.php, so their tables may not exist yet.
 */
function loadChantProgrammes(PDO $pdo, int $chantId): array
{
    try {
        $statement = $pdo->prepare(
            'SELECT p.ID, p.Date, p.Lieu, p.Occasion, p.Paroisse,
                    (SELECT pa.Nom
                     FROM `ProgrammePartie` pp
                     INNER JOIN `Partie` pa ON pa.ID = pp.PartieID
                     WHERE pp.ProgrammeID = p.ID AND pp.Position < pc.Position
                     ORDER BY pp.Position DESC
                     LIMIT 1) AS PartieNom
             FROM `ProgrammeChant` pc
             INNER JOIN `Programme` p ON p.ID = pc.ProgrammeID
             WHERE pc.ChantID = :chant
             ORDER BY p.Date DESC, pc.Position ASC'
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
        'partie' => $row['PartieNom'] === null ? '' : (string) $row['PartieNom'],
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

function handleCategories(PDO $pdo): void
{
    $rows = $pdo->query('SELECT ID, Nom FROM `Categorie` ORDER BY Nom ASC')->fetchAll();

    respondJson(200, [
        'success' => true,
        'categories' => array_map(static fn (array $row): array => [
            'id' => (int) $row['ID'],
            'nom' => (string) $row['Nom'],
        ], $rows),
    ]);
}

function handleTempsLiturgiques(PDO $pdo): void
{
    $rows = $pdo->query('SELECT ID, Nom FROM `TempsLiturgique` ORDER BY Nom ASC')->fetchAll();

    respondJson(200, [
        'success' => true,
        'tempsLiturgiques' => array_map(static fn (array $row): array => [
            'id' => (int) $row['ID'],
            'nom' => (string) $row['Nom'],
        ], $rows),
    ]);
}

function handleStats(PDO $pdo): void
{
    $chantCount = (int) $pdo->query('SELECT COUNT(*) FROM `Chant` WHERE Supprimer = 0')->fetchColumn();
    $fileCount = (int) $pdo->query('SELECT COUNT(*) FROM `Fichier` WHERE Supprimer = 0')->fetchColumn();

    date_default_timezone_set('Europe/Paris');
    $oneMonthAgo = date('Y-m-d H:i:s', strtotime('-1 month'));
    $recentFile = $pdo->prepare('SELECT COUNT(*) FROM `Fichier` WHERE Supprimer = 0 AND DateAjout >= :since');
    $recentFile->execute([':since' => $oneMonthAgo]);
    $recentFileCount = (int) $recentFile->fetchColumn();

    respondJson(200, [
        'success' => true,
        'chantCount' => $chantCount,
        'fileCount' => $fileCount,
        'recentFileCount' => $recentFileCount,
    ]);
}

/**
 * Links one or more existing Categorie to a chant without touching its other categories.
 */
function handleChantCategorieAdd(PDO $pdo): void
{
    $chantId = nullableInt('chant_id', 1, PHP_INT_MAX);
    if ($chantId === null) {
        throw new RuntimeException('Identifiant de chant manquant.');
    }

    $categorieIds = array_filter(
        array_map('intval', explode(',', requestValue('categorie_ids'))),
        static fn (int $id): bool => $id > 0
    );

    if (!$categorieIds) {
        throw new RuntimeException('Categorie manquante.');
    }

    $insert = $pdo->prepare('INSERT IGNORE INTO `ChantCategorie` (ChantID, CategorieID) VALUES (:chant, :categorie)');
    foreach ($categorieIds as $categorieId) {
        $insert->execute([':chant' => $chantId, ':categorie' => $categorieId]);
    }

    respondJson(200, ['success' => true]);
}

function handleChantDelete(PDO $pdo): void
{
    $id = nullableInt('id', 1, PHP_INT_MAX);
    if ($id === null) {
        throw new RuntimeException('Identifiant de chant manquant.');
    }

    $fileCount = $pdo->prepare('SELECT COUNT(*) FROM `Fichier` WHERE ChantID = :id');
    $fileCount->execute([':id' => $id]);
    if ((int) $fileCount->fetchColumn() > 0) {
        throw new RuntimeException('Impossible de supprimer ce chant : il contient encore des fichiers.');
    }

    $statement = $pdo->prepare('UPDATE `Chant` SET Supprimer = 1 WHERE ID = :id');
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
 * Proxies a YouTube Music search to the ymusic project (its API is CORS-locked to
 * its own origin, so it must be reached server-side) and returns the results list.
 */
function handleYmusicSearch(): void
{
    $query = requestValue('q');
    if ($query === '') {
        throw new RuntimeException('Requete de recherche vide.');
    }

    $data = ymusicRequest(['query' => $query]);

    respondJson(200, [
        'success' => true,
        'results' => is_array($data['results'] ?? null) ? $data['results'] : [],
    ]);
}

/**
 * Triggers the ymusic download for a videoId and returns a directly playable URL,
 * used to preview a track before importing it.
 */
function handleYmusicStream(): void
{
    $videoId = ymusicVideoId(requestValue('video_id'));
    $audio = ymusicResolveAudio($videoId);

    respondJson(200, [
        'success' => true,
        'url' => $audio['url'],
    ]);
}

/**
 * Downloads a track through the ymusic project and stores it inside the chant
 * folder (/pdf/<Path>/<Nom>/) with a matching Fichier row.
 */
function handleYmusicImport(PDO $pdo): void
{
    $chantId = nullableInt('chant_id', 1, PHP_INT_MAX);
    if ($chantId === null) {
        throw new RuntimeException('Chaque fichier doit etre lie a un chant.');
    }

    $videoId = ymusicVideoId(requestValue('video_id'));

    $chant = $pdo->prepare('SELECT Nom, Path FROM `Chant` WHERE ID = :id');
    $chant->execute([':id' => $chantId]);
    $chantRow = $chant->fetch();
    if ($chantRow === false) {
        throw new RuntimeException('Le chant lie est introuvable.');
    }

    // Stream the bytes through interface.php (?raw=) rather than fetching the
    // static /data/temp file, which the host rejects on server-to-server calls.
    $audio = ymusicDownloadRaw($videoId);
    $extension = $audio['extension'] !== '' ? $audio['extension'] : 'webm';
    if (!in_array($extension, YMUSIC_AUDIO_EXTENSIONS, true)) {
        throw new RuntimeException('Extension audio non supportee (' . $extension . ').');
    }

    $bytes = $audio['bytes'];
    if ($bytes === '') {
        throw new RuntimeException('Fichier audio vide recu depuis YMusic.');
    }

    $requestedName = requestValue('nom_fichier');
    $fileName = ymusicBuildFileName($requestedName !== '' ? $requestedName : $videoId, $extension);

    $targetDir = chantDirectory((string) $chantRow['Path'], (string) $chantRow['Nom']);
    if (!is_dir($targetDir) && !mkdir($targetDir, 0775, true) && !is_dir($targetDir)) {
        throw new RuntimeException('Impossible de creer le dossier du chant.');
    }

    $fileName = ymusicUniqueFileName($targetDir, $fileName);
    $destination = $targetDir . DIRECTORY_SEPARATOR . $fileName;

    if (file_put_contents($destination, $bytes) === false) {
        throw new RuntimeException('Impossible d\'enregistrer le fichier audio sur le serveur.');
    }

    $statement = $pdo->prepare(
        'INSERT INTO `Fichier` (NomFichier, DateAjout, ChantID, Tonalite, Accords, NbVoix, Informations)
         VALUES (:nom, :date, :chant, NULL, 0, NULL, :informations)'
    );
    $statement->execute([
        ':nom' => $fileName,
        ':date' => currentTimestamp(),
        ':chant' => $chantId,
        ':informations' => 'Ajoute via YMusic',
    ]);

    respondJson(200, [
        'success' => true,
        'id' => (int) $pdo->lastInsertId(),
        'nomFichier' => $fileName,
    ]);
}

function ymusicVideoId(string $value): string
{
    if ($value === '' || preg_match('/^[0-9A-Za-z_-]{6,32}$/', $value) !== 1) {
        throw new RuntimeException('Identifiant video YMusic invalide.');
    }

    return $value;
}

/**
 * Performs a GET call to the ymusic interface and returns the decoded JSON payload.
 */
function ymusicRequest(array $query): array
{
    $url = YMUSIC_INTERFACE_URL . '?' . http_build_query($query);

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_TIMEOUT => 300,
    ]);
    $body = curl_exec($ch);
    if ($body === false) {
        throw new RuntimeException('Connexion a YMusic impossible: ' . curl_error($ch));
    }

    $data = json_decode((string) $body, true);
    if (!is_array($data)) {
        throw new RuntimeException('Reponse YMusic invalide.');
    }
    if (array_key_exists('success', $data) && $data['success'] === false) {
        throw new RuntimeException((string) ($data['error'] ?? 'Erreur YMusic.'));
    }

    return $data;
}

/**
 * Asks ymusic to download a track then resolves a directly reachable audio URL.
 */
function ymusicResolveAudio(string $videoId): array
{
    $data = ymusicRequest(['download' => $videoId]);
    $download = is_array($data['download'] ?? null) ? $data['download'] : [];

    $candidates = [];
    if (!empty($download['path'])) {
        $candidates[] = ymusicNormalizeRelativePath((string) $download['path']);
    }
    if (!empty($download['file'])) {
        $file = basename((string) $download['file']);
        $candidates[] = 'data/temp/' . $file;
        $candidates[] = 'data/' . $file;
    }

    $candidates = array_values(array_unique(array_filter($candidates)));
    if (!$candidates) {
        throw new RuntimeException('Fichier audio introuvable sur YMusic.');
    }

    foreach ($candidates as $relative) {
        $url = YMUSIC_BASE_URL . '/' . ltrim($relative, '/');
        if (ymusicUrlExists($url)) {
            return [
                'url' => $url,
                'extension' => strtolower((string) pathinfo($relative, PATHINFO_EXTENSION)),
            ];
        }
    }

    // None answered the probe (e.g. server rejects range/HEAD): fall back to the
    // best guess and let the real fetch/playback surface any genuine error.
    $fallback = $candidates[0];

    return [
        'url' => YMUSIC_BASE_URL . '/' . ltrim($fallback, '/'),
        'extension' => strtolower((string) pathinfo($fallback, PATHINFO_EXTENSION)),
    ];
}

function ymusicNormalizeRelativePath(string $path): string
{
    $path = str_replace('\\', '/', $path);
    $path = preg_replace('#(?:\.\./|\./)+#', '', $path);

    return ltrim((string) $path, '/');
}

function ymusicUrlExists(string $url): bool
{
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_RANGE => '0-0',
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_TIMEOUT => 30,
    ]);
    curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);

    return $status >= 200 && $status < 400;
}

function ymusicFetchBinary(string $url, int $redirectsLeft = 3): string
{
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HEADER => true,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_SSL_VERIFYHOST => 0,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_TIMEOUT => 300,
        CURLOPT_USERAGENT => 'serveur_chant/1.0',
    ]);
    $response = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $headerSize = (int) curl_getinfo($ch, CURLINFO_HEADER_SIZE);
    $errno = curl_errno($ch);
    $error = curl_error($ch);

    if ($response === false) {
        throw new RuntimeException('Telechargement du fichier audio YMusic echoue (curl ' . $errno . ': ' . $error . ').');
    }

    $headers = substr((string) $response, 0, $headerSize);
    $body = substr((string) $response, $headerSize);

    // open_basedir blocks CURLOPT_FOLLOWLOCATION, so follow redirects manually.
    if ($status >= 300 && $status < 400 && $redirectsLeft > 0
        && preg_match('/^location:\s*(.+)$/im', $headers, $match) === 1) {
        return ymusicFetchBinary(trim($match[1]), $redirectsLeft - 1);
    }

    if ($status < 200 || $status >= 300) {
        throw new RuntimeException('Telechargement du fichier audio YMusic echoue (HTTP ' . $status . ').');
    }

    return $body;
}

/**
 * Downloads a track through interface.php (?raw=) and returns the raw audio bytes
 * plus the file extension (read from the X-File-Name response header). Used for
 * import because the static /data/temp URL is rejected on server-to-server calls.
 */
function ymusicDownloadRaw(string $videoId): array
{
    $url = YMUSIC_INTERFACE_URL . '?' . http_build_query(['raw' => $videoId]);

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HEADER => true,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_TIMEOUT => 300,
    ]);
    $response = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $headerSize = (int) curl_getinfo($ch, CURLINFO_HEADER_SIZE);
    $contentType = (string) curl_getinfo($ch, CURLINFO_CONTENT_TYPE);

    if ($response === false) {
        throw new RuntimeException('Connexion a YMusic impossible: ' . curl_error($ch));
    }

    $headers = substr((string) $response, 0, $headerSize);
    $body = substr((string) $response, $headerSize);

    if ($status < 200 || $status >= 300 || stripos($contentType, 'application/json') !== false) {
        $payload = json_decode($body, true);
        $message = is_array($payload) && isset($payload['error'])
            ? (string) $payload['error']
            : ('HTTP ' . $status);
        throw new RuntimeException('Telechargement du fichier audio YMusic echoue: ' . $message);
    }

    $fileName = '';
    if (preg_match('/^x-file-name:\s*(.+)$/im', $headers, $match) === 1) {
        $fileName = rawurldecode(trim($match[1]));
    }

    return [
        'bytes' => $body,
        'extension' => strtolower((string) pathinfo($fileName, PATHINFO_EXTENSION)),
    ];
}

function ymusicBuildFileName(string $title, string $extension): string
{
    $title = preg_replace('/[\\\\\/:*?"<>|\x00]+/', ' ', $title);
    $title = trim((string) preg_replace('/\s+/', ' ', (string) $title));
    if ($title === '') {
        $title = 'audio';
    }

    return mb_substr($title, 0, 200) . '.' . $extension;
}

function ymusicUniqueFileName(string $directory, string $fileName): string
{
    if (!file_exists($directory . DIRECTORY_SEPARATOR . $fileName)) {
        return $fileName;
    }

    $name = pathinfo($fileName, PATHINFO_FILENAME);
    $ext = pathinfo($fileName, PATHINFO_EXTENSION);
    $suffix = $ext !== '' ? '.' . $ext : '';

    for ($index = 1; $index <= 1000; $index += 1) {
        $candidate = $name . '-' . $index . $suffix;
        if (!file_exists($directory . DIRECTORY_SEPARATOR . $candidate)) {
            return $candidate;
        }
    }

    return $name . '-' . time() . $suffix;
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

/**
 * Mirrors the chant's folder structure under /pdf/Recycle Bin/<Path>/<Nom>/.
 */
function recycleBinDirectory(string $chantPath, string $chantName): string
{
    $pdfRoot = realpath(dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . 'pdf');
    if ($pdfRoot === false || !is_dir($pdfRoot)) {
        throw new RuntimeException('Dossier /pdf introuvable.');
    }

    $segments = array_filter(
        ['Recycle Bin', validateFolderName($chantPath), validateFolderName($chantName)],
        static fn (string $segment): bool => $segment !== ''
    );

    return $pdfRoot . DIRECTORY_SEPARATOR . implode(DIRECTORY_SEPARATOR, $segments);
}

/**
 * Appends a numeric suffix if a file with the same name already sits in the recycle bin.
 */
function uniqueRecycleBinDestination(string $destination): string
{
    if (!file_exists($destination)) {
        return $destination;
    }

    $directory = dirname($destination);
    $extension = pathinfo($destination, PATHINFO_EXTENSION);
    $baseName = pathinfo($destination, PATHINFO_FILENAME);
    $suffix = 1;

    do {
        $candidate = $directory . DIRECTORY_SEPARATOR . $baseName . '_' . $suffix . ($extension !== '' ? '.' . $extension : '');
        $suffix++;
    } while (file_exists($candidate));

    return $candidate;
}

/**
 * Moves a soft-deleted file's physical copy into the recycle bin, keeping its folder structure.
 */
function moveFileToRecycleBin(string $chantPath, string $chantName, string $fileName): void
{
    $source = chantDirectory($chantPath, $chantName) . DIRECTORY_SEPARATOR . validateFileName($fileName);

    if (!is_file($source)) {
        return;
    }

    $targetDir = recycleBinDirectory($chantPath, $chantName);
    if (!is_dir($targetDir) && !mkdir($targetDir, 0775, true) && !is_dir($targetDir)) {
        throw new RuntimeException('Impossible de creer le dossier de la corbeille.');
    }

    $destination = uniqueRecycleBinDestination($targetDir . DIRECTORY_SEPARATOR . validateFileName($fileName));

    if (!rename($source, $destination)) {
        throw new RuntimeException('Impossible de deplacer le fichier vers la corbeille.');
    }
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

    $current = $pdo->prepare(
        'SELECT f.NomFichier, c.Nom AS ChantNom, c.Path AS ChantPath
         FROM `Fichier` f
         INNER JOIN `Chant` c ON c.ID = f.ChantID
         WHERE f.ID = :id'
    );
    $current->execute([':id' => $id]);
    $file = $current->fetch();

    if ($file === false) {
        throw new RuntimeException('Fichier introuvable.');
    }

    moveFileToRecycleBin((string) $file['ChantPath'], (string) $file['ChantNom'], (string) $file['NomFichier']);

    $statement = $pdo->prepare('UPDATE `Fichier` SET Supprimer = 1 WHERE ID = :id');
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
    $rows = $pdo->query('SELECT ID, Nom, Path FROM `Chant` WHERE Supprimer = 0 ORDER BY Path ASC, Nom ASC')->fetchAll();

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
        'cote' => $row['Cote'] === null ? null : (string) $row['Cote'],
        'informations' => $row['Informations'] === null ? '' : (string) $row['Informations'],
        'auteurs' => isset($row['Auteurs']) && $row['Auteurs'] !== null ? (string) $row['Auteurs'] : '',
        'categories' => isset($row['Categories']) && $row['Categories'] !== null ? (string) $row['Categories'] : '',
        'tempsLiturgiques' => isset($row['TempsLiturgiques']) && $row['TempsLiturgiques'] !== null ? (string) $row['TempsLiturgiques'] : '',
        'fileCount' => (int) ($row['FileCount'] ?? 0),
        'programmeCount' => (int) ($row['ProgrammeCount'] ?? 0),
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
