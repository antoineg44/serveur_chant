// Library Module
// Database-backed program management: Programme -> ordered Partie / Chant entries

const paroisseFilter = document.getElementById('library-paroisse-filter');
const searchInput = document.getElementById('library-search-input');
const libraryBody = document.getElementById('library-body');
const statusElement = document.getElementById('library-status');
const countElement = document.getElementById('library-count');
const createButton = document.getElementById('library-create-program');
const deleteButton = document.getElementById('library-delete');
const partiesButton = document.getElementById('library-manage-parties');
const partieCategoriesButton = document.getElementById('library-manage-partie-categories');
const refreshButton = document.getElementById('library-refresh');

const partiesDialog = document.getElementById('parties-dialog');
const partieCreateForm = document.getElementById('partie-create-form');
const partiesList = document.getElementById('parties-list');

const partieCategoriesDialog = document.getElementById('partie-categories-dialog');
const partieCategoriesListEl = document.getElementById('partie-categories-list');
const partieCategoriesSaveButton = document.getElementById('partie-categories-save');

const WEBAPP_CONFIG = window.WEBAPP_CONFIG || {};
const BASE_URL = WEBAPP_CONFIG.BASE_URL || '';
const PROGRAMME_API = WEBAPP_CONFIG.PROGRAMME_API || `${BASE_URL}webapp/api/programme.php`;
const LOCAL_PROGRAMME_API = './api/programme.php';
const TABLE_COLUMN_COUNT = 5;

let programmes = [];
let paroisses = [];
let selectedProgrammeId = null;
let searchTerm = '';
let searchDebounceTimer = null;

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
    const row = document.createElement('tr');
    row.classList.toggle('is-selected', programme.id === selectedProgrammeId);
    row.addEventListener('click', () => {
      selectedProgrammeId = programme.id;
      renderProgrammes();
      updateActionButtons();
      openProgrammeInfo(programme);
    });

    row.appendChild(createCell(formatDate(programme.date)));
    row.appendChild(createCell(programme.lieu || '-'));
    row.appendChild(createCell(programme.occasion || '-'));
    row.appendChild(createCell(programme.paroisse || '-'));
    row.appendChild(createCell(`${programme.partieCount} partie(s), ${programme.chantCount} chant(s)`));

    libraryBody.appendChild(row);
  });

  countElement.textContent = `${programmes.length} programme${programmes.length > 1 ? 's' : ''}`;
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

    renderParoisseOptions();
    renderProgrammes();
    updateActionButtons();
    setStatus(`${programmes.length} programme(s) charge(s).`);
  } catch (error) {
    setStatus(error.message, true);
  }
}

async function refreshPartiesList() {
  try {
    const payload = await programmeApi('parties');
    const parties = payload.parties || [];
    partiesList.innerHTML = '';

    parties.forEach((partie) => {
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

document.querySelectorAll('[data-close-dialog]').forEach((button) => {
  button.addEventListener('click', () => {
    button.closest('dialog').close();
  });
});

createButton.addEventListener('click', () => {
  const url = './create.html';

  if (window.parent && window.parent !== window) {
    window.parent.postMessage({ type: 'openMesseInfoModal', item: { url, title: 'Nouveau programme' } }, '*');
    return;
  }

  window.open(url, '_blank', 'noopener,noreferrer');
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
    await loadProgrammes();
  } catch (error) {
    setStatus(error.message, true);
  }
});

partiesButton.addEventListener('click', async () => {
  await refreshPartiesList();
  partiesDialog.showModal();
});

async function loadPartieCategories() {
  try {
    const payload = await programmeApi('partie_categories');
    const parties = payload.parties || [];
    const categories = payload.categories || [];
    partieCategoriesListEl.innerHTML = '';

    if (!parties.length) {
      partieCategoriesListEl.innerHTML = '<p class="hint">Aucune partie enregistree.</p>';
      return;
    }

    parties.forEach((partie) => {
      const row = document.createElement('div');
      row.className = 'partie-categories-row';

      const label = document.createElement('strong');
      label.textContent = partie.nom;
      row.appendChild(label);

      const select = document.createElement('select');
      select.multiple = true;
      select.size = Math.min(6, Math.max(3, categories.length));
      select.dataset.partieId = String(partie.id);

      categories.forEach((categorie) => {
        const option = document.createElement('option');
        option.value = String(categorie.id);
        option.textContent = categorie.nom;
        option.selected = partie.categorieIds.includes(categorie.id);
        select.appendChild(option);
      });

      row.appendChild(select);
      partieCategoriesListEl.appendChild(row);
    });
  } catch (error) {
    setStatus(error.message, true);
  }
}

partieCategoriesSaveButton.addEventListener('click', async () => {
  const mapping = {};

  partieCategoriesListEl.querySelectorAll('select[data-partie-id]').forEach((select) => {
    mapping[select.dataset.partieId] = Array.from(select.selectedOptions).map((option) => Number(option.value));
  });

  try {
    await programmeApi('partie_categories_save', { mapping: JSON.stringify(mapping) }, 'POST');
    partieCategoriesDialog.close();
  } catch (error) {
    setStatus(error.message, true);
  }
});

partieCategoriesButton.addEventListener('click', async () => {
  await loadPartieCategories();
  partieCategoriesDialog.showModal();
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
