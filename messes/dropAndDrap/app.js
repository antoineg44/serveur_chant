var programme = null;
var example_version = false;

var Programme = function(options) 
{
  if (!(this instanceof Programme))  return new Programme(options);

  var initialize = null;
  var $this = this;
  var path_file = null;
  var date = null;
  var lieu = null;
  var occasion = null;
  var paroisse = null;
  var dateLastModif = null;
  var description = null;
  var chants = null;

  var defaults = {
    watchers: [],
    interval: 50,
    stopsame: 1,

    callback: null,
    intervalcallback: null
  };

  $this.settings = Object.assign({}, defaults, options);

  $this.decript = function(all_text)
  {
    var temp = $this.path_file.split(".");
    var extension = temp[temp.length-1];
    if(extension.localeCompare("json") == 0)
    {
      var obj = JSON.parse(all_text);
      this.date = obj.date;
      this.lieu = obj.lieu;
      this.occasion = obj.occasion;
      this.dateLastModif = obj.dateLastModif;
      this.description = obj.description;
      this.chants = obj.chants;
      console.log($this.chants);
      let EndEvent = new Event('ProgrammeReady');
      document.dispatchEvent(EndEvent);
      return;
    }
    text = all_text.split("\r\n");

    // verification des données en entrée
    if(text.length < 2) {
      text = all_text.split("\n");
      if(text.length < 2) {
        console.error("Le fichier : " + $this.path_file + " est vide.")
        return null;
      }
    }

    // infos en entêtes
    var infos = text[0].split("Â£");
    if(infos.length != 3) {
      infos = text[0].split("£");
      if(infos.length != 3) {
        console.error("La description : " + text[0] + " est mauvaise.")
        //return null;
      }
    }

    if(infos.length == 3) {
      $this.date = infos[0];
      $this.lieu = infos[1];
      $this.occasion = infos[2];
    } else {
      $this.date = "inconnue";
      $this.lieu = "inconnue";
      $this.occasion = "inconnue";
    }

    // date de dernière modification
    if(text[1] != "")$this.dateLastModif = text[1];

    var i = 1;

    // description
    $this.description = "";
    if(text[2] != "" && text[2].includes("description"))
    {
      var data = text[2].split(" = ");
      if(data.length == 2)
        $this.description = data[1];
      i++;
    }

    $this.chants = [];
    while(i < text.length)
    {
      i++;
      console.log(i+": " + text[i]);
      var ligne = text[i];
      if(ligne && ligne.length > 1)
      {
        if(ligne[0] == '[' && ligne.indexOf("]"))
        {
          $this.addPart(ligne.substring(1,ligne.indexOf(']')));
        }
        else if(ligne[0] == '#')
        {
          var path = "";
          if(i+1 < text.length && text[i+1].length > 8 && text[i+1].substring(0, 6) == "path =")
          {
            i++;
            path = text[i].substring(7);
          }
          $this.addPdf(ligne.substring(1), path);
        }
      }
    }
    console.log($this.chants);
    let EndEvent = new Event('ProgrammeReady');
    document.dispatchEvent(EndEvent);
  }

  $this.addPart = function(name)
  {
    var part = {
      "type" : "partie",
      "name" : name
    };
    $this.chants.push(part);
  }

  $this.addPdf = function(name, path)
  {
    var part = {
      "type" : "chant",
      "name" : name,
      "path" : path
    };
    $this.chants.push(part);
  }

  $this.echange = function(target_name, target_type, path, next, next_type, next_path)
  {
    console.log("echange: " + target_name);
    console.log(path);
    console.log(next_path);
    var find = null;
    for(var i=0; i<programme.chants.length; i++)
    {
      if(programme.chants[i].name == target_name && programme.chants[i].type == target_type && (programme.chants[i].type == "partie" || programme.chants[i].name+programme.chants[i].path == path)) {
        find = programme.chants[i];
        programme.chants.splice(i, 1);
        break;
      }
    }
    if(find == null)
    {
      alert("Erreur, élément non trouvé : " + target_name);
      console.log("name : " + target_name);
      console.log(programme.chants);
      return;
    }
    console.log(find);
    if(next == null)
    {
      programme.chants.push(find);
    }
    else {
      for(var i=0; i<programme.chants.length; i++)
      {
        if(programme.chants[i].name == next && programme.chants[i].type == next_type && (programme.chants[i].type == "partie" || programme.chants[i].name+programme.chants[i].path == next_path)) {
          programme.chants.splice(i, 0, find);
          break;
        }
      }
    }
    console.log("resultat :");
    console.log(programme.chants);
    if(example_version == false)onModif();
  }

  $this.deletePart = function(name)
  {
    console.log("delete: " + name);
    var find = false;
    for(var i=0; i<programme.chants.length; i++)
    {
      if(programme.chants[i].name == name) {
        programme.chants.splice(i, 1);
        find = true;
        break;
      }
    }
    if(find == false)
    {
      alert("Erreur, élément non trouvé : " + name);
      console.log("name : " + name);
      console.log(programme.chants);
    }
    return find;
  }

  $this.modifyPart = function(old_name, new_name)
  {
    console.log("rename: " + old_name + " to " + new_name);
    for(var i=0; i<programme.chants.length; i++)
    {
      if(programme.chants[i].name == old_name)programme.chants[i].name = new_name;
    }
    onModif();
  }

  $this.readFile = function(path_file)
  {
    fetch(path_file)
    .then((res) => res.text())
    .then((text) => {
      // do something with "text"
      console.log("read :");
      console.log(text);
      $this.decript(text);
    })
    .catch((e) => console.error(e));
  }

  $this.save = function()
  {
    return JSON.stringify({
      path_file: $this.path_file,
      date: $this.date,
      lieu: $this.lieu,
      occasion: $this.occasion,
      paroisse: $this.paroisse,
      dateLastModif: $this.dateLastModif,
      description: $this.description,
      chants: $this.chants,
    });
  }

  $this.export = function()
  {
    var text = "";
    text += "Date : " + $this.date + "\n";
    text += "Lieu : " + $this.lieu + "\n";
    text += "Occasion : " + $this.occasion + "\n";
    text += "Paroisse : " + $this.paroisse + "\n\n";
    text += "Description : " + $this.description + "\n\n";
    for(var i=0; i<$this.chants.length; i++)
    {
      if($this.chants[i].type == "partie")
        text += $this.chants[i].name + " :\n";
      else
        text += " - " + $this.chants[i].name + " (" + window.location.origin + "/pdf/" + $this.chants[i].path.replaceAll(" ", "%20") + ")\n";
    }
    text += "\nLien vers le programme : " + $this.path_file.replaceAll(" ", "%20") + "\n";
    return text;
  }

  // Public functions.

  $this.Start = function(path_file) 
  {
    if (!initialize)
    {
      $this.path_file = path_file;
      var data = path_file.split("/");
      if(data.length >= 2)
        $this.paroisse = data[data.length-2];
      $this.readFile(path_file);
      initialize = true;
    }
  };

  $this.Stop = function() 
  {
    if (initialize)
    {

      initialize = null;
    }
  };

  $this.Destroy = function() 
  {
    $this.Stop();

    $this = null;
  }
};

