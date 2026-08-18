// Library Module
// Database-backed program management: Programme -> ordered Partie / Chant entries

const paroisseFilter = document.getElementById('library-paroisse-filter');
const searchInput = document.getElementById('library-search-input');
const libraryBody = document.getElementById('library-body');
const statusElement = document.getElementById('library-status');
const countElement = document.getElementById('library-count');
const createButton = document.getElementById('library-create-program');
const editButton = document.getElementById('library-edit-program');
const deleteButton = document.getElementById('library-delete');
const partiesButton = document.getElementById('library-manage-parties');
const refreshButton = document.getElementById('library-refresh');

const programmeDialog = document.getElementById('programme-dialog');
const programmeForm = document.getElementById('programme-form');
const programmeDialogTitle = document.getElementById('programme-dialog-title');
const paroisseSuggestions = document.getElementById('paroisse-suggestions');

const chantPickerDialog = document.getElementById('chant-picker-dialog');
const chantPickerForm = document.getElementById('chant-picker-form');
const chantPickerSearch = document.getElementById('chant-picker-search');

const partiePickerDialog = document.getElementById('partie-picker-dialog');
const partiePickerForm = document.getElementById('partie-picker-form');

const partiesDialog = document.getElementById('parties-dialog');
const partieCreateForm = document.getElementById('partie-create-form');
const partiesList = document.getElementById('parties-list');

const WEBAPP_CONFIG = window.WEBAPP_CONFIG || {};
const BASE_URL = WEBAPP_CONFIG.BASE_URL || '';
const PROGRAMME_API = WEBAPP_CONFIG.PROGRAMME_API || `${BASE_URL}webapp/api/programme.php`;
const DATA_API = WEBAPP_CONFIG.DATA_API || `${BASE_URL}webapp/api/data.php`;
const LOCAL_PROGRAMME_API = './api/programme.php';
const LOCAL_DATA_API = './api/data.php';
const TABLE_COLUMN_COUNT = 5;

let programmes = [];
let paroisses = [];
let selectedProgrammeId = null;
let expandedProgrammeId = null;
let searchTerm = '';
let searchDebounceTimer = null;
let editingProgrammeId = null;
let pickerProgrammeId = null;
let chantOptions = [];
let partieOptions = [];

function setStatus(message, isError = false) {
  statusElement.textContent = message;
  statusElement.classList.toggle('is-error', isError);
}

function formatDate(value) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value || '-';
  }
  return date.toLocaleDateString('fr-FR');
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

function getSelectedProgramme() {
  return programmes.find((programme) => programme.id === selectedProgrammeId) || null;
}

function openProgrammeInfo(programme) {
  const url = `./informations.html?programmeId=${encodeURIComponent(programme.id)}`;
  const title = [formatDate(programme.date), programme.lieu, programme.occasion].filter(Boolean).join(' - ');

  if (window.parent && window.parent !== window) {
    window.parent.postMessage({ type: 'openMesseInfoModal', item: { url, title } }, '*');
    return;
  }

  window.open(url, '_blank', 'noopener,noreferrer');
}

function updateActionButtons() {
  const selected = getSelectedProgramme();
  editButton.disabled = !selected;
  deleteButton.disabled = !selected;
}

function createCell(text) {
  const cell = document.createElement('td');
  cell.textContent = text;
  return cell;
}

function renderParoisseOptions() {
  const previous = paroisseFilter.value;
  paroisseFilter.innerHTML = '';

  const allOption = document.createElement('option');
  allOption.value = '';
  allOption.textContent = 'Toutes les paroisses';
  paroisseFilter.appendChild(allOption);

  paroisses.forEach((paroisse) => {
    const option = document.createElement('option');
    option.value = paroisse;
    option.textContent = paroisse;
    paroisseFilter.appendChild(option);
  });

  paroisseFilter.value = paroisses.includes(previous) ? previous : '';

  paroisseSuggestions.innerHTML = '';
  paroisses.forEach((paroisse) => {
    const option = document.createElement('option');
    option.value = paroisse;
    paroisseSuggestions.appendChild(option);
  });
}

