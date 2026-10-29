'use strict';
const $ = selector=>document.querySelector(selector);
const escapeHTML = s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const labels={tech:'Tecnologia',legal:'Jurídico',property:'Imóveis',business:'Negócios',personal:'Pessoal'};
const statusLabels={attention:'SUA VEZ',active:'NO PLANO',watch:'EM ESPERA',done:'CONCLUÍDO'};
const taskLabels={done:'Concluída',in_progress:'Em andamento',pending:'Pendente',waiting:'Aguardando'};
const mediaPath=src=>/^assets\/[a-z0-9-]+\.webp$/.test(src||'')?'./'+src:null;
const externalUrl=src=>{try{const u=new URL(src);return u.protocol==='https:'?u.href:null}catch{return null}};
let database={items:[],updatedAt:null,version:'0.3'},activity=null,view='all',search='',selected=null,lastFocus=null,timer;
const calendarDays=date=>{if(!date)return null;const d=new Date(date+'T12:00:00');if(Number.isNaN(d.getTime()))return null;const n=new Date();n.setHours(12,0,0,0);return Math.round((d-n)/86400000)};
function attention(item){
 const dates=[item.dueDate,...(item.tasks||[]).filter(t=>t.state!=='done').map(t=>t.dueDate)].map(calendarDays);
 return agentStatus(item).css==='waiting'||item.status==='attention'||(dates.some(d=>d!==null&&d<=7)&&item.status!=='done')
}
function model(item){const tasks=Array.isArray(item.tasks)?item.tasks:[];return{tasks,total:tasks.length,done:tasks.filter(x=>x.state==='done').length,busy:tasks.filter(x=>x.state==='in_progress').length}}
function photo(item){return mediaPath(item.media?.src)||'./assets/office.webp'}
function displayTitle(item){return item.shortTitle||String(item.title||'Sem título').split(' · ')[0]}
const homeIcon = paths=>'<svg viewBox="0 0 24 24" width="38" height="38" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+paths+'</svg>';
const categoryGlyphs={
 tech:homeIcon('<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M9 9h6v6H9zM9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3"/>'),
 legal:homeIcon('<path d="M12 3v18M5 7h14M7 7l-4 7h8L7 7zM17 7l-4 7h8l-4-7zM7 21h10"/>'),
 property:homeIcon('<path d="m3 11 9-8 9 8v10H3zM9 21v-7h6v7"/>'),
 business:homeIcon('<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M9 7V4h6v3M3 13h18M11 12v3h2v-3"/>'),
 personal:homeIcon('<circle cx="12" cy="8" r="4"/><path d="M4 21c0-9 16-9 16 0"/>')
};
const inferenceStates={
  processing:{label:'INFERINDO',css:'processing'},
  waiting_input:{label:'PRECISA DE VOCÊ',css:'waiting'},
  completed:{label:'CONCLUÍDA',css:'completed'},
  idle:{label:'OCIOSO',css:'idle'},
  unmonitored:{label:'SEM TELEMETRIA',css:'unmonitored'}
};
function agentStatus(item){
  // Never infer live telemetry from project activity or completed milestones.
  const telemetry=item.inference;
  if(!telemetry||telemetry.state==='unmonitored')return inferenceStates.unmonitored;
  // Stale or unverified data is never displayed as an active inference.
  if(database.dataset!=='fictitious-public-demo'){
    const until=Date.parse(telemetry.expiresAt||'');
    const since=Date.parse(telemetry.observedAt||'');
    if(!Number.isFinite(until)||!Number.isFinite(since)||until<Date.now()||since>Date.now()+60000||!telemetry.source||!telemetry.reference)return inferenceStates.unmonitored;
  }
  return inferenceStates[telemetry.state]||inferenceStates.unmonitored;
}
function taskProgress(item){
  const tasks=model(item).tasks;
  const task=tasks.find(t=>t.state==='in_progress')||tasks.find(t=>t.state==='pending')||tasks.find(t=>t.state==='waiting');
  // Progress only comes from an explicitly measured task.progress; never from total project milestones.
  const measured=database.dataset==='fictitious-public-demo'||Boolean(task?.progressEvidence||task?.lastUpdate?.evidence);
  const value=task && measured && typeof task.progress==='number' && Number.isFinite(task.progress)?Math.max(0,Math.min(100,task.progress)):null;
  return {task,value};
}
function activityTimestamp(item){
 const verified=activity?.items?.find(x=>x.id===item.id&&x.status==='verified');
 // A Git commit is evidence of repository activity, never active inference.
 const candidates=[verified?.lastEvent?.at,item.lastActivityAt,item.lastUpdatedAt,item.updatedAt,item.lastUpdate?.at];
 for(const value of candidates){const at=Date.parse(value||'');if(Number.isFinite(at))return at;}
 return 0;
}
function sortList(items){return [...items].sort((a,b)=>activityTimestamp(b)-activityTimestamp(a)||displayTitle(a).localeCompare(displayTitle(b),'pt-BR'))}
async function refreshLocalTelemetry(){
 if(database.dataset==='fictitious-public-demo')return;
 try{
  const response=await fetch('./local-telemetry.json?t='+Date.now(),{cache:'no-store'});
  if(!response.ok)return;
  const feed=await response.json(),when=Date.parse(feed.observedAt||'');
  if(!Number.isFinite(when)||Date.now()-when>45000)return;
  const found=(feed.items||[]).filter(x=>x.state==='process_detected');
  const node=$('.connection');
  if(node)node.textContent=found.length+' PROCESSOS LOCAIS DETECTADOS (nao e inferencia)';
 }catch{}
}
function activityText(id){
 const v=activity?.items?.find(x=>x.id===id && x.status==='verified');
 if(!v||!v.lastEvent?.at)return '';
 const date=new Date(v.lastEvent.at);
 if(Number.isNaN(date.getTime()))return '';
 const rendered=new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',timeZone:'America/Sao_Paulo'}).format(date);
 return 'GIT · '+rendered;
}
function tile(item){
  const status=agentStatus(item),progress=taskProgress(item);
  const label=labels[item.area]||item.area;
  const pct=progress.value;
  const alert=attention(item);
  return '<article class="module" id="item-'+escapeHTML(item.id)+'"><button type="button" class="module-button" data-id="'+escapeHTML(item.id)+'" aria-label="Abrir dashboard de '+escapeHTML(item.title)+'">'+
    '<span class="module-inference status-'+status.css+'">'+
      '<span class="cat-glyph" aria-hidden="true">'+(categoryGlyphs[item.area]||categoryGlyphs.tech)+'</span>'+
      '<span class="cat-label">'+escapeHTML(label)+'</span>'+
      '<span class="signal-state" aria-label="Estado de inferência: '+escapeHTML(status.label)+'"><i aria-hidden="true"></i><span class="signal-copy"><small>STATUS DA IA</small><strong>'+escapeHTML(status.label)+'</strong></span></span>'+
    '</span>'+
    '<span class="module-main">'+
      '<img class="module-image" src="'+escapeHTML(photo(item))+'" alt="'+escapeHTML(item.media?.alt||item.title)+'" loading="lazy" decoding="async">'+
      '<span class="module-shade"></span>'+
      '<span class="module-title">'+escapeHTML(displayTitle(item))+'</span>'+
      (activityText(item.id)?'<span class="module-activity" aria-label="Último registro verificado: '+escapeHTML(activityText(item.id))+'">'+escapeHTML(activityText(item.id))+'</span>':'')+
      (alert?'<span class="attention-pip" title="Sua intervenção necessária" aria-label="Sua intervenção necessária">!</span>':'')+
      '<span class="progress-wrap">'+
        '<span class="progress-track'+(pct===null?' progress-unmeasured':'')+'" role="progressbar" aria-label="Progresso medido da tarefa atual em '+escapeHTML(displayTitle(item))+'"'+(pct===null?' aria-valuetext="Sem medição disponível"':' aria-valuenow="'+pct+'" aria-valuemin="0" aria-valuemax="100"')+'>'+
          '<span class="progress-fill" data-percent="'+(pct===null?0:pct)+'"></span>'+
        '</span>'+
        '<span class="progress-note">'+(pct===null?'PROGRESSO NÃO MEDIDO':pct+'% DA TAREFA')+'</span>'+
      '</span>'+
    '</span></button></article>';
}
function render(){
 const list=sortList(database.items.filter(item=>(view==='all'||(view==='attention'?attention(item):item.status==='watch')) && (displayTitle(item)+' '+item.title+' '+item.summary+' '+(labels[item.area]||'')).toLocaleLowerCase('pt-BR').includes(search)));
 $('#need-count').textContent=database.items.filter(attention).length;
 const providerCount=activity?.items?.filter(x=>x.status==='verified').length||0;
 if(database.dataset!=='fictitious-public-demo'&&providerCount){
   const node=$('.connection');
   if(node)node.innerHTML='<i aria-hidden="true"></i> '+providerCount+' FONTES GIT';
 }

 $('#list-label').textContent=view==='all'?'TODOS OS MÓDULOS':view==='watch'?'NO RADAR':'INTERVENÇÃO NECESSÁRIA';
 $('#tiles').innerHTML=list.length?list.map(tile).join(''):'<div class="empty">Nenhum módulo encontrado neste filtro.</div>';
 document.querySelectorAll('.progress-fill').forEach(el=>{el.style.width=Math.max(0,Math.min(100,Number(el.dataset.percent)||0))+'%'});
 document.querySelectorAll('[data-id]').forEach(el=>el.addEventListener('click',()=>{location.href='./project.html?id='+encodeURIComponent(el.dataset.id)}));
 const target=location.hash&&document.getElementById(location.hash.slice(1));if(target){target.classList.add('return-target');target.scrollIntoView({block:'center'})}
 document.querySelectorAll('[data-view]').forEach(el=>{el.classList.toggle('selected',el.dataset.view===view);el.setAttribute('aria-pressed',String(el.dataset.view===view))});
 const d=database.updatedAt?.slice(0,10);$('#updated').textContent=d?'SNAPSHOT · '+new Date(d+'T12:00:00').toLocaleDateString('pt-BR'):'Snapshot estático';
 $('#version').textContent='CENTRAL / V'+(database.version||'0.3');
}
function groupTasks(tasks,state){
 const group=tasks.filter(t=>t.state===state);
 if(!group.length)return '';
 const label=state==='in_progress'?'EM ANDAMENTO':state==='pending'?'NA FILA':state==='waiting'?'AGUARDANDO':'REGISTRADAS COMO CONCLUÍDAS';
 return '<h3 class="detail-section-title">'+label+' · '+group.length+'</h3>'+group.map(t=>{
 const safe=externalUrl(t.link?.url);
 return '<div class="task '+escapeHTML(state)+'"><button class="task-toggle" type="button" aria-expanded="false" data-task="'+escapeHTML(t.id)+'"><span class="task-symbol">'+(state==='done'?'✓':state==='in_progress'?'◑':state==='waiting'?'⌛':'○')+'</span><span class="task-title">'+escapeHTML(t.title)+'</span><span class="task-state">'+escapeHTML(taskLabels[state])+'</span></button>'+
 '<div class="task-details" hidden><p>'+escapeHTML(t.detail||t.title)+'</p>'+(safe?'<a class="task-link" target="_blank" rel="noopener noreferrer" href="'+escapeHTML(safe)+'">Abrir recurso ↗</a>':'')+'</div></div>';
 }).join('')
}
function openModule(id){
 const item=database.items.find(x=>x.id===id);
 if(!item)return;
 selected=id;lastFocus=document.activeElement;
 const m=model(item),pct=m.total?Math.round(100*m.done/m.total):0;
 const logo=mediaPath(item.brand?.src),mainLink=externalUrl(item.link?.url);
 const content='<div class="detail-grid"><section class="detail-cover">'+
 '<img src="'+escapeHTML(photo(item))+'" alt="'+escapeHTML(item.media?.alt||item.title)+'">'+
 (logo?'<img class="detail-brand" src="'+escapeHTML(logo)+'" alt="" aria-hidden="true">':'')+
 '<div class="detail-overlay"><span class="area">'+escapeHTML(labels[item.area]||item.area).toUpperCase()+'</span>'+
 '<h2 id="detail-title">'+escapeHTML(displayTitle(item))+'</h2><p>'+escapeHTML(item.subtitle||item.summary)+'</p>'+
 '<div class="detail-progress"><i data-percent="'+(taskProgress(item).value??0)+'"></i></div></div></section>'+
 '<section class="detail-content"><div class="detail-head"><span class="detail-kicker">MÓDULO / TAREFAS</span><button id="close" class="close" aria-label="Fechar painel">✕</button></div>'+
 '<div class="progress-caption"><span>ETAPAS CONCLUÍDAS: '+m.done+' / '+m.total+'</span><span>TAREFA ATUAL: '+(taskProgress(item).value===null?'SEM MEDIÇÃO':taskProgress(item).value+'%')+'</span></div>'+
 (m.total?['in_progress','pending','waiting','done'].map(state=>groupTasks(m.tasks,state)).join(''):'<p class="detail-note">Ainda não foram definidas etapas verificáveis para este módulo.</p>')+
 '<div class="actions">'+(mainLink?'<a class="primary" target="_blank" rel="noopener noreferrer" href="'+escapeHTML(mainLink)+'">Abrir '+escapeHTML(item.link.label||'recurso')+' ↗</a>':'')+
 '<button class="secondary" id="copy" type="button">Copiar contexto ↗</button></div>'+
 '<p class="context-note">Snapshot estático do GitHub. As etapas são um planejamento inicial, não atividade monitorada em tempo real. Alterações são versionadas no repositório.</p>'+
 '</section></div>';
 $('#detail-root').innerHTML=content;$('#detail-root .detail-progress i').style.width=(taskProgress(item).value??0)+'%';$('#overlay').hidden=false;document.body.style.overflow='hidden';
 $('#close').addEventListener('click',closeModule);$('#close').focus();
 document.querySelectorAll('[data-task]').forEach(button=>button.addEventListener('click',()=>{
   const panel=button.nextElementSibling,was=!panel.hidden;
   panel.hidden=was;button.setAttribute('aria-expanded',String(!was));
 }));
 $('#copy').addEventListener('click',async()=>{
   const details=[item.title,item.summary,item.nextAction,...m.tasks.map(t=>'['+taskLabels[t.state]+'] '+t.title)].join('\n');
   try{await navigator.clipboard.writeText(details);toast('Contexto copiado')}catch{toast('A cópia não está disponível')}
 });
}
function closeModule(){selected=null;$('#overlay').hidden=true;document.body.style.overflow='';lastFocus?.focus?.()}
function toast(message){const t=$('#toast');t.textContent=message;t.classList.add('show');clearTimeout(timer);timer=setTimeout(()=>t.classList.remove('show'),2500)}
async function load(){
 try{const r=await fetch('./data/dashboard.json?cache='+Date.now(),{cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status);
 const json=await r.json();if(!Array.isArray(json.items))throw Error('Invalid JSON schema');
 database=json;
 activity=null;
 if(json.dataset!=='fictitious-public-demo'){
   try{
    const live=await fetch('./data/activity.json?t='+Date.now(),{cache:'no-store'});
    if(live.ok){const feed=await live.json();if(Array.isArray(feed.items))activity=feed}
   }catch(err){console.warn('Dados de atividade indisponíveis',err)}
 }
 render();await refreshLocalTelemetry();return true
 }catch(e){console.error(e);$('#tiles').innerHTML='<div class="empty">Não foi possível carregar os dados. Tente atualizar a página.</div>';return false}
}
document.querySelectorAll('[data-view]').forEach(el=>el.addEventListener('click',()=>{view=el.dataset.view;render()}));
$('#search').addEventListener('input',e=>{search=e.target.value.trim().toLocaleLowerCase('pt-BR');render()});
$('#reload').addEventListener('click',async()=>{if(await load())toast('Snapshot atualizado')});
$('#veil').addEventListener('click',closeModule);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#overlay').hidden)closeModule()});
load();

setInterval(refreshLocalTelemetry,15000);
