// Explorer Module
// Handles file explorer functionality

// DOM Elements
const goUpButton = document.getElementById('go-up');
const refreshButton = document.getElementById('refresh-list');
const newFolderButton = document.getElementById('new-folder');
const renameButton = document.getElementById('rename-item');
const cutButton = document.getElementById('cut-item');
const pasteButton = document.getElementById('paste-item');
const deleteButton = document.getElementById('delete-item');
const downloadButton = document.getElementById('download-item');
const uploadButton = document.getElementById('upload-file');
const uploadInput = document.getElementById('upload-input');
const searchInput = document.getElementById('explorer-search-input');
const explorerBody = document.getElementById('explorer-body');
const breadcrumbs = document.getElementById('breadcrumbs');
const statusElement = document.getElementById('explorer-status');
const explorerListWrap = document.querySelector('.explorer-list-wrap');

// Constants
const WEBAPP_CONFIG = window.WEBAPP_CONFIG || {};
const BASE_URL = WEBAPP_CONFIG.BASE_URL || '';
const AUTH_API = WEBAPP_CONFIG.AUTH_API || `${BASE_URL}webapp/api/auth.php`;
const PDF_ROOT = WEBAPP_CONFIG.PDF_ROOT || `${BASE_URL}pdf/`;
const LOCAL_API_URL = './api/explorer.php';
const REMOTE_API_URL = WEBAPP_CONFIG.EXPLORER_API || `${BASE_URL}webapp/api/explorer.php`;
const RECYCLE_BIN_ROOT = 'Recycle Bin';
const AUTH_CHECK_URL = `${AUTH_API}?action=check`;
const HIDDEN_ROOT_FOLDERS = new Set(['programmes', RECYCLE_BIN_ROOT]);

// State
let currentPath = '';
let parentPath = null;
let selectedItem = null;
let activeApiUrl = LOCAL_API_URL;
let cutItem = null;
let explorerItems = [];
let currentDirectoryItems = [];
let searchTerm = '';
let searchDebounceTimer = null;
let searchRequestId = 0;
let dragDepth = 0;
let isAdminUser = false;

function normalizePath(value) {
  return String(value || '')
    .replaceAll('\\', '/')
    .replace(/^\/+|\/+$/g, '')
    .replace(/\/+/g, '/');
}

function isRestrictedPath(pathValue) {
  if (isAdminUser) {
    return false;
  }

  const normalizedPath = normalizePath(pathValue);
  if (!normalizedPath) {
    return false;
  }

  const [rootSegment] = normalizedPath.split('/');
  return HIDDEN_ROOT_FOLDERS.has(rootSegment);
}

function filterItemsByAccess(items) {
  if (isAdminUser) {
    return items;
  }

  return (items || []).filter((item) => !isRestrictedPath(item.path));
}

async function loadUserAccess() {
  const response = await fetch(AUTH_CHECK_URL, { credentials: 'include' });
  const data = await response.json().catch(() => ({ success: false }));

  if (!response.ok || !data.success) {
    throw new Error('Impossible de verifier les droits utilisateur.');
  }

  isAdminUser = data.user?.role === 'admin';
}

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

function getFileNameFromPath(pathValue) {
  const normalized = String(pathValue || '').replaceAll('\\', '/');
  const parts = normalized.split('/');
  return parts.pop() || '';
}

function getFilteredExplorerItems() {
  if (!searchTerm) {
    return currentDirectoryItems;
  }

  // Search results are already filtered by backend (special chars ignored).
  return explorerItems;
}

function renderFilteredExplorerList() {
  const filteredItems = getFilteredExplorerItems();
  renderList(filteredItems);

  const total = searchTerm ? explorerItems.length : currentDirectoryItems.length;
  if (searchTerm) {
    setStatus(`${filteredItems.length} element(s) trouves sur ${total} dans /pdf (${getApiLabel()}).`);
  } else {
    setStatus(`${total} element(s) dans ${currentPath || '/'} (${getApiLabel()}).`);
  }
}

