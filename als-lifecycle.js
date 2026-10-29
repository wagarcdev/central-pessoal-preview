'use strict';
// ALS Lifecycle v0.2: evidence-led read-only projection, never infer percentages.
(function(){
const stages=[['rnd','P&D'],['product','Produto'],['ux','UX / Design'],['engineering','Engenharia'],['qa','QA'],['growth','Growth'],['operations','Operações']];
const states={unknown:'Sem dados',pending:'Pendente',active:'Em execução',approved:'Aprovado',blocked:'Bloqueado',waived:'Dispensado'};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const url=v=>{try{const u=new URL(v);return u.protocol==='https:'?u.href:null}catch{return null}};
const evidenceLink=(e,label)=>url(e)?'<a target="_blank" rel="noopener noreferrer" href="'+esc(url(e))+'">'+esc(label)+' ↗</a>':'';
function stageRow(id,label,entry){
 const s=entry.stages?.[id]||{};
 const status=Object.hasOwn(states,s.status)?s.status:'unknown';
 const evidence=url(s.evidence);
 const validApproved=status==='approved'&&!!evidence;
 const visualState=status==='approved'&&!evidence?'unknown':status;
 const text=status==='approved'&&!evidence?'Sem comprovação':states[visualState];
 const progress=validApproved?100:null; // Do not render fake fractional progress.
 const track=progress===100?'<span class="wl-fill" style="width:100%"></span>':(visualState==='active'?'<span class="wl-indicator" aria-hidden="true"></span>':'');
 return '<div class="wl-pipeline-row" data-state="'+visualState+'"><div class="wl-stage-label">'+'<img class="wl-stage-icon" src="./assets/als-icons/'+id+'.svg" alt="" loading="lazy"><span>'+esc(label)+'</span></div>'+
 '<div class="wl-track" role="img" aria-label="'+esc(label+': '+text)+'">'+track+'</div>'+
 '<div class="wl-stage-state">'+esc(text)+'</div></div>';
}
function metric(value,label,detail){return '<div class="wl-metric"><strong>'+esc(value)+'</strong><span>'+esc(label)+'</span>'+(detail?'<small>'+esc(detail)+'</small>':'')+'</div>'}
function notice(kind,title,description,evidence){
 return '<div class="wl-notice" data-kind="'+kind+'"><span class="wl-notice-icon" aria-hidden="true">'+(kind==='blocker'?'!':'↗')+'</span><div><strong>'+esc(title)+'</strong><p>'+esc(description||'Sem descrição adicional')+'</p>'+evidenceLink(evidence,'Abrir evidência')+'</div></div>';
}
function render(subject,entry){
 const documented=(xs)=>Array.isArray(xs)?xs.filter(x=>x&&x.title&&url(x.evidence)):[];
 const blocks=documented(entry.blockers),decisions=documented(entry.decisions);
 const gates=Object.values(entry.stages||{});
 const approved=gates.filter(s=>s.status==='approved'&&url(s.evidence)).length;
 const active=gates.filter(s=>s.status==='active'&&url(s.evidence)).length;
 const unknown=stages.length-approved-active-gates.filter(s=>['blocked','pending','waived'].includes(s.status)&&url(s.evidence)).length;
 const invalid=gates.filter(s=>s.status==='approved'&&!url(s.evidence)).length;
 const next=entry.nextDelivery&&entry.nextDelivery.title&&url(entry.nextDelivery.evidence)?entry.nextDelivery:null;
 const curatedAction=subject?.nextAction||null;
 const source=url(entry.sourceUrl);
 const details=stages.map(([id,label])=>{const s=entry.stages?.[id];return s&&url(s.evidence)?'<li>'+esc(label)+': '+evidenceLink(s.evidence,'Fonte do estado')+'</li>':''}).filter(Boolean);
 return '<section class="als-lifecycle" id="als-lifecycle" aria-label="ALS Lifecycle do produto">'+
 '<div class="wl-heading"><div><h2>ALS Lifecycle</h2><p class="wl-sub">Evolução do produto · informações rastreáveis</p></div><span class="wl-status-chip">Governança ALS</span></div>'+
 '<div class="wl-metric-grid">'+metric(approved+'/'+stages.length,'Gates aprovados','Somente com evidência')+metric(active,'Etapas ativas','Documentadas')+metric(unknown,'Sem dados','Não inferidas')+'</div>'+
 '<h3>Pipeline de evolução</h3><div class="wl-pipeline">'+stages.map(([id,label])=>stageRow(id,label,entry)).join('')+'</div>'+
 '<p class="wl-legend">Verde: gate aprovado com evidência · Azul: atividade registrada · Cinza: sem medição de avanço</p>'+
 '<div class="wl-notices">'+
 (blocks.length?blocks.map(b=>notice('blocker',b.title,b.description,b.evidence)).join(''):notice('neutral','Nenhum bloqueio documentado','Isso não comprova ausência de impedimentos.'))+
 (next?notice('next','Próxima entrega: '+next.title,next.description,next.evidence):notice('next',curatedAction?'Próxima ação (planejada)':'Próxima entrega não registrada',curatedAction||'Aguardando marco documentado e fonte verificável.'))+
 (decisions.length?decisions.map(d=>notice('decision','Decisão pendente: '+d.title,d.description,d.evidence)).join(''):'')+
 '</div><div class="wl-footer"><span>'+approved+' gate(s) aprovado(s) com evidência'+(invalid?' · '+invalid+' aprovação(ões) sem comprovação':'')+'</span>'+
 '<details><summary>Fontes e handoffs</summary><ul>'+(source?'<li>'+evidenceLink(source,'Fonte do produto')+'</li>':'')+
 (details.length?details.join(''):'<li>Nenhuma evidência de gate vinculada.</li>')+'</ul></details></div>'+
 '<p class="wl-disclaimer">Dados não informados permanecem desconhecidos. Commits não aprovam gates; barras não representam percentuais presumidos.</p></section>';
}
async function load(){
 const root=document.querySelector('.main');if(!root)return;
 const id=new URLSearchParams(location.search).get('id');if(!id)return;
 try{
  const db=await fetch('./data/dashboard.json',{cache:'no-store'}).then(r=>r.json());
  if(db.dataset==='fictitious-public-demo'||!db.items?.some(i=>i.id===id))return;
  const response=await fetch('./data/lifecycle.json',{cache:'no-store'});if(!response.ok)return;
  const lifecycle=await response.json(),entry=lifecycle.items?.find(e=>e.id===id);
  if(!entry)return;
  const anchor=root.querySelector('.tasks-section');
  if(anchor&&!root.querySelector('.als-lifecycle')){
   anchor.insertAdjacentHTML('beforebegin',render(db.items.find(x=>x.id===id),entry));
   const nav=root.querySelector('.module-nav');
   if(nav&&!nav.querySelector('[href="#als-lifecycle"]'))nav.querySelector('[href="#tasks"]')?.insertAdjacentHTML('beforebegin','<a href="#als-lifecycle">ALS Lifecycle</a>');
  }
 }catch(err){console.warn('ALS Lifecycle indisponível:',err)}
}
window.addEventListener('als:mounted',load);
})();
