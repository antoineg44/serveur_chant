<?php

declare(strict_types=1);

require_once __DIR__ . '/../config.php';

$origin = (string) ($_SERVER['HTTP_ORIGIN'] ?? '');
if ($origin === WEBAPP_ALLOWED_ORIGIN) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
    header('Access-Control-Allow-Credentials: true');
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    header('Allow: GET');
    http_response_code(405);
    header('Content-Type: application/json; charset=UTF-8');
    echo json_encode(['success' => false, 'message' => 'Methode non autorisee.']);
    exit;
}

require_once __DIR__ . '/../auth.php';
requireWebappAccess();

header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store');
echo json_encode([
    'success' => true,
    'user' => [
        'username' => (string) ($_SESSION['utilisateur_identifiant'] ?? ''),
        'role' => (string) ($_SESSION['utilisateur_role'] ?? ''),
    ],
]);
