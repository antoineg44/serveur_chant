var on_copy_list = false;
var on_add_list = false;

function action(source) {
    console.log("appuie : " + source);
    if(on_copy_list)$("#btn-list-copy").css('background-color', '#f0f0f0');
    switch(source)
    {
        case 'btn-list-copy': copy_list(); break;
        case 'btn-list-delete': delete_list(); break;
        case 'btn-list-paroisse': paroisse_list(); break;
        case 'btn-list-add': add_list(); break;
        case 'btn-list-modify': modify_list(); break;
        case 'btn-list-download': download_list(); break;
        case 'btn-prog-save': save_prog(); break;
        case 'btn-prog-copy': break;    // commented
        case 'btn-prog-delete': delete_prog(); break;
        case 'btn-prog-add': add_prog(); break;
        case 'btn-prog-modify': modify_prog(); break;
        case 'btn-prog-download': download_prog(); break;
        default: break;
    }
}

/*****************************          part file and folder           *********************/
function copy_list()
{
    if(click_on_programme == null)
    {
        alert("Aucun programme de sélectionné");
        return;
    }
    if(on_copy_list)
    {
        stop_copy_mode();
    }
    else
    {
        $("#btn-list-copy").css('background-color', 'green');
        alert("Cliquer sur une paroisse");
        on_copy_list = true;
    }
}

function stop_copy_mode()
{
    $("#btn-list-copy").css('background-color', '#f0f0f0');
    on_copy_list = false;
}

function delete_list()
{
    if(click_on_programme == null)
    {
        alert("Aucun programme de sélectionné");
        return;
    }
    console.log(click_on_programme.path + click_on_programme.name);
    if(confirm("Voulez-vous vraiment supprimer ce programme: " + click_on_programme.path + click_on_programme.name + " ?"))
    {
        $.ajax({
            type: 'GET',
            url: window.location.origin + '/php/suppression.php',
            crossDomain: true,
            data: 'lien=programmes/' + click_on_programme.path + click_on_programme.name + "&insert=false&auteur=web",
            contentType: "application/x-www-form-urlencoded;charset=ISO-8859-15",
            success: function(data){
                console.log("fichiers : " + data);
                if(!data.includes("success"))
                {
                    alert("Erreur de changement de nom sur le serveur");
                }
                update_folder();
                
            }
        });
    }
}

function paroisse_list()
{
    var paroisse = prompt('Nom de la nouvelle paroisse :', "");
    if(paroisse == null || paroisse == "")return null;

    $.ajax({
        type: 'GET',
        url: window.location.origin + '/php/nouveau_dossier.php',
        crossDomain: true,
        data: 'path=programmes/' + paroisse + "&create=true&auteur=web",
        contentType: "application/x-www-form-urlencoded;charset=ISO-8859-15",
        success: function(data){
            console.log("fichiers : " + data);
            if(!data.includes("success"))
            {
                alert("Erreur de changement de nom sur le serveur");
            }
            else
            {
                window.location.reload();
            }
        }
    });
}

function add_list()
{
    if(on_add_list)
    {
        on_add_list = false;
        stop_add_mode();
    }
    else
    {
        $("#btn-list-add").css('background-color', 'green');
        alert("Cliquer sur une paroisse");
        on_add_list = true;
    }
}

function stop_add_mode()
{
    $("#btn-list-add").css('background-color', '#f0f0f0');
    on_add_list = false;
}

function prompt_add()
{
    var prog_date = prompt('Ajoutez la date de la messe (format : YYYY-MM-dd) :', "");
    if(prog_date == null || prog_date == "" || !prog_date.split('-').length == 3)return null;

    var prog_lieu = prompt('Veuillez saisir le lieu de la messe :', "");
    if(prog_lieu == null || prog_lieu == "")return null;

    var prog_occasion = prompt('Veuillez saisir à quelle occasion :', "");
    if(prog_occasion == null || prog_occasion == "")return null;

    return prog_date + "_" + prog_lieu + "_" + prog_occasion + ".json";
}

