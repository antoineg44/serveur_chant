<?php

declare(strict_types=1);

require_once __DIR__ . '/../config.php';

session_start();

applyCorsHeaders();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$action = (string) ($_REQUEST['action'] ?? '');

try {
    switch ($action) {
        case 'login':
            handleLogin();
            break;

        case 'logout':
            handleLogout();
            break;

        case 'check':
            handleCheck();
            break;

        case 'list_users':
            requireAdmin();
            handleListUsers();
            break;

        case 'create_user':
            requireAdmin();
            handleCreateUser();
            break;

        case 'update_user':
            requireAdmin();
            handleUpdateUser();
            break;

        case 'delete_user':
            requireAdmin();
            handleDeleteUser();
            break;

        default:
            throw new RuntimeException('Unsupported action.');
    }
} catch (Throwable $error) {
    respondJson(400, ['success' => false, 'message' => $error->getMessage()]);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function respondJson(int $status, array $payload): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function applyCorsHeaders(): void
{
    $origin = (string) ($_SERVER['HTTP_ORIGIN'] ?? '');
    $isAllowed = $origin === WEBAPP_ALLOWED_ORIGIN
        || $origin === 'null'
        || (bool) preg_match('/^https?:\/\/localhost(:\d+)?$/i', $origin)
        || (bool) preg_match('/^https?:\/\/127\.0\.0\.1(:\d+)?$/i', $origin);

    if ($origin !== '' && $isAllowed) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Vary: Origin');
    }

    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Max-Age: 86400');
}

function requireAdmin(): void
{
    if (empty($_SESSION['user']) || $_SESSION['user']['role'] !== 'admin') {
        respondJson(403, ['success' => false, 'message' => 'Acces refuse.']);
    }
}

function usersFilePath(): string
{
    return __DIR__ . '/users.json';
}

