<?php

    function copy_file($path, $new_path)
    {
        return rename($path, $new_path);
    }

    $old_link = (String) trim($_GET['old_link']);
    $new_link = (String) trim($_GET['new_link']);
    $insert = (String) trim($_GET['insert']);   // insérer ou non dans la base de donnée
    $auteur =(String) trim($_GET['auteur']);
    if (isset($old_link) && isset($new_link) && isset($auteur)) {
        
        if(empty($old_link) || empty($new_link)){
            return;
        } else {
            $old_link = (String) "../pdf/".trim($_GET['old_link']);
            $new_link = (String) "../pdf/".trim($_GET['new_link']);
        }

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
