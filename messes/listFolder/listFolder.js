/**********************             DOSSIERS               ******************************/
/**
 * Function lors de l'appuie sur un dossier
 * @param {*} nom : nom du répertoire
 */
function repertoire(nom){
    var info = nom.split("£");
    if(onFolder(info[0]) == false)return;
    click_on_programme = null;
    if(nom == "/£")
    {
        tousLesRepertoires();
        return;
    }
    console.log("repertoire : " + nom);
    console.log(dossier_ouvert);

    console.log("info0 : " + info[0]);
    var id = "#d£"+info[0];
    var path = decodage_path_javascript(info[0]);
    var hauteur = parseInt(info[1]);
    var name = path.split('/');
    console.log("suite");
    console.log(dossier_ouvert[0]);
    console.log(path);
	var appuie_sur_meme_dossier = meme_dossier(path);

    // on referme le dossier ouvert si besoin
    fermeture_ancien_dossier(hauteur);
    console.log("info : " + path);
    
	if(appuie_sur_meme_dossier == false) {
		console.log("appuie_sur_meme_dossier == false");
		var aff = display_link_folder(path, name[name.length-1], hauteur, true);
		dossier_ouvert.push({nom: name[name.length-1], path: path.replaceAll("'","¤"), hauteur: hauteur});
		console.log("encode uri : " + encodeURI(path).replaceAll("'","¤"));
        
		$.ajax({
			type: 'GET',
			url: window.location.origin + '/messes/listFolder/get_php/get_list.php', // "https://partoch.free.nf/messes/listFolder/"
            crossDomain: true,
			data: 'nom=' + encodeURI(path).replaceAll("'","¤"),
			contentType: "application/x-www-form-urlencoded;charset=ISO-8859-15",
			success: function(data){
				console.log("fichiers : " + data);
                $(id).html("");
				$(id).html(aff + aff_rep(data.split("£"),path+"/", hauteur+1));
			}
		});
	}
}

function update_folder()
{
    console.log("update_folder");
    path = dossier_ouvert[0].path;
    hauteur = dossier_ouvert[0].hauteur;
    var id = "#d£"+codage_path_javascript(path);
    var aff = display_link_folder(decodage_path_javascript(path), dossier_ouvert[0].nom, hauteur, true);

    $.ajax({
        type: 'GET',
        url: window.location.origin + '/messes/listFolder/get_php/get_list.php', // "https://partoch.free.nf/messes/listFolder/"
        crossDomain: true,
        data: 'nom=' + encodeURI(path).replaceAll("'","¤"),
        contentType: "application/x-www-form-urlencoded;charset=ISO-8859-15",
        success: function(data){
            console.log("fichiers : " + data);
            $(id).html("");
            $(id).html(aff + aff_rep(data.split("£"),path+"/", hauteur+1));
        }
    });
}

function clear_folders()
{
    $('#mesdossiers').html("");
}

function display_init()
{
    return '<div style="overflow-y: visible;">'; // + display_folder("","/",0);
}

function display_folder(path, name, hauteur)
{
    return '<div id="d£'+codage_path_javascript(path+name)+'">' + display_link_folder(path+name, name, hauteur, false) + '</div>';
}

function display_link_folder(path, name, hauteur, open)
{
    var icon_folder = window.location.origin + "/messes/icon/folder.png";
    var class_arrow = "arrow_close";
    if(open){
        icon_folder = window.location.origin + "/messes/icon/open-file.png";
        class_arrow = "arrow_open";
    }
    return '<a href=javascript:void(0); style="margin-left:'+hauteur*20+'px;color:black" onclick=repertoire(\''+codage_path_javascript(path)+"£"+hauteur+'\')><img src="'+window.location.origin+'/messes/icon/arrow.png" class="'+class_arrow+'"/><img src="'+icon_folder+'" class="std_icon"/>&nbsp;'+name+'</a>';
}

function display_file(path, name, hauteur)
{
    return '<div><a id="d£'+codage_path_javascript(path+name)+'" href=javascript:void(0); style="margin-left:'+hauteur*20+'px" onclick=click_programme("'+codage_path_javascript(path)+'","'+codage_path_javascript(name)+'")><img src="'+window.location.origin+'/messes/icon/doc.png" class="std_icon" style="margin-left:15px"/>&nbsp;'+name+'</a></div>';
}

function display_end()
{
    return "</div>";
}

