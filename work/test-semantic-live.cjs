const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');const context=vm.createContext({});vm.runInContext(fs.readFileSync('work/dialogue-data.js','utf8')+';globalThis.cases=scenarios;',context);
const checks=[
 ['collision','Hai provato a farti sentire da quello al volante?',['response']],
 ['collision','Sul portone che numero leggi? In che città siamo?',['confirm']],
 ['fire','La signora riesce a scambiare qualche parola con te?',['symptoms']],
 ['warehouse','Riusciresti a distinguere la sequenza di lettere sulla parte posteriore del mezzo?',['vehicle']],
 ['collision','Indica il punto preciso e dimmi se quello al volante reagisce alla tua voce.',['confirm','response']],
 ['fire','Il bambino sta tossendo come sua madre?',[]],
 ['flood','Mi dici esattamente dove sei, il comune e quante persone ci sono in auto?',['confirm','people']],
 ['collision','Puoi confermare la posizione esatta, dirmi quante persone vedi e se il conducente reagisce alla tua voce?',['confirm','people','response']],
 ['lost','C’è un dettaglio lì attorno che consentirebbe a chi arriva di riconoscere il posto?',['landmark']],
 ['flood','Quello che guidava è riuscito ad abbandonare l’abitacolo?',['people']],
 ['warehouse','Quei due potrebbero essere lì per conto del titolare?',['owner']],
 ['park','Hai idea di cosa assuma di solito per curarsi?',['history']],
 ['lift','Quando hai cercato aiuto usando il comando in cabina, qualcuno ti ha dato retta?',['alarm']],
];
(async()=>{let count=0;for(const [key,text,keys]of checks){const scene={...JSON.parse(JSON.stringify(context.cases.find(c=>c.key===key))),facts:{},history:[],attempts:{},assignedUnits:[],event:null};const started=Date.now();const r=await fetch('http://127.0.0.1:8122/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:'call',text,scene,history:[]})});const result=await r.json();console.log(JSON.stringify({text,ms:Date.now()-started,status:r.status,...result}));assert.equal(r.status,200);for(const k of keys)assert(result.keys.includes(k),`Missing ${k}: ${text}`);if(!keys.length)assert(!/figlio.{0,20}tossisce/.test(result.reply),'Child inherited symptoms');count++;}console.log(`PASS ${count} semantic live checks`);})().catch(e=>{console.error(e);process.exitCode=1});
