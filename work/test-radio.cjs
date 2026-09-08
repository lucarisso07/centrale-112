const assert = require('node:assert/strict');
require('./radio-engine.js');
const R = global.RadioEngine;
const u = {id:'P01',callSign:'Volante 21',type:'Polizia',phase:'Pattugliamento',target:null,x:640,y:490,eta:48,crew:['Capopattuglia','Agente']};
const ctx = {time:100,selectedCaseId:2,units:[u],cases:[{id:2,key:'collision',title:'Incidente',address:'Via Roma 10',confirmed:true,done:false,need:['Polizia','Sanitario'],facts:{situation:'Auto contro un palo.',people:'Un occupante visibile.'},arrived:[],completed:[]},{id:3,address:'Via Pini',facts:{},need:['Polizia'],done:false},{id:4,address:'Via Tigli 7',confirmed:true,done:true}]};
let checks=0;
function test(name,fn){fn();checks++;console.log('PASS '+name);}
test('explicit dispatch',()=>assert.deepEqual(R.respond(u,'Volante 21, vai al caso 2',ctx).command,{type:'dispatch',caseId:2}));
test('unconfirmed localization rejected',()=>assert.equal(R.respond(u,'Vai al caso 3',ctx).command,undefined));
test('unknown case rejected',()=>assert.equal(R.respond(u,'Vai al caso 99',ctx).command,undefined));
test('closed case rejected',()=>assert.equal(R.respond(u,'Intervieni al caso 4',ctx).command,undefined));
test('ambiguous target rejected',()=>assert.equal(R.respond(u,'Vai al caso 2 o al caso 3',ctx).command,undefined));
test('conflicting commands rejected',()=>assert.equal(R.respond(u,'Vai al caso 2 e rientra',ctx).command,undefined));
test('targetless dispatch rejected',()=>assert.equal(R.respond(u,'Vai subito',ctx).command,undefined));
test('explicit selected case accepted',()=>assert.equal(R.respond(u,'Intervieni su questo evento',ctx).command.caseId,2));
test('negation and questions cannot dispatch',()=>{for(const text of ['Non andare al caso 2','Non invia al caso 2','Devo inviare al caso 2?','Dovrei rientrare?','Stai andando al caso 2?','Non rientra','Quando rientra?','Perché vai al caso 2?','Chi ha detto vai al caso 2?'])assert.equal(R.respond(u,text,ctx).command,undefined,text);});
test('return and patrol orders',()=>{assert.equal(R.respond(u,'Potete rientrare alla base?',ctx).command.type,'return');assert.equal(R.respond(u,'Riprendi pattugliamento',ctx).command.type,'patrol');assert.equal(R.respond(u,'Fermati e attendi',ctx).command.type,'hold');});
test('case-less support cannot be applied',()=>assert.equal(R.respond(u,'Richiedi rinforzi',ctx).command,undefined));
const assigned={...u,phase:'In viaggio',target:2};
test('support explicit target',()=>assert.deepEqual(R.respond(assigned,'Richiedi un ambulanza',ctx).command,{type:'support',caseId:2,service:'Sanitario'}));
test('support question is read-only',()=>{for(const text of ['Ci servono rinforzi?','Servono rinforzi?','Occorrono rinforzi?'])assert.equal(R.respond(assigned,text,ctx).command,undefined,text);});
test('state-dependent eta',()=>{assert.match(R.respond(assigned,'Quanto manca?',ctx).reply,/48 secondi/);assert.match(R.respond({...assigned,phase:'Sul posto'},'Quando arrivate?',ctx).reply,/gia|già/);});
test('position and status answered together',()=>{const r=R.respond(u,'Posizione e stato?',ctx);assert.match(r.reply,/settore C3/);assert.match(r.reply,/pattugliamento/);});
test('crew uses actual data',()=>assert.match(R.respond(u,'Quanti siete a bordo?',ctx).reply,/Capopattuglia, Agente/));
test('scene response discloses source',()=>assert.match(R.respond(assigned,'Cosa vedete sul posto?',ctx).reply,/nessun riscontro diretto/));
test('unobserved medical data not invented',()=>assert.match(R.respond(assigned,'Il paziente respira?',ctx).reply,/Respiro non ancora verificato/));
test('support uses actual assignments',()=>{const r=R.respond(assigned,'Quali rinforzi sono assegnati?',{...ctx,units:[assigned,{id:'M01',type:'Sanitario',phase:'In viaggio',target:2,eta:31}]});assert.match(r.reply,/M01/);assert.match(r.reply,/31 secondi/);});
test('fallback requests clarification',()=>assert.equal(R.respond(u,'Qual è il codice della serratura?',ctx).intent,'clarification'));
test('respond never mutates input',()=>{const before=JSON.stringify({u,ctx});R.respond(u,'Vai al caso 2',ctx);R.respond(assigned,'Quali supporti?',ctx);assert.equal(JSON.stringify({u,ctx}),before);});
test('patrol reports carry position and valid topic dependencies',()=>{for(let i=0;i<3;i++){const r=R.makePatrolReport(u,i,ctx.time);assert.equal(r.x,u.x);assert.equal(r.y,u.y);assert.equal(r.source,'patrol');assert.equal(r.reporterUnitId,u.id);assert.ok(r.opening.length&&r.need.length&&r.event.after);for(const t of Object.values(r.topics)){assert.equal(typeof t.fact,'string');for(const key of t.requires)assert.ok(key==='location'||r.topics[key]);}}});
test('unexpected delays only enroute',()=>{assert.equal(R.makeUnexpected(assigned,0,ctx).kind,'roadblock');assert.equal(R.makeUnexpected(u,0,ctx).kind,'update');assert.equal(R.makeUnexpected({...assigned,phase:'Sul posto'},0,ctx).kind,'support');});
const vanUnit={...u,id:'P02',callSign:'Alfa 24',phase:'Sul posto',target:8,street:'Via delle Officine'};
const vanReport={...R.makePatrolReport(vanUnit,0,100),id:8,confirmed:true,done:false,arrived:['Polizia'],completed:[]};
vanReport.facts=Object.fromEntries(Object.entries(vanReport.topics).map(([key,t])=>[key,t.fact]));
const vanContext={time:130,units:[vanUnit],cases:[vanReport],selectedCaseId:8};
test('multipart patrol question answers driver position, injury status and passable lane',()=>{
 const r=R.respond(vanUnit,'Alfa 24, dove si trova il conducente? Ci sono feriti e la strada è percorribile?',vanContext);
 assert.match(r.reply,/conducente sul marciapiede/i);assert.match(r.reply,/Nessun trauma o malessere riferito/);assert.match(r.reply,/una corsia transitabile/);assert.doesNotMatch(r.reply,/Ci troviamo in/);assert.equal(r.command,undefined);
 console.log('EXAMPLE '+r.reply);
});
test('person and unit locations are distinct when both are requested',()=>{
 const r=R.respond(vanUnit,'Dove siete voi e dove si trova il conducente?',vanContext);
 assert.match(r.reply,/Ci troviamo in Via delle Officine/);assert.match(r.reply,/conducente sul marciapiede/);
});
test('traffic synonyms return the known event access facts',()=>{for(const text of ['La strada è percorribile?','È transitabile?','Quante corsie sono libere?','Il passaggio è possibile?'])assert.match(R.respond(vanUnit,text,vanContext).reply,/una corsia transitabile/,text);});
test('unknown person location is not replaced with patrol coordinates',()=>{
 const c={...vanReport,facts:{...vanReport.facts,people:'Una persona presente.',safety:'Posizione del conducente non verificata.',vehicle:'Furgone bianco.'}};
 const r=R.respond(vanUnit,'Dove si trova il conducente?',{...vanContext,cases:[c]});assert.match(r.reply,/posizione della persona indicata non è ancora verificata/);assert.doesNotMatch(r.reply,/Ci troviamo in/);
});
test('missing injury information is retained alongside known breathing',()=>{
 const c={...vanReport,topics:{...vanReport.topics,injuries:undefined},facts:{breathing:'Respiro presente; parametri non misurati.'}};
 const r=R.respond(vanUnit,'La persona respira e ci sono feriti?',{...vanContext,cases:[c]});assert.match(r.reply,/Respiro presente; parametri non misurati/);assert.match(r.reply,/Presenza di ferite o traumi non ancora verificata/);
});
test('unknown access does not assert the road is clear',()=>{
 const c={...vanReport,topics:{...vanReport.topics,access:undefined,hazards:undefined,situation:undefined},facts:{people:'Un conducente sul marciapiede.'}};
 assert.match(R.respond(vanUnit,'La strada è percorribile?',{...vanContext,cases:[c]}).reply,/percorribilità e le corsie libere non sono ancora verificate/);
});
test('own report author can transmit authored observations without mutating the dossier',()=>{
 const c={...vanReport,reporterUnitId:vanUnit.id,facts:{confirm:vanReport.address}};const author={...vanUnit,phase:'In viaggio'};const r=R.respond(author,'Dove si trova il conducente? Ci sono feriti e la strada è percorribile?',{...vanContext,units:[author],cases:[c]});
 assert.match(r.reply,/conducente sul marciapiede/);assert.match(r.reply,/una corsia transitabile/);assert.ok(r.facts.some(f=>f.key==='people'));assert.ok(r.facts.some(f=>f.key==='injuries'));assert.ok(r.facts.every(f=>f.sourceLabel==='Alfa 24 · segnalazione della pattuglia'));assert.equal(c.facts.people,undefined);assert.equal(r.caseId,c.id);
});
test('travelling units cannot acquire uncommunicated civilian observations',()=>{
 const c={...vanReport,source:'civilian',reporterUnitId:undefined,facts:{confirm:vanReport.address}};const travelling={...vanUnit,phase:'In viaggio'};const r=R.respond(travelling,'Ci sono feriti?',{...vanContext,units:[travelling],cases:[c]});assert.equal(r.facts.length,0);assert.doesNotMatch(r.reply,/Nessun trauma o malessere riferito/);
});
test('on-scene reply acquires only facts actually stated and retains uncertainty',()=>{
 const c={...vanReport,source:'civilian',facts:{},topics:{breathing:{fact:'Respirazione non verificabile.',reply:'Non la vedo respirare da qui.'},people:{fact:'Una persona',reply:'Una persona.'}}};const r=R.respond(vanUnit,'La persona respira?',{...vanContext,cases:[c]});assert.equal(r.facts.length,1);assert.equal(r.facts[0].key,'breathing');assert.equal(r.facts[0].text,'Respirazione non verificabile.');assert.match(r.facts[0].sourceLabel,/contatto con il segnalante/);assert.ok(r.reply.includes(r.facts[0].text));
});
test('flood driver injuries and illness use one shared known fact without contradictory unknown',()=>{
 const unit={...vanUnit,id:'V01',callSign:'Vigili 11',type:'Vigili del fuoco'};
 const c={...vanReport,key:'flood',source:'civilian',facts:{},topics:{injuries:{fact:'Nessun malessere o trauma riferito.',reply:'Il conducente dice di stare bene.'}}};
 const context={...vanContext,units:[unit],cases:[c]};const r=R.respond(unit,'Il conducente riferisce ferite o malessere?',context);
 assert.equal(r.facts.length,1);assert.equal(r.facts[0].key,'injuries');assert.equal(r.reply.split('Nessun malessere o trauma riferito.').length-1,1);assert.doesNotMatch(r.reply,/non ancora|nessun riscontro|Specificare quale/);
 const illness=R.respond(unit,'Il conducente riferisce malessere?',context);assert.equal(illness.facts[0].key,'injuries');assert.match(illness.reply,/Nessun malessere o trauma riferito/);
});
test('missing medical parts are identified individually alongside a known injury report',()=>{
 const c={...vanReport,source:'civilian',facts:{injuries:'Nessun malessere o trauma riferito.'},topics:{}};
 const r=R.respond(vanUnit,'Ci sono feriti? Respira ed è cosciente?',{...vanContext,cases:[c]});assert.match(r.reply,/Nessun malessere o trauma riferito/);assert.match(r.reply,/Respiro non ancora verificato/);assert.match(r.reply,/Risposta alla voce non ancora verificata/);assert.doesNotMatch(r.reply,/Su questo punto/);
});
console.log(checks+' radio checks passed');
