
<?php 
	// SELECT * FROM Ajouter WHERE  Date > '2022-03-19 17:00:00'
	
	function search_new_event($date){
		if(!$_SESSION['session'])return NULL;
		$req = $_SESSION['session']->prepare("SELECT * FROM Ajouter WHERE  Date > '".$date."'");
		//$req = $_SESSION['session']->prepare("SELECT * FROM Ajouter WHERE  Date > '2022-03-19 17:00:00'");
		$req->execute();
		//if($row=$req->fetch(PDO::FETCH_ASSOC))return $row['titre'];
		while($row=$req->fetch(PDO::FETCH_ASSOC)){
			echo $row['titre']."%µ".$row['Date']."%#";						// TODO ajouter auteur car ça ne sert à rien de vérifier inutilement
		}
	}

	function search_new_sup($date){
		if(!$_SESSION['session'])return NULL;
		$req = $_SESSION['session']->prepare("SELECT * FROM Supprimer WHERE  Date > '".$date."'");
		//$req = $_SESSION['session']->prepare("SELECT * FROM Ajouter WHERE  Date > '2022-03-19 17:00:00'");
		$req->execute();
		//if($row=$req->fetch(PDO::FETCH_ASSOC))return $row['titre'];
		while($row=$req->fetch(PDO::FETCH_ASSOC)){
			echo $row['titre']."%µ".$row['Date']."%#";
		}
	}
	
	include("../php/connexion.php");

	connexion();
	    
	if(isset($_GET['date'])){
			
		$date =(String) trim($_GET['date']);						// TODO ajouter auteur car ça ne sert à rien de vérifier inutilement

		search_new_event($date);

		echo "£#";

		search_new_sup($date);
	 }
	 
	 else echo "erreur parametre";
	

?>
