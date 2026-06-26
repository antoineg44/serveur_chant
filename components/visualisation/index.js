
function open_pdf(path, el) {
    console.log('[pdf-debug] iframe open_pdf', { path: path });
    path = path.replaceAll("£","'");
    console.log('[pdf-debug] iframe normalized path', { path: path });
    var new_path = "/pdf/" +path;
    var full_url = window.location.origin + encodeURI(new_path.replace("//", "/"));

    var payload = {
        type: "pdfSelectionChanged",
        path: new_path.replace("//", "/"),
        url: full_url
    };

    try {
        if (window.parent && typeof window.parent.updateCurrentChantPath === 'function') {
            console.log('[pdf-debug] calling parent updateCurrentChantPath', payload);
            window.parent.updateCurrentChantPath(payload.path, payload.url);
        } else {
            console.log('[pdf-debug] parent updateCurrentChantPath not available');
        }
    } catch (e) {
        console.log("Unable to call parent updateCurrentChantPath", e);
    }

    // Notify listeners in the parent page and in the current iframe window.
    console.log('[pdf-debug] posting message to parent', payload);
    window.parent.postMessage(payload, window.location.origin);
    window.dispatchEvent(new CustomEvent("pdfPathChanged", {
        detail: payload
    }));

    eventChangePDF(full_url);

    var list_nav_button = document.getElementsByClassName("nav-button");
    for(var i=0; i<list_nav_button.length; i++) {
        list_nav_button[i].style.backgroundColor = "unset";
    }
    el.style.backgroundColor = "#c9bfff";
}

function eventChangePDF(url){
    console.log('[pdf-debug] eventChangePDF', { url: url });
    window.parent.postMessage({ url: decodeURI(url) }, window.location.origin);
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
        var css = '.nav-button:nth-of-type('+(i+1)+'):hover {color: var(--navbar-dark-primary); color: var(--navbar-dark-primary); }.nav-button:nth-of-type('+(i+1)+'):hover ~ #nav-content-highlight {top: '+top+'px; }';
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