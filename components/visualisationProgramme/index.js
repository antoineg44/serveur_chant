var path_file_programme = null;

function open_pdf(path, el) {
    console.log("open_pdf");
    path = path.replaceAll("£","'");
    console.log(path);
    eventChangePDF(window.location.origin + "/pdf/" + encodeURI(path));

    var list_nav_button = document.getElementsByClassName("nav-button");
    for(var i=0; i<list_nav_button.length; i++) {
        list_nav_button[i].style.backgroundColor = "unset";
    }
    el.style.backgroundColor = "#c9bfff";
}

function eventChangePDF(url){
    console.log("eventChangePDF : " + url)
    var if1 = document.getElementById("pdf-js-viewer");
        var fc = (if1.contentWindow || if1.contentDocument);
        fc.document.dispatchEvent(new CustomEvent("changePDF", {
            detail: { file: url }
          }));
          console.log("ok event");
}

function init(path_file) {
    path_file_programme = path_file;
    var list_nav_button = document.getElementsByClassName("nav-button");
    var top = 16;
    for(var i=0; i<list_nav_button.length; i++) {
        var css = '.nav-button:nth-of-type('+(i+1)+'):hover {color: var(--navbar-dark-primary); color: var(--navbar-dark-primary); }.nav-button:nth-of-type('+(i+1)+'):hover ~ .nav-content-highlight {top: '+top+'px; }';
        var style = document.createElement('style');
        if (style.styleSheet) {
            style.styleSheet.cssText = css;
        } else {
            style.appendChild(document.createTextNode(css));
        }
        list_nav_button[i].appendChild(style);
        top += 54;
    }

    if(path_file == "example_messe.txt")example_version = true;
    document.addEventListener("ProgrammeReady", init_content_program);
    programme = new Programme({
        watchers: null,
        interval: 100,
        stopsame: 5,
        callback: null,
        intervalcallback: null
    });
    programme.Start(path_file);
    console.log(programme);
}

function init_content_program() {
    var content = "";
    var temp = lien_en_cours.split("/");
    var titre = "";
    if(temp.length>1) titre=temp[temp.length-2];
    for(var i=0; i<programme.chants.length; i++)
    {
      if(programme.chants[i].type == "partie") {
        content += '<hr><div class="nav-button nav-button-left" style="height:20px"><span>'+programme.chants[i].name+'</span></div>';
      }
      else {
        if(programme.chants[i].name == titre) {
            content += '<div class="nav-button nav-button-left" onclick="window.open(\''+window.location.origin+window.location.pathname+"?programme="+path_file_programme.replaceAll("'","%27")+"&lien="+programme.chants[i].path.replaceAll("'","%27")+'\',\'_self\');" style="color:#fff;background-color:#c9bfff;border-radius: 16px 0 0 16px;"><i class="fas fa-thumbtack"><img src = "../icons/music.png"></i><span>'+programme.chants[i].name.replaceAll("'","%27")+'</span></div>';
        }
        else {
            content += '<div class="nav-button nav-button-left" onclick="window.open(\''+window.location.origin+window.location.pathname+"?programme="+path_file_programme.replaceAll("'","%27")+"&lien="+programme.chants[i].path.replaceAll("'","%27")+'\',\'_self\');" style="color:#fff;border-radius: 16px 0 0 16px;"><i class="fas fa-thumbtack"><img src = "../icons/music.png"></i><span>'+programme.chants[i].name.replaceAll("'","%27")+'</span></div>';
        }
      }
      
    }
    document.getElementById("content-program").innerHTML = content;
    document.getElementById("name-program").innerHTML = programme.date + " à " + programme.lieu;
}


addEventListener("dblclick", (event) => { })
var timeoutDBClick;

ondblclick = (event) => {
    console.log("ondblclick");
    if(document.getElementById("nav-bar-left"))document.getElementById("nav-bar-left").style.visibility = "hidden";
    if(document.getElementById("nav-bar-right"))document.getElementById("nav-bar-right").style.visibility = "hidden";

    setTimeout(() => {
        if(document.getElementById("nav-bar-left"))document.getElementById("nav-bar-left").style.visibility = "visible";
        if(document.getElementById("nav-bar-right"))document.getElementById("nav-bar-right").style.visibility = "visible";
    }, 5000);
}

function horsligne() {
        $.ajax({
        url: "https://partitions.ovh/pdf/Cantiques/Ad majorem Dei gloriam/Ad majorem Dei gloriam.pdf",
        method: "get",
        xhrFields: {
            responseType: 'blob'
        },
        success: function( data ) {
            // create an object URL of the blob response.
            var url = window.URL.createObjectURL( data )

            eventChangePDF(encodeURI(url));

            // clean-up
            window.URL.revokeObjectURL( url );
        }
    })
}