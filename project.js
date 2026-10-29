'use strict';
// Compact operational detail. Everything displayed comes from the private snapshot.
const $ = (s,root=document)=>root.querySelector(s);
const $$ = (s,root=document)=>[...root.querySelectorAll(s)];
const escapeHTML = value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const verifiedAsset = src=>typeof src==='string' && /^assets\/[a-z0-9-]+\.webp$/.test(src) ? './'+src : null;
const verifiedLink = value=>{try{const u=new URL(value);return u.protocol==='https:'?u.href:null}catch{return null}};
const names={tech:'Tecnologia',legal:'Jurídico',property:'Imóveis',business:'Negócios',personal:'Pessoal'};
const types={
 kitchen:{label:'RECEITAS',symbol:'◫'},cockpit:{label:'VEÍCULO',symbol:'◉'},
 stay:{label:'LOCAÇÕES',symbol:'⌂'},ledger:{label:'CONTAS',symbol:'≡'},
 archive:{label:'DOCUMENTOS',symbol:'▤'},water:{label:'ABASTECIMENTO',symbol:'≈'},
 agents:{label:'AGENTES',symbol:'⌘'},events:{label:'EVENTOS',symbol:'◈'},
 cameras:{label:'CÂMERAS',symbol:'◎'},transit:{label:'MOBILIDADE',symbol:'◇'}
};
const taskStates={in_progress:'EM CURSO',pending:'PENDENTE',waiting:'AGUARDANDO',done:'CONCLUÍDA'};
const svgIcon=(path)=>'<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+path+'</svg>';
const taskIcons={
 in_progress:svgIcon('<circle cx="12" cy="12" r="9" opacity=".4"/><path d="M12 3a9 9 0 0 1 9 9"/><path d="m17 11 4 1 1-4"/>'),
 pending:svgIcon('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
 waiting:svgIcon('<circle cx="12" cy="12" r="9"/><path d="M9 8v8M15 8v8"/>'),
 done:svgIcon('<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>')
}
let snapshot,subject,filter='active',showAll=false,alsRegistry=null,activityRegistry=null;
function telemetry(){
 const status=subject.inference;
 if(!status||status.state==='unmonitored')return {name:'SEM SINAL',kind:'unknown'};
 if(snapshot.dataset!=='fictitious-public-demo'){
  const until=Date.parse(status.expiresAt||'');
  const since=Date.parse(status.observedAt||'');
  if(!status.reference||!status.source||!Number.isFinite(until)||!Number.isFinite(since)||until<=Date.now()||since>Date.now()+60e3) return {name:'SEM SINAL',kind:'unknown'};
 }
 const available={processing:['INFERINDO','working'],waiting_input:['AGUARDANDO VOCÊ','waiting'],completed:['CONCLUÍDA','complete'],idle:['OCIOSA','idle']};
 const s=available[status.state];return s?{name:s[0],kind:s[1]}:{name:'SEM SINAL',kind:'unknown'};
}
function measured(task){
 if(!task||typeof task.progress!=='number'||!Number.isFinite(task.progress)||task.progress<0||task.progress>100)return null;
 // Production values must be attributable. Demo percentages are explicitly fictitious.
 if(snapshot.dataset!=='fictitious-public-demo' && !task.progressEvidence && !task.lastUpdate?.evidence)return null;
 return task.progress;
}
function taskOrder(tasks){
 const rank={in_progress:0,pending:1,waiting:2,done:3};
 return [...tasks].sort((a,b)=>(rank[a.state]??4)-(rank[b.state]??4));
}
function currentTask(){
 const tasks=taskOrder(subject.tasks||[]);
 return tasks.find(t=>t.state==='in_progress')||tasks.find(t=>t.state==='pending')||tasks.find(t=>t.state==='waiting')||null;
}
function pathToHome(){return './index.html#item-'+encodeURIComponent(subject.id)}
function itemLink(link){
 const u=verifiedLink(link?.url);
 return u?'<a class="source-action" target="_blank" rel="noopener noreferrer" href="'+escapeHTML(u)+'">'+escapeHTML(link.label||'Abrir fonte')+' ↗</a>':'';
}
function dueLabel(){
 if(!subject.dueDate)return '';
 const [year,month,day]=subject.dueDate.split('-');
 return '<span class="date-token" title="Data registrada no snapshot">'+day+'/'+month+'/'+year+' · '+(subject.dueType==='verified_deadline'?'PRAZO DOCUMENTADO':'LEMBRETE')+'</span>';
}
function header(){
 const theme=types[subject.visual?.theme]||{label:names[subject.area]||'ASSUNTO',symbol:'◈'};
 const image=verifiedAsset(subject.brand?.src)||verifiedAsset(subject.media?.src);
 const badge=image?'<img src="'+escapeHTML(image)+'" alt="" loading="eager" decoding="async">':'<span>'+theme.symbol+'</span>';
 const t=telemetry();
 const sel=snapshot.items.map(x=>{
  const img=verifiedAsset(x.brand?.src)||verifiedAsset(x.media?.src);
  const media=img?'<img src="'+escapeHTML(img)+'" alt="" loading="lazy" decoding="async">':'<span aria-hidden="true">◈</span>';
  return '<a class="switcher-item'+(x.id===subject.id?' current':'')+'" href="./project.html?id='+encodeURIComponent(x.id)+'"'+(x.id===subject.id?' aria-current="page"':'')+'>'+
   '<span class="switcher-thumb">'+media+'</span><span class="switcher-copy"><strong>'+escapeHTML(x.shortTitle||x.title)+'</strong><small>'+escapeHTML(x.subtitle||names[x.area]||'Assunto')+'</small></span><span class="switcher-arrow" aria-hidden="true">›</span></a>';
 }).join('');
 return '<header class="topbar"><a class="back" href="'+pathToHome()+'" aria-label="Voltar à Central">← <span>CENTRAL</span></a>'+
 '<span class="crumb">'+escapeHTML(theme.label)+'</span>'+
 '<details class="switcher-menu" id="switcher-menu"><summary aria-label="Trocar de projeto ou assunto"><span>'+escapeHTML(subject.shortTitle||subject.title)+'</span><span class="switcher-caret" aria-hidden="true">⌄</span></summary><nav class="switcher-list" aria-label="Projetos e assuntos">'+sel+'</nav></details></header>'+
 '<div class="identity"><div class="identity-image">'+badge+'</div><div class="identity-copy"><span class="eyebrow">'+escapeHTML(theme.label)+' <span>·</span> '+escapeHTML(names[subject.area]||subject.area)+'</span>'+
 '<h1>'+escapeHTML(subject.shortTitle||subject.title)+'</h1></div>'+
 '<span class="runtime '+t.kind+'"><i></i><span>IA · '+t.name+'</span></span></div>';
}
function moduleNavigation(){
 const source=verifiedLink(subject.link?.url);
 return '<nav class="module-nav" aria-label="Navegação do módulo">'+
 '<a href="#overview">Visão geral</a><a href="#tasks">Tarefas</a><a href="#sources">Fontes</a>'+
 (source?'<a href="'+escapeHTML(source)+'" target="_blank" rel="noopener noreferrer">Repositório / fonte ↗</a>':'')+'</nav>';
}
function actionStrip(){
 const blockers=Array.isArray(subject.blockers)?subject.blockers.filter(x=>typeof x==='object'&&x.title):[];
 const main=blockers.find(x=>x.state==='open')||null;
 return '<section class="action-strip" id="overview" aria-label="O que precisa de atenção">'+
 '<div class="action-core"><span class="micro-heading"><span class="flash">◆</span> PRÓXIMA AÇÃO</span><p id="next-action">'+escapeHTML(subject.nextAction||'Nenhuma intervenção registrada')+'</p>'+
 ' <a class="source-action" href="#tasks">Ver tarefas e agir ↓</a>'+
 (verifiedLink(subject.link?.url)?itemLink({url:subject.link.url,label:'Abrir fonte de trabalho'}):verifiedLink(alsRegistry?.items?.find(x=>x.id===subject.id&&x.sourceStatus==='verified')?.sourceUrl)?itemLink({url:alsRegistry.items.find(x=>x.id===subject.id).sourceUrl,label:'Abrir fonte canônica'}):'')+'</div>'+
 '<div class="blocker'+(main?' has-blocker':'')+'"><span class="micro-heading">IMPEDIMENTOS</span><p class="'+(main?'with-blocker':'')+'">'+(main?escapeHTML(main.title):'Nenhum bloqueio registrado')+'</p></div></section>';
}
function taskRow(task){
 const progress=measured(task),label=taskStates[task.state]||'PENDENTE',icon=taskIcons[task.state]||'○';
 const sublabel=task.group?'<span class="task-group">'+escapeHTML(task.group)+'</span>':'';
 const when=task.dueDate?'<span class="task-due">'+escapeHTML(task.dueDate.split('-').slice(1).reverse().join('/'))+' · '+(task.dueType==='verified_deadline'?'PRAZO DOCUMENTADO':'LEMBRETE')+'</span>':'';

 return '<article class="task task-'+escapeHTML(task.state)+'"><button type="button" class="task-toggle" data-task="'+escapeHTML(task.id)+'" aria-expanded="false" aria-label="Detalhes: '+escapeHTML(task.title)+'">'+
 '<span class="task-icon" aria-hidden="true">'+icon+'</span><span class="task-copy">'+sublabel+'<span class="task-name">'+escapeHTML(task.title)+'</span><span class="task-labels"><span class="task-state">'+label+'</span>'+when+'</span></span>'+
 '<span class="task-right">'+(progress===null?'':'<span class="measured">'+progress+'%</span>')+'<span class="chevron">⌄</span></span></button>'+
 (progress!==null?'<span class="task-bar"><i data-progress="'+progress+'"></i></span>':'')+
 '<div class="task-expanded" hidden><p>'+escapeHTML(task.detail||'Sem detalhes adicionais')+'</p>'+
 (itemLink(task.link)||'<span class="no-source">Sem link vinculado</span>')+
 (verifiedLink(alsRegistry?.items?.find(x=>x.id===subject.id&&x.sourceStatus==='verified')?.sourceUrl) && /^https:\/\/github\.com\/[^/]+\/[^/]+\/?$/.test(alsRegistry.items.find(x=>x.id===subject.id).sourceUrl)?'<a class="source-action" target="_blank" rel="noopener noreferrer" href="'+escapeHTML(alsRegistry.items.find(x=>x.id===subject.id).sourceUrl.replace(/\/$/,'')+'/issues/new?title='+encodeURIComponent(task.title)+'&body='+encodeURIComponent('Tarefa de referência: '+task.id+'\nContexto: '+(task.detail||'')+'\nOrigem: Central Pessoal; revisar antes de criar.'))+'">Criar issue no projeto ↗</a>':'')+
 '</div></article>';
}
function taskPanel(){
 const all=subject.tasks||[];
 const candidates=filter==='all'?taskOrder(all):filter==='active'?taskOrder(all.filter(t=>t.state!=='done')):all.filter(t=>t.state===filter);
 const slice=(showAll||filter!=='active')?candidates:candidates.slice(0,4);
 const remaining=Math.max(0,candidates.length-slice.length);
 const tabs=[['active','ATIVAS','ATIVAS'],['all','TODAS','TODAS'],['in_progress','EM CURSO','CURSO'],['waiting','AGUARDANDO','ESPERA'],['done','CONCLUÍDAS','FEITAS']];
 return '<section class="tasks-section" id="tasks"><div class="section-head"><h2>TAREFAS</h2><span>'+all.filter(t=>t.state!=='done').length+' EM ABERTO</span></div>'+
 '<nav class="filters" aria-label="Filtrar tarefas">'+tabs.map(([key,value,short])=>'<button class="filter '+(filter===key?'selected':'')+'" data-filter="'+key+'" type="button" aria-label="'+value+'" aria-pressed="'+String(filter===key)+'"><span class="filter-full">'+value+'</span><span class="filter-short">'+short+'</span></button>').join('')+'</nav>'+
 '<div class="task-list" id="task-list">'+(slice.length?slice.map(taskRow).join(''):'<p class="empty">Nenhuma tarefa neste filtro.</p>')+'</div>'+
 (remaining?'<button class="more" id="show-all" type="button">MOSTRAR MAIS '+remaining+' TAREFA(S) ↓</button>':'')+'</section>';
}
function actualActivity(){
 const record=activityRegistry?.items?.find(x=>x.id===subject.id && x.status==='verified');
 if(!record||record.lastEvent?.kind!=='commit'||!record.lastEvent.at)return '';
 const date=new Date(record.lastEvent.at);
 if(Number.isNaN(date.getTime()))return '';
 const formatted=new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'America/Sao_Paulo'}).format(date);
 const reference=verifiedLink(record.lastEvent.url);
 return '<div class="context-pair"><b>ÚLTIMA ALTERAÇÃO REGISTRADA</b><span>'+escapeHTML(formatted)+' · '+escapeHTML(record.lastEvent.sha.slice(0,8))+'</span></div>'+
 (reference?'<div class="context-links"><a class="source-action" href="'+escapeHTML(reference)+'" target="_blank" rel="noopener noreferrer">Abrir commit verificado ↗</a></div>':'');
}
function alsContext(){
 if(snapshot.dataset==='fictitious-public-demo')return '';
 const entry=alsRegistry?.items?.find(x=>x.id===subject.id);
 if(!entry)return '<div class="context-pair"><b>ALS / FONTE</b><span>Registro não disponível</span></div>';
 const source=entry.sourceStatus==='verified'?'Fonte identificada':'Fonte a confirmar';
 const coverage=entry.documentationStatus==='complete'?'Estrutura identificada':entry.documentationStatus==='partial'?'Cobertura parcial':entry.documentationStatus==='missing'?'Arquivos não encontrados':'Não verificada';
 const url=verifiedLink(entry.sourceUrl),record=verifiedLink(entry.alsRecordUrl);
 return '<div class="context-pair"><b>ALS / FONTE</b><span>'+escapeHTML(source)+' · '+escapeHTML(coverage)+'</span></div>'+
 (url?'<div class="context-links"><a class="source-action" href="'+escapeHTML(url)+'" target="_blank" rel="noopener noreferrer">Abrir fonte canônica ↗</a></div>':'')+
 (record?'<div class="context-links"><a class="source-action" href="'+escapeHTML(record)+'" target="_blank" rel="noopener noreferrer">Auditoria ALS ↗</a></div>':'');
}
function context(){
 const links=[subject.link,...(subject.tasks||[]).map(t=>t.link)].filter(Boolean);
 const seen=new Set();
 const resources=links.map(l=>{const u=verifiedLink(l.url);if(!u||seen.has(u))return '';seen.add(u);return itemLink(l)}).filter(Boolean).join('');
 const current=currentTask();
 const pct=measured(current);
 return '<section class="context-line" id="sources" aria-label="Contexto adicional"><details><summary>CONTEXTO E FONTES <span>⌄</span></summary>'+
 '<div class="context-details"><div class="context-pair"><b>TAREFA ATUAL</b><span>'+escapeHTML(current?.title||'Nenhuma tarefa ativa')+'</span></div>'+
 '<div class="context-pair"><b>PROGRESSO</b><span>'+((pct===null)?'Sem medição confirmada':pct+'% da tarefa')+'</span></div>'+
 (subject.dueDate?'<div class="context-pair"><b>DATA</b>'+dueLabel()+'</div>':'')+
 '<div class="context-pair"><b>ORIGEM</b><span>'+escapeHTML(subject.source||'Não informada')+'</span></div>'+
 alsContext()+actualActivity()+
 '<div class="context-links">'+(resources||'<span>Sem links verificados</span>')+'</div>'+
 '<button id="copy-context" type="button" class="copy">COPIAR CONTEXTO ⧉</button></div></details></section>';
}
function mount(){
 const urlId=new URLSearchParams(location.search).get('id');
 const resolvedId=urlId==='essence-contas'?'inventario':urlId;
 if(resolvedId!==urlId)history.replaceState(null,'','./project.html?id='+encodeURIComponent(resolvedId));
 subject=snapshot.items.find(x=>x.id===resolvedId);
 if(!subject){$('#app').innerHTML='<main class="not-found"><h1>Assunto não encontrado</h1><a href="./index.html">← Voltar ao painel geral</a></main>';return}
 const theme=types[subject.visual?.theme]?'theme-'+subject.visual.theme:'theme-agents';
 $('#app').innerHTML='<div class="app-root '+theme+'">'+header()+'<main class="main">'+moduleNavigation()+actionStrip()+taskPanel()+context()+
 '<footer><span>SNAPSHOT · '+escapeHTML(snapshot.dataset==='fictitious-public-demo'?'DADOS FICTÍCIOS':'SEM ATUALIZAÇÃO AO VIVO')+'</span><a href="'+pathToHome()+'">← VOLTAR</a></footer></main></div>';
 document.title=(subject.shortTitle||subject.title)+' · Central';
 const menu=$('#switcher-menu');
 document.addEventListener('pointerdown',e=>{if(menu?.open&&!menu.contains(e.target))menu.open=false});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&menu?.open){menu.open=false;menu.querySelector('summary')?.focus()}});

 bindTasks();
 const c=$('#copy-context');c?.addEventListener('click',async()=>{const value=[subject.title,subject.nextAction,...(subject.tasks||[]).map(t=>(taskStates[t.state]||t.state)+': '+t.title)].join('\n');try{await navigator.clipboard.writeText(value);c.textContent='COPIADO ✓'}catch{c.textContent='CÓPIA INDISPONÍVEL'}});
}
function bindTasks(){
 $$('.filter').forEach(button=>button.addEventListener('click',()=>{filter=button.dataset.filter;showAll=false;refreshTasks()}));
 bindTaskRows();
}
function refreshTasks(){
 const replacement=document.createElement('div');replacement.innerHTML=taskPanel();
 $('#tasks').replaceWith(replacement.firstElementChild);
 bindTasks();
}
function bindTaskRows(){
 $$('[data-progress]').forEach(el=>{el.style.width=Math.max(0,Math.min(100,Number(el.dataset.progress)||0))+'%'});
 $$('.task-toggle').forEach(el=>el.addEventListener('click',()=>{const panel=el.closest('.task').querySelector('.task-expanded');panel.hidden=!panel.hidden;el.setAttribute('aria-expanded',String(!panel.hidden))}));
 $('#show-all')?.addEventListener('click',()=>{showAll=true;refreshTasks()});
}
async function load(){
 try{const response=await fetch('./data/dashboard.json?v='+Date.now(),{cache:'no-store'});if(!response.ok)throw Error('HTTP '+response.status);const db=await response.json();if(!Array.isArray(db.items))throw Error('Estrutura inválida');snapshot=db;
 alsRegistry=null;activityRegistry=null;
 if(db.dataset!=='fictitious-public-demo'){
  try{
   const responseAls=await fetch('./data/als.json?v='+Date.now(),{cache:'no-store'});
   if(responseAls.ok){
    const registry=await responseAls.json();
    if(Array.isArray(registry.items))alsRegistry=registry;
   }
  }catch(err){console.warn('ALS indisponível:',err)}
  try{
   const result=await fetch('./data/activity.json?refresh='+Date.now(),{cache:'no-store'});
   if(result.ok){const record=await result.json();if(Array.isArray(record.items))activityRegistry=record}
  }catch(err){console.warn('Atividade de fonte indisponível:',err)}

 }
 mount();window.dispatchEvent(new Event('als:mounted'))}
 catch(err){console.error(err);$('#app').innerHTML='<main class="not-found"><h1>Dados indisponíveis</h1><a href="./index.html">← Voltar à Central</a></main>'}
}
load();
