<?php

// Get original file
$old_link = (String) "../../pdf/".trim($_GET['old_link']);
echo $old_link."\n";
$decoded = json_decode($old_link,true);     // Get json informations

echo $decoded["path_file"]."\n";

function write_file_server($path, $jsonObj) {
    $json = json_encode($jsonObj);
    $myfile = fopen('../../pdf/programmes/'.$path, 'w') or die("Unable to open file!");
    //$txt = mb_convert_encoding($txt, 'UTF-8', 'ISO-8859-1');
    fwrite($myfile, $json);
    fclose($myfile);
}

if (isset($_GET['old_link']) && isset($_GET['paroisse']) && isset($_GET['nom']) && isset($_GET['auteur'])) {

    $auteur =(String) trim($_GET['auteur']);
    
    if(empty($_GET['old_link']) || empty($_GET['paroisse']) || empty($_GET['nom'])){
        echo "Mauvais paramètres";
        return;
    }

    // Get original file
    $old_link = (String) "../../pdf/".trim($_GET['old_link']);
    echo $old_link."\n";
    $decoded = json_decode($old_link,true);     // Get json informations

    echo $decoded["path_file"]."\n";

    // Informations nouveau fichiers :
    $decoded["paroisse"] = (String)trim($_GET['paroisse']);
    $nom = (String)trim($_GET['nom']);

    // Mise à jour des informations dans le json
    $decoded["path_file"] = "https://".$_SERVER['HTTP_HOST']."/pdf/".trim($_GET['old_link']);

    $nom_sans_ext = explode(".", $nom);
    if($nom_sans_ext[1] != "json"){
        echo "Problème sur le nom du fichier";
        return;
    }
    $param = explode("_", $nom_sans_ext[0]);
    if(sizeof($param) != 3) {
        echo "Nom incorrect";
        return;
    }
    $decoded["date"] = $param[0];
    $decoded["lieu"] = $param[1];
    $decoded["occasion"] = $param[2];
    $decoded["dateLastModif"] = date("YmdHis");     // Date de la dernière modification

    if(file_exists('../../pdf/programmes/'.$decoded["paroisse"]."/".$nom)) {
        echo "file already exist";
        return;
    }

    write_file_server($decoded["paroisse"]."/".$nom, $decoded);

    echo "success";
}
else {
    echo "failed";
}




?>