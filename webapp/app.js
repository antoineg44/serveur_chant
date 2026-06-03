// Main Application Module
// Handles tab management and PDF viewer

const WEBAPP_CONFIG = window.WEBAPP_CONFIG || {};
const PDF_ROOT = WEBAPP_CONFIG.PDF_ROOT || `${WEBAPP_CONFIG.BASE_URL || ''}pdf/`;

const tabsContainer = document.querySelector('.tabs');
const panelsContainer = document.querySelector('.panels');

/**
 * Get all tab buttons
 */
function getTabs() {
  return Array.from(tabsContainer.querySelectorAll('.tab'));
}

/**
 * Get all panels
 */
function getPanels() {
  return Array.from(panelsContainer.querySelectorAll('.panel'));
}

/**
 * Activate a tab and show corresponding panel
 */
function activateTab(tabName) {
  getTabs().forEach((tabButton) => {
    const selected = tabButton.dataset.tab === tabName;
    tabButton.classList.toggle('is-active', selected);
    tabButton.setAttribute('aria-selected', String(selected));
  });

  getPanels().forEach((panel) => {
    const active = panel.id === `panel-${tabName}`;
    panel.classList.toggle('is-active', active);
    panel.hidden = !active;
  });
}

/**
 * Close a dynamic tab
 */
function closeDynamicTab(tabName) {
  const tabButton = document.getElementById(`tab-${tabName}`);
  const panel = document.getElementById(`panel-${tabName}`);

  if (!tabButton || !panel) {
    return;
  }

  const wasActive = tabButton.classList.contains('is-active');
  tabButton.remove();
  panel.remove();

  if (wasActive) {
    activateTab('explorer');
  }
}

/**
 * Create a safe tab key from a raw value
 */
function makeSafeTabKey(rawValue) {
  return rawValue
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70);
}

/**
 * Build PDF viewer URL
 */
function buildPdfViewerUrl(relativePdfPath, options = {}) {
  const normalized = relativePdfPath.startsWith('/') ? relativePdfPath : `/${relativePdfPath}`;
  const params = new URLSearchParams({ lien: normalized });
  if (options.showFolderPanel) {
    params.set('folderPanel', 'visible');
  }
  const query = params.toString();
  return `./visualisation.html?${query}`;
}

function buildPdfFileUrl(relativePdfPath) {
  const normalized = String(relativePdfPath || '').replace(/^\/+/, '');
  const encodedPath = normalized
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  return `${PDF_ROOT}${encodedPath}`;
}

function getRelativePdfPathFromLien(value) {
  const normalized = String(value || '')
    .trim()
    .replace(/^https?:\/\/[^/]+/i, '')
    .replace(/^\/+/, '')
    .replace(/^pdf\//i, '')
    .replace(/^\/+/g, '');

  return normalized;
}

function findPanelByFrameWindow(sourceWindow) {
  if (!sourceWindow) {
    return null;
  }

  const frames = Array.from(document.querySelectorAll('.viewer-frame'));
  const frame = frames.find((candidate) => candidate.contentWindow === sourceWindow);
  return frame ? frame.closest('.panel') : null;
}

function getCurrentPdfFileUrl(panel, fallbackPath) {
  const iframe = panel ? panel.querySelector('.viewer-frame') : null;

  try {
    const iframeLocation = iframe?.contentWindow?.location;
    if (iframeLocation) {
      const params = new URLSearchParams(iframeLocation.search);
      const lien = params.get('lien') || params.get('file') || params.get('url') || '';
      const relativePath = getRelativePdfPathFromLien(lien);

      if (relativePath) {
        return buildPdfFileUrl(relativePath);
      }
    }
  } catch (error) {
    // Ignore iframe access errors and fall back to the initial path.
  }

  return buildPdfFileUrl(fallbackPath);
}

function getCurrentFrameUrl(panel) {
  const iframe = panel ? panel.querySelector('.viewer-frame') : null;
  if (!iframe) {
    return '';
  }

  try {
    const href = iframe.contentWindow?.location?.href;
    if (href && href !== 'about:blank') {
      return href;
    }
  } catch (error) {
    // Ignore cross-origin iframe access errors and fall back to iframe.src.
  }

  return iframe.src || '';
}

function openPanelExternally(panel) {
  const frameUrl = getCurrentFrameUrl(panel);
  if (!frameUrl) {
    return;
  }

  window.open(frameUrl, '_blank', 'noopener,noreferrer');
}

function wireExternalButton(panel) {
  const button = panel ? panel.querySelector('.open-external-btn') : null;
  if (!button || button.dataset.wired === '1') {
    return;
  }

  button.dataset.wired = '1';
  button.addEventListener('click', () => {
    openPanelExternally(panel);
  });
}

async function copyTextToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return true;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', 'readonly');
  textarea.style.position = 'fixed';
  textarea.style.top = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);

  try {
    return document.execCommand('copy');
  } finally {
    textarea.remove();
  }
}

