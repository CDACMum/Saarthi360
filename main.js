
// ── UPLOAD DESTINATION LOGIC v2 ──────────────────────────────
let _pendingImportData=[];
let _pendingImportType='csv';
let _uploadDestChoice='';

function showUploadDestModal(questions, type){
  _pendingImportData=questions;
  _pendingImportType=type;
  _uploadDestChoice='';
  ['udd-opt-bank','udd-opt-set','udd-opt-both'].forEach(id=>$(id).classList.remove('selected'));
  $('udd-step2').classList.add('hidden');
  $('udd-bank-only-btn').classList.add('hidden');
  $('udd-set-btn').classList.add('hidden');
  $('udd-action-hint').textContent='Select a destination above to continue';
  const modIds=[...new Set(questions.map(q=>parseInt(q.moduleId)))];
  const modNames=modIds.map(id=>{const m=DB.modules.find(x=>parseInt(x.id)===id);return m?m.icon+' '+m.name:'?'}).join(', ');
  $('udd-summary').textContent=`${questions.length} question${questions.length!==1?'s':''} across ${modIds.length} module${modIds.length!==1?'s':''}: ${modNames}`;
  openModal('upload-dest-modal');
}

function setUDDChoice(choice){
  _uploadDestChoice=choice;
  ['udd-opt-bank','udd-opt-set','udd-opt-both'].forEach(id=>$(id).classList.remove('selected'));
  $('udd-opt-'+choice).classList.add('selected');
  if(choice==='bank'){
    $('udd-step2').classList.add('hidden');
    $('udd-bank-only-btn').classList.remove('hidden');
    $('udd-set-btn').classList.add('hidden');
    $('udd-action-hint').textContent=`${_pendingImportData.length} questions will be added to the MCQ bank`;
  } else {
    buildModuleSetCards();
    $('udd-step2').classList.remove('hidden');
    $('udd-bank-only-btn').classList.add('hidden');
    $('udd-set-btn').classList.remove('hidden');
    $('udd-action-hint').textContent=choice==='both'?'Questions added to bank + one set created per module':'Questions added to bank + sets created per module';
  }
}

function buildModuleSetCards(){
  const qs=_pendingImportData;
  const byModule={};
  qs.forEach(q=>{
    const mid=parseInt(q.moduleId);
    if(!byModule[mid])byModule[mid]=[];
    byModule[mid].push(q);
  });
  const container=$('udd-module-sets');
  container.innerHTML='';
  Object.entries(byModule).forEach(([mid,modQs])=>{
    const m=DB.modules.find(x=>parseInt(x.id)===parseInt(mid));
    if(!m)return;
    const existingSets=DB.sets.filter(s=>parseInt(s.moduleId)===parseInt(mid)).length;
    const autoSetName=`${m.name} – Set ${existingSets+1}`;
    const cardId=`msc-${mid}`;
    const div=document.createElement('div');
    div.className='mod-set-card';
    div.innerHTML=`
      <div class="mod-set-header">
        <div class="mod-set-icon">${m.icon}</div>
        <div>
          <div class="mod-set-name">${esc(m.name)}</div>
          <div class="mod-set-count">${modQs.length} question${modQs.length!==1?'s':''} from this module</div>
        </div>
        <div style="margin-left:auto;display:flex;align-items:center;gap:8px">
          <label style="font-size:12px;color:var(--t2)">Create Set?</label>
          <input type="checkbox" id="${cardId}-enable" checked style="width:16px;height:16px;accent-color:var(--g);cursor:pointer" onchange="toggleModSetCard(${mid})">
        </div>
      </div>
      <div id="${cardId}-config">
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:8px">
          <div>
            <label style="font-size:11px;color:var(--t2);display:block;margin-bottom:4px;text-transform:uppercase;letter-spacing:.4px">Set Name *</label>
            <input class="fin" id="${cardId}-name" value="${autoSetName}" placeholder="Set name" style="font-size:13px;padding:9px 12px">
          </div>
          <div>
            <label style="font-size:11px;color:var(--t2);display:block;margin-bottom:4px;text-transform:uppercase;letter-spacing:.4px">Timer (min)</label>
            <input class="fin" type="number" id="${cardId}-timer" value="45" min="10" max="180" style="font-size:13px;padding:9px 12px">
          </div>
          <div>
            <label style="font-size:11px;color:var(--t2);display:block;margin-bottom:4px;text-transform:uppercase;letter-spacing:.4px">Max Qs in Set</label>
            <input class="fin" type="number" id="${cardId}-qcount" value="${Math.min(modQs.length,50)}" min="1" max="${modQs.length}" style="font-size:13px;padding:9px 12px">
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div>
            <label style="font-size:11px;color:var(--t2);display:block;margin-bottom:4px;text-transform:uppercase;letter-spacing:.4px">Difficulty Filter</label>
            <select class="fin" id="${cardId}-diff" style="font-size:13px;padding:9px 12px">
              <option value="">All difficulties (${modQs.length} Qs)</option>
              <option value="easy">Easy only (${modQs.filter(q=>q.diff==='easy').length} Qs)</option>
              <option value="medium">Medium only (${modQs.filter(q=>q.diff==='medium').length} Qs)</option>
              <option value="hard">Hard only (${modQs.filter(q=>q.diff==='hard').length} Qs)</option>
            </select>
          </div>
          <div>
            <label style="font-size:11px;color:var(--t2);display:block;margin-bottom:4px;text-transform:uppercase;letter-spacing:.4px">Description (optional)</label>
            <input class="fin" id="${cardId}-desc" placeholder="What this set covers..." style="font-size:13px;padding:9px 12px">
          </div>
        </div>
        <div style="margin-top:8px;padding:8px 12px;background:rgba(34,197,94,.06);border-radius:8px;border:1px solid rgba(34,197,94,.15)">
          <div style="font-size:11px;color:var(--g)">✅ Will create: <strong id="${cardId}-preview">1 set with ${Math.min(modQs.length,50)} questions, 45 min timer</strong></div>
        </div>
      </div>`;
    container.appendChild(div);
    [`${cardId}-name`,`${cardId}-timer`,`${cardId}-qcount`,`${cardId}-diff`].forEach(fid=>{
      const el=document.getElementById(fid);
      if(el) el.addEventListener('input',()=>updateModSetPreview(mid,modQs));
    });
  });
}


function toggleModSetCard(mid){
  const cardId=`msc-${mid}`;
  const enabled=document.getElementById(`${cardId}-enable`).checked;
  const config=document.getElementById(`${cardId}-config`);
  if(config) config.style.opacity=enabled?'1':'0.4';
}

function updateModSetPreview(mid,modQs){
  const cardId=`msc-${mid}`;
  const name=(document.getElementById(`${cardId}-name`)?.value||'').trim()||'Unnamed Set';
  const timer=parseInt(document.getElementById(`${cardId}-timer`)?.value)||45;
  const qcount=parseInt(document.getElementById(`${cardId}-qcount`)?.value)||50;
  const diff=document.getElementById(`${cardId}-diff`)?.value||'';
  const filteredCount=diff?modQs.filter(q=>q.diff===diff).length:modQs.length;
  const actualQ=Math.min(qcount,filteredCount);
  const prev=document.getElementById(`${cardId}-preview`);
  if(prev) prev.textContent=`"${name}" — ${actualQ} questions, ${timer} min timer${diff?' ('+diff+' only)':''}`;
}

