'use strict';
// Every module reads the same versioned JSON. No backend, third-party API or personal data in scripts.
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const localAsset=s=>typeof s==='string'&&/^assets\/[a-z0-9-]+\.webp$/.test(s)?'./'+s:null;
const safeLink=s=>{try{const u=new URL(s);return u.protocol==='https:'?u.href:null}catch{return null}};
const allowedThemes=new Set(['kitchen','cockpit','stay','ledger','archive','water','agents','events','cameras','transit']);
const areaNames={tech:'Tecnologia',legal:'Jurídico',property:'Imóveis',business:'Negócios',personal:'Pessoal'};
const states={pending:'A fazer',in_progress:'Em andamento',waiting:'Aguardando',done:'Concluída'};
let snapshot,item,currentFilter='all';
const validTheme=s=>allowedThemes.has(s)?s:'agents';
function currentAgent(x){
 const status=x.inference||{state:'unmonitored'};
 if(status.state==='unmonitored')return {text:'SEM TELEMETRIA',tone:'silent'};
 const expiry=Date.parse(status.expiresAt||'');
 const valid=snapshot.dataset==='fictitious-public-demo'||(expiry>Date.now()&&Date.parse(status.observedAt||'')<=Date.now()+60000&&status.source&&status.reference);
 if(!valid)return {text:'SEM TELEMETRIA',tone:'silent'};
 const names={processing:['INFERINDO','active'],waiting_input:['AGUARDANDO VOCÊ','warn'],completed:['CONCLUÍDO','ok'],idle:['OCIOSO','idle']};
 const match=names[status.state];return match?{text:match[0],tone:match[1]}:{text:'SEM TELEMETRIA',tone:'silent'};
}
function imageTag(src,cls,alt='Imagem temática'){
 const value=localAsset(src);
 return value?'<img class="'+cls+'" src="'+esc(value)+'" alt="'+esc(alt)+'" decoding="async">':'';
}
function art(x,theme){
 const main=x.media?.src,secondary=x.visual?.secondary,brand=x.brand?.src;
 const shot=imageTag(secondary||main,'art-shot','Imagem de referência do assunto');
 const mark=brand?imageTag(brand,'art-brand',''):null;
 switch(theme){
 case 'kitchen':return '<div class="kitchen-composition"><div class="ingredient-ring"></div><div class="phone-device">'+shot+'</div><span class="recipe-stamp">RECEITAS<br><b>EM CONSTRUÇÃO</b></span></div>';
 case 'cockpit':return '<div class="cockpit-composition">'+(mark||'<span class="cockpit-monogram">◈</span>')+'<div class="gauge gauge-obd"><strong>OBD2</strong><small>A VALIDAR</small></div><div class="gauge gauge-gps"><strong>GPS</strong><small>A VALIDAR</small></div><span class="dash-grid"></span></div>';
 case 'stay':return '<div class="stay-composition"><div class="stay-polaroid">'+shot+'</div><span class="stay-label">HOSPITALIDADE<br><b>OPERAÇÃO</b></span></div>';
 case 'ledger':return '<div class="ledger-composition"><div class="ledger-folio"><div class="folio-lines"></div><strong>CONTAS</strong><small>DESPESAS · RECEITAS · COMPROVANTES</small></div></div>';
 case 'archive':return '<div class="archive-composition"><div class="archive-file"><span>DOCUMENTOS</span><b>01</b></div><div class="archive-file alt"><span>PROCESSO</span><b>02</b></div><span class="archive-seal">EM REVISÃO</span></div>';
 case 'water':return '<div class="water-composition"><div class="water-circle"><span>PROTOCOLOS</span><strong>◉</strong></div><div class="water-waves"><i></i><i></i><i></i></div></div>';
 case 'agents':return '<div class="agents-composition"><div class="agent-node n1"><i></i>AGENTES</div><div class="agent-node n2"><i></i>TOOLS</div><div class="agent-node n3"><i></i>HARNESS</div><span class="agents-wires"></span></div>';
 case 'events':return '<div class="events-composition"><div class="event-ticket"><small>CURADORIA</small><strong>AGENDA</strong><span>\\/\\/\\/\\/\\/</span></div><div class="event-orb"></div></div>';
 case 'cameras':return '<div class="cameras-composition"><div class="camera-frame"><div class="camera-grain"></div><span>FONTE NÃO CONECTADA</span><b>CAM 01</b></div><div class="camera-frame secondary"><span>SEM SINAL</span><b>CAM 02</b></div></div>';
 case 'transit':return '<div class="transit-composition"><div class="transit-path"><b>●</b><i></i><b>●</b><i></i><b>●</b></div><div class="transit-plate">TRAJETOS<br><strong>EM ESTUDO</strong></div></div>';
 }
}
function activeWork(x){
 const tasks=Array.isArray(x.tasks)?x.tasks:[];
 const running=tasks.find(t=>t.state==='in_progress');
 const candidates=tasks.filter(t=>t.state!=='done');
 return running||candidates[0]||null;
}
function workProgress(x){
 const task=activeWork(x),v=task?.progress;
 return typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=100?v:null;
}
function hero(x,theme){
 const status=currentAgent(x),p=workProgress(x);
 const context=x.visual?.eyebrow||areaNames[x.area]||'Projeto';
 return '<section class="scene scene-'+theme+'">'+
 imageTag(x.media?.src,'scene-photo',x.media?.alt||x.title)+
 '<div class="scene-veiling"></div>'+
 '<div class="scene-left"><div class="eyebrow"><span class="eyebrow-line"></span>'+esc(context.toUpperCase())+'</div>'+
 '<h1>'+esc(x.shortTitle||x.title)+'</h1><span class="scene-subtitle">'+esc(x.subtitle||'')+'</span>'+
 '<div class="scene-flags"><span class="live-indicator '+esc(status.tone)+'"><i></i>'+esc(status.text)+'</span><span class="scene-metric">'+(p===null?'PROGRESSO NÃO MEDIDO':p+'% · TAREFA ATUAL')+'</span></div>'+
 '</div><div class="scene-right">'+art(x,theme)+'</div></section>';
}
function badge(x){return ({pending:'○',in_progress:'◐',waiting:'⌛',done:'✓'}[x.state]||'○')}
function taskRows(x){
 const tasks=Array.isArray(x.tasks)?x.tasks:[];
 const subset=currentFilter==='all'?tasks:tasks.filter(t=>t.state===currentFilter);
 if(!subset.length)return '<p class="no-tasks">Nenhuma tarefa neste estado.</p>';
 return subset.map((t,i)=>{
   const link=safeLink(t.link?.url);
   return '<div class="mission"><button class="mission-head" type="button" data-task="'+esc(t.id)+'" aria-expanded="false">'+
     '<span class="mission-index">'+String(tasks.indexOf(t)+1).padStart(2,'0')+'</span>'+
     '<span class="mission-body"><span class="mission-title">'+esc(t.title)+'</span><span class="mission-state s-'+esc(t.state)+'">'+esc(states[t.state]||t.state)+'</span></span>'+
     '<span class="mission-mark">'+badge(t)+'</span></button>'+
     '<div class="mission-expansion" hidden><p>'+esc(t.detail||'Sem detalhes adicionais.')+'</p>'+
     (link?'<a target="_blank" rel="noopener noreferrer" href="'+esc(link)+'">ABRIR '+esc(t.link.label||'FONTE')+' ↗</a>':'<span>Sem referência externa vinculada</span>')+
     (typeof t.progress==='number'?'<small>PROGRESSO REGISTRADO: '+t.progress+'%</small>':'')+'</div></div>';
 }).join('');
}
function facets(x){
 const list=Array.isArray(x.visual?.facets)?x.visual.facets:[];
 return list.slice(0,4).map((f,i)=>
 '<div class="facet"><span class="facet-id">'+String(i+1).padStart(2,'0')+'</span><span class="facet-label">'+esc(f.label)+'</span><span class="facet-value">'+esc(f.value||'Em avaliação')+'</span></div>').join('');
}
function links(x){
 const all=[x.link,...(x.tasks||[]).map(t=>t.link)].filter(Boolean),found=new Set();
 return all.map(l=>{const href=safeLink(l.url);if(!href||found.has(href))return '';found.add(href);return '<a class="resource" href="'+esc(href)+'" target="_blank" rel="noopener noreferrer">'+esc(l.label||'Documento')+' <span aria-hidden="true">↗</span></a>'}).filter(Boolean).join('');
}
function controls(x){
 const list=(x.tasks||[]).length,done=(x.tasks||[]).filter(t=>t.state==='done').length;
 const progress=workProgress(x),status=currentAgent(x);
 return '<section class="main-surface" id="tasks">'+
 '<div class="module-pane"><div class="pane-head"><span>ETAPAS / '+list+'</span><strong>'+done+' CONCLUÍDAS</strong></div>'+
 '<div class="task-filters">'+Object.entries({all:'Todas',in_progress:'Em curso',pending:'Pendentes',waiting:'Aguardando',done:'Concluídas'}).map(([key,v])=>'<button type="button" class="filter'+(key===currentFilter?' on':'')+'" data-filter="'+key+'" aria-pressed="'+(key===currentFilter)+'">'+v+'</button>').join('')+'</div>'+
 '<div id="task-list" class="task-list">'+taskRows(x)+'</div></div>'+
 '<aside class="side-pane"><div class="side-label">AGORA</div><h2>'+esc(x.nextAction||'Sem intervenção definida')+'</h2>'+
 '<div class="side-divider"></div><div class="side-label">ESTADO DA IA</div><p class="side-state"><i class="'+esc(status.tone)+'"></i>'+esc(status.text)+'</p>'+
 '<div class="side-divider"></div><div class="side-label">PROGRESSO DA TAREFA</div><div class="side-track"><i id="side-fill"></i></div>'+
 '<span class="side-small">'+(progress===null?'Sem medição confirmada':progress+'% registrados')+'</span>'+
 (x.dueDate?'<div class="side-divider"></div><div class="side-label">DATA REGISTRADA</div><p class="side-small">'+esc(x.dueDate.split('-').reverse().join('/'))+(x.dueType==='verified_deadline'?' · DOCUMENTADA':' · LEMBRETE')+'</p>':'')+
 '<div class="side-divider"></div><div class="side-label">RECURSOS</div><div class="resources">'+(links(x)||'<span class="side-small">Sem link verificado</span>')+'</div>'+
 '<button class="copy-context" type="button" id="copy-context">COPIAR CONTEXTO <span>⧉</span></button></aside></section>';
}
function render(){
 const query=new URLSearchParams(location.search),id=query.get('id');
 item=snapshot.items.find(x=>x.id===id);
 if(!item){$('#app').innerHTML='<main class="not-found"><h1>Módulo não encontrado</h1><a href="./index.html">← Voltar à Central</a></main>';return}
 const theme=validTheme(item.visual?.theme);
 const list=snapshot.items.map(x=>'<option value="'+esc(x.id)+'"'+(x.id===id?' selected':'')+'>'+esc(x.shortTitle||x.title)+'</option>').join('');
 const h='<header class="project-nav"><a class="home" href="./index.html#item-'+encodeURIComponent(item.id)+'" aria-label="Voltar ao painel geral">← <span>CENTRAL</span></a>'+
 '<span class="nav-divider"></span><span class="nav-location">'+esc(areaNames[item.area]||item.area)+'</span>'+
 '<div class="nav-actions"><select id="project-select" aria-label="Ir para outro projeto">'+list+'</select><button type="button" id="refresh" aria-label="Atualizar snapshot">↻</button></div></header>';
 const m='<main class="project-main">'+hero(item,theme)+
 '<section class="facets" aria-label="Áreas relacionadas">'+facets(item)+'</section>'+controls(item)+
 '<footer class="project-foot"><span>FONTE: SNAPSHOT VERSIONADO · '+esc(snapshot.dataset==='fictitious-public-demo'?'DEMONSTRAÇÃO FICTÍCIA':'DADOS NÃO SINCRONIZADOS EM TEMPO REAL')+'</span><a href="./index.html#item-'+encodeURIComponent(item.id)+'">VOLTAR AO PAINEL GERAL ↑</a></footer></main>';
 $('#app').innerHTML='<div class="project-root theme-'+theme+'">'+h+m+'</div>';
 const bar=$('#side-fill');if(bar)bar.style.width=(workProgress(item)||0)+'%';
 $('#project-select').addEventListener('change',e=>{location.href='./project.html?id='+encodeURIComponent(e.target.value)});
 $('#refresh').addEventListener('click',load);
 $('#task-list').addEventListener('click',e=>{const button=e.target.closest('[data-task]');if(!button)return;const panel=button.nextElementSibling;panel.hidden=!panel.hidden;button.setAttribute('aria-expanded',String(!panel.hidden))});
 $('.task-filters').addEventListener('click',e=>{const b=e.target.closest('[data-filter]');if(!b)return;currentFilter=b.dataset.filter;document.querySelectorAll('.filter').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});$('#task-list').innerHTML=taskRows(item)});
 $('#copy-context').addEventListener('click',async()=>{const t=[item.title,item.nextAction,...(item.tasks||[]).map(x=>states[x.state]+': '+x.title)].join('\n');try{await navigator.clipboard.writeText(t);$('#copy-context').textContent='COPIADO ✓'}catch{$('#copy-context').textContent='CÓPIA INDISPONÍVEL'}});
 document.title=(item.shortTitle||item.title)+' · Central Pessoal';
}
async function load(){
 try{const r=await fetch('./data/dashboard.json?refresh='+Date.now(),{cache:'no-store'});if(!r.ok)throw Error('Falha na leitura do JSON');const json=await r.json();if(!Array.isArray(json.items))throw Error('Esquema inválido');snapshot=json;render()}catch(err){console.error(err);$('#app').innerHTML='<div class="not-found"><h1>Não foi possível carregar</h1><a href="./index.html">Voltar à Central</a></div>'}
}
load();