function modify_list()      // rename
{
    if(click_on_programme == null)
    {
        alert("Aucun programme de sélectionné");
        return;
    }
    console.log(click_on_programme.name);
    var new_name = prompt('Nouveau nom :', click_on_programme.name);
    if(new_name == null)return; // Cancel
    if(new_name == "")
    {
        alert("Erreur dans les informations saisies");
        return;
    }
    console.log(click_on_programme.path + "/" + click_on_programme.name);
    console.log(new_name);
    $.ajax({
        type: 'GET',
        url: window.location.origin + '/php/renommer.php',
        crossDomain: true,
        data: 'old_link=programmes/' + click_on_programme.path + click_on_programme.name + "&new_link=programmes/" + click_on_programme.path + new_name + "&insert=false&auteur=web",
        contentType: "application/x-www-form-urlencoded;charset=ISO-8859-15",
        success: function(data){
            console.log("fichiers : " + data);
            if(!data.includes("success"))
            {
                alert("Erreur de changement de nom sur le serveur");
            }
            update_folder();
            
        }
    });
}

function download_list()
{
    
    if(click_on_programme == null)
    {
        alert("Aucun programme de sélectionné");
        return;
    }
    var text_export = programme.export();
    console.log(text_export);
    if (text_export.length) {
        // 2. On copie le texte dans le presse-papier
        navigator.clipboard.writeText(text_export).then(() => {
            // 3. On affiche l'alert
            alert("Texte copié !")
        })
    }
}

/**
 * INPUT From listFolder !
 * @param {*} nom 
 * @returns 
 */
function onFolder(nom)
{
    // Copier un programme :
    if(click_on_programme != null && on_copy_list)
    {
        var prog_name = prompt_add();
        if(prog_name == null)
        {
            alert("Erreur dans les informations saisies");
        }
        else
        {
            console.log("old : " + click_on_programme.path + click_on_programme.name);
            console.log("new : " + decodage_path_javascript(nom) + "/" + prog_name);

            // TODO: urgent: error here !!!
            /*var temp = prog_name.split("_");

            var date = programme.date;
            var lieu = programme.lieu;
            var occasion = programme.occasion;
            var path_file = programme.path_file;

            init(window.location.origin + "/pdf/programmes/" + click_on_programme.path + click_on_programme.name, ".");*/
            $.ajax({
                type: 'GET',
                url: window.location.origin + '/php/copy.php',
                crossDomain: true,
                data: 'old_link=programmes/' + click_on_programme.path + click_on_programme.name + "&new_link=programmes/" + decodage_path_javascript(nom) + "/" + prog_name + "&insert=false&auteur=web",
                contentType: "application/x-www-form-urlencoded;charset=ISO-8859-15",
                success: function(data){
                    console.log("fichiers : " + data);
                    if(!data.includes("success"))
                    {
                        alert("Erreur lors de la copie sur le serveur");
                    }
                    else 
                    {
                        update_folder();
                        alert("Nouveau programme ajouté"); 
                    }
                    stop_copy_mode();          
                }
            });

        }
        return false;
    }
    // Ajouter un nouveau programme
    else if(on_add_list)
    {
        var prog_name = prompt_add();
        if(prog_name == null)
        {
            alert("Erreur dans les informations saisies");
        }
        else
        {
            console.log("new : " + decodage_path_javascript(nom) + "/" + prog_name);
            $.ajax({
                type: 'GET',
                url: window.location.origin + '/php/copy.php',
                crossDomain: true,
                data: 'old_link=programmes/' + "Templates/" + "template_messe.json" + "&new_link=programmes/" + decodage_path_javascript(nom) + "/" + prog_name + "&insert=false&auteur=web",
                contentType: "application/x-www-form-urlencoded;charset=ISO-8859-15",
                success: function(data){
                    console.log("fichiers : " + data);
                    if(!data.includes("success"))
                    {
                        alert("Erreur lors de la copie sur le serveur");
                    }
                    else 
                    {
                        update_folder();
                        alert("Nouveau programme ajouté"); 
                    }
                    stop_add_mode();        
                }
            });
        }
    }
    else return true;
}

/**
 * INPUT From listFolder !
 * @param {*} path 
 * @param {*} name 
 * @returns 
 */
