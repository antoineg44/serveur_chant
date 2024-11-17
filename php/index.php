<?php header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: *");    // cache for 1 day

$content = file_get_contents("http://webpartoch.free.nf/index.html");

echo $content
?><!DOCTYPE html>
<html>

<head>
    <meta charset=utf-8>
    <meta name=viewport content="width=device-width,initial-scale=1">
    <title>antoine</title>
    <link href=static/css/app.30790115300ab27614ce176899523b62.css rel=stylesheet>
</head>

<body>
   testing

</body>

</html>
