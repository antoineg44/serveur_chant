<?php   
        //On récupère les dossiers/fichiers et leurs infos
      $dir = (String) trim($_GET['toinou']);
        if (isset($dir)) {
          if(empty($dir)){
            $dir = "../pdf/";
          } else {
            $dir = (String) trim($_GET['toinou']);
          }
          } else{
            $dir="../pdf/";  //pdf/cantiques/
        }
        $arbo[] = array();
        foreach($files = new DirectoryIterator($dir) as $f) {                       
               if($f->isDot())continue;                     
               $arbo[] = array(
                   "filename" => $f->getfilename(),
                   "pathname" => $f->getpathname(),
                   "path" => $dir,
                   "size" => human_filesize($f->getsize()),
                   "type" => $f->gettype(),
                   "extension" => "pdf",
                   "isDirectory" => $f->isdir(),
                   "isFile" => $f->isfile(),
               );
               /** Si version recente, plutot utiliser : */
            //header('Content-type: application/json');
            
        }
        // Trier les résultat dossier fichiers
        $folders = array(); //Créer un tableau pour mettre les dossiers
        $files = array(); //Créer un tableau pour mettre les fichiers
        foreach($arbo as $file){
            if($file["type"] == "dir"){
              $folders[]=$file;              //Pour chaque fichiers ou dossier scanner on regarde leur type
            }else {                          //Et on les classes dans le tableau correspondant
              $files[]=$file;
            }
        }

        //trie des tableau en ordre alpha
        foreach ($folders as $key => $row)$nom[$key] = $row['filename'];
      array_multisort($nom, SORT_ASC, $folders);

      foreach ($files as $key => $row)$name[$key] = $row['filename'];
    array_multisort($name, SORT_ASC, $files);

  $final=array_merge($folders, $files);  //On merge les tableaux pour que les dossiers apparaissent en premier, et ensuite les fichiers 

function human_filesize($bytes, $decimals = 2) {
    $size = array('B','kB','MB','GB','TB','PB','EB','ZB','YB');
    $factor = floor((strlen($bytes) - 1) / 3);
    return sprintf("%.{$decimals}f", $bytes / pow(1024, $factor)) . @$size[$factor];
}

/** Changement effectuer du à la version ancienne du php */
$result = "";
foreach($final as $fichier){
  $result .= $fichier["filename"]."£";
  $result .= $fichier["pathname"]."£";
  $result .= $fichier["path"]."£";
  $result .= $fichier["size"]."£";
  $result .= $fichier["type"]."£";
  $result .= $fichier["extension"]."£";
  $result .= $fichier["isDirectory"]."£";
  $result .= $fichier["isFile"]."£";
  $result .= "§";
}
echo $result;

/** Si version recente, plutot utiliser : */
//echo json_encode($final);
?>
