<?php

function add_chant_programme(&$lignes_origine, &$index_origine, &$lignes_fin, &$index_fin) {
    if(DEBUG)echo "chant ajouté : ".$lignes_origine[$index_origine]["name"];
    array_splice($lignes_fin, $index_fin, 0, [$lignes_origine[$index_origine]]);
}

function remove_chant_programme(&$lignes, &$index) {
    if(DEBUG)echo "remove : ".$lignes[$index]." at ".$index."<br>";
    array_splice($lignes, $index, 1);
}

function compare($cas, &$lignes_client, &$lignes_serveur)
{
    $i_c = 0;
    $i_s = 0;
    $modif = false;

    while($i_c<count($lignes_client) && $i_s<count($lignes_serveur)) {
        $client = $lignes_client[$i_c];
        $serveur = $lignes_serveur[$i_s];

        if(strcmp($client["type"], $serveur["type"]) == 0 && strcmp($client["name"], $serveur["name"]) == 0 && (strcmp($client["type"], "partie") == 0 || strcmp($client["path"], $serveur["path"]) == 0)) {
            if(DEBUG)echo " idem client <br>";
            $i_c++;
            $i_s++;
        }
        else {
            $modif = true;
            if(DEBUG)echo $i_c."/".$i_s."differents : ".$client["name"]."/".$serveur["name"]."<br>";
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
                    /*if($client[0] == '[') {
                        add_chant_programme($lignes_serveur, $i_s, $lignes_client, $i_c);
                    }
                    else if($serveur[0] == '[') {*/
                        add_chant_programme($lignes_client, $i_c, $lignes_serveur, $i_s);
                    /*}
                    else {
                        add_chant_programme($lignes_client, $i_c, $lignes_serveur, $i_s);
                    }*/
                }
            }
        }			
    }

    // Copie de la fin du fichier
    while($cas != 3 && $i_c<count($lignes_client)) {
        if(DEBUG)echo "ligne en plus client : ".$i_c." : ".$lignes_client[$i_c]."<br/>";
        array_push($lignes_serveur, $lignes_client[$i_c]);
        $i_s++;
        $i_c++;
        $modif = true;
    }
    while($cas != 1 && $i_s<count($lignes_serveur)) {
        if(DEBUG)echo "ligne en plus serveur : ".$i_s." : ".$lignes_serveur[$i_s]."<br/>";
        array_push($lignes_client, $lignes_serveur[$i_s]);
        $i_c++;
        $i_s++;
        $modif = true;
    }
    
    // supprimer la fin du fichier pour éviter les erreurs
    while($i_s<count($lignes_serveur)) {
        if(DEBUG)echo "ligne a supprimer sur le serveur : ".$lignes_serveur[$i_s]."<br/>";
        array_pop($lignes_serveur);
        $modif = true;
    }
    while($i_c<count($lignes_client)) {
        if(DEBUG)echo "ligne a supprimer sur le client : ".$lignes_client[$i_c]."<br/>";
        array_pop($lignes_client);
        $modif = true;
    }

    return $modif;
}

function present_apres($recherche, $ligne, $index) {
    // Afficher le fichier récupéré dans le l'url :
    $find = false;
    $i = $index+1;

    while($find == false && $i < count($ligne)) {
        if(strcmp($recherche["name"], $ligne[$i]["name"]) == 0 && (strcmp($client["type"], "partie") == 0 || strcmp($client["path"], $serveur["path"]) == 0)) {
            if(DEBUG)echo "present après";
            $find = true;
        }
        $i++;
    }

    return $find;
}

function merge($cas, &$lignes_client, &$lignes_serveur) {
    if(DEBUG)echo "<br>client : <br>";
    if(DEBUG)print_r($lignes_client);
    if(DEBUG)echo "<br>serveur : <br>";
    if(DEBUG)print_r($lignes_serveur);
    

    switch ($cas) {
        // Cas 0 : client et serveur sont à jour == même fichier -> rien à faire
        case 0:
            return 0;
            break;
            
        // Cas 1 : le client a une version plus récente du fichier mais pas besoin de merge -> copie du fichier client sur le serveur
        case 1:
            $lignes_serveur["dateLastModif"] = $lignes_client["dateLastModif"];
            $lignes_serveur["description"] = $lignes_client["description"];
            break;

        // Cas 2 : le client a une version plus récente du fichier et besoin d'un merge
        case 2:
            $lignes_client["dateLastModif"] = date("YmdHis");
            $lignes_serveur["dateLastModif"] = date("YmdHis");
            $lignes_serveur["description"] = $lignes_client["description"];
            break;

        // Cas 3 : le client n'a pas fait de modif mais le serveur oui -> copie du fichier serveur sur le client
        case 3:
            $lignes_client["dateLastModif"] = $lignes_serveur["dateLastModif"];
            $lignes_client["description"] = $lignes_serveur["description"];
            break;

        // Cas 4 : le serveur a une version plus récente du fichier et besoin d'un merge
        case 4:
            $lignes_client["dateLastModif"] = date("YmdHis");
            $lignes_serveur["dateLastModif"] = date("YmdHis");
            $lignes_client["description"] = $lignes_serveur["description"];
            break;

        // Cas 5 : le client n'a pas encore synchronisé son fichier avec le serveur
        case 5:
            $lignes_serveur["dateLastModif"] = $lignes_client["dateLastModif"];
            $lignes_serveur["description"] = $lignes_client["description"];
            break;
        
        default:
            return -1;
            break;
    }

    $lignes_client["dateLastSynchro"] = date("YmdHis");     // FIXME : add $lignes_client["dateLastSynchro"] !!!


    return compare($cas, $lignes_client["chants"], $lignes_serveur["chants"]);
}
?>