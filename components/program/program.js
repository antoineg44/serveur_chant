var programme = null;
var example_version = false;    // Set to true pour les tests

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

  $this.find = function(target_name, target_type, target_path) {
    var found = null;
    for(var i=0; i<programme.chants.length; i++)
    {
      if(programme.chants[i].name == target_name && programme.chants[i].type == target_type && (programme.chants[i].type == "partie" || programme.chants[i].name+programme.chants[i].path == target_path)) {
        found = i;
        break;
      }
    }
    return found;
  }

  $this.addPart = function(name)
  {
    if($this.find(name, "partie", null)) {
      console.log("item already exist : " + name);
      return null;
    }
    var part = {
      "type" : "partie",
      "name" : name
    };
    $this.chants.push(part);
    return true;
  }

  $this.addPartAfter = function(name, name_before) {
    if($this.find(name, "partie", null)) {
      console.log("item already exist : " + name);
      return null;
    }
    if($this.find(name_before, "partie", null) == null) {
      console.log("previous item not found : " + name_before);
      return null;
    }
    var part = {
      "type" : "partie",
      "name" : name
    };
    $this.chants.splice($this.find(name_before, "partie", null)+1,0,part);
    return true;
  }

  $this.addPdf = function(name, path)
  {
    if($this.find(name, "chant", path)) {
      console.log("item already exist : " + name);
      return null;
    }
    var part = {
      "type" : "chant",
      "name" : name,
      "path" : path
    };
    $this.chants.push(part);
    return true;
  }

  $this.getPreviousPart = function(target_name)
  {
    var find = null;
    for(var i=0; i<programme.chants.length; i++)
    {
      if(programme.chants[i].name == target_name && programme.chants[i].type == "partie") {
        find = i;
        break;
      }
    }
    if(find == null) {
      console.log("Part not found ! " + target_name);
      return null;
    }
    var previous = null;
    for(var i=find-1; i>=0; i--)
    {
      if(programme.chants[i].type == "partie") {
        previous = i;
        break;
      }
    }
    if(previous == null) {
      console.log("Previous not found ! " + target_name);
      return null;
    }
    return programme.chants[previous].name;
  }
  $this.getNextPart = function(target_name)
  {
    var find = null;
    for(var i=0; i<programme.chants.length; i++)
    {
      if(programme.chants[i].name == target_name && programme.chants[i].type == "partie") {
        find = i;
        break;
      }
    }
    if(find == null) {
      console.log("Part not found ! " + target_name);
      return null;
    }
    var next = null;
    for(var i=find+1; i<programme.chants.length; i++)
    {
      if(programme.chants[i].type == "partie") {
        next = i;
        break;
      }
    }
    if(next == null) {
      console.log("Next not found ! " + target_name);
      return null;
    }
    return programme.chants[next].name;
  }

  $this.echange2 = function(target_name, target_type, path, next, next_type, next_path)
  {
    console.log("moveUp: " + target_name);
    console.log(path);
    var find = null;
    var i_target = null;
    var i_next = null;
    for(var i=0; i<programme.chants.length; i++)
    {
      if(programme.chants[i].name == target_name && programme.chants[i].type == target_type && (programme.chants[i].type == "partie" || programme.chants[i].name+programme.chants[i].path == path)) {
        i_target = i;
        break;
      }
    }
    if(i_target == null)
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
          i_next = i;
          break;
        }
      }

      if(i_next != null) {
        find = programme.chants[i_target];
        programme.chants[i_target] = programme.chants[i_next];
        programme.chants[i_next] = find;
      }
      else {
        alert("Erreur, élément non trouvé : " + next);
      }
    }
    console.log("resultat :");
    console.log(programme.chants);
    if(example_version == false)onModif();
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
    var find = false;
    for(var i=0; i<programme.chants.length; i++)
    {
      if(programme.chants[i].name == old_name){
        programme.chants[i].name = new_name;
        find = true;
      }
    }
    if(find == false)console.log("not found : " + old_name);
    if(example_version == false)onModif();
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
      console.log("Path file : " + path_file);
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

function initProgram(path_file, end_function)
{
	
	if(path_file == "example_messe.txt")example_version = true;
  document.addEventListener("ProgrammeReady", end_function);
  programme = new Programme({
    watchers: null,
    interval: 100,
    stopsame: 5,
    callback: null,
    intervalcallback: null
  });
  programme.Start(path_file);
}

/**
 * Site icone :
 * https://www.flaticon.com/search?word=pdf
 * https://www.svgrepo.com/vectors/music/
 * 
 */