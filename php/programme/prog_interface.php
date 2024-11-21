<?php

include("../res/generic.php");
include("../res/file_lib.php");
include("prog_action.php");

$params = getParams(["action"]);
if($params == null)return;

switch ($params['action']) {
    case 'nouveau':
        nouveau();
        break;
    
    default:
        # code...
        break;
}

?>