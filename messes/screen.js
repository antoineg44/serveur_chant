
// Connaître l'appareil utilisé :
let smarphone = false;
// Récupère la chaîne userAgent du navigateur
const userAgent = navigator.userAgent.toLowerCase();

// Vérifie si la chaîne userAgent contient des mots-clés spécifiques aux smartphones
if (userAgent.includes('iphone') || userAgent.includes('android') || userAgent.includes('mobile')) {
    smarphone = true;  // L'utilisateur utilise un smartphone
}

console.log("Utilisation d'un smartphone: " + smarphone);

if(smarphone)
{
    document.getElementById("body").style.fontSize="2.7em";
    document.getElementById("block_program").style.visibility="hidden";
    document.getElementById("block_liste").style.width="100%";
    document.body.style.zoom = 1.2;
    var bouton = document.getElementsByClassName('but');
    for (let index = 0; index < bouton.length; index++) {
        // Ajoute une classe pour augmenter la taille du bouton
        console.log(bouton[index]);
        bouton[index].classList.add('but-big');
    }
}

etat_fenetre = 1;
function redimensionner() {

    if(document.getElementById("block_program").style.visibility == "hidden")
    {
        document.getElementById("block_program").style.visibility = "visible";
        document.getElementById("block_liste").style.width="0px";
        document.getElementById("back-button").style.left="5px";
        document.getElementById("back-button").style.right="unset";
        document.getElementById("back-button").innerHTML = "Ouvrir &rarr;";
    }
    else {
        document.getElementById("block_program").style.visibility = "hidden";
        document.getElementById("block_liste").style.width="100%";
        document.getElementById("back-button").style.left="unset";
        document.getElementById("back-button").style.right="5px";
        document.getElementById("back-button").innerHTML = "&larr; Cacher";
    }

}