function renderProgrammes() {
  libraryBody.innerHTML = '';

  if (!programmes.length) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = TABLE_COLUMN_COUNT;
    cell.className = 'empty-cell';
    cell.textContent = 'Aucun programme.';
    row.appendChild(cell);
    libraryBody.appendChild(row);
    countElement.textContent = '0 programme';
    return;
  }

  programmes.forEach((programme) => {
    const toggleProgramme = () => {
      selectedProgrammeId = programme.id;
      expandedProgrammeId = expandedProgrammeId === programme.id ? null : programme.id;
      renderProgrammes();
      updateActionButtons();
      if (expandedProgrammeId === programme.id) {
        loadProgrammeDetail(programme.id);
      }
    };

    const row = document.createElement('tr');
    row.classList.toggle('is-selected', programme.id === selectedProgrammeId);
    row.addEventListener('click', () => {
      selectedProgrammeId = programme.id;
      renderProgrammes();
      updateActionButtons();
      openProgrammeInfo(programme);
    });

    const dateCell = document.createElement('td');
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'library-expand';
    toggle.textContent = expandedProgrammeId === programme.id ? '\u25BE' : '\u25B8';
    toggle.setAttribute('aria-expanded', String(expandedProgrammeId === programme.id));
    toggle.title = 'Afficher le contenu';
    toggle.addEventListener('click', (event) => {
      event.stopPropagation();
      toggleProgramme();
    });
    dateCell.appendChild(toggle);
    dateCell.appendChild(document.createTextNode(formatDate(programme.date)));
    row.appendChild(dateCell);

    row.appendChild(createCell(programme.lieu || '-'));
    row.appendChild(createCell(programme.occasion || '-'));
    row.appendChild(createCell(programme.paroisse || '-'));
    row.appendChild(createCell(`${programme.partieCount} partie(s), ${programme.chantCount} chant(s)`));

    libraryBody.appendChild(row);

    if (expandedProgrammeId === programme.id) {
      libraryBody.appendChild(createDetailRow(programme));
    }
  });

  countElement.textContent = `${programmes.length} programme${programmes.length > 1 ? 's' : ''}`;
}

function createDetailRow(programme) {
  const row = document.createElement('tr');
  row.className = 'library-detail-row';

  const cell = document.createElement('td');
  cell.colSpan = TABLE_COLUMN_COUNT;
  cell.addEventListener('click', (event) => event.stopPropagation());

  const toolbar = document.createElement('div');
  toolbar.className = 'library-detail-toolbar';

  const addPartie = document.createElement('button');
  addPartie.type = 'button';
  addPartie.className = 'btn btn-ghost';
  addPartie.textContent = 'Ajouter une partie';
  addPartie.addEventListener('click', () => openPartiePicker(programme.id));

  const addChant = document.createElement('button');
  addChant.type = 'button';
  addChant.className = 'btn';
  addChant.textContent = 'Ajouter un chant';
  addChant.addEventListener('click', () => openChantPicker(programme.id));

  toolbar.appendChild(addPartie);
  toolbar.appendChild(addChant);
  cell.appendChild(toolbar);

  const container = document.createElement('div');
  container.dataset.itemsContainer = String(programme.id);
  container.textContent = 'Chargement du programme...';
  cell.appendChild(container);

  row.appendChild(cell);
  return row;
}

