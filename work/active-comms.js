/* Comunicazioni attive, offline e senza DOM.
 * tick(state, dt), requestUpdate(case, state) -> eventi; non modificano lo stato.
 * Il consumer marca state.commsSeen[event.id] = true dopo aver applicato l'evento.
 * Campi opzionali: unit.arrivedAt, unit.dispatchedAt; fallback alla history radio.
 */
(function(global){
  'use strict';
  const finite=n=>typeof n==='number'&&Number.isFinite(n);
  const same=(a,b)=>a!=null&&b!=null&&String(a)===String(b);
  const clean=s=>String(s||'').trim();
  const norm=s=>clean(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const sign=u=>u.callSign||u.id||'Unità';
  const factsOf=c=>c&&c.facts&&typeof c.facts==='object'?c.facts:{};
  const factText=f=>typeof f==='string'?clean(f):f&&typeof f.text==='string'?clean(f.text):'';
  const known=(c,k)=>factText(factsOf(c)[k]);
  const phase=u=>({onscene:'Sul posto',enroute:'In viaggio',hold:'In attesa',patrol:'Pattugliamento',returning:'Rientro'})[u.phase]||u.phase;
  const seen=(state,id)=>state.commsSeen instanceof Set?state.commsSeen.has(id):!!state.commsSeen?.[id];
  const assigned=(c,state)=>(state.units||[]).filter(u=>same(u.target,c.id));
  const liveCase=(c,state)=>c&&!c.done&&c.state!=='closed'&&(!finite(c.at)||c.at<=state.time);
  const affected={collision:['hazards'],fire:['situation'],park:['response'],warehouse:['people','situation'],flood:['situation'],lift:['alarm','access'],conflict:['situation'],lost:['safety'],patrol_van:['situation','hazards'],patrol_smoke:['situation','smoke'],patrol_help:['symptoms']};
  const stages={
    'Polizia':[['access','hazards'],['people','safety','vehicle','weapons']],
    'Sanitario':[['people','response'],['breathing','symptoms','injuries','safety']],
    'Vigili del fuoco':[['access','hazards'],['people','smoke','situation','alarm']]
  };
  const callerKeys=['people','safety','situation','access','symptoms'];
  function readAt(unit,field,pattern){
    if(finite(unit[field]))return unit[field];
    const h=[...(unit.history||[])].reverse().find(m=>finite(m.time)&&['squadra','radio','aggiornamento'].includes(m.role)&&pattern.test(norm(m.text)));
    return h?h.time:null;
  }
  const arrivalAt=u=>readAt(u,'arrivedAt',/\bsul posto\b|evento raggiunto/);
  const dispatchAt=u=>readAt(u,'dispatchedAt',/interveniamo al caso|in viaggio|assegnat|in avvicinamento/);
  function lastContact(c){
    const times=[c.answeredAt,c.lastContact,...(c.history||[]).filter(m=>['operatore','chiamante','caller','operator'].includes(m.role)).map(m=>m.time)].filter(finite);
    return times.length?Math.max(...times):null;
  }
  function pending(state,type,id){return !!state.pending?.has?.((type==='radio'?'u':'c')+id);}
  function newFacts(c,keys,source,sourceLabel,reserved=new Set(),limit=2){
    const out=[],blocked=c.eventFired?(affected[c.key]||[]):[];
    for(const key of keys){
      if(known(c,key)||reserved.has(key)||blocked.includes(key))continue;
      const t=c.topics?.[key],text=factText(t?.fact);
      if(!text||text===clean(c.event?.fact)||(clean(c.event?.text)&&clean(t?.reply)===clean(c.event.text)))continue;
      // Topics are authored scenario evidence; no free-form deductions or new facts.
      out.push({key,text,source,sourceLabel});reserved.add(key);
      if(out.length>=limit)break;
    }
    return out;
  }
  function event(id,type,kind,c,u,text,facts=[]){return {id,type,kind,caseId:c.id,...(u?{unitId:u.id}:{}),text,facts};}
  function sceneMessage(c,u,items,stage){
    if(!items.length)return sign(u)+' a centrale. Le verifiche sull’evento #'+c.id+' sono ancora in corso. Non abbiamo nuovi elementi da aggiungere ai dati già comunicati.';
    const attribution=c.source==='patrol'&&same(c.reporterUnitId,u.id)?'Completiamo la nostra segnalazione: ':'Dal contatto con il segnalante, raccogliamo questi elementi: ';
    return sign(u)+' a centrale. '+(stage===0?'Primo riscontro per l’evento #'+c.id+'. ':'Aggiornamento per l’evento #'+c.id+'. ')+attribution+items.map(f=>f.text).join(' ');
  }
  function sceneSource(c,u){return sign(u)+(c.source==='patrol'&&same(c.reporterUnitId,u.id)?' · segnalazione della pattuglia':' · contatto con il segnalante');}
  function unitBrief(u,c){
    const p=phase(u),eta=finite(u.eta)?Math.ceil(Math.max(0,u.eta)):null;
    if(p==='In viaggio')return sign(u)+' a centrale. In avvicinamento all’evento #'+c.id+(eta!==null?', tempo residuo stimato '+eta+' secondi.':'. Il tempo di arrivo non è ancora disponibile.')+' Non abbiamo ancora un riscontro diretto dal luogo.';
    if(p==='In attesa')return sign(u)+' a centrale. Siamo in attesa di disposizioni per l’evento #'+c.id+'. L’incarico resta assegnato.';
    return sign(u)+' a centrale. Per l’evento #'+c.id+' possiamo riferire i dati già raccolti. '+brief(c,{units:[]});
  }
  function brief(c,state={}){
    if(!c)return 'Nessun evento selezionato.';
    const fs=factsOf(c),position=known(c,'confirm')||known(c,'location')||(c.confirmed?clean(c.address):'');
    const title=c.answeredAt!=null||c.source==='patrol'?clean(c.title):'';
    const head='Evento #'+c.id+(title?' · '+title:'')+'. '+(position?'Posizione: '+position+'.':'Posizione non ancora acquisita.');
    const order=['update',known(c,'situation')?'situation':'opening','people','response','breathing','injuries','symptoms','weapons','hazards','safety','access','vehicle'];
    const details=[];
    for(const key of order){const text=factText(fs[key]);if(text&&!details.includes(text))details.push(text);if(details.length===6)break;}
    const units=assigned(c,state).filter(u=>['In viaggio','Sul posto','In attesa'].includes(phase(u))).map(u=>sign(u)+' '+phase(u).toLowerCase());
    return [head,details.length?details.join(' '):'Non risultano ancora altri fatti raccolti.',units.length?'Unità: '+units.join('; ')+'.':'Nessuna unità attualmente impegnata sull’evento.'].join(' ');
  }
  function tick(state,dt=0){
    if(!state||!finite(state.time)||state.ended||state.started===false||state.paused===true)return [];
    const events=[],reservedByCase=new Map();
    const reserve=c=>{if(!reservedByCase.has(c.id))reservedByCase.set(c.id,new Set());return reservedByCase.get(c.id);};
    for(const c of state.cases||[]){
      if(!liveCase(c,state))continue;
      const units=assigned(c,state);
      for(const u of units){
        if(pending(state,'radio',u.id))continue;
        if(phase(u)==='In viaggio'){
          const at=dispatchAt(u),id='active:'+c.id+':'+u.id+':access-request';
          if(at!==null&&state.time-at>=18&&!known(c,'access')&&!seen(state,id))events.push(event(id,'radio','access_request',c,u,sign(u)+' a centrale. Per l’evento #'+c.id+' manca un’indicazione sull’accesso. Potete chiarire ingresso, lato della strada o punto d’incontro con il segnalante?'));
        }
        if(phase(u)!=='Sul posto')continue;
        const at=arrivalAt(u);if(at===null||state.time<at)continue;
        const plan=stages[u.type]||[['access','safety'],['people','hazards']];
        for(let stage=0;stage<2;stage++){
          const id='active:'+c.id+':'+u.id+':scene:'+Math.floor(at*1000)+':'+stage;
          if(state.time-at<(stage===0?12:28)||seen(state,id))continue;
          const items=newFacts(c,plan[stage],'unit',sceneSource(c,u),reserve(c),2);
          // Known information is not re-announced periodically; manual updates can recap it.
          if(items.length)events.push(event(id,'radio','scene_report',c,u,sceneMessage(c,u,items,stage),items));
        }
      }
      if(c.source==='patrol'||c.answeredAt==null||pending(state,'caller',c.id))continue;
      const last=lastContact(c);
      if(c.state==='connected'&&last!==null&&state.time-last>=42){
        const id='active:'+c.id+':caller:additional-detail';
        if(!seen(state,id)){
          const items=newFacts(c,callerKeys,'caller',c.caller||'Chiamante',reserve(c),1);
          if(items.length){const t=c.topics[items[0].key];events.push(event(id,'caller','caller_detail',c,null,clean(t.reply)||items[0].text,items));}
          else events.push(event(id,'caller','contact_check',c,null,'Mi sente ancora? Sono in linea. Mi dica se le serve chiarire qualcosa.'));
        }
      }
      const heldId='active:'+c.id+':caller:held-contact';
      if(c.state==='held'&&finite(c.heldAt)&&state.time-c.heldAt>=36&&!c.attention&&!seen(state,heldId))events.push(event(heldId,'caller','held_contact',c,null,'Sono ancora qui, in attesa. Ho bisogno di sapere che mi state ascoltando.'));
    }
    return events;
  }
  function requestUpdate(c,state={}){
    if(!c||!liveCase(c,{...state,time:finite(state.time)?state.time:0}))return [];
    const now=finite(state.time)?state.time:0;
    const serial=Math.floor(now*1000)+':'+(c.history||[]).length+':'+(c.revision||0);
    const units=assigned(c,state),onScene=units.filter(u=>phase(u)==='Sul posto');
    const reserved=new Set(),events=[];
    for(const u of onScene.slice(0,3)){
      const plan=stages[u.type]||[['access','safety'],['people','hazards']];
      const items=newFacts(c,plan.flat(),'unit',sceneSource(c,u),reserved,2);
      const text=items.length?sceneMessage(c,u,items,1):sign(u)+' a centrale. Nessun ulteriore dato verificato da aggiungere. '+brief(c,state);
      events.push(event('request:'+c.id+':'+u.id+':'+serial+':'+(u.history||[]).length,'radio','requested_update',c,u,text,items));
    }
    if(events.length)return events;
    const enroute=units.find(u=>phase(u)==='In viaggio')||units.find(u=>phase(u)==='In attesa');
    if(enroute)return [event('request:'+c.id+':'+enroute.id+':'+serial+':'+(enroute.history||[]).length,'radio','requested_status',c,enroute,unitBrief(enroute,c))];
    if(c.state==='connected'&&c.source!=='patrol'){
      const items=newFacts(c,callerKeys,'caller',c.caller||'Chiamante',new Set(),1);
      const text=items.length?clean(c.topics[items[0].key].reply)||items[0].text:'Sono ancora in linea. Non ho altre informazioni rispetto a quelle che le ho già riferito.';
      return [event('request:'+c.id+':caller:'+serial,'caller','requested_update',c,null,text,items)];
    }
    const reporter=(state.units||[]).find(u=>same(u.id,c.reporterUnitId));
    if(reporter)return [event('request:'+c.id+':'+reporter.id+':'+serial,'radio','requested_status',c,reporter,unitBrief(reporter,c))];
    return [];
  }
  global.ActiveComms=Object.freeze({tick,brief,requestUpdate,version:'1.0.0',protocol:{arrivalField:'arrivedAt',dispatchField:'dispatchedAt',seenField:'commsSeen',sceneDelays:[12,28]}});
})(typeof window!=='undefined'?window:globalThis);
