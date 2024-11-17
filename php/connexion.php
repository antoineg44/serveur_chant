
<?php 

function connexion(){
/*    try {
        $_SESSION['session']=new PDO('mysql:host=localhost;dbname=phpmyadmin', "phpmyadmin", "Antoine10");
    } catch (PDOException $e) {
        print "Erreur !: " . $e->getMessage() . "<br/>";
        die();
    }
*/
    $db_user="partithbase"; //nom d'utilisateur
    $db_pass="Nicolas1"; //mot de passe
    $serveur='partithbase.mysql.db';
    $nom_bd='partithbase';
    try {
        $_SESSION['session']=new PDO("mysql:host=$serveur; dbname=$nom_bd", $db_user, $db_pass);
    } catch (PDOException $e) {
        print "Erreur !: " . $e->getMessage() . "<br/>";
        die();
    }
}

function mres($value)
{
    $search = array("\\",  "\x00", "\n",  "\r",  "'",  '"', "\x1a");
    $replace = array("\\\\","\\0","\\n", "\\r", "\'", '\"', "\\Z");

    return str_replace($search, $replace, $value);
}
?>

