<?php
$dir = (String) trim($_GET['lien']);
if (isset($dir)) {
  if(empty($dir)){
    $dir = "../pdf";
  } else {
    $dir = (String) "../pdf".str_replace("\\", "", trim($_GET['lien']));    // apostrophe
  }
} else{
    $dir="../pdf";
}

foreach($files = new DirectoryIterator($dir) as $f) {                       
        if($f->isDot())continue;
        $fichier = $f->getfilename();
        $date = date("YmdHis",filemtime($dir."/".$f));
        if($fichier[0] != '.')                
            echo $f->getfilename()."%#".$date."£";
}
?>