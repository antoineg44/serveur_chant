<?php
    include("config.php");

    if($addr_server_test == $_SERVER['HTTP_ORIGIN'])
    {
        header('Access-Control-Allow-Origin: '.$_SERVER['HTTP_ORIGIN']);
        header('Access-Control-Allow-Methods: GET, PUT, POST, DELETE, OPTIONS');
        header('Access-Control-Max-Age: 1000');
        header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
    }

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
