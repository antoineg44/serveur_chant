<?php
$dir = "../res/trame";
$dh  = opendir($dir);
while (false !== ($filename = readdir($dh))) {
    $files[] = $filename;
}
    
sort($files);

for($i=0; $i<sizeof($files); $i++){
    if($files[$i][0] != '.')
        echo $files[$i].";";
}
?>