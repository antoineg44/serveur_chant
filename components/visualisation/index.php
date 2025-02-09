<!DOCTYPE html>
<html lang="fr">

<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<meta http-equiv="X-UA-Compatible" content="ie=edge">
	<title>Visualisation</title>
	<!-- CSS -->
	<link href="index.css" rel="stylesheet">
  <!-- JS -->
  <script src="index.js"></script>
</head>

<body><noscript><strong>Il faut activer le Javascript !!!</strong></noscript>

<?php
$lien = null;
$error = true;
if(isset($_GET['lien'])) {
	$lien = (String) trim($_GET['lien']);

  if(str_contains($lien,"/") && !str_contains($lien,"\\.")) {
    $dir_pdf = "../../pdf/";    // dossier où se trouvent les pdf
    $dir = $lien;               // lien vers le dossier
    $file = null;               // fichier en question
    
    if(is_dir($dir)){ // le lien est un dossier
      $error = false;
    } else if(file_exists($dir_pdf.$dir)){  // Le fichier dans le lien existe :
      $file = $dir;
      // Récupérer le dossier du fichier
      $dirs = explode("/", $file);  // les différents dossiers cités dans 'lien'
      $dir = "";
      for($i=0; $i<count($dirs)-1; $i++) {
        $dir .= $dirs[$i]."/";
      }
      $file = $dirs[count($dirs)-1];
      $error = false;

    } else if(str_contains($lien,".")){ // Il y a une erreur sur le nom du fichier :
      // Récupérer le dossier du fichier
      $dirs = explode("/", $dir);  // les différents dossiers cités dans 'lien'
      $dir = "";
      for($i=0; $i<count($dirs)-1; $i++) {
        $dir .= $dirs[$i]."/";
      }
      $error = false;

    } else {
      // Erreur sur le nom du dossier : impossible de trouver quoi que ce soit
    }

    
    


  }
}
if($error == false) {
  if($file != null)
    echo '<iframe id="pdf-js-viewer" src="../viewer/viewer.html?file='.$dir_pdf.$dir."/".$file.'" title="webviewer" frameborder="0" width="100%" height="100%"></iframe>';
  else 
    echo '<iframe id="pdf-js-viewer" src="../viewer/viewer.html?file=" title="webviewer" frameborder="0" width="100%" height="100%"></iframe>';

?>



    <div id="nav-bar">
        <input id="nav-toggle" type="checkbox">
        <div id="nav-header"><a id="nav-title" href="https://codepen.io" target="_blank"><i class="fab fa-codepen"></i>Fichiers disponibles :</a>
          <label for="nav-toggle"><span id="nav-toggle-burger"></span></label>
          <hr>
        </div>
        <div id="nav-content">
          <!-- EXAMPLE : <div class="nav-button"><i class="fas fa-images"></i><span>Assets</span></div> -->
          <?php
            $fichiers = [];
            foreach($files = new DirectoryIterator($dir_pdf.$dir) as $f) {
              if($f->isDot())continue;
              $fichier = $f->getfilename();
              if($fichier[0] != '.')
                array_push($fichiers, $f->getfilename());
            }
            sort($fichiers);
            $fichiers = array_reverse($fichiers);
            foreach($file = $fichiers as $f) {                       
              if(str_contains($f, ".pdf"))
                  echo '<div class="nav-button" onclick=\'open_pdf("'.$dir."/".$f.'")\'><i class="fas fa-thumbtack"><img src = "../../messes/icon/pdf.png"></i><span>'.$f.'</span></div>';
            }
          ?>
          <!-- Pour ajouter une barre entre les différents type de fichiers : <hr> -->
          <hr>
          <?php
            foreach($file = $fichiers as $f) {                       
              if(!str_contains($f, ".pdf"))
              echo '<div class="nav-button"><i class="fas fa-thumbtack"><img src = "../../messes/icon/doc.png"></i><span>'.$f.'</span></div>';
            }
          ?>
          <div id="nav-content-highlight"></div>
        </div>
      </div>

<?php
} else {
  echo "Le lien est mauvais, si vous pensez qu'il y a un problème, merci d'envoyer un mail (addresse mail à la fin de la page à propos)";
}
?>
</body>
</html>