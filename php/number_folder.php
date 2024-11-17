<?php
	
	//$files2 = glob("../pdf/*.*");
	//$filec2 = count($files2);
	
	$files3 = glob("../pdf/*");
	$filec3 = count($files3);
	
	$files4 = glob("../pdf/*/*");
	$filec4 = count($files4);
	
	printf("There were %d Folder", $filec3);
	printf("There were %d Folder", $filec4);
	//echo "ok ca marche";
	
	printf("\nrep : £%d£\n", $filec3 + $filec4);

?>
