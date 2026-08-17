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

	function normalize_programme_path($path) {
		if($path === null) return null;

		$normalized = trim((string) $path);
		if($normalized === '') return null;

		$parsed = parse_url($normalized);
		if($parsed !== false && isset($parsed['query'])) {
			parse_str($parsed['query'], $queryParams);
			if(!empty($queryParams['path'])) {
				$normalized = $queryParams['path'];
			} elseif(!empty($queryParams['file'])) {
				$normalized = $queryParams['file'];
			}
		}

		$normalized = urldecode($normalized);
		$normalized = str_replace('\\', '/', $normalized);
		$normalized = preg_replace('/[?#].*$/', '', $normalized);
		$normalized = ltrim($normalized, '/');

		$forbiddenParts = explode('/', $normalized);
		if(in_array('..', $forbiddenParts, true)) return null;

		$segments = explode('/pdf/programmes/', $normalized);
		if(count($segments) > 1) {
			$normalized = $segments[1];
		} else {
			$segments = explode('/programmes/', $normalized);
			if(count($segments) > 1) {
				$normalized = $segments[1];
			} else {
				$segments = explode('pdf/programmes/', $normalized);
				if(count($segments) > 1) {
					$normalized = $segments[1];
				} else {
					$segments = explode('programmes/', $normalized);
					if(count($segments) > 1) {
						$normalized = $segments[1];
					}
				}
			}
		}

		$normalized = ltrim($normalized, '/');
		if($normalized === '') return null;
		if(substr($normalized, -1) === '/') return null;
		if(strtolower(pathinfo($normalized, PATHINFO_EXTENSION)) !== 'json') {
			$normalized = rtrim($normalized, '/') . '.json';
		}

		return $normalized;
	}

	function normalize_programme_name_part($value, $fallback) {
		$normalized = trim((string) $value);
		$normalized = preg_replace('/[\\\/]+/', '-', $normalized);
		$normalized = preg_replace('/[\x00-\x1F\x7F]+/', '-', $normalized);
		$normalized = trim($normalized, " .-");
		return $normalized !== '' ? $normalized : $fallback;
	}

	function build_programme_path($decoded, $fallbackParoisse, $fallbackPath) {
		$paroisse = normalize_programme_name_part(
			isset($decoded['paroisse']) ? $decoded['paroisse'] : '',
			$fallbackParoisse
		);
		$date = normalize_programme_name_part(
			isset($decoded['date']) ? $decoded['date'] : '',
			'programme'
		);
		$lieu = normalize_programme_name_part(
			isset($decoded['lieu']) ? $decoded['lieu'] : '',
			'lieu'
		);
		$occasion = normalize_programme_name_part(
			isset($decoded['occasion']) ? $decoded['occasion'] : '',
			'occasion'
		);

		if($paroisse === '' || $date === 'programme') {
			return $fallbackPath;
		}

		return $paroisse.'/'.$date.'_'.$lieu.'_'.$occasion.'.json';
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
        $decoded = json_decode($_GET['data'], true);
        if(!is_array($decoded))
        {
            echo "invalid data";
            return;
        }

		$date_modif = trim((string) $_GET['dateModif']);
		$date_derniere_synchronisation = isset($decoded["dateLastModif"])
			? trim((string) $decoded["dateLastModif"])
			: "";
		if(!preg_match('/^\d{14}$/', $date_modif))
		{
			echo "invalid modification date";
			return;
		}

		// La date envoyée avec la requête représente la nouvelle version client.
		$decoded["dateLastModif"] = $date_modif;

        $path_file = isset($decoded["path_file"]) ? (string) $decoded["path_file"] : "";
		$path_prog = normalize_programme_path($path_file);

        if($path_prog === null)
        {
            echo "incorrect path";
            return;
        }

		$old_path_prog = $path_prog;
		$old_path_parts = explode('/', $old_path_prog, 2);
		$fallback_paroisse = $old_path_parts[0];
		$path_prog = build_programme_path($decoded, $fallback_paroisse, $old_path_prog);
		$old_absolute_path = '../../pdf/programmes/'.$old_path_prog;
		$new_absolute_path = '../../pdf/programmes/'.$path_prog;

		if($old_absolute_path !== $new_absolute_path && file_exists($new_absolute_path))
		{
			echo "file already exists";
			return;
		}

		$new_directory = dirname($new_absolute_path);
		if(!is_dir($new_directory) && !mkdir($new_directory, 0775, true))
		{
			echo "unable to create programme directory";
			return;
		}

        $parsedPath = parse_url($path_file);
        $baseUrl = '';
        if($parsedPath !== false && isset($parsedPath['scheme'], $parsedPath['host'])) {
            $baseUrl = $parsedPath['scheme'].'://'.$parsedPath['host'];
        } else {
            $baseUrl = ((isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http').'://'.$_SERVER['HTTP_HOST'];
        }
        $decoded["path_file"] = $baseUrl.'/pdf/programmes/'.$path_prog;

        echo $decoded["path_file"]."\n";

		$lignes_serveur = get_programme_serveur($old_path_prog);

		if($lignes_serveur == null)
		{
			write_file_server($path_prog, $decoded);
			if($old_absolute_path !== $new_absolute_path && file_exists($old_absolute_path)) {
				unlink($old_absolute_path);
			}
			echo 'result : success<br/>';
		}
		else {
			$cas = getCas($date_derniere_synchronisation, $date_modif, $lignes_serveur["dateLastModif"]);
			
			echo "Cas : ".$cas;

			$result = merge($cas, $decoded, $lignes_serveur);

			echo '\n<pre>ligne client : '.print_r($decoded, true).'</pre>';
			echo '\n<pre>ligne serveur : '.print_r($lignes_serveur, true).'</pre>';
			$clientVersionWins = in_array($cas, array(1, 2, 5), true);
			if($result == true)echo 'result : success<br/>';
			else echo 'result : no chant change<br/>';
			if($clientVersionWins && $result !== -1) {
				write_file_server($path_prog, $lignes_serveur);
				if($old_absolute_path !== $new_absolute_path && file_exists($old_absolute_path)) {
					unlink($old_absolute_path);
				}
				echo 'result : success<br/>';
			}
		}  
    }
    // HELP : https://www.sitepoint.com/jquery-php-ajax-json/
 ?>
