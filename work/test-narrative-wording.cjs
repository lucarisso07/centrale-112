const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
require('./conversation-ai.js');require('./narrative-engine.js');
const semantic=require('./semantic-calls.cjs'),ctx=vm.createContext({});
vm.runInContext(fs.readFileSync('work/dialogue-data.js','utf8')+';globalThis.sources=scenarios;',ctx);
const make=key=>NarrativeEngine.enrich({...JSON.parse(JSON.stringify(ctx.sources.find(s=>s.key===key))),facts:{},history:[],attempts:{},event:null,assignedUnits:[]});
const faulty='Indosso una giacca blu. Non c’è nessun’altra persona che ho visto passare.';
function stub(selection,generated=faulty){const calls=[];const model=async(messages,options)=>{calls.push(options.schema?.properties?.keys?'selection':options.schema?.properties?.valid?'verification':'generation');if(options.schema?.properties?.keys)return JSON.stringify({keys:selection,understood:true});if(options.schema?.properties?.valid)return JSON.stringify({valid:true});return generated;};return {model,calls};}
(async()=>{
 let checks=0;
 // Regression: a previously accepted paraphrase changed "I am the person by the
 // bench" into a denial that other people existed. Even a permissive verifier
 // must never get a chance to approve that rewrite for authored narrative facts.
 {
  const c=make('lost'),test=stub(['scene_detail']);
  const result=await semantic.respond({mode:'call',text:'Quale particolare del tuo abbigliamento ci permette di distinguerti?',scene:c,history:[]},test.model);
  assert.equal(result.reply,c.topics.scene_detail.reply);
  assert(result.reply.includes('non un’altra persona che ho visto passare'));
  assert(!result.reply.includes('Non c’è nessun’altra persona'));
  assert.deepEqual(test.calls,['selection'],'semantic interpretation must remain enabled while rewriting is bypassed');
  assert.equal(result.understanding,'semantic');assert.equal(result.engine,'grounded');checks++;
 }
 for(const key of ['background','relationship','sightline','scene_sounds','scene_detail','caller_focus']){
  const c=make('warehouse'),test=stub([key]),text='Puoi chiarire questo aspetto del tuo racconto?';
  const expected=ConversationAI.answerTopics(c,[key],text);
  const result=await semantic.respond({mode:'call',text,scene:c,history:[]},test.model);
  assert.equal(result.reply,expected.reply,`authored ${key} must remain exact`);
  assert.deepEqual(result.facts,expected.facts);assert.deepEqual(test.calls,['selection']);checks++;
 }
 {
  const c=make('warehouse');c.topics.story_12={label:'Osservazione già emersa',question:'Che cosa ha precisato?',reply:'Per un momento non ho visto la luce dietro gli scaffali. Non so se ci fosse ancora qualcuno.',fact:'Luce temporaneamente non visibile; presenza di persone non verificata.',requires:[]};
  const text='Mi descrive il particolare di cui stavamo parlando?',test=stub(['story_12']);
  const result=await semantic.respond({mode:'call',text,scene:c,history:[]},test.model);
  assert.equal(result.reply,c.topics.story_12.reply);assert.deepEqual(test.calls,['selection']);assert(result.keys.includes('story_12'));checks++;
 }
 {
  const c=make('lost'),text='Può chiarire quello che mi ha appena raccontato?',test=stub(['scene_detail','people']);
  const expected=ConversationAI.answerTopics(c,['scene_detail','people'],text);
  const result=await semantic.respond({mode:'call',text,scene:c,history:[]},test.model);
  assert.equal(result.reply,expected.reply,'mixed replies must preserve the full authored composition');assert.deepEqual(test.calls,['selection']);checks++;
 }
 {
  const c=make('lost'),calls=[];
  const result=await semantic.respond({mode:'call',text:'Come è vestito?',scene:c,history:[]},async()=>{calls.push('selection');throw Error('Model unavailable');});
  assert.equal(result.reply,c.topics.scene_detail.reply);assert.equal(result.understanding,'contextual');assert.deepEqual(calls,['selection']);checks++;
 }
 {
  const c=make('warehouse'),generated='Il furgone fuori dal cancello è bianco. Da qui non posso leggerne la targa, rivolta dall’altra parte.',test=stub(['vehicle'],generated);
  const result=await semantic.respond({mode:'call',text:'Quali elementi identificano il mezzo parcheggiato?',scene:c,history:[]},test.model);
  assert.equal(result.reply,ConversationAI.answerTopics(c,['vehicle'],'Quali elementi identificano il mezzo parcheggiato?').reply,'civilian vehicle observations also retain exact wording');assert.deepEqual(test.calls,['selection']);checks++;
 }
 {
  const c=make('warehouse'),text='Chi è coinvolto e ci sono pericoli visibili?',selected=['people','weapons','safety'];
  const test=stub(selected,'Vedo due persone. Non ci sono pericoli visibili.');
  const expected=ConversationAI.answerTopics(c,selected,text),result=await semantic.respond({mode:'call',text,scene:c,history:[]},test.model);
  assert.equal(result.reply,expected.reply);assert.match(result.reply,/non riesco a identificarlo/);assert(!result.reply.includes('Non ci sono pericoli'));
  assert.deepEqual(test.calls,['selection'],'a model must not turn an unidentified object into absence of hazards');assert.deepEqual(result.facts,expected.facts);checks++;
 }
 for(const [scenario,key]of [['warehouse','safety'],['warehouse','weapons'],['collision','hazards'],['warehouse','injuries'],['collision','people'],['collision','situation']]){
  const c=make(scenario),text='Mi precisa quello che ha osservato?',test=stub([key],'Non c’è nessun pericolo e nessuna persona è ferita.');
  const expected=ConversationAI.answerTopics(c,[key],text),result=await semantic.respond({mode:'call',text,scene:c,history:[]},test.model);
  assert.equal(result.reply,expected.reply,`${key} must retain uncertainty and scope`);assert.deepEqual(test.calls,['selection']);checks++;
 }
 {
  const c=make('warehouse'),text='Mi chiarisce entrambi gli aspetti?',test=stub(['people','weapons']);
  const expected=ConversationAI.answerTopics(c,['people','weapons'],text),result=await semantic.respond({mode:'call',text,scene:c,history:[]},test.model);
  assert.equal(result.reply,expected.reply);assert.equal(result.understanding,'semantic');assert.deepEqual(test.calls,['selection'],'the noun aspetti must not bypass semantic interpretation as a wait command');checks++;
 }
 {
  const generated='Alfa 21, siamo sul posto. Restiamo in ascolto.',test=stub([],generated);
  const result=await semantic.respond({mode:'radio',text:'Confermate la posizione?',scene:{unit:{id:'P01',callSign:'Alfa 21',type:'Polizia',phase:'Sul posto'},knownReply:'Alfa 21: sul posto, in ascolto.'}},test.model);
  assert.equal(result.reply,generated);assert.deepEqual(test.calls,['generation','verification'],'radio behavior remains unchanged');checks++;
 }
 console.log(`PASS ${checks} wording regressions: civilian semantic selection retained; narrative, safety, mixed and story_N wording protected; aspetti disambiguated; radio generation unchanged.`);
})().catch(error=>{console.error(error);process.exitCode=1;});
