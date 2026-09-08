const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const ctx=vm.createContext({});for(const f of ['dialogue-data.js','narrative-engine.js','case-factory.js'])vm.runInContext(fs.readFileSync('work/'+f,'utf8'),ctx);vm.runInContext('globalThis.cases=scenarios.map((s,i)=>makeCase(s,i,false));',ctx);
const fixtures=[
 ['lift','Era venuta a trovare qualcuno in questo edificio?','background'],
 ['lift','Riesce a leggere un riferimento dell’ascensore?','scene_detail'],
 ['lost','Come sei vestito?','scene_detail'],
 ['warehouse','Cosa stavi facendo quando hai sentito il vetro?','background'],
 ['collision','Conosce il conducente o qualcuno che viaggiava con lui?','relationship'],
 ['fire','Che cosa la preoccupa di più mentre mi parla?','caller_focus'],
 ['park','Come mai ti trovavi sul sentiero?','background'],
 ['flood','Mi dici il punto preciso e se il conducente è ancora in auto?','confirm'],
 ['warehouse','Chi è coinvolto e ci sono pericoli visibili?','people'],
];
(async()=>{let passed=0;for(const [key,text,wanted] of fixtures){const c=JSON.parse(JSON.stringify(ctx.cases.find(c=>c.key===key)));const history=[{role:'operatore',text:'112, mi dica che cosa è successo.'},{role:'chiamante',text:c.opening}];c.facts={opening:c.openingSummary};const res=await fetch('http://127.0.0.1:8122/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:'call',text,scene:{...c,event:null},history})});const data=await res.json();console.log(JSON.stringify({key,text,wanted,keys:data.keys,reply:data.reply}));assert.equal(res.status,200);assert.ok(data.keys.includes(wanted),'Missing '+wanted+' for '+text);passed++;}console.log('PASS '+passed+' live narrative questions');})().catch(e=>{console.error(e);process.exitCode=1});
