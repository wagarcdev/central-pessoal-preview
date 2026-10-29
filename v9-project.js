(()=>{'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const asset=v=>/^assets\/[a-z0-9-]+\.webp$/.test(v||'')?'./'+v:null;
const url=v=>{try{const u=new URL(v);return u.protocol==='https:'?u.href:null}catch{return null}};
async function init(){
const id=new URLSearchParams(location.search).get('id');if(!id)return;
let db,events;try{[db,events]=await Promise.all([fetch('./data/dashboard.json').then(r=>r.json()),fetch('./data/activity.json').then(r=>r.ok?r.json():null)])}catch{return}
const item=db.items?.find(x=>x.id===id);if(!item)return;
let attempts=0;
const timer=setInterval(()=>{const head=document.querySelector('.identity'),main=document.querySelector('.main');if(!head||!main){if(++attempts>30)clearInterval(timer);return}clearInterval(timer);
const image=asset(item.media?.src)||asset(item.brand?.src);head.classList.add('v9-hero');
if(image){const img=document.createElement('img');img.className='v9-hero-bg';img.src=image;img.alt='';head.prepend(img)}
const metrics=document.createElement('div');metrics.className='v9-metrics';
const groups=[...new Set((item.tasks||[]).map(t=>t.group||'Geral'))];
const verified=(events?.items||[]).filter(x=>x.id===id&&x.status==='verified'&&x.lastEvent?.kind==='commit');
metrics.innerHTML='<div class="v9-metric"><small>Áreas</small><strong>'+groups.length+'</strong></div><div class="v9-metric"><small>Eventos Git</small><strong>'+verified.length+'</strong></div><div class="v9-metric"><small>Estado da IA</small><strong>Ver painel</strong></div>';
head.append(metrics);
const pipeline=document.createElement('section');pipeline.className='v9-pipeline';pipeline.id='v9-pipeline';
pipeline.innerHTML='<h2>Pipeline por área</h2><p>Atividades existentes na fonte canônica. Percentuais apenas com evidência de medição; ausência não significa 0%.</p>'+
groups.map((g,i)=>{const tasks=(item.tasks||[]).filter(t=>(t.group||'Geral')===g),done=tasks.filter(t=>t.state==='done'),rest=tasks.filter(t=>t.state!=='done');
const measured=tasks.length>0&&tasks.every(t=>typeof t.progress==='number'&&Number.isFinite(t.progress)&&t.progress>=0&&t.progress<=100&&(db.dataset==='fictitious-public-demo'||t.progressEvidence||t.lastUpdate?.evidence));
const pct=measured?Math.round(tasks.reduce((n,t)=>n+t.progress,0)/tasks.length):null;
return '<details class="v9-area"><summary><div class="v9-area-head"><span>◈ '+esc(g)+'</span><span>'+ (pct===null?'Sem medição':pct+'%') +' · '+done.length+'/'+tasks.length+' tarefas registradas</span></div><div class="v9-area-bar">'+(pct===null?'':'<div class="v9-area-fill" style="width:'+pct+'%"></div>')+'</div></summary><div class="v9-area-detail"><strong>Atividades e próximos passos</strong><ul>'+tasks.map(t=>'<li>'+esc(t.title)+' — '+esc(({done:'Concluída',waiting:'Aguardando',pending:'Pendente',in_progress:'Em andamento'})[t.state]||'Sem estado')+'</li>').join('')+'</ul><div class="v9-action">'+(rest.length?rest.length+' tarefa(s) não concluída(s).':'Nenhuma tarefa aberta registrada nesta área.')+'</div><a href="#tasks">Consultar tarefas e critérios ↗</a></div></details>'}).join('');
const tasksSection=main.querySelector('#tasks');if(tasksSection)main.insertBefore(pipeline,tasksSection);else main.append(pipeline);
const entry=verified[0];if(entry?.lastEvent?.at){const section=document.createElement('section');section.className='v9-pipeline v9-project-events';section.innerHTML='<h2>Log de atividades</h2><div class="v9-feed-list"><details class="v9-event"><summary><span class="v9-title">◆ Commit '+esc((entry.lastEvent.sha||'').slice(0,8))+'</span><time>'+new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',timeZone:'America/Sao_Paulo'}).format(new Date(entry.lastEvent.at))+'</time></summary><div class="v9-event-body">Evidência de alteração de repositório, não de aprovação de tarefa.'+(url(entry.lastEvent.url)?'<br><a href="'+esc(entry.lastEvent.url)+'" target="_blank" rel="noopener noreferrer">Abrir evidência ↗</a>':'')+'</div></details></div>';main.insertBefore(section,tasksSection||pipeline.nextSibling)}
},150);
}
document.addEventListener('DOMContentLoaded',init);
})();