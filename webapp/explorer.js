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
const SESSION_API = WEBAPP_CONFIG.SESSION_API || './api/session.php';
const PDF_ROOT = WEBAPP_CONFIG.PDF_ROOT || `${BASE_URL}pdf/`;
const LOCAL_API_URL = './api/explorer.php';
const REMOTE_API_URL = WEBAPP_CONFIG.EXPLORER_API || `${BASE_URL}webapp/api/explorer.php`;
const RECYCLE_BIN_ROOT = 'Recycle Bin';

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

/**
 * Normalise le chemin
 */
function normalizePath(value) {
  return String(value || '')
    .replaceAll('\\', '/')
    .replace(/^\/+|\/+$/g, '')
    .replace(/\/+/g, '/');
}

function redirectToLogin() {
  const returnUrl = encodeURIComponent(window.location.pathname + window.location.search + window.location.hash);
  window.top.location.replace(`/webapp/connexion.php?return=${returnUrl}`);
}

async function loadUserAccess() {
  const response = await fetch(SESSION_API, { credentials: 'include' });
  const data = await response.json().catch(() => ({ success: false }));

  if (response.status === 401) {
    redirectToLogin();
  }

  if (!response.ok || !data.success) {
    throw new Error('Impossible de verifier les droits utilisateur.');
  }
}

/**
 * Crée un nom de dossier de recyclage unique
 */
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

/**
 * Extrait le nom du fichier à partir du chemin
 */
function getFileNameFromPath(pathValue) {
  const normalized = String(pathValue || '').replaceAll('\\', '/');
  const parts = normalized.split('/');
  return parts.pop() || '';
}

/**
 * Retourne la liste filtrée selon la recherche
 */
function getFilteredExplorerItems() {
  if (!searchTerm) {
    return currentDirectoryItems;
  }
  // La recherche est déjà filtrée côté backend
  return explorerItems;
}

/**
 * Rendu de la liste filtrée
 */
function renderFilteredExplorerList() {
  const filteredItems = getFilteredExplorerItems();
  renderList(filteredItems);

  const total = searchTerm ? explorerItems.length : currentDirectoryItems.length;
  if (searchTerm) {
    setStatus(`${filteredItems.length} élément(s) trouvés sur ${total} dans /pdf (${getApiLabel()}).`);
  } else {
    setStatus(`${total} élément(s) dans ${currentPath || '/'} (${getApiLabel()}).`);
  }
}

/**
 * Recharge les résultats de recherche
 */
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
    explorerItems = payload.items || [];
    renderFilteredExplorerList();
  } catch (error) {
    if (requestId !== searchRequestId) {
      return;
    }
    setStatus(error.message, true);
  }
}

/**
 * Efface le filtre de recherche
 */
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
 * Met à jour l'état des boutons d'action
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
 * Définit le message de statut
 */
function setStatus(message, isError = false) {
  statusElement.textContent = message;
  statusElement.classList.toggle('is-error', isError);
}

/**
 * Formate la taille en octets
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
 * Formate la date
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
 * Encode les paramètres de requête
 */
function encodeQuery(params) {
  return new URLSearchParams(params).toString();
}

/**
 * Retourne la liste des API candidates pour fallback
 */
function getApiCandidates() {
  if (activeApiUrl === REMOTE_API_URL) {
    return [REMOTE_API_URL, LOCAL_API_URL];
  }
  return [LOCAL_API_URL, REMOTE_API_URL];
}

/**
 * Vérifie si on doit réessayer avec un autre API
 */
function shouldRetryWithFallback(error, responseStatus) {
  const status = error?.status || responseStatus;
  if (status === 401 || status === 403) {
    return false;
  }
  if (error) {
    return true;
  }
  return responseStatus === 404 || responseStatus >= 500;
}

/**
 * Requête fetch avec fallback
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
          errors.push(`HTTP ${response.status} sur ${baseUrl}`);
          continue;
        }
        if (response.status === 401) {
          redirectToLogin();
        }
        const error = new Error(`HTTP ${response.status}`);
        error.status = response.status;
        throw error;
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
        errors.push(`${baseUrl} : ${error.message}`);
        continue;
      }
      throw error;
    }
  }

  throw new Error(errors.join(' | ') || 'API inaccessible');
}

/**
 * Requête GET
 */
async function apiGet(action, pathValue = '', extraParams = {}) {
  const query = encodeQuery({ action, path: pathValue, ...extraParams });
  return fetchWithFallback((baseUrl) => ({
    url: `${baseUrl}?${query}`,
    options: undefined,
  }));
}

/**
 * Requête POST
 */
