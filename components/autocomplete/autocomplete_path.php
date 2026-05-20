<?php

require "../../explorer/support/file_explorer_fs_helper.php";

$path = "../../pdf/";
$search_word = $_POST["search"];

$iterator = new RecursiveIteratorIterator(
    new RecursiveDirectoryIterator($path, RecursiveDirectoryIterator::SKIP_DOTS),
    RecursiveIteratorIterator::SELF_FIRST
);

@set_time_limit(0);

$options = array(
    "windows" => false,
    "protect_depth" => 0,
    "thumbs_dir" => false,
    "base_url" => false,
    "base_dir" => $path,
    "started" => time()
);

$result = array(
    "success" => true,
    "entries" => array()
);

$i = 0;
$data = array();

$search_word = preg_replace('/[^\p{L}\p{N}\-\s]/u', '', $search_word);
$search_word = trim($search_word);

// Escape regex special characters and make it case-insensitive
$search_pattern = preg_quote($search_word, '/');

foreach ($iterator as $item) 
{
    $file = $item->getFilename();
    $file_tested = preg_replace('/[^\p{L}\p{N}\-\s]/u', '', $file);
    $file_tested = trim($file_tested);
    $file_tested = preg_quote($file_tested, '/');
    if (preg_match('/' . $search_pattern . '/iu', $file_tested))
    {
        if ($item->isFile()) 
        {
            //$entry = FileExplorerFSHelper::SearchEntry($item->getPath(), $file, "file", 20, $options, $path);
            //if ($entry !== false) $data[] = substr($entry["id"], 1);
            $data[] = $item->getFilename();
            $i = $i+1;
            if($i > 9)break;
        }
        /*elseif ($item->isDir()) 
        {
            if ($file[0] !== "." || $options["dot_folders"])
            {
                $entry = FileExplorerFSHelper::SearchEntry($item->getPath(), $file, "folder", 20, $options, $path);
                if ($entry !== false)  $result["entries"][] = $entry;
            }
        }*/
    }
}

// For test :
//$data = ["test1", $_GET["search"], "suite", "encore"];
if($data != null)
    echo count($data)==0 ? "null" : json_encode($data);


?>