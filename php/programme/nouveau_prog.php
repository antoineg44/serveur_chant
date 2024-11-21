<?php


include("../res/generic.php");
include("../res/file_lib.php");

$params = getParams(["old_link", "paroisse", "nom", "auteur"]);
if($params == null)return;

$auteur = $params["auteur"];    // useless at the moment


// Get original file
$old_link = (String) "../../pdf/".params['old_link'];
$decoded = json_decode(file_get_contents($old_link),true);     // Get json informations

// Informations nouveau fichiers :
$decoded["paroisse"] = $params['paroisse'];
$nom = $params['nom'];

// Mise à jour des informations dans le json
$decoded["path_file"] = "https://".$_SERVER['HTTP_HOST']."/pdf/".params['old_link'];

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

write_program_json($decoded["paroisse"]."/".$nom, $decoded);

echo "success";

?>