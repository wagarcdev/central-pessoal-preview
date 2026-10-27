'use strict';
const $ = selector=>document.querySelector(selector);
const escapeHTML = s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const labels={tech:'Tecnologia',legal:'Jurídico',property:'Imóveis',business:'Negócios',personal:'Pessoal'};
const statusLabels={attention:'SUA VEZ',active:'NO PLANO',watch:'EM ESPERA',done:'CONCLUÍDO'};
const taskLabels={done:'Concluída',in_progress:'Em andamento',pending:'Pendente',waiting:'Aguardando'};
const mediaPath=src=>/^assets\/[a-z0-9-]+\.webp$/.test(src||'')?'./'+src:null;
const externalUrl=src=>{try{const u=new URL(src);return u.protocol==='https:'?u.href:null}catch{return null}};
let database={items:[],updatedAt:null,version:'0.3'},view='all',search='',selected=null,lastFocus=null,timer;
const calendarDays=date=>{if(!date)return null;const d=new Date(date+'T12:00:00');if(Number.isNaN(d.getTime()))return null;const n=new Date();n.setHours(12,0,0,0);return Math.round((d-n)/86400000)};
function attention(item){const delta=calendarDays(item.dueDate);return item.status==='attention'||(delta!==null&&delta<=7&&item.status!=='done')}
function model(item){const tasks=Array.isArray(item.tasks)?item.tasks:[];return{tasks,total:tasks.length,done:tasks.filter(x=>x.state==='done').length,busy:tasks.filter(x=>x.state==='in_progress').length}}
function photo(item){return mediaPath(item.media?.src)||'./assets/office.webp'}
function displayTitle(item){return item.shortTitle||String(item.title||'Sem título').split(' · ')[0]}
function sortList(items){return [...items].sort((a,b)=>{const r=x=>attention(x)?0:x.status==='active'?1:x.status==='watch'?2:3;return r(a)-r(b)||displayTitle(a).localeCompare(displayTitle(b),'pt-BR')})}
function tile(item){
 const m=model(item),pct=m.total?Math.round(m.done*100/m.total):0;
 const flagged=attention(item);
 const type=flagged?'attention':item.status==='active'?'active':'watch';
 const badge=flagged?'!':item.status==='active'?'▶':'◌';
 const slogan=item.subtitle||String(item.title||'').split(' · ').slice(1).join(' · ');
 const progressCaption=m.total?m.done+'/'+m.total+' ETAPAS':'ETAPAS A DEFINIR';
 const logo=mediaPath(item.brand?.src);
 return '<article class="module'+(logo?' has-brand':'')+'"><button class="module-button" data-id="'+escapeHTML(item.id)+'" aria-label="Abrir '+escapeHTML(item.title)+'">'+
 '<img class="module-image" src="'+escapeHTML(photo(item))+'" alt="'+escapeHTML(item.media?.alt||item.title)+'" loading="lazy" decoding="async">'+
 '<span class="module-shade"></span>'+
 (logo?'<img class="module-logo" src="'+escapeHTML(logo)+'" alt="" aria-hidden="true">':'')+
 '<span class="module-top"><span class="module-area">'+escapeHTML(labels[item.area]||item.area)+'</span>'+
 '<span class="module-flag status-'+type+'" title="'+escapeHTML(statusLabels[flagged?'attention':item.status]||'Acompanhar')+'">'+badge+'</span></span>'+
 '<span class="module-text"><span class="module-title">'+escapeHTML(displayTitle(item))+'</span>'+
 '<span class="module-subtitle">'+escapeHTML(slogan||item.summary)+'</span></span>'+
 '<span class="module-footer"><span>'+escapeHTML(progressCaption)+'</span><span class="right" aria-hidden="true">⌄</span></span>'+
 '<span class="module-progress" data-progress="'+(pct===0?'zero':'measured')+'" role="progressbar" aria-label="Etapas concluídas de '+escapeHTML(displayTitle(item))+'" aria-valuenow="'+m.done+'" aria-valuemin="0" aria-valuemax="'+m.total+'"><i style="width:'+pct+'%"></i></span>'+
 '</button></article>';
}
function render(){
 const list=sortList(database.items.filter(item=>(view==='all'||(view==='attention'?attention(item):item.status==='watch')) && (displayTitle(item)+' '+item.title+' '+item.summary+' '+(labels[item.area]||'')).toLocaleLowerCase('pt-BR').includes(search)));
 $('#need-count').textContent=database.items.filter(attention).length;
 $('#list-label').textContent=view==='all'?'TODOS OS MÓDULOS':view==='watch'?'NO RADAR':'INTERVENÇÃO NECESSÁRIA';
 $('#tiles').innerHTML=list.length?list.map(tile).join(''):'<div class="empty">Nenhum módulo encontrado neste filtro.</div>';
 document.querySelectorAll('[data-id]').forEach(el=>el.addEventListener('click',()=>openModule(el.dataset.id)));
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
 '<div class="detail-progress"><i style="width:'+pct+'%"></i></div></div></section>'+
 '<section class="detail-content"><div class="detail-head"><span class="detail-kicker">MÓDULO / TAREFAS</span><button id="close" class="close" aria-label="Fechar painel">✕</button></div>'+
 '<div class="detail-note">'+escapeHTML(item.nextAction||item.summary)+'</div><div class="progress-caption"><span>'+m.done+' de '+m.total+' etapas registradas concluídas</span><span>'+(m.total?pct+'% das etapas':'Sem medição')+'</span></div>'+
 (m.total?['in_progress','pending','waiting','done'].map(state=>groupTasks(m.tasks,state)).join(''):'<p class="detail-note">Ainda não foram definidas etapas verificáveis para este módulo.</p>')+
 '<div class="actions">'+(mainLink?'<a class="primary" target="_blank" rel="noopener noreferrer" href="'+escapeHTML(mainLink)+'">Abrir '+escapeHTML(item.link.label||'recurso')+' ↗</a>':'')+
 '<button class="secondary" id="copy" type="button">Copiar contexto ↗</button></div>'+
 '<p class="context-note">Snapshot estático do GitHub. As etapas são um planejamento inicial, não atividade monitorada em tempo real. Alterações são versionadas no repositório.</p>'+
 '</section></div>';
 $('#detail-root').innerHTML=content;$('#overlay').hidden=false;document.body.style.overflow='hidden';
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
 database=json;render();return true
 }catch(e){console.error(e);$('#tiles').innerHTML='<div class="empty">Não foi possível carregar os dados. Tente atualizar a página.</div>';return false}
}
document.querySelectorAll('[data-view]').forEach(el=>el.addEventListener('click',()=>{view=el.dataset.view;render()}));
$('#search').addEventListener('input',e=>{search=e.target.value.trim().toLocaleLowerCase('pt-BR');render()});
$('#reload').addEventListener('click',async()=>{if(await load())toast('Snapshot atualizado')});
$('#veil').addEventListener('click',closeModule);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#overlay').hidden)closeModule()});
load();
