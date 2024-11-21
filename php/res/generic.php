<?php

function set_error($message)
{
    echo $message;
    return null;
}

function getParams($input)
{
    $success = true;

    for($i=0; $success && $i<sizeof($input); $i++) {
        if(isset($_GET[$input[$i]]) && !empty($_GET[$input[$i]])) {
            $success = false;
        } else {
            $params[$input[$i]] = (String)trim($_GET[$input[$i]]);
        }
    }

    if($success == false) {
        set_error("params failure");
        return null;
    }

    return $params;
}

?>