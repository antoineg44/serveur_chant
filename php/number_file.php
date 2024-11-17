<?php


	//$fi = new FilesystemIterator("../pdf",FilesystemIterator::SKIP_DOTS);
	
	
	$files = glob("../pdf/programmes/*.txt");
	$filec = count($files);
	
	//$files2 = glob("../pdf/*.*");
	//$filec2 = count($files2);
	
	$files3 = glob("../pdf/*/*.pdf");
	$filec3 = count($files3);
	
	$files4 = glob("../pdf/*/*/*.pdf");
	$filec4 = count($files4);
	
	printf("There were %d Files", $filec);
	//printf("There were %d Files", $filec2);
	printf("There were %d Files", $filec3);
	printf("There were %d Files", $filec4);
	//echo "ok ca marche";
	
	printf("\nrep : £%d£\n", $filec + $filec3 + $filec4);

?>
