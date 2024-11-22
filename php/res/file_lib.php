<?php

// Ecrire dans un fichier :
function write_program_json($path, $jsonObj) {
    $json = json_encode($jsonObj);
    $myfile = fopen('../../pdf/programmes/'.$path, 'w') or die("Unable to open file!");
    //$txt = mb_convert_encoding($txt, 'UTF-8', 'ISO-8859-1');
    fwrite($myfile, $json);
    fclose($myfile);
}

function supr($path, $new_path, $action)
{
    $folder = explode("/", $new_path);
    $path_actuel = "";

    //echo "sizeof : ".sizeof($folder)."!\n";

    // création des dossier pour le nouvelle emplacement
    for($i=0; $i<sizeof($folder)-1; $i++)
    {
        $path_actuel .= $folder[$i]."/";
        //echo "path_actuel : ".$path_actuel."!\n";
        if(!is_dir($path_actuel))
        {
            //echo "new directory ! ".$path_actuel."!\n";
            mkdir($path_actuel);
        }
    }

    // Si le fichier existe déjà dans le nouveau répertoire
    if(file_exists($new_path)) {
        $fichier = $new_path;
        if(is_dir ( $fichier )){
            foreach($files1 = new DirectoryIterator($fichier) as $f1) {

                if($f1->isDot())continue;
                $fichier1 = $f1->getfilename();

                if(is_dir ($fichier."/".$fichier1 )){
                    foreach($files2 = new DirectoryIterator($fichier."/".$fichier1) as $f2) {
                    if($f2->isDot())continue;
                    $fichier2 = $f2->getfilename();
                    
                    if($fichier2[0] != '.'){
                        echo $f2->getfilename()."<br/>";
                        if( file_exists ( $fichier."/".$fichier1."/".$fichier2))
                        unlink( $fichier."/".$fichier1."/".$fichier2 ) ;
                    }
                    }
                    if(@rmdir($fichier."/".$fichier1))echo "suppression : ".$fichier."/".$fichier1."<br/>";
                    else echo "erreur suppression ".$fichier."/".$fichier1."<br/>";
                } else {
                    if($fichier1[0] != '.'){
                        echo $f1->getfilename()."<br/>";
                    if( file_exists ( $fichier."/".$fichier1))
                        unlink( $fichier."/".$fichier1 ) ;
                    }
                }
            }
        }
        else {
            unlink($new_path);
        }
    }
    if($action)
    {
        $ret = rename($path, $new_path);
    }
    else
    {
        if(is_dir($path)) {
            copyDirectory($path, $new_path);
            $ret = 1;
        }
        else
            $ret = copy($path, $new_path);
    }
    return $ret;
}

function nombre_fichiers_pdf()
{
    //$files = glob("../pdf/programmes/*.txt");
	//$filec = count($files);
	
	//$files2 = glob("../pdf/*.*");
	//$filec2 = count($files2);
	
	$files3 = glob("../pdf/*/*.pdf");
	$filec3 = count($files3);
	
	$files4 = glob("../pdf/*/*/*.pdf");
	$filec4 = count($files4);
	
	//printf("There were %d Files", $filec);
	//printf("There were %d Files", $filec2);
	printf("There were %d Files", $filec3);
	printf("There were %d Files", $filec4);
	//echo "ok ca marche";
	
	printf("\nrep : £%d£\n", $filec3 + $filec4);
}

function nombre_dossier()
{
    //$files2 = glob("../pdf/*.*");
	//$filec2 = count($files2);
	
	$files3 = glob("../pdf/*");
	$filec3 = count($files3);
	
	$files4 = glob("../pdf/*/*");
	$filec4 = count($files4);
	
	printf("There were %d Folder", $filec3);
	printf("There were %d Folder", $filec4);
	//echo "ok ca marche";
	
	printf("\nrep : £%d£\n", $filec3 + $filec4);
}
?>
