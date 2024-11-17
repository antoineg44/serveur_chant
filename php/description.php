<?php
 
if(!empty($_POST)){
    //
    // Debug
    //
    echo '<pre>';
    print_r($_POST);
    echo '</pre><br />';
 
    //
    // Récupération normale des informations
    //
    $result = "";
    foreach($_POST as $field => $value){
        if($field=="adapt") {
            $result .= $field."=";
            foreach($value as $val)
            {
                $result .= $val."/";
            }
            $result .= "<br/>";
        }
        else $result .= $field."=".$value."<br/>";
    }
    echo $result.'<br /><br />';

    echo $_POST['nom']."<br/>";
    $fichier = fopen($_POST['nom'], 'r');

    if ($fichier)
    {
        /*Tant que l'on est pas à la fin du fichier*/
        $texte[] = array();
        while (!feof($fichier))
        {
            /*On lit la ligne courante*/
            $buffer = fgets($fichier);
            /*On l'affiche*/
            $texte[] = $buffer;
        }
        /*On ferme le fichier*/
        fclose($fichier);
        foreach($texte as $te){
            echo $te."<br/>";
          }
        echo "<br/>ok fin";

    } 
    else echo "fichier introuvable";
}