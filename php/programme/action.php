<?php

function getInformationFromName($name) {
    $nom_sans_ext = explode(".", $name);
    if($nom_sans_ext[1] != "json")return set_error("Problème sur le nom du fichier");

    $param = explode("_", $nom_sans_ext[0]);
    if(sizeof($param) != 3)return set_error("Nom incorrect");

    $nom["date"] = $param[0];
    $nom["lieu"] = $param[1];
    $nom["occasion"] = $param[2];

    return $nom;
}

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
    $decoded["path_file"] = "https://".$_SERVER['HTTP_HOST']."/pdf/programmes/".$decoded["paroisse"]."/".$nom;

    // Informations extraites du nom du programme
    $param = getInformationFromName($nom);
    if($param == null)return;
    $decoded["date"] = $param["date"];
    $decoded["lieu"] = $param["lieu"];
    $decoded["occasion"] = $param["occasion"];

    $decoded["dateLastModif"] = date("YmdHis");     // Date de la dernière modification

    // vérification de l'existance du programme
    if(file_exists('../../pdf/programmes/'.$decoded["paroisse"]."/".$nom))return set_error("file already exist");

    // enregistrement du nouveau programme
    write_program_json($decoded["paroisse"]."/".$nom, $decoded);

    echo "success";
}

function supprimer() {
    $params = getParams(["lien"]);
    if($params == null)return;

    $dir = (String) "../../pdf/".$params['lien'];

    // si c'est un fichier :
    if(!file_exists($dir))return set_error("Le fichier n'existe pas");

    if(!supr($dir, "../../delete/".$params['lien'], true))return set_error("Erreur lors de la suppression");
    
    echo "success";
}

function nouvelle_paroisse() {
    $params = getParams(["nom"]);
    if($params == null)return;

    $dir = (String) "../../pdf/programmes/".$params['nom'];

    if(file_exists($dir))return set_error("La paroisse existe déjà");

    if(!mkdir($dir))return set_error("Erreur lors de la création de la paroisse");

    echo "success";
}

function renommer() {
    $params = getParams(["paroisse", "ancien_nom", "nouveau_nom"]);
    if($params == null)return;

    // Get original file
    $old_link = (String) "../../pdf/".$params['paroisse']."/".$params['ancien_nom'];
    // vérification de l'existance du programme
    if(!file_exists($old_link))return set_error("file doesn't exist");
    $decoded = json_decode(file_get_contents($old_link),true);     // Get json informations

    // Mise à jour des informations dans le json
    $decoded["path_file"] = "https://".$_SERVER['HTTP_HOST']."/pdf/programmes/".$decoded["paroisse"]."/".$params['nouveau_nom'];

    // Informations extraites du nom du programme
    $nom = getInformationFromName($params['nouveau_nom']);
    if($nom == null)return;
    $decoded["date"] = $nom["date"];
    $decoded["lieu"] = $nom["lieu"];
    $decoded["occasion"] = $nom["occasion"];

    $decoded["dateLastModif"] = date("YmdHis");     // Date de la dernière modification

    // vérification de l'existance du programme
    if(file_exists('../../pdf/programmes/'.$decoded["paroisse"]."/".$params['nouveau_nom']))return set_error("file already exist");

    // enregistrement du nouveau programme
    write_program_json($decoded["paroisse"]."/".$params['nouveau_nom'], $decoded);

    // supprimer l'ancien nom
    $_GET["lien"] = "programmes/".$decoded["paroisse"]."/".$params['ancien_nom'];   // input for supprimer function
    supprimer();
}

function prochains() {
    $files = glob("../../pdf/programmes/*/*.json");

    //echo print_r($files);

    // $date = date('Y-m-d H:i:s');

    $nb_file = 0;

    foreach ($files as $file){
        $name = explode("/", $file);
        $param = explode("_", $name[sizeof($name)-1]);
        $day = explode("-", $param[0]);
        if($day[0][0] != '2') {
            // pas de date
        }
        else if(strcmp($day[0], date('Y')) > 0 || (strcmp($day[0], date('Y')) == 0 && strcmp($day[1], date('m')) > 0) || (strcmp($day[0], date('Y')) == 0 && strcmp($day[1], date('m')) == 0 && strcmp($day[2], date('d')) >= 0))
        {
            $nb_file += 1;
        }
    }

    echo "£".$nb_file."£";
}
?>