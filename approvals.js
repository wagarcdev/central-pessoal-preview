'use strict';
/* Approval Center V10: deterministic read-only projection. No synthetic approvals. */
(() => {
 const safe = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const url = s => {try{const u=new URL(s,location.href);return (u.protocol==='https:'||u.origin===location.origin&&u.protocol==='http:')?u.href:null}catch{return null}};
 const allowed = new Set(['audio','image','video','pdf','document','text','code','ui']);
 let records=[];
 function preview(a){
  if(!a||!allowed.has(a.type))return '<p class="ap-unavailable">Formato sem prévia.</p>';
  const src=url(a.url);
  if(!src)return '<p class="ap-unavailable">Arquivo indisponível. Abra o contexto da pendência.</p>';
  const label=safe(a.label||a.type);
  if(a.type==='audio')return '<div class="ap-asset"><span>'+label+'</span><audio controls preload="none" src="'+safe(src)+'"></audio></div>';
  if(a.type==='image')return '<button class="ap-zoom" data-media="'+safe(src)+'" data-type="image" data-label="'+label+'"><img loading="lazy" alt="'+label+'" src="'+safe(src)+'"><span>Ampliar ⛶</span></button>';
  if(a.type==='video')return '<div class="ap-asset"><video controls playsinline preload="metadata" src="'+safe(src)+'"></video><button data-media="'+safe(src)+'" data-type="video" data-label="'+label+'">Tela cheia ⛶</button></div>';
  if(['pdf','document','text'].includes(a.type))return '<button class="ap-doc" data-media="'+safe(src)+'" data-type="'+safe(a.type)+'" data-label="'+label+'">▤ '+label+' · Abrir em tela cheia</button>';
  return '<a class="ap-doc" href="'+safe(src)+'" target="_blank" rel="noopener noreferrer">Abrir '+label+' ↗</a>';
 }
 function card(r){
  const state=r.status==='resolved'?'RESOLVIDA':'AGUARDANDO DECISÃO';
  const choices=r.status==='pending'&&r.revision?'<fieldset class="ap-choices"><legend>Selecione '+(r.selectionMode==='single'?'uma opção':'as opções')+'</legend>'+(r.artifacts||[]).filter(a=>a.id).map(a=>'<label><input type="'+(r.selectionMode==='single'?'radio':'checkbox')+'" name="ap-choice-'+safe(r.id)+'" value="'+safe(a.id)+'"> '+safe(a.label)+'</label>').join('')+'</fieldset>':'';
  const actions=r.status==='pending'&&r.revision?'<div class="ap-actions"><button class="ap-decision" data-id="'+safe(r.id)+'" data-revision="'+safe(r.revision)+'" data-action="approve">Aprovar</button><button class="ap-decision" data-id="'+safe(r.id)+'" data-revision="'+safe(r.revision)+'" data-action="reject">Rejeitar</button><button class="ap-decision" data-id="'+safe(r.id)+'" data-revision="'+safe(r.revision)+'" data-action="request_changes">Solicitar ajustes</button></div>':'';
  const links=[r.contextUrl,r.issueUrl].map((s,i)=>{const target=url(s);return target?'<a href="'+safe(target)+'" target="_blank" rel="noopener noreferrer">'+(i===0?'Abrir conversa':'Ver pendência no GitHub')+' ↗</a>':''}).join('');
  return '<article class="ap-card"><div class="ap-between"><span class="ap-tag">'+safe(r.kind||'REVISÃO')+'</span><span class="ap-state">'+state+'</span></div><h3>'+safe(r.title)+'</h3><p>'+safe(r.description||'')+'</p><div class="ap-grid">'+(r.artifacts||[]).map(preview).join('')+'</div>'+choices+actions+'<div class="ap-actions">'+links+'</div><small>Ref. '+safe(r.id)+' · '+safe(r.status==='resolved'?'Decisão registrada na origem':'A aprovação deve ser registrada no contexto original')+'</small></article>';
 }
 function modal(){
  let dialog=document.getElementById('ap-lightbox');
  if(dialog)return dialog;
  dialog=document.createElement('dialog');dialog.id='ap-lightbox';dialog.className='ap-lightbox';
  dialog.innerHTML='<div class="ap-modal-head"><strong id="ap-modal-title">Visualizador</strong><button id="ap-close" aria-label="Fechar">✕ Fechar</button></div><div id="ap-modal-body"></div>';
  document.body.append(dialog);
  dialog.querySelector('#ap-close').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close()});
  dialog.addEventListener('close',()=>{dialog.querySelector('#ap-modal-body').replaceChildren()});
  return dialog;
 }
 function openMedia(btn){
  const src=btn.dataset.media,kind=btn.dataset.type;
  if(!url(src))return;
  const d=modal(),body=d.querySelector('#ap-modal-body');body.replaceChildren();
  d.querySelector('#ap-modal-title').textContent=btn.dataset.label||'Visualizador';
  let el;
  if(kind==='image'){el=document.createElement('img');el.alt=btn.dataset.label||'Imagem';}
  else if(kind==='video'){el=document.createElement('video');el.controls=true;el.playsInline=true;el.autoplay=false;}
  else if(kind==='text'){el=document.createElement('iframe');el.title='Documento de texto';el.setAttribute('sandbox','');}
  else {el=document.createElement('iframe');el.title='Visualizador de documento';el.setAttribute('sandbox','allow-same-origin');}
  el.src=src;body.append(el);d.showModal();
 }
 function render(){
  const host=document.querySelector('.main');const projectId=new URLSearchParams(location.search).get('id');if(!host||!projectId)return;
  document.querySelector('#approvals')?.remove();
  const list=records.filter(r=>r.projectId===projectId);
  const section=document.createElement('section');section.id='approvals';section.className='ap-section';
  section.innerHTML='<div class="ap-heading"><h2>ARTEFATOS PARA APROVAÇÃO</h2><span>'+list.filter(r=>r.status==='pending').length+' PENDENTE(S)</span></div>'+
    (list.length?list.map(card).join(''):'<p class="ap-empty">Nenhum artefato de aprovação registrado neste projeto.</p>');
  const tasks=document.getElementById('tasks');(tasks||host.querySelector('footer'))?.before(section);
  section.querySelectorAll('[data-media]').forEach(b=>b.addEventListener('click',()=>openMedia(b)));
  section.querySelectorAll('.ap-decision').forEach(b=>b.addEventListener('click',async()=>{
   const action=b.dataset.action,issueNumber=Number(b.dataset.id.replace(/^GH-/,''));
   const card=b.closest('.ap-card');const selectedAssetIds=[...card.querySelectorAll('.ap-choices input:checked')].map(x=>x.value);
   if(action==='approve'&&!selectedAssetIds.length){window.alert('Selecione um artefato.');return}
   if(!window.confirm('Simular decisão: '+action+'? Nenhuma alteração real será feita.'))return;
   b.disabled=true;
   try{const response={ok:true};
    if(!response.ok)throw Error('HTTP '+response.status); window.alert('Simulação concluída. Nenhuma decisão real foi gravada.');
   }catch{window.alert('Decisão não confirmada. Verifique a pendência no GitHub.');b.disabled=false}
  }));
 }
 async function load(){
  try{
   const res=await fetch('./data/approvals.json',{cache:'no-store'});
   if(!res.ok)throw Error('HTTP '+res.status);
   const data=await res.json();
   if(!Array.isArray(data.items))throw Error('schema');
   records=data.items.filter(r=>r&&typeof r.id==='string'&&typeof r.projectId==='string'&&['pending','resolved'].includes(r.status)&&Array.isArray(r.artifacts));
  }catch(e){console.warn('Approval Center: registro indisponível',e);records=[];}
  render();
 }
 window.addEventListener('waps:mounted',load);
})();
