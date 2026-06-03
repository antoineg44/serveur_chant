<?php

declare(strict_types=1);

applyCorsHeaders();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

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

try {
    switch ($action) {
        case 'list':
            handleList($pdfRoot);
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
    $isAllowedOrigin = $origin === 'https://partitions.ovh'
        || $origin === 'null'
        || preg_match('/^https?:\/\/localhost(:\d+)?$/i', $origin) === 1
        || preg_match('/^https?:\/\/127\.0\.0\.1(:\d+)?$/i', $origin) === 1;

    if ($origin !== '' && $isAllowedOrigin) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Vary: Origin');
    }

    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');
    header('Access-Control-Max-Age: 86400');
}

function requestValue(string $key): string
{
    $value = $_REQUEST[$key] ?? '';
    return is_string($value) ? trim($value) : '';
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
    $query = mb_strtolower(requestValue('q'));

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
        $haystack = mb_strtolower($name . ' ' . $relativePath);

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
        'query' => $query,
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
    }

    respondJson(200, [
        'success' => true,
        'message' => 'Entry deleted.',
    ]);
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