/**
 * Open PDF in new tab
 */
function createClosableTab(tabName, tabLabel) {
  const tabId = `tab-${tabName}`;
  const panelId = `panel-${tabName}`;

  const tabButton = document.createElement('button');
  tabButton.id = tabId;
  tabButton.className = 'tab tab-closable';
  tabButton.type = 'button';
  tabButton.setAttribute('role', 'tab');
  tabButton.setAttribute('aria-selected', 'false');
  tabButton.setAttribute('aria-controls', panelId);
  tabButton.dataset.tab = tabName;
  tabButton.innerHTML = `<span class="tab-label">${tabLabel}</span><span class="tab-close" role="button" aria-label="Fermer ${tabLabel}" title="Fermer">&times;</span>`;
  tabButton.addEventListener('click', () => activateTab(tabName));
  tabButton.querySelector('.tab-close').addEventListener('click', (event) => {
    event.stopPropagation();
    closeDynamicTab(tabName);
  });

  const panel = document.createElement('article');
  panel.id = panelId;
  panel.className = 'panel viewer-panel';
  panel.hidden = true;
  panel.setAttribute('role', 'tabpanel');
  panel.setAttribute('aria-labelledby', tabId);
  panel.setAttribute('tabindex', '0');

  return { tabButton, panel, panelId, tabId };
}

function openPdfInNewTab(item) {
  const safeKey = makeSafeTabKey(item.path) || `pdf-${Date.now()}`;
  const tabName = `pdf-${safeKey}`;
  const tabId = `tab-${tabName}`;
  const panelId = `panel-${tabName}`;

  let tabButton = document.getElementById(tabId);
  let panel = document.getElementById(panelId);

  if (!tabButton || !panel) {
    const pdfFileUrl = buildPdfFileUrl(item.path);
    const createdTab = createClosableTab(tabName, item.name);
    tabButton = createdTab.tabButton;
    panel = createdTab.panel;
    panel.dataset.currentPdfPath = item.path;

    panel.innerHTML = `
      <div class="panel-head">
        <div>
          <h2>${item.name}</h2>
        </div>
        <div class="panel-head-actions">
          <button type="button" class="btn btn-ghost icon-btn open-external-btn" title="Ouvrir dans un nouvel onglet" aria-label="Ouvrir dans un nouvel onglet">
            <span class="icon-glyph" aria-hidden="true">&#x2197;</span><span class="sr-only">Ouvrir dans un nouvel onglet</span>
          </button>
          <button type="button" class="btn btn-ghost copy-pdf-url-btn" data-url="${pdfFileUrl}">Copier l'url</button>
        </div>
      </div>
      <div class="viewer-frame-wrap">
        <iframe
          class="viewer-frame"
          title="Visualisation ${item.name}"
          src="${buildPdfViewerUrl(item.path, { showFolderPanel: Boolean(item.showFolderPanel) })}"
          loading="eager"
        ></iframe>
      </div>
    `;

    const copyButton = panel.querySelector('.copy-pdf-url-btn');
    if (copyButton) {
      copyButton.dataset.url = pdfFileUrl;
      copyButton.addEventListener('click', async () => {
        const defaultLabel = "Copier l'url";
        const currentPdfFileUrl = copyButton.dataset.url || getCurrentPdfFileUrl(panel, panel.dataset.currentPdfPath || item.path);

        try {
          const copied = await copyTextToClipboard(currentPdfFileUrl);
          if (!copied) {
            throw new Error('copy failed');
          }
          copyButton.dataset.url = currentPdfFileUrl;
          copyButton.textContent = 'Url copié';
        } catch (error) {
          copyButton.textContent = 'Copie impossible';
        }

        window.setTimeout(() => {
          copyButton.textContent = defaultLabel;
        }, 1600);
      });
    }

    wireExternalButton(panel);

    tabsContainer.appendChild(tabButton);
    panelsContainer.appendChild(panel);
  }

  activateTab(tabName);
}

