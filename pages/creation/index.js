
function initFormulaire()
{
    example_version = true;
  console.log("initFormulaire");
  console.log(programme.chants);
  var html_chants = "";
  for(var i=programme.chants.length-1; i>=0; i--)
  {
    if(programme.chants[i].type == "partie")
    {
        if(html_chants != "")html_chants = '<div class="nice-form-group" id="list_'+codage_path_javascript(programme.chants[i].name)+'">' + html_chants + '</div>';
      var code_html = add_section(programme.chants[i], html_chants);
      $('#description').after(code_html);
      $('#description_list').after(add_link_section(programme.chants[i].name));
      html_chants = "";
    }
    else
    {
      html_chants = add_chant(programme.chants[i]) + html_chants;
    }
    
  }
  if(html_chants != "") {
    // TO DO !!!
  }
}

function add_section(partie, chants) {
    return '<section id="part_'+codage_path_javascript(partie.name)+'">\
    <div class="href-target" id="'+codage_path_javascript(partie.name)+'_link"></div>\
    <div id="" onclick="" ondblclick="">\
        <div class="row">\
            <div class="column"><h1>\
                <div class="row"><div class="column"><img src="/components/icons/double_note.svg" style="height:1.4em">\
            </h1></div>\
            <div class="column part-column"><h1 id="h1_'+codage_path_javascript(partie.name)+'">'+partie.name+'</h1></div>\
            <div class="column"><img src="/components/icons/edit.png"\
                    style="height:1.2em;right:0px;margin-right:16px" onclick="modify_part(this)"></div>\
            <div class="column"><img src="/components/icons/delete.png"\
                    style="height:1.2em;right:0px;margin-right:8px" onclick="delete_part(this)"></div>\
            <div class="column" style="margin-left:10px"><img src="/components/icons/up-arrow.png"\
                    style="height:1.2em;right:0px;margin-right:8px" onclick="move_up_part(this)"></div>\
            <div class="column" style="margin-left:10px"><img src="/components/icons/down-arrow.png"\
                    style="height:1.2em;right:0px;margin-right:8px" onclick="move_down_part(this)"></div>\
        </div>\
    </div>\
    <div id="doc_'+codage_path_javascript(partie.name)+'">\
        '+chants+'<!-- Chants here -->\
    </div>\
    <details>\
        <summary>\
            <div class="toggle-code" onclick="add_new_chant(this)">+ Ajouter un chant en plus</div>\
            <div class="toggle-code" onclick="add_new_part(this)">\
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-code">\
                    <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />\
                </svg>Ajouter une partie ci-dessous</div>\
        </summary>\
    </details>\
</section>';
}

function add_link_section(name) {   // For the navigation
    return '<li id="link_'+codage_path_javascript(name)+'">\
    <a href="#'+codage_path_javascript(name)+'_link">\
        <img src="/components/icons/double_note.svg" style="height: 1.25em;width: 1.25em;margin-right: 1em;">\
        '+name+'</a>\
    </li>';
}

function link_section(name) {
    return '<a href="#'+codage_path_javascript(name)+'_link">\
        <img src="/components/icons/double_note.svg" style="height: 1.25em;width: 1.25em;margin-right: 1em;">\
        '+name+'</a>';
}

function add_chant(chant) {
    return '<span id="chant_'+codage_path_javascript(chant.name)+'"><div class="row">\
            <div class="column"><h1>\
                <div class="row"><div class="column"><img src="/components/icons/pdf.png" style="height:1em">\
            </h1></div>\
            <div class="column part-column"><h1>'+chant.name+'</h1></div>\
            <!--<div class="column"><img src="/components/icons/edit.png"\
                    style="height:1.2em;right:0px;margin-right:16px" onclick="modify_chant(this)"></div>-->\
            <div class="column"><img src="/components/icons/delete.png"\
                    style="height:1.2em;right:0px;margin-right:8px" onclick="delete_chant(this)"></div>\
            <!--<div class="column" style="margin-left:10px"><img src="/components/icons/up-arrow.png"\
                    style="height:1.2em;right:0px;margin-right:8px" onclick="move_up_chant(this)"></div>\
            <div class="column" style="margin-left:10px"><img src="/components/icons/down-arrow.png"\
                    style="height:1.2em;right:0px;margin-right:8px" onclick="move_down_chant(this)"></div>-->\
        </div>\
        <label>Url du chant</label>\
        <div class="nice-form-group acWrap"><input type="url" placeholder="/type/chant... (ex: cantique/chantez avec moi/)" value="'+chant.path+'" id="dName" class="icon-left" />\
        <script>\
            ac.attach({\
                target: document.getElementById("dName"),\
                data: "../../components/autocomplete/autocomplete_path.php"\
            });\
        </script></div></span>';
}


// Manage ID
function codage_path_javascript(path)
{
    return path.replaceAll(",","µ").replaceAll("/","°").replaceAll("\.","¨").replaceAll("'","¤").replaceAll(" ","§") // remplacement des caractères spéciaux pour éviter les problèmes avec le javascript
}

