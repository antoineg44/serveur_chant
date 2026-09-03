<?php

declare(strict_types=1);

require_once __DIR__ . '/../config.php';

session_start();

applyCorsHeaders();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

const PROGRAMME_MAX_TEXT_LENGTH = 255;

$action = (string) ($_REQUEST['action'] ?? 'list');

// The homepage displays the upcoming masses list publicly, without requiring a login.
$publicActions = ['list'];
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

        case 'download_zip':
            handleDownloadZip($pdo);
            break;

        case 'detail':
            handleDetail($pdo);
            break;

        case 'programme_save':
            handleProgrammeSave($pdo);
            break;

        case 'programme_delete':
            handleProgrammeDelete($pdo);
            break;

        case 'parties':
            handleParties($pdo);
            break;

        case 'partie_save':
            handlePartieSave($pdo);
            break;

        case 'partie_delete':
            handlePartieDelete($pdo);
            break;

        case 'partie_categories':
            handlePartieCategories($pdo);
            break;

        case 'partie_categories_save':
            handlePartieCategoriesSave($pdo);
            break;

        case 'item_add_chant':
            handleItemAddChant($pdo);
            break;

        case 'item_add_partie':
            handleItemAddPartie($pdo);
            break;

        case 'item_remove':
            handleItemRemove($pdo);
            break;

        case 'item_move':
            handleItemMove($pdo);
            break;

        case 'items_set':
            handleItemsSet($pdo);
            break;

        case 'import_json':
            handleImportJson($pdo);
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
        'CREATE TABLE IF NOT EXISTS `Programme` (
            `ID` INT UNSIGNED NOT NULL AUTO_INCREMENT,
            `Date` DATE NOT NULL,
            `Lieu` VARCHAR(255) NOT NULL DEFAULT \'\',
            `Occasion` VARCHAR(255) NOT NULL DEFAULT \'\',
            `Paroisse` VARCHAR(255) NOT NULL DEFAULT \'\',
            `Description` TEXT NULL,
            `AELF` TINYINT(1) NOT NULL DEFAULT 0,
            PRIMARY KEY (`ID`),
            KEY `idx_programme_date` (`Date`),
            KEY `idx_programme_paroisse` (`Paroisse`(191))
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );

    // Added after the first release, so existing installs need the column.
    $hasDescription = $pdo->query('SHOW COLUMNS FROM `Programme` LIKE \'Description\'')->fetch();
    if ($hasDescription === false) {
        $pdo->exec('ALTER TABLE `Programme` ADD COLUMN `Description` TEXT NULL');
    }

    $hasAelf = $pdo->query('SHOW COLUMNS FROM `Programme` LIKE \'AELF\'')->fetch();
    if ($hasAelf === false) {
        $pdo->exec('ALTER TABLE `Programme` ADD COLUMN `AELF` TINYINT(1) NOT NULL DEFAULT 0');
    }

    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS `Partie` (
            `ID` INT UNSIGNED NOT NULL AUTO_INCREMENT,
            `Nom` VARCHAR(255) NOT NULL,
            PRIMARY KEY (`ID`),
            UNIQUE KEY `uq_partie_nom` (`Nom`(191))
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );

    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS `ProgrammeChant` (
            `ProgrammeID` INT UNSIGNED NOT NULL,
            `Position` INT UNSIGNED NOT NULL,
            `ChantID` INT UNSIGNED NOT NULL,
            `FichierID` INT UNSIGNED NULL,
            PRIMARY KEY (`ProgrammeID`, `Position`),
            KEY `idx_programme_chant_chant` (`ChantID`),
            KEY `idx_programme_chant_fichier` (`FichierID`),
            CONSTRAINT `fk_programme_chant_programme` FOREIGN KEY (`ProgrammeID`)
                REFERENCES `Programme` (`ID`) ON DELETE CASCADE ON UPDATE CASCADE,
            CONSTRAINT `fk_programme_chant_chant` FOREIGN KEY (`ChantID`)
                REFERENCES `Chant` (`ID`) ON DELETE CASCADE ON UPDATE CASCADE,
            CONSTRAINT `fk_programme_chant_fichier` FOREIGN KEY (`FichierID`)
                REFERENCES `Fichier` (`ID`) ON DELETE SET NULL ON UPDATE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );

    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS `ProgrammePartie` (
            `ProgrammeID` INT UNSIGNED NOT NULL,
            `Position` INT UNSIGNED NOT NULL,
            `PartieID` INT UNSIGNED NOT NULL,
            PRIMARY KEY (`ProgrammeID`, `Position`),
            KEY `idx_programme_partie_partie` (`PartieID`),
            CONSTRAINT `fk_programme_partie_programme` FOREIGN KEY (`ProgrammeID`)
                REFERENCES `Programme` (`ID`) ON DELETE CASCADE ON UPDATE CASCADE,
            CONSTRAINT `fk_programme_partie_partie` FOREIGN KEY (`PartieID`)
                REFERENCES `Partie` (`ID`) ON DELETE CASCADE ON UPDATE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );

    // Categorie is owned by data.php, but the FK just needs the table to exist by now.
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS `PartieCategorie` (
            `PartieID` INT UNSIGNED NOT NULL,
            `CategorieID` INT UNSIGNED NOT NULL,
            PRIMARY KEY (`PartieID`, `CategorieID`),
            KEY `idx_partie_categorie_categorie` (`CategorieID`),
            CONSTRAINT `fk_partie_categorie_partie` FOREIGN KEY (`PartieID`)
                REFERENCES `Partie` (`ID`) ON DELETE CASCADE ON UPDATE CASCADE,
            CONSTRAINT `fk_partie_categorie_categorie` FOREIGN KEY (`CategorieID`)
                REFERENCES `Categorie` (`ID`) ON DELETE CASCADE ON UPDATE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );
}

