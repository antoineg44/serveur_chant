<?php

// Ecrire dans un fichier :
function write_program_json($path, $jsonObj) {
    $json = json_encode($jsonObj);
    $myfile = fopen('../../pdf/programmes/'.$path, 'w') or die("Unable to open file!");
    //$txt = mb_convert_encoding($txt, 'UTF-8', 'ISO-8859-1');
    fwrite($myfile, $json);
    fclose($myfile);
}

?>
