const assert=require('node:assert/strict');
require('./active-comms.js');
const A=global.ActiveComms;
const topic=(fact,reply=fact)=>({fact,reply,requires:[]});
function fixture(){
 const c={id:1,key:'collision',at:0,title:'Urto alla stazione',address:'Via della Stazione 18',source:'civilian',caller:'Andrea',state:'connected',answeredAt:0,lastContact:0,heldAt:null,eventFired:false,event:{after:115,text:'Aggiornamento evento già gestito dal Game.',fact:'Traffico ancora presente presso l’incidente.'},facts:{},history:[],revision:0,done:false,topics:{
  people:topic('Un occupante visibile; altri non esclusi.','Vedo il conducente. Non so se ci siano altre persone.'),
  response:topic('Conducente non risponde alla voce.'),breathing:topic('Respirazione non verificabile.'),
  access:topic('Accesso: lato farmacia, palo piegato.'),hazards:topic('Carreggiata con detriti e traffico.'),
  safety:topic('Chiamante sul marciapiede.'),weapons:topic('Oggetto non identificato; arma non confermata.')
 }};
 const p={id:'P01',callSign:'Alfa 21',type:'Polizia',target:1,phase:'Sul posto',arrivedAt:10,history:[],workLeft:50};
 const m={id:'M01',callSign:'Medica 01',type:'Sanitario',target:1,phase:'Sul posto',arrivedAt:10,history:[],workLeft:50};
 return {started:true,paused:false,ended:false,time:10,cases:[c],units:[p,m],pending:new Set(),commsSeen:{}};
}
function consume(s,events){for(const e of events){s.commsSeen[e.id]=true;const c=s.cases.find(c=>c.id===e.caseId);for(const f of e.facts)c.facts[f.key]=f.text;}}
function freeze(o){if(o&&typeof o==='object'){Object.freeze(o);Object.values(o).forEach(freeze);}return o;}
let checks=0;
function check(name,run){run();checks++;console.log('PASS '+name);}
check('no arrival messages or early observations',()=>{const s=fixture();s.time=21.9;assert.equal(A.tick(s,.1).length,0);});
check('first observations at 12 seconds with explicit provenance',()=>{const s=fixture();s.time=22;const es=A.tick(s,.1);assert.equal(es.length,2);assert.ok(es.every(e=>e.type==='radio'&&e.kind==='scene_report'));assert.match(es[0].text,/Dal contatto con il segnalante/);assert.equal(es[0].facts[0].sourceLabel,'Alfa 21 · contatto con il segnalante');assert.ok(es[0].facts.every(f=>['access','hazards'].includes(f.key)));});
check('second scene report after 28 seconds adds different facts',()=>{const s=fixture();s.time=22;consume(s,A.tick(s,.1));s.time=38;const es=A.tick(s,.1);assert.equal(es.length,2);assert.ok(es.flatMap(e=>e.facts).some(f=>f.key==='breathing'&&f.text==='Respirazione non verificabile.'));});
check('seen event ids do not recur',()=>{const s=fixture();s.time=22;consume(s,A.tick(s,.1));assert.equal(A.tick(s,.1).length,0);});
check('sets are supported for seen ids',()=>{const s=fixture();s.time=22;const ids=A.tick(s,.1).map(e=>e.id);s.commsSeen=new Set(ids);assert.equal(A.tick(s,.1).length,0);});
check('staged facts are not duplicated between units in one batch',()=>{const s=fixture();s.units.push({...s.units[0],id:'P02',callSign:'Alfa 24'});s.time=22;const keys=A.tick(s,.1).flatMap(e=>e.facts.map(f=>f.key));assert.equal(keys.length,new Set(keys).size);});
check('already collected uncertainties are never overwritten',()=>{const s=fixture();s.cases[0].facts.breathing='Respirazione non verificabile dalla posizione del chiamante.';s.time=38;assert.ok(!A.tick(s,.1).flatMap(e=>e.facts).some(f=>f.key==='breathing'));});
check('authored event and stale affected topics are not emitted',()=>{const s=fixture();s.cases[0].eventFired=true;s.time=38;const es=A.tick(s,.1);assert.ok(!es.flatMap(e=>e.facts).some(f=>f.key==='hazards'||f.text===s.cases[0].event.fact));assert.ok(!es.some(e=>e.text.includes(s.cases[0].event.text)));});
check('missing arrival timestamp does not invent an elapsed time',()=>{const s=fixture();s.units.forEach(u=>delete u.arrivedAt);s.time=30;assert.equal(A.tick(s,.1).length,0);});
check('radio history can supply the arrival timestamp',()=>{const s=fixture();s.units=[s.units[0]];delete s.units[0].arrivedAt;s.units[0].history=[{role:'squadra',time:10,text:'Alfa 21 sul posto.'}];s.time=22;assert.equal(A.tick(s,.1).length,1);});
check('a unit still travelling only asks for missing access',()=>{const s=fixture();s.units=[{...s.units[0],phase:'In viaggio',dispatchedAt:0}];s.time=18;const es=A.tick(s,.1);assert.equal(es.length,1);assert.equal(es[0].kind,'access_request');assert.deepEqual(es[0].facts,[]);assert.equal(es[0].command,undefined);});
check('quiet connected caller contributes one authored detail',()=>{const s=fixture();s.units=[];s.time=42;const es=A.tick(s,.1);assert.equal(es.length,1);assert.equal(es[0].type,'caller');assert.equal(es[0].text,s.cases[0].topics.people.reply);assert.equal(es[0].facts[0].source,'caller');consume(s,es);s.time=100;assert.equal(A.tick(s,.1).length,0);});
check('recent dialogue prevents unsolicited interruption',()=>{const s=fixture();s.units=[];s.time=42;s.cases[0].history=[{role:'operatore',text:'Mi ascolta?',time:41}];assert.equal(A.tick(s,.1).length,0);});
check('held contact differs from the Game attention event and appears once',()=>{const s=fixture();s.units=[];s.time=40;Object.assign(s.cases[0],{state:'held',heldAt:0});const es=A.tick(s,.1);assert.equal(es[0].kind,'held_contact');consume(s,es);assert.equal(A.tick(s,.1).length,0);delete s.commsSeen[es[0].id];s.cases[0].attention=true;assert.equal(A.tick(s,.1).length,0);});
check('pending conversations and paused or ended shifts emit nothing',()=>{const s=fixture();s.time=42;s.pending=new Set(['uP01','uM01','c1']);assert.equal(A.tick(s,.1).length,0);s.pending.clear();s.paused=true;assert.equal(A.tick(s,.1).length,0);s.paused=false;s.ended=true;assert.equal(A.tick(s,.1).length,0);});
check('closed cases and future calls are silent',()=>{const s=fixture();s.time=42;s.cases[0].done=true;assert.equal(A.tick(s,.1).length,0);s.cases[0].done=false;s.cases[0].at=500;assert.equal(A.tick(s,.1).length,0);});
check('brief uses collected information only',()=>{const s=fixture(),c=s.cases[0];c.answeredAt=null;c.facts={breathing:'Respirazione non verificabile.'};const r=A.brief(c,s);assert.match(r,/Posizione non ancora acquisita/);assert.match(r,/Respirazione non verificabile/);assert.doesNotMatch(r,/Via della Stazione 18|lato farmacia|Urto alla stazione/);});
check('requested update collects progressive facts from present crews',()=>{const s=fixture();const es=A.requestUpdate(s.cases[0],s);assert.equal(es.length,2);assert.ok(es.every(e=>e.kind==='requested_update'));assert.equal(es.flatMap(e=>e.facts).length,4);});
check('requested update from enroute crew does not pretend direct observations',()=>{const s=fixture();s.units=[{...s.units[0],phase:'In viaggio',eta:24}];const es=A.requestUpdate(s.cases[0],s);assert.match(es[0].text,/24 secondi/);assert.match(es[0].text,/Non abbiamo ancora un riscontro diretto/);assert.deepEqual(es[0].facts,[]);});
check('connected caller can answer requested update without units',()=>{const s=fixture();s.units=[];assert.equal(A.requestUpdate(s.cases[0],s)[0].type,'caller');});
check('tick, brief and requestUpdate never mutate state or scenario facts',()=>{const s=fixture();s.time=38;const before=JSON.stringify(s);freeze(s);A.tick(s,.1);A.brief(s.cases[0],s);A.requestUpdate(s.cases[0],s);assert.equal(JSON.stringify(s),before);});
check('empty and partial inputs are safe',()=>{assert.deepEqual(A.tick(null),[]);assert.deepEqual(A.requestUpdate(null),[]);assert.equal(typeof A.brief(null),'string');const s={time:0,cases:[{id:1,state:'waiting',at:0}],units:[]};assert.deepEqual(A.tick(s),[]);assert.deepEqual(A.requestUpdate(s.cases[0],s),[]);});
console.log(checks+' active communication checks passed');
