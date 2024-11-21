<?php

function getParams($input)
{
    $success = true;

    for($i=0; $success && $i<sizeof($input); $i++) {
        if(isset($_GET[$input[i]]) && !empty($_GET[$input[i]])) {
            $success = false;
        } else {
            $params[$input[i]] = (String)trim($_GET[$input[i]]);
        }
    }

    if($success == false) {
        echo "params failure";
        return null;
    }

    return $params;
}

?>