function loadUsers(): array
{
    $path = usersFilePath();
    if (!file_exists($path)) {
        // Create default admin on first use
        $default = [
            [
                'id'       => 1,
                'username' => 'admin',
                'password' => password_hash('admin', PASSWORD_BCRYPT),
                'role'     => 'admin',
                'active'   => true,
            ],
        ];
        file_put_contents($path, json_encode($default, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        return $default;
    }

    $data = json_decode((string) file_get_contents($path), true);
    return is_array($data) ? $data : [];
}

function saveUsers(array $users): void
{
    file_put_contents(usersFilePath(), json_encode(array_values($users), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

function sanitizeUserForOutput(array $user): array
{
    unset($user['password']);
    return $user;
}

// ─── Handlers ────────────────────────────────────────────────────────────────

function handleLogin(): void
{
    $username = trim((string) ($_POST['username'] ?? ''));
    $password  = (string) ($_POST['password'] ?? '');

    if ($username === '' || $password === '') {
        throw new RuntimeException('Identifiant et mot de passe requis.');
    }

    $users = loadUsers();
    $found = null;

    foreach ($users as $user) {
        if ($user['username'] === $username) {
            $found = $user;
            break;
        }
    }

    if ($found === null || !($found['active'] ?? false) || !password_verify($password, $found['password'])) {
        respondJson(401, ['success' => false, 'message' => 'Identifiant ou mot de passe incorrect.']);
    }

    session_regenerate_id(true);
    $_SESSION['user'] = sanitizeUserForOutput($found);

    respondJson(200, ['success' => true, 'user' => $_SESSION['user']]);
}

function handleLogout(): void
{
    session_destroy();
    respondJson(200, ['success' => true]);
}

function handleCheck(): void
{
    if (!empty($_SESSION['user'])) {
        respondJson(200, ['success' => true, 'user' => $_SESSION['user']]);
    } else {
        respondJson(200, ['success' => false]);
    }
}

function handleListUsers(): void
{
    $users = array_map('sanitizeUserForOutput', loadUsers());
    respondJson(200, ['success' => true, 'users' => $users]);
}

function handleCreateUser(): void
{
    $username = trim((string) ($_POST['username'] ?? ''));
    $password  = (string) ($_POST['password'] ?? '');
    $role      = (string) ($_POST['role'] ?? 'user');
    $active    = filter_var($_POST['active'] ?? true, FILTER_VALIDATE_BOOLEAN);

    if ($username === '') {
        throw new RuntimeException('Identifiant requis.');
    }
    if (strlen($password) < 6) {
        throw new RuntimeException('Le mot de passe doit contenir au moins 6 caractères.');
    }
    if (!in_array($role, ['admin', 'user'], true)) {
        throw new RuntimeException('Rôle invalide.');
    }

    $users = loadUsers();
    foreach ($users as $existing) {
        if ($existing['username'] === $username) {
            throw new RuntimeException('Cet identifiant existe déjà.');
        }
    }

    $maxId = 0;
    foreach ($users as $u) {
        if ($u['id'] > $maxId) {
            $maxId = $u['id'];
        }
    }

    $newUser = [
        'id'       => $maxId + 1,
        'username' => $username,
        'password' => password_hash($password, PASSWORD_BCRYPT),
        'role'     => $role,
        'active'   => $active,
    ];

    $users[] = $newUser;
    saveUsers($users);

    respondJson(200, ['success' => true, 'user' => sanitizeUserForOutput($newUser)]);
}

function handleUpdateUser(): void
{
    $id       = (int) ($_POST['id'] ?? 0);
    $password = (string) ($_POST['password'] ?? '');
    $role     = (string) ($_POST['role'] ?? '');
    $active   = filter_var($_POST['active'] ?? null, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);

    if ($id <= 0) {
        throw new RuntimeException('ID utilisateur invalide.');
    }

    $users = loadUsers();
    $updated = false;

    foreach ($users as &$user) {
        if ($user['id'] !== $id) {
            continue;
        }

        if ($password !== '') {
            if (strlen($password) < 6) {
                throw new RuntimeException('Le mot de passe doit contenir au moins 6 caractères.');
            }
            $user['password'] = password_hash($password, PASSWORD_BCRYPT);
        }

        if ($role !== '' && in_array($role, ['admin', 'user'], true)) {
            // Prevent removing last admin
            if ($user['role'] === 'admin' && $role === 'user') {
                $adminCount = count(array_filter($users, fn($u) => $u['role'] === 'admin'));
                if ($adminCount <= 1) {
                    throw new RuntimeException('Impossible de retirer le dernier administrateur.');
                }
            }
            $user['role'] = $role;
        }

        if ($active !== null) {
            $user['active'] = $active;
        }

        $updated = true;
        $result  = sanitizeUserForOutput($user);
        break;
    }
    unset($user);

    if (!$updated) {
        throw new RuntimeException('Utilisateur introuvable.');
    }

    saveUsers($users);
    respondJson(200, ['success' => true, 'user' => $result]);
}

function handleDeleteUser(): void
{
    $id = (int) ($_POST['id'] ?? 0);

    if ($id <= 0) {
        throw new RuntimeException('ID utilisateur invalide.');
    }

    // Prevent self-deletion
    if (!empty($_SESSION['user']) && $_SESSION['user']['id'] === $id) {
        throw new RuntimeException('Impossible de supprimer votre propre compte.');
    }

    $users = loadUsers();

    // Prevent deleting last admin
    $target = null;
    foreach ($users as $u) {
        if ($u['id'] === $id) {
            $target = $u;
            break;
        }
    }

    if ($target === null) {
        throw new RuntimeException('Utilisateur introuvable.');
    }

    if ($target['role'] === 'admin') {
        $adminCount = count(array_filter($users, fn($u) => $u['role'] === 'admin'));
        if ($adminCount <= 1) {
            throw new RuntimeException('Impossible de supprimer le dernier administrateur.');
        }
    }

    $users = array_filter($users, fn($u) => $u['id'] !== $id);
    saveUsers($users);

    respondJson(200, ['success' => true]);
}