function decodage_path_javascript(path)
{
    return path.replaceAll("µ",",").replaceAll("°","/").replaceAll("¨","\.").replaceAll("¤","'").replaceAll("§"," ")
}

// Action
function delete_part(element) {
    var id_part = element.closest("section").id.slice(5);
    console.log("delete_part");
    document.getElementById("part_"+id_part).remove();
    document.getElementById("link_"+id_part).remove();
    programme.deletePart(decodage_path_javascript(id_part));
}
function delete_chant(element) {
    console.log("delete_chant");
    var id_part = element.closest("span").remove();
    programme.deletePart(decodage_path_javascript(element.closest("span").id.slice(6)));
}
function move_up_part(element) {
    var id_part = element.closest("section").id.slice(5);
    console.log("move_up_part");
    var part_before = programme.getPreviousPart(decodage_path_javascript(id_part));
    console.log("before : " + part_before);
    if(part_before != null){
        document.querySelector('#part_' + part_before).before(document.querySelector('#part_' + id_part));
        document.querySelector('#link_' + part_before).before(document.querySelector('#link_' + id_part));
        programme.echange2(decodage_path_javascript(id_part), "partie", null, part_before, "partie", null);
    }
}
/*function move_up_chant(element) {
    var id_part = element.closest("span").id.slice(5);
    console.log("move_up_part");
    var part_before = programme.getPreviousPart(decodage_path_javascript(id_part));
    console.log("before : " + part_before);
    if(part_before != null){
        document.querySelector('#part_' + part_before).before(document.querySelector('#part_' + id_part));
        document.querySelector('#link_' + part_before).before(document.querySelector('#link_' + id_part));
        programme.echange2(decodage_path_javascript(id_part), "partie", null, part_before, "partie", null);
    }
}*/
function move_down_part(element) {
    var id_part = element.closest("section").id.slice(5);
    console.log("move_down_part");
    var part_after = programme.getNextPart(decodage_path_javascript(id_part));
    console.log("After : " + part_after);
    if(part_after != null) {
        document.querySelector('#part_' + part_after).after(document.querySelector('#part_' + id_part));
        document.querySelector('#link_' + part_after).after(document.querySelector('#link_' + id_part));
        programme.echange2(decodage_path_javascript(id_part), "partie", null, part_after, "partie", null);
    }
}
function add_new_chant(element) {
    var id_part = element.closest("section").id.slice(5);
    console.log("add_new_chant");
    var chant = {'name': 'nouveau chant', "type" : "chant", "path": null};
    //let parser = new DOMParser();
    //let doc = parser.parseFromString(add_chant(chant), 'text/html');
    if(document.getElementById("doc_"+id_part)) {
        document.getElementById("list_"+id_part).innerHTML += add_chant(chant);
    }
    else {
        document.getElementById("doc_"+id_part).innerHTML = '<div class="nice-form-group" id="list_'+id_part+'">' + add_chant(chant) + '</div>';
    }

}
function add_new_part(element) {
    console.log("add_new_part");
    var id_part = element.closest("section").id.slice(5);
    if(programme.addPart('nouvelle partie') == null) {
        alert("Une nouvelle partie à déjà été créé");
        return;
    }
    var partie = {'name': 'nouvelle partie', "partie" : "chant", "path": null};
    let parser = new DOMParser();
    let doc = parser.parseFromString(add_section(partie, ""), 'text/html');
    let nav = parser.parseFromString(add_link_section('nouvelle partie'), 'text/html');
    document.querySelector('#part_' + id_part).after(doc.body.firstChild);
    document.querySelector('#link_' + id_part).after(nav.body.firstChild);
}
function modify_part(element) {
    console.log("modify_part");
    var id_part = element.closest("section").id.slice(5);
    var name_part = prompt("Changer de nom :", decodage_path_javascript(id_part));
    if(name_part == null || name_part == "" || name_part == decodage_path_javascript(id_part))return null;
    if(programme.find(name_part, "partie", null) != null) {
        alert("le nom existe déjà");
        return;
    }
    programme.modifyPart(decodage_path_javascript(id_part), name_part);
    document.getElementById("h1_"+id_part).innerHTML = name_part;
    document.getElementById("link_"+id_part).innerHTML = link_section(name_part);
    document.getElementById("h1_"+id_part).id = "h1_"+codage_path_javascript(name_part);
    document.getElementById("doc_"+id_part).id = "doc_"+codage_path_javascript(name_part);
    document.getElementById("link_"+id_part).id = "link_"+codage_path_javascript(name_part);
    document.getElementById(id_part+"_link").id = codage_path_javascript(name_part);+"_link";
    document.getElementById("part_"+id_part).id = "part_"+codage_path_javascript(name_part);

}
var testing = null;
function modify_chant(element) {
    console.log("modify_chant");
    console.log(element);
    testing = element;
}
