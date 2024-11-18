<?php
include("../php/config.php");

if(isset($_SERVER['HTTP_ORIGIN']) && $addr_server_test == $_SERVER['HTTP_ORIGIN'])
{
    header('Access-Control-Allow-Origin: '.$_SERVER['HTTP_ORIGIN']);
    header('Access-Control-Allow-Methods: GET, PUT, POST, DELETE, OPTIONS');
    header('Access-Control-Max-Age: 1000');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
}

header('Content-Type: text/html; charset=ISO-8859-15');

if(isset($_GET['nom'])){
    $nom = (String) urldecode(trim($_GET['nom']));
    $nom = str_replace("¤", "'", $path);

    // éviter d'explorer tous les répertoires :
    if(strpos("a".$_GET['nom'],'..'))$nom = "";

    // création tableau avec liste fichiers :
    $rep = array();

    /*$it = new RecursiveDirectoryIterator(utf8_encode($path));
    //$display = Array ( 'jpeg', 'jpg' );
    foreach(new RecursiveIteratorIterator($it) as $file)
    {
        //if (in_array(strtolower(array_pop(explode('.', $file))), $display))
        $rep[] = $file;
    }*/

    $pattern = '/'.$nom.'/'; //use "//" for all files
    $directoryIterator = new RecursiveDirectoryIterator(utf8_encode("../../../pdf/"));
    $iteratorIterator = new RecursiveIteratorIterator($directoryIterator);
    $regexIterator = new RegexIterator($iteratorIterator, $pattern);
    foreach ($regexIterator as $file) {
        //if (is_dir($file)) continue;
        $rep[] = $file;
    }

    // tri par ordre alphabétique
    sort($rep);

    // affichage des répertoire :
    foreach($rep as $affichage)
    {
        // on remplace les caracteres posants problemes
        //$a_remplacer = array("  ", " ", "'", "é", "è", "à", "ç", "//", "/");
        //$affichage_simple = str_replace($a_remplacer, "_", $affichage);
        echo $affichage."£";
    }

} else echo "erreur parametre";     // si le paramètre d'entrée n'est pas spécifié
?>
