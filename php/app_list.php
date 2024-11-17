<?php

$dir="../res/app_version/";

foreach($files = new DirectoryIterator($dir) as $f) {                       
        if($f->isDot())continue;
        $fichier = $f->getfilename();
        $date = date("YmdHis",filemtime($dir."/".$f));
        if($fichier[0] != '.')                
            echo $f->getfilename()."%#".$date."£";
}
?>