<?php
    include("config.php");

    if(addr_server_test == $_SERVER['HTTP_ORIGIN'])
    {
        header('Access-Control-Allow-Origin: '.$_SERVER['HTTP_ORIGIN']);
        header('Access-Control-Allow-Methods: GET, PUT, POST, DELETE, OPTIONS');
        header('Access-Control-Max-Age: 1000');
        header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
    }

$dir="../res/app_version/";

foreach($files = new DirectoryIterator($dir) as $f) {                       
        if($f->isDot())continue;
        $fichier = $f->getfilename();
        $date = date("YmdHis",filemtime($dir."/".$f));
        if($fichier[0] != '.')                
            echo $f->getfilename()."%#".$date."£";
}
?>