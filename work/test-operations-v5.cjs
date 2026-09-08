/* Production v5 integration: real modules/routing, mocked DOM, storage and network.
 * This test never starts/stops processes, writes saves to disk or contacts the model.
 */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const files=['dialogue-data.js','case-factory.js','conversation-ai.js','radio-engine.js','city-map.js','active-comms.js','dossier-v5.js','operations-v5.js','game-v4.js'];
const decode=s=>String(s).replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&');
const json=value=>JSON.parse(JSON.stringify(value));
function runtime(storage=new Map()){
 const elements=new Map(),intervals=[],network=[];
 const canvas=new Proxy({measureText:text=>({width:String(text).length*6})},{get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>(o[k]=v,true)});
 function makeElement(id=''){
  let html='';const classes=new Set(),listeners={};
  const e={id,textContent:'',value:'',dataset:{},children:[],attributes:{},open:false,hidden:false,width:0,height:0,scrollTop:0,scrollHeight:200,clientHeight:200,
   classList:{add(...v){v.forEach(x=>classes.add(x));},remove(...v){v.forEach(x=>classes.delete(x));},contains:v=>classes.has(v),toggle(v,force){const next=force===undefined?!classes.has(v):!!force;if(next)classes.add(v);else classes.delete(v);return next;}},
   getBoundingClientRect:()=>({width:1100,height:750,left:0,top:0}),getContext:()=>canvas,
   addEventListener(type,fn){(listeners[type]||=[]).push(fn);},dispatch(type,event={}){for(const fn of listeners[type]||[])fn({target:e,...event});},
   setPointerCapture(){},setAttribute(k,v){this.attributes[k]=String(v);},appendChild(child){this.children.push(child);},showModal(){this.open=true;},close(){this.open=false;},click(){this.onclick?.();}
  };
  Object.defineProperty(e,'innerHTML',{get:()=>html,set(value){html=String(value);if(id==='dossier-panel'){
   const m=html.match(/<textarea\b([^>]*\bid="dossier-note"[^>]*)>([\s\S]*?)<\/textarea>/);
   if(m){const field=makeElement('dossier-note');field.value=decode(m[2]);field.dataset.caseId=m[1].match(/data-case-id="([^"]*)"/)?.[1];elements.set('dossier-note',field);}
  }}});
  return e;
 }
 const dom=id=>{if(!elements.has(id))elements.set(id,makeElement(id));return elements.get(id);};
 const document={getElementById:dom,createElement:()=>makeElement(),querySelector:selector=>selector==='#intro .start-button'?dom('start-button'):null,querySelectorAll:()=>[],activeElement:null,body:makeElement('body')};
 const math=Object.create(Math);let seed=601;math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const sandbox={console,Math:math,document,devicePixelRatio:1,setTimeout:()=>0,clearTimeout(){},setInterval:(fn,ms)=>(intervals.push({fn,ms}),intervals.length),requestAnimationFrame:()=>0,addEventListener(){},
  location:{protocol:'http:',reload(){}},localStorage:{getItem:k=>storage.has(k)?storage.get(k):null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)},
  AbortSignal:{timeout:()=>({})},fetch:async(url,args)=>{network.push({url,args});if(url!=='/api/health')throw Error('The offline integration test must not call the language model');return {ok:true,json:async()=>({ready:false,model:'Motore contestuale'})};},
  URL:{createObjectURL:()=> 'blob:mock',revokeObjectURL(){}},Blob:class{constructor(parts,options){this.parts=parts;this.options=options;}}
 };
 sandbox.window=sandbox;sandbox.globalThis=sandbox;vm.createContext(sandbox);
 for(const file of files)vm.runInContext(fs.readFileSync(__dirname+'/'+file,'utf8').replace(/Game\.init\(\);?\s*$/,''),sandbox,{filename:file});
 vm.runInContext('OperationsDesk.attach(Game);Game.init();globalThis.game=Game;globalThis.fixtureCase=(key,i)=>makeCase(scenarios.find(s=>s.key===key),i,false);',sandbox);
 return {ctx:sandbox,game:sandbox.game,dom,document,storage,network,intervals};
}
function fixture(){
 const rt=runtime(),g=rt.game,c=rt.ctx.fixtureCase('collision',0);Object.assign(c,{at:0,x:430,y:630,source:'civilian',sourceCallSign:'CIVILE',confirmed:false,visible:false});g.state.cases[0]=c;g.state.caseId=c.id;
 // Other incoming calls retain normal production shape for save/restore validation.
 g.state.cases.slice(1).forEach(c=>c.at=5000);g.start();return {...rt,c};
}
function stopOtherMotion(g,keep=[]){for(const u of g.state.units)if(!keep.includes(u.id)){u.phase='Disponibile';u.target=null;u.path=[];u.pathIndex=0;}}
function advance(g,seconds){for(let i=0;i<Math.ceil(seconds*10);i++)g.tick(.1);}
let passed=0,failed=0;
async function test(name,run){try{await run();passed++;console.log('PASS '+name);}catch(error){failed++;console.error('FAIL '+name+': '+error.message);}}
(async()=>{
 await test('production attachment, empty dossier and initial briefing expose no hidden scenario answers',()=>{
  const {ctx,game,c,dom}=fixture();const html=ctx.CaseDossier.render(c,game.state),brief=ctx.ActiveComms.brief(c,game.state);
  assert.equal(game.state.activeComms,true);assert.equal(typeof game.addNote,'function');assert.match(html,/Chiamata da identificare/);assert.doesNotMatch(html,/Via della Stazione 18|Respirazione non verificabile/);assert.doesNotMatch(brief,/Via della Stazione 18|Respirazione non verificabile/);assert.ok(dom('dossier-panel').innerHTML.includes('Fascicolo operativo'));
 });
 await test('answering and natural questions progressively acquire facts and source timestamps',async()=>{
  const {game:g,c,dom}=fixture();g.answer();assert.equal(c.state,'connected');assert.equal(Object.keys(c.facts).length,1);assert.equal(c.facts.opening,c.opening);assert.equal(c.factMeta.opening.source,'Chiamante');
  await g.send('Dove si trova?');assert.ok(c.facts.location);assert.equal(c.confirmed,false);assert.ok(!c.facts.breathing);
  await g.send('Dove si trova esattamente?');assert.equal(c.confirmed,true);assert.equal(c.facts.confirm,c.address);assert.equal(c.factMeta.confirm.source,'Chiamante');assert.match(dom('dossier-panel').innerHTML,/is-confirmed/);
  await g.send('Il conducente le risponde?');assert.match(c.facts.response,/non risponde/);assert.equal(c.factMeta.response.source,'Chiamante');assert.ok(c.factChanges.some(change=>change.key==='response'&&change.previous===null));assert.ok(!c.facts.breathing);
 });
 await test('dispatch requires acquired localization and records mission timestamps',()=>{
  const {game:g,c}=fixture(),u=g.state.units.find(u=>u.id==='P01');assert.equal(g.dispatch(u.id).ok,false);assert.equal(u.target,null);g.learn(c,[{key:'confirm',text:c.address}]);const result=g.dispatch(u.id);assert.equal(result.ok,true,result.text);assert.equal(u.target,c.id);assert.equal(u.phase,'In viaggio');assert.equal(u.dispatchedAt,g.state.time);assert.equal(u.arrivedAt,null);assert.ok(u.path.length>1);
 });
 await test('real routed arrival produces staged reports, dossier sources and deduplicated updates',()=>{
  const {game:g,c,dom}=fixture(),u=g.state.units.find(u=>u.id==='P01');stopOtherMotion(g,['P01']);g.learn(c,[{key:'confirm',text:c.address}]);assert.equal(g.dispatch(u.id).ok,true);c.state='transferred';c.answeredAt=0;
  for(let i=0;i<1200&&u.phase!=='Sul posto';i++)g.tick(.1);assert.equal(u.phase,'Sul posto');assert.ok(Number.isFinite(u.arrivedAt));assert.ok(!c.facts.hazards);const arrival=u.arrivedAt;
  while(g.state.time<arrival+12.5)g.tick(.1);assert.ok(c.facts.access);assert.ok(c.facts.hazards);assert.match(c.factMeta.hazards.source,/Alfa 21 · contatto con il segnalante/);assert.ok(!c.facts.people);const firstReports=u.history.filter(m=>m.text.includes('Primo riscontro')).length;assert.equal(firstReports,1);
  while(g.state.time<arrival+28.5)g.tick(.1);assert.ok(c.facts.people);assert.ok(c.facts.safety);const seenBefore=Object.keys(g.state.commsSeen).length;g.tick(.1);assert.equal(Object.keys(g.state.commsSeen).length,seenBefore);g.render();assert.match(dom('dossier-panel').innerHTML,/contatto con il segnalante/);
 });
 await test('automatic caller detail enters the dossier once and respects the active-comms switch',()=>{
  const {game:g,c}=fixture();stopOtherMotion(g);g.answer();g.toggleActiveComms();advance(g,43);assert.ok(!c.facts.people);g.toggleActiveComms();advance(g,1.1);assert.ok(c.facts.people);assert.equal(c.factMeta.people.source,c.caller);const count=c.history.length;advance(g,8);assert.equal(c.history.length,count);
 });
 await test('manual updates preserve unknown observations and throttle repeated requests',()=>{
  const {game:g,c}=fixture();g.answer();const u=g.state.units.find(u=>u.type==='Sanitario');stopOtherMotion(g,[u.id]);Object.assign(u,{target:c.id,phase:'Sul posto',arrivedAt:0,workLeft:100});g.requestUpdate();assert.ok(c.facts.people);assert.ok(c.facts.response);const before=c.history.length;g.requestUpdate();assert.equal(c.history.length,before);g.state.time=16;g.requestUpdate();assert.equal(c.facts.breathing,'Respirazione non verificabile.');assert.match(c.factMeta.breathing.source,/contatto con il segnalante/);
 });
 await test('briefing transmits collected facts and never transmits hidden topics or operator notes as facts',()=>{
  const {game:g,c}=fixture();g.answer();g.learn(c,[{key:'response',text:'Conducente non risponde alla voce.'}]);c.notes=[{text:'IPOTESI OPERATORE NON VERIFICATA',time:0}];const u=g.state.units[0];u.target=c.id;u.phase='In viaggio';g.briefUnits();const message=u.history.find(m=>m.role==='operatore').text;assert.match(message,/Conducente non risponde alla voce/);assert.doesNotMatch(message,/Respirazione non verificabile|Accesso: lato farmacia|IPOTESI OPERATORE NON VERIFICATA|Via della Stazione 18/);assert.equal(c.lastBriefing,g.state.time);
 });
 await test('dossier draft survives case switching and notes remain separate from facts',()=>{
  const {game:g,c,dom}=fixture(),note=dom('dossier-note'),panel=dom('dossier-panel');note.value='Verificare il cancello laterale';panel.dispatch('input',{target:note});assert.equal(g.state.dossierDrafts[c.id],note.value);
  const other=g.state.cases[1];other.at=0;g.selectCase(other.id);assert.equal(dom('dossier-note').value,'');g.selectCase(c.id);assert.equal(dom('dossier-note').value,'Verificare il cancello laterale');const previous=JSON.stringify(c.facts);g.addNote();assert.equal(c.notes[0].text,'Verificare il cancello laterale');assert.equal(g.state.dossierDrafts[c.id],'');assert.equal(dom('dossier-note').value,'');assert.equal(JSON.stringify(c.facts),previous);
 });
 await test('typing a note is not overwritten by automatic dossier rendering',()=>{
  const {game:g,c,dom,document}=fixture(),note=dom('dossier-note');note.value='Bozza ancora in scrittura';dom('dossier-panel').dispatch('input',{target:note});document.activeElement=note;g.learn(c,[{key:'people',text:'Un occupante visibile.'}]);g.render();assert.equal(dom('dossier-note'),note);assert.equal(note.value,'Bozza ancora in scrittura');document.activeElement=null;dom('dossier-panel').dispatch('focusout');g.render();assert.equal(dom('dossier-note').value,'Bozza ancora in scrittura');
 });
 await test('save and restore retain notes, drafts, source history, active settings and event dedupe',()=>{
  const {game:g,c,storage,dom}=fixture();g.answer();g.learn(c,[{key:'people',text:'Un occupante visibile.',sourceLabel:'Alfa 21 · contatto con il segnalante'}]);dom('dossier-note').value='Controllo da riprendere';g.addNote();g.state.dossierDrafts[c.id]='Seconda nota in bozza';g.state.commsSeen['active:1:P01:scene:0:0']=true;g.state.activeComms=false;const u=g.state.units[0];u.arrivedAt=23;u.dispatchedAt=4;c.lastUpdateRequest=20;c.lastBriefing=18;g.save();
  const saved=JSON.parse(storage.get('centrale112-v4-save'));assert.equal(saved.activeComms,false);assert.equal(saved.dossierDrafts[c.id],'Seconda nota in bozza');const resumed=runtime(storage),rc=resumed.game.state.cases.find(v=>v.id===c.id);assert.equal(resumed.game.state.started,false);assert.equal(resumed.game.state.paused,true);assert.equal(resumed.game.state.activeComms,false);assert.equal(resumed.game.state.commsSeen['active:1:P01:scene:0:0'],true);assert.equal(resumed.dom('dossier-note').value,'Seconda nota in bozza');assert.equal(rc.notes[0].text,'Controllo da riprendere');assert.deepEqual(json(rc.factMeta),json(c.factMeta));assert.deepEqual(json(rc.factChanges),json(c.factChanges));assert.equal(rc.lastUpdateRequest,20);assert.equal(rc.lastBriefing,18);assert.equal(resumed.game.state.units[0].arrivedAt,23);assert.equal(resumed.game.state.units[0].dispatchedAt,4);assert.match(resumed.dom('start-button').innerHTML,/Riprendi il turno salvato/);
 });
 await test('restored seen events do not produce duplicate reports on resume',()=>{
  const {game:g,c,storage}=fixture();g.answer();stopOtherMotion(g);const u=g.state.units[0];Object.assign(u,{target:c.id,phase:'Sul posto',arrivedAt:0,workLeft:100});g.state.time=13;g.tick(.1);const first=u.history.filter(m=>m.text.includes('Primo riscontro')).length;assert.equal(first,1);g.save();const rt=runtime(storage);rt.game.start();rt.game.tick(1.1);const restored=rt.game.state.units[0];assert.equal(restored.history.filter(m=>m.text.includes('Primo riscontro')).length,first);
 });
 await test('implicit location confirmation has a recorded source and time',()=>{
  const {game:g,c}=fixture();g.learn(c,[{key:'location',text:c.address,sourceLabel:'Alfa 21'}]);assert.equal(c.confirmed,true);assert.equal(c.facts.confirm,c.address);assert.equal(c.factMeta.confirm?.source,'Alfa 21');assert.equal(c.factMeta.confirm?.time,g.state.time);
 });
 await test('a new patrol event leaves follow-up observations to progressive updates',()=>{
  const {game:g}=fixture();assert.equal(g.addPatrolReport(),true);const c=g.state.cases.at(-1);assert.equal(c.source,'patrol');assert.equal(c.confirmed,true);assert.ok(Object.keys(c.facts).filter(k=>k in c.topics).length<Object.keys(c.topics).length,'All authored patrol topic facts were revealed at creation');assert.ok(c.factMeta.confirm?.source);
 });
 await test('patrol follow-up communications progressively enrich the initial report',()=>{
  const {game:g}=fixture();assert.equal(g.addPatrolReport(),true);const c=g.state.cases.at(-1),u=g.state.units.find(u=>u.id===c.reporterUnitId);stopOtherMotion(g,[u.id]);g.state.reportCount=2;assert.deepEqual(Object.keys(c.facts).sort(),['confirm','location','opening']);for(let i=0;i<1200&&u.phase!=='Sul posto';i++)g.tick(.1);assert.equal(u.phase,'Sul posto');const at=u.arrivedAt;while(g.state.time<at+13.2)g.tick(.1);assert.ok(c.facts.access,JSON.stringify({time:g.state.time,at,u:u.phase,seen:g.state.commsSeen,facts:c.facts}));assert.ok(c.facts.hazards);assert.ok(!c.facts.injuries);assert.match(c.factMeta.access.source,/segnalazione della pattuglia/);
 });
 await test('direct radio questions to report author acquire relevant facts with source and timeline',async()=>{
  const {game:g}=fixture();g.addPatrolReport();const c=g.state.cases.at(-1),u=g.state.units.find(u=>u.id===c.reporterUnitId);g.selectUnit(u.id);assert.equal(g.state.caseId,c.id);assert.ok(!c.facts.injuries);await g.send('Dove si trova il conducente? Ci sono feriti e la strada è percorribile?');assert.match(c.facts.people,/conducente sul marciapiede/);assert.match(c.facts.injuries,/Nessun trauma/);assert.match(c.facts.access,/corsia transitabile/);assert.match(c.factMeta.injuries.source,/segnalazione della pattuglia/);assert.ok(c.history.some(m=>m.role==='aggiornamento'&&m.text.includes('Nessun trauma')));assert.ok(c.factChanges.some(f=>f.key==='injuries'));
 });
 await test('direct radio during approach does not reveal civilian topics before reaching the scene',async()=>{
  const {game:g,c}=fixture(),u=g.state.units.find(u=>u.type==='Sanitario');g.learn(c,[{key:'confirm',text:c.address}]);assert.equal(g.dispatch(u.id).ok,true);g.selectUnit(u.id);await g.send('La persona respira?');assert.equal(c.facts.breathing,undefined);assert.ok(!c.history.some(m=>m.role==='aggiornamento'&&m.text.includes('Respirazione non verificabile')));Object.assign(u,{phase:'Sul posto',arrivedAt:g.state.time});await g.send('La persona respira?');assert.equal(c.facts.breathing,'Respirazione non verificabile.');assert.match(c.factMeta.breathing.source,/contatto con il segnalante/);
 });
 await test('first briefing includes the acquired opening until a situation summary is collected',()=>{
  const {game:g,c,ctx}=fixture();g.answer();const first=ctx.ActiveComms.brief(c,g.state);assert.ok(first.includes(c.opening));g.learn(c,[{key:'situation',text:c.topics.situation.fact}]);const next=ctx.ActiveComms.brief(c,g.state);assert.ok(next.includes(c.topics.situation.fact));assert.ok(!next.includes(c.opening));
 });
 console.log(`${passed}/${passed+failed} v5 operational integration checks passed. All external services mocked.`);process.exitCode=failed?1:0;
})().catch(error=>{console.error(error);process.exitCode=1;});
