function open_pdf(path) {
    console.log("open_pdf");
    console.log(path);
    eventChangePDF(window.location.origin + "/pdf/" + path);

}

function eventChangePDF(url){
    var if1 = document.getElementById("pdf-js-viewer");
        var fc = (if1.contentWindow || if1.contentDocument);
        fc.document.dispatchEvent(new CustomEvent("changePDF", {
            detail: { file: url }
          }));
          console.log("ok event");
}