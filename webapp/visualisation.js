const WEBAPP_CONFIG = window.WEBAPP_CONFIG || {};
const BASE_URL = WEBAPP_CONFIG.BASE_URL || '';
const VISUALISATION_API_URL = WEBAPP_CONFIG.EXPLORER_API || `${BASE_URL}webapp/api/explorer.php`;
const REMOTE_VIEWER_URL = WEBAPP_CONFIG.VIEWER_URL || `${BASE_URL}components/viewer/viewer.html`;
const REMOTE_PDF_ROOT = WEBAPP_CONFIG.PDF_ROOT || `${BASE_URL}pdf/`;

let currentRelativePdfPath = '';
let currentProgram = null;
let isSidebarHidden = document.querySelector('.layout')?.classList.contains('is-sidebar-hidden') ?? false;
let isProgramSidebarHidden = false;
let hasProgramSidebar = false;

function shouldShowSidebarOnLoad() {
  const params = new URLSearchParams(window.location.search);
  return params.get('folderPanel') === 'visible';
}

function setSidebarHidden(hidden) {
  const layout = document.querySelector('.layout');
  const toggleButton = document.getElementById('sidebar-toggle');
  const floatingButton = document.getElementById('sidebar-toggle-floating');

  isSidebarHidden = Boolean(hidden);
  layout.classList.toggle('is-sidebar-hidden', isSidebarHidden);
  toggleButton.setAttribute('aria-expanded', String(!isSidebarHidden));
  floatingButton.setAttribute('aria-expanded', String(!isSidebarHidden));
  toggleButton.textContent = isSidebarHidden ? 'Afficher' : 'Masquer';
  floatingButton.hidden = !isSidebarHidden;
}

function toggleSidebar() {
  setSidebarHidden(!isSidebarHidden);
}

function setProgramSidebarHidden(hidden) {
  const programSidebar = document.getElementById('program-sidebar');
  const toggleButton = document.getElementById('program-toggle');
  const floatingButton = document.getElementById('program-toggle-floating');

  if (!programSidebar || !toggleButton || !floatingButton) {
    return;
  }

  isProgramSidebarHidden = Boolean(hidden);
  programSidebar.classList.toggle('is-hidden', isProgramSidebarHidden);
  toggleButton.setAttribute('aria-expanded', String(!isProgramSidebarHidden));
  floatingButton.setAttribute('aria-expanded', String(!isProgramSidebarHidden));
  toggleButton.textContent = isProgramSidebarHidden ? 'Afficher' : 'Masquer';
  floatingButton.hidden = !hasProgramSidebar || !isProgramSidebarHidden;
}

function toggleProgramSidebar() {
  setProgramSidebarHidden(!isProgramSidebarHidden);
}

function showProgramSidebarFromFloating() {
  setProgramSidebarHidden(false);
  setSidebarHidden(true);
}

function showFolderSidebarFromFloating() {
  setSidebarHidden(false);
  if (hasProgramSidebar) {
    setProgramSidebarHidden(true);
  }
}

function showMessage(message) {
  const box = document.getElementById('message');
  const text = document.getElementById('message-text');
  box.classList.add('is-visible');
  text.textContent = message;
}

function hideMessage() {
  const box = document.getElementById('message');
  box.classList.remove('is-visible');
}

function cleanPath(value) {
  return String(value || '')
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/\/+/g, '/');
}

function decodeProgramLine(value) {
  return String(value || '').replaceAll('Â£', '£').trim();
}

function splitProgramLines(text) {
  const raw = String(text || '');
  const normalized = raw.replaceAll('\r\n', '\n').replaceAll('\r', '\n');
  return normalized.split('\n');
}

function resolveProgramUrl() {
  const params = new URLSearchParams(window.location.search);
  const rawProgram = (params.get('programme') || '').trim();

  if (!rawProgram) {
    return '';
  }

  try {
    if (/^https?:\/\//i.test(rawProgram)) {
      return new URL(rawProgram).toString();
    }

    const normalized = rawProgram.startsWith('/') ? rawProgram.slice(1) : rawProgram;
    return new URL(normalized, `${window.location.origin}/`).toString();
  } catch (error) {
    return '';
  }
}

function getRelativePathFromPdfUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) {
    return '';
  }

  try {
    const parsed = new URL(raw);
    const path = decodeURIComponent(parsed.pathname || '');
    const markerIndex = path.toLowerCase().indexOf('/pdf/');
    if (markerIndex >= 0) {
      return cleanPath(path.slice(markerIndex + 5));
    }
    return cleanPath(path);
  } catch (error) {
    const withoutOrigin = raw.replace(/^https?:\/\/[^/]+/i, '');
    const markerIndex = withoutOrigin.toLowerCase().indexOf('/pdf/');
    if (markerIndex >= 0) {
      return cleanPath(withoutOrigin.slice(markerIndex + 5));
    }
    return cleanPath(withoutOrigin);
  }
}

function parseProgramText(programText) {
  const lines = splitProgramLines(programText);
  const entries = [];

  let date = '';
  let lieu = '';
  let occasion = '';

  const header = decodeProgramLine(lines[0] || '');
  if (header) {
    const infos = header.split('£');
    if (infos.length >= 3) {
      date = infos[0]?.trim() || '';
      lieu = infos[1]?.trim() || '';
      occasion = infos[2]?.trim() || '';
    }
  }

  for (let i = 0; i < lines.length; i += 1) {
    const line = decodeProgramLine(lines[i]);
    if (!line) {
      continue;
    }

    const partMatch = line.match(/^\[(.+)\]$/);
    if (partMatch) {
      entries.push({
        type: 'partie',
        name: partMatch[1].trim() || 'Partie',
      });
      continue;
    }

    if (!line.startsWith('#')) {
      continue;
    }

    const name = line.slice(1).trim() || 'Chant';
    let path = '';

    if (i + 1 < lines.length) {
      const nextLine = decodeProgramLine(lines[i + 1]);
      if (/^path\s*=\s*/i.test(nextLine)) {
        path = cleanPath(nextLine.replace(/^path\s*=\s*/i, '').trim());
        i += 1;
      }
    }

    entries.push({
      type: 'chant',
      name,
      path,
    });
  }

  return {
    date,
    lieu,
    occasion,
    entries,
  };
}

function parseProgramJson(programJson) {
  const parsed = JSON.parse(programJson);
  const entries = Array.isArray(parsed.chants)
    ? parsed.chants
      .filter((entry) => entry && (entry.type === 'partie' || entry.type === 'chant'))
      .map((entry) => ({
        type: entry.type,
        name: String(entry.name || '').trim() || (entry.type === 'partie' ? 'Partie' : 'Chant'),
        path: entry.type === 'chant' ? cleanPath(entry.path || '') : '',
      }))
    : [];

  return {
    date: String(parsed.date || '').trim(),
    lieu: String(parsed.lieu || '').trim(),
    occasion: String(parsed.occasion || '').trim(),
    entries,
  };
}

function getProgramTitle(programData, fallbackUrl) {
  const date = String(programData.date || '').trim();
  const lieu = String(programData.lieu || '').trim();

  if (date && lieu) {
    return `${date} a ${lieu}`;
  }

  if (lieu) {
    return lieu;
  }

  if (date) {
    return date;
  }

  try {
    const parsedUrl = new URL(fallbackUrl);
    const fileName = decodeURIComponent(parsedUrl.pathname.split('/').pop() || 'Programme');
    return fileName || 'Programme';
  } catch (error) {
    return 'Programme';
  }
}

function getFirstProgramPdfPath(programEntries) {
  const firstEntry = (programEntries || []).find((entry) => entry.type === 'chant' && entry.path);
  return firstEntry ? cleanPath(firstEntry.path) : '';
}

