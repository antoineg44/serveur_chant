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

$projectRoot = realpath(dirname(__DIR__, 2));

if ($projectRoot === false) {
    respondJson(500, [
        'success' => false,
        'message' => 'Root directory not found.',
    ]);
}

$pdfRoot = $projectRoot . DIRECTORY_SEPARATOR . 'pdf';

if (!is_dir($pdfRoot)) {
    respondJson(500, [
        'success' => false,
        'message' => 'PDF directory not found.',
    ]);
}

$action = (string) ($_REQUEST['action'] ?? 'list');

if ($action === 'download') {
    handleDownload($pdfRoot);
    exit;
}

if ($action === 'download_program') {
    handleDownloadProgram($pdfRoot);
    exit;
}

if ($action === 'download_program_complete') {
    handleDownloadProgramComplete($pdfRoot);
    exit;
}

try {
    switch ($action) {
        case 'list':
            handleList($pdfRoot);
            break;

        case 'list_tree':
            handleListTree($pdfRoot);
            break;

        case 'search':
            handleSearch($pdfRoot);
            break;

        case 'mkdir':
            handleMkdir($pdfRoot);
            break;

        case 'rename':
            handleRename($pdfRoot);
            break;

        case 'move':
            handleMove($pdfRoot);
            break;

        case 'delete':
            handleDelete($pdfRoot);
            break;

        case 'upload':
            handleUpload($pdfRoot);
            break;

        default:
            throw new RuntimeException('Unsupported action.');
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
    echo json_encode($payload, JSON_UNESCAPED_SLASHES);
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

function requestValue(string $key): string
{
    $value = $_REQUEST[$key] ?? '';
    return is_string($value) ? trim($value) : '';
}

function normalizeSearchText(string $value): string
{
    $value = mb_strtolower(trim($value));

    if ($value === '') {
        return '';
    }

    if (function_exists('iconv')) {
        $converted = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $value);
        if ($converted !== false) {
            $value = $converted;
        }
    }

    // Ignore punctuation, separators and symbols when searching.
    $value = preg_replace('/[^a-z0-9]/i', '', $value) ?? '';
    return $value;
}

function normalizeRelativePath(string $path): string
{
    $path = str_replace('\\', '/', trim($path));
    $path = trim($path, '/');

    if ($path === '') {
        return '';
    }

    $parts = explode('/', $path);
    $safe = [];

    foreach ($parts as $part) {
        $part = trim($part);
        if ($part === '' || $part === '.') {
            continue;
        }
        if ($part === '..') {
            throw new RuntimeException('Invalid path traversal sequence.');
        }
        if (str_contains($part, "\0")) {
            throw new RuntimeException('Invalid path segment.');
        }
        $safe[] = $part;
    }

    return implode('/', $safe);
}

function absolutePath(string $root, string $relativePath): string
{
    $relativePath = normalizeRelativePath($relativePath);
    if ($relativePath === '') {
        return $root;
    }

    return $root . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $relativePath);
}

