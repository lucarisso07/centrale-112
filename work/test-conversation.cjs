const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const context = vm.createContext({});
vm.runInContext(fs.readFileSync('work/dialogue-data.js', 'utf8'), context);
vm.runInContext(fs.readFileSync('work/conversation-ai.js', 'utf8'), context);
const scenarios = vm.runInContext('scenarios', context), ai = context.ConversationAI;
const make = key => ({...JSON.parse(JSON.stringify(scenarios.find(s => s.key === key))), history: [], attempts: {}, facts: {}, assignedUnits: [], eventFired: false});
let checks = 0;
function ask(c, text, intent, pattern) {
  const before = JSON.stringify(c), r = ai.respond(c, text);
  assert.equal(JSON.stringify(c), before, 'engine must not mutate its input');
  assert(r.reply && r.reply.length < 1800, `${text}: reply absent or excessive`);
  if (intent) assert(r.intent.includes(intent), `${c.key}: "${text}" -> ${r.intent}: ${r.reply}, expected ${intent}`);
  if (pattern) assert.match(r.reply, pattern, `${c.key}: ${text}`);
  c.history.push({role: 'operatore', text}, {role: 'chiamante', text: r.reply});
  for (const f of r.facts) c.facts[f.key] = f.text;
  checks++;
  return r;
}

