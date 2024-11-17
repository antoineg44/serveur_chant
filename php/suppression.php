<?php

function copyDirectory($source, $destination) {
  if (!is_dir($destination)) {
     mkdir($destination);
  }
  $files = scandir($source);
  foreach ($files as $file) {
     if ($file !== '.' && $file !== '..') {
        $sourceFile = $source . '/' . $file;
        $destinationFile = $destination . '/' . $file;
        if (is_dir($sourceFile)) {
           copyDirectory($sourceFile, $destinationFile);
        } else {
           copy($sourceFile, $destinationFile);
        }
     }
  }
}

    function supr($path, $new_path, $action)
    {
        $folder = explode("/", $new_path);
        $path_actuel = "";

        //echo "sizeof : ".sizeof($folder)."!\n";

        for($i=0; $i<sizeof($folder)-1; $i++)
        {
            $path_actuel .= $folder[$i]."/";
            //echo "path_actuel : ".$path_actuel."!\n";
            if(!is_dir($path_actuel))
            {
                //echo "new directory ! ".$path_actuel."!\n";
                mkdir($path_actuel);
            }
        }
        if(file_exists($new_path)) {
        	$fichier = $new_path;
        	if(is_dir ( $fichier )){
		      foreach($files1 = new DirectoryIterator($fichier) as $f1) {

		        if($f1->isDot())continue;
		        $fichier1 = $f1->getfilename();

		        if(is_dir ($fichier."/".$fichier1 )){
		          foreach($files2 = new DirectoryIterator($fichier."/".$fichier1) as $f2) {
		            if($f2->isDot())continue;
		            $fichier2 = $f2->getfilename();
		            
		            if($fichier2[0] != '.'){
		              echo $f2->getfilename()."<br/>";
		              if( file_exists ( $fichier."/".$fichier1."/".$fichier2))
		              unlink( $fichier."/".$fichier1."/".$fichier2 ) ;
		            }
		          }
		          if(@rmdir($fichier."/".$fichier1))echo "suppression : ".$fichier."/".$fichier1."<br/>";
		          else echo "erreur suppression ".$fichier."/".$fichier1."<br/>";
		        } else {
		          if($fichier1[0] != '.'){
		              echo $f1->getfilename()."<br/>";
		            if( file_exists ( $fichier."/".$fichier1))
		              unlink( $fichier."/".$fichier1 ) ;
		          }
		        }
		    }
		}
        	else {
        		unlink($new_path);
        	}
        }
        if($action)
        {
          $ret = rename($path, $new_path);
        }
        else
        {
          if(is_dir($path)) {
            copyDirectory($path, $new_path);
            $ret = 1;
          }
          else
            $ret = copy($path, $new_path);
        }
        return $ret;
    }
    
     function dep_dir($source , $destination){
      
       mkdir ($destination, 0777); 
       $dossier=opendir($source); 
       $total = 0; 
       while ($fichier = readdir($dossier)) { 
       $l = array('.', '..'); 
       if (!in_array( $fichier, $l)){ 
       if (is_dir($source."/".$fichier)){ 
       $total += dep_dir($source."/".$fichier, $destination."/".$fichier); 
       } 
       else{ 
       copy ($source."/".$fichier, $destination."/".$fichier); 
       $total++; 
       } 
       } 
       } 
       @closedir($dossier); 

       return $total; 
      
    }

    function supprimer_chant($titre, $auteur){

        // Définit le fuseau horaire par défaut à utiliser.
        date_default_timezone_set('Europe/Paris');
        $date = date("Y-m-d H:i:s");

        if(!$_SESSION['session'])return NULL;
        $req = $_SESSION['session']->prepare("INSERT INTO Supprimer (id,Date,titre,auteur) VALUES (NULL,'".$date."','".mres($titre)."','".$auteur."');");
        $rep = $req->execute();
        return $_SESSION['session']->lastInsertId();
    }

    $dir = (String) trim($_GET['lien']);
    $auteur =(String) trim($_GET['auteur']);
    $action =(String) trim($_GET['action']);
    $insert =(String) trim($_GET['insert']);
    if (isset($dir) && isset($auteur)) {
        
        if(empty($dir)){
            return;
        } else {
            $dir = (String) "../pdf/".trim($_GET['lien']);
        }

        if(isset($action) && strcmp("false", $action) == 0)
                $action = false;
        else
                $action = true;

        if(isset($insert) && strcmp("false", $insert) == 0)
                $insert = false;
        else
                $insert = true;

        include("../php/connexion.php");

        connexion();
        
        // si c'est un fichier :
        if(file_exists($dir))
        {
            if(supr($dir, "../delete/".trim($_GET['lien']), $action))  //unlink($dir)
            {
                // on le rajoute dans la base de donnée
                if($insert)supprimer_chant(trim($_GET['lien']), $auteur);
                echo "success";
            } else {
                echo "fail";
            }
        } else {
          echo "success";
        }
                  
/*
        // si c'est un dossier :
        else {
          // on le rajoute dans la base de donnée
          supprimer_chant(trim($_GET['lien']), $auteur);
          echo "ok !";
          
          foreach($files = new DirectoryIterator($dir) as $f) {                       
            if($f->isDot())continue;
            $fichier = $f->getfilename();
            if(is_dir ( $fichier )){
              foreach($files1 = new DirectoryIterator($fichier) as $f1) {

                if($f1->isDot())continue;
                $fichier1 = $f1->getfilename();

                if(is_dir ($fichier."/".$fichier1 )){
                  foreach($files2 = new DirectoryIterator($fichier."/".$fichier1) as $f2) {
                    if($f2->isDot())continue;
                    $fichier2 = $f2->getfilename();
                    
                    if($fichier2[0] != '.'){
                      echo $f2->getfilename()."<br/>";
                      if( file_exists ( $fichier."/".$fichier1."/".$fichier2))
                      unlink( $fichier."/".$fichier1."/".$fichier2 ) ;
                    }
                  }
                  if(@rmdir($fichier."/".$fichier1))echo "suppression : ".$fichier."/".$fichier1."<br/>";
                  else echo "erreur suppression ".$fichier."/".$fichier1."<br/>";
                } else {
                  if($fichier1[0] != '.'){
                      echo $f1->getfilename()."<br/>";
                    if( file_exists ( $fichier."/".$fichier1))
                      unlink( $fichier."/".$fichier1 ) ;
                  }
                }
              }
              if(@rmdir($fichier))echo "suppression : ".$fichier."<br/>";
              else echo "erreur suppression ".$fichier."<br/>";
            } else {
              echo "fichier : ".$fichier."<br/>";
            }
            /*if($fichier[0] != '.'){
                /*$fichier = str_replace("é","Ã©",$fichier);
                $fichier = str_replace("è","Ã¨",$fichier);
                $fichier = str_replace("ç","Ã§",$fichier);
                $fichier = str_replace("ë","Ã«",$fichier);
                $fichier = str_replace("û","Ã»",$fichier);
                $fichier = str_replace("ê","Ãª",$fichier);
                $fichier = str_replace("â","Ã¢",$fichier);
                $fichier = str_replace("è","Ã¨",$fichier);
                $fichier = str_replace("è","Ã¨",$fichier);*//*
                echo $f->getfilename()."<br/>";
                if( file_exists ( $dir."/".$fichier))
                unlink( $dir."/".$fichier ) ;
            }*//*
          }
    }*/

    }
?>
