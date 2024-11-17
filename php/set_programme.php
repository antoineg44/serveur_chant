<?php
	define("DEBUG", false);

    
	/**
	 * Extraire le contenu du fichier client
	 */
    function extract_liste_chant(&$derniere_synchro, $contenu){
		if(DEBUG)echo "contenu : ".$contenu;
		$ligne = explode(chr(163), $contenu);	// ASCII 163 = £		char to int : ord($contenu[10])		int to char : chr(163)
        $ligne[0] = $ligne[0]."£".$ligne[1]."£".$ligne[2];
        if($ligne[3] == "") {
            if(DEBUG)echo "derniere_synchro null<br>";
            $derniere_synchro = "0";
        } else {
            if(DEBUG)echo "derniere_synchro non null<br>";
            $derniere_synchro = $ligne[3];
        }
        array_splice($ligne, 1, 2);
		
		//echo ord($contenu[10])."debug fichier client : ";
		// Afficher le fichier récupéré dans le l'url :
		for($i = 0; $i < count($ligne); $i++) {
			$ligne[$i]  = str_replace("¤", "#", $ligne[$i]);
			if(DEBUG)echo $i." : ".$ligne[$i]."<br/>";
		}
		
        return $ligne;
    }

	/**
	 * Récupérer le programme présent sur le serveur
	 * TODO : Que faire si programme pas du tout présent sur serveur !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
	 */
	function get_programme_serveur(&$derniere_synchro_serveur, $path) {
		$res = fopen('../pdf/programmes/'.$path, 'rb');
		$lignes_serveur = array();
            
	    /*Tant que la fin du fichier n'est pas atteninte, c'est-à-dire
	     *tant que feof() renvoie FALSE (= tant que !feof() renvoie TRUE)
	     *on echo une nouvelle ligne du fichier*/
	    if($res) {
			while(!feof($res)){
				$ligne = fgets($res);
				$ligne = substr($ligne, 0, -1); // on retire le dernier caractère qui est un espace
				//echo mb_detect_encoding($str, ['ASCII', 'UTF-8', 'ISO-8859-1'], true);
				$ligne = mb_convert_encoding($ligne, 'ISO-8859-1','UTF-8');
				//echo 'La ligne "' .$ligne. '" contient
				array_push($lignes_serveur, $ligne);
			}

			$derniere_synchro_serveur = $lignes_serveur[1];
			if($derniere_synchro_serveur == "")$derniere_synchro_serveur = "0";
		    
		    fclose($res);
	    }
	    
    	return $lignes_serveur;
	}

	function result_final($path, $lignes_client, $lignes_serveur) {
			if(DEBUG)echo "<br>Cas 1, 2 ou 4, fichier server mise à jour : <br>";
			for($i = 0; $i < count($lignes_client); $i++) {
				echo $lignes_client[$i]."<br/>";
			}
			write_file_server($path, $lignes_client);

	}

	function write_file_server($path, $lignes_serveur) {
		$myfile = fopen('../pdf/programmes/'.$path, 'w') or die("Unable to open file!");
		$txt = implode("\n",$lignes_serveur);
		$txt = mb_convert_encoding($txt, 'UTF-8', 'ISO-8859-1');
		fwrite($myfile, $txt);
		fclose($myfile);
	}

	header ('Content-type: text/html; charset=iso8859-15');

    include("../php/connexion.php");
    
	/**
	 * Exemple : 
	 * http://rino.robotiutna.free.fr/php/test.php?auteur=nan&lastsync=20230502171101&lastmodif=20230403165202&path=2023-3-20_Nort_Ordinaire.txt&contenu=2023-3-20%C2%A3Nort%C2%A3Ordinaire%C2%A3%C2%A3[Anamn%C3%A8se]%C2%A3%C2%A4Doxologie%20de%20la%20pri%C3%A8re%20eucharistique%C2%A3path%20=%20Doxologie/Doxologie%20de%20la%20pri%C3%A8re%20eucharistique/Doxologie%20de%20la%20pri%C3%A8re%20eucharistique_v2.pdf%C2%A3[PP]%C2%A3[Gloria]%C2%A3%C2%A4bahia-curve-doc-technique.pdf%C2%A3path%20=%20rtos1/rtos2/bahia-curve-doc-technique.pdf%C2%A3[Psaume]%C2%A3[All%C3%A9luia]%C2%A3[Credo]%C2%A3%C2%A4e-billet(1).pdf%C2%A3path%20=%20rtos1/rtos2/e-billet(1).pdf%C2%A3[PU]%C2%A3[Offertoire]%C2%A3[Sanctus]%C2%A3[Doxologie]%C2%A3[Notre%20P%C3%A8re]%C2%A3[Communion]%C2%A3[Sortie]%C2%A3[Entr%C3%A9e]%C2%A3%C2%A4Amen,%20gloire%20et%20louange%C2%A3path%20=%20Doxologie/Amen,%20gloire%20et%20louange/Amen,%20gloire%20et%20louange_v8.pdf%C2%A3
	 */
    if(isset($_GET['auteur']) && isset($_GET['path']) && isset($_GET['lastmodif']) && isset($_GET['contenu'])){

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
    }

	/** Exemple :
	 * 
	 * 	1 : Nort
	 *	2 : Ordinaire
	 *	3 :
	 *	4 : [Anamnèse]
	 *	5 : #Doxologie de la prière eucharistique
	 *	6 : path = Doxologie/Doxologie de la prière eucharistique/Doxologie de la prière eucharistique_v2.pdf
	 *	7 : [PP]
	 *	8 : [Gloria]
	 *	9 : #bahia-curve-doc-technique.pdf
	 *	10 : path = rtos1/rtos2/bahia-curve-doc-technique.pdf
	 *	11 : [Psaume]
	 *	12 : [Alléluia]
	 *	13 : [Credo]
	 *	14 : #e-billet(1).pdf
	 *	15 : path = rtos1/rtos2/e-billet(1).pdf
	 *	16 : [PU]
	 *	17 : [Offertoire]
	 *	18 : [Sanctus]
	 *	19 : [Doxologie]
	 *	20 : [Notre Père]
	 *	21 : [Communion]
	 *	22 : [Sortie]
	 *	23 : [Entrée]
	 *	24 : #Amen, gloire et louange
	 *	25 : path = Doxologie/Amen, gloire et louange/Amen, gloire et louange_v8.pdf
	 *	26 : 
	 */
 ?>