function requestValue(string $key): string
{
    $value = $_REQUEST[$key] ?? '';
    return is_string($value) ? trim($value) : '';
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

function requiredInt(string $key, string $label): int
{
    $value = nullableInt($key, 1, PHP_INT_MAX);
    if ($value === null) {
        throw new RuntimeException($label . ' est obligatoire.');
    }

    return $value;
}

function textValue(string $key): string
{
    return mb_substr(requestValue($key), 0, PROGRAMME_MAX_TEXT_LENGTH);
}

function dateValue(string $key): string
{
    $value = requestValue($key);
    $date = DateTimeImmutable::createFromFormat('Y-m-d', $value);

    if ($date === false || $date->format('Y-m-d') !== $value) {
        throw new RuntimeException('La date est invalide (format attendu AAAA-MM-JJ).');
    }

    return $value;
}

function likeEscape(string $value): string
{
    return str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $value);
}

function handleList(PDO $pdo): void
{
    $paroisse = textValue('paroisse');
    $term = requestValue('q');

    $conditions = [];
    $params = [];

    if ($paroisse !== '') {
        $conditions[] = 'p.Paroisse = :paroisse';
        $params[':paroisse'] = $paroisse;
    }

    if ($term !== '') {
        $conditions[] = '(p.Lieu LIKE :lieu ESCAPE \'\\\\\' OR p.Occasion LIKE :occasion ESCAPE \'\\\\\' OR p.Paroisse LIKE :par ESCAPE \'\\\\\')';
        $pattern = '%' . likeEscape($term) . '%';
        $params[':lieu'] = $pattern;
        $params[':occasion'] = $pattern;
        $params[':par'] = $pattern;
    }

    $where = $conditions ? ' WHERE ' . implode(' AND ', $conditions) : '';

    $statement = $pdo->prepare(
        'SELECT p.ID, p.Date, p.Lieu, p.Occasion, p.Paroisse,
                (SELECT COUNT(*) FROM `ProgrammeChant` pc WHERE pc.ProgrammeID = p.ID) AS ChantCount,
                (SELECT COUNT(*) FROM `ProgrammePartie` pp WHERE pp.ProgrammeID = p.ID) AS PartieCount
         FROM `Programme` p' . $where . '
         ORDER BY p.Date DESC, p.ID DESC
         LIMIT 500'
    );
    $statement->execute($params);

    $paroisses = $pdo
        ->query('SELECT DISTINCT `Paroisse` FROM `Programme` WHERE `Paroisse` <> \'\' ORDER BY `Paroisse` ASC')
        ->fetchAll(PDO::FETCH_COLUMN);

    respondJson(200, [
        'success' => true,
        'paroisses' => $paroisses,
        'programmes' => array_map('mapProgrammeRow', $statement->fetchAll()),
    ]);
}

/**
 * Builds a ZIP with the files of the programme; complete mode adds every file
 * of each chant folder instead of only the linked one.
 */
