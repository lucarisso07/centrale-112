/* Radio operativa locale. Nessuna chiamata di rete e nessuna mutazione di unità o casi.
 * Le proposte di comando sono applicate e convalidate dalla simulazione principale.
 */
(function (global) {
  'use strict';
  const norm = value => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[’‘]/g, "'").replace(/[^a-z0-9#'\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const phaseOf = u => ({patrol:'Pattugliamento', available:'Disponibile', enroute:'In viaggio', onscene:'Sul posto', returning:'Rientro', hold:'In attesa'})[u.phase] || u.phase || 'Disponibile';
  const callSign = u => u.callSign || u.name || u.id || 'Unità';
  const sameId = (a,b) => a != null && b != null && String(a) === String(b);
  const caseOf = (u,ctx) => (ctx.cases || []).find(c => sameId(c.id, u.target));
  const padCase = c => '#' + String(c.id).padStart(3, '0');
  const known = c => c && c.facts && typeof c.facts === 'object' ? c.facts : {};
  const hasPosition = c => !!(c && (c.confirmed || known(c).confirm));
  const finite = v => typeof v === 'number' && Number.isFinite(v);
  const duration = seconds => {
    if (!finite(seconds) || seconds < 0) return 'non ancora calcolato';
    const n = Math.ceil(seconds);
    return n < 60 ? n + ' secondi' : Math.floor(n / 60) + ' min' + (n % 60 ? ' ' + n % 60 + ' s' : '');
  };
  const etaOf = u => finite(u.eta) ? u.eta : finite(u.left) ? u.left : null;
  const locationOf = u => u.street || u.roadName || u.locationName || u.positionLabel || (finite(u.x) && finite(u.y) ? 'settore ' + String.fromCharCode(65 + Math.max(0, Math.min(7, Math.floor(u.x / 225)))) + String(Math.max(1, Math.min(6, Math.floor(u.y / 200) + 1))) : 'posizione non disponibile');
  const listFacts = (c,keys,limit=3) => {
    const fs = known(c), out = [];
    for (const key of keys) {
      const value = fs[key];
      const text = typeof value === 'string' ? value : value && typeof value.text === 'string' ? value.text : null;
      if (text && !out.includes(text)) out.push(text);
      if (out.length >= limit) break;
    }
    return out;
  };
  function briefFacts(c, keys) {
    const fs = listFacts(c, keys);
    if (!fs.length) return 'Su questo punto non sono ancora registrati riscontri. Specificare quale informazione va verificata.';
    return (c.source === 'patrol' ? 'Nella segnalazione della pattuglia: ' : 'Dalla scheda ricevuta: ') + fs.join(' ');
  }
  const personWords = /\b(?:conducent\w*|autista|guidator\w*|passegger\w*|occupant\w*|person[ae]|ferit\w*|pazient\w*|chiamant\w*|uomo|donna|bambin\w*|sospett\w*|aggressor\w*)\b/;
  const whereWords = /\b(?:dove|dov'e|posizione|localizzazione|si trova|si trovano|marciapiede|dentro|fuori|in auto|nel veicolo)\b/;
  const roadWords = /\b(?:traffico|viabilita|blocc\w*|ostacol\w*|coda|code|percorso|deviazion\w*|strade|ponte|velocita|sirena|lampeggianti|percorribil\w*|transitabil\w*|corsia|corsie|carreggiat\w*|circolazion\w*|passaggio|passare|accesso|raggiungervi)\b/;
  function personPosition(c, request) {
    if (!c) return 'Non abbiamo un evento assegnato a cui riferire la posizione della persona.';
    const subject=/conducente|autista|guidator/.test(request)?/conducent|autista|guidator/:
      /passegger/.test(request)?/passegger|occupant/:
      /bambin/.test(request)?/bambin|figlio|figlia|minore/:
      /sospett|aggressor/.test(request)?/sospett|aggressor|sagom/:
      /chiamant/.test(request)?/chiamant/:
      /pazient|ferit/.test(request)?/pazient|ferit|person|conducent/:
      personWords;
    const positional=/\b(?:sul|sulla|sui|su un|su una|nel|nella|nell'|in auto|in cabina|in appartamento|dentro|fuori|accanto|vicino|marciapied\w*|sentiero|pianerottolo|cabina)\b/;
    const matches=listFacts(c,['people','safety','vehicle','situation','update'],5).filter(f=>subject.test(norm(f))&&positional.test(norm(f)));
    if (!matches.length) return 'La posizione della persona indicata non è ancora verificata nei riscontri disponibili.';
    return (c.source==='patrol'?'Dalla pattuglia: ':'Dalla segnalazione: ')+matches[0];
  }
  function status(u,ctx) {
    const p=phaseOf(u), c=caseOf(u,ctx);
    if (p === 'Pattugliamento') return 'In pattugliamento a ' + locationOf(u) + '. Disponibili per un intervento.';
    if (p === 'Disponibile') return 'Operativi e disponibili a ' + locationOf(u) + '.';
    if (p === 'In viaggio') return 'In avvicinamento' + (c ? ' all’evento ' + padCase(c) : '') + ', tempo residuo stimato ' + duration(etaOf(u)) + '. Stima soggetta alla viabilità.';
    if (p === 'Sul posto') return 'Sul posto' + (c ? ', evento ' + padCase(c) + ', ' + c.address : '') + '. Attività in corso; unità impegnata.';
    if (p === 'Rientro') return 'In rientro alla sede. Tempo residuo stimato ' + duration(etaOf(u)) + '.';
    if (p === 'In attesa') return 'Fermi in attesa di disposizioni a ' + locationOf(u) + (c ? ', assegnazione all’evento ' + padCase(c) + ' mantenuta.' : '.');
    return 'Stato comunicato dal terminale: ' + p + '.';
  }
  function suggestions(u,ctx={}) {
    const c=caseOf(u,ctx), selected=(ctx.cases||[]).find(v=>sameId(v.id,ctx.selectedCaseId));
    const p=phaseOf(u), common=['Comunicate posizione e stato','Composizione equipaggio?'];
    if (p==='In viaggio') return ['Quanto manca all’arrivo?', 'Com’è la viabilità?', 'Quali unità sono in supporto?', 'Fermati e attendi'];
    if (p==='Sul posto') return ['Aggiornamento dal posto', 'Ci sono persone ferite?', 'Quali rinforzi risultano assegnati?', 'Richiedi rinforzi'];
    if (p==='In attesa') return ['Qual è il vostro stato?', c ? 'Intervieni al caso ' + c.id : 'Riprendi pattugliamento', 'Rientra alla base'];
    if (selected && !selected.done && hasPosition(selected)) common.push('Intervieni al caso ' + selected.id);
    else common.push('Avete segnalazioni dal territorio?');
    return common.concat('Riprendi pattugliamento').slice(0,4);
  }
  function resolveCase(text,u,ctx,allowSelected) {
    const n=norm(text), ids=[...n.matchAll(/(?:caso|evento|intervento|segnalazione)\s*(?:n(?:umero)?\s*)?#?\s*0*(\d+)\b/g)].map(m=>m[1]);
    for (const match of n.matchAll(/#\s*0*(\d+)\b/g)) if (!ids.includes(match[1])) ids.push(match[1]);
    if (new Set(ids).size>1) return {error:'Ricevuti più eventi. Indicare un solo numero di caso per questa unità.'};
    if (ids.length) {
      const c=(ctx.cases||[]).find(v=>Number(v.id)===Number(ids[0]));
      return c ? {c} : {error:'L’evento #' + ids[0] + ' non risulta in centrale. Indicare il numero della scheda aperta.'};
    }
    if (/\b(quel|questo|selezionato|attuale)\b/.test(n) && allowSelected) {
      const c=(ctx.cases||[]).find(v=>sameId(v.id,ctx.selectedCaseId));
      return c ? {c} : {error:'Nessun evento selezionato. Indicare il numero di caso.'};
    }
    if (/\b(stesso|vostro|vostra|sul posto|in posto)\b/.test(n)) {
      const c=caseOf(u,ctx); if(c) return {c};
    }
    return {error:'Indicare il numero dell’evento, per esempio «Intervieni al caso 2».'};
  }
  function commandFor(u,text,ctx) {
    let n=norm(text), sign=norm(callSign(u)), uid=norm(u.id);
    if (sign && n.startsWith(sign+' ')) n=n.slice(sign.length).trim();
    else if (uid && n.startsWith(uid+' ')) n=n.slice(uid.length).trim();
    n=n.replace(/^(?:centrale a |per favore |per cortesia |ricevuto |ok |bene )+/, '').trim();
    const commandWords=/\b(vai|andate|recati|recatevi|intervieni|intervenite|invia|inviate|dirigiti|dirigetevi|raggiungi|raggiungete|rientra|rientrate|torna|tornate|riprendi|riprendete|pattuglia|pattugliate|fermati|fermatevi|attendi|attendete|richiedi|richiedete)\b/;
    // Interrogative advice, reported orders and negations never dispatch a unit.
    if (commandWords.test(n) && (/\b(non|evita|evitate|annulla|annullate|mai)\b/.test(n) || /^(?:devo|dovrei|dovreste|dovete|posso|se |quando |perche |chi |come |hai detto|avete detto|mi ha detto)\b/.test(n))) {
      return {intent:'clarification',reply:'Nessuna nuova disposizione applicata. ' + status(u,ctx) + ' Per modificare il servizio impartire un ordine esplicito.'};
    }
    // A direct request may use a polite question: "Potete rientrare alla base?".
    n=n.replace(/^(?:puoi|potete|puo|potresti|potreste)\s+/, '').replace(/^per favore\s+/, '');
    const orderGroups = [
      /\b(?:rientra(?:re|te)?|torna(?:re|te)?)\b/,
      /\b(?:riprendi|riprendete|riprendere|pattuglia(?:re|te)?)\b/,
      /\b(?:fermati|fermatevi|attendi|attendete|attendere)\b/,
      /\b(?:vai|andate|andare|recati|recatevi|intervieni|intervenite|intervenire|dirigiti|dirigetevi|raggiungi|raggiungete)\b/
    ].filter(pattern=>pattern.test(n));
    if (orderGroups.length>1) return {intent:'clarification',reply:'La comunicazione contiene più disposizioni diverse. Confermare un solo incarico alla volta per questa unità.'};
    if (/^(?:rientra(?:re|te)?|torna(?:re|te)?)\b/.test(n)) return {intent:'return',command:{type:'return'},reply:'Ricevuta richiesta di rientro alla sede. Attendo conferma dal terminale operativo.'};
    if (/^(?:(?:riprendi|riprendete|riprendere|riprendiamo|inizia|iniziate)\s+(?:il\s+)?pattugliamento|pattuglia(?:re|te)?\b)/.test(n)) return {intent:'patrol',command:{type:'patrol'},reply:'Ricevuta disposizione di pattugliamento. Il percorso verrà aggiornato dal terminale.'};
    if (/^(?:fermati|fermatevi|fermarvi|attendi|attendete|attendere|resta(?:te)?\s+in attesa)\b/.test(n)) return {intent:'hold',command:{type:'hold'},reply:'Ricevuta disposizione di attesa. Conferma della fermata sul terminale operativo.'};
    if (/^(?:(?:richiedi|richiedete|richiedere|chiama|chiamate|chiamare|invia|inviate|inviare)\s+(?:(?:un|una|dei|i|le|il)\s+)?(?:rinforz\w*|supporto|ambulanz\w*|sanitari|soccorso sanitario|pattugli\w*|polizia|vigili del fuoco))/.test(n)) {
      const hasId=/(caso|evento|intervento|segnalazione|#)\s*#?\s*\d/.test(n);
      const resolved=hasId ? resolveCase(n,u,ctx,true) : {c:caseOf(u,ctx)};
      if (!resolved.c) return {intent:'clarification',reply:resolved.error || 'Non risultiamo assegnati a un evento. Indicare il caso per cui richiedere supporto.'};
      if (resolved.c.done) return {intent:'clarification',reply:'L’evento ' + padCase(resolved.c) + ' risulta concluso. Per una nuova esigenza aprire una segnalazione.'};
      const service=/ambulanz|sanitari|medic/.test(n)?'Sanitario':/vigili|pompier|antincendio/.test(n)?'Vigili del fuoco':/polizia|pattugli/.test(n)?'Polizia':undefined;
      return {intent:'support_request',command:{type:'support',caseId:resolved.c.id,...(service?{service}:{})},reply:'Richiesta di ' + (service || 'rinforzi') + ' per l’evento ' + padCase(resolved.c) + ' ricevuta. La disponibilità deve essere confermata dalla centrale.'};
    }
    if (/^(?:vai|andate|andare|recati|recatevi|recarvi|intervieni|intervenite|intervenire|invia|inviate|inviare|dirigiti|dirigetevi|dirigervi|raggiungi|raggiungete|raggiungere)\b/.test(n)) {
      const resolved=resolveCase(n,u,ctx,true);
      if (!resolved.c) return {intent:'clarification',reply:resolved.error};
      const c=resolved.c;
      if (c.done) return {intent:'clarification',reply:'L’evento ' + padCase(c) + ' è già concluso. Nessun invio richiesto.'};
      if (!hasPosition(c)) return {intent:'clarification',reply:'Per l’evento ' + padCase(c) + ' manca una localizzazione confermata. Verificare l’indirizzo prima dell’invio.'};
      return {intent:'dispatch',command:{type:'dispatch',caseId:c.id},reply:'Ricevuto evento ' + padCase(c) + ', ' + c.address + '. Richiesta di assegnazione trasmessa al terminale.'};
    }
    return null;
  }
  function respondGrounded(unit,text,context={}) {
    if (!unit) return {intent:'clarification',reply:'Selezionare un’unità per aprire il collegamento radio.',facts:[],suggestions:[]};
    const n=norm(text), prefix=callSign(unit) + ' a centrale. ', c=caseOf(unit,context), p=phaseOf(unit);
    const finish = result => ({...result,reply:prefix+result.reply,facts:result.facts||[],suggestions:suggestions(unit,context)});
    if (!n) return finish({intent:'clarification',reply:'In ascolto. Specificare la richiesta.'});
    const command=commandFor(unit,text,context); if(command) return finish(command);
    if (/\b(siete|sei|state|stai|avete|hai)\b.*\b(rientrando|tornando|andando|intervenendo|pattugliando|fermi|fermo)\b/.test(n)) return finish({intent:'status',reply:status(unit,context)});
    const replies=[], intents=[];
    const add=(intent,reply)=>{if(!intents.includes(intent)){intents.push(intent);replies.push(reply);}};
    // Resolve the subject within each question: the driver's position is not the unit's GPS.
    const clauses=String(text).split(/[?!;.\n]+/).map(norm).filter(Boolean);
    const personLocations=clauses.filter(part=>whereWords.test(part)&&personWords.test(part));
    const explicitUnitLocation=/\b(?:dove siete|dove vi trovate|dove sei|dove ti trovi|vostra posizione|vostre coordinate|posizione della pattuglia|posizione dell'equipaggio|in che (?:via|strada) siete)\b/.test(n);
    const genericUnitLocation=clauses.some(part=>/\b(?:dove|dov'e|posizione|localizzazione|coordinate|settore|zona)\b/.test(part)&&!personWords.test(part)&&!roadWords.test(part));
    if (explicitUnitLocation||genericUnitLocation) add('position','Ci troviamo in ' + locationOf(unit) + (c && p==='Sul posto'?', presso '+c.address:'') + '.');
    if(personLocations.length) add('person_position',personPosition(c,personLocations.join(' ')));
    if (/\b(eta|quanto manca|quanto tempo|tempi|arrivate|arrivi|arrivo|distanza)\b/.test(n)) {
      if (p==='Sul posto') add('eta','Siamo già sul posto. L’ora di arrivo è registrata sulla scheda dell’evento.');
      else if(p==='In viaggio'||p==='Rientro') add('eta','Tempo residuo sul percorso ' + duration(etaOf(unit)) + (p==='Rientro'?' per la sede':' per l’evento') + '. È una stima della simulazione, aggiornata con il traffico.');
      else add('eta','Al momento non è in corso un avvicinamento a un evento. ' + (p==='In attesa'?'Siamo in attesa di disposizioni.':'Serve prima una destinazione.'));
    }
    if (/\b(stato|situazione operativa|disponibilita|disponibili|operativi|occupati|liberi|libero|impegnati|cosa fate|che fate|come siete messi)\b/.test(n)) add('status',status(unit,context));
    if (/\b(equipaggio|operatori|agenti|quanti siete|composizione|nomi|a bordo|personale)\b/.test(n)) {
      const crew=unit.crew;
      const detail=Array.isArray(crew)?crew.map(v=>typeof v==='string'?v:v.role||v.name||'operatore').join(', '):typeof crew==='string'||typeof crew==='number'?String(crew):null;
      add('crew',detail?'A bordo: '+detail+'. Servizio '+unit.type+'.':'Servizio '+unit.type+'. Il numero e i nominativi dell’equipaggio non sono specificati nella scheda di questa unità.');
    }
    if (roadWords.test(n)) {
      const report=unit.trafficNote||unit.roadblockNote;
      const sceneFacts=c?listFacts(c,['update','access','hazards','situation'],4).filter(f=>roadWords.test(norm(f))):[];
      const roadDetail=sceneFacts.length?'Per la viabilità sul luogo dell’evento: '+sceneFacts.join(' '):'';
      add('traffic',[report?String(report):'',roadDetail].filter(Boolean).join(' ') ||
        (/percorribil|transitabil|corsia|corsie|carreggiat|passaggio|passare|accesso/.test(n)?'La percorribilità e le corsie libere non sono ancora verificate nei dati disponibili.':
          p==='In viaggio'?'Seguiamo il percorso stradale assegnato. Al momento non abbiamo altri ostacoli da segnalare. Vi aggiorniamo durante il tragitto.':'Nessuna criticità viaria aggiuntiva registrata per la nostra unità. Posizione corrente: '+locationOf(unit)+'.'));
    }
    if (/\b(supporto|rinforzi|altre unita|altri mezzi|chi arriva|chi viene|chi avete|risorse|ambulanza|vigili del fuoco)\b/.test(n)) {
      if(!c) add('support','Non abbiamo un evento assegnato. Per verificare i rinforzi serve prima il numero dell’evento.');
      else {
        const others=(context.units||[]).filter(u=>u.id!==unit.id&&sameId(u.target,c.id)&&['In viaggio','Sul posto','In attesa'].includes(phaseOf(u)));
        const resources=others.length ? others.map(u=>callSign(u)+' — '+phaseOf(u)+(phaseOf(u)==='In viaggio'?' ('+duration(etaOf(u))+')':'')).join('; ')+'.' : 'Nessun’altra unità risulta attualmente assegnata a questo evento.';
        const missing=(c.need||[]).filter(s=>s!==unit.type && !others.some(u=>u.type===s)&&!(c.completed||[]).includes(s));
        add('support',resources+(missing.length?' Servizi previsti ancora senza unità: '+missing.join(', ')+'.':''));
      }
    }
    if (/\b(ferit|persone|persona|occupanti|bambin|vittim|pazient|coscient|respir|respiro|fiato|sangu|malessere|condizioni|come sta|come stanno)\w*/.test(n)) {
      const groups=[];
      if(/respir|respiro|fiato/.test(n))groups.push({keys:['breathing'],unknown:'Respiro non ancora verificato nei riscontri disponibili.'});
      if(/coscient|conoscenza|rispond/.test(n))groups.push({keys:['response'],unknown:'Risposta alla voce non ancora verificata nei riscontri disponibili.'});
      if(/ferit|sangu|traum/.test(n))groups.push({keys:['injuries'],unknown:'Presenza di ferite o traumi non ancora verificata nei riscontri disponibili.'});
      if(/\b(?:quante|quanti|numero|altre persone|altri occupanti|sono soli|e solo)\b/.test(n))groups.push({keys:['people'],unknown:'Numero delle persone non ancora verificato nei riscontri disponibili.'});
      if(/malessere|condizioni|come sta|come stanno/.test(n))groups.push({keys:['injuries','symptoms','response'],unknown:'Condizioni della persona non ancora verificate nei riscontri disponibili.'});
      if(!groups.length&&!personLocations.length)groups.push({keys:['people'],unknown:'Informazioni sulle persone non ancora verificate nei riscontri disponibili.'});
      if(groups.length){
        const emitted=new Set(),answers=[];
        for(const group of groups){const values=listFacts(c,group.keys);if(!values.length){answers.push(group.unknown);continue;}const fresh=values.filter(value=>!emitted.has(value));fresh.forEach(value=>emitted.add(value));if(fresh.length)answers.push((c?.source==='patrol'?'Nella segnalazione della pattuglia: ':'Dalla scheda ricevuta: ')+fresh.join(' '));}
        add('persons',c ? (p!=='Sul posto'?'Non siamo sul posto; non possiamo fornire osservazioni dirette. ':'')+[...new Set(answers)].join(' ') : 'Non risultano persone coinvolte in un evento assegnato a questa unità. Specificare la segnalazione.');
      }
    }
    if (/\b(armi|armato|armati|pistola|coltello|sospett|aggressor|minacc|pericolo|rischio|sicurezza)\w*/.test(n)) add('safety',c ? briefFacts(c,['weapons','hazards','safety','update']) : 'Nessuna situazione di pericolo registrata nel nostro incarico attuale. Specificare un evento.');
    if (/\b(fumo|fiamme|incendio|brucia|bruciato)\b/.test(n)) add('smoke',c?briefFacts(c,['smoke','hazards','situation']):'Non abbiamo una segnalazione assegnata su fumo o fiamme. Specificare l’evento.');
    if (/\b(targa|furgone|veicolo|macchina|auto rubata|modello|colore)\b/.test(n)) add('vehicle',c ? briefFacts(c,['vehicle','people','situation']) : 'Non abbiamo un veicolo segnalato su una scheda assegnata. Indicare l’evento.');
    if (/\b(segnalazion|territorio|notato|rilevato|avvistat|novita|anomalie)\w*/.test(n) && !c) {
      const report=unit.lastReportText;
      add('territory',report ? 'Ultima segnalazione inviata: '+report : 'Al momento nessuna nuova segnalazione registrata dalla nostra unità. Le osservazioni del pattugliamento saranno trasmesse appena disponibili.');
    }
    if (/\b(situazione|aggiorn|rapporto|resoconto|posto|scena|cosa ved|cosa e successo|che succede|riscontro|esito|verificat)\w*/.test(n) && !intents.some(v=>['persons','safety','vehicle'].includes(v))) {
      if(!c) add('scene',status(unit,context)+' Nessun intervento attualmente assegnato.');
      else if(c.sceneSummary) add('scene',String(c.sceneSummary));
      else add('scene',(p==='Sul posto'?'Attività in corso sull’evento '+padCase(c)+'. ':p==='In viaggio'?'Siamo ancora in avvicinamento; nessun riscontro diretto dal posto. ':'Evento '+padCase(c)+'. ')+briefFacts(c,['update','situation','people','hazards']));
    }
    if (/\b(chiuso|concluso|finito|terminato|risolto|esito)\b/.test(n)) add('completion',c ? c.done?'L’evento '+padCase(c)+' risulta concluso in centrale.':(c.completed||[]).includes(unit.type)?'Il nostro servizio risulta completato. La scheda resta aperta per gli altri servizi.':'Attività non ancora conclusa. L’esito verrà registrato alla fine dell’intervento.' : 'Non abbiamo un evento attivo assegnato.');
    if (/\b(meteo|pioggia|nevica|nevicando|visibilita|tempo atmosferico)\b/.test(n)) add('weather',context.weather ? 'Condizioni riportate dalla centrale: '+context.weather+'.' : 'Il terminale non contiene un bollettino meteo. Possiamo riferire solo le criticità effettivamente registrate sulla viabilità.');
    if (/\b(capit[oia]|ricevuto|grazie|va bene|perfetto|buon lavoro|ok|passo|chiudo)\b/.test(n)&&!replies.length) add('acknowledgement','Ricevuto, centrale. Restiamo in ascolto sul canale operativo.');
    if (/\b(prova radio|mi sentite|mi senti|ricevete|ricevi|in ascolto|ci siete|ci sei|pronto|buonasera|buongiorno|ciao|come va|tutto bene)\b/.test(n)&&!replies.length) add('radio_check','Collegamento ricevuto. '+status(unit,context));
    if (replies.length) return finish({intent:intents.join('+'),reply:replies.join(' ')});
    if (/\b(devo|dovrei|posso|dobbiamo|dovete|potete)\b/.test(n)) return finish({intent:'clarification',reply:'Richiesta ricevuta come domanda, nessun cambio d’incarico. '+status(unit,context)+' Specificare se serve un aggiornamento oppure una nuova disposizione.'});
    return finish({intent:'clarification',reply:'Centrale, il dettaglio richiesto non è presente nei dati del nostro intervento. Potete precisare se riguarda persone, posizione, viabilità o risorse? '+(c?'Riferimento attuale: evento '+padCase(c)+'.':'Siamo disponibili per una nuova assegnazione.')});
  }
  function respond(unit,text,context={}) {
    const initial=respondGrounded(unit,text,context);
    if(!unit||initial.command)return initial;
    const c=caseOf(unit,context),p=phaseOf(unit);
    const reporter=c?.source==='patrol'&&sameId(c.reporterUnitId,unit.id);
    if(!c||(p!=='Sul posto'&&!reporter))return initial;
    const n=norm(text),requested=new Set();
    const addKeys=keys=>keys.forEach(key=>requested.add(key));
    for(const intent of initial.intent.split('+')){
      if(intent==='person_position')addKeys(['people','safety','vehicle','situation']);
      if(intent==='traffic')addKeys(['access','hazards','situation']);
      if(intent==='scene')addKeys(['situation','people','hazards']);
      if(intent==='safety')addKeys(['weapons','hazards','safety']);
      if(intent==='smoke')addKeys(['smoke','hazards','situation']);
      if(intent==='vehicle')addKeys(['vehicle','people','situation']);
      if(intent==='persons'){
        if(/respir|respiro|fiato/.test(n))addKeys(['breathing']);
        if(/coscient|conoscenza|rispond/.test(n))addKeys(['response']);
        if(/ferit|sangu|traum/.test(n))addKeys(['injuries']);
        if(/malessere|condizioni|come sta|come stanno/.test(n))addKeys(['injuries','symptoms','response']);
        if(/\b(?:quante|quanti|numero|altre persone|altri occupanti|sono soli|e solo)\b/.test(n))addKeys(['people']);
        if(!requested.size)addKeys(['people']);
      }
    }
    const changed=c.eventFired?({collision:['hazards'],fire:['situation'],park:['response'],warehouse:['people','situation'],flood:['situation'],lift:['alarm','access'],conflict:['situation'],lost:['safety'],patrol_van:['situation','hazards'],patrol_smoke:['situation','smoke'],patrol_help:['symptoms']}[c.key]||[]):[];
    const observed=[],facts={...known(c)};
    const sourceLabel=callSign(unit)+(reporter?' · segnalazione della pattuglia':' · contatto con il segnalante');
    for(const key of requested){
      const value=c.topics?.[key]?.fact;
      if(facts[key]!=null||changed.includes(key)||typeof value!=='string'||!value.trim()||value===c.event?.fact)continue;
      facts[key]=value;observed.push({key,text:value,source:'unit',sourceLabel});
    }
    if(!observed.length)return initial;
    const enriched={...context,cases:(context.cases||[]).map(item=>sameId(item.id,c.id)?{...item,facts}:item)};
    const response=respondGrounded(unit,text,enriched);
    // Only facts literally included in the grounded response can enter the dossier.
    const acquired=observed.filter(f=>response.reply.includes(f.text));
    if(!acquired.length)return initial;
    return {...response,caseId:c.id,facts:acquired,reply:reporter?response.reply:response.reply.replaceAll('Dalla scheda ricevuta:','Dal contatto con il segnalante:').replaceAll('Dalla segnalazione:','Dal contatto con il segnalante:')};
  }
  const topic = (label,question,reply,fact,requires=[]) => ({label,question,reply,fact,requires});
  function makePatrolReport(unit,reportIndex=0,time=0) {
    const sign=callSign(unit), place=locationOf(unit), i=((reportIndex%3)+3)%3;
    const base={source:'patrol',reporterUnitId:unit.id,sourceCallSign:sign,caller:sign,mood:'Comunicazione operativa',stress:15,x:unit.x,y:unit.y,reportedAt:time,urgency:2,
      calm:'Ricevuto, centrale. Manteniamo il collegamento e distinguiamo quanto osservato da quanto ancora da verificare.',
      location:'Siamo a '+place+'. Il punto è trasmesso dalla posizione del nostro terminale.',address:place+' · posizione pattuglia',
      confirm:'Confermo '+place+'. Usare il punto della pattuglia trasmesso sulla mappa.',repeat:'Confermo i dati già trasmessi. Non abbiamo elementi ulteriori su ciò che non abbiamo potuto verificare.'};
    if(i===0) return {...base,key:'patrol_van',title:'Veicolo fermo in carreggiata',need:['Polizia'],
      opening:[sign+' a centrale: durante il passaggio a '+place+' rilevato furgone in avaria, parzialmente in corsia. Il conducente è sul marciapiede. Richiediamo apertura evento per la viabilità.'],
      topics:{
        situation:topic('Situazione osservata','Descrivete il veicolo e la carreggiata.','Furgone bianco fermo vicino all’incrocio, frecce di emergenza attive. Occupa parte della corsia; il traffico rallenta per superarlo.','Furgone fermo parzialmente in corsia; traffico rallentato.'),
        people:topic('Persone presenti','Chi è presente accanto al mezzo?','Un conducente sul marciapiede. Riferisce di viaggiare da solo; altri occupanti non osservati.','Un conducente sul marciapiede; riferisce di essere solo.'),
        injuries:topic('Condizioni riferite','Il conducente riferisce ferite o malessere?','Al primo contatto riferisce di stare bene. Non risultano urti; la causa meccanica non è verificata.','Nessun trauma o malessere riferito; causa dell’avaria non verificata.',['people']),
        hazards:topic('Rischi per la circolazione','Qual è la criticità attuale?','La visibilità è ridotta dal furgone vicino all’incrocio. Alcuni veicoli invadono la corsia opposta per passare.','Visibilità ridotta; manovre sulla corsia opposta.'),
        vehicle:topic('Descrizione del mezzo','Avete elementi identificativi del mezzo?','Furgone bianco. La targa non è ancora stata acquisita nella scheda; nessun altro elemento identificativo confermato.','Furgone bianco; targa non acquisita.'),
        safety:topic('Posizione della pattuglia','Dove si trova il vostro equipaggio?','Abbiamo effettuato la segnalazione dal margine della carreggiata. Il conducente rimane sul marciapiede.','Equipaggio al margine della strada; conducente sul marciapiede.'),
        access:topic('Accesso all’evento','Da dove possono raggiungervi gli altri mezzi?','Usare il punto del terminale sulla mappa. Una corsia è ancora transitabile, ma il passaggio è rallentato.','Punto del terminale; una corsia transitabile.',['location'])},
      event:{after:145,text:sign+' a centrale: la coda si sta allungando a monte dell’incrocio. Il furgone è ancora fermo, nessuna variazione delle condizioni del conducente riferita.',fact:'Coda in aumento; veicolo ancora fermo.'}};
    if(i===1) return {...base,key:'patrol_smoke',title:'Fumo da un contenitore stradale',need:['Polizia','Vigili del fuoco'],
      opening:[sign+' a centrale: a '+place+' osserviamo fumo da un contenitore dei rifiuti, vicino a veicoli parcheggiati. Non vediamo fiamme da questa posizione. Richiediamo verifica dei vigili del fuoco.'],
      topics:{
        situation:topic('Origine apparente','Da dove vedete uscire il fumo?','Dal bordo superiore di un contenitore dei rifiuti. Il materiale all’interno non è visibile; origine e causa non sono accertate.','Fumo da contenitore stradale; origine e causa non accertate.'),
        people:topic('Persone nelle vicinanze','Ci sono persone coinvolte?','Alcuni passanti hanno notato il fumo. Non vediamo persone nell’area immediata del contenitore.','Passanti nelle vicinanze; nessuna persona osservata accanto al contenitore.'),
        smoke:topic('Fiamme visibili','Osservate anche delle fiamme?','Da qui vediamo fumo intermittente. Fiamme non osservate; l’interno del contenitore non è verificabile.','Fumo intermittente; fiamme non osservate.'),
        hazards:topic('Elementi esposti','Che cosa c’è vicino al contenitore?','Due auto parcheggiate e la facciata di un esercizio chiuso. Non sappiamo quali materiali siano presenti nel contenitore.','Due auto e un esercizio vicini; contenuto non conosciuto.'),
        injuries:topic('Persone che chiedono soccorso','Qualcuno riferisce malessere o ferite?','Al momento nessuno ci ha riferito malessere o ferite. Non è una verifica sanitaria delle persone presenti.','Nessun malessere o trauma riferito alla pattuglia.'),
        safety:topic('Posizione equipaggio','Da quale posizione state osservando?','Dal lato opposto della strada. Non abbiamo aperto né spostato il contenitore.','Osservazione dal lato opposto; contenitore non manipolato.'),
        access:topic('Accesso al punto','L’accesso è possibile per il mezzo antincendio?','Il contenitore è sul bordo stradale, raggiungibile dal percorso segnato. I veicoli parcheggiati riducono lo spazio laterale.','Accesso dalla strada; spazio laterale ridotto.',['location'])},
      event:{after:120,text:sign+' a centrale: il fumo dal contenitore ora è più continuo. Non abbiamo nuovi elementi sulla causa. Confermiamo necessità di verifica tecnica.',fact:'Fumo più continuo; causa ancora da verificare.'}};
    return {...base,key:'patrol_help',title:'Richiesta di aiuto alla pattuglia',need:['Polizia','Sanitario'],urgency:2,
      opening:[sign+' a centrale: una persona ci ha fermati a '+place+'. È seduta e riferisce capogiro dopo essersi sentita debole. È in grado di parlarci; richiediamo supporto sanitario.'],
      topics:{
        situation:topic('Come è iniziato','Che cosa vi ha riferito la persona?','Riferisce di essersi sentita debole mentre camminava e di essersi seduta. Non abbiamo assistito all’inizio dell’episodio.','Debolezza e capogiro riferiti; esordio non osservato.'),
        people:topic('Persone coinvolte','Quante persone chiedono assistenza?','Una persona adulta. Riferisce di essere uscita da sola; non abbiamo un accompagnatore sul posto.','Una persona adulta; accompagnatore non presente.'),
        response:topic('Risposta alla voce','Riesce a rispondere alle vostre domande?','Sì, ci dice il proprio nome e risponde alle domande. Non formuliamo valutazioni cliniche.','Persona risponde alla voce.',['people']),
        breathing:topic('Respiro osservato','Che cosa osservate rispetto al respiro?','Sta respirando e riesce a parlarci. Non abbiamo parametri misurati e attendiamo la valutazione sanitaria.','Respiro presente; parametri non misurati.',['response']),
        symptoms:topic('Sintomi riferiti','Che cosa riferisce in questo momento?','Dice che le gira la testa e di sentirsi debole. Non sono ancora raccolte informazioni sanitarie precedenti.','Capogiro e debolezza; storia sanitaria non acquisita.'),
        injuries:topic('Traumi riferiti','Ha riferito di essere caduta o di essersi ferita?','Nega di essere caduta. Non abbiamo assistito ai minuti precedenti e non risultano altre informazioni sul punto.','Caduta negata dalla persona; episodio precedente non osservato.'),
        safety:topic('Posizione attuale','Il punto è esposto al traffico?','La persona è seduta sul marciapiede, a distanza dalla carreggiata. Un componente dell’equipaggio è in contatto con lei.','Persona sul marciapiede; equipaggio in contatto.'),
        access:topic('Punto di incontro','Dove deve arrivare il mezzo sanitario?','Al punto della nostra unità sulla mappa. Siamo visibili dal bordo strada; segnaleremo la posizione all’arrivo.','Accesso al punto della pattuglia.',['location']),
        contact:topic('Persona di riferimento','Avete un contatto familiare?','Non ancora. La persona riferisce di avere il telefono con sé; nessun recapito acquisito nella scheda.','Telefono presente; recapito di riferimento non acquisito.')},
      event:{after:135,text:sign+' a centrale: la persona è ancora seduta e risponde. Riferisce che il capogiro non è passato. Confermate lo stato del supporto sanitario.',fact:'Capogiro ancora riferito; persona continua a rispondere.'}};
  }
  function makeUnexpected(unit,index=0,context={}) {
    const p=phaseOf(unit), c=caseOf(unit,context), sign=callSign(unit), i=((index%3)+3)%3;
    if(p==='In viaggio' && i!==2) return {
      kind:'roadblock',delay:i===0?24:35,
      text:sign+' a centrale: '+(i===0?'rallentamento all’incrocio sul percorso assegnato, passaggio a velocità ridotta.':'un mezzo in manovra restringe la carreggiata sul percorso. Avanzamento temporaneamente rallentato.')+' Aggiorniamo la stima di arrivo.',
      fact:'Rallentamento segnalato dal mezzo in avvicinamento.'
    };
    if(p==='Sul posto' && c && !c.done) {
      const others=(context.units||[]).filter(u=>u.id!==unit.id&&sameId(u.target,c.id)&&['In viaggio','Sul posto'].includes(phaseOf(u)));
      const missing=(c.need||[]).find(service=>service!==unit.type&&!others.some(u=>u.type===service)&&!(c.completed||[]).includes(service));
      if(missing) return {kind:'support',extraNeed:missing,text:sign+' a centrale: sull’evento '+padCase(c)+' non risulta ancora assegnata una risorsa '+missing+'. Confermate disponibilità e invio; manteniamo il nostro incarico sul posto.'};
      return {kind:'update',text:sign+' a centrale: restiamo impegnati sull’evento '+padCase(c)+'. '+(c.sceneSummary||'Le attività del nostro servizio sono ancora in corso. Nessun esito conclusivo da comunicare.')};
    }
    if(p==='In viaggio') return {kind:'update',text:sign+' a centrale: confermiamo l’avvicinamento'+(c?' all’evento '+padCase(c):'')+'. Tempo residuo stimato '+duration(etaOf(unit))+'.'};
    if(p==='Rientro') return {kind:'update',text:sign+' a centrale: in rientro, posizione '+locationOf(unit)+'. Il terminale aggiorna lo stato di disponibilità all’arrivo.'};
    return {kind:'update',text:sign+' a centrale: controllo radio, collegamento operativo. '+status(unit,context)};
  }
  global.RadioEngine=Object.freeze({respond,suggestions,makePatrolReport,makeUnexpected,status,version:'2.0.0-local'});
})(typeof window!=='undefined'?window:globalThis);
