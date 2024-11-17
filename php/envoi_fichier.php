<?php
    function ajouter_nouveau_chant($titre, $auteur){

        // Définit le fuseau horaire par défaut à utiliser.
        date_default_timezone_set('Europe/Paris');
        $date = date("Y-m-d H:i:s");

        if(!$_SESSION['session'])return NULL;
        $req = $_SESSION['session']->prepare("INSERT INTO Ajouter (id,Date,titre,auteur) VALUES (NULL,'".$date."','".mres($titre)."','".$auteur."');");
        $rep = $req->execute();
        return $_SESSION['session']->lastInsertId();
    }
    
    function verif_result($id, $titre) {	// Observation que certain chant qui ont été upload n'ont pas été enregistré dans la base de données
    	$req = $_SESSION['session']->prepare("SELECT * FROM Ajouter WHERE id='".$id."'");
    	$req->execute();
    	if($row=$req->fetch(PDO::FETCH_ASSOC)) {
		if(strcmp($row['titre'], mres($titre)) == 0)
			return "success";
		else
			return "fail";
	}
	else {
		return "echec";
	}
    }


    include("../php/connexion.php");
        
    if(isset($_GET['auteur']) && isset($_GET['path'])){

        $auteur =(String) trim($_GET['auteur']);
        $path_file =(String) trim($_GET['path']);

	if(strlen($path_file) > 1 && $path_file[strlen($path_file)-1] != '/') {
        	$path_file = $path_file."/";
        }

        $file_path = "../pdf/".$path_file;
        $path = basename( $_FILES['uploaded_file']['name']);
        //$path = "pour_test";
        $file_path = $file_path . $path;
     
        
        if(move_uploaded_file($_FILES['uploaded_file']['tmp_name'], $file_path)) {

            // on le rajoute dans la base de donnée
            connexion();
            $id = ajouter_nouveau_chant($path_file.$path, $auteur);
            echo $id;
            echo verif_result($id, $path_file.$path);

            //echo "success";
        } else{
            echo "failed";
        }
    }
    /*
	else if(isset($_GET['titre']) && isset($_GET['auteur'])){
	
		echo "%#";
		
		$titre =(String) trim($_GET['titre']);
		$auteur =(String) trim($_GET['auteur']);

		ajouter_nouveau_chant($titre, $auteur);
	}
    */
 ?>
