<?php
include("../php/connexion.php");


try {
    $pdo = new PDO(
        "mysql:host=$serveur;dbname=$nom_bd;charset=utf8mb4",
        $db_user,
        $db_pass,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]
    );
} catch (PDOException $e) {
    die("Erreur de connexion : " . $e->getMessage());
}


// --------------------------------------------------
// Nom du fichier de sauvegarde
// --------------------------------------------------

$filename = $nom_bd . '_' . date('Y-m-d_H-i-s') . '.sql';


// --------------------------------------------------
// Récupération des tables
// --------------------------------------------------

$tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);


// --------------------------------------------------
// Début du fichier SQL
// --------------------------------------------------

$sql = "-- Sauvegarde de la base : $nom_bd\n";
$sql .= "-- Date : " . date('Y-m-d H:i:s') . "\n\n";

$sql .= "SET FOREIGN_KEY_CHECKS=0;\n";
$sql .= "SET SQL_MODE = \"NO_AUTO_VALUE_ON_ZERO\";\n";
$sql .= "START TRANSACTION;\n\n";


foreach ($tables as $table) {

    // Sécurisation du nom de table pour les requêtes
    $tableQuoted = '`' . str_replace('`', '``', $table) . '`';

    // --------------------------------------------------
    // Structure de la table
    // --------------------------------------------------

    $sql .= "-- --------------------------------------------\n";
    $sql .= "-- Structure de la table $table\n";
    $sql .= "-- --------------------------------------------\n\n";

    $sql .= "DROP TABLE IF EXISTS $tableQuoted;\n";

    $create = $pdo->query("SHOW CREATE TABLE $tableQuoted")->fetch();

    $sql .= $create['Create Table'] . ";\n\n";


    // --------------------------------------------------
    // Données de la table
    // --------------------------------------------------

    $sql .= "-- Données de la table $table\n\n";

    $rows = $pdo->query("SELECT * FROM $tableQuoted");

    while ($row = $rows->fetch(PDO::FETCH_ASSOC)) {

        $columns = [];
        $values  = [];

        foreach ($row as $column => $value) {

            $columns[] = '`' . str_replace('`', '``', $column) . '`';

            if ($value === null) {
                $values[] = 'NULL';
            } else {
                $values[] = $pdo->quote($value);
            }
        }

        $sql .= "INSERT INTO $tableQuoted (" .
                implode(', ', $columns) .
                ") VALUES (" .
                implode(', ', $values) .
                ");\n";
    }

    $sql .= "\n";
}


$sql .= "COMMIT;\n";
$sql .= "SET FOREIGN_KEY_CHECKS=1;\n";


// --------------------------------------------------
// Téléchargement du fichier
// --------------------------------------------------

header('Content-Type: application/sql; charset=utf-8');
header('Content-Disposition: attachment; filename="' . $filename . '"');
header('Content-Length: ' . strlen($sql));

echo $sql;
exit;


?>