
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
        if(html_chants != "")html_chants = '<div class="nice-form-group">' + html_chants + '</div>';
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
            <div class="column part-column"><h1>'+partie.name+'</h1></div>\
            <div class="column"><img src="/components/icons/edit.png"\
                    style="height:1.2em;right:0px;margin-right:16px" onclick=""></div>\
            <div class="column"><img src="/components/icons/delete.png"\
                    style="height:1.2em;right:0px;margin-right:8px" onclick="delete_part(\''+codage_path_javascript(partie.name)+'\')"></div>\
            <div class="column" style="margin-left:10px"><img src="/components/icons/up-arrow.png"\
                    style="height:1.2em;right:0px;margin-right:8px" onclick="move_up_part(\''+codage_path_javascript(partie.name)+'\')"></div>\
            <div class="column" style="margin-left:10px"><img src="/components/icons/down-arrow.png"\
                    style="height:1.2em;right:0px;margin-right:8px" onclick="move_down_part(\''+codage_path_javascript(partie.name)+'\')"></div>\
        </div>\
    </div>\
    <div id="list_'+codage_path_javascript(partie.name)+'">\
        '+chants+'<!-- Chants here -->\
    </div>\
    <details>\
        <summary>\
            <div class="toggle-code" onclick="add_new_chant(\''+codage_path_javascript(partie.name)+'\')">+ Ajouter un chant en plus</div>\
            <div class="toggle-code" onclick="add_new_part(\''+codage_path_javascript(partie.name)+'\')">\
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

function add_chant(chant) {
    return '<h1 class="chant_title">'+chant.name+'</h1>\
        <label>Url du chant</label>\
        <input type="url" placeholder="/type/chant... (ex: cantique/chantez avec moi/)" value="'+chant.path+'" id="dName" class="icon-left" />\
        <script>\
            ac.attach({\
                target: document.getElementById("dName"),\
                data: "../../components/autocomplete/autocomplete_path.php"\
            });\
        </script>';
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
function delete_part(id_part) {
    console.log("delete_part");
    document.getElementById("part_"+id_part).remove();
    document.getElementById("link_"+id_part).remove();
    programme.deletePart(decodage_path_javascript(id_part));
}
function move_up_part(id_part) {
    console.log("move_up_part");
    var part_before = programme.getPreviousPart(decodage_path_javascript(id_part));
    console.log("before : " + part_before);
    if(part_before != null){
        document.querySelector('#part_' + part_before).before(document.querySelector('#part_' + id_part));
        document.querySelector('#link_' + part_before).before(document.querySelector('#link_' + id_part));
        programme.echange2(decodage_path_javascript(id_part), "partie", null, part_before, "partie", null);
    }
}
function move_down_part(id_part) {
    console.log("move_down_part");
    var part_after = programme.getNextPart(decodage_path_javascript(id_part));
    console.log("After : " + part_after);
    if(part_after != null) {
        document.querySelector('#part_' + part_after).after(document.querySelector('#part_' + id_part));
        document.querySelector('#link_' + part_after).after(document.querySelector('#link_' + id_part));
        programme.echange2(decodage_path_javascript(id_part), "partie", null, part_after, "partie", null);
    }
}
function add_new_chant(id_part){
    var chant = {'name': 'nouveau chant', "type" : "chant", "path": null};
    //let parser = new DOMParser();
    //let doc = parser.parseFromString(add_chant(chant), 'text/html');
    document.getElementById("list_"+id_part).append = add_chant(chant);

}
function add_new_part(id_part) {
    document.querySelector('#part_' + part_after).after(document.querySelector('#part_' + id_part));
}
