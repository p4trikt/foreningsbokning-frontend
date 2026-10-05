// Adminpanelens logik

let aktivFlik = 'bokningar';
let objektCache = [];
let foreningarCache = [];

async function initAdmin() {
    const status = await kollaInloggning();
    if (status.inloggad && status.forening && status.forening.is_admin) {
        visaDashboard();
    } else {
        document.getElementById('login-kort').style.display = 'block';
        document.getElementById('dashboard').style.display = 'none';
    }
}

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const svar = await api('/api/login', 'POST', {
        email: document.getElementById('login-email').value,
        losenord: document.getElementById('login-losenord').value,
    });
    if (svar.ok && svar.data.forening && svar.data.forening.is_admin) {
        visaDashboard();
    } else if (svar.ok) {
        visaMeddelande('Det här kontot är inte ett administratörskonto.', 'fel');
        await api('/api/logout', 'POST');
    } else {
        visaMeddelande(svar.data.fel || 'Kunde inte logga in.', 'fel');
    }
});

function visaDashboard() {
    document.getElementById('login-kort').style.display = 'none';
    document.getElementById('dashboard').style.display = 'block';
    document.getElementById('admin-nav').style.display = 'block';
    visaFlik('bokningar');
}

async function loggaUtAdmin() {
    await api('/api/logout', 'POST');
    document.getElementById('dashboard').style.display = 'none';
    document.getElementById('admin-nav').style.display = 'none';
    document.getElementById('login-kort').style.display = 'block';
}

function visaFlik(namn) {
    aktivFlik = namn;
    ['bokningar', 'oversikt', 'objekt', 'foreningar'].forEach(f => {
        document.getElementById(`flik-${f}`).classList.toggle('vald', f === namn);
        document.getElementById(`yta-${f}`).style.display = f === namn ? 'block' : 'none';
    });
    if (namn === 'bokningar') laddaBokningar();
    if (namn === 'oversikt') laddaOversikt();
    if (namn === 'objekt') laddaObjekt();
    if (namn === 'foreningar') laddaForeningar();
}

// ---------------------------------------------------------------------
// Översikt - tidslinje över bekräftade bokningar
// ---------------------------------------------------------------------

async function laddaOversikt() {
    const svar = await api('/api/admin/bokningar?status=bekraftad');
    const bokningar = (svar.data || []).slice().sort((a, b) => a.start_datum.localeCompare(b.start_datum));

    const idag = new Date().toISOString().slice(0, 10);
    const kommande = bokningar.filter(b => b.slut_datum >= idag);
    const tidigare = bokningar.filter(b => b.slut_datum < idag).reverse();

    function rad(b, forfluten) {
        return `
            <div class="tidslinje-post ${forfluten ? 'forfluten' : ''}">
                <div class="tidslinje-punkt"></div>
                <div class="tidslinje-innehall">
                    <div class="tidslinje-datum">${b.start_datum} &ndash; ${b.slut_datum}</div>
                    <div class="tidslinje-titel">${b.objekt_namn}</div>
                    <div class="tidslinje-forening">${b.forening_namn}</div>
                </div>
            </div>
        `;
    }

    document.getElementById('yta-oversikt').innerHTML = `
        <h2>Översikt &ndash; bekräftade bokningar</h2>
        <p>Kronologisk lista över alla godkända bokningar, kommande först.</p>

        <h3>Kommande</h3>
        <div class="tidslinje">
            ${kommande.length ? kommande.map(b => rad(b, false)).join('') : '<p>Inga kommande bekräftade bokningar.</p>'}
        </div>

        ${tidigare.length ? `
            <h3 style="margin-top:28px;">Tidigare</h3>
            <div class="tidslinje">
                ${tidigare.map(b => rad(b, true)).join('')}
            </div>
        ` : ''}
    `;
}

// ---------------------------------------------------------------------
// Bokningar
// ---------------------------------------------------------------------

