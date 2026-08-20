const WEBAPP_CONFIG = window.WEBAPP_CONFIG || {};
const BASE_URL = WEBAPP_CONFIG.BASE_URL || '/';
const AUTH_API = WEBAPP_CONFIG.AUTH_API || `${BASE_URL}webapp/api/auth.php`;
const PROGRAMME_API = WEBAPP_CONFIG.PROGRAMME_API || `${BASE_URL}webapp/api/programme.php`;

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

function formatDate(value) {
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) {
        return value || '-';
    }
    return date.toLocaleDateString('fr-FR');
}

async function fill_list() {
    if (!(await ensureAuthenticated())) {
        return;
    }

    try {
        const query = new URLSearchParams({ action: 'list' }).toString();
        const response = await fetch(`${PROGRAMME_API}?${query}`, { credentials: 'include' });

        if (response.status === 401) {
            redirectToLogin();
            return;
        }

        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload || !payload.success) {
            throw new Error((payload && payload.message) || `HTTP ${response.status}`);
        }

        const paroisses = payload.paroisses || [];
        const programmes = payload.programmes || [];

        paroisses.forEach((paroisse) => {
            const programmesForParoisse = programmes.filter((programme) => programme.paroisse === paroisse);
            insert_paroisse(paroisse, programmesForParoisse);
        });

        activate();
    } catch (error) {
        console.error(error);
        document.getElementById('liste_paroisses').innerHTML =
            `<li class="p-4 text-red-600">Impossible de charger les programmes : ${error.message}</li>`;
    }
}

function insert_paroisse(paroisse, programmes) {
    const currentSection = section;
    section += 1;

    const entete = '<li><button type="button" class="w-full flex justify-between items-center px-4 py-3 text-left text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"aria-expanded="false" aria-controls="item'+currentSection+'" id="item'+currentSection+'-button" >\
					  <span class="font-semibold text-gray-800">'+paroisse+'</span>\
                      <svg class="w-5 h-5 transform transition-transform duration-200" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>\
                </button><div id="item'+currentSection+'" class="bg-gray-50 px-4 py-3 text-gray-600 hidden" role="region" aria-labelledby="item'+currentSection+'-button">';

    const html_programmes = programmes.map((programme) => {
        const label = [formatDate(programme.date), programme.lieu, programme.occasion].filter(Boolean).join(' - ');
        return '<div class="bg-white rounded shadow" data-programme-id="'+programme.id+'"><div class="flex items-center justify-between p-3 cursor-pointer select-none" style="padding: 2px;" ondblclick="view_programme_from_div(this)">\
          <div style="padding: 10px;">'+label+'</div><div class="flex space-x-2">\
            <img class="button" src="../../components/icons/edit.png" onclick="edit_programme(this)">\
            <img class="button" src="../../components/icons/arrow.png" onclick="view_programme(this)">\
            <img class="button" src="../../components/icons/share.png" style="margin-right: 15px;" onclick="share_programme(this)">\
          </div></div></div>';
    }).join('');

    const end = "</div></li>";
    document.getElementById('liste_paroisses').insertAdjacentHTML('beforeend', entete + html_programmes + end);
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

function ajouterNouveauProgramme() {
    console.log('Ajouter un nouveau programme clicked');
    window.location.href = window.location.origin+"/pages/nouveau/";
}

function getProgrammeIdFromElement(element) {
    const container = element.closest('[data-programme-id]');
    return container ? container.getAttribute('data-programme-id') : null;
}

function edit_programme(element) {
    const programmeId = getProgrammeIdFromElement(element);
    if (!programmeId) {
        return;
    }
    window.open(`${BASE_URL}webapp/modifications.html?programmeId=${encodeURIComponent(programmeId)}`, '_blank', 'noopener,noreferrer');
}

function view_programme(element) {
    const programmeId = getProgrammeIdFromElement(element);
    if (!programmeId) {
        return;
    }
    window.open(`${BASE_URL}webapp/visualisation.html?programmeId=${encodeURIComponent(programmeId)}`, '_blank', 'noopener,noreferrer');
}

function view_programme_from_div(element) {
    view_programme(element);
}

function share_programme(element) {
    const programmeId = getProgrammeIdFromElement(element);
    if (!programmeId) {
        return;
    }
    const shareUrl = `${BASE_URL}webapp/informations.html?programmeId=${encodeURIComponent(programmeId)}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
        alert("Lien copié : " + shareUrl);
    });
}
