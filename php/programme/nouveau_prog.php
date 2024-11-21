<?php

$old_link = (String) trim($_GET['old_link']);
$new_link = (String) trim($_GET['new_link']);
$insert = (String) trim($_GET['insert']);   // insérer ou non dans la base de donnée
$auteur =(String) trim($_GET['auteur']);

echo $_SERVER['HTTP_HOST'];

if (isset($old_link) && isset($new_link) && isset($auteur)) {
    
    if(empty($old_link) || empty($new_link)){
        return;
    }
    $old_link = (String) "../pdf/".trim($_GET['old_link']);
    $new_link = (String) "../pdf/".trim($_GET['new_link']);

    $decoded = json_decode($_GET['old_link'],true);

    $decoded["path_file"] = $_SERVER['HTTP_ORIGIN'];

    if(!isset($insert))
    {
        $insert = true;
    }
    else
    {
        if(strcmp("false", $insert) == 0)
        {
        $insert = false;
        }
        else
        {
        $insert = true;
        }
    }

    include("../php/connexion.php");

    if($insert == true)connexion();
    
    // si c'est un fichier :
    if(file_exists($old_link))
    {
        if(copy_file($old_link, $new_link))  //unlink($dir)
        {

            if($insert)
            {
            // ...
            }
            echo "success";
        } else {
            echo "fail";
        }
    } else {
        echo "fail file exist";
    }

}




?>