async function laddaBokningar(filterStatus) {
    const url = filterStatus ? `/api/admin/bokningar?status=${filterStatus}` : '/api/admin/bokningar';
    const svar = await api(url);
    const bokningar = svar.data || [];

    const filterKnappar = ['', 'vantande', 'bekraftad', 'nekad', 'avbokad'].map(s => `
        <div class="flik ${filterStatus === s || (!filterStatus && s === '') ? 'vald' : ''}"
             onclick="laddaBokningar('${s}')">${s ? statusText(s) : 'Alla'}</div>
    `).join('');

    const rader = bokningar.map(b => `
        <tr>
            <td>${b.forening_namn}<br><small>${b.forening_email} · ${b.forening_telefonnr}</small></td>
            <td>${b.objekt_namn}</td>
            <td>${b.start_datum} - ${b.slut_datum}</td>
            <td><span class="status status-${b.status}">${statusText(b.status)}</span></td>
            <td>${b.kommentar || ''}</td>
            <td>
                ${b.status === 'vantande' ? `
                    <button class="knapp knapp-liten" onclick="godkannBokning(${b.id})">Godkänn</button>
                    <button class="knapp knapp-liten knapp-fara" onclick="nekaBokning(${b.id})">Neka</button>
                ` : ''}
                <button class="knapp knapp-liten knapp-sekundar" onclick="redigeraBokning(${b.id}, '${b.start_datum}', '${b.slut_datum}', '${b.status}')">Redigera</button>
                <button class="knapp knapp-liten knapp-fara" onclick="raderaBokning(${b.id})">Radera</button>
            </td>
        </tr>
    `).join('');

    document.getElementById('yta-bokningar').innerHTML = `
        <h2>Bokningar</h2>
        <div class="flikar">${filterKnappar}</div>
        <table>
            <thead><tr><th>Förening</th><th>Objekt</th><th>Datum</th><th>Status</th><th>Meddelande</th><th></th></tr></thead>
            <tbody>${rader || '<tr><td colspan="6">Inga bokningar.</td></tr>'}</tbody>
        </table>
    `;
}

async function godkannBokning(id) {
    const svar = await api(`/api/admin/bokningar/${id}/godkann`, 'POST');
    if (svar.ok) { visaMeddelande('Bokningen är godkänd och bekräftelse skickad.', 'ok'); laddaBokningar(); }
    else visaMeddelande(svar.data.fel, 'fel');
}

async function nekaBokning(id) {
    const anledning = prompt('Anledning (visas för föreningen, valfritt):', '') || '';
    const svar = await api(`/api/admin/bokningar/${id}/neka`, 'POST', { anledning });
    if (svar.ok) { visaMeddelande('Bokningen är nekad.', 'ok'); laddaBokningar(); }
    else visaMeddelande(svar.data.fel, 'fel');
}

async function redigeraBokning(id, start, slut, status) {
    const nyStart = prompt('Nytt startdatum (YYYY-MM-DD):', start);
    if (nyStart === null) return;
    const nySlut = prompt('Nytt slutdatum (YYYY-MM-DD):', slut);
    if (nySlut === null) return;
    const nyStatus = prompt('Status (vantande / bekraftad / nekad / avbokad):', status);
    if (nyStatus === null) return;

    const svar = await api(`/api/admin/bokningar/${id}`, 'PUT', {
        start_datum: nyStart, slut_datum: nySlut, status: nyStatus,
    });
    if (svar.ok) { visaMeddelande('Bokningen är uppdaterad.', 'ok'); laddaBokningar(); }
    else visaMeddelande(svar.data.fel, 'fel');
}

async function raderaBokning(id) {
    if (!confirm('Bokningen flyttas till karantän (döljs, men raderas inte permanent). Fortsätt?')) return;
    const svar = await api(`/api/admin/bokningar/${id}`, 'DELETE');
    if (svar.ok) { visaMeddelande(svar.data.meddelande, 'ok'); laddaBokningar(); }
    else visaMeddelande(svar.data.fel, 'fel');
}

// ---------------------------------------------------------------------
// Objekt
// ---------------------------------------------------------------------

