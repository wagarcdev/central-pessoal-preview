(()=>{'use strict';
const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const asset=v=>/^assets\/[a-z0-9-]+\.webp$/.test(v||'')?'./'+v:null;
async function init(){
const tiles=document.querySelector('#tiles');if(!tiles)return;
const feed=document.createElement('section');feed.className='v9-feed';feed.innerHTML='<h2>◷ Atividade recente</h2><div class="v9-feed-list"><div class="v9-empty">Carregando eventos verificados...</div></div>';
const main=document.querySelector('.main');main.insertBefore(feed,main.firstChild);
try{
const [data,events]=await Promise.all([fetch('./data/dashboard.json').then(r=>r.json()),fetch('./data/activity.json').then(r=>r.ok?r.json():null)]);
const items=Array.isArray(data.items)?data.items:[];
const rows=(events?.items||[]).filter(x=>x.status==='demo'&&x.lastEvent?.at&&x.lastEvent?.kind==='commit').map(x=>({...x,item:items.find(y=>y.id===x.id)})).filter(x=>x.item&&Number.isFinite(Date.parse(x.lastEvent.at))).sort((a,b)=>Date.parse(b.lastEvent.at)-Date.parse(a.lastEvent.at));
const el=feed.querySelector('.v9-feed-list');
el.innerHTML=rows.length?rows.map(x=>{
const d=new Date(x.lastEvent.at),when=new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',timeZone:'America/Sao_Paulo'}).format(d);
const link=/^https:\/\/github\.com\//.test(x.lastEvent.url||'')?x.lastEvent.url:null;
return '<details class="v9-event"><summary><span aria-hidden="true" style="color:#fb923c">◆</span><span class="v9-name">'+safe(x.item.shortTitle||x.item.title)+'</span><span class="v9-title">Evento demonstrativo '+safe((x.lastEvent.sha||'').slice(0,8))+'</span><time>'+when+'</time></summary><div class="v9-event-body">Evento fictício para avaliação visual; não representa atividade real.'+(link?'<br><a target="_blank" rel="noopener noreferrer" href="'+safe(link)+'">Abrir commit ↗</a>':'')+'<br><a href="./project.html?id='+encodeURIComponent(x.id)+'">Abrir projeto ↗</a></div></details>'}).join(''):'<div class="v9-empty">Nenhum evento Git verificado disponível. Outras integrações ainda não conectadas.</div>';
}catch{feed.querySelector('.v9-feed-list').textContent='Atividades indisponíveis; sem eventos presumidos.'}
}
document.addEventListener('DOMContentLoaded',init);
})();