function renderItems(programmeId, items) {
  const container = libraryBody.querySelector(`[data-items-container="${programmeId}"]`);
  if (!container) {
    return;
  }

  container.innerHTML = '';

  if (!items.length) {
    container.textContent = 'Ce programme est vide.';
    return;
  }

  const table = document.createElement('table');
  table.className = 'library-items-table';

  const head = document.createElement('thead');
  const headRow = document.createElement('tr');
  ['#', 'Type', 'Contenu', 'Fichier', 'Actions'].forEach((label) => {
    const th = document.createElement('th');
    th.textContent = label;
    headRow.appendChild(th);
  });
  head.appendChild(headRow);
  table.appendChild(head);

  const body = document.createElement('tbody');

  items.forEach((item) => {
    const row = document.createElement('tr');
    row.classList.toggle('is-partie', item.type === 'partie');

    row.appendChild(createCell(String(item.position)));
    row.appendChild(createCell(item.type === 'partie' ? 'Partie' : 'Chant'));

    if (item.type === 'partie') {
      row.appendChild(createCell(item.partieNom));
      row.appendChild(createCell('-'));
    } else {
      row.appendChild(createCell(item.chantPath ? `${item.chantPath} / ${item.chantNom}` : item.chantNom));
      row.appendChild(createCell(item.nomFichier || '-'));
    }

    const actions = document.createElement('td');
    actions.appendChild(createItemButton('\u2191', 'Monter', () => moveItem(programmeId, item.position, 'up')));
    actions.appendChild(createItemButton('\u2193', 'Descendre', () => moveItem(programmeId, item.position, 'down')));
    actions.appendChild(createItemButton('\u2715', 'Retirer', () => removeItem(programmeId, item.position), 'btn-danger'));
    row.appendChild(actions);

    body.appendChild(row);
  });

  table.appendChild(body);
  container.appendChild(table);
}

function createItemButton(label, title, handler, extraClass = 'btn-ghost') {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `btn ${extraClass}`;
  button.textContent = label;
  button.title = title;
  button.addEventListener('click', handler);
  return button;
}

async function loadProgrammeDetail(programmeId) {
  try {
    const payload = await programmeApi('detail', { id: programmeId });
    renderItems(programmeId, payload.items || []);
  } catch (error) {
    const container = libraryBody.querySelector(`[data-items-container="${programmeId}"]`);
    if (container) {
      container.textContent = error.message;
    }
    setStatus(error.message, true);
  }
}

async function loadProgrammes() {
  setStatus('Chargement de la bibliotheque...');

  try {
    const payload = await programmeApi('list', {
      paroisse: paroisseFilter.value,
      q: searchTerm,
    });

    programmes = payload.programmes || [];
    paroisses = payload.paroisses || [];

    if (!programmes.some((programme) => programme.id === selectedProgrammeId)) {
      selectedProgrammeId = null;
    }
    if (!programmes.some((programme) => programme.id === expandedProgrammeId)) {
      expandedProgrammeId = null;
    }

    renderParoisseOptions();
    renderProgrammes();
    updateActionButtons();
    setStatus(`${programmes.length} programme(s) charge(s).`);

    if (expandedProgrammeId !== null) {
      loadProgrammeDetail(expandedProgrammeId);
    }
  } catch (error) {
    setStatus(error.message, true);
  }
}

async function moveItem(programmeId, position, direction) {
  try {
    await programmeApi('item_move', { programme_id: programmeId, position, direction }, 'POST');
    await loadProgrammes();
  } catch (error) {
    setStatus(error.message, true);
  }
}

async function removeItem(programmeId, position) {
  try {
    await programmeApi('item_remove', { programme_id: programmeId, position }, 'POST');
    await loadProgrammes();
  } catch (error) {
    setStatus(error.message, true);
  }
}

function openProgrammeDialog(programme) {
  editingProgrammeId = programme ? programme.id : null;
  programmeDialogTitle.textContent = programme ? 'Modifier le programme' : 'Nouveau programme';
  programmeForm.elements.date.value = programme ? programme.date : new Date().toISOString().slice(0, 10);
  programmeForm.elements.lieu.value = programme ? programme.lieu : '';
  programmeForm.elements.occasion.value = programme ? programme.occasion : '';
  programmeForm.elements.paroisse.value = programme ? programme.paroisse : '';
  programmeDialog.showModal();
}

