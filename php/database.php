
<?php 
// SELECT * FROM Ajouter WHERE  Date > '2022-03-19 17:00:00'

function connection(){
    try {    
        $_SESSION['session']=new PDO("mysql:host=$serveur; dbname=$nom_bd", $db_user, $db_pass);
    } catch (PDOException $e) {
        print "Erreur !: " . $e->getMessage() . "<br/>";
        die();
    }
}

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

function nombreFichierAjout()
{
    $params = getParams(['date']);
    if($params == null)return;

    connection();

    search_new_event($params['date']);

    echo "£#1";
}
	

?>
