<?php
$dir = "../res/chants";
$dh  = opendir($dir);
while (false !== ($filename = readdir($dh))) {
    $files[] = $filename;
}
    
sort($files);
    
//print_r($files);

for($i=0; $i<sizeof($files); $i++){
    if($files[$i][0] != '.')
        echo $files[$i].";";
}
    
//rsort($files);
    
//print_r($files);
?>