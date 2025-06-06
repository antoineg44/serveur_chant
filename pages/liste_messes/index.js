var section = 1;
var total_section = 0;

function fill_list() {
    $.ajax({
        type: 'GET',
        url: window.location.href + 'get_list.php',
        crossDomain: true,
        contentType: "application/x-www-form-urlencoded;charset=ISO-8859-15",
        data: 'nom=',
        success: function(data){
            console.log("fichiers : " + data);
            var paroisses = data.split("£");
            total_section = paroisses.length-2;
            for(var i=1;i <paroisses.length-1; i++) {
                if('Â' == paroisses[i][paroisses[i].length-1])
                    paroisses[i] = paroisses[i].slice(0,-1); // retirer le dernier caratère qui est : à majuscule (pourrait être amélioré pour que ce soit plus propre)        
                console.log("Ajax for : " + paroisses[i]);
                $.ajax({
                    type: 'GET',
                    url: window.location.href + '/get_list.php',
                    crossDomain: true,
                    contentType: "application/x-www-form-urlencoded;charset=ISO-8859-15",
                    data: 'nom=' + paroisses[i],
                    success: function(data_programmes){
                        var programmes = data_programmes.split("£");
                        console.log("Recieve ajax for : " + programmes[0] + " avec : " + data_programmes);
                        for(var j=0;j <programmes.length; j++) {
                            if('Â' == programmes[j][programmes[j].length-1])
                                programmes[j] = programmes[j].slice(0,-1); // retirer le dernier caratère qui est : à majuscule (pourrait être amélioré pour que ce soit plus propre)        
                        }
                        insert_paroisse(programmes[0], programmes);
                    }
                });
            }
        }
    });
}

function insert_paroisse(paroisses, programmes) {
    var entete = '<li><button type="button" class="w-full flex justify-between items-center px-4 py-3 text-left text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"aria-expanded="false" aria-controls="item'+section+'" id="item'+section+'-button" >\
					  <span class="font-semibold text-gray-800">'+paroisses+'</span>\
                      <svg class="w-5 h-5 transform transition-transform duration-200" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>\
                </button><div id="item'+section+'" class="bg-gray-50 px-4 py-3 text-gray-600 hidden" role="region" aria-labelledby="item'+section+'-button">'

    var html_programmes = "";
				  
    for(var i=1; i<programmes.length-1;i++) {
        html_programmes += '<div class="bg-white rounded shadow"><div class="flex items-center justify-between p-3 cursor-pointer select-none" style="padding: 2px;" ondblclick="view_programme_from_div(this)">\
          <div style="padding: 10px;">'+programmes[i]+'</div><div class="flex space-x-2">\
            <img class="button" src="../../components/icons/edit.png" onclick="edit_programme(this)">\
            <img class="button" src="../../components/icons/arrow.png" onclick="view_programme(this)">\
            <img class="button" src="../../components/icons/share.png" style="margin-right: 15px;" onclick="share_programme(this)">\
          </div></div></div>';
    }

    var end = "</div></li>";
    $('#liste_paroisses').append(entete + html_programmes + end);
    if(total_section == section)activate();
    section++;
}

function activate() {
    document.querySelectorAll('button[aria-expanded]').forEach(button => {
        button.addEventListener('click', () => {
          const expanded = button.getAttribute('aria-expanded') === 'true';
          const controls = button.getAttribute('aria-controls');
          const content = document.getElementById(controls);
          if (expanded) {
            button.setAttribute('aria-expanded', 'false');
            content.classList.add('hidden');
            button.querySelector('svg').classList.remove('rotate-180');
          } else {
            button.setAttribute('aria-expanded', 'true');
            content.classList.remove('hidden');
            button.querySelector('svg').classList.add('rotate-180');
          }
        });
      });
}
function edit_programme(element) {
    console.log(element);
    var programme = element.parentElement.parentElement.children[0].textContent;
    var paroisse = element.closest("li").children[0].children[0].textContent;
    window.open(window.location.origin+"/messes/"+"?_pathfile="+window.location.origin+"/pdf/programmes/"+paroisse+"/"+programme);
}

function view_programme(element) {
    console.log(element);
    var programme = element.parentElement.parentElement.children[0].textContent;
    var paroisse = element.closest("li").children[0].children[0].textContent;
    window.open(window.location.origin+"/components/visualisationProgramme/"+"?programme="+window.location.origin+"/pdf/programmes/"+paroisse+"/"+programme);
}

function view_programme_from_div(element) {
    console.log(element);
    var programme = element.children[0].textContent;
    var paroisse = element.closest("li").children[0].children[0].textContent;
    window.open(window.location.origin+"/components/visualisationProgramme/"+"?programme="+window.location.origin+"/pdf/programmes/"+paroisse+"/"+programme);
}

function share_programme(element) {
    console.log(element);
    var programme = element.parentElement.parentElement.children[0].textContent;
    var paroisse = element.closest("li").children[0].children[0].textContent;
    var text_export = window.location.origin+"/components/visualisationProgramme/"+"?programme="+window.location.origin+"/pdf/programmes/"+paroisse+"/"+programme;
    navigator.clipboard.writeText(text_export).then(() => {
            alert("Texte copié :" + text_export);           // + Alert
    })
}