function tousLesRepertoires(){
    clear_folders();
    $.ajax({
        type: 'GET',
        url: window.location.origin + '/messes/listFolder/get_php/get_list.php',
        crossDomain: true,
        contentType: "application/x-www-form-urlencoded;charset=ISO-8859-15",
        data: 'nom=',
        success: function(data){
            console.log("fichiers : " + data);
            $('#mesdossiers').append(display_init() + aff_rep(data.split("£"),"", 1) + display_end());
        }
    });
    dossier_ouvert = [];
}


/**
 * Code HTML pour ajouter un répertoire dans la liste
 * @param {*} liste : liste de tous les dossiers présents
 * @param {*} path : emplacement du répertoire
 * @param {*} hauteur : espace avec le bord (pour décaller avec les sous-dossiers)
 * @returns 
 */
function aff_rep(liste, path, hauteur){
    console.log(liste);
    var aff = "";
    for(var i=0; i<liste.length-1; i++){
        if('Â' == liste[i][liste[i].length-1])
    	    liste[i] = liste[i].slice(0,-1); // retirer le dernier caratère qui est : à majuscule (pourrait être amélioré pour que ce soit plus propre)
        console.log(liste[i]);
        if(liste[i][0] != '.')
        {
            if(liste[i].includes("."))
                aff += display_file(path, liste[i], hauteur);
            else
                aff += display_folder(path, liste[i], hauteur);
        }
    }
    return aff;
}

/**
 * Savoir si on rappuie sur le même dossier
 * @param {String} nom : nom du dossier à ouvrir
 * @returns 
 */
function meme_dossier(nom)
{
    if(dossier_ouvert.length > 0 && dossier_ouvert[0].path.replaceAll("¤","'") == nom.replaceAll("¤","'")) {	// on rappuie sur le même dossier
		return true;
	} else {
        return false;
    }
}

/**
 * Fermeture du précédent dossier
 * @param {int} hauteur 
 */
function fermeture_ancien_dossier(hauteur)
{
    if(dossier_ouvert.length > 0){
        for(var i=0; i<dossier_ouvert.length; i++){
            element = dossier_ouvert[i];
            if(element.hauteur >= hauteur){
                $("#d£"+codage_path_javascript(element.path)).html("");
                $("#d£"+codage_path_javascript(element.path)).html(display_link_folder(element.path.replaceAll("¤","'"), element.nom.replaceAll("§"," "), element.hauteur, false));
                var index = dossier_ouvert.indexOf(element);
                if (index > -1) {
                    dossier_ouvert.splice(index, 1);
                }
                i = i-1;
            }
        }
    }
}

/**
 * Permet d'éviter les conflits avec le javascript
 * @param {String} path 
 */
function codage_path_javascript(path)
{
    return path.replaceAll("/","°").replaceAll("\.","¨").replaceAll("'","¤").replaceAll(" ","§") // remplacement des caractères spéciaux pour éviter les problèmes avec le javascript
}

function decodage_path_javascript(path)
{
    return path.replaceAll("°","/").replaceAll("\"","\.").replaceAll("¨","\.").replaceAll("¤","'").replaceAll("§"," ")
}

//repertoire("debut");
/*
var dossier_ouvert = [{
    nom: "",
    path: "../../explo/",
    hauteur: 0,
}]*/



/************************                RESEARCH                ************************/
/*const search_bar = document.getElementById('search-user');

search_bar.addEventListener('change', research)

function research(evt)
{
    console.log("new value to research : " + evt.target.value);
}*/

var click_on_programme = null;
function click_programme(path, name)
{
    if(onFile(decodage_path_javascript(path), decodage_path_javascript(name)) == false)return;
    if(click_on_programme != null)
    {
        $("#d£"+click_on_programme.id).css('color', 'blue');
        $("#d£"+click_on_programme.id).css('font-weight', 'normal');
    }
    console.log(decodage_path_javascript(name));
    click_on_programme = {
        id: codage_path_javascript(path + name),
        path: decodage_path_javascript(path),
        name: decodage_path_javascript(name)
    }
    console.log(click_on_programme.name);
    $("#d£"+codage_path_javascript(path + name)).css('color', 'red');
    $("#d£"+codage_path_javascript(path + name)).css('font-weight', 'bold');
    path = decodage_path_javascript(path);
    name = decodage_path_javascript(name);
    console.log("path : " + path + ", name : " + name);
}