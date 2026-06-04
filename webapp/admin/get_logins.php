<?php
	include("../../php/config.php");

	$origin = isset($_SERVER['HTTP_ORIGIN']) ? trim((string) $_SERVER['HTTP_ORIGIN']) : '';
	$allowedOrigins = array_filter([
		$addr_server_test ?? '',
		'https://partitions.ovh',
		'http://localhost',
		'http://127.0.0.1',
		'null'
	]);

	$isAllowedLocalOrigin = preg_match('/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i', $origin) === 1;

	if ($origin !== '' && (in_array($origin, $allowedOrigins, true) || $isAllowedLocalOrigin)) {
		header('Access-Control-Allow-Origin: '.$origin);
		header('Vary: Origin');
		header('Access-Control-Allow-Methods: GET, PUT, POST, DELETE, OPTIONS');
		header('Access-Control-Max-Age: 1000');
		header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
		header('Access-Control-Allow-Credentials: true');
	}

	if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
		http_response_code(204);
		exit;
	}

	header('content-type: application/json; charset=utf-8');

	$table = 'Connexions';
	$primaryKey = 'id';

	$columns = array(
		array('db' => 'id', 'dt' => 0),
		array('db' => 'Date', 'dt' => 1),
		array('db' => 'username', 'dt' => 2),
		array('db' => 'role', 'dt' => 3),
		array('db' => 'ip_address', 'dt' => 4),
		array('db' => 'user_agent', 'dt' => 5)
	);

	$draw = isset($_GET['draw']) ? (int) $_GET['draw'] : 0;

	$emptyPayload = array(
		'draw' => $draw,
		'recordsTotal' => 0,
		'recordsFiltered' => 0,
		'data' => array()
	);

	$legacyConnectionFile = dirname(__DIR__, 2) . '/php/connexion.php';
	if (!file_exists($legacyConnectionFile)) {
		echo json_encode($emptyPayload, JSON_UNESCAPED_UNICODE);
		exit;
	}

	require_once($legacyConnectionFile);

	if (!defined('serveur') || !defined('nom_bd') || !defined('db_user') || !defined('db_pass')) {
		echo json_encode($emptyPayload, JSON_UNESCAPED_UNICODE);
		exit;
	}

	require('ssp.class.php');

	try {
		$pdo = new PDO(
			"mysql:host=".serveur.";dbname=".nom_bd.";charset=utf8mb4",
			db_user,
			db_pass,
			array(PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION)
		);
	} catch (Throwable $error) {
		echo json_encode($emptyPayload, JSON_UNESCAPED_UNICODE);
		exit;
	}

	echo json_encode(
		SSP::simple($_GET, $pdo, $table, $primaryKey, $columns), JSON_UNESCAPED_UNICODE
	);
