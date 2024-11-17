<?php
    include("../config.php");

    if(addr_server_test == $_SERVER['HTTP_ORIGIN'])
    {
        header('Access-Control-Allow-Origin: '.$_SERVER['HTTP_ORIGIN']);
        header('Access-Control-Allow-Methods: GET, PUT, POST, DELETE, OPTIONS');
        header('Access-Control-Max-Age: 1000');
        header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
    }
    $files = glob("../../pdf/programmes/*/*.json");

    //echo print_r($files);

    // $date = date('Y-m-d H:i:s');

    $nb_file = 0;

    foreach ($files as $file){
        $name = explode("/", $file);
        $param = explode("_", $name[sizeof($name)-1]);
        $day = explode("-", $param[0]);
        if(strcmp($day[0], date('Y')) == 0 && strcmp($day[1], date('m')) == 0 && strcmp($day[2], date('d')) == 0)
        {
            $nb_file += 1;
        }
    }

    echo "£".$nb_file."£";
 ?>
