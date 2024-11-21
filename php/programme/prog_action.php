<?php

function nouveau() {
    $params = getParams(["old_link", "paroisse", "nom", "auteur"]);
    if($params == null)return;

    $auteur = $params["auteur"];    // useless at the moment

    // Get original file
    $old_link = (String) "../../pdf/".$params['old_link'];
    $decoded = json_decode(file_get_contents($old_link),true);     // Get json informations

    // Informations nouveau fichiers :
    $decoded["paroisse"] = $params['paroisse'];
    $nom = $params['nom'];

    // Mise à jour des informations dans le json
    $decoded["path_file"] = "https://".$_SERVER['HTTP_HOST']."/pdf/".$params['old_link'];

    $nom_sans_ext = explode(".", $nom);
    if($nom_sans_ext[1] != "json")return set_error("Problème sur le nom du fichier");

    $param = explode("_", $nom_sans_ext[0]);
    if(sizeof($param) != 3)return set_error("Nom incorrect");
    $decoded["date"] = $param[0];
    $decoded["lieu"] = $param[1];
    $decoded["occasion"] = $param[2];
    $decoded["dateLastModif"] = date("YmdHis");     // Date de la dernière modification

    // vérification de l'existance du programme
    if(file_exists('../../pdf/programmes/'.$decoded["paroisse"]."/".$nom))return set_error("file already exist");

    // enregistrement du nouveau programme
    write_program_json($decoded["paroisse"]."/".$nom, $decoded);

    echo "sucess";
}

?>