async function openChantPicker(programmeId) {
  pickerProgrammeId = programmeId;
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

async function openPartiePicker(programmeId) {
  pickerProgrammeId = programmeId;

  try {
    const payload = await programmeApi('parties');
    partieOptions = payload.parties || [];

    const select = partiePickerForm.elements.partie_id;
    select.innerHTML = '';
    partieOptions.forEach((partie) => {
      const element = document.createElement('option');
      element.value = String(partie.id);
      element.textContent = partie.nom;
      select.appendChild(element);
    });

    partiePickerDialog.showModal();
  } catch (error) {
    setStatus(error.message, true);
  }
}

async function refreshPartiesList() {
  try {
    const payload = await programmeApi('parties');
    partieOptions = payload.parties || [];
    partiesList.innerHTML = '';

    partieOptions.forEach((partie) => {
      const item = document.createElement('li');
      item.textContent = partie.nom;

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'btn btn-danger';
      remove.textContent = 'Supprimer';
      remove.addEventListener('click', async () => {
        if (!window.confirm(`Supprimer la partie "${partie.nom}" ?`)) {
          return;
        }
        try {
          await programmeApi('partie_delete', { id: partie.id }, 'POST');
          await refreshPartiesList();
          await loadProgrammes();
        } catch (error) {
          setStatus(error.message, true);
        }
      });

      item.appendChild(remove);
      partiesList.appendChild(item);
    });
  } catch (error) {
    setStatus(error.message, true);
  }
}

programmeForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const payload = {
    date: programmeForm.elements.date.value,
    lieu: programmeForm.elements.lieu.value.trim(),
    occasion: programmeForm.elements.occasion.value.trim(),
    paroisse: programmeForm.elements.paroisse.value.trim(),
  };
  if (editingProgrammeId !== null) {
    payload.id = editingProgrammeId;
  }

  try {
    await programmeApi('programme_save', payload, 'POST');
    programmeDialog.close();
    await loadProgrammes();
  } catch (error) {
    setStatus(error.message, true);
  }
});

chantPickerForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  try {
    await programmeApi('item_add_chant', {
      programme_id: pickerProgrammeId,
      chant_id: chantPickerForm.elements.chant_id.value,
      fichier_id: chantPickerForm.elements.fichier_id.value,
    }, 'POST');
    chantPickerDialog.close();
    await loadProgrammes();
  } catch (error) {
    setStatus(error.message, true);
  }
});

partiePickerForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  try {
    await programmeApi('item_add_partie', {
      programme_id: pickerProgrammeId,
      partie_id: partiePickerForm.elements.partie_id.value,
    }, 'POST');
    partiePickerDialog.close();
    await loadProgrammes();
  } catch (error) {
    setStatus(error.message, true);
  }
});

partieCreateForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  try {
    await programmeApi('partie_save', { nom: partieCreateForm.elements.nom.value.trim() }, 'POST');
    partieCreateForm.reset();
    await refreshPartiesList();
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

createButton.addEventListener('click', () => openProgrammeDialog(null));

editButton.addEventListener('click', () => {
  const programme = getSelectedProgramme();
  if (programme) {
    openProgrammeDialog(programme);
  }
});

deleteButton.addEventListener('click', async () => {
  const programme = getSelectedProgramme();
  if (!programme) {
    return;
  }

  if (!window.confirm(`Supprimer le programme du ${formatDate(programme.date)} ?`)) {
    return;
  }

  try {
    await programmeApi('programme_delete', { id: programme.id }, 'POST');
    selectedProgrammeId = null;
    expandedProgrammeId = null;
    await loadProgrammes();
  } catch (error) {
    setStatus(error.message, true);
  }
});

partiesButton.addEventListener('click', async () => {
  await refreshPartiesList();
  partiesDialog.showModal();
});

refreshButton.addEventListener('click', () => loadProgrammes());

paroisseFilter.addEventListener('change', () => loadProgrammes());

searchInput.addEventListener('input', () => {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer);
  }

  searchDebounceTimer = setTimeout(() => {
    searchTerm = searchInput.value.trim();
    loadProgrammes();
  }, 250);
});

loadProgrammes();