async function laddaObjekt() {
    const svar = await api('/api/admin/objekt');
    objektCache = svar.data || [];

    const rader = objektCache.map(o => {
        const bild = bildForObjekt(o);
        return `
        <tr>
            <td>${bild ? `<img src="${bild}" class="objekt-bild-liten" alt="">` : ''}</td>
            <td>${o.namn}</td>
            <td>${o.typ}</td>
            <td>${o.max_dagar}</td>
            <td>${o.aktiv ? 'Aktiv' : 'Avaktiverad'}</td>
            <td>
                <button class="knapp knapp-liten knapp-sekundar" onclick="redigeraObjekt(${o.id})">Redigera</button>
                ${o.aktiv ? `<button class="knapp knapp-liten knapp-fara" onclick="avaktiveraObjekt(${o.id})">Avaktivera</button>` : ''}
                ${!o.aktiv ? `<button class="knapp knapp-liten knapp-fara" onclick="raderaObjektPermanent(${o.id})">Ta bort permanent</button>` : ''}
            </td>
        </tr>
    `;
    }).join('');

    document.getElementById('yta-objekt').innerHTML = `
        <h2>Bokningsbara objekt</h2>
        <table>
            <thead><tr><th></th><th>Namn</th><th>Typ</th><th>Max dagar</th><th>Status</th><th></th></tr></thead>
            <tbody>${rader}</tbody>
        </table>
        <h3>Lägg till nytt objekt</h3>
        <form id="nytt-objekt-form">
            <div class="tva-kolumner">
                <div><label>Namn</label><input type="text" id="nytt-namn" required></div>
                <div><label>Typ</label><input type="text" id="nytt-typ" required placeholder="t.ex. bil"></div>
                <div><label>Max antal dagar</label><input type="number" id="nytt-max-dagar" value="7" min="1" required></div>
            </div>
            <button class="knapp" type="submit">Lägg till</button>
        </form>
    `;

    document.getElementById('nytt-objekt-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const svar = await api('/api/admin/objekt', 'POST', {
            namn: document.getElementById('nytt-namn').value,
            typ: document.getElementById('nytt-typ').value,
            max_dagar: parseInt(document.getElementById('nytt-max-dagar').value, 10),
        });
        if (svar.ok) { visaMeddelande('Objekt tillagt.', 'ok'); laddaObjekt(); }
        else visaMeddelande(svar.data.fel, 'fel');
    });
}

async function redigeraObjekt(id) {
    const o = objektCache.find(x => x.id === id);
    const namn = prompt('Namn:', o.namn);
    if (namn === null) return;
    const maxDagar = prompt('Max antal dagar:', o.max_dagar);
    if (maxDagar === null) return;
    const svar = await api(`/api/admin/objekt/${id}`, 'PUT', { namn, max_dagar: parseInt(maxDagar, 10) });
    if (svar.ok) { visaMeddelande('Objektet är uppdaterat.', 'ok'); laddaObjekt(); }
    else visaMeddelande(svar.data.fel, 'fel');
}

async function avaktiveraObjekt(id) {
    if (!confirm('Avaktivera objektet så det inte längre kan bokas?')) return;
    const svar = await api(`/api/admin/objekt/${id}`, 'DELETE');
    if (svar.ok) { visaMeddelande('Objektet är avaktiverat.', 'ok'); laddaObjekt(); }
    else visaMeddelande(svar.data.fel, 'fel');
}

async function raderaObjektPermanent(id) {
    if (!confirm('Objektet tas bort helt och kan inte återställas. Fortsätt?')) return;
    const svar = await api(`/api/admin/objekt/${id}/radera-permanent`, 'DELETE');
    if (svar.ok) { visaMeddelande(svar.data.meddelande, 'ok'); laddaObjekt(); }
    else visaMeddelande(svar.data.fel, 'fel');
}

// ---------------------------------------------------------------------
// Föreningar
// ---------------------------------------------------------------------

async function laddaForeningar() {
    const svar = await api('/api/admin/foreningar');
    foreningarCache = svar.data || [];

    const rader = foreningarCache.map(f => `
        <tr>
            <td>${f.namn}</td>
            <td>${f.email}</td>
            <td>${f.telefonnr}</td>
            <td>${f.kontaktpersoner.map(k => `${k.namn}${k.telefon ? ' · ' + k.telefon : ''}${k.email ? ' · ' + k.email : ''}`).join('<br>')}</td>
        </tr>
    `).join('');

    document.getElementById('yta-foreningar').innerHTML = `
        <h2>Registrerade föreningar</h2>
        <table>
            <thead><tr><th>Namn</th><th>E-post</th><th>Telefon</th><th>Kontaktperson(er)</th></tr></thead>
            <tbody>${rader || '<tr><td colspan="4">Inga föreningar registrerade ännu.</td></tr>'}</tbody>
        </table>
    `;
}

initAdmin();
