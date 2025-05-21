<?php

require "../../explorer/support/file_explorer_fs_helper.php";

$path = "../../pdf/";
$search_word = $_POST["search"];

$iterator = new RecursiveIteratorIterator(
    new RecursiveDirectoryIterator($path, RecursiveDirectoryIterator::SKIP_DOTS),
    RecursiveIteratorIterator::SELF_FIRST
);

@set_time_limit(0);

$result = array(
    "success" => true,
    "entries" => array()
);

$i = 0;
$data[] = null;

$search_word = preg_replace('/[^A-Za-z0-9\-]/', '', $search_word);

foreach ($iterator as $item) 
{
    $file = $item->getFilename();
    if (preg_match('/'.$search_word.'/i', preg_replace('/[^A-Za-z0-9\-]/', '', $file)))
    {
        if ($item->isFile()) 
        {
            $entry = FileExplorerFSHelper::SearchEntry($item->getPath(), $file, "file", 20, $options, $path);
            if ($entry !== false)  $data[] = substr($entry["id"], 1);
        }
        /*elseif ($item->isDir()) 
        {
            if ($file[0] !== "." || $options["dot_folders"])
            {
                $entry = FileExplorerFSHelper::SearchEntry($item->getPath(), $file, "folder", 20, $options, $path);
                if ($entry !== false)  $result["entries"][] = $entry;
            }
        }*/
        $i = $i+1;
        if($i > 100)break;
    }
}

// For test :
//$data = ["test1", $_GET["search"], "suite", "encore"];
echo count($data)==0 ? "null" : json_encode($data);


?>