function openPageInNewTab(item) {
  const rawKey = item.key || item.url || item.name || `page-${Date.now()}`;
  const safeKey = makeSafeTabKey(rawKey) || `page-${Date.now()}`;
  const tabName = `page-${safeKey}`;
  const tabId = `tab-${tabName}`;
  const panelId = `panel-${tabName}`;

  let tabButton = document.getElementById(tabId);
  let panel = document.getElementById(panelId);

  if (!tabButton || !panel) {
    const createdTab = createClosableTab(tabName, item.name || 'Page');
    tabButton = createdTab.tabButton;
    panel = createdTab.panel;

    panel.innerHTML = `
      <div class="panel-head">
        <div>
          <h2>${item.title || item.name || 'Page'}</h2>
        </div>
        <div class="panel-head-actions">
          <button type="button" class="btn btn-ghost icon-btn open-external-btn" title="Ouvrir dans un nouvel onglet" aria-label="Ouvrir dans un nouvel onglet">
            <span class="icon-glyph" aria-hidden="true">&#x2197;</span><span class="sr-only">Ouvrir dans un nouvel onglet</span>
          </button>
        </div>
      </div>
      <div class="viewer-frame-wrap">
        <iframe
          class="viewer-frame"
          title="${item.title || item.name || 'Page'}"
          src="${item.url}"
          loading="eager"
        ></iframe>
      </div>
    `;

    wireExternalButton(panel);

    tabsContainer.appendChild(tabButton);
    panelsContainer.appendChild(panel);
  }

  activateTab(tabName);
}

/**
 * Initialize application
 */
function initApp() {
  getTabs().forEach((tabButton) => {
    tabButton.addEventListener('click', () => activateTab(tabButton.dataset.tab));
  });

  getPanels().forEach((panel) => {
    wireExternalButton(panel);
  });

  activateTab('explorer');
}

// Listen for messages from embedded explorer/library iframes
window.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'openPdf' && event.data.item) {
    openPdfInNewTab(event.data.item);
    return;
  }

  if (event.data && event.data.type === 'openPageTab' && event.data.item) {
    openPageInNewTab(event.data.item);
    return;
  }

  if (event.data && event.data.type === 'visualisationPdfChanged') {
    const panel = findPanelByFrameWindow(event.source);
    if (!panel) {
      return;
    }

    const relativePath = event.data.relativePath || '';
    const fileUrl = event.data.fileUrl || '';
    if (relativePath) {
      panel.dataset.currentPdfPath = relativePath;
    }

    const copyButton = panel.querySelector('.copy-pdf-url-btn');
    if (copyButton && fileUrl) {
      copyButton.dataset.url = fileUrl;
    }
  }
});

document.addEventListener('DOMContentLoaded', initApp);
