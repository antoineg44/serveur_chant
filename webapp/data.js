// Data Explorer Module
// Database-backed explorer: Path folders -> Chant -> Fichier

const goUpButton = document.getElementById('go-up');
const refreshButton = document.getElementById('refresh-list');
const newChantButton = document.getElementById('new-chant');
const editChantButton = document.getElementById('edit-chant');
const deleteChantButton = document.getElementById('delete-chant');
const seedButton = document.getElementById('seed-database');
const searchInput = document.getElementById('data-search-input');
const dataBody = document.getElementById('data-body');
const breadcrumbs = document.getElementById('breadcrumbs');
const statusElement = document.getElementById('data-status');
const chantDialog = document.getElementById('chant-dialog');
const chantForm = document.getElementById('chant-form');
const chantDialogTitle = document.getElementById('chant-dialog-title');
const fileDialog = document.getElementById('file-dialog');
const fileForm = document.getElementById('file-form');
const fileDialogTitle = document.getElementById('file-dialog-title');

const WEBAPP_CONFIG = window.WEBAPP_CONFIG || {};
const BASE_URL = WEBAPP_CONFIG.BASE_URL || '';
const LOCAL_API_URL = './api/data.php';
const REMOTE_API_URL = WEBAPP_CONFIG.DATA_API || `${BASE_URL}webapp/api/data.php`;
const TABLE_COLUMN_COUNT = 6;

let activeApiUrl = LOCAL_API_URL;
let currentPath = '';
let parentPath = null;
let canEdit = false;
let folders = [];
let chants = [];
let selectedChantId = null;
let expandedChantId = null;
let searchTerm = '';
let searchDebounceTimer = null;
let searchRequestId = 0;
let editingChantId = null;
let editingFileContext = null;

function normalizePath(value) {
  return String(value || '')
    .replaceAll('\\', '/')
    .replace(/^\/+|\/+$/g, '')
    .replace(/\/+/g, '/');
}

function setStatus(message, isError = false) {
  statusElement.textContent = message;
  statusElement.classList.toggle('is-error', isError);
}

function formatDate(value) {
  if (!value) {
    return '-';
  }
  const date = new Date(String(value).replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return date.toLocaleString('fr-FR');
}

function formatCote(value) {
  if (value === null || value === undefined) {
    return '-';
  }
  return `${value}/5`;
}

function encodeQuery(params) {
  return new URLSearchParams(params).toString();
}

function getApiCandidates() {
  if (activeApiUrl === REMOTE_API_URL) {
    return [REMOTE_API_URL, LOCAL_API_URL];
  }
  return [LOCAL_API_URL, REMOTE_API_URL];
}

async function fetchWithFallback(buildRequest) {
  const candidates = getApiCandidates();
  const errors = [];

  for (let index = 0; index < candidates.length; index += 1) {
    const baseUrl = candidates[index];
    const request = buildRequest(baseUrl);
    const isLastCandidate = index === candidates.length - 1;

    try {
      const response = await fetch(request.url, {
        ...(request.options || {}),
        credentials: 'include',
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        // Only fall back when the endpoint itself looks unavailable.
        if (!isLastCandidate && (response.status === 404 || response.status >= 500)) {
          errors.push(`HTTP ${response.status} on ${baseUrl}`);
          continue;
        }
        throw new Error((payload && payload.message) || `HTTP ${response.status}`);
      }

      if (!payload || !payload.success) {
        throw new Error((payload && payload.message) || 'Erreur API');
      }

      activeApiUrl = baseUrl;
      return payload;
    } catch (error) {
      if (!isLastCandidate) {
        errors.push(`${baseUrl}: ${error.message}`);
        continue;
      }
      throw error;
    }
  }

  throw new Error(errors.join(' | ') || 'API inaccessible');
}

async function apiGet(action, params = {}) {
  const query = encodeQuery({ action, ...params });
  return fetchWithFallback((baseUrl) => ({ url: `${baseUrl}?${query}` }));
}

async function apiPost(action, data) {
  return fetchWithFallback((baseUrl) => {
    const formData = new FormData();
    formData.append('action', action);
    Object.entries(data).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        formData.append(key, value);
      }
    });

    return {
      url: baseUrl,
      options: { method: 'POST', body: formData },
    };
  });
}