async function apiPost(action, data) {
  return fetchWithFallback((baseUrl) => {
    const formData = new FormData();
    formData.append('action', action);
    Object.entries(data).forEach(([key, value]) => {
      if (value instanceof File) {
        formData.append(key, value);
      } else {
        formData.append(key, value);
      }
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
 * Résout l'URL de l'API active
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
 * Retourne l'étiquette de l'API pour le statut
 */
function getApiLabel() {
  if (activeApiUrl === REMOTE_API_URL) {
    return 'API distante';
  }
  return 'API locale';
}

/**
 * Ouvre un PDF dans l'application via postMessage ou nouvelle fenêtre
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

  const fallbackUrl = `${"./visualisation.php"}?${new URLSearchParams({ lien: `/${item.path}`, folderPanel: 'visible' }).toString()}`;
  window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
}

/**
 * Vérifie si le fichier est audio
 */
function isAudioFileName(fileName) {
  const lower = String(fileName || '').toLowerCase();
  return lower.endsWith('.mp3') || lower.endsWith('.m4a');
}

/**
 * Vérifie si le fichier est MusicXML
 */
function isMusicXmlFileName(fileName) {
  const lower = String(fileName || '').toLowerCase();
  return lower.endsWith('.musicxml') || lower.endsWith('.mxl') || lower.endsWith('.xml');
}

/**
 * Ouvre un MP3
 */
function openMp3FromExplorer(item) {
  const fileUrl = `${PDF_ROOT.replace(/\/$/, '')}/${item.path}`;
  window.open(fileUrl, '_blank', 'noopener,noreferrer');
}

/**
 * Ouvre un MusicXML
 */
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
 * Rendu de la navigation breadcrumb
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
 * Rendu de la liste
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
    } else if (isAudioFileName(item.name)) {
      iconClass = 'item-icon-audio';
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

    row.querySelector('.name-btn').addEventListener('click', () => {
      if (item.type === 'dir') {
        clearSearchFilter();
        void loadDirectory(item.path);
      } else if (item.name.toLowerCase().endsWith('.pdf')) {
        openPdfFromExplorer(item);
      } else if (isMusicXmlFileName(item.name)) {
        void openMusicXmlFromExplorer(item);
      } else if (isAudioFileName(item.name)) {
        openMp3FromExplorer(item);
      }
    });

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

    explorerBody.appendChild(row);
  });
}

/**
 * Charge un répertoire
 */
async function loadDirectory(pathValue = currentPath) {
  setStatus('Chargement...');
  try {
    const payload = await apiGet('list', pathValue);
    currentPath = payload.currentPath;
    parentPath = payload.parentPath;
    currentDirectoryItems = payload.items || [];
    explorerItems = currentDirectoryItems;
    renderBreadcrumbs(currentPath);
    await refreshExplorerSearchResults();
  } catch (error) {
    setStatus(error.message, true);
  }
}

/**
 * Vérifie si une sélection est requise
 */
function requireSelection() {
  if (!selectedItem) {
    throw new Error('Sélectionnez un élément d\'abord.');
  }
}

/**
 * Crée un nouveau dossier
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
 * Renomme un élément
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
      throw new Error('Renommage annulé : un autre fichier porte déjà ce nom.');
    }
  }

  await apiPost('rename', { path: selectedItem.path, newName: trimmedName });
  await loadDirectory(currentPath);
}

/**
 * Supprime un élément
 */
async function handleDelete() {
  requireSelection();
  if (selectedItem.type === 'dir' && selectedItem.isEmptyDir === false) {
    throw new Error('Suppression interdite : le dossier n\'est pas vide.');
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
    return `Fichier déplacé vers /pdf/${RECYCLE_BIN_ROOT}/${recycleFolderName}.`;
  }

  await apiPost('delete', { path: selectedItem.path });
  await loadDirectory(currentPath);
  return 'Élément supprimé.';
}

/**
 * Envoi de fichiers
 */
async function uploadFiles(files) {
  const fileList = Array.from(files || []).filter((file) => file instanceof File);
  if (!fileList.length) {
    throw new Error('Choisissez un fichier à envoyer.');
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

/**
 * Active la zone de dépôt
 */
function setDropZoneActive(isActive) {
  if (!explorerListWrap) {
    return;
  }
  explorerListWrap.classList.toggle('is-drag-over', isActive);
}

/**
 * Vérifie si le DataTransfer contient des fichiers
 */
function hasFilesInDataTransfer(dataTransfer) {
  if (!dataTransfer) {
    return false;
  }
  return Array.from(dataTransfer.types || []).includes('Files');
}

/**
 * Gère le dépôt de fichiers
 */
async function handleDroppedFiles(fileList) {
  try {
    setStatus('Envoi des fichiers...');
    await uploadFiles(fileList);
    setStatus('Fichier(s) envoyé(s).');
  } catch (error) {
    setStatus(error.message, true);
  }
}

/**
 * Télécharge un fichier
 */
async function handleDownload() {
  requireSelection();
  if (selectedItem.type !== 'file') {
    throw new Error('Le téléchargement est disponible uniquement pour les fichiers.');
  }
  const apiUrl = await resolveApiUrl();
  const query = encodeQuery({ action: 'download', path: selectedItem.path });
  window.open(`${apiUrl}?${query}`, '_blank', 'noopener,noreferrer');
}

/**
 * Coupe un fichier
 */
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
  setStatus(`Fichier coupé : ${cutItem.name}. Ouvrez un dossier puis cliquez sur Coller.`);
}

/**
 * Colle un fichier coupé
 */
async function handlePaste() {
  if (!cutItem) {
    throw new Error('Aucun fichier coupé.');
  }

  const targetPath = currentPath ? `${currentPath}/${cutItem.name}` : cutItem.name;
  if (targetPath === cutItem.path) {
    throw new Error('Le fichier est déjà dans ce dossier.');
  }

  await apiPost('move', {
    path: cutItem.path,
    targetPath,
  });

  const movedName = cutItem.name;
  cutItem = null;
  selectedItem = null;
  await loadDirectory(currentPath);
  setStatus(`Fichier déplacé : ${movedName}.`);
}

/**
 * Renomme un élément
 */
async function triggerRename() {
  try {
    await handleRename();
    setStatus('Élément renommé.');
  } catch (error) {
    setStatus(error.message, true);
  }
}

/**
 * Initialise le module explorateur
 */
async function initExplorer() {
  // Boutons de navigation
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

  // Opérations sur fichiers
  newFolderButton.addEventListener('click', async () => {
    try {
      await handleCreateFolder();
      setStatus('Dossier créé.');
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
      setStatus('Fichier envoyé.');
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

  // Initialisation
  updateActionButtons();
  try {
    await loadUserAccess();
    await loadDirectory('');
  } catch (error) {
    setStatus(error.message || 'Impossible de charger l\'explorateur.', true);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    void initExplorer();
  });
} else {
  void initExplorer();
}
