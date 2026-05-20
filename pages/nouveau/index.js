function slugForFilename(value) {
    return value.trim()
        .replace(/[_]+/g, '-')
        .replace(/[^a-zA-Z0-9-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .replace(/-{2,}/g, '-')
        .toLowerCase();
}

function showFormMessage(message, isError) {
    var messageEl = document.getElementById('form_message');
    if(!messageEl) return;
    messageEl.textContent = message;
    messageEl.className = 'text-sm mb-4 ' + (isError ? 'text-red-400' : 'text-green-400');
}

$(document).ready(function() {
    // Load parishes
    $.ajax({
        url: window.location.origin + '/php/programme/interface.php?action=get_list_paroisses',
        type: 'GET',
        success: function(data) {
            var option_html = "<option value=''>Choisissez votre paroisse</option>";
            var paroisses = data.split("Â£");
            for(var i = 0; i < paroisses.length - 1; i++) {
                option_html += "<option value='" + paroisses[i] + "'>" + paroisses[i] + "</option>";
            }
            document.getElementById("paroisse").innerHTML = option_html;
        },
        error: function() {
            console.error("Erreur lors du chargement des paroisses");
        }
    });

    // Load templates
    $.ajax({
        url: window.location.origin + '/php/programme/interface.php?action=get_list_templates',
        type: 'GET',
        success: function(data) {
            var option_html = "<option value=''>Choisissez un template</option>";
            var templates = data.split("Â£");
            for(var i = 0; i < templates.length - 1; i++) {
                var templateName = templates[i];
                var templateValue = 'programmes/Templates/' + templateName;
                option_html += "<option value='" + templateValue + "'>" + templateName.replace('.json', '') + "</option>";
            }
            document.getElementById("template").innerHTML = option_html;
        },
        error: function() {
            console.error("Erreur lors du chargement des templates");
        }
    });

    $('#create-program-form').on('submit', function(event) {
        event.preventDefault();
        showFormMessage('', false);

        var paroisse = $('#paroisse').val().trim();
        var template = $('#template').val().trim();
        var occasion = $('#occasion').val().trim();
        var lieu = $('#lieu').val().trim();
        var date = $('#date').val().trim();

        if(!paroisse || !template || !occasion || !lieu || !date) {
            showFormMessage('Merci de remplir tous les champs obligatoires.', true);
            return;
        }

        var nom = date + '_' + slugForFilename(lieu) + '_' + slugForFilename(occasion) + '.json';
        var oldLink = template;

        $.ajax({
            url: window.location.origin + '/php/programme/interface.php?action=nouveau',
            type: 'GET',
            data: {
                old_link: oldLink,
                paroisse: paroisse,
                nom: nom,
                description: $('#description').val().trim(),
                auteur: 'web'
            },
            success: function(data) {
                var response = data ? data.trim() : '';
                if(response === 'success') {
                    showFormMessage('Programme créé avec succès.', false);
                    // Redirect to creation page
                    var programmePath = 'pdf/programmes/' + paroisse + '/' + nom;
                    window.location.href = '/pages/creation/index.php?programme=' + encodeURIComponent(programmePath);
                } else {
                    showFormMessage('Erreur : ' + response, true);
                    console.error('nouveau response:', response);
                }
            },
            error: function() {
                showFormMessage('Erreur réseau lors de la création du programme.', true);
            }
        });
    });
});