function renderBreadcrumbs() {
  breadcrumbs.innerHTML = '';

  const segments = currentPath ? currentPath.split('/') : [];
  const crumbs = [{ label: 'Racine', path: '' }];

  segments.forEach((segment, index) => {
    crumbs.push({ label: segment, path: segments.slice(0, index + 1).join('/') });
  });

  crumbs.forEach((crumb, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'crumb';
    button.textContent = crumb.label;
    button.addEventListener('click', () => {
      clearSearchFilter();
      loadPath(crumb.path);
    });
    breadcrumbs.appendChild(button);

    if (index < crumbs.length - 1) {
      const separator = document.createElement('span');
      separator.className = 'crumb-sep';
      separator.textContent = '/';
      breadcrumbs.appendChild(separator);
    }
  });
}

function updateActionButtons() {
  newChantButton.disabled = !canEdit;
  const selected = getSelectedChant();
  editChantButton.disabled = !canEdit || !selected;
  deleteChantButton.disabled = !canEdit || !selected;
  seedButton.disabled = !canEdit;
  goUpButton.disabled = Boolean(searchTerm) || parentPath === null;
}

function getSelectedChant() {
  return chants.find((chant) => chant.id === selectedChantId) || null;
}

function createCell(text, className) {
  const cell = document.createElement('td');
  cell.textContent = text;
  if (className) {
    cell.className = className;
  }
  return cell;
}

function renderList() {
  dataBody.innerHTML = '';

  if (!searchTerm) {
    folders.forEach((folder) => {
      const row = document.createElement('tr');
      row.className = 'is-folder';

      const nameCell = document.createElement('td');
      const link = document.createElement('button');
      link.type = 'button';
      link.className = 'crumb';
      link.textContent = `\u{1F4C1} ${folder.name}`;
      link.addEventListener('click', () => loadPath(folder.path));
      nameCell.appendChild(link);

      row.appendChild(nameCell);
      row.appendChild(createCell('Dossier'));
      row.appendChild(createCell('-'));
      row.appendChild(createCell('-'));
      row.appendChild(createCell('-'));
      row.appendChild(createCell('-'));
      dataBody.appendChild(row);
    });
  }

  chants.forEach((chant) => {
    const row = document.createElement('tr');
    row.classList.toggle('is-selected', chant.id === selectedChantId);
    row.addEventListener('click', () => {
      selectedChantId = chant.id;
      renderList();
      updateActionButtons();
    });

    const nameCell = document.createElement('td');
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'data-expand';
    toggle.setAttribute('aria-expanded', String(expandedChantId === chant.id));
    toggle.textContent = expandedChantId === chant.id ? '\u25BE' : '\u25B8';
    toggle.title = 'Afficher les fichiers';
    toggle.addEventListener('click', (event) => {
      event.stopPropagation();
      selectedChantId = chant.id;
      expandedChantId = expandedChantId === chant.id ? null : chant.id;
      renderList();
      updateActionButtons();
      if (expandedChantId === chant.id) {
        loadFiles(chant.id);
      }
    });
    nameCell.appendChild(toggle);
    nameCell.appendChild(document.createTextNode(chant.nom));
    row.appendChild(nameCell);

    row.appendChild(createCell('Chant'));
    row.appendChild(createCell(formatCote(chant.cote)));
    row.appendChild(createCell(String(chant.fileCount)));
    row.appendChild(createCell(formatDate(chant.dateAjout)));
    row.appendChild(createCell(searchTerm ? `/${chant.path}` : (chant.informations || '-')));

    dataBody.appendChild(row);

    if (expandedChantId === chant.id) {
      dataBody.appendChild(createFilesRow(chant));
    }
  });

  if (!dataBody.children.length) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = TABLE_COLUMN_COUNT;
    cell.textContent = searchTerm ? 'Aucun resultat.' : 'Aucun element dans ce dossier.';
    row.appendChild(cell);
    dataBody.appendChild(row);
  }
}

function createFilesRow(chant) {
  const row = document.createElement('tr');
  row.className = 'data-files-row';
  row.dataset.filesFor = String(chant.id);

  const cell = document.createElement('td');
  cell.colSpan = TABLE_COLUMN_COUNT;

  const toolbar = document.createElement('div');
  toolbar.className = 'data-files-toolbar';

  const title = document.createElement('strong');
  title.textContent = `Fichiers de "${chant.nom}"`;
  toolbar.appendChild(title);

  if (canEdit) {
    const addButton = document.createElement('button');
    addButton.type = 'button';
    addButton.className = 'btn';
    addButton.textContent = 'Ajouter un fichier';
    addButton.addEventListener('click', (event) => {
      event.stopPropagation();
      openFileDialog(chant, null);
    });
    toolbar.appendChild(addButton);
  }

  cell.appendChild(toolbar);

  const container = document.createElement('div');
  container.dataset.filesContainer = String(chant.id);
  container.textContent = 'Chargement des fichiers...';
  cell.appendChild(container);

  row.appendChild(cell);
  return row;
}

