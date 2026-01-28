

function manager_init()
{
    console.log("manager init");
    for(var i=0; i<programme.chants.length; i++)
    {
        var url =  "https://partitions.ovh/pdf/" + programme.chants[i].path;
        let blob = await fetch(url).then(r => r.blob());
        console.log(blob);
        const url2 = URL.createObjectURL(blob);
        console.log("url2");
        console.log(url2);
        programme.chants[i].url = url2;
   
        //var if1 = document.getElementById("pdf-js-viewer");
        //var fc = (if1.contentWindow || if1.contentDocument);
        //fc.document.dispatchEvent(new CustomEvent("changePDF", {
        //    detail: { file: url2 }
        //}));

        console.log(programme.chants[i])
    }
}

function manager_open(path_file_programme, path_chant)
{
    var found = false;
    for(var i=0; i<programme.chants.length; i++)
    {
        // recherche du fichier dans le programme
        if(programme.chants[i].path == path_chant)
        {
            found = true;
            if(programme.chants[i].url)
            {
                console.log("chant downloaded");
            }
            else {
                console.log("chant not downloaded");
            }
        }
    }
    if(!found)
    {
        console.error("Path not found : " + path_chant);
    }
    // not downloaded :
    //var path = window.location.origin+window.location.pathname+"?programme="+path_file_programme.replaceAll("'","%27")+"&lien="+path_chant.replaceAll("'","%27");
    //window.open(path,_self);
}