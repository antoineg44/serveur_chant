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
  <script src="../program/program.js"></script>
  <script src="index.js"></script>
</head>

<body><noscript><strong>Il faut activer le Javascript !!!</strong></noscript>

<?php
$lien = null;
$programme = null;
$error = true;
$file = null;               // fichier en question

if(isset($_GET['lien'])) {
	$lien = (String) trim($_GET['lien']);
  if(str_contains($lien, "/pdf/")) {
    $directroy = explode("/pdf/", $lien);
    $lien = $directroy[count($directroy)-1];
  }

  if(str_contains($lien,"/") && !str_contains($lien,"\\.")) {
    $dir_pdf = "../../pdf/";    // dossier où se trouvent les pdf
    $dir = $lien;               // lien vers le dossier
    
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



    <div id="nav-bar-right" class="nav-bar nav-bar-right computer">
        <input id="nav-toggle" class="smartphone" type="checkbox">
        <div class="nav-header nav-header-right">
          <label for="nav-toggle"><span id="nav-toggle-burger"></span></label>
          <a class="nav-title" style="width: 100%;"><i class="fab fa-codepen"></i><div style="margin-left:50px;text-align: right;" onclick="window.open(window.location.origin+'/explorer','_self')">Fichiers disponibles :</div></a>
          <hr>
        </div>
        <div class="nav-content">
          <!-- EXAMPLE : <div class="nav-button"><i class="fas fa-images"></i><span>Assets</span></div> -->
          <?php
            $fichiers = [];
            if(is_dir($dir_pdf.$dir)) {
              foreach($files = new DirectoryIterator($dir_pdf.$dir) as $f) {
                if($f->isDot())continue;
                $fichier = $f->getfilename();
                if($fichier[0] != '.')
                  array_push($fichiers, $f->getfilename());
              }
              sort($fichiers);
              $fichiers = array_reverse($fichiers);
              foreach($files = $fichiers as $f) {                       
                if(str_contains($f, ".pdf")) {
                  $coded = str_replace("'","£",$dir."/".$f);
                  if(strcmp($file, $f) == 0)
                    echo '<div class="nav-button nav-button-right" onclick=\'open_pdf("'.$coded.'",this)\' style="background-color:#c9bfff;"><i class="fas fa-thumbtack"><img src = "../../messes/icon/pdf.png"></i><span>'.$f.'</span></div>';
                  else
                    echo '<div class="nav-button nav-button-right" onclick=\'open_pdf("'.$coded.'",this)\'><i class="fas fa-thumbtack"><img src = "../../messes/icon/pdf.png"></i><span>'.$f.'</span></div>';
                }
              }
            } else {
              echo "Le répertoire : ".$dir_pdf.$dir." n'existe pas.";
            }
          ?>
          <!-- Pour ajouter une barre entre les différents type de fichiers : <hr> -->
          <hr>
          <?php
            foreach($files = $fichiers as $f) {                       
              if(!str_contains($f, ".pdf"))
              echo '<div class="nav-button nav-button-right"><i class="fas fa-thumbtack"><img src = "../../messes/icon/doc.png"></i><span>'.$f.'</span></div>';
            }
          ?>
          <div class="nav-content-highlight nav-content-highlight-right"></div>
        </div>
      </div>
<?php
}
if(isset($_GET['programme'])) {
  $programme = (String) trim($_GET['programme']);
  ?>

      <div id="nav-bar-left" class="nav-bar nav-bar-left computer">
        <input id="nav-toggle-left" class="smartphone" type="checkbox">
        <div id="testint" class="nav-header nav-header-left"><a class="nav-title"><i class="fab fa-codepen"></i><div id="name-program" onclick="window.open(window.location.origin+'/pages/liste_messes','_self')">Fichiers disponibles :</div></a>
          <label for="nav-toggle-left"><span id="nav-toggle-left-burger"></span></label>
          <hr>
        </div>
        <div id="content-program" class="nav-content">
          <div class="nav-content-highlight nav-content-highlight-left"></div>
        </div>
      </div>
  <?php
}
if(!isset($_GET['programme']) && !isset($_GET['lien'])) {
  echo "Le lien est mauvais, si vous pensez qu'il y a un problème, merci d'envoyer un mail (addresse mail à la fin de la page à propos)";
}
?>
<script>
  var lien_en_cours = "<?php echo $lien; ?>";
  var fichiers_en_cours = "<?php echo $file ?>";
  init("<?php echo $programme; ?>");
  if(lien_en_cours == "") {
    navbar = document.getElementById("nav-bar-left");
    navbar.classList.remove("computer");
  }
</script>
</body>
</html>