async function loadProgramDefinition(programUrl) {
  const relativeProgramPath = getRelativePathFromPdfUrl(programUrl);
  let contentType = '';
  let text = '';

  if (relativeProgramPath) {
    const query = new URLSearchParams({
      action: 'download',
      path: relativeProgramPath,
    }).toString();
    const response = await fetch(`${VISUALISATION_API_URL}?${query}`);
    if (!response.ok) {
      throw new Error(`Erreur HTTP ${response.status} pendant le chargement du programme.`);
    }
    contentType = (response.headers.get('content-type') || '').toLowerCase();
    text = await response.text();
  } else {
    const response = await fetch(programUrl);
    if (!response.ok) {
      throw new Error(`Erreur HTTP ${response.status} pendant le chargement du programme.`);
    }
    contentType = (response.headers.get('content-type') || '').toLowerCase();
    text = await response.text();
  }

  let parsed;
  const isJson = contentType.includes('application/json') || /\.json($|\?)/i.test(programUrl);
  if (isJson) {
    parsed = parseProgramJson(text);
  } else {
    parsed = parseProgramText(text);
  }

  if (!Array.isArray(parsed.entries) || !parsed.entries.length) {
    throw new Error('Le programme ne contient aucun element exploitable.');
  }

  return {
    sourceUrl: programUrl,
    title: getProgramTitle(parsed, programUrl),
    date: parsed.date,
    lieu: parsed.lieu,
    occasion: parsed.occasion,
    entries: parsed.entries,
  };
}

function normalizePdfUrl(value) {
  const rawValue = String(value || '').trim();

  if (!rawValue) {
    return '';
  }

  try {
    const parsed = new URL(rawValue);
    parsed.pathname = parsed.pathname
      .split('/')
      .map((segment) => encodeURIComponent(decodeURIComponent(segment)))
      .join('/');
    return parsed.toString();
  } catch (error) {
    return rawValue.replace(/ /g, '%20');
  }
}

function splitParentAndName(path) {
  const cleaned = cleanPath(path);
  const parts = cleaned.split('/').filter(Boolean);
  const name = parts.pop() || '';
  return {
    parent: cleanPath(parts.join('/')),
    name,
  };
}

function getLastFolderName(path) {
  const parent = splitParentAndName(path).parent;
  if (!parent) {
    return '';
  }

  const parts = parent.split('/').filter(Boolean);
  return parts.length ? parts[parts.length - 1] : '';
}

function stripFileExtension(fileName) {
  return String(fileName || '').replace(/\.[^/.]+$/, '');
}

function getRelativePdfPath(pdfUrl) {
  if (!pdfUrl) {
    return '';
  }

  try {
    const pdf = new URL(pdfUrl);
    const root = new URL(REMOTE_PDF_ROOT);
    const rootPath = root.pathname.endsWith('/') ? root.pathname : `${root.pathname}/`;

    if (pdf.origin !== root.origin || !pdf.pathname.startsWith(rootPath)) {
      return '';
    }

    return cleanPath(decodeURIComponent(pdf.pathname.slice(rootPath.length)));
  } catch (error) {
    return '';
  }
}

function formatFolderLabel(path) {
  const cleaned = cleanPath(path);
  return cleaned ? `/pdf/${cleaned}` : '/pdf';
}

function buildPdfFileUrl(relativePdfPath) {
  const normalized = cleanPath(relativePdfPath);
  const encodedPath = normalized
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  return `${REMOTE_PDF_ROOT}${encodedPath}`;
}

function buildProtectedPdfUrl(relativePdfPath) {
  const params = new URLSearchParams({
    action: 'download',
    path: cleanPath(relativePdfPath),
  });
  return `${VISUALISATION_API_URL}?${params.toString()}`;
}

function notifyParentPdfChanged(relativePdfPath) {
  if (!window.parent || window.parent === window) {
    return;
  }

  const cleanRelativePath = cleanPath(relativePdfPath);
  window.parent.postMessage({
    type: 'visualisationPdfChanged',
    relativePath: cleanRelativePath,
    fileUrl: buildPdfFileUrl(cleanRelativePath),
    fileName: splitParentAndName(cleanRelativePath).name || '',
  }, '*');
}

function updateQueryForRelativePath(relativePath) {
  const params = new URLSearchParams(window.location.search);
  params.delete('url');
  params.delete('file');
  params.set('lien', `/pdf/${cleanPath(relativePath)}`);
  const nextUrl = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState(null, '', nextUrl);
}

async function listDirectory(path) {
  const query = new URLSearchParams({ action: 'list', path: cleanPath(path) }).toString();
  const response = await fetch(`${VISUALISATION_API_URL}?${query}`);
  const payload = await response.json().catch(() => ({ success: false, message: 'Invalid JSON response.' }));

  if (!response.ok || !payload.success) {
    throw new Error(payload.message || 'Erreur de lecture du dossier.');
  }

  return payload;
}