function handleDownloadZip(PDO $pdo): void
{
    if (!class_exists('ZipArchive')) {
        throw new RuntimeException('ZipArchive n\'est pas disponible sur le serveur.');
    }

    $id = requiredInt('id', 'L\'identifiant du programme');
    $complete = requestValue('complete') === '1';

    $statement = $pdo->prepare('SELECT ID, `Date`, Lieu, Occasion, Paroisse FROM `Programme` WHERE ID = :id');
    $statement->execute([':id' => $id]);
    $programme = $statement->fetch();

    if ($programme === false) {
        throw new RuntimeException('Programme introuvable.');
    }

    $pdfRoot = realpath(dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . 'pdf');
    if ($pdfRoot === false || !is_dir($pdfRoot)) {
        throw new RuntimeException('Dossier /pdf introuvable.');
    }

    $tempFile = tempnam(sys_get_temp_dir(), 'programme_zip_');
    if ($tempFile === false) {
        throw new RuntimeException('Impossible de creer un fichier temporaire.');
    }

    $zip = new ZipArchive();
    if ($zip->open($tempFile, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
        @unlink($tempFile);
        throw new RuntimeException('Impossible de creer l\'archive.');
    }

    $currentPartie = '';
    $index = 0;

    foreach (loadItems($pdo, $id) as $item) {
        if ($item['type'] === 'partie') {
            $currentPartie = $item['partieNom'];
            continue;
        }

        $index += 1;
        $chantDir = $pdfRoot . DIRECTORY_SEPARATOR
            . implode(DIRECTORY_SEPARATOR, array_filter([$item['chantPath'], $item['chantNom']]));

        $sources = [];
        if ($complete) {
            foreach ((array) glob($chantDir . DIRECTORY_SEPARATOR . '*') as $candidate) {
                if (is_file($candidate)) {
                    $sources[] = $candidate;
                }
            }
        } elseif ($item['nomFichier'] !== '') {
            $sources[] = $chantDir . DIRECTORY_SEPARATOR . $item['nomFichier'];
        }

        foreach ($sources as $source) {
            if (!is_file($source)) {
                continue;
            }

            $prefix = sprintf('%02d', $index);
            $folder = $currentPartie !== '' ? sanitizeZipSegment($currentPartie) . '/' : '';
            $zip->addFile($source, $folder . $prefix . '_' . basename($source));
        }
    }

    $zip->close();

    $baseName = sanitizeZipSegment(implode('_', array_filter([
        (string) $programme['Date'],
        (string) $programme['Lieu'],
        (string) $programme['Occasion'],
    ]))) ?: 'programme';

    header('Content-Type: application/zip');
    header('Content-Disposition: attachment; filename="' . $baseName . '.zip"');
    header('Content-Length: ' . (string) filesize($tempFile));
    readfile($tempFile);
    @unlink($tempFile);
    exit;
}

function sanitizeZipSegment(string $value): string
{
    return trim((string) preg_replace('/[^\p{L}\p{N}_\-. ]+/u', '_', $value));
}

function handleDetail(PDO $pdo): void
{
    $id = requiredInt('id', 'L\'identifiant du programme');

    $statement = $pdo->prepare('SELECT ID, `Date`, Lieu, Occasion, Paroisse, Description, AELF FROM `Programme` WHERE ID = :id');
    $statement->execute([':id' => $id]);
    $programme = $statement->fetch();

    if ($programme === false) {
        throw new RuntimeException('Programme introuvable.');
    }

    respondJson(200, [
        'success' => true,
        'programme' => mapProgrammeRow($programme),
        'items' => loadItems($pdo, $id),
    ]);
}

/**
 * Merges both link tables into a single ordered list of program entries.
 */
function loadItems(PDO $pdo, int $programmeId): array
{
    $chants = $pdo->prepare(
        'SELECT pc.Position, pc.ChantID, pc.FichierID, c.Nom AS ChantNom, c.Path AS ChantPath, f.NomFichier,
                (SELECT GROUP_CONCAT(cc.CategorieID ORDER BY cc.CategorieID SEPARATOR \',\')
                 FROM `ChantCategorie` cc WHERE cc.ChantID = c.ID) AS CategorieIds,
                (SELECT f2.NomFichier FROM `Fichier` f2
                 WHERE f2.ChantID = c.ID AND f2.Supprimer = 0
                   AND LOWER(SUBSTRING_INDEX(f2.NomFichier, \'.\', -1))
                       IN (\'mp3\', \'m4a\', \'wav\', \'webm\', \'ogg\', \'oga\', \'opus\', \'aac\', \'flac\')
                 ORDER BY f2.NomFichier ASC LIMIT 1) AS AudioFichier
         FROM `ProgrammeChant` pc
         INNER JOIN `Chant` c ON c.ID = pc.ChantID
         LEFT JOIN `Fichier` f ON f.ID = pc.FichierID
         WHERE pc.ProgrammeID = :id'
    );
    $chants->execute([':id' => $programmeId]);

    $parties = $pdo->prepare(
        'SELECT pp.Position, pp.PartieID, pa.Nom AS PartieNom,
                (SELECT GROUP_CONCAT(pc2.CategorieID ORDER BY pc2.CategorieID SEPARATOR \',\')
                 FROM `PartieCategorie` pc2 WHERE pc2.PartieID = pa.ID) AS CategorieIds
         FROM `ProgrammePartie` pp
         INNER JOIN `Partie` pa ON pa.ID = pp.PartieID
         WHERE pp.ProgrammeID = :id'
    );
    $parties->execute([':id' => $programmeId]);

    $items = [];

    foreach ($chants->fetchAll() as $row) {
        $items[] = [
            'type' => 'chant',
            'position' => (int) $row['Position'],
            'chantId' => (int) $row['ChantID'],
            'chantNom' => (string) $row['ChantNom'],
            'chantPath' => (string) $row['ChantPath'],
            'fichierId' => $row['FichierID'] === null ? null : (int) $row['FichierID'],
            'nomFichier' => $row['NomFichier'] === null ? '' : (string) $row['NomFichier'],
            'audioFile' => $row['AudioFichier'] === null ? '' : (string) $row['AudioFichier'],
            'categorieIds' => $row['CategorieIds'] === null
                ? []
                : array_map('intval', explode(',', (string) $row['CategorieIds'])),
        ];
    }

    foreach ($parties->fetchAll() as $row) {
        $items[] = [
            'type' => 'partie',
            'position' => (int) $row['Position'],
            'partieId' => (int) $row['PartieID'],
            'partieNom' => (string) $row['PartieNom'],
            'categorieIds' => $row['CategorieIds'] === null
                ? []
                : array_map('intval', explode(',', (string) $row['CategorieIds'])),
        ];
    }

    usort($items, static fn (array $a, array $b): int => $a['position'] <=> $b['position']);

    return $items;
}

function handleProgrammeSave(PDO $pdo): void
{
    $id = nullableInt('id', 1, PHP_INT_MAX);
    $date = dateValue('date');
    $lieu = textValue('lieu');
    $occasion = textValue('occasion');
    $paroisse = textValue('paroisse');
    $description = requestValue('description');
    $description = $description === '' ? null : mb_substr($description, 0, 5000);
    $aelf = requestValue('aelf') === '1' ? 1 : 0;

    if ($id === null) {
        $statement = $pdo->prepare(
            'INSERT INTO `Programme` (`Date`, Lieu, Occasion, Paroisse, Description, AELF)
             VALUES (:date, :lieu, :occasion, :paroisse, :description, :aelf)'
        );
        $statement->execute([
            ':date' => $date,
            ':lieu' => $lieu,
            ':occasion' => $occasion,
            ':paroisse' => $paroisse,
            ':description' => $description,
            ':aelf' => $aelf,
        ]);
        $id = (int) $pdo->lastInsertId();
        copyTemplateItems($pdo, $id, $paroisse);
    } else {
        $statement = $pdo->prepare(
            'UPDATE `Programme`
             SET `Date` = :date, Lieu = :lieu, Occasion = :occasion, Paroisse = :paroisse, Description = :description, AELF = :aelf
             WHERE ID = :id'
        );
        $statement->execute([
            ':date' => $date,
            ':lieu' => $lieu,
            ':occasion' => $occasion,
            ':paroisse' => $paroisse,
            ':description' => $description,
            ':aelf' => $aelf,
            ':id' => $id,
        ]);
    }

    respondJson(200, [
        'success' => true,
        'id' => $id,
    ]);
}

/**
 * A new programme starts from the programme whose Occasion is "Template",
 * preferring the one of the same paroisse.
 */
function copyTemplateItems(PDO $pdo, int $programmeId, string $paroisse): void
{
    $statement = $pdo->prepare(
        'SELECT ID FROM `Programme`
         WHERE Occasion = \'Template\' AND ID <> :id
         ORDER BY (Paroisse = :paroisse) DESC, ID DESC
         LIMIT 1'
    );
    $statement->execute([':id' => $programmeId, ':paroisse' => $paroisse]);
    $templateId = $statement->fetchColumn();

    if ($templateId === false) {
        return;
    }

    $items = array_map(static function (array $item): array {
        return $item['type'] === 'partie'
            ? ['type' => 'partie', 'partieId' => $item['partieId']]
            : ['type' => 'chant', 'chantId' => $item['chantId'], 'fichierId' => $item['fichierId']];
    }, loadItems($pdo, (int) $templateId));

    if ($items) {
        rewriteItems($pdo, $programmeId, $items);
    }
}

/**
 * Replaces the whole content of a programme from a JSON list of entries,
 * resolving chants by their "<Path>/<Nom>/<NomFichier>" location under /pdf.
 */
function handleItemsSet(PDO $pdo): void
{
    $programmeId = requiredInt('programme_id', 'L\'identifiant du programme');
    $decoded = json_decode(requestValue('items'), true);

    if (!is_array($decoded)) {
        throw new RuntimeException('Contenu du programme invalide.');
    }

    $items = [];
    $unmatched = [];

    foreach ($decoded as $entry) {
        if (!is_array($entry)) {
            continue;
        }

        $name = trim((string) ($entry['name'] ?? ''));

        if (($entry['type'] ?? '') === 'partie') {
            if ($name === '') {
                continue;
            }
            $items[] = [
                'type' => 'partie',
                'partieId' => resolvePartieId($pdo, trim($name, "[] \t")),
            ];
            continue;
        }

        $path = (string) ($entry['path'] ?? '');
        $reference = resolveChantReference($pdo, $path, $name);
        if ($reference === null) {
            $unmatched[] = $name !== '' ? $name : $path;
            continue;
        }

        $items[] = [
            'type' => 'chant',
            'chantId' => $reference['chantId'],
            'fichierId' => $reference['fichierId'],
        ];
    }

    rewriteItems($pdo, $programmeId, $items);

    respondJson(200, [
        'success' => true,
        'saved' => count($items),
        'unmatched' => $unmatched,
    ]);
}

function handleProgrammeDelete(PDO $pdo): void
{
    $id = requiredInt('id', 'L\'identifiant du programme');

    $statement = $pdo->prepare('DELETE FROM `Programme` WHERE ID = :id');
    $statement->execute([':id' => $id]);

    respondJson(200, [
        'success' => true,
        'deleted' => $statement->rowCount(),
    ]);
}

function handleParties(PDO $pdo): void
{
    $rows = $pdo->query('SELECT ID, Nom FROM `Partie` ORDER BY Nom ASC')->fetchAll();

    respondJson(200, [
        'success' => true,
        'parties' => array_map(static fn (array $row): array => [
            'id' => (int) $row['ID'],
            'nom' => (string) $row['Nom'],
        ], $rows),
    ]);
}

function handlePartieSave(PDO $pdo): void
{
    $id = nullableInt('id', 1, PHP_INT_MAX);
    $nom = textValue('nom');

    if ($nom === '') {
        throw new RuntimeException('Le nom de la partie est obligatoire.');
    }

    if ($id === null) {
        $statement = $pdo->prepare('INSERT INTO `Partie` (Nom) VALUES (:nom)');
        $statement->execute([':nom' => $nom]);
        $id = (int) $pdo->lastInsertId();
    } else {
        $statement = $pdo->prepare('UPDATE `Partie` SET Nom = :nom WHERE ID = :id');
        $statement->execute([':nom' => $nom, ':id' => $id]);
    }

    respondJson(200, [
        'success' => true,
        'id' => $id,
    ]);
}

function handlePartieDelete(PDO $pdo): void
{
    $id = requiredInt('id', 'L\'identifiant de la partie');

    $statement = $pdo->prepare('DELETE FROM `Partie` WHERE ID = :id');
    $statement->execute([':id' => $id]);

    respondJson(200, [
        'success' => true,
        'deleted' => $statement->rowCount(),
    ]);
}

/**
 * Every Partie alongside the Categorie IDs currently linked to it, plus the full Categorie list.
 */
function handlePartieCategories(PDO $pdo): void
{
    $parties = $pdo->query(
        'SELECT p.ID, p.Nom,
                (SELECT GROUP_CONCAT(pc.CategorieID ORDER BY pc.CategorieID SEPARATOR \',\')
                 FROM `PartieCategorie` pc WHERE pc.PartieID = p.ID) AS CategorieIds
         FROM `Partie` p
         ORDER BY p.Nom ASC'
    )->fetchAll();

    $categories = $pdo->query('SELECT ID, Nom FROM `Categorie` ORDER BY Nom ASC')->fetchAll();

    respondJson(200, [
        'success' => true,
        'parties' => array_map(static fn (array $row): array => [
            'id' => (int) $row['ID'],
            'nom' => (string) $row['Nom'],
            'categorieIds' => $row['CategorieIds'] === null
                ? []
                : array_map('intval', explode(',', (string) $row['CategorieIds'])),
        ], $parties),
        'categories' => array_map(static fn (array $row): array => [
            'id' => (int) $row['ID'],
            'nom' => (string) $row['Nom'],
        ], $categories),
    ]);
}

/**
 * Replaces the whole PartieCategorie mapping from a JSON object of partieId => [categorieId, ...].
 */
function handlePartieCategoriesSave(PDO $pdo): void
{
    $decoded = json_decode(requestValue('mapping'), true);
    if (!is_array($decoded)) {
        throw new RuntimeException('Correspondance invalide.');
    }

    $delete = $pdo->prepare('DELETE FROM `PartieCategorie` WHERE PartieID = :partie');
    $insert = $pdo->prepare('INSERT INTO `PartieCategorie` (PartieID, CategorieID) VALUES (:partie, :categorie)');

    $pdo->beginTransaction();

    try {
        foreach ($decoded as $partieId => $categorieIds) {
            $partieId = (int) $partieId;
            if ($partieId <= 0) {
                continue;
            }

            $delete->execute([':partie' => $partieId]);

            foreach ((array) $categorieIds as $categorieId) {
                $categorieId = (int) $categorieId;
                if ($categorieId > 0) {
                    $insert->execute([':partie' => $partieId, ':categorie' => $categorieId]);
                }
            }
        }

        $pdo->commit();
    } catch (Throwable $error) {
        $pdo->rollBack();
        throw $error;
    }

    respondJson(200, ['success' => true]);
}

function handleItemAddChant(PDO $pdo): void
{
    $programmeId = requiredInt('programme_id', 'L\'identifiant du programme');
    $chantId = requiredInt('chant_id', 'Le chant');
    $fichierId = nullableInt('fichier_id', 1, PHP_INT_MAX);

    $items = loadItems($pdo, $programmeId);
    $items[] = [
        'type' => 'chant',
        'position' => count($items) + 1,
        'chantId' => $chantId,
        'fichierId' => $fichierId,
    ];

    rewriteItems($pdo, $programmeId, $items);

    respondJson(200, ['success' => true]);
}

function handleItemAddPartie(PDO $pdo): void
{
    $programmeId = requiredInt('programme_id', 'L\'identifiant du programme');
    $partieId = requiredInt('partie_id', 'La partie');

    $items = loadItems($pdo, $programmeId);
    $items[] = [
        'type' => 'partie',
        'position' => count($items) + 1,
        'partieId' => $partieId,
    ];

    rewriteItems($pdo, $programmeId, $items);

    respondJson(200, ['success' => true]);
}

function handleItemRemove(PDO $pdo): void
{
    $programmeId = requiredInt('programme_id', 'L\'identifiant du programme');
    $position = requiredInt('position', 'La position');

    $items = array_values(array_filter(
        loadItems($pdo, $programmeId),
        static fn (array $item): bool => $item['position'] !== $position
    ));

    rewriteItems($pdo, $programmeId, $items);

    respondJson(200, ['success' => true]);
}

function handleItemMove(PDO $pdo): void
{
    $programmeId = requiredInt('programme_id', 'L\'identifiant du programme');
    $position = requiredInt('position', 'La position');
    $direction = requestValue('direction') === 'down' ? 1 : -1;

    $items = loadItems($pdo, $programmeId);
    $index = null;

    foreach ($items as $key => $item) {
        if ($item['position'] === $position) {
            $index = $key;
            break;
        }
    }

    if ($index === null) {
        throw new RuntimeException('Element introuvable dans le programme.');
    }

    $target = $index + $direction;
    if ($target < 0 || $target >= count($items)) {
        respondJson(200, ['success' => true, 'moved' => false]);
    }

    [$items[$index], $items[$target]] = [$items[$target], $items[$index]];

    rewriteItems($pdo, $programmeId, $items);

    respondJson(200, ['success' => true, 'moved' => true]);
}

/**
 * Rewrites both link tables so positions stay contiguous and unique per programme.
 */
function rewriteItems(PDO $pdo, int $programmeId, array $items): void
{
    $deleteChants = $pdo->prepare('DELETE FROM `ProgrammeChant` WHERE ProgrammeID = :id');
    $deleteParties = $pdo->prepare('DELETE FROM `ProgrammePartie` WHERE ProgrammeID = :id');
    $insertChant = $pdo->prepare(
        'INSERT INTO `ProgrammeChant` (ProgrammeID, Position, ChantID, FichierID)
         VALUES (:programme, :position, :chant, :fichier)'
    );
    $insertPartie = $pdo->prepare(
        'INSERT INTO `ProgrammePartie` (ProgrammeID, Position, PartieID)
         VALUES (:programme, :position, :partie)'
    );

    $pdo->beginTransaction();

    try {
        $deleteChants->execute([':id' => $programmeId]);
        $deleteParties->execute([':id' => $programmeId]);

        $position = 0;
        foreach ($items as $item) {
            $position += 1;

            if ($item['type'] === 'chant') {
                $insertChant->execute([
                    ':programme' => $programmeId,
                    ':position' => $position,
                    ':chant' => $item['chantId'],
                    ':fichier' => $item['fichierId'],
                ]);
                continue;
            }

            $insertPartie->execute([
                ':programme' => $programmeId,
                ':position' => $position,
                ':partie' => $item['partieId'],
            ]);
        }

        $pdo->commit();
    } catch (Throwable $error) {
        $pdo->rollBack();
        throw $error;
    }
}

/**
 * One-shot migration of the legacy /pdf/programmes/**.json files into the tables.
 */
function handleImportJson(PDO $pdo): void
{
    $root = realpath(dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . 'pdf' . DIRECTORY_SEPARATOR . 'programmes');

    if ($root === false || !is_dir($root)) {
        throw new RuntimeException('Dossier /pdf/programmes introuvable.');
    }

    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($root, FilesystemIterator::SKIP_DOTS),
        RecursiveIteratorIterator::LEAVES_ONLY
    );

    $imported = 0;
    $skippedDetails = [];
    $unmatchedDetails = [];

    foreach ($iterator as $file) {
        if (!$file->isFile() || strtolower($file->getExtension()) !== 'json') {
            continue;
        }

        $relative = str_replace('\\', '/', substr($file->getPathname(), strlen($root) + 1));
        if (stripos($relative, 'Templates/') === 0) {
            continue;
        }

        $program = json_decode((string) file_get_contents($file->getPathname()), true);
        if (!is_array($program)) {
            $skippedDetails[] = ['file' => $relative, 'reason' => 'JSON illisible ou invalide.'];
            continue;
        }

        $date = normalizeImportedDate((string) ($program['date'] ?? ''));
        if ($date === null) {
            $skippedDetails[] = ['file' => $relative, 'reason' => 'Date manquante ou invalide (' . (string) ($program['date'] ?? '') . ').'];
            continue;
        }

        $paroisse = trim((string) ($program['paroisse'] ?? ''));
        if ($paroisse === '') {
            $paroisse = explode('/', $relative)[0];
        }

        $lieu = mb_substr(trim((string) ($program['lieu'] ?? '')), 0, PROGRAMME_MAX_TEXT_LENGTH);
        $occasion = mb_substr(trim((string) ($program['occasion'] ?? '')), 0, PROGRAMME_MAX_TEXT_LENGTH);
        $paroisse = mb_substr($paroisse, 0, PROGRAMME_MAX_TEXT_LENGTH);

        $exists = $pdo->prepare(
            'SELECT ID FROM `Programme` WHERE `Date` = :date AND Lieu = :lieu AND Occasion = :occasion AND Paroisse = :paroisse'
        );
        $exists->execute([
            ':date' => $date,
            ':lieu' => $lieu,
            ':occasion' => $occasion,
            ':paroisse' => $paroisse,
        ]);

        if ($exists->fetchColumn() !== false) {
            $skippedDetails[] = ['file' => $relative, 'reason' => 'Programme deja importe (meme date/lieu/occasion/paroisse).'];
            continue;
        }

        $insert = $pdo->prepare(
            'INSERT INTO `Programme` (`Date`, Lieu, Occasion, Paroisse) VALUES (:date, :lieu, :occasion, :paroisse)'
        );
        $insert->execute([
            ':date' => $date,
            ':lieu' => $lieu,
            ':occasion' => $occasion,
            ':paroisse' => $paroisse,
        ]);
        $programmeId = (int) $pdo->lastInsertId();

        $items = [];
        foreach ((array) ($program['chants'] ?? []) as $entry) {
            if (!is_array($entry)) {
                continue;
            }

            $name = trim((string) ($entry['name'] ?? ''));
            if ($name === '') {
                continue;
            }

            if (($entry['type'] ?? '') === 'partie') {
                $items[] = [
                    'type' => 'partie',
                    'partieId' => resolvePartieId($pdo, trim($name, "[] \t")),
                ];
                continue;
            }

            $path = (string) ($entry['path'] ?? '');
            $reference = resolveChantReference($pdo, $path, $name);
            if ($reference === null) {
                $unmatchedDetails[] = ['file' => $relative, 'name' => $name, 'path' => $path];
                continue;
            }

            $items[] = [
                'type' => 'chant',
                'chantId' => $reference['chantId'],
                'fichierId' => $reference['fichierId'],
            ];
        }

        rewriteItems($pdo, $programmeId, $items);
        $imported += 1;
    }

    respondJson(200, [
        'success' => true,
        'imported' => $imported,
        'skipped' => count($skippedDetails),
        'unmatched' => count($unmatchedDetails),
        'skippedDetails' => $skippedDetails,
        'unmatchedDetails' => $unmatchedDetails,
    ]);
}

function normalizeImportedDate(string $value): ?string
{
    $value = trim($value);
    $date = DateTimeImmutable::createFromFormat('Y-m-d', $value);

    return ($date !== false && $date->format('Y-m-d') === $value) ? $value : null;
}

function resolvePartieId(PDO $pdo, string $nom): int
{
    $nom = mb_substr($nom, 0, PROGRAMME_MAX_TEXT_LENGTH);

    $statement = $pdo->prepare('SELECT ID FROM `Partie` WHERE Nom = :nom');
    $statement->execute([':nom' => $nom]);
    $id = $statement->fetchColumn();

    if ($id !== false) {
        return (int) $id;
    }

    $insert = $pdo->prepare('INSERT INTO `Partie` (Nom) VALUES (:nom)');
    $insert->execute([':nom' => $nom]);

    return (int) $pdo->lastInsertId();
}

/**
 * Legacy paths look like "<Path>/<Nom du chant>/<NomFichier>" relative to /pdf.
 * When the path can't be resolved, falls back to matching the raw "name" field.
 */
function resolveChantReference(PDO $pdo, string $path, string $name = ''): ?array
{
    $segments = array_values(array_filter(explode('/', str_replace('\\', '/', trim($path)))));

    if (count($segments) >= 2) {
        $fileName = array_pop($segments);
        $chantNom = array_pop($segments);
        $chantPath = $segments ? (string) array_pop($segments) : '';

        $statement = $pdo->prepare('SELECT ID FROM `Chant` WHERE Nom = :nom AND Path = :path AND Supprimer = 0');
        $statement->execute([':nom' => $chantNom, ':path' => $chantPath]);
        $chantId = $statement->fetchColumn();

        if ($chantId === false) {
            $statement = $pdo->prepare('SELECT ID FROM `Chant` WHERE Nom = :nom AND Supprimer = 0 LIMIT 1');
            $statement->execute([':nom' => $chantNom]);
            $chantId = $statement->fetchColumn();
        }

        if ($chantId === false) {
            $chantId = findSimilarChantId($pdo, $chantNom);
        }

        if ($chantId !== false && $chantId !== null) {
            return buildChantReference($pdo, (int) $chantId, $fileName);
        }
    }

    $name = trim($name);
    if ($name === '') {
        return null;
    }

    $statement = $pdo->prepare('SELECT ID FROM `Chant` WHERE Nom = :nom AND Supprimer = 0 LIMIT 1');
    $statement->execute([':nom' => $name]);
    $chantId = $statement->fetchColumn();

    if ($chantId === false) {
        $chantId = findSimilarChantId($pdo, $name);
    }

    if ($chantId === false || $chantId === null) {
        return null;
    }

    return buildChantReference($pdo, (int) $chantId, '');
}

/**
 * Looks up (at most) the Fichier linked to a chant by name; leaves fichierId null when unknown.
 */
function buildChantReference(PDO $pdo, int $chantId, string $fileName): array
{
    $fichierId = null;

    if ($fileName !== '') {
        $statement = $pdo->prepare('SELECT ID FROM `Fichier` WHERE ChantID = :chant AND NomFichier = :nom AND Supprimer = 0');
        $statement->execute([':chant' => $chantId, ':nom' => $fileName]);
        $result = $statement->fetchColumn();
        $fichierId = $result === false ? null : (int) $result;
    }

    return [
        'chantId' => $chantId,
        'fichierId' => $fichierId,
    ];
}

/**
 * Last-resort fallback: picks the existing chant whose name is closest to the
 * requested one, ignoring accents/case/punctuation differences.
 */
function findSimilarChantId(PDO $pdo, string $chantNom): ?int
{
    $target = normalizeForSimilarity($chantNom);
    if ($target === '') {
        return null;
    }

    $rows = $pdo->query('SELECT ID, Nom FROM `Chant` WHERE Supprimer = 0')->fetchAll();

    $bestId = null;
    $bestScore = 0.0;

    foreach ($rows as $row) {
        similar_text($target, normalizeForSimilarity((string) $row['Nom']), $percent);
        if ($percent > $bestScore) {
            $bestScore = $percent;
            $bestId = (int) $row['ID'];
        }
    }

    return $bestScore >= 60.0 ? $bestId : null;
}

function normalizeForSimilarity(string $value): string
{
    $value = mb_strtolower(trim($value));

    if (function_exists('iconv')) {
        $converted = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $value);
        if ($converted !== false) {
            $value = $converted;
        }
    }

    return trim((string) preg_replace('/[^a-z0-9]+/', ' ', $value));
}

function mapProgrammeRow(array $row): array
{
    return [
        'id' => (int) $row['ID'],
        'date' => (string) $row['Date'],
        'lieu' => (string) $row['Lieu'],
        'occasion' => (string) $row['Occasion'],
        'paroisse' => (string) $row['Paroisse'],
        'description' => isset($row['Description']) && $row['Description'] !== null ? (string) $row['Description'] : '',
        'aelf' => isset($row['AELF']) && (int) $row['AELF'] === 1,
        'chantCount' => (int) ($row['ChantCount'] ?? 0),
        'partieCount' => (int) ($row['PartieCount'] ?? 0),
    ];
}
