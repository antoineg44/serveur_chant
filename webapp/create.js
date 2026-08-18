// Creates a Programme row, then hands over to the editor.

const WEBAPP_CONFIG = window.WEBAPP_CONFIG || {};
const BASE_URL = WEBAPP_CONFIG.BASE_URL || '';
const PROGRAMME_API = WEBAPP_CONFIG.PROGRAMME_API || `${BASE_URL}webapp/api/programme.php`;
const LOCAL_PROGRAMME_API = './api/programme.php';

const form = document.getElementById('create-program-form');
const messageElement = document.getElementById('form_message');
const paroisseSelect = document.getElementById('paroisse');

function showFormMessage(message, isError) {
  messageElement.textContent = message;
  messageElement.className = `form-message ${message ? (isError ? 'is-error' : 'is-success') : ''}`;
}

async function callApi(action, params = {}, method = 'GET') {
  const endpoints = [LOCAL_PROGRAMME_API, PROGRAMME_API];
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

async function loadParoisses() {
  try {
    const payload = await callApi('list');
    (payload.paroisses || []).forEach((paroisse) => {
      const option = document.createElement('option');
      option.value = paroisse;
      option.textContent = paroisse;
      paroisseSelect.appendChild(option);
    });
  } catch (error) {
    showFormMessage(error.message, true);
  }
}

function openEditor(programmeId) {
  const url = `./modifications.html?programmeId=${encodeURIComponent(programmeId)}`;

  if (window.parent && window.parent !== window) {
    window.parent.postMessage({
      type: 'openPageTab',
      item: {
        key: `modify-programme-${programmeId}`,
        name: 'Modifier - Programme',
        title: 'Modifier - Programme',
        description: 'Modifier',
        url,
      },
    }, '*');
    return;
  }

  window.location.href = url;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  showFormMessage('', false);

  const payload = {
    date: document.getElementById('date').value,
    lieu: document.getElementById('lieu').value.trim(),
    occasion: document.getElementById('occasion').value.trim(),
    paroisse: paroisseSelect.value.trim() || document.getElementById('paroisse-libre').value.trim(),
    description: document.getElementById('description').value.trim(),
  };

  if (!payload.date || !payload.lieu || !payload.occasion || !payload.paroisse) {
    showFormMessage('Merci de remplir tous les champs obligatoires.', true);
    return;
  }

  try {
    const created = await callApi('programme_save', payload, 'POST');
    showFormMessage('Programme cree.', false);
    form.reset();
    openEditor(created.id);
  } catch (error) {
    showFormMessage(error.message, true);
  }
});

loadParoisses();
