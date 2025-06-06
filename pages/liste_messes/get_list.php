<?php
include("../../php/config.php");

if(isset($_SERVER['HTTP_ORIGIN']) && $addr_server_test == $_SERVER['HTTP_ORIGIN'])
{
    header('Access-Control-Allow-Origin: '.$_SERVER['HTTP_ORIGIN']);
    header('Access-Control-Allow-Methods: GET, PUT, POST, DELETE, OPTIONS');
    header('Access-Control-Max-Age: 1000');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
}

header('Content-Type: text/html; charset=ISO-8859-15');

if(isset($_GET['nom'])){
    $path = (String) trim($_GET['nom']);
    $path = str_replace("¤", "'", $path);
    $program = $path;
    //$path = utf8_decode($path);
    $path = "../../pdf/programmes/".$path;

    // éviter d'explorer tous les répertoires :
    if(strpos("a".$_GET['nom'],'..'))$path = "../../pdf/programmes/";

    // création tableau avec liste fichiers :
    $rep = array();

    // ouverture du répertoire
    $le_repertoire = opendir($path) or die("Erreur le repertoire $path existe pas");

    // parcours des ficheirs
    while($var = @readdir($le_repertoire))
    {
        if ($var == "." || $var == "..") continue;
        //if(is_dir($path.'/'.$var)) // si c'est un repertoire
        //{
        else
            $rep[] = $var;
        //}
    }

    // first send the name of the folder :
    echo iconv("utf-8", "iso-8859-1//IGNORE", $program).'£';

    // tri par ordre alphabétique
    rsort($rep);

    // affichage des répertoire :
    foreach($rep as $affichage)
    {
        // on remplace les caracteres posants problemes
        //$a_remplacer = array("  ", " ", "'", "é", "è", "à", "ç", "//", "/");
        //$affichage_simple = str_replace($a_remplacer, "_", $affichage);
        $affichage = iconv("utf-8", "iso-8859-1//IGNORE", $affichage);
        echo $affichage."£";
    }
    
    // fermeture répertoire
    closedir($le_repertoire);

} else echo "erreur parametre";     // si le paramètre d'entrée n'est pas spécifié
?>
