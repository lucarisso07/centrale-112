const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const ctx=vm.createContext({});
vm.runInContext(fs.readFileSync('work/dialogue-data.js','utf8')+';globalThis.scenarioList=scenarios;',ctx);
vm.runInContext(fs.readFileSync('work/conversation-ai.js','utf8'),ctx);
vm.runInContext(fs.readFileSync('work/narrative-engine.js','utf8'),ctx);
const N=ctx.NarrativeEngine,AI=ctx.ConversationAI,extra=['background','relationship','sightline','scene_sounds','scene_detail','caller_focus'];
const copy=value=>JSON.parse(JSON.stringify(value));let checks=0;
function make(key,variant=false){const c={...copy(ctx.scenarioList.find(s=>s.key===key)),id:1,source:'civilian',history:[],facts:{},attempts:{},answeredAt:null,state:'waiting',arrived:[],done:false};
 if(variant&&key==='collision'){c.topics.response.reply='Sì. Mi ha risposto che ha male a una spalla. Mi guarda quando gli parlo.';c.topics.response.fact='Conducente cosciente, dolore a una spalla.';}
 if(variant&&key==='lift'){c.topics.people.reply='Sono sola.';c.topics.people.fact='Una persona in cabina; nessun contatto esterno.';c.topics.access.reply='La mia amica non è ancora a casa. Non so chi possa aprire il portone.';c.event.text='Ho sentito dei passi sul pianerottolo, ma nessuno mi ha risposto. Sono ancora qui da sola.';}
 if(variant&&key==='flood'){c.topics.people.reply='Il conducente è fuori, ma il passeggero è ancora nell’auto. Da qui vedo che muove un braccio.';c.topics.people.fact='Un passeggero ancora nel veicolo; conducente fuori.';c.need.push('Sanitario');}
 return c;
}
function apply(c,event){c.story.seen.push(event.id);Object.assign(c.topics,event.topicPatches);for(const fact of event.facts)c.facts[fact.key]=fact.text;c.history.push({role:event.speaker,text:event.text,time:event.time});}
function prepared(key,variant=false){const c=N.enrich(make(key,variant));c.answeredAt=0;c.state='connected';c.history=[{role:'operatore',text:'Dove si trova?',time:0},{role:'operatore',text:'Chi c’è con lei?',time:2},{role:'operatore',text:'Mi descriva quello che vede.',time:3}];for(const field of ['safety','people','response','landmark','situation','access','confirm']){const t=c.topics[field];if(t)c.facts[field]=t.fact;}c.facts.confirm=c.address;return c;}
for(const source of ctx.scenarioList)for(const variant of [false,true]){
 const raw=make(source.key,variant),before=JSON.stringify(raw),c=N.enrich(raw);
 assert.equal(JSON.stringify(raw),before,'enrich must not mutate input');
 assert.equal(Object.keys(c.topics).length,Object.keys(raw.topics).length+6);
 assert(c.openingSummary.length<=180&&c.openingSummary.length>30);
 assert(c.opening.split(/[.!?]+/).filter(s=>s.trim()).length<=4,'opening exceeds four sentences');
 assert(!Object.keys(c.topics).some(k=>/^story_/.test(k)),'future story facts must stay hidden');
 assert.deepEqual(copy(c.story),{version:1,seen:[]});
 assert.equal(N.enrich(c),c,'enrich must be idempotent');
 assert.equal(N.view(c,{time:500}).label,'In attesa di contatto');
 assert(!N.view(c,{time:500}).nextPrompt);
 assert.equal(N.tick({cases:[c],units:[],time:500},1).length,0,'unanswered lines must stay silent');
 for(const key of extra){const t=c.topics[key];assert(t.reply&&t.fact&&t.question&&t.aliases.length);const answer=AI.respond(c,t.question);assert(answer.facts.some(f=>f.key===key),`${c.key}/${key}: authored question routed to ${answer.intent}`);const alias=AI.respond(c,t.aliases[0]+'?');assert(alias.facts.some(f=>f.key===key),`${c.key}/${key}: alias routed to ${alias.intent}`);checks++;}
 const ready=prepared(source.key,variant),state={cases:[ready],units:[],time:30,paused:false,pending:new Set()};
 const stateBefore=JSON.stringify(state),event1=N.tick(state,1)[0];
 assert.equal(JSON.stringify(state),stateBefore,'tick must be pure');assert(event1&&event1.chapter===1);assert.equal(event1.kind,'story');assert(event1.topicPatches.story_1);
 assert.equal(N.tick(state,0)[0].id,event1.id,'unapplied event must be deterministic');
 apply(ready,event1);assert.equal(N.view(ready,state).chapter,1);assert.equal(N.tick(state,1).length,0,'seen event must not repeat');
 state.time=70;assert.equal(N.tick(state,1).length,0,'beat 2 requires actual resources');
 ready.arrived.push(ready.need[0]);state.units.push({id:'T01',target:ready.id,type:ready.need[0],phase:'Sul posto'});
 const event2=N.tick(state,1)[0];assert(event2&&event2.chapter===2,`${source.key}: missing arrival beat`);assert(!event2.text.includes('gioco'));apply(ready,event2);
 assert.equal(N.view(ready,state).chapter,2);assert.equal(N.tick(state,1).length,0);
 ready.done=true;ready.state='closed';state.time=200;
 const final=N.tick(state,1)[0];assert(final&&final.chapter===3&&final.epilogue);assert.equal(final.facts.length,0,'epilogue must not invent case findings');assert(!/gioco|invent|dati|resoconto|fascicolo|protocol|diagnosi|esito sanitario/.test(final.text));
 apply(ready,final);assert.equal(N.view(ready,state).chapter,3);assert.equal(N.tick(state,1).length,0);
 const restored=copy(ready);assert.equal(N.tick({cases:[restored],time:500,units:[]},1).length,0,'restored seen state must deduplicate');
 checks++;
}
{
 const c=prepared('lost'),s={cases:[c],time:40,units:[],pending:new Set(['c1'])};assert.equal(N.tick(s,1).length,0);s.pending.clear();assert.equal(N.tick(s,1).length,1);c.state='held';assert.equal(N.tick(s,1).length,0);c.state='connected';s.paused=true;assert.equal(N.tick(s,1).length,0);s.paused=false;c.history.push({role:'chiamante',text:'Sto leggendo il cartello.',time:38});assert.equal(N.tick(s,1).length,0,'do not interrupt recent caller speech');checks++;
}
{
 const c=prepared('conflict'),s={cases:[c],time:40,units:[]};apply(c,N.tick(s,1)[0]);s.time=80;s.units=[{id:'M01',target:1,type:'Sanitario',phase:'Sul posto'}];assert.equal(N.tick(s,1).length,0,'an ambulance must not trigger a police narrative');s.units.push({id:'P01',target:1,type:'Polizia',phase:'Sul posto'});assert.equal(N.tick(s,1)[0].chapter,2);checks++;
}
{
 const alone=N.enrich(make('lift',true)),together=N.enrich(make('lift',false)),trapped=N.enrich(make('flood',true)),empty=N.enrich(make('flood',false));
 assert.match(alone.topics.relationship.reply,/Sono sola/);assert.doesNotMatch(alone.topics.scene_sounds.reply,/Riconosco la voce/);assert.match(together.topics.relationship.reply,/signore/);
 assert.match(trapped.topics.scene_sounds.reply,/passeggero/);assert.doesNotMatch(empty.topics.scene_sounds.reply,/passeggero/);
 const c=prepared('lift',true),s={cases:[c],time:40,units:[]};apply(c,N.tick(s,1)[0]);s.time=80;c.arrived=['Vigili del fuoco'];s.units.push({id:'V01',target:1,type:'Vigili del fuoco',phase:'Sul posto'});const arrival=N.tick(s,1)[0];assert.doesNotMatch(arrival.text,/una voce si presenta|amica mi dice/,'alone variant must not invent contact that contradicts legacy event');checks++;
}
{
 const c=N.enrich(make('lost'));assert.match(AI.respond(c,'Come è vestito?').reply,/giacca blu/);assert(AI.respond(c,'Sua figlia sa che era uscito per una passeggiata?').facts.some(f=>f.key==='relationship'));
 const next=N.enrich(make('lost'));c.topics.scene_detail.reply='Mutated locally';assert.match(next.topics.scene_detail.reply,/giacca blu/);assert.match(N.enrich(make('lost')).topics.scene_detail.reply,/giacca blu/,'template cache must not leak mutations');checks++;
 const saved=copy(next);delete saved.openingSummary;saved.story.seen.push('lost:story:1');const restored=N.enrich(saved);assert(restored.openingSummary);assert.deepEqual(restored.story.seen,saved.story.seen);assert.equal(saved.openingSummary,undefined);checks++;
}
{
 for(const variant of [false,true]){const c=prepared('collision',variant),s={cases:[c],units:[],time:40};apply(c,N.tick(s,1)[0]);s.time=80;s.units=[{id:'M01',target:1,type:'Sanitario',phase:'Sul posto'}];const second=N.tick(s,1)[0];if(variant)assert.match(second.text,/conducente mi aveva risposto/);else assert.match(second.text,/non avevo ricevuto una risposta/);checks++;}
}
{
 const c=prepared('warehouse'),s={cases:[c],units:[],time:40};apply(c,N.tick(s,1)[0]);s.time=80;c.arrived=['Polizia'];s.units=[{id:'P01',target:1,type:'Polizia',phase:'Rientro'}];assert.equal(N.tick(s,1).length,0,'historical arrival does not mean a patrol is still on scene');s.units=[];assert.equal(N.tick(s,1).length,0,'known empty unit list cannot fall back to arrival history');s.units=[{id:'P01',target:1,type:'Polizia',phase:'Sul posto'}];assert.equal(N.tick(s,1)[0].chapter,2);checks++;
}
{
 const c=prepared('park');delete c.facts.people;delete c.facts.scene_sounds;const first=N.tick({cases:[c],time:40,units:[]},1)[0];assert.match(first.text,/Un ragazzo si è fermato con noi/);assert.match(first.facts[0].text,/secondo testimone è presente/);checks++;
}
console.log(`PASS ${checks} narrative checks: 8 scenarios × 2 variants, 96 authored questions/aliases, progressive beats, negation, live presence, pending gates, purity and spoiler-free presentation.`);
