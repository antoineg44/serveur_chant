<?php

declare(strict_types=1);

if (session_status() !== PHP_SESSION_ACTIVE) {
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

function webappAuthError(int $status, string $message): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=UTF-8');
    header('Cache-Control: no-store');
    echo json_encode(['success' => false, 'message' => $message]);
    exit;
}

function requireWebappAccess(bool $adminOnly = false): void
{
    if (!isset($_SESSION['utilisateur_id'])) {
        webappAuthError(401, 'Authentification requise.');
    }

    try {
        require '/var/www/compte/config/database.php';
        require_once '/var/www/compte/config/services.php';
        $allowed = utilisateurAAccesService($pdo, (int) $_SESSION['utilisateur_id'], 'partitions');
    } catch (Throwable $exception) {
        error_log('Erreur de verification des droits partitions : ' . $exception->getMessage());
        webappAuthError(500, 'Impossible de verifier vos autorisations.');
    }

    if (!$allowed || ($adminOnly && ($_SESSION['utilisateur_role'] ?? '') !== 'admin')) {
        webappAuthError(403, 'Acces refuse.');
    }
}
