const WEBAPP_CONFIG = window.WEBAPP_CONFIG || {};
const BASE_URL = WEBAPP_CONFIG.BASE_URL || '/';
const AUTH_API = WEBAPP_CONFIG.AUTH_API || `${BASE_URL}webapp/api/auth.php`;
const DATA_API = WEBAPP_CONFIG.DATA_API || `${BASE_URL}webapp/api/data.php`;

var section = 1;

function redirectToLogin() {
    const returnUrl = encodeURIComponent(window.location.href);
    window.location.replace(`${BASE_URL}webapp/login.html?return=${returnUrl}`);
}

async function ensureAuthenticated() {
    try {
        const response = await fetch(`${AUTH_API}?action=check`, { credentials: 'include' });
        const payload = await response.json().catch(() => ({ success: false }));

        if (!response.ok || !payload.success) {
            redirectToLogin();
            return false;
        }

        return true;
    } catch (error) {
        redirectToLogin();
        return false;
    }
}

async function loadChantsForCategorie(categorieId) {
    const query = new URLSearchParams({ action: 'search_advanced', categorie_id: String(categorieId) }).toString();
    const response = await fetch(`${DATA_API}?${query}`, { credentials: 'include' });

    if (response.status === 401) {
        redirectToLogin();
        return [];
    }

    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload || !payload.success) {
        throw new Error((payload && payload.message) || `HTTP ${response.status}`);
    }

    return payload.chants || [];
}

async function fill_list() {
    if (!(await ensureAuthenticated())) {
        return;
    }

    try {
        const categoriesResponse = await fetch(`${DATA_API}?action=categories`, { credentials: 'include' });
        if (categoriesResponse.status === 401) {
            redirectToLogin();
            return;
        }

        const categoriesPayload = await categoriesResponse.json().catch(() => null);
        if (!categoriesResponse.ok || !categoriesPayload || !categoriesPayload.success) {
            throw new Error((categoriesPayload && categoriesPayload.message) || `HTTP ${categoriesResponse.status}`);
        }

        const categories = categoriesPayload.categories || [];
        const chantsByCategorie = await Promise.all(categories.map((categorie) => loadChantsForCategorie(categorie.id)));

        categories.forEach((categorie, index) => {
            insert_categorie(categorie.nom, chantsByCategorie[index]);
        });

        activate();
    } catch (error) {
        console.error(error);
        document.getElementById('liste_categories').innerHTML =
            `<li class="p-4 text-red-600">Impossible de charger les chants : ${error.message}</li>`;
    }
}

function insert_categorie(nom, chants) {
    const currentSection = section;
    section += 1;

    const entete = '<li><button type="button" class="w-full flex justify-between items-center px-4 py-3 text-left text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"aria-expanded="false" aria-controls="item'+currentSection+'" id="item'+currentSection+'-button" >\
					  <span class="font-semibold text-gray-800">'+nom+' ('+chants.length+')</span>\
                      <svg class="w-5 h-5 transform transition-transform duration-200" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>\
                </button><div id="item'+currentSection+'" class="bg-gray-50 px-4 py-3 text-gray-600 hidden" role="region" aria-labelledby="item'+currentSection+'-button">';

    const html_chants = chants.length
        ? chants.map((chant) => {
            const label = [chant.nom, chant.path].filter(Boolean).join(' - ');
            return '<div class="bg-white rounded shadow" data-chant-id="'+chant.id+'"><div class="flex items-center justify-between p-3 cursor-pointer select-none" style="padding: 2px;" ondblclick="open_chant_from_div(this)">\
          <div style="padding: 10px;">'+label+'</div><div class="flex space-x-2">\
            <svg class="button" width="20" height="20" style="margin-right: 15px; cursor: pointer;" onclick="open_chant_info(this)" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>\
          </div></div></div>';
        }).join('')
        : '<p class="text-gray-500 py-2">Aucun chant dans cette categorie.</p>';

    const end = "</div></li>";
    document.getElementById('liste_categories').insertAdjacentHTML('beforeend', entete + html_chants + end);
}

function activate() {
    document.querySelectorAll('button[aria-expanded]').forEach(button => {
        button.addEventListener('click', () => {
          const expanded = button.getAttribute('aria-expanded') === 'true';
          const controls = button.getAttribute('aria-controls');
          const content = document.getElementById(controls);
          if (expanded) {
            button.setAttribute('aria-expanded', 'false');
            content.classList.add('hidden');
            button.querySelector('svg').classList.remove('rotate-180');
          } else {
            button.setAttribute('aria-expanded', 'true');
            content.classList.remove('hidden');
            button.querySelector('svg').classList.add('rotate-180');
          }
        });
      });
}

function getChantIdFromElement(element) {
    const container = element.closest('[data-chant-id]');
    return container ? container.getAttribute('data-chant-id') : null;
}

function open_chant_info(element) {
    const chantId = getChantIdFromElement(element);
    if (!chantId) {
        return;
    }
    window.open(`${BASE_URL}webapp/description.html?chantId=${encodeURIComponent(chantId)}`, '_blank', 'noopener,noreferrer');
}

function open_chant_from_div(element) {
    open_chant_info(element);
}

function ouvrirRechercheApprofondie() {
    window.open(`${BASE_URL}webapp/recherche.html`, '_blank', 'noopener,noreferrer');
}

