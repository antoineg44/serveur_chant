
<?php 
	// SELECT * FROM Ajouter WHERE  Date > '2022-03-19 17:00:00'
	
	function search_new_event(){
		if(!$_SESSION['session'])return NULL;
		$req = $_SESSION['session']->prepare("SELECT * FROM Ajouter ORDER BY id DESC LIMIT 5");
		$req->execute();
		//if($row=$req->fetch(PDO::FETCH_ASSOC))return $row['titre'];
		while($row=$req->fetch(PDO::FETCH_ASSOC)){
			echo $row['titre']."%µ".$row['Date']."%#";
		}
	}
	
	include("../php/connexion.php");

	connexion();
	    
	search_new_event();

	echo "£#";
	 
	

?>
