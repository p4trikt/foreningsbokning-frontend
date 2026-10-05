// Gemensamma hjälpfunktioner för frontend (kund/förening-sidan) och adminpanelen

// Adressen till API-backenden (driftsätts separat på Railway).
// Sätts i config.js, som laddas före denna fil.
const API_BASE_URL = (window.FORENINGSBOKNING_CONFIG && window.FORENINGSBOKNING_CONFIG.API_BASE_URL) || '';

// Bild baserad på objektets typ (används om inget namn matchar nedan)
const OBJEKT_BILD = {
    bil: '/img/objekt/bil.jpg',
    slap: '/img/objekt/slap.jpg',
    popcornmaskin: '/img/objekt/popcornmaskin.jpg',
    elefantdrakt: '/img/objekt/elefantdrakt.jpg',
    skanebutiken: '/img/objekt/skanebutiken.jpg',
};

// Bild baserad på ord i objektets namn (prioriteras före typen ovan),
// t.ex. för att skilja på flera bilar med olika utseende
const OBJEKT_BILD_NAMN = [
    { match: 'rosa', bild: '/img/objekt/rosa-volvo.jpg' },
    { match: 'gul', bild: '/img/objekt/gul-volvo.jpg' },
    { match: 'slap', bild: '/img/objekt/slap.jpg' },
    { match: 'släp', bild: '/img/objekt/slap.jpg' },
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

async function api(url, method = 'GET', body = null) {
    const opts = {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
    };
    if (body !== null) opts.body = JSON.stringify(body);
    const res = await fetch(API_BASE_URL + url, opts);
    let data = {};
    try { data = await res.json(); } catch (e) { /* tomt svar */ }
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
    window.location.href = '/index.html';
}

function statusText(status) {
    return {
        vantande: 'Väntar på godkännande',
        bekraftad: 'Bekräftad',
        nekad: 'Nekad',
        avbokad: 'Avbokad',
    }[status] || status;
}
