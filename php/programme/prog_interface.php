<?php

include("../res/generic.php");
include("../res/file_lib.php");
include("prog_action.php");

echo "start";

$params = getParams(["action"]);
if($params == null)return;

echo "suite";

switch ($params['action']) {
    case 'nouveau':
        echo 'nouveau';
        nouveau();
        break;
    
    default:
        # code...
        break;
}
echo "fin";

?>