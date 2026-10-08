// Gemensamma hjälpfunktioner för frontend (kund/förening-sidan) och adminpanelen

// Adressen till API-backenden (driftsätts separat på Railway).
// Sätts i config.js, som laddas före denna fil.
const API_BASE_URL = (window.FORENINGSBOKNING_CONFIG && window.FORENINGSBOKNING_CONFIG.API_BASE_URL) || '';

// Webbplatsens rotadress, uträknad från var den här filen själv laddades
// ifrån. Gör att länkar/bilder fungerar både på webbplatsens rot (Netlify)
// och i en undermapp (t.ex. GitHub Pages: dittnamn.github.io/repo-namn/),
// samt oavsett om sidan som laddar filen ligger i rotmappen eller i admin/.
const SITE_BASE = (function () {
    const scripts = document.getElementsByTagName('script');
    for (let i = 0; i < scripts.length; i++) {
        const src = scripts[i].src || '';
        const idx = src.indexOf('js/app.js');
        if (idx !== -1) return src.slice(0, idx);
    }
    return '/';
})();

// Bild baserad på objektets typ (används om inget namn matchar nedan)
const OBJEKT_BILD = {
    bil: SITE_BASE + 'img/objekt/bil.jpg',
    slap: SITE_BASE + 'img/objekt/slap.jpg',
    popcornmaskin: SITE_BASE + 'img/objekt/popcornmaskin.jpg',
    elefantdrakt: SITE_BASE + 'img/objekt/elefantdrakt.jpg',
    skanebutiken: SITE_BASE + 'img/objekt/skanebutiken.jpg',
};

// Bild baserad på ord i objektets namn (prioriteras före typen ovan),
// t.ex. för att skilja på flera bilar med olika utseende
const OBJEKT_BILD_NAMN = [
    { match: 'rosa', bild: SITE_BASE + 'img/objekt/rosa-volvo.jpg' },
    { match: 'gul', bild: SITE_BASE + 'img/objekt/gul-volvo.jpg' },
    { match: 'slap', bild: SITE_BASE + 'img/objekt/slap.jpg' },
    { match: 'släp', bild: SITE_BASE + 'img/objekt/slap.jpg' },
];

function bildForObjekt(objekt) {
    const namnLower = (objekt.namn || '').toLowerCase();
    const typLower = (objekt.typ || '').toLowerCase();

    const namnTraff = OBJEKT_BILD_NAMN.find(o => namnLower.includes(o.match));
    if (namnTraff) return namnTraff.bild;

    const typTraff = OBJEKT_BILD_NAMN.find(o => typLower.includes(o.match));
    if (typTraff) return typTraff.bild;

    return OBJEKT_BILD[objekt.typ] || OBJEKT_BILD[typLower] || null;
}

// Inloggningstoken sparas i webbläsaren. Behövs eftersom Safari/iPhone blockerar
// kakor mellan olika domäner (frontend och API ligger på olika adresser).
function hamtaToken() {
    try { return localStorage.getItem('bokning_token'); } catch (e) { return null; }
}
function sparaToken(token) {
    try {
        if (token) localStorage.setItem('bokning_token', token);
        else localStorage.removeItem('bokning_token');
    } catch (e) { /* lagring blockerad */ }
}

async function api(url, method = 'GET', body = null) {
    const headers = { 'Content-Type': 'application/json' };
    const token = hamtaToken();
    if (token) headers['Authorization'] = 'Bearer ' + token;
    const opts = { method, headers, credentials: 'include' };
    if (body !== null) opts.body = JSON.stringify(body);
    const res = await fetch(API_BASE_URL + url, opts);
    let data = {};
    try { data = await res.json(); } catch (e) { /* tomt svar */ }
    if (url === '/api/login' && res.ok && data.token) sparaToken(data.token);
    if (url === '/api/logout') sparaToken(null);
    return { ok: res.ok, status: res.status, data };
}

function visaMeddelande(text, typ) {
    const yta = document.getElementById('meddelande-yta');
    if (!yta) { alert(text); return; }
    yta.innerHTML = `<div class="meddelande ${typ}">${text}</div>`;
    yta.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function kollaInloggning() {
    const svar = await api('/api/me');
    return svar.data;
}

async function loggaUt() {
    await api('/api/logout', 'POST');
    window.location.href = SITE_BASE + 'index.html';
}

function statusText(status) {
    return {
        vantande: 'Väntar på godkännande',
        bekraftad: 'Bekräftad',
        nekad: 'Nekad',
        avbokad: 'Avbokad',
    }[status] || status;
}