function relativePath(string $root, string $absolute): string
{
    if ($absolute === $root) {
        return '';
    }

    $prefix = rtrim($root, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR;
    $value = str_starts_with($absolute, $prefix) ? substr($absolute, strlen($prefix)) : $absolute;

    return str_replace('\\', '/', $value);
}

function validateName(string $name): string
{
    $name = trim($name);

    if ($name === '') {
        throw new RuntimeException('Name cannot be empty.');
    }
    if (str_contains($name, '/') || str_contains($name, '\\')) {
        throw new RuntimeException('Name cannot contain slashes.');
    }
    if ($name === '.' || $name === '..') {
        throw new RuntimeException('Invalid name.');
    }

    return $name;
}

function handleList(string $root): void
{
    $relative = requestValue('path');
    $directory = absolutePath($root, $relative);

    if (!is_dir($directory)) {
        throw new RuntimeException('Directory not found.');
    }

    $entries = scandir($directory);
    if ($entries === false) {
        throw new RuntimeException('Unable to read directory.');
    }

    $items = [];
    foreach ($entries as $entry) {
        if ($entry === '.' || $entry === '..') {
            continue;
        }
        if (str_starts_with($entry, '.')) {
            continue;
        }

        $fullPath = $directory . DIRECTORY_SEPARATOR . $entry;
        $isDir = is_dir($fullPath);
        $isEmpty = null;

        if ($isDir) {
            $children = scandir($fullPath);
            if ($children === false) {
                throw new RuntimeException('Unable to inspect directory.');
            }
            $visibleChildren = array_filter(
                $children,
                static function (string $child): bool {
                    return $child !== '.' && $child !== '..' && !str_starts_with($child, '.');
                }
            );
            $isEmpty = count($visibleChildren) === 0;
        }

        $items[] = [
            'name' => $entry,
            'path' => relativePath($root, $fullPath),
            'type' => $isDir ? 'dir' : 'file',
            'size' => $isDir ? null : filesize($fullPath),
            'mtime' => filemtime($fullPath),
            'isEmptyDir' => $isEmpty,
        ];
    }

    usort(
        $items,
        static function (array $a, array $b): int {
            if ($a['type'] !== $b['type']) {
                return $a['type'] === 'dir' ? -1 : 1;
            }
            return strnatcasecmp((string) $a['name'], (string) $b['name']);
        }
    );

    $current = normalizeRelativePath($relative);
    $parent = null;
    if ($current !== '') {
        $lastSlash = strrpos($current, '/');
        $parent = $lastSlash === false ? '' : substr($current, 0, $lastSlash);
    }

    respondJson(200, [
        'success' => true,
        'currentPath' => $current,
        'parentPath' => $parent,
        'items' => $items,
    ]);
}

function handleListTree(string $root): void
{
    $relative = requestValue('path');
    $startDir = absolutePath($root, $relative);

    if (!is_dir($startDir)) {
        throw new RuntimeException('Directory not found.');
    }

    $current = normalizeRelativePath($relative);
    $foldersSet = [];
    $foldersSet[$current] = true;
    $files = [];

    $directoryIterator = new RecursiveDirectoryIterator($startDir, FilesystemIterator::SKIP_DOTS);
    $filterIterator = new RecursiveCallbackFilterIterator(
        $directoryIterator,
        static function (SplFileInfo $entry): bool {
            $name = (string) $entry->getFilename();
            return $name !== '' && !str_starts_with($name, '.');
        }
    );
    $iterator = new RecursiveIteratorIterator($filterIterator, RecursiveIteratorIterator::SELF_FIRST);

    foreach ($iterator as $entry) {
        $name = (string) $entry->getFilename();
        $pathName = (string) $entry->getPathname();
        $path = relativePath($root, $pathName);

        if ($entry->isDir()) {
            $foldersSet[$path] = true;
            continue;
        }

        $files[] = [
            'name' => $name,
            'path' => $path,
            'type' => 'file',
            'size' => $entry->getSize() ?: 0,
            'mtime' => $entry->getMTime(),
        ];
    }

    usort(
        $files,
        static function (array $a, array $b): int {
            return strnatcasecmp((string) $a['path'], (string) $b['path']);
        }
    );

    $folders = array_keys($foldersSet);
    usort(
        $folders,
        static function (string $a, string $b): int {
            return strnatcasecmp($a, $b);
        }
    );

    respondJson(200, [
        'success' => true,
        'currentPath' => $current,
        'files' => $files,
        'folders' => $folders,
    ]);
}

function isDirectoryEmptyVisible(string $directory): bool
{
    $children = scandir($directory);
    if ($children === false) {
        throw new RuntimeException('Unable to inspect directory.');
    }

    $visibleChildren = array_filter(
        $children,
        static function (string $child): bool {
            return $child !== '.' && $child !== '..' && !str_starts_with($child, '.');
        }
    );

    return count($visibleChildren) === 0;
}

function handleSearch(string $root): void
{
    $relative = requestValue('path');
    $queryRaw = requestValue('q');
    $query = normalizeSearchText($queryRaw);

    if ($query === '') {
        respondJson(200, [
            'success' => true,
            'items' => [],
            'query' => '',
            'searchedPath' => normalizeRelativePath($relative),
        ]);
    }

    $startDir = absolutePath($root, $relative);
    if (!is_dir($startDir)) {
        throw new RuntimeException('Directory not found.');
    }

    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($startDir, FilesystemIterator::SKIP_DOTS),
        RecursiveIteratorIterator::SELF_FIRST
    );

    $items = [];
    $startPrefix = rtrim($startDir, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR;

    foreach ($iterator as $entry) {
        $name = (string) $entry->getFilename();
        if ($name === '' || str_starts_with($name, '.')) {
            continue;
        }

        $fullPath = (string) $entry->getPathname();
        if (!str_starts_with($fullPath, $startPrefix) && $fullPath !== $startDir) {
            continue;
        }

        $relativePath = relativePath($root, $fullPath);
        $haystack = normalizeSearchText($name . ' ' . $relativePath);

        if (!str_contains($haystack, $query)) {
            continue;
        }

        $isDir = $entry->isDir();
        $items[] = [
            'name' => $name,
            'path' => $relativePath,
            'type' => $isDir ? 'dir' : 'file',
            'size' => $isDir ? null : ($entry->getSize() ?: 0),
            'mtime' => $entry->getMTime(),
            'isEmptyDir' => $isDir ? isDirectoryEmptyVisible($fullPath) : null,
        ];
    }

    usort(
        $items,
        static function (array $a, array $b): int {
            if ($a['type'] !== $b['type']) {
                return $a['type'] === 'dir' ? -1 : 1;
            }
            return strnatcasecmp((string) $a['path'], (string) $b['path']);
        }
    );

    respondJson(200, [
        'success' => true,
        'items' => $items,
        'query' => $queryRaw,
        'searchedPath' => normalizeRelativePath($relative),
    ]);
}

function handleMkdir(string $root): void
{
    $relative = requestValue('path');
    $name = validateName(requestValue('name'));

    $targetRelative = normalizeRelativePath(($relative !== '' ? $relative . '/' : '') . $name);
    $target = absolutePath($root, $targetRelative);

    if (file_exists($target)) {
        throw new RuntimeException('Target already exists.');
    }

    if (!mkdir($target, 0775, true) && !is_dir($target)) {
        throw new RuntimeException('Unable to create directory.');
    }

    respondJson(200, [
        'success' => true,
        'message' => 'Directory created.',
    ]);
}

function handleRename(string $root): void
{
    $relative = requestValue('path');
    $newName = validateName(requestValue('newName'));

    $source = absolutePath($root, $relative);
    if (!file_exists($source)) {
        throw new RuntimeException('Source not found.');
    }
    $sourceIsFile = is_file($source);

    $normalized = normalizeRelativePath($relative);
    if ($normalized === '') {
        throw new RuntimeException('Cannot rename root.');
    }

    $lastSlash = strrpos($normalized, '/');
    $parent = $lastSlash === false ? '' : substr($normalized, 0, $lastSlash);

    $targetRelative = normalizeRelativePath(($parent !== '' ? $parent . '/' : '') . $newName);
    $target = absolutePath($root, $targetRelative);

    if (file_exists($target)) {
        throw new RuntimeException('Target already exists.');
    }

    if (!rename($source, $target)) {
        throw new RuntimeException('Unable to rename entry.');
    }

    if ($sourceIsFile) {
        $author = currentDeletionAuthor();
        logDeletedFileInSupprimer($normalized, $author);
        logAddedFileInAjouter($targetRelative, $author);
    }

    respondJson(200, [
        'success' => true,
        'message' => 'Entry renamed.',
    ]);
}

function handleMove(string $root): void
{
    $sourceRelative = normalizeRelativePath(requestValue('path'));
    $targetRelative = normalizeRelativePath(requestValue('targetPath'));

    if ($sourceRelative === '' || $targetRelative === '') {
        throw new RuntimeException('Source and target paths are required.');
    }

    $source = absolutePath($root, $sourceRelative);
    $target = absolutePath($root, $targetRelative);

    if (!file_exists($source)) {
        throw new RuntimeException('Source not found.');
    }

    if (file_exists($target)) {
        throw new RuntimeException('Target already exists.');
    }

    $targetDir = dirname($target);
    if (!is_dir($targetDir) && !mkdir($targetDir, 0775, true) && !is_dir($targetDir)) {
        throw new RuntimeException('Unable to create target directory.');
    }

    if (!rename($source, $target)) {
        throw new RuntimeException('Unable to move entry.');
    }

    respondJson(200, [
        'success' => true,
        'message' => 'Entry moved.',
    ]);
}

function handleDelete(string $root): void
{
    $relative = requestValue('path');
    $normalized = normalizeRelativePath($relative);

    if ($normalized === '') {
        throw new RuntimeException('Cannot delete root.');
    }

    $target = absolutePath($root, $normalized);
    if (!file_exists($target)) {
        throw new RuntimeException('Target not found.');
    }

    if (is_dir($target)) {
        $items = scandir($target);
        if ($items === false) {
            throw new RuntimeException('Unable to inspect directory.');
        }

        $visibleChildren = array_filter(
            $items,
            static function (string $item): bool {
                return $item !== '.' && $item !== '..' && !str_starts_with($item, '.');
            }
        );

        if (count($visibleChildren) > 0) {
            throw new RuntimeException('Cannot delete a non-empty folder.');
        }

        if (!rmdir($target)) {
            throw new RuntimeException('Unable to delete directory.');
        }
    } else {
        if (!unlink($target)) {
            throw new RuntimeException('Unable to delete file.');
        }

        // Mirror legacy behavior from php/suppression.php: keep a deletion trace.
        logDeletedFileInSupprimer(basename($normalized), currentDeletionAuthor());
    }

    respondJson(200, [
        'success' => true,
        'message' => 'Entry deleted.',
    ]);
}

function currentDeletionAuthor(): string
{
    $username = $_SESSION['user']['username'] ?? '';
    if (!is_string($username) || trim($username) === '') {
        return 'web';
    }
    return trim($username);
}

function resolveLegacyDeletionPdo(): ?PDO
{
    if (isset($_SESSION['session']) && $_SESSION['session'] instanceof PDO) {
        return $_SESSION['session'];
    }

    $legacyConnectionFile = dirname(__DIR__, 2) . '/php/connexion.php';
    if (!file_exists($legacyConnectionFile)) {
        return null;
    }

    require_once $legacyConnectionFile;

    if (function_exists('connexion')) {
        connexion();
    } elseif (function_exists('connection')) {
        connection();
    }

    return (isset($_SESSION['session']) && $_SESSION['session'] instanceof PDO)
        ? $_SESSION['session']
        : null;
}

function logDeletedFileInSupprimer(string $fileName, string $author): void
{
    $fileName = trim($fileName);
    if ($fileName === '') {
        return;
    }

    try {
        $pdo = resolveLegacyDeletionPdo();
        if (!$pdo) {
            return;
        }

        date_default_timezone_set('Europe/Paris');
        $date = date('Y-m-d H:i:s');

        $statement = $pdo->prepare('INSERT INTO Supprimer (`Date`, titre, auteur) VALUES (:date, :title, :author)');
        $statement->execute([
            ':date' => $date,
            ':title' => $fileName,
            ':author' => $author,
        ]);
    } catch (Throwable $error) {
        // Deletion should still succeed even if audit logging is unavailable.
        error_log('Supprimer insert failed: ' . $error->getMessage());
    }
}

function logAddedFileInAjouter(string $fileName, string $author): void
{
    $fileName = trim($fileName);
    if ($fileName === '') {
        return;
    }

    try {
        $pdo = resolveLegacyDeletionPdo();
        if (!$pdo) {
            return;
        }

        date_default_timezone_set('Europe/Paris');
        $date = date('Y-m-d H:i:s');

        $statement = $pdo->prepare('INSERT INTO Ajouter (`Date`, titre, auteur) VALUES (:date, :title, :author)');
        $statement->execute([
            ':date' => $date,
            ':title' => $fileName,
            ':author' => $author,
        ]);
    } catch (Throwable $error) {
        // Rename should still succeed even if audit logging is unavailable.
        error_log('Ajouter insert failed: ' . $error->getMessage());
    }
}

function handleUpload(string $root): void
{
    $relative = requestValue('path');
    $targetDir = absolutePath($root, $relative);

    if (!is_dir($targetDir)) {
        throw new RuntimeException('Target directory not found.');
    }

    if (!isset($_FILES['file']) || !is_array($_FILES['file'])) {
        throw new RuntimeException('No file uploaded.');
    }

    $file = $_FILES['file'];
    $tmpName = (string) ($file['tmp_name'] ?? '');
    $error = (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE);
    $originalName = (string) ($file['name'] ?? '');

    if ($error !== UPLOAD_ERR_OK) {
        throw new RuntimeException('Upload failed with code ' . $error . '.');
    }

    $safeName = validateName(basename($originalName));
    $destination = $targetDir . DIRECTORY_SEPARATOR . $safeName;

    if (!move_uploaded_file($tmpName, $destination)) {
        throw new RuntimeException('Unable to save uploaded file.');
    }

    respondJson(200, [
        'success' => true,
        'message' => 'File uploaded.',
    ]);
}

function handleDownloadProgram(string $root): void
{
    if (!class_exists('ZipArchive')) {
        respondJson(500, [
            'success' => false,
            'message' => 'ZipArchive n est pas disponible sur le serveur.',
        ]);
    }

    $relative = requestValue('path');
    $normalized = normalizeRelativePath($relative);

    if ($normalized === '') {
        respondJson(400, [
            'success' => false,
            'message' => 'Aucun programme selectionne pour le telechargement.',
        ]);
    }

    $programFile = absolutePath($root, $normalized);
    if (!is_file($programFile)) {
        respondJson(404, [
            'success' => false,
            'message' => 'Fichier de programme introuvable.',
        ]);
    }

    $lower = strtolower($programFile);
    if (!str_ends_with($lower, '.json') && !str_ends_with($lower, '.txt')) {
        respondJson(400, [
            'success' => false,
            'message' => 'Le telechargement de programme est disponible uniquement pour les fichiers .json et .txt.',
        ]);
    }

    $filesToZip = collectProgramFileReferences($root, $programFile, $normalized);
    $filesToZip[] = $programFile;
    $filesToZip = array_unique($filesToZip);

    $zipBaseName = preg_replace('/[^a-zA-Z0-9_\-\.]/', '_', pathinfo($programFile, PATHINFO_FILENAME));
    if ($zipBaseName === '') {
        $zipBaseName = 'programme';
    }
    $zipName = $zipBaseName . '.zip';

    $tempFile = tempnam(sys_get_temp_dir(), 'programme_zip_');
    if ($tempFile === false) {
        respondJson(500, [
            'success' => false,
            'message' => 'Impossible de creer un fichier temporaire.',
        ]);
    }

    $zip = new ZipArchive();
    if ($zip->open($tempFile, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
        @unlink($tempFile);
        respondJson(500, [
            'success' => false,
            'message' => 'Impossible d initialiser l archive ZIP.',
        ]);
    }

    $usedNames = [];
    foreach ($filesToZip as $absolutePath) {
        if (!is_file($absolutePath) || !is_readable($absolutePath)) {
            continue;
        }

        $fileName = basename($absolutePath);
        $baseName = pathinfo($fileName, PATHINFO_FILENAME);
        $extension = pathinfo($fileName, PATHINFO_EXTENSION);
        $zipPath = $fileName;
        $counter = 1;

        while (isset($usedNames[$zipPath])) {
            $suffix = ' (' . $counter . ')';
            $zipPath = $baseName . $suffix . ($extension !== '' ? '.' . $extension : '');
            $counter++;
        }

        $usedNames[$zipPath] = true;
        $zip->addFile($absolutePath, $zipPath);
    }

    $zip->close();

    if (!is_file($tempFile) || filesize($tempFile) === 0) {
        @unlink($tempFile);
        respondJson(500, [
            'success' => false,
            'message' => 'Impossible de generer le fichier ZIP.',
        ]);
    }

    header('Content-Description: File Transfer');
    header('Content-Type: application/zip');
    header('Content-Disposition: attachment; filename="' . addslashes($zipName) . '"');
    header('Content-Length: ' . (string) filesize($tempFile));
    header('Cache-Control: no-cache, must-revalidate');
    header('Pragma: public');

    readfile($tempFile);
    @unlink($tempFile);
    exit;
}

function handleDownloadProgramComplete(string $root): void
{
    if (!class_exists('ZipArchive')) {
        respondJson(500, [
            'success' => false,
            'message' => 'ZipArchive n est pas disponible sur le serveur.',
        ]);
    }

    $relative = requestValue('path');
    $normalized = normalizeRelativePath($relative);

    if ($normalized === '') {
        respondJson(400, [
            'success' => false,
            'message' => 'Aucun programme selectionne pour le telechargement.',
        ]);
    }

    $programFile = absolutePath($root, $normalized);
    if (!is_file($programFile)) {
        respondJson(404, [
            'success' => false,
            'message' => 'Fichier de programme introuvable.',
        ]);
    }

    $lower = strtolower($programFile);
    if (!str_ends_with($lower, '.json') && !str_ends_with($lower, '.txt')) {
        respondJson(400, [
            'success' => false,
            'message' => 'Le telechargement de programme est disponible uniquement pour les fichiers .json et .txt.',
        ]);
    }

    $programDirectory = dirname($normalized);
    $content = file_get_contents($programFile);
    if ($content === false) {
        respondJson(500, [
            'success' => false,
            'message' => 'Impossible de lire le fichier de programme.',
        ]);
    }

    // Parse program to extract parts and chants
    $programData = parseProgramData($programFile, $content);
    
    // Collect files organized by part
    $filesByPart = collectFilesByPart($root, $programDirectory, $programData);

    $zipBaseName = preg_replace('/[^a-zA-Z0-9_\-\.]/', '_', pathinfo($programFile, PATHINFO_FILENAME));
    if ($zipBaseName === '') {
        $zipBaseName = 'programme_complet';
    }
    $zipName = $zipBaseName . '_complet.zip';

    $tempFile = tempnam(sys_get_temp_dir(), 'programme_complete_zip_');
    if ($tempFile === false) {
        respondJson(500, [
            'success' => false,
            'message' => 'Impossible de creer un fichier temporaire.',
        ]);
    }

    $zip = new ZipArchive();
    if ($zip->open($tempFile, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
        @unlink($tempFile);
        respondJson(500, [
            'success' => false,
            'message' => 'Impossible d initialiser l archive ZIP.',
        ]);
    }

    // Add files organized by part
    foreach ($filesByPart as $partName => $files) {
        $usedNames = [];
        foreach ($files as $absolutePath) {
            if (!is_file($absolutePath) || !is_readable($absolutePath)) {
                continue;
            }

            $fileName = basename($absolutePath);
            $baseName = pathinfo($fileName, PATHINFO_FILENAME);
            $extension = pathinfo($fileName, PATHINFO_EXTENSION);
            $zipPath = $partName . '/' . $fileName;
            $counter = 1;

            while ($zip->locateName($zipPath) !== false) {
                $suffix = ' (' . $counter . ')';
                $zipPath = $partName . '/' . $baseName . $suffix . ($extension !== '' ? '.' . $extension : '');
                $counter++;
            }

            $zip->addFile($absolutePath, $zipPath);
        }
    }

    $zip->close();

    if (!is_file($tempFile) || filesize($tempFile) === 0) {
        @unlink($tempFile);
        respondJson(500, [
            'success' => false,
            'message' => 'Impossible de generer le fichier ZIP.',
        ]);
    }

    header('Content-Description: File Transfer');
    header('Content-Type: application/zip');
    header('Content-Disposition: attachment; filename="' . addslashes($zipName) . '"');
    header('Content-Length: ' . (string) filesize($tempFile));
    header('Cache-Control: no-cache, must-revalidate');
    header('Pragma: public');

    readfile($tempFile);
    @unlink($tempFile);
    exit;
}

function parseProgramData(string $programFile, string $content): array
{
    $extension = strtolower(pathinfo($programFile, PATHINFO_EXTENSION));
    
    if ($extension === 'json') {
        $data = json_decode($content, true);
        if (!is_array($data)) {
            return [];
        }

        $parts = [];
        $currentPart = 'Divers';
        
        if (isset($data['chants']) && is_array($data['chants'])) {
            foreach ($data['chants'] as $chant) {
                if (!is_array($chant)) {
                    continue;
                }

                if ($chant['type'] === 'partie') {
                    $currentPart = $chant['name'] ?? 'Divers';
                    if (!isset($parts[$currentPart])) {
                        $parts[$currentPart] = [];
                    }
                } elseif ($chant['type'] === 'chant') {
                    if (!isset($parts[$currentPart])) {
                        $parts[$currentPart] = [];
                    }
                    $path = isset($chant['path']) && is_string($chant['path']) ? trim($chant['path']) : '';
                    if ($path !== '') {
                        $parts[$currentPart][] = [
                            'name' => $chant['name'] ?? 'Chant',
                            'path' => $path,
                        ];
                    }
                }
            }
        }

        return $parts;
    } else {
        // Parse TXT format
        $lines = preg_split('/\r\n|\r|\n/', $content);
        if (!is_array($lines)) {
            return [];
        }

        $parts = [];
        $currentPart = 'Divers';
        $count = count($lines);

        for ($i = 0; $i < $count; $i++) {
            $line = trim((string) $lines[$i]);
            
            if ($line === '') {
                continue;
            }

            // Check for part
            $partMatch = preg_match('/^\[(.+)\]$/', $line, $matches);
            if ($partMatch) {
                $currentPart = $matches[1];
                if (!isset($parts[$currentPart])) {
                    $parts[$currentPart] = [];
                }
                continue;
            }

            // Check for chant
            if ($line[0] === '#') {
                $chantName = trim(substr($line, 1));
                $path = '';
                
                if ($i + 1 < $count) {
                    $next = trim((string) $lines[$i + 1]);
                    if (str_starts_with($next, 'path =')) {
                        $path = trim(substr($next, 6));
                        $i++;
                    }
                }

                if ($path !== '') {
                    if (!isset($parts[$currentPart])) {
                        $parts[$currentPart] = [];
                    }
                    $parts[$currentPart][] = [
                        'name' => $chantName,
                        'path' => $path,
                    ];
                }
            }
        }

        return $parts;
    }
}

function collectFilesByPart(string $root, string $programDirectory, array $programData): array
{
    $filesByPart = [];
    $processedDirs = [];

    foreach ($programData as $partName => $chants) {
        $sanitizedPartName = preg_replace('/[^a-zA-Z0-9_\-\.]/', '_', $partName);
        if ($sanitizedPartName === '') {
            $sanitizedPartName = 'Divers';
        }

        $filesByPart[$sanitizedPartName] = [];

        foreach ($chants as $chant) {
            $reference = $chant['path'] ?? '';
            if ($reference === '') {
                continue;
            }

            $resolved = resolveProgramReferencePath($root, $programDirectory, $reference);
            if ($resolved === null) {
                continue;
            }

            // Get directory of the file
            $sourceDir = dirname($resolved);
            $dirKey = realpath($sourceDir);
            
            // If we haven't processed this directory yet for this part, add all files
            if (!isset($processedDirs[$sanitizedPartName]) || !in_array($dirKey, $processedDirs[$sanitizedPartName], true)) {
                if (!isset($processedDirs[$sanitizedPartName])) {
                    $processedDirs[$sanitizedPartName] = [];
                }
                $processedDirs[$sanitizedPartName][] = $dirKey;

                // Add all files from this directory
                if (is_dir($sourceDir)) {
                    $files = scandir($sourceDir);
                    if (is_array($files)) {
                        foreach ($files as $file) {
                            if ($file === '.' || $file === '..') {
                                continue;
                            }

                            $fullPath = $sourceDir . DIRECTORY_SEPARATOR . $file;
                            if (is_file($fullPath)) {
                                $filesByPart[$sanitizedPartName][] = $fullPath;
                            }
                        }
                    }
                }
            }
        }

        // Remove duplicates
        $filesByPart[$sanitizedPartName] = array_unique($filesByPart[$sanitizedPartName]);
    }

    return $filesByPart;
}

function collectProgramFileReferences(string $root, string $programFile, string $programRelative): array
{
    $directory = dirname($programRelative);
    $content = file_get_contents($programFile);
    if ($content === false) {
        return [];
    }

    $references = [];
    $extension = strtolower(pathinfo($programFile, PATHINFO_EXTENSION));

    if ($extension === 'json') {
        $data = json_decode($content, true);
        if (is_array($data) && isset($data['chants']) && is_array($data['chants'])) {
            foreach ($data['chants'] as $chant) {
                if (!is_array($chant)) {
                    continue;
                }
                $path = isset($chant['path']) && is_string($chant['path']) ? trim($chant['path']) : '';
                if ($path === '') {
                    continue;
                }
                $resolved = resolveProgramReferencePath($root, $directory, $path);
                if ($resolved !== null) {
                    $references[] = $resolved;
                }
            }
        }
    } else {
        $lines = preg_split('/\r\n|\r|\n/', $content);
        if (is_array($lines)) {
            $count = count($lines);
            for ($i = 0; $i < $count; $i++) {
                $line = trim((string) $lines[$i]);
                if ($line === '' || $line[0] !== '#') {
                    continue;
                }

                $path = '';
                if ($i + 1 < $count) {
                    $next = trim((string) $lines[$i + 1]);
                    if (str_starts_with($next, 'path =')) {
                        $path = trim(substr($next, 6));
                    }
                }

                if ($path === '') {
                    continue;
                }

                $resolved = resolveProgramReferencePath($root, $directory, $path);
                if ($resolved !== null) {
                    $references[] = $resolved;
                }
            }
        }
    }

    return array_values(array_unique($references));
}

function resolveProgramReferencePath(string $root, string $programDirectory, string $reference): ?string
{
    $reference = str_replace('\\', '/', trim($reference));
    if ($reference === '') {
        return null;
    }

    if (preg_match('/^https?:\/\//i', $reference)) {
        return null;
    }

    $relativeReference = normalizeRelativePath($reference);
    if ($relativeReference === '') {
        return null;
    }

    $candidate = absolutePath($root, $relativeReference);
    if (is_file($candidate)) {
        return $candidate;
    }

    if ($programDirectory !== '') {
        $candidate = absolutePath($root, $programDirectory . '/' . $relativeReference);
        if (is_file($candidate)) {
            return $candidate;
        }
    }

    return null;
}

function handleDownload(string $root): void
{
    $relative = requestValue('path');
    $normalized = normalizeRelativePath($relative);

    if ($normalized === '') {
        respondJson(400, [
            'success' => false,
            'message' => 'No file selected for download.',
        ]);
    }

    $target = absolutePath($root, $normalized);

    if (!is_file($target)) {
        respondJson(404, [
            'success' => false,
            'message' => 'File not found.',
        ]);
    }

    $filename = basename($target);
    $mime = function_exists('mime_content_type') ? (string) mime_content_type($target) : 'application/octet-stream';
    if ($mime === '') {
        $mime = 'application/octet-stream';
    }

    header('Content-Description: File Transfer');
    header('Content-Type: ' . $mime);
    header('Content-Disposition: attachment; filename="' . addslashes($filename) . '"');
    header('Content-Length: ' . (string) filesize($target));
    header('Cache-Control: no-cache, must-revalidate');
    header('Pragma: public');

    readfile($target);
}
