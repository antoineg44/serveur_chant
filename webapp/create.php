<?php

declare(strict_types=1);
$isHttps = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
session_set_cookie_params(['lifetime' => 0, 'path' => '/', 'secure' => $isHttps, 'httponly' => true, 'samesite' => 'Lax',]);
session_start();
require_once '/var/www/compte/config/database.php';
require_once '/var/www/compte/config/services.php'; // Vérifier la connexion. 
if (!isset($_SESSION['utilisateur_id'])) {
    $returnUrl = $_SERVER['REQUEST_URI'] ?? '/webapp/data.php';
    $connexionUrl = '/webapp/connexion.php?return=' . rawurlencode($returnUrl); // L'explorateur étant chargé dans une iframe, // effectuer la redirection dans la fenêtre principale. 
    http_response_code(401);
    header('Content-Type: text/html; charset=UTF-8');
    header('Cache-Control: no-store');
    echo '<!doctype html><html lang="fr"><script>';
    echo 'window.top.location.replace(' . json_encode($connexionUrl, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) . ');';
    echo '</script></html>';
    exit;
} // Vérifier les autorisations. 
try {
    $autorise = utilisateurAAccesService($pdo, (int) $_SESSION['utilisateur_id'], 'partitions');
} catch (Throwable $exception) {
    error_log('Erreur de vérification des droits explorateur : ' . $exception->getMessage());
    http_response_code(500);
    exit('Impossible de vérifier vos autorisations.');
}
if (!$autorise) {
    http_response_code(403);
    exit('Vous n\'êtes pas autorisé à accéder à cet explorateur.');
}
?>

<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>WebApp - Nouveau programme</title>
  <link rel="stylesheet" href="./styles.css" />
  <script src="./config.js"></script>
  <style>
    body {
      place-items: center;
      display: grid;
    }

    .create-form {
      width: 100%;
      padding: 24px;
    }

    .nice-form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 18px;
    }

    .nice-form-group label {
      font-weight: 600;
      font-size: 0.92rem;
      color: var(--ink);
    }

    .nice-form-group input,
    .nice-form-group select,
    .nice-form-group textarea {
      border: 1px solid var(--line);
      border-radius: 10px;
      padding: 9px 12px;
      font: inherit;
      font-size: 0.95rem;
      background: #fff;
      color: var(--ink);
      width: 100%;
    }

    .nice-form-group textarea {
      resize: vertical;
      min-height: 90px;
    }

    .form-message {
      font-size: 0.9rem;
      padding: 10px 14px;
      border-radius: 10px;
      margin-bottom: 16px;
      display: none;
    }

    .form-message.is-error {
      display: block;
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #991b1b;
    }

    .form-message.is-success {
      display: block;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      color: #166534;
    }

    .form-actions {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }
  </style>
</head>
<body>

  <form id="create-program-form" class="create-form" novalidate>
    <div id="form_message" class="form-message" role="alert"></div>

    <div class="nice-form-group">
      <label for="paroisse">Paroisse</label>
      <select id="paroisse" name="paroisse">
        <option value="">Sélectionnez une paroisse</option>
      </select>
      <input type="text" id="paroisse-libre" name="paroisse-libre" placeholder="Ou saisissez une nouvelle paroisse" />
    </div>

    <div class="nice-form-group">
      <label for="occasion">Occasion</label>
      <input type="text" id="occasion" name="occasion" required placeholder="Ex : Messe ordinaire, Noël…" />
    </div>

    <div class="nice-form-group">
      <label for="lieu">Lieu</label>
      <input type="text" id="lieu" name="lieu" required placeholder="Ville ou lieu" />
    </div>

    <div class="nice-form-group">
      <label for="date">Date</label>
      <input type="date" id="date" name="date" required />
    </div>

    <div class="nice-form-group">
      <label for="description">Description</label>
      <textarea id="description" name="description" rows="4" placeholder="Description du programme"></textarea>
    </div>

    <div class="form-actions">
      <button type="submit" class="btn">Créer le programme</button>
    </div>
  </form>

  <script src="./create.js"></script>
</body>
</html>
