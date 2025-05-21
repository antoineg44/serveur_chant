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

function init() {
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
}