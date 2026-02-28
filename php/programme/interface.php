<?php

include("../res/generic.php");
include("../res/file_lib.php");
include("action.php");

$params = getParams(["action"]);
if($params == null)return;

switch ($params['action']) {
    case 'nouveau':
        nouveau();
        break;

    case 'supprimer':
        supprimer();
        break;

    case 'nouvelle_paroisse':
        nouvelle_paroisse();
        break;

    case 'get_list_paroisses':
        get_list_paroisses();
        break;

    case 'renommer':
        renommer();
        break;

    case 'prochains':   // le nombre de programmes à venir
        prochains();
        break;
    
    default:
        break;
}

?>