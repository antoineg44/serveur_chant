<?php
// Adresse IPv6 de test (Google)
$host = 'ipv6.google.com';
$port = 443; // port HTTPS

// Options pour forcer IPv6
$contextOptions = [
    'socket' => [
        'family' => AF_INET6,
    ],
];
$context = stream_context_create($contextOptions);

// Tentative de connexion
$socket = @stream_socket_client(
    "tcp://[$host]:$port",
    $errno,
    $errstr,
    5, // délai d'attente en secondes
    STREAM_CLIENT_CONNECT,
    $context
);

if ($socket) {
    echo "Connexion IPv6 réussie à $host sur le port $port.\n";
    fclose($socket);
} else {
    echo "Échec de la connexion IPv6 à $host sur le port $port.\n";
    echo "Erreur : $errstr ($errno)\n";
}
?>