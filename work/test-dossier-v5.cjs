const assert=require('node:assert/strict');
require('./dossier-v5.js');
const D=globalThis.CaseDossier;
const makeCase=()=>({id:1,title:'Un urto, poi il silenzio',source:'civilian',sourceCallSign:'CIVILE',at:0,answeredAt:null,state:'waiting',done:false,facts:{},factMeta:{},history:[],notes:[]});
const makeState=()=>({time:80,started:true,ended:false,units:[],dossierDrafts:{}});
function deepFreeze(o){Object.freeze(o);Object.values(o).filter(v=>v&&typeof v==='object'&&!Object.isFrozen(v)).forEach(deepFreeze);return o;}
let checks=0;
function test(name,fn){fn();checks++;console.log('PASS '+name);}
test('unanswered call exposes no scenario title, address, hidden answer or required service',()=>{
 const c=makeCase();for(const key of ['need','urgency','topics','address','location','opening','caller'])Object.defineProperty(c,key,{get(){throw new Error('Hidden property read: '+key);},enumerable:false});
 const html=D.render(c,makeState());assert(!html.includes(c.title));assert(html.includes('Chiamata da identificare'));assert(html.includes('Il luogo non è ancora stato acquisito'));assert(html.includes('I pericoli non sono ancora stati verificati'));
 assert(!D.renderCompact(c,makeState()).includes(c.title));
});
test('render and compact rendering do not mutate frozen case or game state',()=>{
 const c=makeCase(),s=makeState();c.answeredAt=0;c.facts.people='Due persone';c.factMeta.people={time:0,source:'chiamante'};deepFreeze(c);deepFreeze(s);assert(D.render(c,s).includes('Due persone'));assert(D.renderCompact(c,s).includes('1 informazioni'));
});
test('location indication stays provisional until an acquired confirmation exists',()=>{
 const c=makeCase(),s=makeState();c.confirmed=true;c.facts.location='Vicino al ponte';assert(D.render(c,s).includes('Da confermare'));assert(!D.render(c,s).includes('is-confirmed'));
 c.facts.confirm='Via della Stazione 18';c.factMeta.confirm={time:61,source:'chiamante'};const html=D.render(c,s);assert(html.includes('is-confirmed'));assert(html.includes('Via della Stazione 18'));assert(html.includes('21:01:01'));assert(html.includes('Chiamante'));
});
test('uncertain acquired observation is distinguished from a verified statement',()=>{
 const c=makeCase();c.facts.people='Un occupante visibile; altri non esclusi.';c.facts.smoke='Nessun fumo osservato.';const h=D.render(c,makeState());assert(h.includes('dossier-fact--uncertain'));assert(h.includes('Da chiarire'));assert(h.includes('Nessun fumo osservato.'));
 const smoke=h.slice(h.indexOf('data-fact-key="smoke"'),h.indexOf('data-fact-key="smoke"')+450);assert(smoke.includes('Acquisito'));
});
test('missing metadata does not invent source or acquisition time',()=>{
 const c=makeCase();c.facts.access='Portone aperto';const h=D.render(c,makeState());assert(h.includes('Fonte non registrata'));assert(h.includes('Ora non registrata'));
});
test('all user-authored strings and inline button arguments are escaped',()=>{
 const c=makeCase(),s=makeState();c.answeredAt=0;c.title='<img src=x onerror=alert(1)>';c.facts.situation='<script>alert(1)</script>';c.factMeta.situation={time:2,source:'" onclick="alert(1)'};c.notes=[{text:'</textarea><script>evil()</script>',time:3}];s.dossierDrafts[1]='</textarea><img src=x>';s.units=[{id:'x\");alert(1);//',target:1,type:'Polizia',callSign:'<b>Evil</b>',phase:'In viaggio',eta:12}];
 const h=D.render(c,s);assert(!h.includes('<script>'));assert(!h.includes('<img'));assert(!h.includes('<b>Evil</b>'));assert(h.includes('&lt;script&gt;'));assert(h.includes('&lt;/textarea&gt;'));assert(h.includes('Game.selectUnit(&quot;'));
});
test('resources show only assigned units with actual phases and ETA',()=>{
 const c=makeCase(),s=makeState();c.facts.people='Una persona';s.units=[{id:'P01',callSign:'Alfa 21',target:'1',type:'Polizia',phase:'In viaggio',eta:75},{id:'M01',callSign:'Medica 01',target:2,type:'Sanitario',phase:'Sul posto',eta:0}];
 const h=D.render(c,s);assert(h.includes('Alfa 21'));assert(h.includes('ETA 01:15'));assert(!h.includes('Medica 01'));assert(!h.includes('Game.briefUnits()" disabled'));
});
test('timeline preserves real authors and excludes future communications',()=>{
 const c=makeCase(),s=makeState();c.source='patrol';c.sourceCallSign='Alfa 24';c.history=[{role:'squadra',text:'Segnalazione verificata',time:15},{role:'aggiornamento',source:'Alfa 21',text:'Seconda unità sul posto',time:30},{role:'squadra',text:'FUTURE SECRET',time:999}];
 const h=D.render(c,s);assert(h.includes('Alfa 24'));assert(h.includes('Alfa 21'));assert(h.includes('21:00:15'));assert(!h.includes('FUTURE SECRET'));assert(h.indexOf('Seconda unità sul posto')<h.indexOf('Segnalazione verificata'));
});
test('notes draft and three required integration actions are present',()=>{
 const c=makeCase(),s=makeState();s.dossierDrafts[1]='Controllare il cancello';c.notes=[{text:'Nota precedente',time:12}];const h=D.render(c,s);for(const value of ['id="dossier-note"','data-case-id="1"','Controllare il cancello','Nota precedente','Game.addNote()','Game.requestUpdate()','Game.briefUnits()'])assert(h.includes(value),value);
});
test('read-only state disables operational controls and empty dossier is valid',()=>{
 const c=makeCase(),s=makeState();s.started=false;const h=D.render(c,s);assert(h.includes('onclick="Game.requestUpdate()" disabled'));assert(h.includes('onclick="Game.addNote()" disabled'));assert(D.render(null,s).includes('Seleziona un evento'));
});
console.log(checks+' dossier checks passed.');
