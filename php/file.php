<?php

include("connexion.php");
include("res/generic.php");
include("res/file_lib.php");

function 

$params = getParams(["action"]);
if($params == null)return;

switch ($params['action']) {
    case 'nombre_fichiers_pdf':
        nombre_fichiers_pdf();
        break;

    case 'nombre_dossier':
        nombre_dossier();
        break;

    case 'nombreFichierAjout':
        nombreFichierAjout();
        break;

    case 'nombreFichierAjout':
        renommer();
        break;

    case 'prochains':   // le nombre de programmes à venir
        prochains();
        break;
    
    default:
        break;
}

?>