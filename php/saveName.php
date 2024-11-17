<?php
 
/*
* Database Constants
* Make sure you are putting the values according to your database here 
*/
/*
define('DB_HOST','sql.free.fr');
define('DB_USERNAME','rino.robotiutna');
define('DB_PASSWORD','AssoIutRino19');
define('DB_NAME', 'rino_robotiutna');
 
//Connecting to the database
$conn = new mysqli(DB_HOST, DB_USERNAME, DB_PASSWORD, DB_NAME);*/

include("../php/connexion.php");

connexion();
 
//checking the successful connection
if($_SESSION['session']->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}
 
//making an array to store the response
$response = array(); 
 
 /*$dir = (String) trim($_GET['req']);
 if (isset($dir)) {
 	$req = $dir;
 }
//if there is a post request move ahead 
else*/ if($_SERVER['REQUEST_METHOD']=='POST'){
 
 //getting the name from request 
 $req = $_POST['req'];

 //creating a statement to insert to database 
 $stmt = $_SESSION['session']->prepare($req);	// INSERT INTO Cantiques (titre) VALUES (?)
 
 //binding the parameter to statement 
 //$stmt->bind_param("s", $name);
 
 //if data inserts successfully
 if($stmt->execute()){
	//making success response 
	$response['error'] = false;
	$response['message'] = 'Name saved successfully';

	$myArray = array();
	while($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
	    $myArray[] = $row;
	}
	if(count($myArray) > 0)
		$response['data'] = $myArray;
	else {
		array_push($myArray, $_SESSION['session']->lastInsertId());
		$response['data'] = $myArray;
	}
	
 }else{
 //if not making failure response 
 $response['error'] = true; 
 $response['message'] = 'Please try later';
 }
 
}else{
 $response['error'] = true; 
 $response['message'] = "Invalid request"; 
}
 
//displaying the data in json format 
echo json_encode($response);

?>
