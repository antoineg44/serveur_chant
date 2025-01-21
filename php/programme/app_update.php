<?php
    /***********  For JSON file  *************/
	define("DEBUG", true);

	function result_final($path, $lignes_client, $lignes_serveur) {
			if(DEBUG)echo "<br>Cas 1, 2 ou 4, fichier server mise à jour : <br>";
			for($i = 0; $i < count($lignes_client); $i++) {
				echo $lignes_client[$i]."<br/>";
			}
			//write_file_server($path, $lignes_client);

	}

	function write_file_server($path, $jsonObj) {
        $json = json_encode($jsonObj);
		$myfile = fopen('../../pdf/programmes/'.$path, 'w') or die("Unable to open file!");
		//$txt = mb_convert_encoding($txt, 'UTF-8', 'ISO-8859-1');
		fwrite($myfile, $json);
		fclose($myfile);
	}

	/**
	 * Récupérer le programme présent sur le serveur
	 * TODO : Que faire si programme pas du tout présent sur serveur !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
	 */
	function get_programme_serveur($path) {
		if(file_exists('../../pdf/programmes/'.$path) == false)return null;
		$str = file_get_contents('../../pdf/programmes/'.$path);
		$lignes_serveur = json_decode($str, true); // decode the JSON into an associative array	    
    	return $lignes_serveur;
	}

	header ('Content-type: text/html; charset=iso8859-15');

    //include("../php/connexion.php");
    
	/**
	 * Exemple : 
	 * http://rino.robotiutna.free.fr/php/test.php?auteur=nan&lastsync=20230502171101&lastmodif=20230403165202&path=2023-3-20_Nort_Ordinaire.txt&contenu=2023-3-20%C2%A3Nort%C2%A3Ordinaire%C2%A3%C2%A3[Anamn%C3%A8se]%C2%A3%C2%A4Doxologie%20de%20la%20pri%C3%A8re%20eucharistique%C2%A3path%20=%20Doxologie/Doxologie%20de%20la%20pri%C3%A8re%20eucharistique/Doxologie%20de%20la%20pri%C3%A8re%20eucharistique_v2.pdf%C2%A3[PP]%C2%A3[Gloria]%C2%A3%C2%A4bahia-curve-doc-technique.pdf%C2%A3path%20=%20rtos1/rtos2/bahia-curve-doc-technique.pdf%C2%A3[Psaume]%C2%A3[All%C3%A9luia]%C2%A3[Credo]%C2%A3%C2%A4e-billet(1).pdf%C2%A3path%20=%20rtos1/rtos2/e-billet(1).pdf%C2%A3[PU]%C2%A3[Offertoire]%C2%A3[Sanctus]%C2%A3[Doxologie]%C2%A3[Notre%20P%C3%A8re]%C2%A3[Communion]%C2%A3[Sortie]%C2%A3[Entr%C3%A9e]%C2%A3%C2%A4Amen,%20gloire%20et%20louange%C2%A3path%20=%20Doxologie/Amen,%20gloire%20et%20louange/Amen,%20gloire%20et%20louange_v8.pdf%C2%A3
	 */
    /*if(isset($_GET['auteur']) && isset($_GET['path']) && isset($_GET['lastmodif']) && isset($_GET['contenu'])){

        $auteur =(String) trim($_GET['auteur']);
        $path_file =(String) trim($_GET['path']);
        //$derniere_synchro =(String) trim($_GET['lastsync']);
        $derniere_modif =(String) trim($_GET['lastmodif']);
        $contenu =(String) trim($_GET['contenu']);	// Correspond au contenu du client

		if(DEBUG)echo "path : ".$path_file;

		$lignes_client = extract_liste_chant($derniere_synchro_client, $contenu);	// $lignes_client devient la variable avec le contenu du client

		if(file_exists('../pdf/programmes/'.$path_file)) {
			$lignes_client[1] = date("YmdHis");
			result_final($path_file, $lignes_client, $lignes_client);
		} else {
			echo "error";
		}
    }*/

	include("cas.php");
	include("merge.php");

    if(isset($_GET['data']) && isset($_GET['dateModif']))
    {
        $decoded = json_decode($_GET['data'],true);

        if(str_contains($decoded["path_file"], "..") || !str_contains($decoded["path_file"], "/pdf/programmes/"))
        {
            echo "incorrect path";
            return;
        }

        $path = explode("/pdf/programmes/",$decoded["path_file"]);
        $extension = explode(".",$path[1]);
        $path_prog = $extension[0].".json";
        $decoded["path_file"] = $path[0]."/pdf/programmes/".$path_prog;


		$lignes_serveur = get_programme_serveur($path_prog);

		if($lignes_serveur == null)
		{
			$decoded["dateLastModif"] = $_GET['dateModif'];     // Nouvelle date de modification
			write_file_server($path_prog, $decoded);
            // ligne client :
            echo json_encode($decoded);
		}
		else {
			$cas = getCas($decoded["dateLastModif"], $_GET['dateModif'], $lignes_serveur["dateLastModif"]);
			
			$result = merge($cas, $decoded, $lignes_serveur);

            // ligne client :
			echo json_encode($decoded);
			if($result == true)write_file_server($path_prog, $lignes_serveur);
		}  
    }
    // HELP : https://www.sitepoint.com/jquery-php-ajax-json/
 ?>
