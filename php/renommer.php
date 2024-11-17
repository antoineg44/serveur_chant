<?php

    function reno($path, $new_path)
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
        return rename($path, $new_path);
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
    
    function ajouter_nouveau_dossier($titre, $auteur){

        // Définit le fuseau horaire par défaut à utiliser.
        //date_default_timezone_set('UTC');
        $date = date("Y-m-d H:i:s");

        if(!$_SESSION['session'])return NULL;
        $req = $_SESSION['session']->prepare("INSERT INTO Ajouter (id,Date,titre,auteur) VALUES (NULL,'".$date."','".mres($titre)."','".$auteur."');");
        $rep = $req->execute();
        return $_SESSION['session']->lastInsertId();
}

    $old_link = (String) trim($_GET['old_link']);
    $new_link = (String) trim($_GET['new_link']);
    $insert = (String) trim($_GET['insert']);   // insérer ou non dans la base de donnée
    $auteur =(String) trim($_GET['auteur']);
    $rename =(String) trim($_GET['rename']);

    if (isset($old_link) && isset($new_link) && isset($auteur)) {
        
        if(empty($old_link) || empty($new_link)){
            return;
        } else {
            $old_link = (String) "../pdf/".trim($_GET['old_link']);
            $new_link = (String) "../pdf/".trim($_GET['new_link']);
        }

        if(isset($rename) && strcmp("false", $rename) == 0)
            $rename = false;
        else
            $rename = true;

        if(!isset($insert))
        {
          $insert = true;
        }
        else
        {
          if(strcmp("false", $insert) == 0)
          {
            $insert = false;
          }
          else
          {
            $insert = true;
          }
        }

        include("../php/connexion.php");

        if($insert == true)connexion();
        
        // si c'est un fichier :
        if(file_exists($old_link))
        {
            if($rename == false)
            {
                supprimer_chant(trim($_GET['old_link']), $auteur);
                ajouter_nouveau_dossier(trim($_GET['new_link']), $auteur);
                echo "success wihtout action";
            }
            else if(reno($old_link, $new_link))  //unlink($dir)
            {

              if($insert)
              {
                // on le rajoute dans la base de donnée
                  supprimer_chant(trim($_GET['old_link']), $auteur);
                  ajouter_nouveau_dossier(trim($_GET['new_link']), $auteur);
                  
                  if(is_dir($new_link)) {
                  // ajouter tous les sous dossiers :
                  foreach($files = new DirectoryIterator($new_link) as $f) {                       
                    if($f->isDot())continue;
                    $fichier = $f->getfilename();
                    if($fichier[0] != '.')
                      ajouter_nouveau_dossier((trim($_GET['new_link']))."/".$f->getfilename(), $auteur);
                    }
                  }
                }
                echo "success wiht insert";
            } else {
                echo "fail";
            }
        } else {
          echo "success old_link";
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
