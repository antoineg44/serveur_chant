<?php

header('Content-Type: text/html; charset=ISO-8859-15');

if(isset($_GET['nom'])){
    $path = (String) trim($_GET['nom']);
    $path = str_replace("¤", "'", $path);
    //$path = utf8_decode($path);
    $path = "../../../pdf/programmes/".$path;

    // éviter d'explorer tous les répertoires :
    if(strpos("a".$_GET['nom'],'..'))$path = "../../../pdf/programmes/";

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
