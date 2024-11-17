<?php

function ajouter_nouveau_dossier($titre, $auteur){

        // Définit le fuseau horaire par défaut à utiliser.
        //date_default_timezone_set('UTC');
        $date = date("Y-m-d H:i:s");

        if(!$_SESSION['session'])return NULL;
        $req = $_SESSION['session']->prepare("INSERT INTO Ajouter (id,Date,titre,auteur) VALUES (NULL,'".$date."','".mres($titre)."','".$auteur."');");
        $rep = $req->execute();
        return $_SESSION['session']->lastInsertId();
}

include("../php/connexion.php");

connexion();

$path =(String) trim($_GET['path']);
$auteur =(String) trim($_GET['auteur']);
$create =(String) trim($_GET['create']);

if(isset($path) && isset($auteur)){


        if($path[0] == '/') {
                $file_path = "../pdf".$path;
        } else {
                $file_path = "../pdf/".$path;
        }

        if(isset($create) && strcmp("false", $create) == 0)
                $create = false;
        else
                $create = true;
                
        
        if(file_exists($file_path)) {
        	echo "success exist";
        }
        else if($create == false)
        {
                // on le rajoute dans la base de donnée
                echo "success not create ".ajouter_nouveau_dossier($path, $auteur);
        }
        else if(mkdir($file_path)) {
                // on le rajoute dans la base de donnée
                ajouter_nouveau_dossier($path, $auteur);
                echo "success create";
        } else{
                echo "fail";
        }
}

?>
