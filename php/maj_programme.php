<?php
	define("DEBUG", false);

    function cas_de_figure($lastsynchro, $date_lastmodif_server, $lastmodif, $path) {
    	//$date_lastmodif_server = date("YmdHis",filemtime('../pdf/programmes/'.$path));
    	if(DEBUG)echo "dernière synchronisation client : ".$lastsynchro."<br>";
    	if(DEBUG)echo "dernière modification client : ".$lastmodif."<br>";
    	if(DEBUG)echo "dernière modification serveur : ".$date_lastmodif_server."<br>";
    	
    	$cas = 0;

		if(strcmp($lastsynchro, $date_lastmodif_server) == 0) {		// Cas 1 ??? ou rien à modifier ?
			if(intval($lastmodif) > (intval($lastsynchro) +1)) {	// Marge de 5 secondes (le temps que le client modifie son fichier)
				$cas = 1;		// Cas simple : le fichier du client est à mettre à jour sur le serveur
			} else {
				$cas = 0;
			}
		}
		// Si le client a modifié le fichier après le serveur :
    	else if(strcmp($lastmodif, $date_lastmodif_server) > 0) {
    		// Nous sommes capable de dire que le serveur n'a pas reçu de modification depuis la dernière synchro :
    		if(strcmp($lastsynchro, $date_lastmodif_server) > 0) {
    			$cas = 1;		// Cas simple : le fichier du client est à mettre à jour sur le serveur
    		} else {
    			$cas = 2;		// Cas complexe : il faut faire un mixe des 2 fichiers
    		}
    	}
    	// Un autre client a modifié le programme après notre client :
    	else {
    		if(strcmp($lastsynchro, $lastmodif) > 0) {
    			$cas = 3;		// Cas simple le fichier du serveur est à mettre à jour sur le client
    		} else {
    			$cas = 4;		// Cas complexe : il faut faire un mixe des 2 fichiers
    		}
    	}
    		
    	return $cas;
    }
    
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

	function comparer_programmes($cas, &$lignes_client, &$lignes_serveur) {
		if(DEBUG)echo "<br>client : <br>";
		if(DEBUG)print_r($lignes_client);
		if(DEBUG)echo "<br>serveur : <br>";
		if(DEBUG)print_r($lignes_serveur);

		if($cas == 3) {
			$lignes_client[1] = $lignes_serveur[1];
		} else {
			$lignes_serveur[1] = date("YmdHis");		// FIXME : est-ce qu'il faut mettre la date du jour ???
			$lignes_client[1] = date("YmdHis");
		}

		$i_c = 2;
		$i_s = 2;

		while($i_c<count($lignes_client) && $i_s<count($lignes_serveur)) {
			$ok = 1;
			$client = $lignes_client[$i_c];
			$serveur = $lignes_serveur[$i_s];
			if(strcmp($client, "") == 0 || ($client[0] != '[' && $client[0] != '#')) {	// Détection ligne inconnue sur client (une ligne vide ou juste une description (path=) ?)
				$i_c++;
				$ok = 0;
			}
			if(strcmp($serveur, "") == 0 || ($serveur[0] != '[' && $serveur[0] != '#')) {	// Détection ligne inconnue sur serveur (une ligne vide ?)
				$i_s++;
				$ok = 0;
			}

			if($ok == 1) {
				if(strcmp($client, $serveur) == 0) {
					if(DEBUG)echo " idem client <br>";
					$i_c++;
					$i_s++;
				}
				else {
					if(DEBUG)echo $i_c."/".$i_s."differents : ".$client."/".$serveur."<br>";
					if($cas == 1) {		// Cas simple : le fichier du client est à mettre à jour sur le serveur
						//if($client[0] != '[' && $client[0] != )
						if(present_apres($serveur, $lignes_client, $i_c)) {
							add_chant_programme($lignes_client, $i_c, $lignes_serveur, $i_s);
						} else {
							remove_chant_programme($lignes_serveur, $i_s);
						}
						// s'il a été supprimé
					}
					else if($cas == 3) {
						if(present_apres($client, $lignes_serveur, $i_s)) {
							add_chant_programme($lignes_serveur, $i_s, $lignes_client, $i_c);
						} else {
							remove_chant_programme($lignes_client, $i_c);
						}
					}
					else {
						// Gestion des caractère de modification du programme (+, - et =) :
						/*if($client[1] == '+') {
							add_chant_programme($lignes_client, $i_c, $lignes_serveur, $i_s);
						} else if($client[1] == '-') {
						
						} else if($client[1] == '=') {
							remove_chant_programme($lignes_serveur, $i_s);
							add_chant_programme($lignes_client, $i_c, $lignes_serveur, $i_s);
						} 
						
						// Mise à jour du serveur
						else {
						
						}*/
						
						if(present_apres($serveur, $lignes_client, $i_c)) {
							add_chant_programme($lignes_client, $i_c, $lignes_serveur, $i_s);
						} else if(present_apres($client, $lignes_serveur, $i_s)) {
							add_chant_programme($lignes_serveur, $i_s, $lignes_client, $i_c);
						}
						else {
							if($client[0] == '[') {
								add_chant_programme($lignes_serveur, $i_s, $lignes_client, $i_c);
							}
							else if($serveur[0] == '[') {
								add_chant_programme($lignes_client, $i_c, $lignes_serveur, $i_s);
							}
							else {
								add_chant_programme($lignes_client, $i_c, $lignes_serveur, $i_s);
							}
						}
					}
				}
			}			
		}

		// Copie de la fin du fichier
		while($cas != 3 && $i_c<count($lignes_client)) {
			if(strlen($lignes_client[$i_c]) > 2) {
				if(DEBUG)echo "ligne en plus client : ".$i_c." : ".$lignes_client[$i_c]."<br/>";
				array_push($lignes_serveur, $lignes_client[$i_c]);
				$i_s++;
			}
			$i_c++;
		}
		while($cas != 1 && $i_s<count($lignes_serveur)) {
			if(strlen($lignes_serveur[$i_s]) > 2) {
				if(DEBUG)echo "ligne en plus serveur : ".$i_s." : ".$lignes_serveur[$i_s]."<br/>";
				array_push($lignes_client, $lignes_serveur[$i_s]);
				$i_c++;
			}
			$i_s++;
		}
		
		// supprimer la fin du fichier pour éviter les erreurs
		while($i_s<count($lignes_serveur)) {
			array_pop($lignes_serveur);
		}
		while($i_c<count($lignes_client)) {
			array_pop($lignes_client);
		}
	}

	function present_apres($recherche, $ligne, $index) {
		// Afficher le fichier récupéré dans le l'url :
		$find = false;
		$i = $index+1;

		while($find == false && $i < count($ligne)) {
			if(strcmp($recherche, $ligne[$i]) == 0) {
				if(DEBUG)echo "present après";
				$find = true;
			}

			$i++;
		}

		return $find;
	}

	function add_chant_programme(&$lignes_origine, &$index_origine, &$lignes_fin, &$index_fin) {
		array_splice($lignes_fin, $index_fin, 0, $lignes_origine[$index_origine]);
		if(DEBUG)echo "chant ajouté : ".$lignes_origine[$index_origine];

		if($lignes_origine[$index_origine][0] == '#') {
			$index_origine++;
			$index_fin++;

			$l_origine = $lignes_origine[$index_origine];

			// FIXME !!!
			while($index_origine<count($lignes_origine) && $l_origine[0] != '[' && $l_origine[0] != '#') {
				array_splice($lignes_fin, $index_fin, 0, $lignes_origine[$index_origine]);

				$index_origine++;
				$index_fin++;
				$l_origine = $lignes_origine[$index_origine];
			}
		}
	}

	function remove_chant_programme(&$lignes, &$index) {
		if(DEBUG)echo "remove : ".$lignes[$index]." at ".$index."<br>";

		if($lignes[$index][0] == '#') {

			array_splice($lignes, $index, 1);

			while($index<count($lignes) && $lignes[$index][0] != '[' && $lignes[$index][0] != '#') {
				array_splice($lignes, $index, 1);
			}

		} else {
			array_splice($lignes, $index, 1);
		}
	}

	function result_final($path, $cas, $lignes_client, $lignes_serveur) {
		if($cas != 3) {
			if(DEBUG)echo "<br>Cas 1, 2 ou 4, fichier server mise à jour : <br>";
			for($i = 0; $i < count($lignes_serveur); $i++) {
				if(DEBUG)echo $i." : ".$lignes_serveur[$i]."<br/>";
			}
			write_file_server($path, $lignes_serveur);
		}

		//if($cas != 1) {
			if(DEBUG)echo "<br>Cas 2, 3 ou 4, fichier client mise à jour : <br>";
			echo "§";
			for($i = 0; $i < count($lignes_client); $i++) {
				//echo $i." : ".$lignes_client[$i]."<br/>";
				echo $lignes_client[$i]."<br/>";
			}
		/*} else {
			echo "cas 1";
		}*/
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
			$lignes_serveur =  get_programme_serveur($derniere_synchro_serveur, $path_file);
        		$cas = cas_de_figure($derniere_synchro_client, $derniere_synchro_serveur, $derniere_modif, $path_file);
		} else {
			$cas = 5;
		}
     	if(DEBUG)echo "cas : ".$cas."<br>";

		if($cas == 0) {
			echo "cas 0";
		}
		else if($cas == 5) {
			echo "cas : ".$cas."<br>";
			$lignes_client[1] = date("YmdHis");
			result_final($path_file, $cas, $lignes_client, $lignes_client);
		}
		else {
			echo "cas : ".$cas."<br>";
			comparer_programmes($cas, $lignes_client, $lignes_serveur);
			result_final($path_file, $cas, $lignes_client, $lignes_serveur);
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