function renderFiles(chant, files) {
  const container = dataBody.querySelector(`[data-files-container="${chant.id}"]`);
  if (!container) {
    return;
  }

  container.innerHTML = '';

  if (!files.length) {
    container.textContent = 'Aucun fichier lie a ce chant.';
    return;
  }

  const table = document.createElement('table');
  table.className = 'data-files-table';

  const head = document.createElement('thead');
  const headRow = document.createElement('tr');
  const headers = ['Nom du fichier', 'Tonalite', 'Accords', 'Nb voix', 'Date d\'ajout', 'Informations'];
  if (canEdit) {
    headers.push('Actions');
  }
  headers.forEach((label) => {
    const th = document.createElement('th');
    th.textContent = label;
    headRow.appendChild(th);
  });
  head.appendChild(headRow);
  table.appendChild(head);

  const body = document.createElement('tbody');
  files.forEach((file) => {
    const row = document.createElement('tr');
    row.appendChild(createCell(file.nomFichier));
    row.appendChild(createCell(file.tonalite || '-'));
    row.appendChild(createCell(file.accords ? 'Oui' : 'Non'));
    row.appendChild(createCell(file.nbVoix === null ? '-' : String(file.nbVoix)));
    row.appendChild(createCell(formatDate(file.dateAjout)));
    row.appendChild(createCell(file.informations || '-'));

    if (canEdit) {
      const actions = document.createElement('td');

      const editButton = document.createElement('button');
      editButton.type = 'button';
      editButton.className = 'btn btn-ghost';
      editButton.textContent = 'Modifier';
      editButton.addEventListener('click', (event) => {
        event.stopPropagation();
        openFileDialog(chant, file);
      });

      const removeButton = document.createElement('button');
      removeButton.type = 'button';
      removeButton.className = 'btn btn-danger';
      removeButton.textContent = 'Supprimer';
      removeButton.addEventListener('click', async (event) => {
        event.stopPropagation();
        if (!window.confirm(`Supprimer le fichier "${file.nomFichier}" ?`)) {
          return;
        }
        try {
          await apiPost('file_delete', { id: file.id });
          await refreshCurrentView();
        } catch (error) {
          setStatus(error.message, true);
        }
      });

      actions.appendChild(editButton);
      actions.appendChild(removeButton);
      row.appendChild(actions);
    }

    body.appendChild(row);
  });

  table.appendChild(body);
  container.appendChild(table);
}

async function loadFiles(chantId) {
  const chant = chants.find((item) => item.id === chantId);
  if (!chant) {
    return;
  }

  try {
    const payload = await apiGet('files', { chant_id: chantId });
    renderFiles(chant, payload.files || []);
  } catch (error) {
    const container = dataBody.querySelector(`[data-files-container="${chantId}"]`);
    if (container) {
      container.textContent = error.message;
    }
    setStatus(error.message, true);
  }
}

async function loadPath(pathValue) {
  const targetPath = normalizePath(pathValue);
  setStatus('Chargement...');

  try {
    const payload = await apiGet('list', { path: targetPath });
    currentPath = payload.path || '';
    parentPath = payload.parent === undefined ? null : payload.parent;
    canEdit = Boolean(payload.canEdit);
    folders = payload.folders || [];
    chants = payload.chants || [];

    if (!chants.some((chant) => chant.id === selectedChantId)) {
      selectedChantId = null;
    }
    if (!chants.some((chant) => chant.id === expandedChantId)) {
      expandedChantId = null;
    }

    renderBreadcrumbs();
    renderList();
    updateActionButtons();
    setStatus(`${folders.length} dossier(s) et ${chants.length} chant(s) dans /${currentPath}.`);

    if (expandedChantId !== null) {
      loadFiles(expandedChantId);
    }
  } catch (error) {
    setStatus(error.message, true);
  }
}

async function runSearch() {
  const requestId = ++searchRequestId;
  setStatus('Recherche en cours...');

  try {
    const payload = await apiGet('search', { q: searchTerm });
    if (requestId !== searchRequestId) {
      return;
    }

    canEdit = Boolean(payload.canEdit);
    folders = [];
    chants = payload.chants || [];
    selectedChantId = null;
    expandedChantId = null;

    renderList();
    updateActionButtons();
    setStatus(`${chants.length} chant(s) trouve(s).`);
  } catch (error) {
    if (requestId === searchRequestId) {
      setStatus(error.message, true);
    }
  }
}

function clearSearchFilter() {
  searchTerm = '';
  searchRequestId += 1;
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = null;
  }
  if (searchInput) {
    searchInput.value = '';
  }
}