function renderFileList(items, currentFileName, folderPath) {
  const folderLabel = document.getElementById('folder-path');
  const fileList = document.getElementById('file-list');
  folderLabel.textContent = formatFolderLabel(folderPath);
  fileList.innerHTML = '';

  const files = Array.isArray(items)
    ? items.filter((item) => item && item.type === 'file')
    : [];

  if (!files.length) {
    fileList.innerHTML = '<div class="sidebar-empty">Aucun fichier trouve dans ce dossier.</div>';
    return;
  }

  files.sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));

  for (const item of files) {
    const isPdf = String(item.name || '').toLowerCase().endsWith('.pdf');
    const isSelected = item.name === currentFileName;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `file-card${isSelected ? ' is-selected' : ''}${isPdf ? ' is-clickable' : ' is-disabled'}`;
    button.disabled = !isPdf;

    const icon = document.createElement('span');
    icon.className = 'file-icon';
    icon.textContent = isPdf ? 'PDF' : 'DOC';

    const content = document.createElement('span');
    content.className = 'file-content';

    const name = document.createElement('span');
    name.className = 'file-name';
    name.textContent = item.name;

    const meta = document.createElement('span');
    meta.className = 'file-meta';
    meta.textContent = isPdf ? '' : 'Fichier non PDF';

    content.appendChild(name);
    content.appendChild(meta);
    button.appendChild(icon);
    button.appendChild(content);

    if (isPdf) {
      button.addEventListener('click', () => {
        const nextRelativePath = cleanPath(item.path || `${folderPath}/${item.name}`);
        void loadVisualisation(nextRelativePath);
      });
    }

    fileList.appendChild(button);
  }
}

function renderProgramList(programEntries, currentPath, title) {
  const programLabel = document.getElementById('program-path');
  const programList = document.getElementById('program-list');
  programLabel.textContent = title || 'Programme';
  programList.innerHTML = '';

  const entries = Array.isArray(programEntries) ? programEntries : [];
  if (!entries.length) {
    programList.innerHTML = '<div class="sidebar-empty">Aucun chant trouve dans ce programme.</div>';
    return;
  }

  for (const entry of entries) {
    if (entry.type === 'partie') {
      const part = document.createElement('div');
      part.className = 'program-part-text';
      part.textContent = entry.name;
      programList.appendChild(part);
      continue;
    }

    const itemPath = cleanPath(entry.path);
    const isSelected = itemPath && itemPath === cleanPath(currentPath);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `file-card${isSelected ? ' is-selected' : ''}${itemPath ? ' is-clickable' : ' is-disabled'}`;
    button.disabled = !itemPath;

    const icon = document.createElement('span');
    icon.className = 'file-icon';
    icon.textContent = itemPath.toLowerCase().endsWith('.pdf') ? 'PDF' : 'DOC';

    const content = document.createElement('span');
    content.className = 'file-content';

    const name = document.createElement('span');
    name.className = 'file-name';
    const fileBaseName = splitParentAndName(itemPath).name || entry.name || 'Chant';
    name.textContent = stripFileExtension(fileBaseName) || 'Chant';

    const meta = document.createElement('span');
    meta.className = 'file-meta';
    meta.textContent = itemPath
      ? (getLastFolderName(itemPath) || 'Racine')
      : 'Aucun PDF associe';

    content.appendChild(name);
    content.appendChild(meta);
    button.appendChild(icon);
    button.appendChild(content);

    if (itemPath) {
      button.addEventListener('click', () => {
        void loadVisualisation(itemPath);
      });
    }

    programList.appendChild(button);
  }
}

async function renderSiblingFiles(relativePdfPath) {
  const split = splitParentAndName(relativePdfPath);

  if (!split.name) {
    document.getElementById('folder-path').textContent = '/pdf';
    document.getElementById('file-list').innerHTML = '<div class="sidebar-empty">Aucun fichier selectionne.</div>';
    return 0;
  }

  const payload = await listDirectory(split.parent);
  const files = Array.isArray(payload.items)
    ? payload.items.filter((item) => item && item.type === 'file')
    : [];
  renderFileList(payload.items, split.name, split.parent);
  return files.length;
}

