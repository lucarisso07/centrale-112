/* Bounded regression checks for radio/state integration; no browser or network. */
const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const dir=__dirname;
let routeUnavailable=false;
const dom=new Proxy({}, {get(t,k){return t[k]||(t[k]={textContent:'',classList:{add(){},remove(){},toggle(){}},value:''});}});
const sandbox={console,document:{getElementById:id=>dom[id]},window:{},setTimeout:()=>0,clearTimeout(){},globalThis:null};
sandbox.globalThis=sandbox;
sandbox.CityMap={nodes:[{x:430,y:440,nodeId:0}],edges:[],nearest:()=>0,roadName:()=> 'Via Roma',route:(x,y,tx,ty)=>routeUnavailable?[]:[{x,y,nodeId:0},{x:tx,y:ty,nodeId:1}],advance:()=>false};
sandbox.makeCase=(s,i)=>({...s,id:i+1,at:0,history:[],facts:{},asked:[],attempts:{},priority:2,accepted:false,done:false,arrived:[],sent:[],completed:[],state:'waiting',answeredAt:null,lastContact:0,heldAt:null,eventFired:false,unread:0,revision:0,firstDispatch:null,opening:s.opening[0]});
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(dir+'/radio-engine.js','utf8'),sandbox);
sandbox.RadioEngine=sandbox.window.RadioEngine;
const source=fs.readFileSync(dir+'/game-v4.js','utf8').replace(/Game\.init\(\);?\s*$/,'');
vm.runInContext(source+'\nglobalThis.game=Game;',sandbox);
const G=sandbox.game,R=sandbox.RadioEngine;
function reset(){
 routeUnavailable=false;
 const c={id:1,key:'collision',title:'Incidente',address:'Via Roma 10',x:430,y:440,at:0,confirmed:true,done:false,need:['Polizia','Sanitario'],arrived:[],completed:[],sent:[],history:[],revision:0,facts:{situation:'Auto contro palo.'},answeredAt:null,event:{after:100,text:'Aggiornamento.',fact:'Aggiornamento.'},firstDispatch:null};
 const u={id:'P01',type:'Polizia',callSign:'Alfa 21',crew:'Due agenti',x:430,y:440,homeX:430,homeY:440,phase:'Pattugliamento',target:null,path:[],pathIndex:0,patrolIndex:0,history:[],revision:0,eta:20,waitUntil:0,workLeft:50,angle:0};
 Object.assign(G.state,{time:80,started:true,paused:false,cases:[c],units:[u],caseId:1,unitId:'P01',tab:'radio',logs:[],blocked:[],reportCount:0,unexpectedCount:0,radioUnread:0});
 return {c,u};
}
let count=0,failed=0;
function check(name,run){count++;try{run();console.log('PASS '+name);}catch(e){failed++;console.log('FAIL '+name+': '+e.message);}}
check('an assigned held unit can resume the same event',()=>{const {c,u}=reset();assert.equal(G.dispatch(u.id,c.id).ok,true);G.actionCommand(u,{type:'hold'});const res=G.actionCommand(u,{type:'dispatch',caseId:c.id});assert.equal(res.ok,true,res.text);assert.equal(u.phase,'In viaggio');});
check('repeating hold preserves the on-scene activity',()=>{const {c,u}=reset();u.target=c.id;u.phase='Sul posto';const work=u.workLeft;G.actionCommand(u,{type:'hold'});G.actionCommand(u,{type:'hold'});const res=G.actionCommand(u,{type:'dispatch',caseId:c.id});assert.equal(res.ok,true,res.text);assert.equal(u.phase,'Sul posto');assert.equal(u.workLeft,work);});
check('reporting patrol has the reported event as active reference',()=>{const {u}=reset();G.addPatrolReport();const c=G.state.cases.at(-1);assert.equal(u.target,c.id);const r=R.respond(u,'Aggiornamento dal posto',{cases:G.state.cases,units:G.state.units,selectedCaseId:c.id});assert.doesNotMatch(r.reply,/Nessun intervento attualmente assegnato/);});
check('observations in patrol report are accessible in radio',()=>{const {u}=reset();G.addPatrolReport();const c=G.state.cases.at(-1);u.target=c.id;const r=R.respond(u,'Descrivete la situazione',{cases:G.state.cases,units:G.state.units,selectedCaseId:c.id});assert.doesNotMatch(r.reply,/non sono ancora registrati riscontri/);});
check('failed return preserves current assignment and phase',()=>{const {c,u}=reset();u.target=c.id;u.phase='Sul posto';routeUnavailable=true;const res=G.actionCommand(u,{type:'return'});assert.equal(res.ok,false);assert.equal(u.target,c.id);assert.equal(u.phase,'Sul posto');});
check('on-scene units can transmit support surprises',()=>{const {c,u}=reset();u.target=c.id;u.phase='Sul posto';assert.equal(G.unexpected(),true);assert.match(u.history.at(-1).text,/Sanitario/);});
check('a radio update does not stop a moving vehicle',()=>{const {c,u}=reset();u.target=c.id;u.phase='In viaggio';G.state.unexpectedCount=2;G.unexpected();assert.ok(u.waitUntil<=G.state.time,'Update set waitUntil to '+u.waitUntil);});
console.log(`${count-failed}/${count} integration checks passed`);
process.exitCode=failed?1:0;
