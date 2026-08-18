// Program editor
// Edits a Programme row and its ordered Partie / Chant entries.

const layout = document.getElementById('editor-layout');
const programmeForm = document.getElementById('programme-form');
const paroisseSuggestions = document.getElementById('paroisse-suggestions');
const itemsList = document.getElementById('editor-items');
const statusElement = document.getElementById('editor-status');
const addPartieButton = document.getElementById('add-partie');
const addChantButton = document.getElementById('add-chant');
const previewFrame = document.getElementById('editor-preview-frame');
const closePreviewButton = document.getElementById('close-preview');

const chantPickerDialog = document.getElementById('chant-picker-dialog');
const chantPickerForm = document.getElementById('chant-picker-form');
const chantPickerSearch = document.getElementById('chant-picker-search');
const partiePickerDialog = document.getElementById('partie-picker-dialog');
const partiePickerForm = document.getElementById('partie-picker-form');

const WEBAPP_CONFIG = window.WEBAPP_CONFIG || {};
const BASE_URL = WEBAPP_CONFIG.BASE_URL || '';
const PROGRAMME_API = WEBAPP_CONFIG.PROGRAMME_API || `${BASE_URL}webapp/api/programme.php`;
const DATA_API = WEBAPP_CONFIG.DATA_API || `${BASE_URL}webapp/api/data.php`;
const LOCAL_PROGRAMME_API = './api/programme.php';
const LOCAL_DATA_API = './api/data.php';

const programmeId = new URLSearchParams(window.location.search).get('programmeId') || '';

let items = [];
let chantOptions = [];

function setStatus(message, isError = false) {
  statusElement.textContent = message;
  statusElement.classList.toggle('is-error', isError);
}

async function callApi(endpoints, action, params = {}, method = 'GET') {
  const errors = [];

  for (let index = 0; index < endpoints.length; index += 1) {
    const baseUrl = endpoints[index];
    const isLast = index === endpoints.length - 1;

    try {
      let response;

      if (method === 'POST') {
        const body = new FormData();
        body.append('action', action);
        Object.entries(params).forEach(([key, value]) => {
          if (value !== null && value !== undefined && value !== '') {
            body.append(key, value);
          }
        });
        response = await fetch(baseUrl, { method: 'POST', body, credentials: 'include' });
      } else {
        const query = new URLSearchParams({ action, ...params }).toString();
        response = await fetch(`${baseUrl}?${query}`, { credentials: 'include' });
      }

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        if (!isLast && (response.status === 404 || response.status >= 500)) {
          errors.push(`HTTP ${response.status} on ${baseUrl}`);
          continue;
        }
        throw new Error((payload && payload.message) || `HTTP ${response.status}`);
      }

      if (!payload || !payload.success) {
        throw new Error((payload && payload.message) || 'Erreur API');
      }

      return payload;
    } catch (error) {
      if (!isLast) {
        errors.push(`${baseUrl}: ${error.message}`);
        continue;
      }
      throw error;
    }
  }

  throw new Error(errors.join(' | ') || 'API inaccessible');
}

const programmeApi = (action, params, method) => callApi([LOCAL_PROGRAMME_API, PROGRAMME_API], action, params, method);
const dataApi = (action, params, method) => callApi([LOCAL_DATA_API, DATA_API], action, params, method);

function buildFilePath(item) {
  return [item.chantPath, item.chantNom, item.nomFichier].filter(Boolean).join('/');
}

function openPreview(item) {
  const path = buildFilePath(item);
  if (!item.nomFichier || !path) {
    setStatus('Aucun fichier associe a ce chant.', true);
    return;
  }

  layout.classList.remove('is-preview-hidden');
  previewFrame.src = `./visualisation.html?lien=${encodeURIComponent(`/${path}`)}`;
}

function createActionButton(label, title, handler, extraClass = 'btn-ghost') {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `btn ${extraClass}`;
  button.textContent = label;
  button.title = title;
  button.addEventListener('click', handler);
  return button;
}

function renderItems() {
  itemsList.innerHTML = '';

  if (!items.length) {
    const empty = document.createElement('li');
    empty.className = 'editor-item';
    empty.textContent = 'Ce programme est vide.';
    itemsList.appendChild(empty);
    return;
  }

  items.forEach((item) => {
    const row = document.createElement('li');
    row.className = 'editor-item';
    row.classList.toggle('is-partie', item.type === 'partie');

    const label = document.createElement('button');
    label.type = 'button';
    label.className = 'editor-item-label';

    if (item.type === 'partie') {
      label.textContent = item.partieNom;
      label.disabled = true;
    } else {
      label.textContent = item.chantNom;
      const sub = document.createElement('span');
      sub.className = 'editor-item-sub';
      sub.textContent = item.nomFichier ? ` - ${item.nomFichier}` : ' - aucun fichier';
      label.appendChild(sub);
      label.title = 'Afficher le fichier';
      label.addEventListener('click', () => openPreview(item));
    }

    row.appendChild(label);
    row.appendChild(createActionButton('\u2191', 'Monter', () => moveItem(item.position, 'up')));
    row.appendChild(createActionButton('\u2193', 'Descendre', () => moveItem(item.position, 'down')));
    row.appendChild(createActionButton('\u2715', 'Retirer', () => removeItem(item.position), 'btn-danger'));

    itemsList.appendChild(row);
  });
}