function resolvePdfUrl() {
  const params = new URLSearchParams(window.location.search);
  const directUrl = (params.get('url') || params.get('file') || '').trim();
  const lien = (params.get('lien') || '').trim();

  if (directUrl) {
    if (/^https?:\/\//i.test(directUrl)) {
      return normalizePdfUrl(directUrl);
    }

    return normalizePdfUrl(new URL(cleanPath(directUrl), REMOTE_PDF_ROOT).toString());
  }

  if (!lien) {
    return '';
  }

  if (/^https?:\/\//i.test(lien)) {
    return normalizePdfUrl(lien);
  }

  const normalizedLien = cleanPath(lien.replace(/^pdf\//i, '').replace(/^\/pdf\//i, ''));
  return normalizedLien ? normalizePdfUrl(new URL(normalizedLien, REMOTE_PDF_ROOT).toString()) : '';
}

async function loadVisualisation(relativePdfPath) {
  const iframe = document.getElementById('pdf-viewer');
  const cleanRelativePath = cleanPath(relativePdfPath);
  const pdfUrl = buildProtectedPdfUrl(cleanRelativePath);
  currentRelativePdfPath = cleanRelativePath;

  if (currentProgram) {
    renderProgramList(currentProgram.entries, cleanRelativePath, currentProgram.title);
  }

  hideMessage();
  iframe.src = `${REMOTE_VIEWER_URL}?${new URLSearchParams({ file: pdfUrl }).toString()}#pagemode=none`;
  const siblingFileCount = await renderSiblingFiles(cleanRelativePath);
  updateQueryForRelativePath(cleanRelativePath);
  notifyParentPdfChanged(cleanRelativePath);
  document.title = `Visualisation PDF - ${splitParentAndName(cleanRelativePath).name || 'Document'}`;
  return siblingFileCount;
}

async function initViewer() {
  document.getElementById('sidebar-toggle').addEventListener('click', toggleSidebar);
  document.getElementById('sidebar-toggle-floating').addEventListener('click', showFolderSidebarFromFloating);
  document.getElementById('program-toggle')?.addEventListener('click', toggleProgramSidebar);
  document.getElementById('program-toggle-floating')?.addEventListener('click', showProgramSidebarFromFloating);
  const programSidebar = document.getElementById('program-sidebar');
  const programFloatingButton = document.getElementById('program-toggle-floating');
  const programUrl = resolveProgramUrl();

  if (programUrl) {
    try {
      currentProgram = await loadProgramDefinition(programUrl);
      hasProgramSidebar = true;
      programSidebar.hidden = false;
      setProgramSidebarHidden(false);
    } catch (error) {
      showMessage(error.message || 'Erreur pendant le chargement du programme.');
      return;
    }
  } else {
    hasProgramSidebar = false;
    programSidebar.hidden = true;
    programSidebar.classList.remove('is-hidden');
    if (programFloatingButton) {
      programFloatingButton.hidden = true;
    }
  }

  const pdfUrl = resolvePdfUrl();

  if (!pdfUrl && !currentProgram) {
    document.getElementById('folder-path').textContent = '/pdf';
    document.getElementById('file-list').innerHTML = '<div class="sidebar-empty">Ajoutez un PDF pour afficher les autres fichiers du dossier.</div>';
    showMessage('Ajoutez un parametre ?url=, ?file=, ?lien= ou ?programme= pour afficher un PDF.');
    return;
  }

  let relativePdfPath = pdfUrl ? getRelativePdfPath(pdfUrl) : '';
  if (!relativePdfPath && currentProgram) {
    relativePdfPath = getFirstProgramPdfPath(currentProgram.entries);
  }

  if (!relativePdfPath) {
    showMessage('Le programme ne contient aucun PDF exploitable.');
    return;
  }

  try {
    const siblingFileCount = await loadVisualisation(relativePdfPath);
    if (shouldShowSidebarOnLoad()) {
      setSidebarHidden(!(siblingFileCount > 1));
    }
  } catch (error) {
    showMessage(error.message || 'Erreur pendant le chargement du dossier.');
  }
}

void initViewer();