function open_pdf(path)
{
  path = decodage_path_javascript(path);
	console.log("open pdf: " + path);
  //var path = null;
  /*for(var i=0; i<programme.chants.length; i++)
  {
    if(programme.chants[i].name == name)path = programme.chants[i].path;
  }
  if(path != null)
  {*/
    console.log("open : " + window.location.origin + "/components/visualisation/?lien=" + path);
    window.open(window.location.origin + "/components/visualisation/?lien=" + path);
  /*}
  else
  {
    console.error("path null for " + name);
  }*/
}

function initDropAndDrap()
{
  console.log("initDropAndDrap");
  console.log(programme.chants);
  $('#sortable').html("");
  for(var i=0; i<programme.chants.length; i++)
  {
    if(programme.chants[i].type == "partie")
    {
      var code_html = add_part(programme.chants[i].name);
      $('#sortable').append(code_html);
    }
    else
    {
      var code_html = add_pdf(programme.chants[i].name, programme.chants[i].path);
      $('#sortable').append(code_html);
    }
    
  }
  actual_line_selected = null;
  initDoubleClick();
}

function add_part(name)
{
  return '<div id="line_' + codage_path_javascript(name) + '" class="line part" onclick=\'select_line("' + codage_path_javascript(name) + '")\' ondblclick=\'modify_part("' + codage_path_javascript(name) + '")\'><div class="row"><div class="column"><img src="'+window.location.origin+'/messes/icon/note.png" style="height:1.2em"></div><div class="column part-column"><span>' + name + '</span> </div><div class="column"><img src="'+window.location.origin+'/messes/icon/edit.png" style="height:1.2em;right:0px;margin-right:8px" onclick=\'modify_part("' + codage_path_javascript(name) + '")\'></div><div class="column" style="margin-left:10px"><img src="'+window.location.origin+'/messes/icon/double-arrow.png" style="height:1.2em;right:0px;margin-right:8px" ontouchstart=\'start_drag_button()\'></div></div></div>';
}

function add_pdf(name, path)
{
  return '<div id="line_' + codage_path_javascript(name) + '" class="line pdf" onclick=\'select_line("' + codage_path_javascript(name) + '")\' ondblclick=\'open_pdf("' + codage_path_javascript(path) + '")\'><div class="row"><div class="column"><img src="'+window.location.origin+'/messes/icon/pdf.png" style="height:2em;vertical-align:middle"></div><div class="column text-column">' + name + '<div class="path-column">' + path + '</div></div><div class="column"><img src="'+window.location.origin+'/messes/icon/forward.png" style="height:2em;vertical-align:middle;right:0px;border: 1px solid" onclick=\'open_pdf("' + codage_path_javascript(path) + '")\'/></div><div class="column" style="margin-left:10px"><img src="'+window.location.origin+'/messes/icon/double-arrow.png" style="height:2em;vertical-align:middle;right:0px;border: 1px solid" ontouchstart=\'start_drag_button()\'></div></div></div>';
}

function init(path_file)
{
	
	if(path_file == "example_messe.txt")example_version = true;
  document.addEventListener("ProgrammeReady", initDropAndDrap);
  programme = new Programme({
    watchers: null,
    interval: 100,
    stopsame: 5,
    callback: null,
    intervalcallback: null
  });
  programme.Start(path_file);
}

function codage_path_javascript(path)
{
    return path.replaceAll(",","µ").replaceAll("/","°").replaceAll("\.","¨").replaceAll("'","¤").replaceAll(" ","§") // remplacement des caractères spéciaux pour éviter les problèmes avec le javascript
}

function decodage_path_javascript(path)
{
    return path.replaceAll("µ",",").replaceAll("°","/").replaceAll("¨","\.").replaceAll("¤","'").replaceAll("§"," ")
}

/**
 * Site icone :
 * https://www.flaticon.com/search?word=pdf
 * https://www.svgrepo.com/vectors/music/
 * 
 */