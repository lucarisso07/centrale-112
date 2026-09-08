(function(root){
 'use strict';
 const el=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let game,lastFlow='',lastQuestions='',lastStoryTick=-1,lastMapCase=null;
 const current=()=>game.state.cases.find(c=>c.id===game.state.caseId);
 function focusDistrict(id){const d=root.CityMap.districts?.find(d=>d.id===id);if(!d)return;game.state.view={x:d.x,y:d.y+100,zoom:.4};game.render();}
 function setWorkspace(mode){
  game.state.workspaceMode=mode==='map'?'map':'call';
  document.body.classList.toggle('territory-mode',mode==='map');
  el('workspace-call')?.setAttribute('aria-pressed',String(mode!=='map'));
  el('workspace-map')?.setAttribute('aria-pressed',String(mode==='map'));
  if(el('district-selector'))el('district-selector').value='';
  game.fitMap();if(mode!=='map'&&current()?.confirmed)game.focusCase();game.render();
 }
 function toggleDossier(){const narrow=(root.innerWidth||1400)<=1250;const visible=narrow?document.body.classList.toggle('dossier-visible'):!document.body.classList.toggle('dossier-closed');el('toggle-dossier')?.setAttribute('aria-pressed',String(visible));game.state.dossierOpen=visible;game.render();}
 function flowAction(){const c=current(),a=root.CallFlow?.view(c,game.state)?.action;if(!a||(!game.state.started&&a.method!=='start'))return;const allowed=['start','togglePause','showFacts','toggleQueue','answer','send','openDispatch','requestUpdate','briefUnits','selectUnit','selectCase','setTab','transfer'];if(allowed.includes(a.method)&&typeof game[a.method]==='function')game[a.method](...(a.args||[]));}
 function exploreQuestion(index){const c=current(),topic=Object.values(c?.topics||{})[Number(index)];if(!topic?.question||c.state!=='connected')return;game.send(topic.question);el('question-drawer').open=false;}
 function openQuestions(){el('question-drawer').open=!el('question-drawer').open;renderQuestions();}
 function renderQuestions(){const c=current(),box=el('question-list');if(!box||!c)return;const key=c.id+':'+c.revision;if(lastQuestions===key)return;lastQuestions=key;box.innerHTML=Object.entries(c.topics||{}).map(([key,t],i)=>`<button type="button" onclick="Game.exploreQuestion(${i})" ${c.state!=='connected'?'disabled':''}><span>${c.facts[key]?'✓ Già affrontato':'Da approfondire'}</span><b>${esc(t.label)}</b><small>${esc(t.question)}</small></button>`).join('');}
 function tick(g,dt){game=g;const s=g.state;const closing=s.cases.some(c=>c.done&&c.story?.version===1&&!c.epilogue&&c.answeredAt!==null);if(!closing&&s.time-lastStoryTick<1&&lastStoryTick<=s.time)return;lastStoryTick=s.time;
  for(const event of root.NarrativeEngine?.tick(s,dt)||[]){const c=s.cases.find(c=>c.id===event.caseId);if(!c)continue;c.story ||= {version:1,seen:[]};if(!Array.isArray(c.story.seen))c.story.seen=[];if(c.story.seen.includes(event.id))continue;
   c.story.seen.push(event.id);c.story.chapter=event.chapter;c.story.label=event.label;
   if(event.topicPatches)c.topics={...c.topics,...event.topicPatches};
   game.learn(c,event.facts||[],event.epilogue?'Chiusura evento':'Chiamante');
   game.say(c,event.epilogue?'epilogo':c.state==='connected'?'chiamante':'aggiornamento',event.text);
   if(event.epilogue)c.epilogue=event.text;
  }
 }
 function render(g){game=g;const s=g.state,c=current();if(!c)return;if(c.confirmed&&lastMapCase!==c.id&&s.workspaceMode!=='map'){lastMapCase=c.id;game.focusCase();}const flow=root.CallFlow?.view(c,s),story=root.NarrativeEngine?.view(c,s);const box=el('call-flow');
  if(flow&&box){const key=JSON.stringify([c.id,flow,story,s.started,s.pending.has('c'+c.id)]);if(key!==lastFlow){lastFlow=key;box.innerHTML=`<div class="flow-eyebrow">IL TUO PROSSIMO PASSO <span>${String(flow.step||1).padStart(2,'0')} / 05</span></div><div class="flow-track" aria-label="Progressione chiamata">${['Ascolta','Localizza','Chiarisci','Coordina','Segui'].map((label,i)=>`<span class="${i+1===(flow.step||1)?'current':i+1<(flow.step||1)?'completed':''}" title="${label}"><i></i>${label}</span>`).join('')}</div><h2>${esc(flow.title)}</h2><p>${esc(flow.description)}</p>${flow.action?`<button class="primary flow-action" onclick="Game.flowAction()" ${!s.started||s.pending.has('c'+c.id)?'disabled':''}>${esc(flow.action.label)} <span>→</span></button>`:''}<div class="flow-checks">${(flow.checks||[]).map(check=>`<span class="${check.done?'known':''}">${check.done?'✓':'○'} ${esc(check.label)}</span>`).join('')}</div>${flow.recap?`<div class="flow-recap"><b>Finora sappiamo</b><p>${esc(flow.recap)}</p></div>`:''}`;}}
  const inline=el('call-flow-inline');if(inline&&flow)inline.innerHTML=`<div><span>PROSSIMO PASSO</span><b>${esc(flow.title)}</b></div>${flow.action?`<button onclick="Game.flowAction()" ${!s.started||s.pending.has('c'+c.id)?'disabled':''}>${esc(flow.action.label)} →</button>`:''}`;
  const chapter=el('story-chapter');if(chapter){chapter.hidden=s.tab!=='call';chapter.innerHTML=`<span class="chapter-mark">${c.answeredAt===null?'—':['I','II','III','IV'][Math.min(3,story?.chapter||0)]}</span><div><span>STORIA IN CORSO</span><b>${esc(story?.label|| (c.answeredAt===null?'Una voce da ascoltare':'Primo contatto'))}</b></div><button onclick="Game.openQuestions()" ${c.state!=='connected'?'disabled':''}>Approfondisci <span>↗</span></button>`;}
  const exploration=el('question-drawer');if(exploration){exploration.hidden=s.tab!=='call'||c.state!=='connected';if(exploration.open)renderQuestions();}
  const selected=el('context-caller');if(selected)selected.textContent=c.answeredAt===null?'Linea 112':s.tab==='call'?c.caller||'Chiamante':'';
 }
 function attach(g){game=g;g.state.workspaceMode='call';Object.assign(g,{setWorkspace,focusDistrict,toggleDossier,flowAction,exploreQuestion,openQuestions});if((root.innerWidth||1400)<=1250)el('toggle-dossier')?.setAttribute('aria-pressed','false');const select=el('district-selector');if(select)select.innerHTML='<option value="">Vai a un quartiere…</option>'+(root.CityMap.districts||[]).map(d=>`<option value="${esc(d.id)}">${esc(d.name)}</option>`).join('');}
 root.StoryDesk={attach,tick,render};
})(globalThis);