for (const s of scenarios) {
  const c = make(s.key);
  assert.equal(ai.suggestions(c).length, 4);
  ask(c, 'Pronto, mi sente?', 'connection');
  ask(c, 'Qual è il suo nome?', 'identity');
  ask(c, 'Dove si trova?', 'location');
  ask(c, 'Dove si trova esattamente?', 'confirm');
  ask(c, 'Il civico e il comune esatto, per favore', 'confirm');
  assert.equal(c.facts.confirm, c.address);
  for (const [key, t] of Object.entries(c.topics)) ask(c, t.question, key);
  ask(c, 'È cambiato qualcosa nel frattempo?', 'update');
  c.eventFired = true;
  ask(c, 'Mi aggiorna sulla situazione adesso?', 'update');
  ask(c, 'E qual è il tuo colore preferito?', 'clarify');
  assert(!c.facts.unrelated);
}
{
  const c = make('collision');
  ask(c, 'Il conducente apre gli occhi quando gli parli?', 'response', /non.*risposto/);
  ask(c, 'Ha perso conoscenza? Riesce a respirare?', 'response+breathing', /riflesso/);
  ask(c, 'Non è cosciente, conferma?', 'response', /Non ha girato/);
  ask(c, 'È morto?', 'diagnosis', /Non posso stabilirlo/);
  ask(c, 'Dove e quante persone ci sono?', 'location+people');
  ask(c, 'Che modello di macchina è?', 'vehicle_unknown');
  ask(c, 'Quanti anni ha il conducente?', 'demographics');
  const compound = ask(c, 'Mi dica il punto esatto, il civico e se il conducente le risponde.', 'confirm+response');
  assert(compound.facts.some(f => f.key === 'confirm') && compound.facts.some(f => f.key === 'response'));
}
{
  const c = make('fire');
  ask(c, 'Tua madre ti parla?', 'symptoms', /risponde/);
  ask(c, 'E lui?', 'child_condition', /figlio/);
  ask(c, 'Da dove esce il fumo?', 'situation', /pianerottolo/);
  ask(c, 'Ha il fiato corto?', 'symptoms', /tossisce/);
  ask(c, 'Ci sono fiamme?', 'hazards', /nessuna fiamma/);
  ask(c, 'In quanti siete?', 'people', /tre/);
  ask(c, 'A che ora è cominciato?', 'time');
}
{
  const c = make('park');
  ask(c, 'Sta ansimando?', 'breathing', /veloce/);
  ask(c, 'Dove sente dolore?', 'symptoms');
  ask(c, 'Quali farmaci prende di solito?', 'history', /Non so/);
  ask(c, 'Dagli una dose di aspirina', 'clinical_handoff', /Non ho.*dato farmaci/);
  ask(c, 'È diabetico?', 'history');
  ask(c, 'Mi dà saturazione e pressione?', 'measurement_unknown');
  ask(c, 'Il ragazzo sta male anche lui?', 'people', /non e lui|non è lui/);
  c.eventFired = true;
  ask(c, 'È ancora sveglio?', 'response', /meno di prima/);
}
{
  const c = make('warehouse');
  ask(c, 'Sono armati di pistola?', 'weapons', /non riesco a identificarlo/);
  ask(c, 'Come sono vestiti?', 'people', /giacca/);
  ask(c, 'Hai preso la targa?', 'vehicle', /girata/);
  ask(c, 'Da quanti minuti sono dentro?', 'time');
  ask(c, 'Quanto è alto quello con la giacca?', 'description_unknown');
  c.eventFired = true;
  ask(c, 'Sono ancora tutti dentro?', 'people', /uscita/);
}
{
  const c = make('flood');
  ask(c, 'C’è un passeggero ferito?', 'people', /da solo/);
  ask(c, 'L’acqua continua a salire?', 'situation', /salire/);
  c.topics.people.reply = 'Il conducente è fuori, ma il passeggero è ancora nell’auto. Da qui vedo che muove un braccio.';
  c.topics.people.fact = 'Un passeggero ancora nel veicolo; conducente fuori.';
  c.topics.injuries.reply = 'Il conducente dice di stare bene. Il passeggero non lo sento da qui, non so come stia.';
  c.topics.injuries.fact = 'Condizioni del passeggero non verificabili.';
  ask(c, 'Il passeggero è cosciente?', 'injuries', /non posso confermarle/i);
}
{
  const c = make('lift');
  ask(c, 'Come sta il signore?', 'symptoms', /dice di stare bene/);
  c.topics.people.fact = 'Una persona in cabina; nessun contatto esterno.';
  c.topics.people.reply = 'Sono sola.';
  ask(c, 'E lui, sta male?', 'people', /sola/);
}
{
  const c = make('conflict');
  ask(c, 'Il bambino è ferito?', 'people', /non posso vederlo/);
  ask(c, 'La donna risponde quando la chiami?', 'response_unknown');
  c.eventFired = true;
  ask(c, 'Cosa sta succedendo?', 'situation', /silenzio/);
  ask(c, 'La donna sta ancora gridando e litigando con lui?', 'situation', /silenzio/);
}
{
  const c = make('lost');
  ask(c, 'Sua figlia come si chiama?', 'contact', /Anna/);
  ask(c, 'Come si chiama lei?', 'identity', /Roberto/);
  ask(c, 'Sei un idiota', 'distress');
  ask(c, 'La ascolto, una domanda alla volta.', 'rapport');
  ask(c, 'Non si allontani, rimanga in linea.', 'instruction_ack');
  ask(c, 'Tra quanto arriva la polizia?', 'services', /non so quanto/);
  ask(c, 'Dove sei?', 'location');
  ask(c, 'Non ho capito', 'confirm');
}
{
  const c = make('fire');
  ask(c, 'Come sta sua madre?', 'symptoms');
  c.history.push({role: 'operatore', text: 'E lui?'});
  ask(c, 'E lui?', 'child_condition');
  ask(c, 'Dove si trova, quante persone siete?', 'location+people');
}
{
  const c = make('lift');
  c.eventFired = true;
  ask(c, 'C’è fumo o la luce lampeggia ancora?', 'hazards', /luce adesso è stabile/);
}
{
  const c = make('collision');
  ask(c, 'Riesce a prendere aria?', 'breathing', /riflesso/);
  ask(c, 'Perché?', 'reason', /vetro.*torace/);
  ask(c, 'Non ho capito', 'breathing', /riflesso|torace/);
  ask(c, 'Perché non risponde?', 'reason', /causa non la conosco/i);
  ask(c, 'C’è altra gente coinvolta?', 'people');
}
{
  const c = make('warehouse');
  ask(c, 'Hai letto la targa?', 'vehicle');
  ask(c, 'Come fai a saperlo?', 'reason', /rivolta dall’altra parte/);
  ask(c, 'Come sono vestiti?', 'people');
  ask(c, 'Perché non li puoi identificare?', 'reason', /volti.*lontani/);
  const summary = ask(c, 'Facciamo il punto, mi riepiloga quello che ha detto?', 'summary');
  assert(summary.facts.every(f => ['vehicle', 'people'].includes(f.key)));
  assert(!summary.reply.includes('42'), 'summary must not reveal an unasked exact address');
}
{
  const c = make('conflict');
  ask(c, 'Quali voci ha sentito?', 'situation');
  ask(c, 'E lui?', 'clarify_subject', /uomo.*bambino/);
  ask(c, 'Intendo il bambino', 'people', /bambino/);
}
for (const s of scenarios) {
  const c = make(s.key), before = JSON.stringify(c), records = ai.catalog(c);
  assert.equal(JSON.stringify(c), before);
  for (const key of ['location', 'confirm', 'identity', 'time', 'update', ...Object.keys(c.topics)]) {
    const record = records.find(r => r.key === key);
    assert(record && typeof record.reply === 'string' && typeof record.fact === 'string' && record.label, `missing catalog ${s.key}/${key}`);
    const answer = ai.answerTopics(c, [key], '');
    assert(answer.reply && Array.isArray(answer.facts), `missing semantic answer ${s.key}/${key}`);
  }
  assert.equal(ai.answerTopics(c, ['time']).facts.length, 0, 'unknown time must not create a fabricated timestamp');
  assert.equal(ai.answerTopics(c, ['update']).facts.length, 0, 'no event means no update fact');
  records[0].reply = 'external mutation';
  assert.notEqual(ai.catalog(c)[0].reply, 'external mutation');
  c.eventFired = true;
  const update = ai.catalog(c).find(r => r.key === 'update');
  assert.equal(update.reply, c.event.text);
  assert.equal(update.fact, c.event.fact);
  assert.equal(ai.answerTopics(c, ['update']).facts[0].text, c.event.fact);
  checks++;
}
{
  const c = make('fire');
  ask(c, 'Come sta sua madre?', 'symptoms');
  c.history.push({role: 'operatore', text: 'E lui?'});
  assert.equal(ai.answerTopics(c, ['symptoms'], 'E lui?').intent, 'child_condition');
  assert.equal(ai.answerTopics(c, ['symptoms'], 'Mio figlio respira?').facts.length, 0);
  assert.equal(ai.answerTopics(c, ['symptoms'], 'È in arresto cardiaco?').intent, 'diagnosis');
  const exact = ai.answerTopics(c, ['confirm', 'people'], 'Il punto preciso e quante persone?');
  assert(exact.facts.some(f => f.key === 'confirm') && exact.facts.some(f => f.key === 'people'));
  assert(!ai.answerTopics(c, ['not-a-key'], 'Quanti anni ha?').facts.some(f => f.key === 'not-a-key'));
  checks++;
}
{
  const c = make('warehouse');
  c.eventFired = true;
  const people = ai.catalog(c).find(r => r.key === 'people');
  assert.match(people.reply, /uscita/);
  assert.match(people.fact, /uscita/);
  checks++;
}
{
  const c = make('park');
  const replies = [ask(c, 'Ok').reply, ask(c, 'Ok').reply, ask(c, 'Ok').reply];
  assert.equal(new Set(replies).size, 3, 'acknowledgements should not all be identical');
}
{
  const c = make('flood');
  const question = 'Quello che guidava è riuscito ad abbandonare l’abitacolo?';
  const fallback = ask(c, question, 'people', /Il conducente è uscito ed è qui con me/);
  const semantic = ai.answerTopics(make('flood'), ['people'], question);
  assert(!/^(?:No|Sì)[,. ]/.test(fallback.reply));
  assert.equal(semantic.reply, fallback.reply);
  const opposite = ai.answerTopics(make('flood'), ['people'], 'Il conducente è ancora dentro?');
  assert.equal(opposite.reply, semantic.reply, 'opposite question polarity must preserve the same observation');
  assert.deepEqual(opposite.facts, semantic.facts);
  c.topics.people.reply = 'Il conducente è fuori, ma il passeggero è ancora nell’auto. Da qui vedo che muove un braccio.';
  c.topics.people.fact = 'Un passeggero ancora nel veicolo; conducente fuori.';
  assert.match(ai.answerTopics(c, ['people'], question).reply, /passeggero è ancora/);
  checks++;
}
{
  const pairs = [['park','people','Sta male solo il signore?'],['lift','people','C’è un’altra persona con lei?'],['warehouse','safety','Lei è nel capannone di fronte?'],['lost','people','Era uscito da solo?'],['collision','breathing','Quindi non può verificare il respiro?']];
  for(const [key, field, text] of pairs){
    const c=make(key), result=ai.answerTopics(c,[field],text);
    assert(!/^(?:No|Sì)\s*[,.;]/.test(result.reply), `${key}/${field}: inherited yes/no`);
    assert(result.facts.some(f=>f.key===field));
    checks++;
  }
  for(const s of scenarios) for(const item of ai.catalog(make(s.key))) if(s.topics[item.key]) assert(!/^(?:No|Sì)\s*[,.;]/.test(item.reply), `catalog inherited polarity ${s.key}/${item.key}`);
}
{
  const c=make('warehouse');
  assert.notEqual(ask(c,'Mi chiarisce entrambi gli aspetti?').intent,'instruction_ack');
  assert.notEqual(ask(c,'Quali aspetti della situazione riesce a vedere?').intent,'instruction_ack');
  assert.notEqual(ask(c,'Ci sono resti sulla strada?').intent,'instruction_ack');
  ask(c,'Aspetti un momento.','instruction_ack');
  ask(c,'Aspetta.','instruction_ack');
  ask(c,'Per favore, aspetti in linea.','instruction_ack');
  ask(c,'Non si allontani, rimanga in linea.','instruction_ack');
}
console.log(`PASS ${checks} conversation checks: scenario grounding, semantic catalog/API, progressive summaries, causal follow-ups, referents, unknown facts, event consistency and polarity-independent observations.`);
