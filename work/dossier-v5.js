/* Read-only dossier renderer. It deliberately never reads hidden scenario answers or required services. */
(function (global) {
  'use strict';
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const finite = value => typeof value === 'number' && Number.isFinite(value);
  const present = value => (typeof value === 'string' || typeof value === 'number') && String(value).trim().length > 0;
  const same = (a, b) => a != null && b != null && String(a) === String(b);
  const paths = {
    folder: '<path d="M3 6h6l2 2h10v11H3z"/><path d="M3 6V4h7l2 2h8v2"/>',
    pin: '<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.4"/>',
    people: '<circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6M19 21v-3a6 6 0 0 0-3-5"/>',
    shield: '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6z"/><path d="M12 8v5m0 3v.1"/>',
    access: '<path d="M4 21h16M6 21V3h12v18M6 3l8 3v15"/><path d="M10 12h.1M17 12h3m-2-2 2 2-2 2"/>',
    situation: '<path d="M5 3h14v18H5zM9 7h6m-6 4h6m-6 4h4"/>',
    radio: '<path d="M7 6h11v15H6V8a2 2 0 0 1 1-2ZM9 6V2m0 13h6m-6 3h6"/><rect x="9" y="9" width="6" height="3" rx=".5"/>',
    update: '<path d="M20 8a8 8 0 0 0-14-3L3 8m0-5v5h5M4 16a8 8 0 0 0 14 3l3-3m0 5v-5h-5"/>',
    note: '<path d="M12 4H4v16h16v-8M10 14l1-4L20 1l3 3-9 9z"/>',
    arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    chevron: '<path d="m9 5 7 7-7 7"/>',
    medical: '<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z"/>',
    fire: '<path d="M12 3c2 5 7 6 7 11a7 7 0 0 1-14 0c0-3 2-6 4-8 0 3 1 4 2 5 2-3 2-5 1-8Z"/>',
    unknown: '<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 1 1 5 2c-2 1-2 2-2 3m0 3v.1"/>'
  };
  function icon(name, cls = '') { return '<svg class="dossier-icon ' + cls + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (paths[name] || paths.situation) + '</svg>'; }
  function clock(value) {
    if (!finite(value) || value < 0) return 'Ora non registrata';
    const n = Math.floor(value), h = (21 + Math.floor(n / 3600)) % 24;
    return [h, Math.floor(n / 60) % 60, n % 60].map(v => String(v).padStart(2, '0')).join(':');
  }
  function source(value, c) {
    if (value && typeof value === 'object') value = value.label || value.name || value.type;
    if (!present(value)) return 'Fonte non registrata';
    const names = { chiamante: 'Chiamante', caller: 'Chiamante', civilian: 'Chiamante', operatore: 'Centrale', operator: 'Centrale', sistema: 'Sala operativa', system: 'Sala operativa', radio: 'Radio', squadra: c.source === 'patrol' && c.sourceCallSign || 'Unità sul territorio', patrol: c.source === 'patrol' && c.sourceCallSign || 'Pattuglia' };
    return names[String(value).toLowerCase()] || String(value);
  }
  const labels = {
    opening: 'Primo racconto', relationship: 'Rapporti tra le persone', sightline: 'Campo visivo del chiamante', scene_sounds: 'Suoni e voci sul posto', scene_detail: 'Particolare riconoscibile', caller_focus: 'Preoccupazioni del chiamante', story_1: 'Nuovo elemento in linea', story_2: 'Riscontro all’arrivo dei soccorsi',
    location: 'Prima indicazione', confirm: 'Posizione confermata', address: 'Indirizzo riferito', position: 'Posizione riferita',
    situation: 'Situazione riferita', source: 'Origine riferita', dynamics: 'Dinamica', background: 'Contesto', time: 'Riferimento temporale', duration: 'Durata riferita', sound: 'Rumori', noise: 'Rumori', detail: 'Dettaglio acquisito', damage: 'Danni riferiti',
    people: 'Persone coinvolte', response: 'Reazione alla voce', breathing: 'Respirazione riferita', symptoms: 'Condizioni riferite', injuries: 'Lesioni riferite', age: 'Età riferita', name: 'Identità riferita', caller: 'Chiamante', person: 'Persona', health: 'Condizioni riferite', consciousness: 'Stato di coscienza', victims: 'Persone coinvolte',
    hazards: 'Pericoli riferiti', smoke: 'Fumo e fiamme', risk: 'Rischio riferito', risks: 'Rischi riferiti', danger: 'Pericolo riferito', weapon: 'Armi riferite', weapons: 'Armi riferite', threats: 'Minacce riferite', safety: 'Posizione di sicurezza', water: 'Acqua', gas: 'Gas riferito',
    access: 'Accesso al luogo', entrance: 'Ingresso', floor: 'Piano', gate: 'Cancello', exit: 'Uscita', vehicle: 'Veicolo coinvolto', transport: 'Trasporto', building: 'Edificio', entry: 'Ingresso',
    lighting: 'Visibilità', battery: 'Batteria del telefono', description: 'Descrizione', lastseen: 'Ultimo avvistamento', last_seen: 'Ultimo avvistamento', mobility: 'Possibilità di movimento', orientation: 'Orientamento', memory: 'Indicazioni ricordate', landmark: 'Punto di riferimento', rapport: 'Contatto stabilito', update: 'Aggiornamento', evolution: 'Evoluzione', changes: 'Variazione riferita'
  };
  const groups = [
    { id: 'situation', title: 'Quadro della situazione', icon: 'situation', empty: 'La dinamica non è ancora stata ricostruita.', keys: [] },
    { id: 'people', title: 'Persone e condizioni', icon: 'people', empty: 'Numero e condizioni delle persone da chiarire.', keys: ['people', 'response', 'breathing', 'symptoms', 'injuries', 'age', 'name', 'caller', 'person', 'health', 'consciousness', 'victims'] },
    { id: 'hazards', title: 'Pericoli e sicurezza', icon: 'shield', empty: 'I pericoli non sono ancora stati verificati.', keys: ['hazards', 'smoke', 'risk', 'risks', 'danger', 'weapon', 'weapons', 'threats', 'safety', 'fire', 'water', 'gas', 'aggressor', 'substances'] },
    { id: 'access', title: 'Accesso e riferimenti', icon: 'access', empty: 'Ingresso e accessibilità da verificare.', keys: ['access', 'entrance', 'floor', 'gate', 'exit', 'vehicle', 'transport', 'building', 'entry'] }
  ];
  const locationKeys = ['confirm', 'location', 'address', 'position'], updateKeys = ['update', 'evolution', 'changes', 'story_1', 'story_2'];
  const uncertain = text => /\b(?:non (?:so|sa|not[oaie]|verificat[oaie]|verificabile|confermat[oaie]|ricord[ao])|da (?:verificare|chiarire|accertare)|non esclus[oi]|impossibile (?:verificare|confermare)|incert[oaie])\b/i.test(String(text));
  function factsOf(c) { return Object.entries(c.facts || {}).filter(([, value]) => present(value)); }
  function assignedTo(c, state) { return (Array.isArray(state.units) ? state.units : []).filter(u => same(u.target, c.id)); }
  function knownTitle(c, facts) {
    const received = c.source === 'patrol' || finite(c.answeredAt) || facts.length > 0 || (c.history || []).some(m => ['chiamante', 'squadra', 'caller'].includes(m.role));
    return received && present(c.title) ? String(c.title) : 'Chiamata da identificare';
  }
  function meta(c, key) {
    const m = (c.factMeta || {})[key] || {};
    return '<div class="dossier-provenance"><span>' + esc(source(m.source, c)) + '</span><time>' + esc(clock(m.time)) + '</time></div>';
  }
  function fact(c, key, value, state) {
    const m = (c.factMeta || {})[key] || {}, unknown = uncertain(value), recent = finite(m.time) && finite(state.time) && state.time >= m.time && state.time - m.time < 7;
    return '<article class="dossier-fact' + (unknown ? ' dossier-fact--uncertain' : '') + (recent ? ' dossier-fact--recent' : '') + '" data-fact-key="' + esc(key) + '"><div class="dossier-fact-heading"><h4>' + esc(labels[key] || 'Dettaglio acquisito') + '</h4><span class="dossier-fact-state">' + (unknown ? 'Da chiarire' : 'Acquisito') + '</span></div><p>' + esc(value) + '</p>' + meta(c, key) + '</article>';
  }
  function status(c) { return c.done ? 'Concluso' : ({ waiting: 'Da rispondere', connected: 'Linea attiva', held: 'Linea in attesa', transferred: 'In gestione', closed: 'Concluso' })[c.state] || 'Evento aperto'; }
  function location(c, facts) {
    const key = locationKeys.find(k => present((c.facts || {})[k]));
    const confirmed = key === 'confirm';
    return '<section class="dossier-location' + (confirmed ? ' is-confirmed' : key ? ' is-provisional' : ' is-unknown') + '" aria-label="Localizzazione"><div class="dossier-location-symbol">' + icon('pin') + '</div><div class="dossier-location-body"><div class="dossier-location-top"><span>Localizzazione</span><b>' + (confirmed ? 'Confermata' : key ? 'Da confermare' : 'Da acquisire') + '</b></div><p>' + esc(key ? c.facts[key] : 'Il luogo non è ancora stato acquisito.') + '</p>' + (key ? meta(c, key) : '<span class="dossier-location-hint">La scheda attende le indicazioni raccolte in linea.</span>') + '</div></section>';
  }
  function section(c, group, entries, state) {
    return '<section class="dossier-section" aria-label="' + esc(group.title) + '"><div class="dossier-section-heading"><div>' + icon(group.icon) + '<h3>' + esc(group.title) + '</h3></div><span class="dossier-section-count' + (entries.length ? '' : ' is-empty') + '">' + (entries.length ? String(entries.length).padStart(2, '0') : 'Da chiarire') + '</span></div>' + (entries.length ? '<div class="dossier-facts">' + entries.map(([k, v]) => fact(c, k, v, state)).join('') + '</div>' : '<div class="dossier-unknown">' + icon('unknown') + '<p>' + esc(group.empty) + '</p></div>') + '</section>';
  }
  function unitKind(type) { const s = String(type || '').toLowerCase(); return /sanit|ambul/.test(s) ? 'medical' : /fuoco|fire|vvf/.test(s) ? 'fire' : /poliz|patrol/.test(s) ? 'police' : 'neutral'; }
  function resources(c, units, enabled, facts) {
    return '<section class="dossier-section dossier-resources" aria-label="Risorse assegnate"><div class="dossier-section-heading"><div>' + icon('radio') + '<h3>Risorse assegnate</h3></div><span class="dossier-section-count">' + String(units.length).padStart(2, '0') + '</span></div>' + (units.length ? '<div class="dossier-unit-list">' + units.map(u => {
      const kind = unitKind(u.type), travelling = ['In viaggio', 'enroute', 'responding'].includes(u.phase), eta = travelling && finite(u.eta) && u.eta >= 0 ? Math.ceil(u.eta) : null;
      const cmd = 'Game.selectUnit(' + JSON.stringify(String(u.id)) + ')';
      return '<button type="button" class="dossier-unit dossier-unit--' + kind + '" onclick="' + esc(cmd) + '"><span class="dossier-unit-icon">' + icon(kind === 'police' ? 'shield' : kind === 'neutral' ? 'radio' : kind) + '</span><span class="dossier-unit-main"><b>' + esc(u.callSign || u.name || u.id) + '</b><small>' + esc(u.type || 'Servizio operativo') + '</small></span><span class="dossier-unit-state"><b>' + esc(u.phase || 'Stato non registrato') + '</b><small>' + (eta === null ? 'Apri canale radio' : 'ETA ' + String(Math.floor(eta / 60)).padStart(2, '0') + ':' + String(eta % 60).padStart(2, '0')) + '</small></span>' + icon('chevron', 'dossier-unit-chevron') + '</button>';
    }).join('') + '</div>' : '<div class="dossier-unknown">' + icon('radio') + '<p>Nessuna unità risulta assegnata a questo evento.</p></div>') + '<button class="dossier-brief-button" type="button" onclick="Game.briefUnits()"' + (!enabled || !units.length || !facts.length ? ' disabled' : '') + '>' + icon('radio') + '<span>Trasmetti il briefing alle unità</span>' + icon('arrow') + '</button></section>';
  }
  function historyEntries(c, state) {
    return (Array.isArray(c.history) ? c.history : []).filter(m => m && present(m.text) && (!finite(m.time) || !finite(state.time) || m.time <= state.time));
  }
  function timeline(c, state) {
    const entries = historyEntries(c, state), latest = entries.slice(-7).reverse();
    const names = { operatore: 'Centrale', operator: 'Centrale', chiamante: 'Chiamante', caller: 'Chiamante', squadra: c.source === 'patrol' && c.sourceCallSign || 'Unità sul territorio', sistema: 'Sala operativa', system: 'Sala operativa', aggiornamento: 'Aggiornamento' };
    return '<details class="dossier-timeline"' + (latest.length ? ' open' : '') + '><summary><span>' + icon('clock') + '<b>Registro evento</b></span><span>' + (entries.length ? entries.length + (entries.length === 1 ? ' comunicazione' : ' comunicazioni') : 'In attesa') + icon('chevron') + '</span></summary>' + (latest.length ? '<ol>' + latest.map(m => '<li class="dossier-timeline-entry' + (m.role === 'aggiornamento' ? ' is-update' : '') + '"><div class="dossier-timeline-meta"><b>' + esc(m.source || m.author || names[m.role] || m.role || 'Comunicazione') + '</b><time>' + esc(clock(m.time)) + '</time></div><p>' + esc(m.text) + '</p></li>').join('') + '</ol>' + (entries.length > latest.length ? '<p class="dossier-timeline-caption">Ultime 7 comunicazioni. La conversazione completa resta nella console.</p>' : '') : '<p class="dossier-timeline-empty">Le comunicazioni appariranno qui quando verranno registrate.</p>') + '</details>';
  }
  function notes(c, state, enabled) {
    const items = (Array.isArray(c.notes) ? c.notes : []).filter(n => n && present(n.text)), draft = (state.dossierDrafts || {})[c.id] || '';
    return '<section class="dossier-notes" aria-label="Note dell’operatore"><div class="dossier-section-heading"><div>' + icon('note') + '<h3>Note dell’operatore</h3></div><span class="dossier-notes-count">' + items.length + '</span></div>' + (items.length ? '<ul class="dossier-note-list">' + items.map(n => '<li><div><span>Annotazione operatore</span><time>' + esc(clock(n.time)) + '</time></div><p>' + esc(n.text) + '</p></li>').join('') + '</ul>' : '') + '<label class="dossier-note-label" for="dossier-note">Aggiungi un dettaglio al fascicolo</label><div class="dossier-note-composer"><textarea id="dossier-note" data-case-id="' + esc(c.id) + '" maxlength="1200" rows="2" placeholder="Scrivi un’annotazione operativa…" oninput="Game.state.dossierDrafts||(Game.state.dossierDrafts={});Game.state.dossierDrafts[this.dataset.caseId]=this.value"' + (!enabled ? ' disabled' : '') + '>' + esc(draft) + '</textarea><button type="button" onclick="Game.addNote()"' + (!enabled ? ' disabled' : '') + ' aria-label="Aggiungi nota">' + icon('arrow') + '</button></div><p class="dossier-note-help">Le note restano distinte dalle informazioni riferite in linea.</p></section>';
  }
  function render(c, state = {}) {
    if (!c) return '<section class="case-dossier case-dossier--empty"><div class="dossier-empty-symbol">' + icon('folder') + '</div><h2>Il fascicolo prende forma qui.</h2><p>Seleziona un evento per seguirne le informazioni, le risorse e gli aggiornamenti.</p></section>';
    const facts = factsOf(c), units = assignedTo(c, state), enabled = !!state.started && !state.ended && !c.done;
    const remainder = facts.filter(([k]) => !locationKeys.includes(k) && !updateKeys.includes(k)), categorized = new Set(groups.slice(1).flatMap(g => g.keys));
    const byGroup = groups.map(g => [g, remainder.filter(([k]) => g.id === 'situation' ? !categorized.has(k) : g.keys.includes(k))]);
    const updates = facts.filter(([k]) => updateKeys.includes(k));
    const origin = c.source === 'patrol' ? 'Segnalazione radio · ' + (c.sourceCallSign || 'Pattuglia') : 'Chiamata 112';
    return '<section class="case-dossier" data-case-id="' + esc(c.id) + '" aria-label="Dossier evento ' + esc(c.id) + '"><div class="dossier-header"><div class="dossier-kicker"><span>Fascicolo operativo</span><span class="dossier-live-state' + (c.state === 'connected' ? ' is-live' : '') + '"><i></i>' + esc(status(c)) + '</span></div><div class="dossier-title-row"><span class="dossier-case-number">' + esc(String(c.id).padStart(3, '0')) + '</span><div><p>' + esc(origin) + '</p><h2>' + esc(knownTitle(c, facts)) + '</h2></div></div><div class="dossier-header-footer"><span><b>' + facts.length + '</b> ' + (facts.length === 1 ? 'informazione acquisita' : 'informazioni acquisite') + '</span><span>' + icon('clock') + 'Apertura ' + esc(clock(c.at)) + '</span></div></div><div class="dossier-body">' + location(c, facts) + (updates.length ? '<div class="dossier-updates"><div class="dossier-update-heading">' + icon('update') + '<span>Evoluzione dell’evento</span></div>' + updates.map(([k, v]) => fact(c, k, v, state)).join('') + '</div>' : '') + '<div class="dossier-section-grid">' + byGroup.map(([g, entries]) => section(c, g, entries, state)).join('') + '</div>' + resources(c, units, enabled, facts) + '<div class="dossier-followup"><div><b>Mantieni aggiornato il quadro</b><span>Richiedi un nuovo riscontro sulla situazione.</span></div><button type="button" onclick="Game.requestUpdate()"' + (!enabled ? ' disabled' : '') + '>' + icon('update') + '<span>Richiedi aggiornamento</span></button></div>' + notes(c, state, enabled) + timeline(c, state) + '<p class="dossier-footnote">Le informazioni acquisite mantengono la propria fonte. Le incognite restano indicate finché non vengono chiarite.</p></div></section>';
  }
  function renderCompact(c, state = {}) {
    if (!c) return '<div class="dossier-compact"><span>Seleziona un evento per aprire il fascicolo.</span></div>';
    const facts = factsOf(c), units = assignedTo(c, state), place = locationKeys.find(k => present((c.facts || {})[k]));
    return '<div class="dossier-compact" data-case-id="' + esc(c.id) + '"><span class="dossier-compact-icon">' + icon('folder') + '</span><div><span class="dossier-compact-kicker">Fascicolo #' + esc(String(c.id).padStart(3, '0')) + ' · ' + esc(status(c)) + '</span><h3>' + esc(knownTitle(c, facts)) + '</h3><p>' + esc(place ? c.facts[place] : 'Localizzazione da acquisire') + '</p><div class="dossier-compact-counts"><span>' + facts.length + ' informazioni</span><span>' + units.length + ' unità assegnate</span></div></div></div>';
  }
  global.CaseDossier = Object.freeze({ render, renderCompact, version: '5.0.0' });
})(typeof window !== 'undefined' ? window : globalThis);