function onFile(path, name)
{
    console.log(path);
    console.log(name);
    init(window.location.origin + "/pdf/programmes/" + path + name, ".");
    resetModif();
    return true;
}



/*****************************          part programme           *********************/
function modify_prog()
{
    if(actual_line_selected!= null && !actual_line_selected.includes("\."))
    {
        modify_part(actual_line_selected);
        onModif();
    }
}

function delete_prog()
{
    if(actual_line_selected != null) {
        delete_part(actual_line_selected);
        programme.deletePart(decodage_path_javascript(actual_line_selected));
        onModif();
    }
    else alert("Rien de sélectionné");
    actual_line_selected = null;
}

function add_prog()
{
    var new_part = prompt("Pour ajouter un nouveau chant : ajouter l'url.\nPour une nouvelle partie : insérer le nom", "");
    if(new_part == null || new_part == "")return null;
    if(new_part.includes("/"))
    {
        if(new_part.includes(window.location.origin + "/pdf/"))
        {
            new_part = decodeURI(new_part);
            var path = new_part.split(window.location.origin + "/pdf/")[1];
            var extension = path.split(".");
            if(extension.length == 2 && extension[1] == "pdf")
            {
                var link = extension[0].split("/");
                var name = link[link.length-1];
                if(link.length == 3)
                    name = link[1];
                $('#sortable').append(add_pdf(name, path));
                programme.addPdf(name, path);
                onModif();
            }
            else alert("Fichier non valide");
        }
        else
            alert("Url non valide");
    }
    else
    {
        $('#sortable').append(add_part(new_part));
        programme.addPart(new_part);
        onModif();
    }
}

function save_prog()
{
    console.log(programme.save());
    //console.log(JSON.parse(programme.save()));
    var currentdate = new Date(); 
    var lastModif = "" + currentdate.getFullYear()
                 + (currentdate.getMonth()+1).toString().padStart(2, '0')
                 + currentdate.getDate().toString().padStart(2, '0')
                 + currentdate.getHours().toString().padStart(2, '0')
                 + currentdate.getMinutes().toString().padStart(2, '0')
                 +  currentdate.getSeconds().toString().padStart(2, '0');

    $.ajax({
        type: 'GET',
        url: window.location.origin + '/php/programme/update.php',
        crossDomain: true,
        data: 'data=' + programme.save() + "&dateModif=" + lastModif,
        contentType: "application/x-www-form-urlencoded;charset=ISO-8859-15",
        success: function(data){
            console.log("fichiers : " + data);
            if(!data.includes("success"))
            {
                
            }            
        }
    });
}

function download_prog()
{
    console.log("download_prog");
    for(var i=0; i<programme.chants.length; i++)
    {
        if(programme.chants[i].type != "partie"){
            download(window.location.origin + "/pdf/" +programme.chants[i].path);
        }
    }
}

function download(url)
{
    console.log("download : " + url);
    var filename = url.split("/");
    fetch(url)
    .then(response => response.blob())
    .then(blob => {
      // Create a link element
      const link = document.createElement('a');
      // Set link's href to point to the blob URL
      link.href = window.URL.createObjectURL(blob);
      link.download = filename[filename.length-1];
      // Append link to the body
      document.body.appendChild(link);
      // Dispatch click event on the link
      // This is what triggers the download
      link.click();
      // Clean up by removing the link
      document.body.removeChild(link);
    })
    .catch(e => console.error('Something went wrong!', e));
}

function onModif()
{
    console.log("Modifications sur le programme");
    $("#btn-prog-save").css('background-color', '#f0f0f0');
}

function resetModif()
{
    console.log("Reset modifications sur le programme");
    $("#btn-prog-save").css('background-color', '#757575');
}

function share_prog()
{
    if(click_on_programme == null)
    {
        alert("Aucun programme de sélectionné");
        return;
    }
    text_export = window.location.origin + "/messes/index.php?_pathfile=" + window.location.origin + '/pdf/programmes/' + click_on_programme.path + click_on_programme.name;
    navigator.clipboard.writeText(text_export).then(() => {
            // 3. On affiche l'alert
            alert("Texte copié :" + text_export);
    })
}