async function refreshCurrentView() {
  if (searchTerm) {
    await runSearch();
    return;
  }
  await loadPath(currentPath);
}

function openChantDialog(chant) {
  editingChantId = chant ? chant.id : null;
  chantDialogTitle.textContent = chant ? 'Modifier le chant' : 'Nouveau chant';
  chantForm.elements.nom.value = chant ? chant.nom : '';
  chantForm.elements.path.value = chant ? chant.path : currentPath;
  chantForm.elements.cote.value = chant && chant.cote !== null ? String(chant.cote) : '';
  chantForm.elements.informations.value = chant ? chant.informations : '';
  chantDialog.showModal();
}

function openFileDialog(chant, file) {
  editingFileContext = { chantId: chant.id, fileId: file ? file.id : null };
  fileDialogTitle.textContent = file ? 'Modifier le fichier' : 'Nouveau fichier';
  fileForm.elements.nom_fichier.value = file ? file.nomFichier : '';
  fileForm.elements.tonalite.value = file ? file.tonalite : '';
  fileForm.elements.nb_voix.value = file && file.nbVoix !== null ? String(file.nbVoix) : '';
  fileForm.elements.accords.checked = Boolean(file && file.accords);
  fileForm.elements.informations.value = file ? file.informations : '';
  fileDialog.showModal();
}

chantForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const payload = {
    nom: chantForm.elements.nom.value.trim(),
    path: normalizePath(chantForm.elements.path.value),
    cote: chantForm.elements.cote.value.trim(),
    informations: chantForm.elements.informations.value.trim(),
  };
  if (editingChantId !== null) {
    payload.id = editingChantId;
  }

  try {
    await apiPost('chant_save', payload);
    chantDialog.close();
    await refreshCurrentView();
  } catch (error) {
    setStatus(error.message, true);
  }
});

fileForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (!editingFileContext) {
    return;
  }

  const payload = {
    chant_id: editingFileContext.chantId,
    nom_fichier: fileForm.elements.nom_fichier.value.trim(),
    tonalite: fileForm.elements.tonalite.value.trim(),
    nb_voix: fileForm.elements.nb_voix.value.trim(),
    accords: fileForm.elements.accords.checked ? '1' : '0',
    informations: fileForm.elements.informations.value.trim(),
  };
  if (editingFileContext.fileId !== null) {
    payload.id = editingFileContext.fileId;
  }

  try {
    await apiPost('file_save', payload);
    fileDialog.close();
    await refreshCurrentView();
  } catch (error) {
    setStatus(error.message, true);
  }
});

document.querySelectorAll('[data-close-dialog]').forEach((button) => {
  button.addEventListener('click', () => {
    button.closest('dialog').close();
  });
});

goUpButton.addEventListener('click', () => {
  if (parentPath === null) {
    return;
  }
  clearSearchFilter();
  loadPath(parentPath);
});

refreshButton.addEventListener('click', () => {
  refreshCurrentView();
});

newChantButton.addEventListener('click', () => openChantDialog(null));

editChantButton.addEventListener('click', () => {
  const chant = getSelectedChant();
  if (chant) {
    openChantDialog(chant);
  }
});

deleteChantButton.addEventListener('click', async () => {
  const chant = getSelectedChant();
  if (!chant) {
    return;
  }

  if (!window.confirm(`Supprimer le chant "${chant.nom}" et ses ${chant.fileCount} fichier(s) ?`)) {
    return;
  }

  try {
    await apiPost('chant_delete', { id: chant.id });
    selectedChantId = null;
    expandedChantId = null;
    await refreshCurrentView();
  } catch (error) {
    setStatus(error.message, true);
  }
});

seedButton.addEventListener('click', async () => {
  if (!window.confirm('Remplir les tables a partir du contenu du dossier /pdf ?')) {
    return;
  }

  seedButton.disabled = true;
  setStatus('Initialisation de la base en cours...');

  try {
    const payload = await apiPost('seed', {});
    clearSearchFilter();
    selectedChantId = null;
    expandedChantId = null;
    await loadPath('');
    setStatus(`Base initialisee : ${payload.chants} chant(s) et ${payload.fichiers} fichier(s) importes.`);
  } catch (error) {
    setStatus(error.message, true);
  } finally {
    updateActionButtons();
  }
});

searchInput.addEventListener('input', () => {
  const value = searchInput.value.trim();

  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer);
  }

  searchDebounceTimer = setTimeout(() => {
    searchTerm = value.length >= 2 ? value : '';
    if (searchTerm) {
      runSearch();
    } else {
      loadPath(currentPath);
    }
  }, 250);
});

loadPath('');