async function loadProgramme() {
  if (!programmeId) {
    setStatus('Aucun programme selectionne.', true);
    return;
  }

  try {
    const payload = await programmeApi('detail', { id: programmeId });
    const programme = payload.programme;

    programmeForm.elements.date.value = programme.date;
    programmeForm.elements.lieu.value = programme.lieu;
    programmeForm.elements.occasion.value = programme.occasion;
    programmeForm.elements.paroisse.value = programme.paroisse;

    items = payload.items || [];
    renderItems();
    setStatus(`${items.length} element(s) dans ce programme.`);
  } catch (error) {
    setStatus(error.message, true);
  }
}

async function loadParoisseSuggestions() {
  try {
    const payload = await programmeApi('list');
    paroisseSuggestions.innerHTML = '';
    (payload.paroisses || []).forEach((paroisse) => {
      const option = document.createElement('option');
      option.value = paroisse;
      paroisseSuggestions.appendChild(option);
    });
  } catch {
    // Suggestions are optional.
  }
}

async function moveItem(position, direction) {
  try {
    await programmeApi('item_move', { programme_id: programmeId, position, direction }, 'POST');
    await loadProgramme();
  } catch (error) {
    setStatus(error.message, true);
  }
}

async function removeItem(position) {
  try {
    await programmeApi('item_remove', { programme_id: programmeId, position }, 'POST');
    await loadProgramme();
  } catch (error) {
    setStatus(error.message, true);
  }
}

function renderChantOptions() {
  const select = chantPickerForm.elements.chant_id;
  const filter = chantPickerSearch.value.trim().toLowerCase();
  select.innerHTML = '';

  chantOptions
    .filter((option) => !filter || `${option.path} ${option.nom}`.toLowerCase().includes(filter))
    .forEach((option) => {
      const element = document.createElement('option');
      element.value = String(option.id);
      element.textContent = option.path ? `${option.path} / ${option.nom}` : option.nom;
      select.appendChild(element);
    });
}

async function renderFichierOptions() {
  const select = chantPickerForm.elements.fichier_id;
  const chantId = chantPickerForm.elements.chant_id.value;
  select.innerHTML = '';

  const noneOption = document.createElement('option');
  noneOption.value = '';
  noneOption.textContent = 'Aucun fichier';
  select.appendChild(noneOption);

  if (!chantId) {
    return;
  }

  try {
    const payload = await dataApi('files', { chant_id: chantId });
    (payload.files || []).forEach((file) => {
      const element = document.createElement('option');
      element.value = String(file.id);
      element.textContent = file.nomFichier;
      select.appendChild(element);
    });
  } catch (error) {
    setStatus(error.message, true);
  }
}

async function openChantPicker() {
  chantPickerSearch.value = '';

  try {
    const payload = await dataApi('chant_options');
    chantOptions = payload.chants || [];
    renderChantOptions();
    await renderFichierOptions();
    chantPickerDialog.showModal();
  } catch (error) {
    setStatus(error.message, true);
  }
}

async function openPartiePicker() {
  try {
    const payload = await programmeApi('parties');
    const select = partiePickerForm.elements.partie_id;
    select.innerHTML = '';

    (payload.parties || []).forEach((partie) => {
      const option = document.createElement('option');
      option.value = String(partie.id);
      option.textContent = partie.nom;
      select.appendChild(option);
    });

    partiePickerForm.elements.nouvelle_partie.value = '';
    partiePickerDialog.showModal();
  } catch (error) {
    setStatus(error.message, true);
  }
}

programmeForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  try {
    await programmeApi('programme_save', {
      id: programmeId,
      date: programmeForm.elements.date.value,
      lieu: programmeForm.elements.lieu.value.trim(),
      occasion: programmeForm.elements.occasion.value.trim(),
      paroisse: programmeForm.elements.paroisse.value.trim(),
    }, 'POST');
    setStatus('Informations enregistrees.');
  } catch (error) {
    setStatus(error.message, true);
  }
});

chantPickerForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  try {
    await programmeApi('item_add_chant', {
      programme_id: programmeId,
      chant_id: chantPickerForm.elements.chant_id.value,
      fichier_id: chantPickerForm.elements.fichier_id.value,
    }, 'POST');
    chantPickerDialog.close();
    await loadProgramme();
  } catch (error) {
    setStatus(error.message, true);
  }
});

partiePickerForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const newName = partiePickerForm.elements.nouvelle_partie.value.trim();

  try {
    let partieId = partiePickerForm.elements.partie_id.value;

    if (newName) {
      const created = await programmeApi('partie_save', { nom: newName }, 'POST');
      partieId = created.id;
    }

    if (!partieId) {
      setStatus('Choisissez une partie ou saisissez un nom.', true);
      return;
    }

    await programmeApi('item_add_partie', { programme_id: programmeId, partie_id: partieId }, 'POST');
    partiePickerDialog.close();
    await loadProgramme();
  } catch (error) {
    setStatus(error.message, true);
  }
});

chantPickerSearch.addEventListener('input', () => {
  renderChantOptions();
  renderFichierOptions();
});

chantPickerForm.elements.chant_id.addEventListener('change', () => {
  renderFichierOptions();
});

document.querySelectorAll('[data-close-dialog]').forEach((button) => {
  button.addEventListener('click', () => {
    button.closest('dialog').close();
  });
});

addChantButton.addEventListener('click', openChantPicker);
addPartieButton.addEventListener('click', openPartiePicker);

closePreviewButton.addEventListener('click', () => {
  layout.classList.add('is-preview-hidden');
  previewFrame.src = 'about:blank';
});

loadParoisseSuggestions();
loadProgramme();
