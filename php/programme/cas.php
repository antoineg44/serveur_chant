<?php

    /**
     * Cas 0 : client et serveur sont à jour == même fichier -> rien à faire
     * Cas 1 : le client a une version plus récente du fichier mais pas besoin de merge -> copie du fichier client sur le serveur
     * Cas 2 : le client a une version plus récente du fichier et besoin d'un merge
     * Cas 3 : le client n'a pas fait de modif mais le serveur oui -> copie du fichier serveur sur le client
     * Cas 4 : le serveur a une version plus récente du fichier et besoin d'un merge
     * Cas 5 : le client n'a pas encore synchronisé son fichier avec le serveur
     */


    function getCas($date_lastSynchroClientServer, $date_lastModifOnClient, $date_lastModifOnServer) {
    	if(DEBUG)echo "date de dernière synchronisation avec le client : ".$date_lastSynchroClientServer."<br>";
    	if(DEBUG)echo "date de dernière modification sur le client : ".$date_lastModifOnClient."<br>";
    	if(DEBUG)echo "date de dernière modification sur le serveur : ".$date_lastModifOnServer."<br>";
    	
    	$cas = 0;

        /* le programme n'a pas encore été synchronisé avec le server */
        if($date_lastSynchroClientServer == "" || $date_lastModifOnServer == "")
        {
            $cas = 5;       // Cas simple, le fichier du client doit être envoyé sur le serveur
        }
        /* D'autres clients n'ont pas rechangé le programme */
		elseif(abs(intval($date_lastSynchroClientServer) - intval($date_lastModifOnServer)) < 5)    // Marge de qq secondes (le temps que le client modifie son fichier)
        {
            /* Le programme est-t-il à jour sur le serveur ? */
			if(abs(intval($date_lastModifOnClient) - intval($date_lastSynchroClientServer)) < 5)
            {
				$cas = 0;       // pas de modif à faire
			} else
            {
                $cas = 1;		// Cas simple : le fichier du client est à mettre à jour sur le serveur
			}
		}
        /* Il n'y a pas eu de modif sur le client depuis la dernière synchro */
        elseif(abs(intval($date_lastModifOnClient) - intval($date_lastSynchroClientServer)) < 5) // Marge de qq secondes (le temps que le client modifie son fichier)
        {
            $cas = 3;		// Cas simple le fichier du serveur est à mettre à jour sur le client
        }
        /* Pour tous les autres cas, un merge doit être effectué */
        else
        {
            /* le client a un fichier plus récent */
            if(intval($date_lastModifOnClient) > intval($date_lastModifOnServer))
            {
                $cas = 2;		// Cas complexe : il faut faire un mixe des 2 fichiers
            }
            /* le serveur a un fichier plus récent */
            else
            {
                $cas = 4;		// Cas complexe : il faut faire un mixe des 2 fichiers
            }
        }    		
    	return $cas;
    }
 ?>
