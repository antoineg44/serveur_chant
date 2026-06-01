<?php

declare(strict_types=1);

$projectRoot = realpath(dirname(__DIR__, 2));

if ($projectRoot === false) {
    respondJson(500, [
        'success' => false,
        'message' => 'Root directory not found.',
    ]);
}

$action = (string) ($_REQUEST['action'] ?? 'list');

if ($action === 'download') {
    handleDownload($projectRoot);
    exit;
}

try {
    switch ($action) {
        case 'list':
            handleList($projectRoot);
            break;

        case 'mkdir':
            handleMkdir($projectRoot);
            break;

        case 'rename':
            handleRename($projectRoot);
            break;

        case 'delete':
            handleDelete($projectRoot);
            break;

        case 'upload':
            handleUpload($projectRoot);
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

        $fullPath = $directory . DIRECTORY_SEPARATOR . $entry;
        $isDir = is_dir($fullPath);

        $items[] = [
            'name' => $entry,
            'path' => relativePath($root, $fullPath),
            'type' => $isDir ? 'dir' : 'file',
            'size' => $isDir ? null : filesize($fullPath),
            'mtime' => filemtime($fullPath),
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

function recursiveDelete(string $path): void
{
    if (is_file($path) || is_link($path)) {
        if (!unlink($path)) {
            throw new RuntimeException('Unable to delete file.');
        }
        return;
    }

    $items = scandir($path);
    if ($items === false) {
        throw new RuntimeException('Unable to scan directory for deletion.');
    }

    foreach ($items as $item) {
        if ($item === '.' || $item === '..') {
            continue;
        }
        recursiveDelete($path . DIRECTORY_SEPARATOR . $item);
    }

    if (!rmdir($path)) {
        throw new RuntimeException('Unable to delete directory.');
    }
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

    recursiveDelete($target);

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