function executeUpload(){
  const qs=_pendingImportData;
  if(!qs.length){toast('No questions to import','error');return}
  let totalAdded=0;
  let setsCreated=[];
 
  // Step 1: Add to bank
  const newIds=[];
  qs.forEach(q=>{
    const newId=Date.now()+Math.random();
    const modId=parseInt(q.moduleId);
    DB.mcqBank.push({id:newId,...q,moduleId:modId});
    newIds.push({id:newId,moduleId:modId,diff:q.diff,presetSetId:q.presetSetId||null});
    totalAdded++;
  });
 
  // Step 2: Group by module
  const byModule={};
  newIds.forEach(item=>{
    if(!byModule[item.moduleId])byModule[item.moduleId]=[];
    byModule[item.moduleId].push(item);
  });
 
  // Step A: Auto-create sets from presetSetId column
  const autoSetMap={};
  Object.entries(byModule).forEach(([mid,modItems])=>{
    modItems.forEach(item=>{
      if(item.presetSetId){
        const key=`${mid}::${item.presetSetId}`;
        if(!autoSetMap[key])autoSetMap[key]={mid:parseInt(mid),name:String(item.presetSetId),ids:[]};
        autoSetMap[key].ids.push(item.id);
      }
    });
  });
  Object.values(autoSetMap).forEach(({mid,name,ids})=>{
    const existing=DB.sets.find(s=>parseInt(s.moduleId)===mid&&s.name===name);
    if(existing){
      existing.linkedIds=[...new Set([...(existing.linkedIds||[]),...ids.map(String)])];
      existing.qCount=existing.linkedIds.length;
    } else {
      DB.sets.push({id:`${mid}-${Date.now()}-${Math.random().toString(36).slice(2)}`,moduleId:mid,name,timer:45,qCount:ids.length,status:'draft',active:true,desc:'Auto-created from Google Sheet',linkedIds:ids.map(String)});
      setsCreated.push(name);
    }
  });
 
  // Step B: Create from UI config cards
  if((_uploadDestChoice==='set'||_uploadDestChoice==='both')&&setsCreated.length===0){
    Object.entries(byModule).forEach(([mid,modItems])=>{
      const cardId=`msc-${mid}`;
      const enableEl = document.getElementById(`${cardId}-enable`);
      if(enableEl && enableEl.checked){
        const name=(document.getElementById(`${cardId}-name`)?.value||'').trim()||'Unnamed Set';
        const timer=parseInt(document.getElementById(`${cardId}-timer`)?.value)||45;
        const qcount=parseInt(document.getElementById(`${cardId}-qcount`)?.value)||50;
        const diff=document.getElementById(`${cardId}-diff`)?.value||'';
        
        let filteredIds = modItems;
        if(diff) filteredIds = filteredIds.filter(q=>q.diff===diff);
        filteredIds = filteredIds.slice(0, qcount).map(q=>String(q.id));
        
        const newSet = {
          id:`${mid}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          moduleId:parseInt(mid),
          name:name,
          timer:timer,
          qCount:filteredIds.length,
          status:'draft',
          active:true,
          desc:document.getElementById(`${cardId}-desc`)?.value||'',
          linkedIds:filteredIds
        };
        DB.sets.push(newSet);
        setsCreated.push(name);
      }
    });
  }

  // SYNC Step: Push all newly created sets to Apps Script, and push raw questions to the bank!
  
  // Find all sets we just created and sync them
  const pushedQIds = new Set();
  DB.sets.filter(s => setsCreated.includes(s.name)).forEach(s => {
    saveSetToAppsScript(s);
    pushQuestionsToSheet(s); // Syncs questions linked to this set
    if(s.linkedIds) s.linkedIds.forEach(id => pushedQIds.add(String(id)));
  });

  // Only push raw questions that were NOT linked to any set we just created
  const rawQs = qs.filter(q => !pushedQIds.has(String(q.id)));
  if (rawQs.length > 0) {
    pushRawQuestionsToSheet(rawQs);
  }

  let msg='';
  if(setsCreated.length>0){
    msg=`✅ ${totalAdded} question${totalAdded!==1?'s':''} added! `+
        `${setsCreated.length} set${setsCreated.length!==1?'s':''} created as Draft: `+
        `${setsCreated.map(s=>'"'+s+'"').join(', ')} — go to Manage Sets to publish for students.`;
  } else {
    msg=`✅ ${totalAdded} question${totalAdded!==1?'s':''} added to MCQ Bank!`;
  }
  toast(msg,'success',7000);
 
  // Cleanup & refresh — INSIDE the function (was orphaned before)
  _pendingImportData=[];
  closeModal('upload-dest-modal');
  _csvData=[];
  if($('csv-preview-area'))  $('csv-preview-area').classList.add('hidden');
  if($('csv-import-btn-area'))$('csv-import-btn-area').classList.add('hidden');
  if($('paste-preview'))     $('paste-preview').classList.add('hidden');
  if($('paste-area'))        $('paste-area').value='';
  refreshAdminDash();
  renderMCQ();
  renderStudentMods();
  if($('sets-panel-content')) renderSetsPanel(_setsModFilter);
  saveDB();
} 


// pushScoreToSheet kept for backward compat — new code uses pushToAppsScript() in one.js

async function pushScoreToSheet(s) {
  try {
    await sb.from('scores').insert([s]);
  } catch(e) { console.warn('Score push failed:', e); }
}

// Load admin password + settings from Config sheet via Apps Script

async function syncConfigFromSheet() {
  try {
    const { data } = await sb.from('config').select('*');
    if (data) {
      data.forEach(r => {
        if (r.key === 'adminPass') DB.adminPass = r.value;
        if (r.key === 'passmark') DB.settings.passmark = parseInt(r.value) || 60;
        if (r.key === 'timer') DB.settings.timer = parseInt(r.value) || 45;
        if (r.key === 'qCount') DB.settings.qCount = parseInt(r.value) || 50;
      });
      saveDB();
    }
  } catch(e) {}
}


async function autoSyncDataFromSheet(showLoader=true){
  const sov=$('sov');
  if(showLoader&&sov){
    sov.style.display='flex';
    $('si').textContent='🔄';
    $('stit').textContent='Syncing from Supabase...';
    $('ssc').textContent='';
    $('ssub').textContent='Loading data';
    $('sbar').style.width='30%';
  }

  try {
    const { data: mods } = await sb.from('modules').select('*');
    if (mods && mods.length) {
      DB.modules = mods.map(m => ({...m, topics: typeof m.topics==='string'?JSON.parse(m.topics):m.topics}));
    }
    if(showLoader&&sov) $('sbar').style.width='45%';

    const { data: questions } = await sb.from('mcq_bank').select('*');
    if (questions) {
      DB.mcqBank = questions.map(q => ({...q, opts: typeof q.opts==='string'?JSON.parse(q.opts):q.opts}));
    }
    if(showLoader&&sov) $('sbar').style.width='60%';

    const { data: sets } = await sb.from('sets').select('*');
    if (sets) DB.sets = sets;
    if(showLoader&&sov) $('sbar').style.width='75%';

    const { data: students } = await sb.from('students').select('*');
    if (students) DB.students = students;
    if(showLoader&&sov) $('sbar').style.width='90%';

    const { data: scores } = await sb.from('scores').select('*');
    if (scores) DB.scores = scores;

    await syncConfigFromSheet();
  } catch(e) {
    console.error('Supabase fetch error:', e);
  }

  if(showLoader&&sov){
    $('sbar').style.width='100%';
    setTimeout(()=>{sov.style.display='none';},500);
  }

  if(!SES.isAdmin&&SES.user){
    const synced=DB.scores.filter(s=>s.studentId===SES.user.id);
    if(synced.length){
      SES.stats.tests=synced.length;
      SES.stats.best=Math.max(...synced.map(s=>s.pct));
      SES.stats.qs=synced.reduce((t,s)=>t+s.total,0);
    }
    updateStuStats();
    renderStudentMods();
  } else if(SES.isAdmin){
    refreshAdminDash();
    if($('sets-panel-content')) renderSetsPanel(_setsModFilter);
    if($('mcq-list')) renderMCQ();
    if($('stu-tbody')) renderStudents();
  }
}

function showAppsScriptGuide(){
  const modal=document.createElement('div');
  modal.className='mo';modal.style.zIndex='600';
  modal.innerHTML=`<div class="md" style="width:680px">
    <div class="mh"><div class="mt">📖 Google Apps Script Setup Guide</div><button class="mx" onclick="this.closest('.mo').remove()">✕</button></div>
    <div style="font-size:13px;line-height:1.8;color:var(--t2)">
      <p style="margin-bottom:12px">To enable write-back (scores → Google Sheet), follow these steps:</p>
      <div style="display:grid;gap:10px">
        ${[['1','Open your Google Sheet','Click Extensions → Apps Script'],['2','Delete default code','Replace with the code below'],['3','Deploy as Web App','Click Deploy → New Deployment → Web App → Anyone → Deploy'],['4','Copy the URL','Paste it into the "Apps Script URL" field above']].map(([n,t,d])=>`<div style="display:flex;gap:12px;padding:10px 12px;background:var(--bg3);border-radius:9px"><div style="width:24px;height:24px;border-radius:50%;background:var(--a);color:white;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0">${n}</div><div><div style="font-weight:600;color:var(--t)">${t}</div><div style="font-size:12px">${d}</div></div></div>`).join('')}
      </div>
    </div>
    <div class="mf"><button class="btn ba" onclick="this.closest('.mo').remove()">Got it!</button></div>
  </div>`;
  document.body.appendChild(modal);
}

// ── MANAGE SETS PANEL ────────────────────────────────────────
let _setsModFilter=null;

function filterSetsByMod(modId){
  _setsModFilter=modId===null?null:parseInt(modId);
  document.querySelectorAll('#sets-mod-tabs .btn').forEach(b=>b.classList.remove('ba'));
  const activeTab=modId===null?$('sets-tab-all'):document.getElementById('sets-tab-'+modId);
  if(activeTab) activeTab.classList.add('ba');
  renderSetsPanel(_setsModFilter);
}

function renderSetsPanel(modFilter){
  const tabsEl=$('sets-mod-tabs');
  if(tabsEl){
    tabsEl.innerHTML=`<button class="btn bsm ${modFilter===null?'ba':'bo'}" onclick="filterSetsByMod(null)" id="sets-tab-all">All Modules</button>`+
      DB.modules.map(m=>{
        const cnt=DB.sets.filter(s=>parseInt(s.moduleId)===parseInt(m.id)).length;
        return `<button class="btn bsm ${modFilter===parseInt(m.id)?'ba':'bo'}" onclick="filterSetsByMod(${m.id})" id="sets-tab-${m.id}">${m.icon} ${m.name.split(' ')[0]} <span style="opacity:.7">(${cnt})</span></button>`;
      }).join('');
  }
  const totalSets=DB.sets.length;
  const pubSets=DB.sets.filter(s=>s.status==='published'&&s.active!==false).length;
  const setsNb=$('sets-nb');
  if(setsNb) setsNb.textContent=pubSets+'/'+totalSets;
  const modules=modFilter!==null?DB.modules.filter(m=>parseInt(m.id)===modFilter):DB.modules;
  const container=$('sets-panel-content');
  if(!container)return;
  if(!modules.length){container.innerHTML='<div class="empty"><div class="ei">📦</div><div>No modules found</div></div>';return}
 
  container.innerHTML=modules.map(m=>{
    const mid=parseInt(m.id);
    const mSets=DB.sets.filter(s=>parseInt(s.moduleId)===mid);
    const qCount=DB.mcqBank.filter(q=>parseInt(q.moduleId)===mid).length;
    const pubCount=mSets.filter(s=>s.status==='published'&&s.active!==false).length;
 
    return `<div class="card" style="margin-bottom:16px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid var(--b)">
        <div style="display:flex;align-items:center;gap:10px">
          <div style="font-size:24px">${m.icon}</div>
          <div>
            <div style="font-size:15px;font-weight:700">${esc(m.name)}</div>
            <div style="font-size:12px;color:var(--t2)">${qCount} question${qCount!==1?'s':''} in bank · ${mSets.length} set${mSets.length!==1?'s':''} · ${pubCount} published</div>
          </div>
        </div>
        <button class="btn bsm bg" onclick="openCreateSetModal(${mid})">➕ Add Set</button>
      </div>
      ${mSets.length===0
        ?`<div style="padding:14px;background:rgba(108,99,255,.06);border:1px solid rgba(108,99,255,.15);border-radius:10px;font-size:13px;color:var(--a2);display:flex;align-items:center;gap:8px">
            <span>📋</span>
            <span>No sets yet. Click <strong>Add Set</strong> to create one, then use the <strong>Questions</strong> button to add questions.</span>
          </div>`
        :`<div style="display:grid;gap:8px">${mSets.map(s=>renderSetRow(s,qCount)).join('')}</div>`
      }
    </div>`;
  }).join('');
}
 
function renderSetRow(s,moduleQCount){
  const linkedCount=Array.isArray(s.linkedIds)&&s.linkedIds.length>0?s.linkedIds.length:null;
  const isPub=s.status==='published'&&s.active!==false;
  const isDisabled=s.active===false;
  const attempts=DB.scores.filter(sc=>sc.setId===String(s.id)&&(parseInt(sc.total)||0)>0).length;
  const avgSc=attempts?Math.round(DB.scores.filter(sc=>sc.setId===String(s.id)).reduce((a,b)=>a+b.pct,0)/attempts):null;
 
  let statusBadge='';
  let rowBorder='var(--b)';
  if(isPub){
    statusBadge=`<span style="padding:3px 10px;border-radius:6px;font-size:11px;font-weight:700;background:rgba(34,197,94,.15);color:var(--g);border:1px solid rgba(34,197,94,.3)">✅ Published</span>`;
    rowBorder='rgba(34,197,94,.25)';
  } else if(isDisabled){
    statusBadge=`<span style="padding:3px 10px;border-radius:6px;font-size:11px;font-weight:700;background:rgba(90,90,112,.2);color:var(--t2)">⛔ Disabled</span>`;
  } else {
    statusBadge=`<span style="padding:3px 10px;border-radius:6px;font-size:11px;font-weight:700;background:rgba(245,158,11,.12);color:var(--y);border:1px solid rgba(245,158,11,.25)">📝 Draft</span>`;
  }
 
  // Questions count label
  const qLabel=linkedCount!==null?`(${linkedCount})`:`(${moduleQCount})`;
  const qHint=linkedCount===null&&moduleQCount===0?` <span style="font-size:10px;color:var(--y)">+ Add Qs</span>`:'';
 
  return `
  <div style="display:flex;align-items:center;gap:10px;padding:12px 14px;background:var(--bg3);border:1px solid ${rowBorder};border-radius:11px;transition:border .2s">
    <div style="flex:1;min-width:0">
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
        <div style="font-size:13px;font-weight:600">${esc(s.name)}</div>
        ${statusBadge}
      </div>
      <div style="font-size:11px;color:var(--t2);margin-top:3px">
        ${linkedCount!==null
          ?`<strong style="color:var(--a2)">${linkedCount} Qs selected</strong>`
          :moduleQCount>0?`${moduleQCount} Qs in bank`:`<span style="color:var(--y)">⚠️ No questions yet — click Questions to add</span>`
        }
        · ${s.timer||45}min
        ${attempts?` · <span style="color:var(--c)">${attempts} attempt${attempts!==1?'s':''}</span>`:'· No attempts yet'}
        ${avgSc!==null?` · Avg: <span style="color:${avgSc>=75?'var(--g)':avgSc>=50?'var(--y)':'var(--r)'}">${avgSc}%</span>`:''}
        ${s.desc?` · ${esc(s.desc)}`:''}
      </div>
    </div>
    <div style="display:flex;gap:6px;flex-shrink:0;align-items:center;flex-wrap:wrap">
      <!-- FIX: Questions button is ALWAYS enabled — opens the new 3-tab editor -->
      <button class="btn bxs bpu" onclick="openSetQuestionsModal('${esc(String(s.id))}')"
        title="Add or pick questions for this set" style="position:relative">
        ❓ Questions ${qLabel}${qHint}
      </button>
      ${isPub
        ?`<button class="btn bxs by" onclick="toggleSetStatus('${esc(String(s.id))}','draft')">📝 Unpublish</button>`
        :`<button class="btn bxs bg" onclick="toggleSetStatus('${esc(String(s.id))}','published')" ${linkedCount===0||linkedCount===null&&moduleQCount===0?'disabled style="opacity:.45;cursor:not-allowed" title="Add questions first"':''}>✅ Publish</button>`
      }
      <button class="btn bxs bo" onclick="openEditSetModal('${esc(String(s.id))}')" title="Edit">✏️</button>
      <button class="btn bxs br" onclick="deleteSet('${esc(String(s.id))}')" title="Delete">🗑️</button>
    </div>
  </div>`;
}

let _qpickSetId=null, _qpickSelected=new Set(), _qpickTab='pick';
 
function openSetQuestionsModal(setId){
  const s=DB.sets.find(x=>String(x.id)===String(setId));
  if(!s)return;
  const m=DB.modules.find(x=>parseInt(x.id)===parseInt(s.moduleId));
  _qpickSetId=String(setId);
  _qpickTab='pick';
  const modQs=DB.mcqBank.filter(q=>parseInt(q.moduleId)===parseInt(s.moduleId));
  const existing=Array.isArray(s.linkedIds)&&s.linkedIds.length>0
    ?s.linkedIds.map(String)
    :modQs.map(q=>String(q.id));
  _qpickSelected=new Set(existing);
 
  // Remove old modal if exists
  const old=document.getElementById('qpick-modal-dynamic');
  if(old) old.remove();
 
  const modal=document.createElement('div');
  modal.id='qpick-modal-dynamic';
  modal.className='mo';
  modal.style.zIndex='500';
  modal.onclick=e=>{if(e.target===modal) modal.classList.add('hidden');};
 
  modal.innerHTML=`
  <div class="md mdxl" style="display:flex;flex-direction:column;max-height:94vh;width:900px">
    <!-- HEADER -->
    <div class="mh" style="flex-shrink:0;padding-bottom:14px;border-bottom:1px solid var(--b)">
      <div>
        <div class="mt">❓ Questions for "${esc(s.name)}"</div>
        <div style="font-size:12px;color:var(--t2);margin-top:3px">
          ${m?m.icon+' '+m.name:''} ·
          <span id="qpm-sel-count" style="color:var(--a2);font-weight:600">${_qpickSelected.size} selected</span>
        </div>
      </div>
      <button class="mx" onclick="document.getElementById('qpick-modal-dynamic').classList.add('hidden')">✕</button>
    </div>
 
    <!-- TABS -->
    <div style="flex-shrink:0;display:flex;gap:3px;background:var(--bg3);padding:4px;border-radius:10px;width:fit-content;margin:14px 0 0 0">
      <button id="qptab-pick" class="tab active" onclick="switchQPickTab('pick')">📋 Pick from Bank <span id="qptab-bank-count" style="opacity:.7;font-size:11px">(${modQs.length})</span></button>
      <button id="qptab-add"  class="tab" onclick="switchQPickTab('add')">✏️ Add Manually</button>
      <button id="qptab-json" class="tab" onclick="switchQPickTab('json')">{ } JSON / CSV Import</button>
    </div>
 
    <!-- TAB CONTENT AREA -->
    <div id="qpick-tab-body" style="flex:1;overflow-y:auto;min-height:200px;margin-top:12px;padding-right:2px">
      <!-- rendered by switchQPickTab() -->
    </div>
 
    <!-- FOOTER -->
    <div style="flex-shrink:0;padding-top:12px;border-top:1px solid var(--b);margin-top:10px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">
      <div style="font-size:13px;color:var(--t2)">
        <span id="qpm-count">0 questions</span> will be in this set
        <span id="qpm-save-status" style="margin-left:10px;font-size:12px;color:var(--g)"></span>
      </div>
      <div style="display:flex;gap:10px">
        <button class="btn bo" onclick="document.getElementById('qpick-modal-dynamic').classList.add('hidden')">Cancel</button>
        <button class="btn ba" onclick="saveQPickerDyn()">💾 Save & Close</button>
      </div>
    </div>
  </div>`;
 
  document.body.appendChild(modal);
  switchQPickTab('pick');
}
 
function renderQPickerDyn(){
  const s=DB.sets.find(x=>String(x.id)===_qpickSetId);
  if(!s) return;
  const modQs=DB.mcqBank.filter(q=>parseInt(q.moduleId)===parseInt(s.moduleId));
  const search=(document.getElementById('qpm-search')?.value||'').toLowerCase();
  const diff=document.getElementById('qpm-diff')?.value||'';
  const topic=document.getElementById('qpm-topic')?.value||'';
  const filtered=modQs.filter(q=>
    (!search||(q.q||'').toLowerCase().includes(search)||(q.topic||'').toLowerCase().includes(search))&&
    (!diff||q.diff===diff)&&
    (!topic||(q.topic||'General')===topic)
  );
  const selCount=modQs.filter(q=>_qpickSelected.has(String(q.id))).length;
  const byDiff={easy:0,medium:0,hard:0};
  modQs.filter(q=>_qpickSelected.has(String(q.id))).forEach(q=>{byDiff[q.diff||'easy']++;});
  const statsEl=document.getElementById('qpm-stats');
  if(statsEl) statsEl.innerHTML=`<strong style="color:var(--a2)">${selCount}/${modQs.length} selected</strong> · <span style="color:var(--g)">${byDiff.easy} easy</span> · <span style="color:var(--y)">${byDiff.medium} medium</span> · <span style="color:var(--r)">${byDiff.hard} hard</span>${filtered.length<modQs.length?` · Showing ${filtered.length} of ${modQs.length}`:''}`;
  updateQPickCount();
  const list=document.getElementById('qpm-list');
  if(!list) return;
  if(!filtered.length){list.innerHTML='<div class="empty"><div class="ei">🔍</div><div>No questions match</div></div>';return;}
  list.innerHTML=filtered.map(q=>{
    const sel=_qpickSelected.has(String(q.id));
    return `<div onclick="toggleQPickDyn('${String(q.id).replace(/'/g,"\\'")}')"
      style="display:flex;align-items:flex-start;gap:11px;padding:11px 13px;
             background:${sel?'rgba(108,99,255,.08)':'var(--bg3)'};
             border:1px solid ${sel?'rgba(108,99,255,.3)':'var(--b)'};
             border-radius:10px;margin-bottom:6px;cursor:pointer;transition:all .18s">
      <div style="width:20px;height:20px;border-radius:5px;flex-shrink:0;margin-top:1px;
                  background:${sel?'var(--a)':'var(--bg4)'};border:2px solid ${sel?'var(--a)':'var(--b2)'};
                  display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:700">
        ${sel?'✓':''}
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;line-height:1.5;margin-bottom:5px">${esc(q.q)}</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
          <span class="badge b${(q.diff||'e')[0]}">${q.diff||'easy'}</span>
          <span style="font-size:11px;padding:2px 7px;border-radius:5px;background:rgba(6,182,212,.12);color:var(--c)">${esc(q.topic||'General')}</span>
          <span style="font-size:11px;color:var(--t3)">✓ ${esc((q.opts||[])[q.ans]||'?')}</span>
        </div>
      </div>
    </div>`;
  }).join('');
}
 
function toggleQPickDyn(id){
  const sid=String(id);
  if(_qpickSelected.has(sid)) _qpickSelected.delete(sid);
  else _qpickSelected.add(sid);
  renderQPickerDyn();
}

function qpickSelAll(){
  const s=DB.sets.find(x=>String(x.id)===_qpickSetId);
  if(!s) return;
  const search=(document.getElementById('qpm-search')?.value||'').toLowerCase();
  const diff=document.getElementById('qpm-diff')?.value||'';
  const topic=document.getElementById('qpm-topic')?.value||'';
  DB.mcqBank.filter(q=>
    parseInt(q.moduleId)===parseInt(s.moduleId)&&
    (!search||(q.q||'').toLowerCase().includes(search))&&
    (!diff||q.diff===diff)&&
    (!topic||(q.topic||'General')===topic)
  ).forEach(q=>_qpickSelected.add(String(q.id)));
  renderQPickerDyn();
}
 
function qpickClearAll(){
  const s=DB.sets.find(x=>String(x.id)===_qpickSetId);
  if(!s) return;
  const search=(document.getElementById('qpm-search')?.value||'').toLowerCase();
  const diff=document.getElementById('qpm-diff')?.value||'';
  const topic=document.getElementById('qpm-topic')?.value||'';
  DB.mcqBank.filter(q=>
    parseInt(q.moduleId)===parseInt(s.moduleId)&&
    (!search||(q.q||'').toLowerCase().includes(search))&&
    (!diff||q.diff===diff)&&
    (!topic||(q.topic||'General')===topic)
  ).forEach(q=>_qpickSelected.delete(String(q.id)));
  renderQPickerDyn();
}

function saveQPickerDyn(){
  const s=DB.sets.find(x=>String(x.id)===_qpickSetId);
  if(!s) return;
  const ids=[..._qpickSelected];
  s.linkedIds=ids;
  s.qCount=ids.length;
  saveSetToAppsScript(s);
  // Also push linked questions to the module sheet tab
  pushQuestionsToSheet(s);
  toast(`✅ ${ids.length} question${ids.length!==1?'s':''} saved to "${s.name}"`, 'success');
  const modal=document.getElementById('qpick-modal-dynamic');
  if(modal) modal.classList.add('hidden');
  renderSetsPanel(_setsModFilter);
  refreshAdminDash();
  saveDB();
}

function updateQPickCount(){
  const cnt=document.getElementById('qpm-count');
  const cnt2=document.getElementById('qpm-sel-count');
  const n=_qpickSelected.size;
  if(cnt) cnt.textContent=`${n} question${n!==1?'s':''}`;
  if(cnt2) cnt2.textContent=`${n} selected`;
}

function toggleSetStatus(setId,newStatus){
  const s=DB.sets.find(x=>String(x.id)===String(setId));if(!s)return;
  const mid=parseInt(s.moduleId);
  const hasQs=DB.mcqBank.filter(q=>parseInt(q.moduleId)===mid).length>0;
  if(newStatus==='published'&&!hasQs){toast(`Cannot publish — no questions in the ${DB.modules.find(m=>parseInt(m.id)===mid)?.name||'module'} bank yet.`,'error',5000);return;}
  s.status=newStatus;
  toast(`✅ "${s.name}" ${newStatus==='published'?'Published — students can now see it':'Unpublished'}`,newStatus==='published'?'success':'info');
  saveSetToAppsScript(s);
  renderSetsPanel(_setsModFilter);
  renderStudentMods();
  saveDB();
}

function openCreateSetModal(preselectModId){
  $('cset-title').textContent='➕ Create New Set';
  $('cset-edit-id').value='';$('cset-name').value='';$('cset-timer').value=45;$('cset-qcount').value=50;$('cset-status').value='draft';$('cset-desc').value='';
  const sel=$('cset-module');
  sel.innerHTML='<option value="">Select Module</option>'+DB.modules.map(m=>`<option value="${m.id}">${m.icon} ${esc(m.name)}</option>`).join('');
  if(preselectModId!==undefined){
    sel.value=preselectModId;updateCSetPreview();
    const m=DB.modules.find(x=>parseInt(x.id)===parseInt(preselectModId));
    if(m){const cnt=DB.sets.filter(s=>parseInt(s.moduleId)===parseInt(preselectModId)).length;$('cset-name').value=`${m.name} – Set ${cnt+1}`;}
  }
  sel.onchange=updateCSetPreview;
  openModal('create-set-modal');
}

function openEditSetModal(setId){
  const s=DB.sets.find(x=>String(x.id)===String(setId));if(!s)return;
  $('cset-title').textContent='✏️ Edit Set';$('cset-edit-id').value=String(s.id);
  const sel=$('cset-module');
  sel.innerHTML='<option value="">Select Module</option>'+DB.modules.map(m=>`<option value="${m.id}">${m.icon} ${esc(m.name)}</option>`).join('');
  sel.value=s.moduleId;$('cset-name').value=s.name;$('cset-timer').value=s.timer||45;$('cset-qcount').value=s.qCount||50;$('cset-status').value=s.status||'draft';$('cset-desc').value=s.desc||'';
  sel.onchange=updateCSetPreview;updateCSetPreview();
  openModal('create-set-modal');
}

function addManualQuestion(){
  const s=DB.sets.find(x=>String(x.id)===_qpickSetId);
  if(!s){toast('Set not found','error');return;}
 
  const qText=(document.getElementById('mq-q')?.value||'').trim();
  const opts=[0,1,2,3].map(i=>(document.getElementById(`mq-o${i}`)?.value||'').trim());
  const ansEl=document.querySelector('input[name="mq-ans"]:checked');
  const diff=document.getElementById('mq-diff')?.value||'easy';
  const topic=(document.getElementById('mq-topic')?.value||'General').trim()||'General';
  const exp=(document.getElementById('mq-exp')?.value||'').trim();
 
  if(!qText){toast('Enter the question text','error');return;}
  if(opts.some(o=>!o)){toast('Fill in all 4 options','error');return;}
  if(!ansEl){toast('Select the correct answer (click a radio button)','error');return;}
  const ans=parseInt(ansEl.value);
 
  // Add to MCQ bank
  const newId=Date.now()+Math.random();
  const newQ={id:newId,moduleId:parseInt(s.moduleId),diff,topic,q:qText,opts,ans,explain:exp};
  DB.mcqBank.push(newQ);
 
  // Auto-link to this set
  if(!Array.isArray(s.linkedIds)) s.linkedIds=[];
  s.linkedIds.push(String(newId));
  s.qCount=s.linkedIds.length;
  _qpickSelected.add(String(newId));
 
  // Show added confirmation
  const addedList=document.getElementById('mq-added-list');
  if(addedList){
    const item=document.createElement('div');
    item.style.cssText='padding:8px 12px;background:rgba(34,197,94,.08);border:1px solid rgba(34,197,94,.2);border-radius:8px;font-size:12px;margin-bottom:6px;display:flex;align-items:center;gap:8px';
    item.innerHTML=`<span style="color:var(--g)">✅</span><span>${esc(qText.substring(0,70))}${qText.length>70?'...':''}</span><span style="margin-left:auto;color:var(--t2)">${diff} · ${topic}</span>`;
    addedList.insertBefore(item,addedList.firstChild);
  }
 
  // Clear form for next question
  const qEl=document.getElementById('mq-q');
  if(qEl) qEl.value='';
  [0,1,2,3].forEach(i=>{const el=document.getElementById(`mq-o${i}`);if(el)el.value='';});
  if(ansEl) ansEl.checked=false;
  const expEl=document.getElementById('mq-exp');
  if(expEl) expEl.value='';
 
  updateQPickCount();
  // Update bank count badge on pick tab
  const bankCount=document.getElementById('qptab-bank-count');
  const modQCount=DB.mcqBank.filter(q=>parseInt(q.moduleId)===parseInt(s.moduleId)).length;
  if(bankCount) bankCount.textContent=`(${modQCount})`;
 
  toast(`✅ Question added! (${s.linkedIds.length} total in set)`, 'success', 2500);
  saveDB();
}

function updateCSetPreview(){
  const mid=parseInt($('cset-module').value);
  const prev=$('cset-q-preview');
  if(isNaN(mid)){prev.innerHTML='<span style="color:var(--t2)">Select a module to see available questions</span>';return}
  const m=DB.modules.find(x=>parseInt(x.id)===mid);
  if(!m){prev.innerHTML='<span style="color:var(--r)">Module not found</span>';return}
  const allQs=DB.mcqBank.filter(q=>parseInt(q.moduleId)===mid);
  const qCount=allQs.length;
  const byDiff={easy:0,medium:0,hard:0};
  allQs.forEach(q=>{byDiff[q.diff||'easy']=(byDiff[q.diff||'easy']||0)+1});
  const topics=[...new Set(allQs.map(q=>q.topic||'General'))].slice(0,5);
  if(qCount===0){
    prev.innerHTML=`<div style="display:flex;align-items:center;gap:8px;color:var(--r)"><span>⚠️</span><span>No questions in bank for <strong>${esc(m.name)}</strong>.<button class="btn bxs ba" onclick="sp('aimport')" style="margin-left:4px">Import Questions →</button></span></div>`;
  } else {
    const existingSets=DB.sets.filter(s=>parseInt(s.moduleId)===mid).length;
    prev.innerHTML=`<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap"><span style="color:var(--g);font-weight:600">✅ ${qCount} questions in ${esc(m.name)}</span><span style="color:var(--t3)">·</span><span style="color:var(--g)">${byDiff.easy} easy</span><span style="color:var(--t3)">·</span><span style="color:var(--y)">${byDiff.medium} medium</span><span style="color:var(--t3)">·</span><span style="color:var(--r)">${byDiff.hard} hard</span><span style="color:var(--t3)">·</span><span style="color:var(--t2);font-size:11px">${existingSets} existing set${existingSets!==1?'s':''}</span></div><div style="font-size:11px;color:var(--t3);margin-top:4px">Topics: ${topics.map(t=>`<span style="padding:2px 6px;background:rgba(108,99,255,.12);border-radius:4px;color:var(--a2)">${esc(t)}</span>`).join(' ')}</div>`;
  }
}

function saveNewSet(andAddQuestions){
  const editId=$('cset-edit-id').value;
  const mid=parseInt($('cset-module').value);const name=$('cset-name').value.trim();const timer=parseInt($('cset-timer').value)||45;const qCount=parseInt($('cset-qcount').value)||50;const status=$('cset-status').value||'draft';const desc=$('cset-desc').value.trim();
  if(isNaN(mid)){toast('Select a module','error');return}
  if(!name){toast('Enter a set name','error');return}
  let targetId = editId;
  if(editId){
    const s=DB.sets.find(x=>String(x.id)===editId);
    if(s){Object.assign(s,{moduleId:mid,name,timer,qCount,status,desc});toast('Set updated','success');saveSetToAppsScript(s);}
  } else {
    // Auto-link random questions from this module's bank up to qCount
    const allQs = DB.mcqBank.filter(q => parseInt(q.moduleId) === mid);
    const shuffled = [...allQs].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, qCount);
    const linkedIds = selected.map(q => String(q.id));

    targetId = `${mid}-${Date.now()}`;
    const newSet={id:targetId,moduleId:mid,name,timer,qCount:linkedIds.length,status,desc,active:true,linkedIds:linkedIds};
    DB.sets.push(newSet);
    toast(`Set "${name}" created as ${status==='published'?'Published ✅':'Draft 📝'}`,'success');
    
    saveSetToAppsScript(newSet);
  }
  closeModal('create-set-modal');
  renderSetsPanel(_setsModFilter);
  renderStudentMods();
  refreshAdminDash();
  saveDB();
  if (andAddQuestions) {
    setTimeout(() => openSetQuestionsModal(String(targetId)), 100);
  }
}

function pushAllSetsToSheet() {
  if (!DB.sets || !DB.sets.length) {
    toast('No sets to sync', 'warning');
    return;
  }
  toast('Syncing sets to Google Sheets...', 'info');
  DB.sets.forEach((s, index) => {
    setTimeout(() => saveSetToAppsScript(s), index * 300);
  });
  setTimeout(() => toast('All sets synced to Google Sheets!', 'success'), DB.sets.length * 300 + 500);
}


function deleteSet(setId){
  const s=DB.sets.find(x=>String(x.id)===String(setId));
  confAction(`Delete "${s?.name}"?`,'This set will be permanently removed.',()=>{DB.sets=DB.sets.filter(x=>String(x.id)!==String(setId));deleteSetFromAppsScript(setId);toast('Set deleted','warning');renderSetsPanel(_setsModFilter);renderStudentMods();refreshAdminDash();saveDB();},'🗑️');
}

function switchQPickTab(tab){
  _qpickTab=tab;
  ['pick','add','json'].forEach(t=>{
    const btn=document.getElementById('qptab-'+t);
    if(btn) btn.classList.toggle('active', t===tab);
  });
  const body=document.getElementById('qpick-tab-body');
  if(!body) return;
 
  if(tab==='pick'){
    const s=DB.sets.find(x=>String(x.id)===_qpickSetId);
    if(!s){body.innerHTML='<div class="empty">Set not found</div>';return;}
    const modQs=DB.mcqBank.filter(q=>parseInt(q.moduleId)===parseInt(s.moduleId));
    if(modQs.length===0){
      body.innerHTML=`
        <div style="text-align:center;padding:30px 20px;background:rgba(108,99,255,.05);border:1px solid rgba(108,99,255,.2);border-radius:12px">
          <div style="font-size:36px;margin-bottom:12px">📭</div>
          <div style="font-size:15px;font-weight:700;margin-bottom:8px">No questions in bank yet</div>
          <div style="font-size:13px;color:var(--t2);line-height:1.7;margin-bottom:16px">
            Use <strong>Add Manually</strong> to type questions one by one,<br>
            or <strong>JSON / CSV Import</strong> to paste many at once.
          </div>
          <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
            <button class="btn ba" onclick="switchQPickTab('add')">✏️ Add Manually</button>
            <button class="btn bc" onclick="switchQPickTab('json')">{ } Import JSON / CSV</button>
          </div>
        </div>`;
      return;
    }
    body.innerHTML=`
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">
        <input class="si" id="qpm-search" placeholder="🔍 Search questions..." style="flex:1;min-width:160px" oninput="renderQPickerDyn()">
        <select class="si" id="qpm-diff" onchange="renderQPickerDyn()">
          <option value="">All Difficulty</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
        <select class="si" id="qpm-topic" onchange="renderQPickerDyn()">
          <option value="">All Topics</option>
          ${[...new Set(modQs.map(q=>q.topic||'General'))].sort().map(t=>`<option value="${esc(t)}">${esc(t)}</option>`).join('')}
        </select>
        <button class="btn bsm bg" onclick="qpickSelAll()">✅ All</button>
        <button class="btn bsm br" onclick="qpickClearAll()">✕ None</button>
      </div>
      <div id="qpm-stats" style="font-size:12px;color:var(--t2);margin-bottom:8px"></div>
      <div id="qpm-list"></div>`;
    renderQPickerDyn();
    return;
  }
 
  if(tab==='add'){
    body.innerHTML=`
      <div style="max-width:640px">
        <div style="font-size:13px;color:var(--t2);margin-bottom:14px;line-height:1.6">
          Type a question, fill in 4 options, select the correct answer, then click <strong>Add to Set</strong>.
          Each question is immediately saved to the MCQ bank and linked to this set.
        </div>
        <div class="fg">
          <label class="flab">Question *</label>
          <textarea class="fin" id="mq-q" rows="3" placeholder="e.g. What is the output of print(type([]))?"></textarea>
        </div>
        <div style="display:grid;gap:8px;margin-bottom:14px">
          ${[0,1,2,3].map(i=>`
          <div style="display:flex;align-items:center;gap:10px">
            <input type="radio" name="mq-ans" value="${i}" id="mq-r${i}"
              style="width:18px;height:18px;accent-color:var(--g);flex-shrink:0;cursor:pointer"
              title="Click to mark as correct answer">
            <label for="mq-r${i}" style="width:28px;height:28px;border-radius:7px;background:var(--bg4);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0;color:var(--t2);cursor:pointer">
              ${'ABCD'[i]}
            </label>
            <input class="fin" id="mq-o${i}" placeholder="Option ${'ABCD'[i]}" style="flex:1;margin:0">
          </div>`).join('')}
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:14px">
          <div class="fg">
            <label class="flab">Difficulty</label>
            <select class="fin" id="mq-diff">
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
          <div class="fg">
            <label class="flab">Topic</label>
            <input class="fin" id="mq-topic" placeholder="e.g. Data Types">
          </div>
          <div class="fg" style="display:flex;align-items:flex-end">
            <button class="btn bg wfull" onclick="addManualQuestion()">➕ Add to Set</button>
          </div>
        </div>
        <div class="fg">
          <label class="flab">Explanation (optional)</label>
          <input class="fin" id="mq-exp" placeholder="Why is this the correct answer?">
        </div>
        <div id="mq-added-list" style="margin-top:14px"></div>
      </div>`;
    return;
  }
 
  if(tab==='json'){
    body.innerHTML=`
      <div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">
          <button class="tab active" id="qjt-json" onclick="switchImportSubTab('json')" style="padding:7px 14px">{ } JSON Array</button>
          <button class="tab" id="qjt-csv"  onclick="switchImportSubTab('csv')" style="padding:7px 14px">📄 CSV Paste</button>
          <button class="tab" id="qjt-sheet" onclick="switchImportSubTab('sheet')" style="padding:7px 14px">🟢 From Google Sheet</button>
        </div>
 
        <!-- JSON sub-tab -->
        <div id="qjst-json">
          <div style="font-family:'JetBrains Mono',monospace;font-size:11px;background:var(--bg4);padding:12px;border-radius:10px;color:var(--c);margin-bottom:10px;white-space:pre">[
  {
    "q": "What is the output of print(type([]))?",
    "opts": ["&lt;class 'list'&gt;", "&lt;class 'tuple'&gt;", "&lt;class 'set'&gt;", "&lt;class 'dict'&gt;"],
    "ans": 0,
    "diff": "easy",
    "topic": "Data Types",
    "explain": "[] creates a list object"
  }
]</div>
          <textarea class="fin" id="qj-json-area" rows="10" placeholder="Paste JSON array here..."></textarea>
          <div style="display:flex;gap:10px;margin-top:10px;align-items:center;flex-wrap:wrap">
            <button class="btn ba" onclick="importJSONToSet()">✅ Import & Add to Set</button>
            <span style="font-size:12px;color:var(--t2)">ans = 0 (A), 1 (B), 2 (C), 3 (D)</span>
          </div>
        </div>
 
        <!-- CSV sub-tab -->
        <div id="qjst-csv" class="hidden">
          <div style="font-family:'JetBrains Mono',monospace;font-size:11px;background:var(--bg4);padding:12px;border-radius:10px;color:var(--c);margin-bottom:10px;white-space:pre">difficulty,topic,question,opt_a,opt_b,opt_c,opt_d,correct(0-3),explanation
easy,Data Types,What is output of type([])?,list,tuple,set,dict,0,[] creates a list
medium,JOINs,Which JOIN returns all rows?,INNER,LEFT,RIGHT,FULL OUTER,3,FULL OUTER includes all rows</div>
          <textarea class="fin" id="qj-csv-area" rows="8" placeholder="Paste CSV rows here (with or without header)..."></textarea>
          <div style="display:flex;gap:10px;margin-top:10px">
            <button class="btn ba" onclick="importCSVToSet()">✅ Import & Add to Set</button>
          </div>
        </div>
 
        <!-- Sheet sub-tab -->
        <div id="qjst-sheet" class="hidden">
          <div style="font-size:13px;color:var(--t2);margin-bottom:14px;line-height:1.7">
            Fetch questions from a specific tab in your Google Sheet and add them directly to this set.
          </div>
          <div style="display:grid;grid-template-columns:1fr 120px;gap:10px;margin-bottom:12px">
            <div class="fg">
              <label class="flab">Google Sheet URL (auto-filled from settings)</label>
              <input class="fin" id="qj-sheet-url" placeholder="https://docs.google.com/spreadsheets/d/..." value="">
            </div>
            <div class="fg">
              <label class="flab">Tab Name</label>
              <input class="fin" id="qj-sheet-tab" placeholder="e.g. Python">
            </div>
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap">
            <button class="btn bg" onclick="fetchSheetToSet()">🔄 Fetch & Add to Set</button>
          </div>
          <div id="qj-sheet-status" style="margin-top:10px"></div>
        </div>
 
        <div id="qj-result" style="margin-top:12px"></div>
      </div>`;
    // Pre-fill sheet URL
    const savedUrl=localStorage.getItem('vns_sheet_url')||'';
    const urlEl=document.getElementById('qj-sheet-url');
    if(urlEl&&savedUrl) urlEl.value=savedUrl;
    // Pre-fill tab name from module
    const s=DB.sets.find(x=>String(x.id)===_qpickSetId);
    if(s){
      const m=DB.modules.find(x=>parseInt(x.id)===parseInt(s.moduleId));
      const tabEl=document.getElementById('qj-sheet-tab');
      const tabMap={0:'Python',1:'SQL_RDBMS',2:'MachineLearning',3:'Statistics',4:'BigData',5:'NumPy_Pandas',6:'MongoDB',7:'GenAI',8:'DataWarehouse',9:'Cassandra',10:'Java',11:'RProgramming',12:'Cloud',13:'Linux',14:'GitHub'};
      if(tabEl&&m) tabEl.value=tabMap[m.id]||m.name.replace(/\s+/g,'');
    }
    return;
  }
}

function switchImportSubTab(sub){
  ['json','csv','sheet'].forEach(t=>{
    const btn=document.getElementById('qjt-'+t);
    const panel=document.getElementById('qjst-'+t);
    if(btn) btn.classList.toggle('active', t===sub);
    if(panel) panel.classList.toggle('hidden', t!==sub);
  });
}

function importJSONToSet(){
  const s=DB.sets.find(x=>String(x.id)===_qpickSetId);
  if(!s){toast('Set not found','error');return;}
  const text=(document.getElementById('qj-json-area')?.value||'').trim();
  if(!text){toast('Paste JSON first','error');return;}
 
  let data;
  try{
    const clean=text.replace(/```json\n?/g,'').replace(/```\n?/g,'').trim();
    data=JSON.parse(clean);
  }catch(e){toast('Invalid JSON: '+e.message,'error');return;}
 
  if(!Array.isArray(data)){toast('JSON must be an array [...]','error');return;}
 
  const mid=parseInt(s.moduleId);
  let added=0;
  const errors=[];
 
  data.forEach((q,i)=>{
    if(!q.q&&!q.question){errors.push(`Item ${i+1}: missing question text (q)`);return;}
    const qText=(q.q||q.question||'').trim();
    const opts=(q.opts||q.options||[]).map(o=>String(o).trim());
    if(opts.length<4){errors.push(`Item ${i+1}: need exactly 4 options`);return;}
    const ans=parseInt(q.ans||q.correct||q.answer||0);
    if(isNaN(ans)||ans<0||ans>3){errors.push(`Item ${i+1}: ans must be 0–3`);return;}
    const newId=Date.now()+Math.random();
    DB.mcqBank.push({
      id:newId,moduleId:mid,
      diff:(q.diff||q.difficulty||'easy').toLowerCase()||'easy',
      topic:(q.topic||'General').trim(),
      q:qText,opts:opts.slice(0,4),ans,
      explain:(q.explain||q.explanation||'').trim()
    });
    if(!Array.isArray(s.linkedIds)) s.linkedIds=[];
    s.linkedIds.push(String(newId));
    _qpickSelected.add(String(newId));
    added++;
  });
 
  s.qCount=s.linkedIds.length;
  saveDB();
 
  const resultEl=document.getElementById('qj-result');
  if(resultEl){
    resultEl.innerHTML=`
      <div style="padding:12px 16px;background:rgba(34,197,94,.08);border:1px solid rgba(34,197,94,.25);border-radius:10px;font-size:13px">
        <div style="color:var(--g);font-weight:700;margin-bottom:4px">✅ ${added} question${added!==1?'s':''} imported!</div>
        ${errors.length?`<div style="color:var(--y);font-size:12px;margin-top:6px">⚠️ ${errors.length} skipped: ${errors.slice(0,3).join(' · ')}</div>`:''}
        <div style="font-size:12px;color:var(--t2);margin-top:4px">Set now has ${s.linkedIds.length} questions total.</div>
      </div>`;
  }
  updateQPickCount();
  toast(`✅ ${added} questions added to "${s.name}"`, 'success');
  // Clear textarea
  const area=document.getElementById('qj-json-area');
  if(area) area.value='';
}

function importCSVToSet(){
  const s=DB.sets.find(x=>String(x.id)===_qpickSetId);
  if(!s){toast('Set not found','error');return;}
  const text=(document.getElementById('qj-csv-area')?.value||'').trim();
  if(!text){toast('Paste CSV rows first','error');return;}
 
  const mid=parseInt(s.moduleId);
  const lines=text.split('\n').filter(l=>l.trim());
  if(!lines.length){toast('No data found','error');return;}
 
  // Detect if first line is header
  const firstNorm=lines[0].toLowerCase().replace(/['"]/g,'');
  const isHeader=firstNorm.includes('question')||firstNorm.includes('diff')||firstNorm.includes('opt');
  const dataStart=isHeader?1:0;
 
  let added=0;
  const errors=[];
 
  for(let i=dataStart;i<lines.length;i++){
    const p=parseCSVLine(lines[i]);
    // Expected: diff, topic, question, opt_a, opt_b, opt_c, opt_d, correct(0-3), explanation
    // Also support: question, opt_a, opt_b, opt_c, opt_d, correct
    let qText='', opts=[], ans=0, diff='easy', topic='General', exp='';
 
    if(isHeader){
      // Use header mapping
      const headers=parseCSVLine(lines[0]).map(h=>h.toLowerCase().replace(/[^a-z0-9]/g,''));
      const ci=n=>{const idx=headers.indexOf(n);return idx>=0?(p[idx]||'').trim():'';};
      qText=ci('question')||ci('questiontext')||ci('q');
      opts=[ci('opta')||ci('optiona')||ci('a'),ci('optb')||ci('optionb')||ci('b'),ci('optc')||ci('optionc')||ci('c'),ci('optd')||ci('optiond')||ci('d')];
      ans=parseInt(ci('correct03')||ci('correct')||ci('ans')||'0');
      diff=(ci('difficulty')||ci('diff')||'easy').toLowerCase()||'easy';
      topic=ci('topic')||ci('tag')||'General';
      exp=ci('explanation')||ci('explain')||ci('exp')||'';
    } else if(p.length>=8){
      // Positional: diff, topic, q, a, b, c, d, ans[, exp]
      diff=(p[0]||'easy').toLowerCase();topic=p[1]||'General';qText=p[2]||'';
      opts=[p[3]||'',p[4]||'',p[5]||'',p[6]||''];ans=parseInt(p[7]||'0');exp=p[8]||'';
    } else if(p.length>=6){
      // Minimal: q, a, b, c, d, ans
      qText=p[0]||'';opts=[p[1]||'',p[2]||'',p[3]||'',p[4]||''];ans=parseInt(p[5]||'0');
    }
 
    if(!qText){errors.push(`Row ${i+1}: empty question`);continue;}
    if(opts.some(o=>!o)){errors.push(`Row ${i+1}: missing options`);continue;}
    if(isNaN(ans)||ans<0||ans>3){errors.push(`Row ${i+1}: invalid correct index`);continue;}
 
    const newId=Date.now()+Math.random();
    DB.mcqBank.push({id:newId,moduleId:mid,diff,topic,q:qText.trim(),opts:opts.map(o=>o.trim()),ans,explain:exp.trim()});
    if(!Array.isArray(s.linkedIds)) s.linkedIds=[];
    s.linkedIds.push(String(newId));
    _qpickSelected.add(String(newId));
    added++;
  }
 
  s.qCount=s.linkedIds.length;
  saveDB();
 
  const resultEl=document.getElementById('qj-result');
  if(resultEl){
    resultEl.innerHTML=`
      <div style="padding:12px 16px;background:rgba(34,197,94,.08);border:1px solid rgba(34,197,94,.25);border-radius:10px;font-size:13px">
        <div style="color:var(--g);font-weight:700;margin-bottom:4px">✅ ${added} question${added!==1?'s':''} imported!</div>
        ${errors.length?`<div style="color:var(--y);font-size:12px;margin-top:6px">⚠️ ${errors.slice(0,3).join(' · ')}</div>`:''}
        <div style="font-size:12px;color:var(--t2);margin-top:4px">Set now has ${s.linkedIds.length} questions total.</div>
      </div>`;
  }
  updateQPickCount();
  toast(`✅ ${added} questions added to "${s.name}"`, 'success');
  const area=document.getElementById('qj-csv-area');
  if(area) area.value='';
}

async function fetchSheetToSet(){
  const s=DB.sets.find(x=>String(x.id)===_qpickSetId);
  if(!s){toast('Set not found','error');return;}
 
  const url=(document.getElementById('qj-sheet-url')?.value||'').trim();
  const tab=(document.getElementById('qj-sheet-tab')?.value||'').trim();
  if(!url){toast('Enter Google Sheet URL','error');return;}
  if(!tab){toast('Enter tab name','error');return;}
 
  const sheetId=getSheetId(url);
  if(!sheetId){toast('Invalid Google Sheet URL','error');return;}
 
  const statusEl=document.getElementById('qj-sheet-status');
  if(statusEl) statusEl.innerHTML=`<div class="ai-loading"><div class="ai-spinner"></div><span>Fetching "${tab}" tab...</span></div>`;
 
  try{
    const res=await fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tab)}`);
    if(!res.ok) throw new Error(`HTTP ${res.status} — is the sheet public?`);
    const text=await res.text();
    if(text.includes('<!DOCTYPE')) throw new Error('Sheet is private. Set sharing to Anyone with link → View.');
 
    const lines=text.trim().split('\n').filter(l=>l.trim());
    if(lines.length<2) throw new Error('Sheet tab appears empty or has no data rows.');
 
    // Auto-detect header row
    const HDR=['difficulty','diff','question','option a','opt_a','correct','explanation','topic'];
    let hdrIdx=0;
    for(let i=0;i<Math.min(5,lines.length);i++){
      const norm=lines[i].toLowerCase().replace(/['"]/g,'');
      if(HDR.filter(kw=>norm.includes(kw)).length>=3){hdrIdx=i;break;}
    }
    const headersRaw=parseCSVLine(lines[hdrIdx]).map(h=>h.toLowerCase().trim());
    const headers=headersRaw.map(h=>h.replace(/[^a-z0-9]/g,''));
    const fc=alts=>{let i=headers.findIndex(h=>alts.includes(h));if(i<0)i=headersRaw.findIndex(h=>alts.includes(h));return i;};
    const qIdx=fc(['question text','question','q','questiontext']);
    const o0i=fc(['option a','opt_a','opta','a']);const o1i=fc(['option b','opt_b','optb','b']);
    const o2i=fc(['option c','opt_c','optc','c']);const o3i=fc(['option d','opt_d','optd','d']);
    const ansi=fc(['correct (0-3)','correct03','correct','answer','ans']);
    const diffi=fc(['difficulty','diff','level']);const topici=fc(['topic','tag','subject']);
    const expi=fc(['explanation','explain','exp','hint']);
 
    if(qIdx<0||o0i<0||ansi<0) throw new Error('Missing required columns: question, options, correct. See format guide.');
 
    const mid=parseInt(s.moduleId);
    let added=0;
 
    for(let i=hdrIdx+1;i<lines.length;i++){
      const p=parseCSVLine(lines[i]);
      const qText=(p[qIdx]||'').trim();
      if(!qText) continue;
      const opts=[p[o0i]||'',p[o1i]||'',p[o2i]||'',p[o3i]||''].map(o=>o.trim());
      if(opts.some(o=>!o)) continue;
      const ans=parseInt(p[ansi]||'0');
      if(isNaN(ans)||ans<0||ans>3) continue;
      const newId=Date.now()+Math.random();
      DB.mcqBank.push({
        id:newId,moduleId:mid,
        diff:(diffi>=0?p[diffi]:'easy').toLowerCase().trim()||'easy',
        topic:(topici>=0?p[topici]:'General').trim()||'General',
        q:qText,opts,ans,
        explain:(expi>=0?p[expi]||'':'').trim()
      });
      if(!Array.isArray(s.linkedIds)) s.linkedIds=[];
      s.linkedIds.push(String(newId));
      _qpickSelected.add(String(newId));
      added++;
    }
 
    s.qCount=s.linkedIds.length;
    saveDB();
    updateQPickCount();
 
    if(statusEl) statusEl.innerHTML=`
      <div style="padding:12px 16px;background:rgba(34,197,94,.08);border:1px solid rgba(34,197,94,.25);border-radius:10px;font-size:13px;margin-top:10px">
        <div style="color:var(--g);font-weight:700">✅ ${added} questions fetched from "${tab}"</div>
        <div style="font-size:12px;color:var(--t2);margin-top:4px">Set now has ${s.linkedIds.length} questions total. Click <strong>Save & Close</strong> to finish.</div>
      </div>`;
    toast(`✅ ${added} questions imported from ${tab}`, 'success');
    // Also update bank count badge on pick tab
    const bankCount=document.getElementById('qptab-bank-count');
    const modQCount=DB.mcqBank.filter(q=>parseInt(q.moduleId)===mid).length;
    if(bankCount) bankCount.textContent=`(${modQCount})`;
 
  }catch(err){
    if(statusEl) statusEl.innerHTML=`<div style="padding:12px;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.2);border-radius:10px;color:var(--r);font-size:13px;margin-top:10px">❌ ${esc(err.message)}</div>`;
    toast('❌ '+err.message,'error',5000);
  }
}

async function pushQuestionsToSheet(setObj){
  const url=(($('gs-apps-script-url')&&$('gs-apps-script-url').value.trim())||localStorage.getItem('vns_apps_script_url')||'').trim();
  if(!url) return; // No Apps Script URL configured — silent skip
 
  const linkedIds=Array.isArray(setObj.linkedIds)?setObj.linkedIds.map(String):[];
  if(!linkedIds.length) return;
 
  const questions=DB.mcqBank.filter(q=>linkedIds.includes(String(q.id)));
  if(!questions.length) return;
 
  try{
    await fetch(url,{
      method:'POST',
      mode:'no-cors',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        action:'writeQuestions',
        moduleId:setObj.moduleId,
        setId:String(setObj.id),
        setName:setObj.name,
        questions:questions.map(q=>({
          id:String(q.id),
          moduleId:q.moduleId,
          diff:q.diff||'easy',
          topic:q.topic||'General',
          q:q.q,
          optA:q.opts[0]||'',
          optB:q.opts[1]||'',
          optC:q.opts[2]||'',
          optD:q.opts[3]||'',
          correct:q.ans,
          explanation:q.explain||''
        }))
      })
    });
  }catch(e){
    console.warn('pushQuestionsToSheet failed:',e);
  }
}

async function pushRawQuestionsToSheet(questionsArray) {
  const url=(($('gs-apps-script-url')&&$('gs-apps-script-url').value.trim())||localStorage.getItem('vns_apps_script_url')||'').trim();
  if(!url) return;
  const byMod = {};
  questionsArray.forEach(q => {
    const mId = parseInt(q.moduleId);
    if(!byMod[mId]) byMod[mId] = [];
    byMod[mId].push(q);
  });
  for (const [mid, qs] of Object.entries(byMod)) {
    try{
      await fetch(url,{
        method:'POST', mode:'no-cors', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          action:'writeQuestions',
          moduleId: parseInt(mid),
          setId: '',
          setName: '',
          questions: qs.map(q=>({
            id:String(q.id), moduleId:q.moduleId, diff:q.diff||'easy', topic:q.topic||'General',
            q:q.q, optA:q.opts[0]||'', optB:q.opts[1]||'', optC:q.opts[2]||'', optD:q.opts[3]||'',
            correct:q.ans, explanation:q.explain||''
          }))
        })
      });
    }catch(e){}
  }
}
// ── INIT ──
initDB();

document.addEventListener('DOMContentLoaded',()=>{
  // Wire confirm button (FIX: was outside DOMContentLoaded before)
  const asUrl=localStorage.getItem('vns_apps_script_url');
  if(asUrl) sessionStorage.setItem('vns_apps_script_url_session',asUrl);
  const cokEl=$('cok');
  if(cokEl) cokEl.onclick=()=>{if(_confCb)_confCb();closeConf();};
});
 
const GS_SHEET_TO_MODULE={'Python':0,'SQL_RDBMS':1,'MachineLearning':2,'Statistics':3,'BigData':4,'NumPy_Pandas':5,'MongoDB':6,'GenAI':7,'DataWarehouse':8,'Cassandra':9,'Java':10,'RProgramming':11,'Cloud':12,'Linux':13,'GitHub':14};
let _gsData=[];
 
function getSheetId(url){const m=url.match(/\/d\/([a-zA-Z0-9-_]+)/);return m?m[1]:url.trim();}
function getGSTabName(){const sel=$('gs-sheet-name');if(!sel)return '';const v=sel.value;if(v==='custom'){const c=$('gs-custom-name');return c?c.value.trim():'';}return v;}

function initGSTabMapping(){
  const list=$('gs-map-list');if(!list)return;
  const allTabMap={...GS_SHEET_TO_MODULE};
  DB.modules.filter(m=>m.sheetTab&&!allTabMap[m.sheetTab]).forEach(m=>{allTabMap[m.sheetTab]=m.id;});
  list.innerHTML=Object.entries(allTabMap).map(([sheet,modId])=>{const m=DB.modules.find(x=>parseInt(x.id)===modId);return `<div style="display:flex;align-items:center;gap:8px;padding:3px 0"><span style="font-family:'JetBrains Mono',monospace;color:var(--a2);min-width:130px;font-size:11px">${sheet}</span><span style="color:var(--t3);font-size:12px">→</span><span style="font-size:12px">${m?m.icon+' '+m.name:'?'}</span></div>`;}).join('');
}
 
async function fetchGoogleSheet(){
  const rawUrl=($('gs-url')||{value:''}).value.trim();
  const sheetId=getSheetId(rawUrl);const tabName=getGSTabName();
  if(!sheetId){toast('Enter a Google Sheet URL or ID','error');return;}
  if(!tabName){toast('Select or enter a sheet/tab name','error');return;}
  const status=$('gs-status');
  status.innerHTML=`<div class="ai-loading"><div class="ai-spinner"></div><span>Fetching "${tabName}" from Google Sheets...</span></div>`;
  status.classList.remove('hidden');$('gs-preview').classList.add('hidden');$('gs-import-btn-area').classList.add('hidden');_gsData=[];
  const csvUrl=`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tabName)}`;
  try{
    const res=await fetch(csvUrl);
    if(!res.ok) throw new Error(`HTTP ${res.status} — is the sheet public?`);
    const text=await res.text();
    if(text.includes('<!DOCTYPE')||text.includes('signin')) throw new Error('Sheet is private. Share → Anyone with link can view');
    parseGSCSV(text,tabName,sheetId);
  }catch(err){
    status.innerHTML=`<div style="background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.2);border-radius:10px;padding:12px 15px;color:var(--r);font-size:13px">❌ <strong>Failed:</strong> ${esc(err.message)}</div>`;
  }
}

function parseGSCSV(text,tabName,sheetId){
  const lines=text.trim().split('\n').filter(l=>l.trim());
  if(lines.length<2){showGSError('Sheet appears empty or has only headers.');return;}
  const HEADER_KEYWORDS=['difficulty','diff','question','question text','option a','opt_a','option b','opt_b','correct','explanation','topic'];
  let headerLineIdx=0;
  for(let i=0;i<Math.min(5,lines.length);i++){const normalized=lines[i].toLowerCase().replace(/['"]/g,'');if(HEADER_KEYWORDS.filter(kw=>normalized.includes(kw)).length>=3){headerLineIdx=i;break;}}
  const dataStartIdx=headerLineIdx+1;
  const modId=GS_SHEET_TO_MODULE[tabName];
  const m=modId!==undefined?DB.modules.find(x=>parseInt(x.id)===modId):null;
  const headersRaw=parseCSVLine(lines[headerLineIdx]).map(h=>h.toLowerCase().trim());
  const headers=headersRaw.map(h=>h.replace(/[^a-z0-9]/g,''));
  const colMap={};
  const aliases={diff:['difficulty','diff','level'],topic:['topic','tag','subject'],q:['question text','question','q','question_text','questiontext'],o0:['option a','opt_a','option_a','option1','a','opta'],o1:['option b','opt_b','option_b','option2','b','optb'],o2:['option c','opt_c','option_c','option3','c','optc'],o3:['option d','opt_d','option_d','option4','d','optd'],ans:['correct (0-3)','correct03','correct0_3','correct','answer','correct_answer','ans'],explain:['explanation','explain','exp','hint'],mid:['module_id','moduleid','module'],setid:['set id','set_id','setid'],active:['active (y/n)','active yn','active_yn','active']};
  Object.entries(aliases).forEach(([key,alts])=>{let idx=headers.findIndex(h=>alts.includes(h));if(idx<0)idx=headersRaw.findIndex(h=>alts.includes(h));if(idx>=0)colMap[key]=idx;});
  const required=['q','o0','o1','o2','o3','ans'];
  const missing=required.filter(k=>colMap[k]===undefined);
  if(missing.length){showGSError(`Missing columns: ${missing.join(', ')}`);return;}
  const questions=[],errors=[];
  for(let i=dataStartIdx;i<lines.length;i++){
    const parts=parseCSVLine(lines[i]);
    const qText=(parts[colMap.q]||'').trim();if(!qText)continue;
    const opts=[0,1,2,3].map(j=>(parts[colMap['o'+j]]||'').trim());
    if(opts.some(o=>!o)){errors.push(`Row ${i+1}: missing option`);continue;}
    const ansIdx=parseInt((parts[colMap.ans]||'').trim());
    if(isNaN(ansIdx)||ansIdx<0||ansIdx>3){errors.push(`Row ${i+1}: invalid correct value`);continue;}
    let rowModId=modId;
    if(colMap.mid!==undefined&&parts[colMap.mid]){const parsedMid=parseInt(parts[colMap.mid]);if(!isNaN(parsedMid))rowModId=parsedMid;}
    if(rowModId===undefined){errors.push(`Row ${i+1}: cannot determine module`);continue;}
    const rawSetId=colMap.setid!==undefined?(parts[colMap.setid]||'').trim():'';
    const rawActive=colMap.active!==undefined?(parts[colMap.active]||'y').trim().toLowerCase():'y';
    questions.push({moduleId:parseInt(rowModId),diff:(parts[colMap.diff]||'easy').toLowerCase().trim()||'easy',topic:(parts[colMap.topic]||'General').trim(),q:qText,opts,ans:ansIdx,explain:(colMap.explain!==undefined?(parts[colMap.explain]||''):'').trim(),presetSetId:rawSetId||null,active:rawActive!=='n'&&rawActive!=='no'&&rawActive!=='false'});
  }
  _gsData=questions;
  const status=$('gs-status');
  status.innerHTML=`<div style="background:rgba(34,197,94,.08);border:1px solid rgba(34,197,94,.2);border-radius:10px;padding:11px 14px;font-size:13px">✅ <strong>Fetched from "${tabName}"</strong> — ${questions.length} questions ready${errors.length?` (${errors.length} rows skipped)`:''} ${m?`<span style="margin-left:8px;padding:2px 8px;border-radius:5px;background:rgba(108,99,255,.15);color:var(--a2);font-size:11px">${m.icon} ${m.name}</span>`:''}</div>`;
  if(questions.length){
    $('gs-preview').innerHTML=`<div style="margin-top:10px;background:var(--bg3);border-radius:12px;overflow:hidden;max-height:220px;overflow-y:auto"><table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr>${['#','Diff','Topic','Question','Correct Answer'].map(h=>`<th style="padding:8px 12px;background:var(--bg4);text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.4px;color:var(--t2)">${h}</th>`).join('')}</tr></thead><tbody>${questions.slice(0,10).map((q,i)=>`<tr style="border-top:1px solid var(--b)"><td style="padding:7px 12px;color:var(--t3)">${i+1}</td><td style="padding:7px 12px"><span class="badge b${q.diff[0]}">${q.diff}</span></td><td style="padding:7px 12px;color:var(--t2)">${esc(q.topic)}</td><td style="padding:7px 12px">${esc(q.q.substring(0,60))}${q.q.length>60?'...':''}</td><td style="padding:7px 12px;color:var(--g)">${esc(q.opts[q.ans])}</td></tr>`).join('')}${questions.length>10?`<tr><td colspan="5" style="padding:8px 12px;text-align:center;color:var(--t3);font-size:11px">…and ${questions.length-10} more</td></tr>`:''}</tbody></table></div>`;
    $('gs-preview').classList.remove('hidden');
    $('gs-count').textContent=`${questions.length} questions from "${tabName}"`;
    $('gs-import-btn-area').classList.remove('hidden');
  }
}
 


async function fetchAllModuleSheets(){
  const rawUrl=($('gs-url')||{value:''}).value.trim();
  const sheetId=getSheetId(rawUrl);
  if(!sheetId){toast('Enter a Google Sheet URL or ID','error');return;}
  const status=$('gs-status');
  status.innerHTML=`<div class="ai-loading"><div class="ai-spinner"></div><span>Fetching all 8 module sheets...</span></div>`;
  status.classList.remove('hidden');$('gs-preview').classList.add('hidden');$('gs-import-btn-area').classList.add('hidden');_gsData=[];
  const allQs=[],results=[];
  const HDR_KW=['difficulty','diff','question','question text','option a','opt_a','option b','opt_b','correct','explanation','topic'];
  const allFetchMap={...GS_SHEET_TO_MODULE};
  DB.modules.filter(m=>m.sheetTab&&!(m.sheetTab in allFetchMap)).forEach(m=>{allFetchMap[m.sheetTab]=m.id;});
  for(const [tabName,modId] of Object.entries(allFetchMap)){
    try{
      const res=await fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tabName)}`);
      if(!res.ok){results.push(`❌ ${tabName}: HTTP ${res.status}`);continue;}
      const text=await res.text();
      if(text.includes('<!DOCTYPE')||text.includes('signin')){results.push(`🔒 ${tabName}: not public`);continue;}
      const lines=text.trim().split('\n').filter(l=>l.trim());
      if(lines.length<2){results.push(`⬛ ${tabName}: empty`);continue;}
      let hdrIdx=0;
      for(let i=0;i<Math.min(5,lines.length);i++){const norm=lines[i].toLowerCase().replace(/['"]/g,'');if(HDR_KW.filter(kw=>norm.includes(kw)).length>=3){hdrIdx=i;break;}}
      const dataStart=hdrIdx+1;
      const headersRaw=parseCSVLine(lines[hdrIdx]).map(h=>h.toLowerCase().trim());
      const headers=headersRaw.map(h=>h.replace(/[^a-z0-9]/g,''));
      const findCol=(alts)=>{let idx=headers.findIndex(h=>alts.includes(h));if(idx<0)idx=headersRaw.findIndex(h=>alts.includes(h));return idx;};
      const qIdx=findCol(['question text','question','q','question_text','questiontext']);
      const o0i=findCol(['option a','opt_a','option_a','option1','opta','a']);
      const o1i=findCol(['option b','opt_b','option_b','option2','optb','b']);
      const o2i=findCol(['option c','opt_c','option_c','option3','optc','c']);
      const o3i=findCol(['option d','opt_d','option_d','option4','optd','d']);
      const ansi=findCol(['correct (0-3)','correct03','correct0_3','correct','answer','ans','correct_answer']);
      const diffi=findCol(['difficulty','diff','level']);
      const topici=findCol(['topic','tag','subject']);
      const expi=findCol(['explanation','explain','exp','hint']);
      if(qIdx<0||o0i<0||o1i<0||o2i<0||o3i<0||ansi<0){results.push(`⚠️ ${tabName}: missing required columns`);continue;}
      let count=0;
      for(let i=dataStart;i<lines.length;i++){
        const parts=parseCSVLine(lines[i]);
        const qText=(parts[qIdx]||'').trim();if(!qText)continue;
        const opts=[parts[o0i]||'',parts[o1i]||'',parts[o2i]||'',parts[o3i]||''].map(o=>o.trim());
        if(opts.some(o=>!o))continue;
        const ansIdx=parseInt(parts[ansi]||'0');
        if(isNaN(ansIdx)||ansIdx<0||ansIdx>3)continue;
        allQs.push({moduleId:modId,diff:(diffi>=0?parts[diffi]:'easy').toLowerCase().trim()||'easy',topic:(topici>=0?parts[topici]:'General').trim(),q:qText,opts,ans:ansIdx,explain:(expi>=0?parts[expi]:'').trim()});
        count++;
      }
      results.push(`✅ ${tabName}: ${count} question${count!==1?'s':''}`);
    }catch(e){results.push(`❌ ${tabName}: ${e.message}`);}
  }
  _gsData=allQs;
  status.innerHTML=`<div style="background:rgba(34,197,94,.07);border:1px solid rgba(34,197,94,.2);border-radius:11px;padding:14px 16px"><div style="font-size:14px;font-weight:600;color:var(--g);margin-bottom:10px">📦 All Modules Fetch Complete — ${allQs.length} total questions</div><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px">${results.map(r=>`<div style="font-size:12px;padding:5px 9px;background:var(--bg4);border-radius:7px">${r}</div>`).join('')}</div></div>`;
  if(allQs.length){$('gs-count').textContent=`${allQs.length} total questions`;$('gs-import-btn-area').classList.remove('hidden');}
}





async function exportScoresToSheet(){
  const url=($('gs-apps-script-url')||{value:''}).value.trim();
  if(!url){toast('Enter your Apps Script URL first','error');return;}
  if(!DB.scores.length){toast('No scores to export yet','warning');return;}
  toast('Pushing scores to Google Sheet...','info',2000);
  try{
    await fetch(url,{method:'POST',mode:'no-cors',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'writeScores',scores:DB.scores})});
    toast('✅ Scores pushed to Google Sheet!','success');
  }catch(e){toast('Push failed: '+e.message+' — check your Apps Script URL','error');}
}


