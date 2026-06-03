// Library Module
// Loads all files under /pdf/programmes in a single API request with folder filtering

const WEBAPP_CONFIG = window.WEBAPP_CONFIG || {};
const BASE_URL = WEBAPP_CONFIG.BASE_URL || '';
const LIBRARY_API_URL = WEBAPP_CONFIG.EXPLORER_API || `${BASE_URL}webapp/api/explorer.php`;
const PDF_ROOT = WEBAPP_CONFIG.PDF_ROOT || `${BASE_URL}pdf/`;
const LIBRARY_ROOT_PATH = 'programmes';

let libraryLoaded = false;
let libraryLoading = false;
let libraryFilesAll = [];
let selectedLibraryFilePath = '';
let selectedLibraryFileName = '';
let librarySearchTerm = '';
const RECYCLE_BIN_ROOT = 'Recycle Bin';

function createRecycleFolderName() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}_${hh}-${min}-${ss}`;
}

async function apiPost(action, payload) {
  const body = new URLSearchParams({ action, ...payload });
  const response = await fetch(LIBRARY_API_URL, { method: 'POST', body, credentials: 'include' });

  if (!response.ok) {
    throw new Error(`Erreur HTTP ${response.status}.`);
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.message || `Action ${action} refusee.`);
  }

  return data;
}

function updateDeleteButtonState() {
  const deleteBtn = document.getElementById('library-delete');
  if (!deleteBtn) {
    return;
  }
  deleteBtn.disabled = !selectedLibraryFilePath || libraryLoading;
}

function setLibraryStatus(message, isError = false) {
  const status = document.getElementById('library-status');
  if (!status) {
    return;
  }
  status.textContent = message;
  status.classList.toggle('is-error', isError);
}

function updateLibraryCountWithTotal(filteredCount, totalCount) {
  const countEl = document.getElementById('library-count');
  if (!countEl) {
    return;
  }

  if (filteredCount === totalCount) {
    countEl.textContent = `${totalCount} fichier${totalCount > 1 ? 's' : ''}`;
    return;
  }

  countEl.textContent = `${filteredCount} / ${totalCount} fichiers`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function encodePathForUrl(path) {
  return path
    .split('/')
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join('/');
}

function cleanPath(value) {
  return String(value || '')
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/\/+/g, '/');
}

function formatLibraryDisplayName(fileName) {
  const rawName = String(fileName || '');
  const baseName = rawName.replace(/\.[^/.]+$/, '');
  const parts = baseName.split('_');

  if (parts.length < 3) {
    return rawName;
  }

  const date = parts[0] || '';
  const location = parts[1] || '';
  const occasion = parts.slice(2).join('_') || '';

  const normalize = (value) => value
    .replaceAll('_', ' ')
    .replaceAll('-', '/')
    .trim();

  const formatDateForDisplay = (value) => {
    const match = value.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
    if (!match) {
      return value;
    }
    const [, year, month, day] = match;
    return `${day}/${month}/${year}`;
  };

  const prettyDate = formatDateForDisplay(normalize(date));
  const prettyLocation = normalize(location);
  const prettyOccasion = normalize(occasion || location);

  if (!prettyDate || !prettyLocation) {
    return rawName;
  }

  return `Messe du ${prettyDate} à ${prettyLocation} pour ${prettyOccasion}`;
}

function getFolderPath(filePath) {
  const normalized = String(filePath || '').replaceAll('\\', '/');
  const index = normalized.lastIndexOf('/');
  if (index < 0) {
    return '';
  }
  return normalized.slice(0, index);
}

function getParoisseFromPath(pathValue) {
  return String(pathValue || '').split('/')[1] || 'Inconnue';
}

function requestOpenPdf(file) {
  if (window.parent && window.parent !== window) {
    window.parent.postMessage({
      type: 'openPdf',
      item: { name: file.name, path: file.path, type: 'file' },
    }, '*');
    return;
  }

  const query = new URLSearchParams({ lien: `/${file.path}` }).toString();
  window.open(`../components/visualisation/index.html?${query}`, '_blank', 'noopener,noreferrer');
}

function isProgramFile(fileName) {
  const normalized = String(fileName || '').toLowerCase();
  return normalized.endsWith('.txt') || normalized.endsWith('.json');
}

function requestOpenProgram(file) {
  const encodedPath = encodePathForUrl(file.path);
  const programUrl = `${PDF_ROOT}${encodedPath}`;
  const visualisationUrl = `./visualisation.html?${new URLSearchParams({ programme: programUrl }).toString()}`;
  const tabLabel = formatLibraryDisplayName(file.name);

  if (window.parent && window.parent !== window) {
    window.parent.postMessage({
      type: 'openPageTab',
      item: {
        key: `programme-${file.path}`,
        name: tabLabel,
        title: tabLabel,
        description: 'Visualisation du programme',
        url: visualisationUrl,
      },
    }, '*');
    return;
  }

  window.open(visualisationUrl, '_blank', 'noopener,noreferrer');
}

function requestModifyProgram(file) {
  const programmePath = `/pdf/${cleanPath(file.path)}`;
  const modifyUrl = `./modifications.html?${new URLSearchParams({ programme: programmePath }).toString()}`;
  const tabLabel = `Modification - ${formatLibraryDisplayName(file.name)}`;

  if (window.parent && window.parent !== window) {
    window.parent.postMessage({
      type: 'openPageTab',
      item: {
        key: `modify-programme-${file.path}`,
        name: tabLabel,
        title: tabLabel,
        description: 'Modification du programme',
        url: modifyUrl,
      },
    }, '*');
    return;
  }

  window.open(modifyUrl, '_blank', 'noopener,noreferrer');
}

function openCreateProgramPage() {
  const item = {
    key: 'create-program',
    name: 'Créer un nouveau programme',
    title: 'Créer un nouveau programme',
    description: 'Création de programme',
    url: './create.html',
  };

  if (window.parent && window.parent !== window) {
    window.parent.postMessage({ type: 'openPageTab', item }, '*');
    return;
  }

  window.open(item.url, '_blank', 'noopener,noreferrer');
}

async function collectLibraryData(rootPath) {
  const query = new URLSearchParams({ action: 'list_tree', path: rootPath }).toString();
  const response = await fetch(`${LIBRARY_API_URL}?${query}`, { credentials: 'include' });

  if (!response.ok) {
    throw new Error(`Erreur HTTP ${response.status} sur ${rootPath || '/'}.`);
  }

  const payload = await response.json();
  if (!payload.success) {
    throw new Error(payload.message || 'Erreur API lors du chargement de la bibliotheque.');
  }

  const files = Array.isArray(payload.files)
    ? payload.files
      .filter((item) => item && item.type === 'file' && item.path && item.name)
      .map((item) => ({
        name: item.name,
        path: item.path,
      }))
    : [];

  const folders = Array.isArray(payload.folders)
    ? payload.folders
      .filter((folder) => typeof folder === 'string' && folder.trim() !== '')
    : [rootPath];

  files.sort((a, b) => {
    const aStartsWithNumber = /^\d/.test(a.name);
    const bStartsWithNumber = /^\d/.test(b.name);

    if (aStartsWithNumber !== bStartsWithNumber) {
      return aStartsWithNumber ? -1 : 1;
    }

    const byNameDesc = b.name.localeCompare(a.name, 'fr', { sensitivity: 'base' });
    if (byNameDesc !== 0) {
      return byNameDesc;
    }
    return b.path.localeCompare(a.path, 'fr', { sensitivity: 'base' });
  });

  const sortedFolders = Array.from(new Set(folders)).sort((a, b) =>
    a.localeCompare(b, 'fr', { sensitivity: 'base' })
  );

  return { files, folders: sortedFolders };
}

function renderLibraryFolderOptions(folders) {
  const select = document.getElementById('library-folder-filter');
  if (!select) {
    return;
  }

  const previousValue = select.value;
  select.innerHTML = '<option value="">Toutes les paroisses</option>';

  for (const folder of folders) {
    var paroisse = folder.split("programmes/")[1];

    if(paroisse != undefined && paroisse != ""){
      const option = document.createElement('option');
      option.value = folder;
      option.textContent = paroisse;
      select.appendChild(option);
    }
  }

  if (previousValue && folders.includes(previousValue)) {
    select.value = previousValue;
  }
}

function renderLibraryFiles(files) {
  const tbody = document.getElementById('library-body');
  if (!tbody) {
    return;
  }

  tbody.innerHTML = '';

  if (!files.length) {
    selectedLibraryFilePath = '';
    selectedLibraryFileName = '';
    updateDeleteButtonState();
    tbody.innerHTML = '<tr><td colspan="3" class="empty-cell">Aucun fichier trouve dans programmes.</td></tr>';
    updateLibraryCountWithTotal(0, libraryFilesAll.length);
    return;
  }

  if (selectedLibraryFilePath && !files.some((file) => file.path === selectedLibraryFilePath)) {
    selectedLibraryFilePath = '';
    selectedLibraryFileName = '';
  }

  for (const file of files) {
    const row = document.createElement('tr');
    const encodedPath = encodePathForUrl(file.path);
    const remoteFileUrl = `${PDF_ROOT}${encodedPath}`;
    const displayName = formatLibraryDisplayName(file.name);
    const canOpenInViewer = file.name.toLowerCase().endsWith('.pdf') || isProgramFile(file.name);

    const paroisse = getParoisseFromPath(file.path);
    row.innerHTML = `
      <td class="name-cell"></td>
      <td>${escapeHtml(paroisse)}</td>
      <td class="actions-cell"></td>
    `;

    const nameCell = row.querySelector('.name-cell');
    const actionsCell = row.querySelector('.actions-cell');

    const nameLink = document.createElement('a');
    nameLink.href = remoteFileUrl;
    nameLink.textContent = displayName;
    nameLink.style.color = 'var(--accent)';
    nameLink.style.textDecoration = 'underline';
    nameLink.addEventListener('click', (event) => {
      event.stopPropagation();

      if (!canOpenInViewer) {
        nameLink.target = '_blank';
        nameLink.rel = 'noopener noreferrer';
        return;
      }

      event.preventDefault();
      if (isProgramFile(file.name)) {
        requestOpenProgram(file);
      } else {
        requestOpenPdf(file);
      }
    });

    if (nameCell) {
      nameCell.appendChild(nameLink);
    }

    if (selectedLibraryFilePath && selectedLibraryFilePath === file.path) {
      row.classList.add('is-selected');
    }

    row.addEventListener('click', () => {
      Array.from(tbody.querySelectorAll('tr')).forEach((candidate) => candidate.classList.remove('is-selected'));
      row.classList.add('is-selected');
      selectedLibraryFilePath = file.path;
      selectedLibraryFileName = file.name;
      updateDeleteButtonState();

      setLibraryStatus('Fichier selectionne.');
    });

    const extLink = document.createElement('a');
    extLink.href = remoteFileUrl;
    extLink.target = '_blank';
    extLink.rel = 'noopener noreferrer';
    extLink.className = 'btn btn-ghost';
    extLink.style.fontSize = '0.85rem';
    extLink.style.marginLeft = '8px';
    extLink.textContent = 'Modifier';
    extLink.addEventListener('click', (event) => {
      event.stopPropagation();
      if (isProgramFile(file.name)) {
        event.preventDefault();
        requestModifyProgram(file);
      }
    });
    actionsCell.appendChild(extLink);

    tbody.appendChild(row);
  }

  updateDeleteButtonState();
  updateLibraryCountWithTotal(files.length, libraryFilesAll.length);
}

async function deleteSelectedLibraryFile() {
  if (!selectedLibraryFilePath) {
    setLibraryStatus('Selectionnez un fichier a supprimer.', true);
    return;
  }

  const confirmation = window.confirm(`Deplacer ${selectedLibraryFileName || selectedLibraryFilePath} vers Recycle Bin ?`);
  if (!confirmation) {
    return;
  }

  try {
    libraryLoading = true;
    updateDeleteButtonState();
    setLibraryStatus('Deplacement vers Recycle Bin en cours...');

    const recycleFolderName = createRecycleFolderName();

    try {
      await apiPost('mkdir', {
        path: RECYCLE_BIN_ROOT,
        name: recycleFolderName,
      });
    } catch (error) {
      // If the folder exists already (same second), continue and reuse it.
      if (!String(error.message || '').toLowerCase().includes('already exists')) {
        throw error;
      }
    }

    await apiPost('move', {
      path: selectedLibraryFilePath,
      targetPath: `${RECYCLE_BIN_ROOT}/${recycleFolderName}/${selectedLibraryFileName}`,
    });

    selectedLibraryFilePath = '';
    selectedLibraryFileName = '';
    setLibraryStatus(`Fichier deplace vers /pdf/${RECYCLE_BIN_ROOT}/${recycleFolderName}.`);
    libraryLoaded = false;
    await loadLibraryFiles(true);
  } catch (error) {
    setLibraryStatus(error.message || 'Erreur pendant le deplacement.', true);
  } finally {
    libraryLoading = false;
    updateDeleteButtonState();
  }
}

async function createLibraryFolder() {
  const folderName = window.prompt('Nom du nouveau dossier dans /pdf/programmes :');
  if (!folderName) {
    return;
  }

  try {
    libraryLoading = true;
    updateDeleteButtonState();
    setLibraryStatus('Creation du dossier en cours...');

    await apiPost('mkdir', {
      path: LIBRARY_ROOT_PATH,
      name: folderName.trim(),
    });

    setLibraryStatus(`Dossier cree dans /pdf/${LIBRARY_ROOT_PATH}.`);
    libraryLoaded = false;
    await loadLibraryFiles(true);
  } catch (error) {
    setLibraryStatus(error.message || 'Erreur pendant la creation du dossier.', true);
  } finally {
    libraryLoading = false;
    updateDeleteButtonState();
  }
}

function getFilteredLibraryFiles() {
  const filterSelect = document.getElementById('library-folder-filter');
  const selectedFolder = String(filterSelect ? filterSelect.value : '').trim();
  const normalizedSearch = librarySearchTerm.toLocaleLowerCase('fr').trim();

  return libraryFilesAll.filter((file) => {
    const folder = getFolderPath(file.path);
    const matchesFolder = !selectedFolder || folder === selectedFolder || folder.startsWith(`${selectedFolder}/`);
    if (!matchesFolder) {
      return false;
    }

    if (!normalizedSearch) {
      return true;
    }

    const displayName = formatLibraryDisplayName(file.name).toLocaleLowerCase('fr');
    const rawName = String(file.name || '').toLocaleLowerCase('fr');
    const rawPath = String(file.path || '').toLocaleLowerCase('fr');
    const paroisse = getParoisseFromPath(file.path).toLocaleLowerCase('fr');
    const haystack = `${displayName} ${rawName} ${rawPath} ${paroisse}`;
    return haystack.includes(normalizedSearch);
  });
}

function applyLibraryFilters() {
  const filterSelect = document.getElementById('library-folder-filter');
  const selectedFolder = String(filterSelect ? filterSelect.value : '').trim();
  const filtered = getFilteredLibraryFiles();
  renderLibraryFiles(filtered);

  if (!libraryLoaded) {
    return;
  }

  const hasFolderFilter = selectedFolder !== '';
  const hasSearchFilter = librarySearchTerm.trim() !== '';

  if (!hasFolderFilter && !hasSearchFilter) {
    setLibraryStatus(`${libraryFilesAll.length} fichier(s) charges depuis /pdf/programmes.`);
    return;
  }

  if (hasFolderFilter && hasSearchFilter) {
    setLibraryStatus(`${filtered.length} fichier(s) correspondent au dossier ${selectedFolder} et a la recherche "${librarySearchTerm}".`);
    return;
  }

  if (hasFolderFilter) {
    setLibraryStatus(`${filtered.length} fichier(s) correspondent au dossier: ${selectedFolder}`);
    return;
  }

  setLibraryStatus(`${filtered.length} fichier(s) correspondent a la recherche: ${librarySearchTerm}`);
}

async function loadLibraryFiles(forceReload) {
  if (libraryLoading) {
    return;
  }
  if (libraryLoaded && !forceReload) {
    return;
  }

  libraryLoading = true;
  setLibraryStatus('Chargement des fichiers de programmes...');

  try {
    const result = await collectLibraryData(LIBRARY_ROOT_PATH);
    libraryFilesAll = result.files;
    renderLibraryFolderOptions(result.folders);
    applyLibraryFilters();
    setLibraryStatus(`${libraryFilesAll.length} fichier(s) charges depuis /pdf/programmes.`);
    libraryLoaded = true;
  } catch (error) {
    setLibraryStatus(error.message || 'Erreur de chargement.', true);
  } finally {
    libraryLoading = false;
  }
}

function initLibrary() {
  const libraryCreateProgramBtn = document.getElementById('library-create-program');
  if (libraryCreateProgramBtn) {
    libraryCreateProgramBtn.addEventListener('click', () => {
      openCreateProgramPage();
    });
  }

  const libraryRefreshBtn = document.getElementById('library-refresh');
  if (libraryRefreshBtn) {
    libraryRefreshBtn.addEventListener('click', () => {
      void loadLibraryFiles(true);
    });
  }

  const libraryFilterSelect = document.getElementById('library-folder-filter');
  if (libraryFilterSelect) {
    libraryFilterSelect.addEventListener('change', () => {
      applyLibraryFilters();
    });
  }

  const librarySearchInput = document.getElementById('library-search-input');
  if (librarySearchInput) {
    librarySearchInput.addEventListener('input', () => {
      librarySearchTerm = librarySearchInput.value.trim();
      applyLibraryFilters();
    });
  }

  const libraryDeleteBtn = document.getElementById('library-delete');
  if (libraryDeleteBtn) {
    libraryDeleteBtn.addEventListener('click', () => {
      void deleteSelectedLibraryFile();
    });
  }

  const libraryNewFolderBtn = document.getElementById('library-new-folder');
  if (libraryNewFolderBtn) {
    libraryNewFolderBtn.addEventListener('click', () => {
      void createLibraryFolder();
    });
  }

  updateDeleteButtonState();

  void loadLibraryFiles(false);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLibrary);
} else {
  initLibrary();
}
