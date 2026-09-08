/* Guida alla chiamata: solo informazioni già acquisite e stato operativo reale.
 * Action protocol: Game[action.method](...(action.args || [])).
 * Example question: { label: 'Chiedi il punto esatto', method: 'send',
 *                     args: ['Mi indica il punto esatto, il comune e il civico?'] }.
 * Non legge need, urgency, topics, address, opening o altre risposte dello scenario.
 */
(function(global){
  'use strict';
  const same=(a,b)=>a!=null&&b!=null&&String(a)===String(b);
  const text=v=>typeof v==='string'?v.trim():v&&typeof v.text==='string'?v.text.trim():'';
  const facts=c=>c&&c.facts&&typeof c.facts==='object'?c.facts:{};
  const read=(c,key)=>text(facts(c)[key]);
  const has=(c,keys)=>keys.some(key=>!!read(c,key));
  const phase=u=>({enroute:'In viaggio',onscene:'Sul posto',hold:'In attesa',available:'Disponibile',patrol:'Pattugliamento',returning:'Rientro'})[u.phase]||u.phase;
  const active=u=>['In viaggio','Sul posto','In attesa'].includes(phase(u));
  const available=u=>['Disponibile','Pattugliamento'].includes(phase(u));
  const sign=u=>u.callSign||u.id||'la squadra';
  const action=(label,method,...args)=>({label,method,...(args.length?{args}:{})});
  function sentence(value){
    // A single recorded fact may have several sentences. Keep every qualification,
    // joining them into one recap sentence without dropping its final uncertainty.
    return text(value).replace(/\s+/g,' ').replace(/[.!?]+(?=\s|$)/g,';').replace(/;\s*$/,'').trim();
  }
  function recap(c){
    const first=read(c,'situation')||read(c,'opening')||read(c,'update')||read(c,'location')||read(c,'confirm');
    const second=['update','people','response','breathing','injuries','symptoms','hazards','safety','access'].map(key=>read(c,key)).find(value=>value&&value!==first);
    if(!first&&!second)return 'Non ci sono ancora informazioni raccolte.';
    return [first,second].filter(Boolean).map(value=>sentence(value)+'.').join(' ');
  }
  function currentCaseAction(c,state,next){
    if(state.caseId!=null&&!same(state.caseId,c.id))return action('Apri questo evento','selectCase',c.id);
    return next;
  }
  function callerAction(c,state,label,question){
    if(state.caseId!=null&&!same(state.caseId,c.id))return action('Apri questa chiamata','selectCase',c.id);
    if(state.tab==='radio')return action('Torna alla chiamata','setTab','call');
    return action(label,'send',question);
  }
  function reporterFor(c,state){
    const units=state.units||[];
    return units.find(u=>same(u.id,c.reporterUnitId)&&(u.target==null||same(u.target,c.id)))||units.find(u=>same(u.target,c.id));
  }
  function radioAction(c,state,label,question){
    const u=reporterFor(c,state);
    if(!u)return currentCaseAction(c,state,action('Controlla i dati della segnalazione','showFacts'));
    if(state.tab!=='radio'||!same(state.unitId,u.id))return action('Contatta '+sign(u),'selectUnit',u.id);
    return action(label,'send',question);
  }
  function recordedSupport(c){
    // An explicit support request is public evidence, unlike the hidden c.need list.
    const known=[read(c,'opening'),read(c,'update'),read(c,'support'),read(c,'resources')].filter(Boolean).join(' ').toLowerCase();
    if(!known)return [];
    const requests=known.split(/[.!?]+/).filter(part=>/richied|serve|servono|necessit|manca|non risulta ancora assegnata/.test(part)&&!/non (?:serve|servono|richied|e necessari|è necessari)/.test(part));
    const out=[];
    for(const request of requests){
      if(/sanitari|ambulanz/.test(request))out.push('Sanitario');
      if(/vigili del fuoco|antincendio|pompier/.test(request))out.push('Vigili del fuoco');
      if(/polizia|pattugli/.test(request))out.push('Polizia');
    }
    return [...new Set(out)];
  }
  function view(c,state={}){
    if(!c)return {phase:'answer',step:1,title:'Scegli una chiamata',description:'Seleziona un evento dalla coda per iniziare a seguirlo.',action:action('Mostra la coda','toggleQueue'),checks:[],recap:'Nessun evento selezionato.'};
    const patrol=c.source==='patrol',units=(state.units||[]).filter(u=>same(u.target,c.id)),working=units.filter(active);
    const locationKnown=!!(read(c,'confirm')||c.confirmed===true),locationIndicated=!!read(c,'location');
    const peopleKnown=has(c,['people','response','breathing','injuries','symptoms','person','victims']);
    const hazardsKnown=has(c,['hazards','safety','smoke','weapons','risk','risks','danger','water','gas']);
    const situationKnown=has(c,['situation','opening','dynamics','detail']);
    const coordinated=working.length>0||c.done===true||c.state==='closed';
    const checks=[{label:'Dove si trova',done:locationKnown},{label:'Chi è coinvolto',done:peopleKnown},{label:'Pericoli e sicurezza',done:hazardsKnown},{label:'Soccorsi coordinati',done:coordinated}];
    const result=(flow,step,title,description,next)=>{
      if(state.started===false&&!state.ended)next=action(Object.keys(facts(c)).length?'Riprendi il turno':'Inizia il turno','start');
      return {phase:flow,step,title,description,action:next,checks,recap:recap(c)};
    };
    if(c.done||c.state==='closed'||state.ended)return result('closed',5,'Intervento concluso','Rivedi i fatti, gli aggiornamenti e le note raccolte durante l’intervento.',currentCaseAction(c,state,action('Rivedi il dossier','showFacts')));
    if(!patrol&&(c.state==='waiting'||(c.answeredAt==null&&!['connected','held','transferred'].includes(c.state))))return result('answer',1,'Rispondi alla chiamata','Apri la linea e ascolta il primo racconto. Il dossier si riempirà con le informazioni comunicate.',currentCaseAction(c,state,action('Rispondi alla chiamata','answer')));
    if(!patrol&&c.state==='held')return result('answer',1,'Riprendi il contatto','La persona è in attesa. Le informazioni già raccolte sono conservate; riprendi la linea per continuare.',currentCaseAction(c,state,action('Riprendi la linea','answer')));
    if(!locationKnown){
      if(patrol)return result('locate',2,'Verifica il punto della segnalazione','Chiedi alla squadra il luogo esatto prima di coordinare altri mezzi.',radioAction(c,state,'Chiedi il punto della segnalazione','Qual è il punto esatto della segnalazione? Confermate strada e riferimento.'));
      if(c.state!=='connected')return result('locate',2,'Riprendi il contatto per localizzare','La posizione non risulta confermata. Riapri il contatto con il chiamante per chiarire dove inviare i soccorsi.',currentCaseAction(c,state,action('Riprendi il contatto','answer')));
      return result('locate',2,locationIndicated?'Conferma il punto esatto':'Scopri dove si trova',locationIndicated?'Hai una prima indicazione. Chiarisci il punto esatto, il comune e un riferimento riconoscibile.':'Chiedi prima il luogo dell’emergenza, così potrai coordinare un intervento.',callerAction(c,state,locationIndicated?'Chiedi il punto esatto':'Chiedi dove si trova',locationIndicated?'Mi indica il punto esatto, il comune e il civico?':'Dove si trova in questo momento?'));
    }
    const explicitSupport=recordedSupport(c).filter(service=>!working.some(u=>u.type===service)&&!(c.completed||[]).includes(service));
    if(explicitSupport.length)return result('dispatch',4,'Coordina il supporto richiesto','Nelle informazioni raccolte è richiesto il servizio '+explicitSupport.join(', ')+'. Verifica le unità disponibili e assegna il supporto.',currentCaseAction(c,state,action('Scegli il supporto da inviare','openDispatch')));
    if(working.length){
      const travelling=working.filter(u=>phase(u)==='In viaggio'),held=working.filter(u=>phase(u)==='In attesa');
      if(state.paused&&travelling.length)return result('follow',5,'Fai proseguire i soccorsi','I mezzi sono assegnati e il tempo del turno è in pausa. Riprendilo per far avanzare l’intervento.',action('Riprendi il turno','togglePause'));
      if(held.length&&!working.some(u=>phase(u)!=='In attesa')){
        const u=held[0],next=state.tab==='radio'&&same(state.unitId,u.id)?action('Riprendi l’intervento','send','Intervieni al caso '+c.id):action('Contatta '+sign(u),'selectUnit',u.id);
        return result('follow',5,'La squadra attende disposizioni',sign(u)+' è ferma in attesa. Apri la radio per riprendere l’incarico o comunicare nuove disposizioni.',next);
      }
      const description=working.some(u=>phase(u)==='Sul posto')?'Le squadre sono sul posto. Chiedi un riscontro, annota ciò che cambia e condividi le informazioni utili.':c.state==='transferred'?'Il contatto è passato al servizio operativo. Segui l’avvicinamento dei mezzi e i loro aggiornamenti.':'I mezzi stanno raggiungendo l’evento. Mantieni il contatto e segui gli aggiornamenti della situazione.';
      return result('follow',5,'Segui l’intervento',description,currentCaseAction(c,state,action('Chiedi un aggiornamento','requestUpdate')));
    }
    if(!situationKnown||(!peopleKnown&&!hazardsKnown)){
      const question=!situationKnown?'Mi racconta che cosa è successo?':'Chi è coinvolto nella situazione?';
      if(patrol)return result('understand',3,'Chiarisci che cosa è stato osservato','La posizione è acquisita. Chiedi un primo riscontro alla squadra per capire chi è coinvolto e i rischi presenti.',radioAction(c,state,'Chiedi un primo riscontro','Descrivete la situazione e le persone coinvolte.'));
      if(c.state==='connected')return result('understand',3,'Chiarisci il primo quadro','La posizione è acquisita. Raccogli un primo elemento su persone e pericoli; puoi coordinare i soccorsi anche se alcuni dettagli restano da verificare.',callerAction(c,state,!situationKnown?'Chiedi che cosa è successo':'Chiedi chi è coinvolto',question));
      // Once the line is transferred, do not ask questions on a disconnected composer.
      return result('dispatch',4,'Coordina le risorse','La posizione è confermata e la linea è passata al servizio operativo. Controlla le unità e coordina l’intervento con le informazioni già disponibili.',currentCaseAction(c,state,action('Scegli le unità','openDispatch')));
    }
    const freeUnits=(state.units||[]).filter(available);
    if(!freeUnits.length&&state.paused)return result('dispatch',4,'Attendi una risorsa disponibile','Le unità risultano impegnate e il turno è in pausa. Fai proseguire le attività per aggiornare la disponibilità.',action('Riprendi il turno','togglePause'));
    return result('dispatch',4,'Coordina i soccorsi',freeUnits.length?'Hai un primo quadro dell’evento. Scegli le unità da inviare; continuerai a raccogliere i dettagli durante l’intervento.':'Al momento non ci sono unità libere. Controlla lo stato dei mezzi e mantieni aggiornato il quadro dell’evento.',currentCaseAction(c,state,action(freeUnits.length?'Scegli le unità da inviare':'Controlla la disponibilità','openDispatch')));
  }
  global.CallFlow=Object.freeze({view,version:'1.0.0',steps:['Ascolta','Localizza','Chiarisci','Coordina','Segui']});
})(typeof window!=='undefined'?window:globalThis);
