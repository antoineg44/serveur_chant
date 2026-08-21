<?php
$host = '2001:4860:4860::8888'; // Adresse IPv6 de Google DNS
$port = 53; // port DNS

$contextOptions = [
    'socket' => [
        'family' => AF_INET6,
    ],
];
$context = stream_context_create($contextOptions);

$socket = @stream_socket_client(
    "tcp://[$host]:$port",
    $errno,
    $errstr,
    5,
    STREAM_CLIENT_CONNECT,
    $context
);

if ($socket) {
    echo "Connexion IPv6 directe réussie.\n";
    fclose($socket);
} else {
    echo "Échec de la connexion IPv6 directe.\n";
    echo "Erreur : $errstr ($errno)\n";
}
?>