async function refreshExplorerSearchResults() {
  if (!searchTerm) {
    explorerItems = currentDirectoryItems;
    renderFilteredExplorerList();
    return;
  }

  const requestId = ++searchRequestId;
  setStatus('Recherche en cours dans /pdf et ses sous-dossiers...');

  try {
    const payload = await apiGet('search', '', { q: searchTerm });
    if (requestId !== searchRequestId) {
      return;
    }
    explorerItems = filterItemsByAccess(payload.items || []);
    renderFilteredExplorerList();
  } catch (error) {
    if (requestId !== searchRequestId) {
      return;
    }
    setStatus(error.message, true);
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

/**
 * Update action button states based on selection
 */
function updateActionButtons() {
  if (!selectedItem) {
    deleteButton.disabled = true;
    downloadButton.disabled = true;
    renameButton.disabled = true;
    cutButton.disabled = true;
    pasteButton.disabled = !cutItem;
    return;
  }

  renameButton.disabled = false;
  cutButton.disabled = selectedItem.type !== 'file';
  pasteButton.disabled = !cutItem;
  downloadButton.disabled = selectedItem.type !== 'file';
  deleteButton.disabled = selectedItem.type === 'dir' && selectedItem.isEmptyDir === false;
}

/**
 * Set status message
 */
function setStatus(message, isError = false) {
  statusElement.textContent = message;
  statusElement.classList.toggle('is-error', isError);
}

/**
 * Format bytes to human-readable size
 */
function formatBytes(value) {
  if (value === null || value === undefined) {
    return '-';
  }
  const bytes = Number(value);
  if (!Number.isFinite(bytes)) {
    return '-';
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const units = ['KB', 'MB', 'GB', 'TB'];
  let size = bytes / 1024;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Format timestamp to localized date string
 */
function formatDate(timestamp) {
  if (!timestamp) {
    return '-';
  }
  const date = new Date(timestamp * 1000);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  return date.toLocaleString('fr-FR');
}

/**
 * Encode query parameters
 */
function encodeQuery(params) {
  return new URLSearchParams(params).toString();
}

/**
 * Get list of API candidates for fallback
 */
function getApiCandidates() {
  if (activeApiUrl === REMOTE_API_URL) {
    return [REMOTE_API_URL, LOCAL_API_URL];
  }
  return [LOCAL_API_URL, REMOTE_API_URL];
}

/**
 * Check if should retry with fallback
 */
function shouldRetryWithFallback(error, responseStatus) {
  if (error) {
    return true;
  }
  return responseStatus === 404 || responseStatus >= 500;
}

/**
 * Fetch with fallback to alternative API
 */
async function fetchWithFallback(buildRequest, expectJson = true) {
  const candidates = getApiCandidates();
  const errors = [];

  for (let index = 0; index < candidates.length; index += 1) {
    const baseUrl = candidates[index];
    const request = buildRequest(baseUrl);

    try {
      const response = await fetch(request.url, {
        ...(request.options || {}),
        credentials: 'include',
      });

      if (!response.ok) {
        if (index < candidates.length - 1 && shouldRetryWithFallback(null, response.status)) {
          errors.push(`HTTP ${response.status} on ${baseUrl}`);
          continue;
        }
        throw new Error(`HTTP ${response.status}`);
      }

      activeApiUrl = baseUrl;

      if (!expectJson) {
        return { success: true };
      }

      const payload = await response.json();
      if (!payload.success) {
        throw new Error(payload.message || 'Erreur API');
      }

      return payload;
    } catch (error) {
      if (index < candidates.length - 1 && shouldRetryWithFallback(error, null)) {
        errors.push(`${baseUrl}: ${error.message}`);
        continue;
      }
      throw error;
    }
  }

  throw new Error(errors.join(' | ') || 'API inaccessible');
}

/**
 * GET request to API
 */
async function apiGet(action, pathValue = '', extraParams = {}) {
  const query = encodeQuery({ action, path: pathValue, ...extraParams });
  return fetchWithFallback((baseUrl) => ({
    url: `${baseUrl}?${query}`,
    options: undefined,
  }));
}

/**
 * POST request to API
 */
async function apiPost(action, data) {
  return fetchWithFallback((baseUrl) => {
    const formData = new FormData();
    formData.append('action', action);
    Object.entries(data).forEach(([key, value]) => {
      formData.append(key, value);
    });

    return {
      url: baseUrl,
      options: {
        method: 'POST',
        body: formData,
      },
    };
  });
}

/**
 * Resolve active API URL
 */
async function resolveApiUrl() {
  await fetchWithFallback((baseUrl) => {
    const query = encodeQuery({ action: 'list', path: currentPath });
    return {
      url: `${baseUrl}?${query}`,
      options: undefined,
    };
  });

  return activeApiUrl;
}

/**
 * Get API label for status display
 */
function getApiLabel() {
  if (activeApiUrl === REMOTE_API_URL) {
    return 'API distante';
  }
  return 'API locale';
}

/**
 * Open a PDF in host app via postMessage (cross-origin safe), or fallback to new tab
 */
function openPdfFromExplorer(item) {
  if (typeof window.openPdfInNewTab === 'function') {
    window.openPdfInNewTab({ ...item, showFolderPanel: true });
    return;
  }

  if (window.parent && window.parent !== window) {
    window.parent.postMessage({ type: 'openPdf', item: { ...item, showFolderPanel: true } }, '*');
    return;
  }

  const fallbackUrl = `${"./visualisation.html"}?${new URLSearchParams({ lien: `/${item.path}`, folderPanel: 'visible' }).toString()}`;
  window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
}

function isMusicXmlFileName(fileName) {
  const lower = String(fileName || '').toLowerCase();
  return lower.endsWith('.musicxml') || lower.endsWith('.mxl') || lower.endsWith('.xml');
}

async function openMusicXmlFromExplorer(item) {
  const apiUrl = await resolveApiUrl();
  const query = encodeQuery({ action: 'download', path: item.path });
  const sourceUrl = `${apiUrl}?${query}`;
  const viewerUrl = `../components/musicxml/index.html?${new URLSearchParams({ source: sourceUrl }).toString()}`;

  const pageItem = {
    name: item.name,
    title: `MusicXML - ${item.name}`,
    key: `musicxml-${item.path}`,
    url: viewerUrl,
  };

  if (window.parent && window.parent !== window) {
    window.parent.postMessage({ type: 'openPageTab', item: pageItem }, '*');
    return;
  }

  window.open(viewerUrl, '_blank', 'noopener,noreferrer');
}

/**
 * Render breadcrumb navigation
 */
function renderBreadcrumbs(pathValue) {
  const parts = pathValue ? pathValue.split('/') : [];
  const nodes = [{ label: 'Racine', path: '' }];
  let aggregate = '';
  parts.forEach((part) => {
    aggregate = aggregate ? `${aggregate}/${part}` : part;
    nodes.push({ label: part, path: aggregate });
  });

  breadcrumbs.innerHTML = '';
  nodes.forEach((node, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'crumb';
    button.textContent = node.label;
    button.addEventListener('click', () => {
      clearSearchFilter();
      void loadDirectory(node.path);
    });
    breadcrumbs.appendChild(button);

    if (index < nodes.length - 1) {
      const separator = document.createElement('span');
      separator.className = 'crumb-sep';
      separator.textContent = '/';
      breadcrumbs.appendChild(separator);
    }
  });
}

/**
 * Render file list
 */
function renderList(items) {
  explorerBody.innerHTML = '';
  selectedItem = null;
  updateActionButtons();

  if (!items.length) {
    const row = document.createElement('tr');
    row.innerHTML = '<td colspan="5" class="empty-cell">Dossier vide</td>';
    explorerBody.appendChild(row);
    return;
  }

  items.forEach((item) => {
    const row = document.createElement('tr');
    row.dataset.path = item.path;
    row.dataset.type = item.type;

    let iconClass = 'item-icon-file';
    if (item.type === 'dir') {
      iconClass = 'item-icon-dir';
    } else if (item.name.toLowerCase().endsWith('.pdf')) {
      iconClass = 'item-icon-pdf';
    }
    const openExternallyBtn = document.createElement('button');
    openExternallyBtn.type = 'button';
    openExternallyBtn.className = 'open-external-btn';
    openExternallyBtn.title = 'Ouvrir en externe';
    openExternallyBtn.innerHTML = '🔗';
    openExternallyBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      const fileUrl = `${PDF_ROOT.replace(/\/$/, '')}/${item.path}`;
      window.open(fileUrl, '_blank', 'noopener,noreferrer');
    });

    row.innerHTML = `
      <td class="name-cell"><button type="button" class="name-btn"><span class="item-icon ${iconClass}" aria-hidden="true"></span><span class="name-text">${item.name}</span></button></td>
      <td>${item.type === 'dir' ? 'Dossier' : 'Fichier'}</td>
      <td>${item.type === 'dir' ? '-' : formatBytes(item.size)}</td>
      <td>${formatDate(item.mtime)}</td>
      <td class="actions-cell"></td>
    `;
    if (item.type !== 'dir') {
      row.querySelector('.actions-cell').appendChild(openExternallyBtn);
    }

    row.addEventListener('click', () => {
      Array.from(explorerBody.querySelectorAll('tr')).forEach((candidate) => candidate.classList.remove('is-selected'));
      row.classList.add('is-selected');
      selectedItem = item;
      updateActionButtons();

      if (selectedItem.type === 'dir' && selectedItem.isEmptyDir === false) {
        setStatus('Ce dossier n est pas vide et ne peut pas etre supprime.', true);
      } else if (selectedItem.type === 'dir') {
        setStatus('Dossier selectionne.');
      } else {
        setStatus('Fichier selectionne.');
      }
    });

    row.querySelector('.name-btn').addEventListener('click', (event) => {
      event.stopPropagation();
      if (item.type === 'dir') {
        clearSearchFilter();
        void loadDirectory(item.path);
      } else if (item.name.toLowerCase().endsWith('.pdf')) {
        openPdfFromExplorer(item);
      } else if (isMusicXmlFileName(item.name)) {
        void openMusicXmlFromExplorer(item);
      }
    });

    explorerBody.appendChild(row);
  });
}

/**
 * Load directory contents
 */
async function loadDirectory(pathValue = currentPath) {
  setStatus('Chargement...');
  try {
    if (isRestrictedPath(pathValue)) {
      throw new Error('Acces reserve aux administrateurs.');
    }

    const payload = await apiGet('list', pathValue);
    currentPath = payload.currentPath;
    parentPath = payload.parentPath;
    currentDirectoryItems = filterItemsByAccess(payload.items || []);
    explorerItems = currentDirectoryItems;
    renderBreadcrumbs(currentPath);
    await refreshExplorerSearchResults();
  } catch (error) {
    setStatus(error.message, true);
  }
}

/**
 * Require selection for operations
 */
function requireSelection() {
  if (!selectedItem) {
    throw new Error('Selectionnez un element d abord.');
  }
}

/**
 * Handle folder creation
 */
async function handleCreateFolder() {
  const folderName = window.prompt('Nom du nouveau dossier :');
  if (!folderName) {
    return;
  }
  await apiPost('mkdir', { path: currentPath, name: folderName.trim() });
  await loadDirectory(currentPath);
}

/**
 * Handle item rename
 */
async function handleRename() {
  requireSelection();
  const nextName = window.prompt('Nouveau nom :', selectedItem.name);
  if (!nextName) {
    return;
  }

  const trimmedName = nextName.trim();
  if (!trimmedName) {
    return;
  }

  if (selectedItem.type === 'file') {
    const normalizedTarget = trimmedName.toLocaleLowerCase();
    const hasConflict = (currentDirectoryItems || []).some((item) => item
      && item.type === 'file'
      && item.path !== selectedItem.path
      && String(item.name || '').toLocaleLowerCase() === normalizedTarget);

    if (hasConflict) {
      throw new Error('Renommage annule: un autre fichier porte deja ce nom.');
    }
  }

  await apiPost('rename', { path: selectedItem.path, newName: trimmedName });
  await loadDirectory(currentPath);
}

/**
 * Handle item deletion
 */
async function handleDelete() {
  requireSelection();
  if (selectedItem.type === 'dir' && selectedItem.isEmptyDir === false) {
    throw new Error('Suppression interdite: le dossier n est pas vide.');
  }
  const confirmation = window.confirm(`Supprimer ${selectedItem.name} ?`);
  if (!confirmation) {
    return '';
  }

  if (selectedItem.type === 'file') {
    const recycleFolderName = createRecycleFolderName();

    try {
      await apiPost('mkdir', {
        path: RECYCLE_BIN_ROOT,
        name: recycleFolderName,
      });
    } catch (error) {
      if (!String(error.message || '').toLowerCase().includes('already exists')) {
        throw error;
      }
    }

    await apiPost('move', {
      path: selectedItem.path,
      targetPath: `${RECYCLE_BIN_ROOT}/${recycleFolderName}/${selectedItem.name}`,
    });

    await loadDirectory(currentPath);
    return `Fichier deplace vers /pdf/${RECYCLE_BIN_ROOT}/${recycleFolderName}.`;
  }

  await apiPost('delete', { path: selectedItem.path });
  await loadDirectory(currentPath);
  return 'Element supprime.';
}

/**
 * Handle file upload
 */
async function uploadFiles(files) {
  const fileList = Array.from(files || []).filter((file) => file instanceof File);
  if (!fileList.length) {
    throw new Error('Choisissez un fichier a envoyer.');
  }

  for (const file of fileList) {
    await apiPost('upload', { path: currentPath, file });
  }

  await loadDirectory(currentPath);
}

async function handleUpload() {
  await uploadFiles(uploadInput.files);
  uploadInput.value = '';
}

function setDropZoneActive(isActive) {
  if (!explorerListWrap) {
    return;
  }
  explorerListWrap.classList.toggle('is-drag-over', isActive);
}

function hasFilesInDataTransfer(dataTransfer) {
  if (!dataTransfer) {
    return false;
  }
  return Array.from(dataTransfer.types || []).includes('Files');
}

async function handleDroppedFiles(fileList) {
  try {
    setStatus('Envoi des fichiers...');
    await uploadFiles(fileList);
    setStatus('Fichier(s) envoye(s).');
  } catch (error) {
    setStatus(error.message, true);
  }
}

/**
 * Handle file download
 */
async function handleDownload() {
  requireSelection();
  if (selectedItem.type !== 'file') {
    throw new Error('Le telechargement est disponible uniquement pour les fichiers.');
  }
  const apiUrl = await resolveApiUrl();
  const query = encodeQuery({ action: 'download', path: selectedItem.path });
  window.open(`${apiUrl}?${query}`, '_blank', 'noopener,noreferrer');
}

async function handleCut() {
  requireSelection();
  if (selectedItem.type !== 'file') {
    throw new Error('Couper est disponible uniquement pour les fichiers.');
  }

  cutItem = {
    path: selectedItem.path,
    name: selectedItem.name,
  };

  updateActionButtons();
  setStatus(`Fichier coupe: ${cutItem.name}. Ouvrez un dossier puis cliquez sur Coller.`);
}

async function handlePaste() {
  if (!cutItem) {
    throw new Error('Aucun fichier coupe.');
  }

  const targetPath = currentPath ? `${currentPath}/${cutItem.name}` : cutItem.name;
  if (targetPath === cutItem.path) {
    throw new Error('Le fichier est deja dans ce dossier.');
  }

  await apiPost('move', {
    path: cutItem.path,
    targetPath,
  });

  const movedName = cutItem.name;
  cutItem = null;
  selectedItem = null;
  await loadDirectory(currentPath);
  setStatus(`Fichier deplace: ${movedName}.`);
}

async function triggerRename() {
  try {
    await handleRename();
    setStatus('Element renomme.');
  } catch (error) {
    setStatus(error.message, true);
  }
}

/**
 * Initialize explorer module
 */
async function initExplorer() {
  // Navigation buttons
  goUpButton.addEventListener('click', () => {
    if (parentPath === null) {
      return;
    }
    clearSearchFilter();
    void loadDirectory(parentPath);
  });

  refreshButton.addEventListener('click', () => {
    void loadDirectory(currentPath);
  });

  // File operations
  newFolderButton.addEventListener('click', async () => {
    try {
      await handleCreateFolder();
      setStatus('Dossier cree.');
    } catch (error) {
      setStatus(error.message, true);
    }
  });

  renameButton.addEventListener('click', () => {
    void triggerRename();
  });

  deleteButton.addEventListener('click', async () => {
    try {
      const message = await handleDelete();
      if (message) {
        setStatus(message);
      }
    } catch (error) {
      setStatus(error.message, true);
    }
  });

  cutButton.addEventListener('click', async () => {
    try {
      await handleCut();
    } catch (error) {
      setStatus(error.message, true);
    }
  });

  pasteButton.addEventListener('click', async () => {
    try {
      await handlePaste();
    } catch (error) {
      setStatus(error.message, true);
    }
  });

  uploadButton.addEventListener('click', () => {
    uploadInput.click();
  });

  uploadInput.addEventListener('change', async () => {
    if (!uploadInput.files || !uploadInput.files[0]) {
      return;
    }

    try {
      setStatus('Envoi du fichier...');
      await handleUpload();
      setStatus('Fichier envoye.');
    } catch (error) {
      setStatus(error.message, true);
    }
  });

  if (explorerListWrap) {
    explorerListWrap.addEventListener('dragenter', (event) => {
      if (!hasFilesInDataTransfer(event.dataTransfer)) {
        return;
      }
      event.preventDefault();
      dragDepth += 1;
      setDropZoneActive(true);
    });

    explorerListWrap.addEventListener('dragover', (event) => {
      if (!hasFilesInDataTransfer(event.dataTransfer)) {
        return;
      }
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
      setDropZoneActive(true);
    });

    explorerListWrap.addEventListener('dragleave', (event) => {
      if (!hasFilesInDataTransfer(event.dataTransfer)) {
        return;
      }
      event.preventDefault();
      dragDepth = Math.max(0, dragDepth - 1);
      if (dragDepth === 0) {
        setDropZoneActive(false);
      }
    });

    explorerListWrap.addEventListener('drop', (event) => {
      if (!hasFilesInDataTransfer(event.dataTransfer)) {
        return;
      }
      event.preventDefault();
      dragDepth = 0;
      setDropZoneActive(false);
      void handleDroppedFiles(event.dataTransfer.files);
    });
  }

  downloadButton.addEventListener('click', async () => {
    try {
      await handleDownload();
    } catch (error) {
      setStatus(error.message, true);
    }
  });

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      searchTerm = searchInput.value.trim();
      if (searchDebounceTimer) {
        clearTimeout(searchDebounceTimer);
      }
      searchDebounceTimer = setTimeout(() => {
        void refreshExplorerSearchResults();
      }, 250);
    });
  }

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'F2') {
      return;
    }

    const target = event.target;
    const tagName = target && target.tagName ? target.tagName.toUpperCase() : '';
    if ((target && target.isContentEditable)
      || tagName === 'INPUT'
      || tagName === 'TEXTAREA'
      || tagName === 'SELECT') {
      return;
    }

    event.preventDefault();
    void triggerRename();
  });

  // Initialize
  updateActionButtons();
  try {
    await loadUserAccess();
    await loadDirectory('');
  } catch (error) {
    setStatus(error.message || 'Impossible de charger l explorateur.', true);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    void initExplorer();
  });
} else {
  void initExplorer();
}
