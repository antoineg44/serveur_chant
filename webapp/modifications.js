
chant_modified = null;
var hasUnsavedChanges = false;

window.addEventListener('beforeunload', function(e) {
    if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
        return '';
    }
});

function markAsChanged() {
    hasUnsavedChanges = true;
}

function aelfHtmlToText(html) {
    return String(html || '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<[^>]+>/g, '')
        .replace(/\u00a0/g, ' ')
        .trim();
}

function buildAelfReadingText(lecture) {
    var parts = [];
    if (lecture.intro_lue) {
        parts.push(aelfHtmlToText(lecture.intro_lue) + (lecture.ref ? ' (' + lecture.ref + ')' : ''));
    } else if (lecture.ref) {
        parts.push(lecture.ref);
    }
    if (lecture.refrain_psalmique) {
        parts.push(aelfHtmlToText(lecture.refrain_psalmique));
    }
    parts.push(aelfHtmlToText(lecture.contenu));
    return parts.join('\n\n');
}

/**
 * Finds a partie section by its displayed name (case-insensitive), not by guessing its encoded id.
 */
function findSectionByPartieName(name) {
    var normalized = name.trim().toLowerCase();
    var sections = document.querySelectorAll('section[id^="part_"]');
    for (var i = 0; i < sections.length; i++) {
        var heading = sections[i].querySelector('.part-column h1');
        if (heading && heading.textContent.trim().toLowerCase() === normalized) {
            return sections[i];
        }
    }
    return null;
}

function removeExistingAelfChant(container, type) {
    if (!container) {
        return;
    }
    var existing = container.querySelector('[data-aelf-reading="' + type + '"]');
    if (existing) {
        existing.remove();
    }
}

// Appends (or replaces a previous) reading as a text-only chant entry inside an existing section.
function appendAelfReadingChant(section, type, lecture) {
    if (!section) {
        return;
    }
    var container = document.getElementById('doc_' + section.id.slice(5));
    if (!container) {
        return;
    }

    removeExistingAelfChant(container, type);
    if (!lecture) {
        return;
    }

    container.insertAdjacentHTML('beforeend', add_chant({ name: buildAelfReadingText(lecture), path: 'null' }));

    var inserted = container.lastElementChild;
    if (inserted) {
        inserted.setAttribute('data-aelf-reading', type);
    }
}

function removeExistingAelfSection(type) {
    var existingSection = document.querySelector('section[data-aelf-reading="' + type + '"]');
    if (!existingSection) {
        return;
    }
    var existingLink = document.getElementById('link_' + existingSection.id.slice(5));
    if (existingLink) {
        existingLink.remove();
    }
    existingSection.remove();
}

// Creates a brand new section (with a single text-only reading chant) just before/after a reference section.
function insertAelfSection(type, name, lecture, referenceSection, position) {
    removeExistingAelfSection(type);

    if (!lecture || !referenceSection) {
        return null;
    }

    var sectionHtml = add_section({ name: name }, add_chant({ name: buildAelfReadingText(lecture), path: 'null' }));
    var linkHtml = add_link_section(name);

    referenceSection.insertAdjacentHTML(position === 'before' ? 'beforebegin' : 'afterend', sectionHtml);
    var newSection = position === 'before' ? referenceSection.previousElementSibling : referenceSection.nextElementSibling;
    if (newSection) {
        newSection.setAttribute('data-aelf-reading', type);
    }

    var referenceLink = document.getElementById('link_' + referenceSection.id.slice(5));
    if (referenceLink) {
        referenceLink.insertAdjacentHTML(position === 'before' ? 'beforebegin' : 'afterend', linkHtml);
    }

    return newSection;
}

async function chargerLecturesAelf() {
    var dateField = document.getElementById('programme_date');
    if (!dateField || !dateField.value) {
        return;
    }

    var psaumeSection = findSectionByPartieName('Psaume');
    if (!psaumeSection) {
        alert('Aucune partie "Psaume" trouvee dans le programme : impossible d\'inserer les lectures AELF.');
        return;
    }

    try {
        var response = await fetch('https://api.aelf.org/v1/messes/' + dateField.value + '/france');
        var payload = await response.json().catch(function() { return null; });

        if (!response.ok || !payload || !Array.isArray(payload.messes) || !payload.messes.length) {
            throw new Error('Lectures indisponibles pour cette date.');
        }

        var lectures = payload.messes[0].lectures || [];
        var lecture1 = lectures.find(function(l) { return l.type === 'lecture_1'; });
        var psaume = lectures.find(function(l) { return l.type === 'psaume'; });
        var lecture2 = lectures.find(function(l) { return l.type === 'lecture_2'; });
        var evangile = lectures.find(function(l) { return l.type === 'evangile'; });

        insertAelfSection('lecture_1', 'Premiere lecture', lecture1, psaumeSection, 'before');
        appendAelfReadingChant(psaumeSection, 'psaume', psaume);
        var lecture2Section = insertAelfSection('lecture_2', 'Deuxieme lecture', lecture2, psaumeSection, 'after');

        var alleluiaSection = findSectionByPartieName('Alleluia') || findSectionByPartieName('Alléluia');
        var evangileReference = alleluiaSection || lecture2Section || psaumeSection;
        insertAelfSection('evangile', 'Evangile', evangile, evangileReference, 'after');

        markAsChanged();
    } catch (error) {
        alert("Impossible de recuperer les lectures AELF : " + error.message);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    var aelfField = document.getElementById('programme_aelf');
    var dateField = document.getElementById('programme_date');

    if (aelfField) {
        aelfField.addEventListener('change', function() {
            if (aelfField.checked) {
                void chargerLecturesAelf();
            }
        });
    }

    if (dateField) {
        dateField.addEventListener('change', function() {
            if (aelfField && aelfField.checked) {
                void chargerLecturesAelf();
            }
        });
    }
});

function updateProgrammeInformationFromForm() {
    var dateField = document.getElementById('programme_date');
    var lieuField = document.getElementById('programme_lieu');
    var occasionField = document.getElementById('programme_occasion');
    var paroisseField = document.getElementById('select_paroisse');
    var descriptionField = document.getElementById('programme_description');
    var aelfField = document.getElementById('programme_aelf');

    if (dateField) programme.date = dateField.value;
    if (lieuField) programme.lieu = lieuField.value.trim();
    if (occasionField) programme.occasion = occasionField.value.trim();
    if (paroisseField && paroisseField.value && !paroisseField.value.toLowerCase().startsWith('choisissez')) {
        programme.paroisse = paroisseField.value.trim();
    }
    if (descriptionField) programme.description = descriptionField.value;
    if (aelfField) programme.aelf = aelfField.checked;
}

function getProgrammeParoisseFromPath() {
    if (!window.programme || !programme.path_file) {
        return '';
    }

    var rawPath = String(programme.path_file);
    try {
        var parsedUrl = new URL(rawPath, window.location.href);
        var queryPath = parsedUrl.searchParams.get('path');
        if (queryPath) {
            rawPath = queryPath;
        }
    } catch (error) {
        // Use the raw path when it is not a complete URL.
    }

    for (var decodeAttempt = 0; decodeAttempt < 2; decodeAttempt++) {
        try {
            var decodedPath = decodeURIComponent(rawPath);
            if (decodedPath === rawPath) {
                break;
            }
            rawPath = decodedPath;
        } catch (error) {
            break;
        }
    }

    var normalizedPath = rawPath.replace(/\\/g, '/').replace(/[?#].*$/, '');
    var programmesMarker = normalizedPath.match(/(?:^|\/)(?:pdf\/)?programmes\//i);
    if (!programmesMarker) {
        return '';
    }

    var programmeRelativePath = normalizedPath.slice(programmesMarker.index + programmesMarker[0].length);
    return programmeRelativePath.split('/').filter(Boolean)[0] || '';
}

function initializeParoisseSelect() {
    var paroisseField = document.getElementById('select_paroisse');
    if (!paroisseField || !window.programme) {
        return;
    }

    var paroisse = getProgrammeParoisseFromPath() || String(programme.paroisse || '').trim();
    if (!paroisse) {
        return;
    }

    programme.paroisse = paroisse;
    var optionExists = Array.prototype.some.call(paroisseField.options, function(option) {
        return option.value.trim() === paroisse || option.textContent.trim() === paroisse;
    });

    if (optionExists) {
        paroisseField.value = paroisse;
    }
}

window.updateCurrentChantPath = updateCurrentChantPath;

var currentPreviewLabel = null;
var currentPreviewInput = null;
var currentPreviewContainer = null;
var currentPreviewChantName = null;
var currentPreviewChantEntry = null;
var pdfPathListenerAttached = false;

function normalizePdfPath(path) {
    if (!path) return "";
    var normalized = decodeURI(path).trim();
    if (normalized.startsWith("/pdf/")) {
        normalized = normalized.slice(5);
    }
    return normalized;
}

function buildChantDisplayNameFromPath(path) {
    var normalizedPath = normalizePdfPath(path);
    if (!normalizedPath) return "";

    var segments = normalizedPath.split("/");
    var fileName = segments[segments.length - 1] || "";
    if (!fileName) return "";

    return fileName.replace(/\.(pdf|PDF)$/i, "");
}

function updateCurrentChantPath(newPath, updatedUrl) {
    console.log('[pdf-debug] updateCurrentChantPath', { newPath: newPath, updatedUrl: updatedUrl, chantName: currentPreviewChantName, hasEntry: !!currentPreviewChantEntry });
    if (!newPath) return;

    if (currentPreviewLabel) {
        currentPreviewLabel.textContent = newPath;
    }

    if (currentPreviewInput) {
        currentPreviewInput.value = newPath;
    }

    if (currentPreviewContainer) {
        currentPreviewContainer.setAttribute("data-current-pdf-path", newPath);
        var chantTitleElement = currentPreviewContainer.querySelector(".part-column h1");
        if (chantTitleElement) {
            var suggestedName = buildChantDisplayNameFromPath(newPath);
            if (suggestedName) {
                chantTitleElement.textContent = suggestedName;
            }
        }
    }

    var suggestedName = buildChantDisplayNameFromPath(newPath);
    if (currentPreviewChantEntry) {
        currentPreviewChantEntry.path = newPath;
        if (suggestedName) {
            currentPreviewChantEntry.name = suggestedName;
            currentPreviewChantName = suggestedName;
        }
        console.log('[pdf-debug] updated chant entry directly', { name: currentPreviewChantEntry.name, path: currentPreviewChantEntry.path });
    } else if (window.programme && Array.isArray(programme.chants)) {
        var chantNameToUpdate = currentPreviewChantName || (currentPreviewContainer && currentPreviewContainer.querySelector(".part-column h1") ? currentPreviewContainer.querySelector(".part-column h1").textContent.trim() : null);
        if (chantNameToUpdate) {
            for (var i = 0; i < programme.chants.length; i++) {
                if (programme.chants[i] && programme.chants[i].type === "chant" && programme.chants[i].name === chantNameToUpdate) {
                    programme.chants[i].path = newPath;
                    if (suggestedName) {
                        programme.chants[i].name = suggestedName;
                    }
                    break;
                }
            }
        }
    }

    markAsChanged();

    // Used by open-external-pdf-btn fallback logic in the parent page.
    window.lastLoadedPdfUrl = updatedUrl || (window.location.origin + "/pdf/" + encodeURI(newPath));
}

function handlePdfPathChanged(event) {
    if (!event || !event.detail) return;

    var newPath = normalizePdfPath(event.detail.path || event.detail.url || "");
    if (!newPath) return;

    var updatedUrl = event.detail.url;
    if (!updatedUrl) {
        updatedUrl = window.location.origin + "/pdf/" + encodeURI(newPath);
    }

    updateCurrentChantPath(newPath, updatedUrl);
}

function attachPdfPathListener() {
    if (pdfPathListenerAttached) return;
    var iframe = document.getElementById("pdf-visualisation-viewer");
    if (!iframe || !iframe.contentWindow) return;

    try {
        iframe.contentWindow.addEventListener("pdfPathChanged", handlePdfPathChanged);
        pdfPathListenerAttached = true;
    } catch (e) {
        console.log("Unable to attach pdfPathChanged listener", e);
    }
}

function openChantPdf(el, chantPath) {
    var normalizedPath = normalizePdfPath(chantPath);
    var initialUrl = window.location.origin + '/pdf/' + normalizedPath;
    var container = el.closest("div[id^='chant_']");
    currentPreviewLabel = null;
    currentPreviewInput = null;
    currentPreviewContainer = null;
    currentPreviewChantName = null;

    currentPreviewChantEntry = null;

    if (container) {
        console.log('[pdf-debug] openChantPdf container found', { chantPath: chantPath, containerId: container.id });
        currentPreviewContainer = container;
        currentPreviewLabel = container.querySelector(".text_path_chant");
        currentPreviewInput = container.querySelector("input[type='url'][id^='path_']");
        var chantTitle = container.querySelector(".part-column h1");
        if (chantTitle) {
            currentPreviewChantName = chantTitle.textContent.trim();
            if (window.programme && Array.isArray(programme.chants)) {
                for (var j = 0; j < programme.chants.length; j++) {
                    if (programme.chants[j] && programme.chants[j].type === "chant" && programme.chants[j].name === currentPreviewChantName) {
                        currentPreviewChantEntry = programme.chants[j];
                        console.log('[pdf-debug] matched chant entry', { name: currentPreviewChantName, path: programme.chants[j].path });
                        break;
                    }
                }
            }
        }
    }

    window.lastLoadedPdfUrl = initialUrl;

    if(window.innerWidth > 750) {
        loadPdfFromUrl(initialUrl);
        setTimeout(attachPdfPathListener, 0);
    } else {
        window.open(initialUrl, '_blank');
    }
}

document.addEventListener('DOMContentLoaded', function() {
    var iframe = document.getElementById("pdf-visualisation-viewer");
    if (iframe) {
        iframe.addEventListener('load', function() {
            pdfPathListenerAttached = false;
            attachPdfPathListener();
        });
    }

    window.addEventListener('message', function(event) {
        console.log('[pdf-debug] parent message received', { type: event.data && event.data.type, origin: event.origin, data: event.data });
        if (!event.data || (event.data.type !== 'pdfSelectionChanged' && event.data.type !== 'visualisationPdfChanged')) return;
        if (event.origin && event.origin !== window.location.origin) return;

        var payload = event.data;
        var newPath = normalizePdfPath(payload.path || payload.relativePath || "");
        if (!newPath) {
            console.log('[pdf-debug] no usable path in message payload', payload);
            return;
        }

        var updatedUrl = payload.url || payload.fileUrl || (window.location.origin + "/pdf/" + encodeURI(newPath));
        updateCurrentChantPath(newPath, updatedUrl);
    });
});

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

  // paroisse :
    initializeParoisseSelect();

  // lieu
  document.getElementById("programme_lieu").value = programme.lieu;

  // occation
  document.getElementById("programme_occasion").value = programme.occasion;

  // date
  document.getElementById("programme_date").value = programme.date;

  // description
  document.getElementById("programme_description").value = programme.description;

  // AELF
  document.getElementById("programme_aelf").checked = Boolean(programme.aelf);

  // title
  document.getElementById("title_section").innerHTML = '<div class="href-target" id="intro"></div>' + "<h1 class='package-name'>Messe du " + programme.date + " à " + programme.lieu + " pour " + programme.occasion + "</h1><p>Paroisse de " + programme.paroisse + ".</p>";

  // Add change listeners to form fields
  var formFields = ['select_paroisse', 'programme_lieu', 'programme_occasion', 'programme_date', 'programme_description', 'programme_aelf'];
  formFields.forEach(function(fieldId) {
    var field = document.getElementById(fieldId);
    if (field) {
      field.addEventListener('input', markAsChanged);
      field.addEventListener('change', markAsChanged);
    }
  });

}

function add_section(partie, chants) {
    return '<section id="part_'+codage_path_javascript(partie.name)+'">\
    <div class="href-target" id="'+codage_path_javascript(partie.name)+'_link"></div>\
    <div id="" onclick="" ondblclick="">\
        <div class="row">\
            <div class="column"><h1>\
                <div class="row"><div class="column"><img src="../components/icons/double_note.svg" style="height:1.4em">\
            </h1></div>\
            <div class="column part-column"><h1 id="h1_'+codage_path_javascript(partie.name)+'">'+partie.name+'</h1></div>\
            <div class="column"><img class="button" src="../components/icons/edit.png"\
                    style="height:1.2em;right:0px;margin-right:16px" onclick="modify_part(this)"></div>\
            <div class="column"><img class="button" src="../components/icons/delete.png"\
                    style="height:1.2em;right:0px;margin-right:8px" onclick="delete_part(this)"></div>\
            <div class="column" style="margin-left:10px"><img class="button" src="../components/icons/up-arrow.png"\
                    style="height:1.2em;right:0px;margin-right:8px" onclick="move_up_part(this)"></div>\
            <div class="column" style="margin-left:10px"><img class="button" src="../components/icons/down-arrow.png"\
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
        <img src="../components/icons/double_note.svg" style="height: 1.25em;width: 1.25em;margin-right: 1em;">\
        '+name+'</a>\
    </li>';
}

function link_section(name) {
    return '<a href="#'+codage_path_javascript(name)+'_link">\
        <img src="../components/icons/double_note.svg" style="height: 1.25em;width: 1.25em;margin-right: 1em;">\
        '+name+'</a>';
}

function add_chant(chant, modification_visible=false) {
    var modification_style = "";
    var text_path = chant.path;
    var click_action = 'onclick="openChantPdf(this, \''+chant.path.replaceAll("'","\\'")+'\')"';
    if(text_path == "null") {
        text_path = "";
        click_action = "";
    }
    if(modification_visible == false)
        modification_style = 'style="position:absolute;visibility:collapse"';
    return '<div id="chant_'+codage_path_javascript(chant.name)+'" style="margin-top:24px"><div class="row">\
            <div class="column"><h1>\
                <div class="row"><div class="column"><img src="../components/icons/pdf.png" style="height:1em">\
            </h1></div>\
            <div class="column part-column"><h1 '+click_action+' style="white-space: normal;">'+chant.name+'</h1></div>\
            <!--<div class="column"><img src="../components/icons/edit.png"\
                    style="height:1.2em;right:0px;margin-right:16px" onclick="modify_chant(this)"></div>-->\
            <div class="column"><img class="button" src="../components/icons/edit.png"\
                    style="height:1.2em;right:0px;margin-right:8px" onclick="edit_chant(this)"></div>\
            <div class="column"><img class="button" src="../components/icons/delete.png"\
                    style="height:1.2em;right:0px;margin-right:8px" onclick="delete_chant(this)"></div>\
            <!--<div class="column" style="margin-left:10px"><img src="../components/icons/up-arrow.png"\
                    style="height:1.2em;right:0px;margin-right:8px" onclick="move_up_chant(this)"></div>\
            <div class="column" style="margin-left:10px"><img src="../components/icons/down-arrow.png"\
                    style="height:1.2em;right:0px;margin-right:8px" onclick="move_down_chant(this)"></div>-->\
        </div>\
        <label class="text_path_chant" style="white-space: normal;">'+text_path+'</label>\
        <div class="nice-form-group acWrap" '+modification_style+'><input type="url" placeholder="/type/chant... (ex: cantique/chantez avec moi/)" value="'+text_path+'" id="path_'+codage_path_javascript(chant.name)+'" class="icon-left"/>\
        <script>\
            console.log("attach: '+chant.name+'");\
            ac.attach({\
                target: document.getElementById("path_'+codage_path_javascript(chant.name)+'"),\
                data: "../../components/autocomplete/autocomplete_path.php",\
                exec: select_chant\
            });\
        </script></div></div>';
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
    reset_modified_chant();
    var id_part = element.closest("section").id.slice(5);
    console.log("delete_part");
    document.getElementById("part_"+id_part).remove();
    document.getElementById("link_"+id_part).remove();
    markAsChanged();
}
function delete_chant(element) {
    reset_modified_chant();
    console.log(element);
    element.parentElement.parentElement.parentElement.remove();
    markAsChanged();
}
function reset_modified_chant(){
    if(chant_modified != null) {
        chant_modified.style.visibility = "collapse";
        chant_modified.style.position = "absolute";
    }
}
function edit_chant(element) {
    reset_modified_chant();
    chant_modified = element.parentElement.parentElement.parentElement.lastElementChild;
    chant_modified.style.visibility = "visible";
    chant_modified.style.position = "relative";
    console.log(chant_modified.parentElement.id.slice(6));
    ac.attach({
        target: document.getElementById("path_"+chant_modified.parentElement.id.slice(6)),
        data: "../../components/autocomplete/autocomplete_path.php",
        exec: select_chant
    });
}
function select_chant(element, path) {
    var name = path.split("/");
    var chant = {
        name: name[name.length-1],
        path: path
    };
    element.parentElement.parentElement.parentElement.outerHTML = add_chant(chant);
    
}
function move_up_part(element) {
    var id_part = element.closest("section").id.slice(5);
    console.log("move_up_part");
    if(!element.closest("section").previousSibling.id.includes("part"))
        return;
    var part_before = element.closest("section").previousSibling.id.slice(5);
    if(part_before != null){
        document.querySelector('#part_' + part_before).before(document.querySelector('#part_' + id_part));
        document.querySelector('#link_' + part_before).before(document.querySelector('#link_' + id_part));
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
    reset_modified_chant();
    var id_part = element.closest("section").id.slice(5);
    console.log("move_down_part");
    if(!element.closest("section").nextSibling.id.includes("part"))
        return;
    var part_after = element.closest("section").nextSibling.id.slice(5);
    if(part_after != null) {
        document.querySelector('#part_' + part_after).after(document.querySelector('#part_' + id_part));
        document.querySelector('#link_' + part_after).after(document.querySelector('#link_' + id_part));
    }
}
function add_new_chant(element) {
    reset_modified_chant();
    var id_part = element.closest("section").id.slice(5);
    console.log("add_new_chant");
    var chant = {'name': 'nouveau chant', "type" : "chant", "path": "null"};
    //let parser = new DOMParser();
    //let doc = parser.parseFromString(add_chant(chant), 'text/html');
    if(document.getElementById("list_"+id_part)) {
        document.getElementById("list_"+id_part).innerHTML += add_chant(chant, true);
    }
    else {
        document.getElementById("doc_"+id_part).innerHTML = '<div class="nice-form-group" id="list_'+id_part+'">' + add_chant(chant,true) + '</div>';
    }
    console.log("attach: "+chant.name);
    ac.attach({
        target: document.getElementById("path_"+codage_path_javascript(chant.name)),
        data: "../../components/autocomplete/autocomplete_path.php",
        exec: select_chant
    });
    markAsChanged();

}
function add_new_part(element) {
    reset_modified_chant();
    console.log("add_new_part");
    var section = element.closest("section");
    var partie = {'name': 'nouvelle partie', "partie" : "chant", "path": null};
    let parser = new DOMParser();
    let doc = parser.parseFromString(add_section(partie, ""), 'text/html');
    let nav = parser.parseFromString(add_link_section('nouvelle partie'), 'text/html');

    // The description block is the anchor used for the very first part.
    if (section.id === "description") {
        document.querySelector('#description').after(doc.body.firstChild);
        document.querySelector('#description_list').after(nav.body.firstChild);
    } else {
        var id_part = section.id.slice(5);
        document.querySelector('#part_' + id_part).after(doc.body.firstChild);
        document.querySelector('#link_' + id_part).after(nav.body.firstChild);
    }

    markAsChanged();
}
var pendingPartSectionId = null;
var availablePartOptions = [];

function renderPartOptions() {
    var select = document.getElementById("partie-picker-select");
    var search = document.getElementById("partie-picker-search");
    var filter = search ? search.value.trim().toLowerCase() : "";

    select.innerHTML = "";
    availablePartOptions
        .filter(function(partie) {
            return !filter || partie.nom.toLowerCase().indexOf(filter) !== -1;
        })
        .forEach(function(partie) {
            var option = document.createElement("option");
            option.value = partie.nom;
            option.textContent = partie.nom;
            select.appendChild(option);
        });
}

function getUsedPartNames() {
    return Array.prototype.map.call(
        document.querySelectorAll("section[id^='part_'] h1[id^='h1_']"),
        function(element) { return element.textContent.trim(); }
    );
}

function applyPartRename(id_part, name_part) {
    document.getElementById("h1_"+id_part).innerHTML = name_part;
    document.getElementById("link_"+id_part).innerHTML = link_section(name_part);
    document.getElementById("h1_"+id_part).id = "h1_"+codage_path_javascript(name_part);
    document.getElementById("doc_"+id_part).id = "doc_"+codage_path_javascript(name_part);
    document.getElementById("link_"+id_part).id = "link_"+codage_path_javascript(name_part);
    document.getElementById(id_part+"_link").id = codage_path_javascript(name_part)+"_link";
    document.getElementById("part_"+id_part).id = "part_"+codage_path_javascript(name_part);
    markAsChanged();
}

async function modify_part(element) {
    reset_modified_chant();

    var sectionId = element.closest("section").id.slice(5);
    var dialog = document.getElementById("partie-picker-dialog");
    var search = document.getElementById("partie-picker-search");

    try {
        var response = await fetch(getProgrammeApiUrl() + "?action=parties", { credentials: 'include' });
        var payload = await response.json().catch(function() { return null; });

        if (!response.ok || !payload || !payload.success) {
            throw new Error((payload && payload.message) || ("HTTP " + response.status));
        }

        // Parts already placed in the program cannot be selected again.
        var used = getUsedPartNames();
        availablePartOptions = (payload.parties || []).filter(function(partie) {
            return used.indexOf(partie.nom) === -1;
        });

        if (!availablePartOptions.length) {
            alert("Toutes les parties disponibles sont deja utilisees dans ce programme.");
            return;
        }

        if (search) {
            search.value = "";
        }
        renderPartOptions();

        pendingPartSectionId = sectionId;
        dialog.showModal();
    } catch (error) {
        alert("Impossible de charger la liste des parties : " + error.message);
    }
}

document.addEventListener("DOMContentLoaded", function() {
    var dialog = document.getElementById("partie-picker-dialog");
    var form = document.getElementById("partie-picker-form");
    if (!dialog || !form) {
        return;
    }

    form.addEventListener("submit", function(event) {
        event.preventDefault();

        var name = document.getElementById("partie-picker-select").value;
        if (pendingPartSectionId && name && name !== decodage_path_javascript(pendingPartSectionId)) {
            applyPartRename(pendingPartSectionId, name);
        }

        pendingPartSectionId = null;
        dialog.close();
    });

    dialog.querySelectorAll("[data-close-dialog]").forEach(function(button) {
        button.addEventListener("click", function() {
            pendingPartSectionId = null;
            dialog.close();
        });
    });

    var search = document.getElementById("partie-picker-search");
    if (search) {
        search.addEventListener("input", renderPartOptions);
    }
});

var testing = null;
function modify_chant(element) {
    console.log("modify_chant");
    console.log(element);
    testing = element;
}

function collectProgramChantsFromDom() {
    var chants = [];
    var sections = document.querySelectorAll("section[id^='part_']");

    sections.forEach(function(section) {
        var partTitle = section.querySelector("h1[id^='h1_']");
        if (partTitle) {
            chants.push({
                type: "partie",
                name: partTitle.textContent.trim()
            });
        }

        var chantRows = section.querySelectorAll("div[id^='chant_']");
        chantRows.forEach(function(row) {
            var title = row.querySelector(".part-column h1");
            if (!title) return;

            var path = "";
            var label = row.querySelector(".text_path_chant");
            if (label && label.textContent) {
                path = label.textContent.trim();
            } else {
                var input = row.querySelector("input[type='url'][id^='path_']");
                if (input) {
                    path = input.value.trim();
                }
            }

            chants.push({
                type: "chant",
                name: title.textContent.trim(),
                path: path || "null"
            });
        });
    });

    return chants;
}

function getProgrammeIdFromQuery() {
    return new URLSearchParams(window.location.search).get('programmeId') || '';
}

function getProgrammeApiUrl() {
    var config = window.WEBAPP_CONFIG || {};
    return config.PROGRAMME_API || ((config.BASE_URL || '') + 'webapp/api/programme.php');
}

async function postProgrammeAction(action, params) {
    var body = new FormData();
    body.append('action', action);
    Object.keys(params).forEach(function(key) {
        if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
            body.append(key, params[key]);
        }
    });

    var response = await fetch(getProgrammeApiUrl(), { method: 'POST', body: body, credentials: 'include' });
    var payload = await response.json().catch(function() { return null; });

    if (!response.ok || !payload || !payload.success) {
        throw new Error((payload && payload.message) || ('HTTP ' + response.status));
    }

    return payload;
}

async function enregistrer() {
    updateProgrammeInformationFromForm();
    programme.chants = collectProgramChantsFromDom();

    var programmeId = getProgrammeIdFromQuery();
    if (!programmeId) {
        alert("Aucun programme selectionne.");
        return;
    }

    try {
        await postProgrammeAction('programme_save', {
            id: programmeId,
            date: programme.date,
            lieu: programme.lieu,
            occasion: programme.occasion,
            paroisse: programme.paroisse,
            description: programme.description,
            aelf: programme.aelf ? '1' : '0'
        });

        var payload = await postProgrammeAction('items_set', {
            programme_id: programmeId,
            items: JSON.stringify(programme.chants)
        });

        hasUnsavedChanges = false;

        if (payload.unmatched && payload.unmatched.length) {
            alert("Programme enregistre, mais ces chants sont introuvables dans la base :\n" + payload.unmatched.join("\n"));
            return;
        }

        alert("Programme enregistre, vous pouvez fermer la page");
    } catch (error) {
        alert("Probleme dans l'enregistrement du programme : " + error.message);
    }
}

function visualiser() {
    var programmeId = getProgrammeIdFromQuery();
    if (!programmeId) {
        return;
    }
    window.open("./visualisation.html?programmeId=" + encodeURIComponent(programmeId));
}

/**
 * Builds the legacy `programme` object expected by the form from the database.
 */
async function chargerProgramme() {
    var programmeId = getProgrammeIdFromQuery();
    if (!programmeId) {
        alert("Aucun programme selectionne.");
        return;
    }

    var query = new URLSearchParams({ action: 'detail', id: programmeId }).toString();
    var response = await fetch(getProgrammeApiUrl() + '?' + query, { credentials: 'include' });
    var payload = await response.json().catch(function() { return null; });

    if (!response.ok || !payload || !payload.success) {
        alert("Impossible de charger le programme : " + ((payload && payload.message) || response.status));
        return;
    }

    var detail = payload.programme;
    window.programme = {
        date: detail.date,
        lieu: detail.lieu,
        occasion: detail.occasion,
        paroisse: detail.paroisse,
        description: detail.description || '',
        aelf: Boolean(detail.aelf),
        chants: (payload.items || []).map(function(item) {
            if (item.type === 'partie') {
                return { type: 'partie', name: item.partieNom };
            }
            return {
                type: 'chant',
                name: item.chantNom,
                path: item.nomFichier
                    ? [item.chantPath, item.chantNom, item.nomFichier].filter(Boolean).join('/')
                    : 'null'
            };
        })
    };

    initFormulaire();
}

async function chargerParoisses() {
    var select = document.getElementById('select_paroisse');
    if (!select) {
        return;
    }

    try {
        var response = await fetch(getProgrammeApiUrl() + '?action=list', { credentials: 'include' });
        var payload = await response.json().catch(function() { return null; });
        var paroisses = (payload && payload.paroisses) || [];

        select.innerHTML = '<option>choisissez votre paroisse</option>';
        paroisses.forEach(function(paroisse) {
            var option = document.createElement('option');
            option.value = paroisse;
            option.textContent = paroisse;
            select.appendChild(option);
        });

        if (window.programme) {
            initializeParoisseSelect();
        }
    } catch (error) {
        console.warn('Impossible de charger la liste des paroisses.', error);
    }
}