async function saveSetToAppsScript(s) {
  try {
    await sb.from('sets').upsert([s]);
  } catch(e) { console.error('Supabase set save error:', e); }
}
async function deleteSetFromAppsScript(setId){
  const url=($('gs-apps-script-url')&&$('gs-apps-script-url').value.trim())||localStorage.getItem('vns_apps_script_url');
  if(!url) return;
  try{await fetch(url,{method:'POST',mode:'no-cors',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'deleteSet',setId})});}catch(e){}
}


// --- MODULES UI ---
function renderModulesTable() {
  const tb = document.getElementById('mods-tbody');
  if(!tb) return;
  tb.innerHTML = '';
  if(!DB.modules || !DB.modules.length) {
    tb.innerHTML = '<tr><td colspan="5" style="padding:20px;text-align:center;color:var(--t2)">No modules found</td></tr>';
    return;
  }
  DB.modules.forEach(m => {
    const tr = document.createElement('tr');
    tr.style.borderBottom = '1px solid var(--b)';
    tr.innerHTML = `
      <td style="padding:12px;color:var(--t2)">#${m.id}</td>
      <td style="padding:12px;font-size:20px">${m.icon||'📚'}</td>
      <td style="padding:12px;font-weight:600">${m.name}</td>
      <td style="padding:12px;color:var(--t2)">${m.desc||''}</td>
      <td style="padding:12px">
        <button class="btn bo" style="padding:6px 12px;font-size:12px" onclick="deleteModule(${m.id})">Delete</button>
      </td>
    `;
    tb.appendChild(tr);
  });
}

async function deleteModule(id) {
  if(!confirm('Delete this module?')) return;
  try {
    await sb.from('modules').delete().eq('id', id);
    DB.modules = DB.modules.filter(m => m.id !== id);
    renderModulesTable();
    toast('Module deleted', 'success');
  } catch(e) { toast('Error deleting module', 'error'); }
}

// Hook into switchAdminPanel
const oldSwitchAdminPanel = window.switchAdminPanel;
window.switchAdminPanel = function(pid) {
  if(oldSwitchAdminPanel) oldSwitchAdminPanel(pid);
  if(pid === 'amods') renderModulesTable();
};
