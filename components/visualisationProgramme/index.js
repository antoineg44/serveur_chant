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
    for(var i=0; i<programme.chants.length; i++)
    {
      if(programme.chants[i].type == "partie") {

      }
      else {
        //if(programme.chants[i].name == )
        //            echo '<div class="nav-button nav-button-left" onclick=\'open_pdf("'.$coded.'",this)\' style="background-color:#c9bfff;border-radius: 16px 0 0 16px;"><i class="fas fa-thumbtack"><img src = "../../messes/icon/pdf.png"></i><span>'.$f.'</span></div>';
        //          else
        content += '<div class="nav-button nav-button-left" onclick=\'open_pdf("'+'",this)\' style="border-radius: 16px 0 0 16px;"><i class="fas fa-thumbtack"><img src = "../../messes/icon/pdf.png"></i><span>'+programme.chants[i].name+'</span></div>';
      }
      
    }
    document.getElementById("content-program").innerHTML = content;
}