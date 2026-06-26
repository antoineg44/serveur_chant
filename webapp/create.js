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

document.addEventListener('DOMContentLoaded', function() {
    function setOptions(selectId, items, defaultLabel, valueFn, labelFn) {
        var select = document.getElementById(selectId);
        if (!select) return;
        var optionHtml = "<option value=''>" + defaultLabel + "</option>";
        items.forEach(function(item) {
            optionHtml += "<option value='" + valueFn(item) + "'>" + labelFn(item) + "</option>";
        });
        select.innerHTML = optionHtml;
    }

    function fetchList(url, callback) {
        fetch(url, { method: 'GET', credentials: 'include' })
            .then(function(response) {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.text();
            })
            .then(function(text) {
                callback(text);
            })
            .catch(function(error) {
                console.error('Erreur lors du chargement des données:', error);
            });
    }

    fetchList(window.location.origin + '/php/programme/interface.php?action=get_list_paroisses', function(data) {
        var paroisses = data.split('Â£').filter(Boolean);
        setOptions('paroisse', paroisses, 'Choisissez votre paroisse', function(item) { return item; }, function(item) { return item; });
    });

    fetchList(window.location.origin + '/php/programme/interface.php?action=get_list_templates', function(data) {
        var templates = data.split('Â£').filter(Boolean);
        setOptions('template', templates, 'Choisissez un template', function(item) {
            return 'programmes/Templates/' + item;
        }, function(item) {
            return item.replace('.json', '');
        });
    });

    var form = document.getElementById('create-program-form');
    if (!form) return;

    form.addEventListener('submit', function(event) {
        event.preventDefault();
        showFormMessage('', false);

        var paroisse = document.getElementById('paroisse').value.trim();
        var template = document.getElementById('template').value.trim();
        var occasion = document.getElementById('occasion').value.trim();
        var lieu = document.getElementById('lieu').value.trim();
        var date = document.getElementById('date').value.trim();
        var description = document.getElementById('description').value.trim();

        if (!paroisse || !template || !occasion || !lieu || !date) {
            showFormMessage('Merci de remplir tous les champs obligatoires.', true);
            return;
        }

        var nom = date + '_' + slugForFilename(lieu) + '_' + slugForFilename(occasion) + '.json';
        var params = new URLSearchParams({
            old_link: template,
            paroisse: paroisse,
            nom: nom,
            description: description,
            auteur: 'web'
        });

        fetch(window.location.origin + '/php/programme/interface.php?action=nouveau&' + params.toString(), {
            method: 'GET',
            credentials: 'include'
        })
            .then(function(response) {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.text();
            })
            .then(function(data) {
                var response = data ? data.trim() : '';
                if (response === 'success') {
                    showFormMessage('Programme créé avec succès.', false);
                    var programmePath = 'pdf/programmes/' + paroisse + '/' + nom;
                    window.location.href = '/pages/creation/index.php?programme=' + encodeURIComponent(programmePath);
                } else {
                    showFormMessage('Erreur : ' + response, true);
                    console.error('nouveau response:', response);
                }
            })
            .catch(function() {
                showFormMessage('Erreur réseau lors de la création du programme.', true);
            });
    });
});