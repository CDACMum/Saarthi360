(()=>{
  const c=document.getElementById('ptcls');
  const cols=['rgba(108,99,255,','rgba(6,182,212,','rgba(236,72,153,','rgba(34,197,94,','rgba(245,158,11,'];
  for(let i=0;i<18;i++){
    const p=document.createElement('div');p.className='ptcl';
    const cl=cols[i%cols.length];
    p.style.cssText=`left:${Math.random()*100}%;width:${Math.random()*5+2}px;height:${Math.random()*5+2}px;background:${cl}${Math.random()*.5+.2});animation-duration:${Math.random()*14+8}s;animation-delay:-${Math.random()*14}s`;
    c.appendChild(p);
  }
})();

// ── STATE ──
const DB={
  students:[],modules:[],mcqBank:[],sets:[],scores:[],
  adminPass:'admin',
  settings:{timer:45,qCount:50,passmark:60,adaptive:true,shuffle:true},
  activityLog:[]
};

const SES={
  user:null,isAdmin:false,
  modIdx:null,setId:null,questions:[],answers:{},marked:new Set(),
  curQ:0,secs:2700,timerInt:null,startTime:null,diff:'easy',
  stats:{tests:0,best:0,qs:0,streak:0}
};

let _aiQuestions=[];
let _csvData=[];
let _confCb=null;

// ── UTILS ──
const $=id=>document.getElementById(id);
const fmt=s=>String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');
const esc=s=>(s+'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const shuf=a=>{const b=[...a];for(let i=b.length-1;i>0;i--){const j=~~(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]]}return b};
const uid=()=>Date.now()+Math.random();
const avg=arr=>arr.length?Math.round(arr.reduce((a,b)=>a+b,0)/arr.length):0;

function showScreen(id){document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));$(id).classList.add('active');window.scrollTo(0,0)}
function openModal(id){$(id).classList.remove('hidden')}
function closeModal(id){$(id).classList.add('hidden')}

function toast(msg,type='info',dur=3200){
  const icons={success:'✅',error:'❌',info:'ℹ️',warning:'⚠️'};
  const t=document.createElement('div');t.className=`toast ${type}`;
  t.innerHTML=`<span>${icons[type]}</span><span>${msg}</span>`;
  $('tc').appendChild(t);
  setTimeout(()=>{t.classList.add('hide');setTimeout(()=>t.remove(),350)},dur);
}

function confAction(title,msg,cb,icon='⚠️'){
  $('ci').textContent=icon;$('ctit').textContent=title;$('cmsg').textContent=msg;
  _confCb=cb;$('conf-mo').classList.remove('hidden');
}
function closeConf(){$('conf-mo').classList.add('hidden');_confCb=null}
$('cok').onclick=()=>{if(_confCb)_confCb();closeConf()};

function sp(id){
  document.querySelectorAll('.panel').forEach(p=>{p.classList.remove('active');p.classList.add('hidden')});
  const p=$('p-'+id);if(p){p.classList.remove('hidden');p.classList.add('active')}
  document.querySelectorAll('.ni').forEach(n=>n.classList.remove('active'));
  const nav=$('nav-'+id);if(nav)nav.classList.add('active');
  if(id==='astudents')renderStudents();
  if(id==='amcq'){populateModSels();renderMCQ();}
  if(id==='amodules')renderAdminMods();
  if(id==='asets'){populateModSels();renderSetsPanel(null);}
  if(id==='ascores')renderScoreAnalytics('overview');
  if(id==='aleaderboard')renderAdminLeaderboard();
  if(id==='aimport'){renderModIDRef();populateModSels()}
  if(id==='adash')refreshAdminDash();
  if(id==='my-scores')renderMyScores();
  if(id==='leaderboard')renderStudentLeaderboard();
}

// ── INIT DATA ──
function initDB(){
  
    DB.modules=[
    {id:0,name:'Python Programming',icon:'🐍',desc:'Core Python for Data Science',topics:['Data Types','Functions','OOP','Exceptions','Decorators','Generators','Comprehensions','File I/O']},
    {id:1,name:'SQL & RDBMS',icon:'🗄️',desc:'Database queries and design',topics:['SELECT Queries','JOINs','Aggregations','Indexing','Transactions','Normalization','Window Functions','Stored Procedures']},
    {id:2,name:'Machine Learning',icon:'🤖',desc:'ML algorithms and concepts',topics:['Regression','Classification','Clustering','Gradient Descent','Overfitting','Cross-Validation','SVM','Ensemble']},
    {id:3,name:'Statistics & Probability',icon:'📊',desc:'Statistical foundations',topics:['Descriptive Stats','Distributions','Hypothesis Testing','Correlation','Bayes Theorem','CLT','Confidence Intervals','Regression']},
    {id:4,name:'Big Data & Hadoop',icon:'🐘',desc:'Big data ecosystem',topics:['HDFS','MapReduce','Spark','Kafka','Hive','HBase','YARN','Pig']},
    {id:5,name:'NumPy & Pandas',icon:'🧮',desc:'Data manipulation libraries',topics:['Arrays','DataFrames','Indexing','GroupBy','Merge/Join','Vectorization','Broadcasting','Time Series']},
    {id:6,name:'MongoDB & NoSQL',icon:'🍃',desc:'NoSQL databases',topics:['CRUD','Aggregation Pipeline','Indexing','Schema Design','Sharding','Replication','Cassandra','Redis']},
    {id:7,name:'Gen AI & Deep Learning',icon:'✨',desc:'Generative AI & deep learning',topics:['Neural Networks','CNN','RNN','Transformers','LLMs','Prompt Engineering','GANs','Transfer Learning']},
    {id:8,name:'Data Warehousing',icon:'🏭',desc:'ETL and DW concepts',topics:['ETL','OLAP vs OLTP','Star Schema','Snowflake Schema','Data Marts']},
    {id:9,name:'Cassandra',icon:'🏛️',desc:'Distributed NoSQL database',topics:['Architecture','Data Modeling','CQL','Replication','Consistency','Gossip Protocol']},
    {id:10,name:'Java Programming',icon:'☕',desc:'Core Java concepts',topics:['OOP','Collections','Multithreading','Exception Handling','JVM','Streams']},
    {id:11,name:'R Programming',icon:'📈',desc:'Statistical computing in R',topics:['Vectors','DataFrames','ggplot2','dplyr','Statistical Modeling']},
    {id:12,name:'Cloud Computing',icon:'☁️',desc:'AWS, Azure & GCP basics',topics:['IaaS/PaaS/SaaS','Virtualization','Cloud Storage','Serverless','IAM']},
    {id:13,name:'Linux',icon:'🐧',desc:'Linux OS and command line',topics:['File System','Bash Scripting','Permissions','Process Management','Networking']},
    {id:14,name:'GitHub & Git',icon:'🐙',desc:'Version control systems',topics:['Commits','Branches','Merging','Pull Requests','Rebasing','GitHub Actions']}
  ];
  // Students, sets, scores, mcqBank all start empty — loaded from sheet
  DB.students=[];
  DB.sets=[];
  DB.scores=[];
  DB.mcqBank=[];
  DB.adminPass=DB.adminPass||'admin';
  DB.settings=DB.settings||{timer:45,qCount:50,passmark:60,adaptive:true,shuffle:true};
  // No sets pre-seeded — admin creates sets via Bulk Import or Manage Sets
  // This ensures students only see sets that admin has intentionally published
}
const LS_KEY='vnslabs_v1';
 

function saveDB() {
  // disabled local storage caching to prefer Supabase live data

}
 
function loadDB(){
  try{
    const raw=localStorage.getItem(LS_KEY);
    if(!raw)return false;
    const s=JSON.parse(raw);
    // Only restore session-critical data — questions/sets always re-fetch from sheet
    if(s.adminPass)  DB.adminPass=s.adminPass;
    if(s.settings)   DB.settings=s.settings;
    // Restore cached scores so leaderboard works offline
    const scoreCache=localStorage.getItem('vns_scores_cache');
    if(scoreCache){
      try{ DB.scores=JSON.parse(scoreCache)||[]; }catch(e){}
    } else if(s.scores?.length){
      DB.scores=s.scores;
    }
    return true;
  }catch(e){return false;}
}
 
function showSheetSetup(){
  const dash=$('p-adash');
  if(!dash||$('sheet-setup-banner'))return;
  const banner=document.createElement('div');
  banner.id='sheet-setup-banner';
  banner.innerHTML=`<div style="background:rgba(108,99,255,.08);border:1px solid rgba(108,99,255,.3);border-radius:16px;padding:22px 24px;margin-bottom:20px;display:flex;gap:16px;align-items:flex-start">
    <div style="font-size:32px;flex-shrink:0">🔗</div>
    <div style="flex:1">
      <div style="font-size:16px;font-weight:700;color:var(--a2);margin-bottom:6px">Connect your Google Sheet to get started</div>
      <div style="font-size:13px;color:var(--t2);line-height:1.7;margin-bottom:14px">
        Paste your Google Sheet URL below. The platform will load all students, questions and sets from it.
        Make sure the sheet is set to <strong style="color:var(--g)">"Anyone with link can view"</strong>.
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
        <input class="fin" id="setup-sheet-url" placeholder="https://docs.google.com/spreadsheets/d/YOUR_ID/..." style="flex:1;min-width:260px;font-size:13px">
        <button class="btn ba" onclick="doSheetSetup()">🔗 Connect &amp; Import</button>
      </div>
    </div>
  </div>`;
  dash.insertBefore(banner,dash.firstChild);
}
 
async function doSheetSetup(){
  const url=($('setup-sheet-url')||{value:''}).value.trim();
  if(!url){toast('Paste your Google Sheet URL','error');return}
  localStorage.setItem('vns_sheet_url',url);
  const sheetEl=$('gs-url');if(sheetEl)sheetEl.value=url;
  const b=$('sheet-setup-banner');if(b)b.remove();
  toast('Sheet URL saved — syncing...','info',3000);
  await autoSyncDataFromSheet(true);
  saveDB();
  refreshAdminDash();renderStudents();populateModSels();
  toast(`✅ ${DB.students.length} students · ${DB.mcqBank.length} questions · ${DB.sets.length} sets loaded`,'success',5000);
}
 
// No demo data — all scores are real

// ── LOGIN ──

function showLE(m){const e=$('lerr');e.textContent='❌ '+m;e.classList.add('show')}
function hideLE(){$('lerr').classList.remove('show')}
document.addEventListener('DOMContentLoaded',()=>{
  initDB();
  loadDB(); 
   const asUrl=localStorage.getItem('vns_apps_script_url');
  if(asUrl) sessionStorage.setItem('vns_apps_script_url_session',asUrl);
  $('t-tmr').textContent='45:00';
 
  // Keyboard shortcuts on login
  $('lid').onkeydown=e=>{if(e.key==='Enter')$('lpw').focus()};
  $('lpw').onkeydown=e=>{if(e.key==='Enter')doLogin()};
 
  // Restore saved Apps Script URL
  setTimeout(()=>{
    const saved=localStorage.getItem('vns_apps_script_url');
    const sheetSaved=localStorage.getItem('vns_sheet_url');
    const el=$('gs-apps-script-url');
    const sheetEl=$('gs-url');
    if(el&&saved) el.value=saved;
    if(sheetEl&&sheetSaved) sheetEl.value=sheetSaved;
    if(el) el.addEventListener('change',ev=>{
      const v=ev.target.value.trim();
      if(v) localStorage.setItem('vns_apps_script_url',v);
    });
    if(sheetEl) sheetEl.addEventListener('change',ev=>{
      const v=ev.target.value.trim();
      if(v) localStorage.setItem('vns_sheet_url',v);
    });
  },300);
  // Show first-time setup hint if no sheet URL saved
  if(!localStorage.getItem('vns_sheet_url')) localStorage.setItem('vns_sheet_url','https://docs.google.com/spreadsheets/d/1AJDJNexJRTQFfGglY4-GKkL9my7UL9c-INGq-61eXX4/');
  const savedSheet=localStorage.getItem('vns_sheet_url');
  if(!savedSheet){
    // Show subtle hint below login form
    const hint=document.createElement('div');
    hint.style.cssText='text-align:center;margin-top:12px;font-size:11px;color:var(--t3);line-height:1.6';
    hint.innerHTML='🔗 First time? Login as Admin (0000) to connect your Google Sheet.';
    const lc=document.querySelector('.lc');
    if(lc) lc.appendChild(hint);
  }
});
function logout(){
  clearInterval(SES.timerInt);
  Object.assign(SES,{user:null,isAdmin:false,questions:[],answers:{},marked:new Set(),curQ:0,secs:2700,timerInt:null,diff:'easy',stats:{tests:0,best:0,qs:0,streak:0}});
  $('lid').value='';$('lpw').value='';showScreen('s-login');
}

function launchApp(){
  showScreen('s-app');
  const u=SES.user;
 
  if(SES.isAdmin){
    $('snav-student').classList.add('hidden');
    $('snav-admin').classList.remove('hidden');
    $('sbav').style.background='linear-gradient(135deg,var(--r),var(--o))';
    $('sbav').textContent='AD';
    $('sbun').textContent='Administrator';
    $('sbuid').textContent='ID: 0000';
    populateModSels();
 
    // Restore sheet URL from localStorage into the input
    const savedSheet=localStorage.getItem('vns_sheet_url');
    const sheetEl=$('gs-url');
    if(sheetEl&&savedSheet) sheetEl.value=savedSheet;
 
    // Check if sheet URL is configured
    const sheetId=getSheetId((sheetEl&&sheetEl.value)||'');
    if(!sheetId){
      sp('asettings');
      // Show a prominent setup banner in settings
      setTimeout(()=>{
        const existing=$('sheet-setup-banner');
        if(existing) return;
        const banner=document.createElement('div');
        banner.id='sheet-setup-banner';
        banner.style.cssText='background:rgba(108,99,255,.1);border:1px solid rgba(108,99,255,.3);border-radius:14px;padding:20px 22px;margin-bottom:18px;display:flex;gap:14px;align-items:flex-start';
        banner.innerHTML=`
          <div style="font-size:28px;flex-shrink:0">🔗</div>
          <div style="flex:1">
            <div style="font-size:15px;font-weight:700;color:var(--a2);margin-bottom:6px">Connect your Google Sheet to get started</div>
            <div style="font-size:13px;color:var(--t2);line-height:1.7;margin-bottom:12px">
              All students, questions, and sets load from your Google Sheet.<br>
              Paste your sheet URL below, then go to <strong>Bulk Import → Google Sheets</strong> to load data.
            </div>
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
              <input class="fin" id="setup-sheet-url" placeholder="https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/..."
                style="flex:1;min-width:280px;font-size:13px"
                value="${savedSheet||''}">
              <button class="btn ba" onclick="saveSheetUrl()">💾 Save URL</button>
              <button class="btn bc" onclick="sp('aimport');switchImportTab('gsheets')" style="margin-top:0">
                📥 Import Data →
              </button>
            </div>
            <div style="font-size:11px;color:var(--t3);margin-top:8px">
              Your sheet must be set to <strong>Anyone with the link can view</strong>
            </div>
          </div>`;
        const settings=$('p-asettings');
        if(settings) settings.insertBefore(banner,settings.firstChild);
      },100);
      toast('👋 Welcome! Connect your Google Sheet to load students and questions.','info',6000);
    } else {
      sp('adash');
      // Sync data silently in background
      autoSyncDataFromSheet(false).then(()=>{
        refreshAdminDash();
        toast(`✅ Data synced from Google Sheet`,'success',2500);
      });
    }
 
  } else {
    $('snav-student').classList.remove('hidden');
    $('snav-admin').classList.add('hidden');
    const init=u.name.split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase();
    $('sbav').textContent=init;
    $('sbun').textContent=u.name.trim();
    $('sbuid').textContent='ID: '+u.id;
    $('wel').textContent='Welcome, '+u.name.trim().split(' ')[0]+'! 👋';
    $('s-id-pill').textContent='ID: '+u.id;
    
    // Rebuild persistent stats from saved scores
    const mySaved = DB.scores.filter(s => s.studentId === u.id);
    if(mySaved.length){
        SES.stats.tests = mySaved.length;
        SES.stats.best  = Math.max(...mySaved.map(s=>s.pct));
        SES.stats.qs    = mySaved.reduce((t,s)=>t+s.total,0);
    }
    updateStuStats();
 
    // Sync questions and sets for student (silent)
    const savedSheet=localStorage.getItem('vns_sheet_url');
    const sheetEl=$('gs-url');
    if(sheetEl&&savedSheet) sheetEl.value=savedSheet;
 
    autoSyncDataFromSheet(false).then(()=>{
      renderStudentMods();
    });
    renderStudentMods();
    sp('modules');
  }
}

function saveSheetUrl(){
  const url=($('setup-sheet-url')||$('gs-url')||{value:''}).value.trim();
  if(!url){toast('https://docs.google.com/spreadsheets/d/1AJDJNexJRTQFfGglY4-GKkL9my7UL9c-INGq-61eXX4/','error');return}
  localStorage.setItem('vns_sheet_url',url);
  const sheetEl=$('gs-url');
  if(sheetEl) sheetEl.value=url;
  toast('✅ Sheet URL saved','success');
  // Remove setup banner and go to import
  const b=$('sheet-setup-banner');if(b)b.remove();
  sp('aimport');
  switchImportTab('gsheets');
}
 
// ─────────────────────────────────────────────────────────────
//  UPDATE doLogin() — load students from sheet before checking login
//  Find:   function doLogin(){
//  Replace ENTIRE doLogin function:
// ─────────────────────────────────────────────────────────────
async function doLogin(){
  const id=$('lid').value.trim(), pw=$('lpw').value.trim();
  if(!id||!pw){showLE('Enter ID and password.');return}

  // Pull admin password from Config sheet if Apps Script URL is set (so password change propagates)
  if(id==='0000'){
    await syncConfigFromSheet();
  }

  // Admin check (0000 = admin, password from Config sheet or localStorage)
  if(id==='0000'&&pw===DB.adminPass){
    SES.user={id:'0000',name:'Administrator',isAdmin:true};
    SES.isAdmin=true;hideLE();launchApp();return;
  }
 
  // For students: check in-memory DB first, then try loading from sheet
  const checkStudent=()=>{
    const st=DB.students.find(s=>s.id===id);
    if(!st){showLE('Student ID not found. Ask admin to sync the Students sheet.');return}
    if(st.status==='inactive'){showLE('Account inactive. Contact admin.');return}
    if(pw!==st.pass){showLE('Incorrect password.');return}
    SES.user={...st,isAdmin:false};SES.isAdmin=false;hideLE();launchApp();
  };
 
  if(DB.students.length>0){
    // Students already loaded
    checkStudent();
  } else {
    // Try loading from sheet first
    const KNOWN='https://docs.google.com/spreadsheets/d/1AJDJNexJRTQFfGglY4-GKkL9my7UL9c-INGq-61eXX4/';
    const savedSheet = localStorage.getItem('vns_sheet_url') || KNOWN;
    localStorage.setItem('vns_sheet_url', savedSheet);
    if($('gs-url')) $('gs-url').value = savedSheet;
    // Ensure gs-url has the value (for autoSyncDataFromSheet to read)
    if($('gs-url')) $('gs-url').value = savedSheet;
    else {
      // Remove any previous temp element before creating a new one
      const prevTmp = document.querySelector('[data-temp="1"]');
      if (prevTmp) prevTmp.remove();
      const tmp = document.createElement('input');
      tmp.id='gs-url'; tmp.type='hidden'; tmp.value=savedSheet;
      tmp.setAttribute('data-temp','1');
      document.body.appendChild(tmp);
    }
    
    const e=$('lerr');
    e.innerHTML='⏳ Loading student data...';
    e.style.background='rgba(108,99,255,.1)';
    e.style.borderColor='rgba(108,99,255,.25)';
    e.style.color='var(--a2)';
    e.classList.add('show');
    
    syncStudentsFromSheet().then(()=>{
      e.style.background='';e.style.borderColor='';e.style.color='';
      // Remove temp element if we created one
      const tmp=document.querySelector('[data-temp="1"]');if(tmp)tmp.remove();
      if(DB.students.length===0){showLE('Students sheet is empty or could not be loaded.');return}
       checkStudent();
    }).catch(()=>{
      showLE('Connection error. Check your internet and try again.');
    });
  }
}
 
 


// ── STUDENT ──


function updateStuStats(){
  $('ss-t').textContent=SES.stats.tests;$('ss-b').textContent=SES.stats.best?SES.stats.best+'%':'—';
  $('ss-q').textContent=SES.stats.qs;$('ss-s').textContent=SES.stats.streak+(SES.stats.streak?'🔥':'');
}
function renderStudentMods(){
  const cols=['var(--a)','var(--c)','var(--g)','var(--y)','var(--p)','var(--o)','#a855f7','var(--r)'];
  $('smgrid').innerHTML=DB.modules.map((m,i)=>{
    const mid=parseInt(m.id);
    const qCount=DB.mcqBank.filter(q=>parseInt(q.moduleId)===mid).length;
    // Only count published sets for student view
    const pubSets=DB.sets.filter(s=>parseInt(s.moduleId)===mid&&s.status==='published'&&s.active!==false);
    const setCount=pubSets.length;
    // Progress: how many published sets has this student attempted?
    const attempted=SES.user?new Set(DB.scores.filter(sc=>sc.studentId===SES.user.id&&sc.moduleId===mid).map(sc=>sc.setId)).size:0;
    const progress=setCount>0?Math.min(100,Math.round(attempted/setCount*100)):0;
    const avgScore=SES.user&&DB.scores.filter(sc=>sc.studentId===SES.user.id&&sc.moduleId===mid).length
      ?avg(DB.scores.filter(sc=>sc.studentId===SES.user.id&&sc.moduleId===mid).map(sc=>sc.pct))
      :null;
    const locked=setCount===0||qCount===0;
    return `
    <div class="mcard" onclick="${locked?'':` openModSel(${mid})`}" style="${locked?'opacity:.6;cursor:not-allowed':''}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
        <div style="font-size:26px">${m.icon}</div>
        ${avgScore!==null?`<span style="font-size:11px;font-weight:700;font-family:'JetBrains Mono',monospace;color:${avgScore>=75?'var(--g)':avgScore>=50?'var(--y)':'var(--r)'}">${avgScore}%</span>`:''}
      </div>
      <div style="font-size:14px;font-weight:600;margin-bottom:3px">${esc(m.name)}</div>
      <div style="font-size:11px;color:var(--t2);margin-bottom:9px">
        ${locked?'<span style="color:var(--r)">Coming soon</span>':`${setCount} Set${setCount!==1?'s':''} · ${qCount} Questions`}
      </div>
      <div style="height:5px;background:var(--bg4);border-radius:3px;overflow:hidden;margin-bottom:6px">
        <div style="height:100%;border-radius:3px;width:${progress}%;background:${cols[i]};transition:width .5s ease"></div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div style="display:flex;gap:4px">
          <span class="tag te">Easy</span><span class="tag tm">Med</span><span class="tag th">Hard</span>
        </div>
        ${progress>0?`<span style="font-size:10px;color:var(--t3)">${attempted}/${setCount} done</span>`:`<span class="tag tai">AI</span>`}
      </div>
    </div>`;
  }).join('');
}

function openModSel(modId){
  modId=parseInt(modId);
  SES.modIdx=modId;
  const m=DB.modules.find(x=>parseInt(x.id)===modId);
  if(!m)return;
  $('ms-tit').textContent=m.icon+' '+m.name;
  $('ms-ai').textContent=`Strengthen "${m.topics[Math.floor(Math.random()*m.topics.length)]}" in your next session.`;

  const allModQs=DB.mcqBank.filter(q=>parseInt(q.moduleId)===modId);

  // Students only see: published sets that have questions in the bank
  const sets=DB.sets.filter(s=>{
    const mid=parseInt(s.moduleId);
    if(mid!==modId) return false;
    if(s.status==='draft') return false;      // draft = hidden
    if(s.active===false) return false;         // disabled = hidden
    return allModQs.length>0;                  // need at least some questions
  });

  if(!sets.length){
    $('ms-sets').innerHTML=`
      <div class="empty" style="padding:36px 20px">
        <div style="font-size:40px;margin-bottom:12px">📋</div>
        <div style="font-size:15px;font-weight:600;margin-bottom:8px;color:var(--t)">No tests available yet</div>
        <div style="font-size:13px;line-height:1.6">
          ${allModQs.length===0
            ? 'Questions are being prepared for this module. Check back soon!'
            : 'Sets are being prepared. Admin will publish them shortly.'}
        </div>
      </div>`;
  } else {
    $('ms-sets').innerHTML=sets.map((s,i)=>{
      const setId=String(s.id).replace(/'/g,"\\'");
      const attempted=DB.scores.filter(sc=>sc.studentId===SES.user?.id&&sc.setId===String(s.id)).length;
      const bestScore=attempted?Math.max(...DB.scores.filter(sc=>sc.studentId===SES.user?.id&&sc.setId===String(s.id)).map(sc=>sc.pct)):null;
      const badgeHtml=bestScore!==null
        ? `<span class="badge" style="background:rgba(34,197,94,.15);color:var(--g);flex-shrink:0">${bestScore}% Best</span>`
        : `<span class="badge be" style="flex-shrink:0">New</span>`;
      return `
      <div style="padding:13px 14px;background:var(--bg3);border:1px solid var(--b);border-radius:11px;cursor:pointer;transition:all .2s;display:flex;align-items:center;justify-content:space-between;margin-bottom:7px"
        onclick="startTest(${modId},'${setId}')"
        onmouseover="this.style.borderColor='var(--a)';this.style.background='rgba(108,99,255,.06)'"
        onmouseout="this.style.borderColor='var(--b)';this.style.background='var(--bg3)'">
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:28px;height:28px;border-radius:7px;background:var(--bg4);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;font-family:'JetBrains Mono',monospace;color:var(--t2)">${String(i+1).padStart(2,'0')}</div>
          <div>
            <div style="font-size:13px;font-weight:600">${esc(s.name)}</div>
            <div style="font-size:11px;color:var(--t2)">${s.qCount||50} Qs · ${s.timer||45}min · Adaptive${attempted?` · <span style="color:var(--c)">${attempted} attempt${attempted!==1?'s':''}</span>`:''}</div>
          </div>
        </div>
        ${badgeHtml}
      </div>`;
    }).join('');
  }
  openModal('mod-sel-mo');
}

// ── STUDENT: MY SCORES ──
async function renderMyScores(){
  const myScores=DB.scores.filter(s=>s.studentId===SES.user?.id);
  const el=$('my-scores-content');
  if(!myScores.length){
    el.innerHTML=`<div class="empty">
      <div class="ei">📊</div>
      <div style="font-size:15px;font-weight:600;margin-bottom:6px">No tests yet</div>
      <div>Complete a test to see your scores and weak topic analysis here.</div>
      <button class="btn ba mt3" onclick="sp('modules')">Browse Modules →</button>
    </div>`;
    return;
  }
  const totalTests=myScores.length;
  const avgScore=avg(myScores.map(s=>s.pct));
  const bestScore=Math.max(...myScores.map(s=>s.pct));
  const passRate=Math.round(myScores.filter(s=>s.pct>=DB.settings.passmark).length/totalTests*100);
  const modBreakdown={};
  myScores.forEach(s=>{if(!modBreakdown[s.moduleId])modBreakdown[s.moduleId]=[];modBreakdown[s.moduleId].push(s.pct)});

  // Local topic analysis from topicScores on each attempt
  const topicTotals={};
  myScores.forEach(s=>{
    if(s.topicScores)Object.entries(s.topicScores).forEach(([t,pct])=>{
      if(!topicTotals[t])topicTotals[t]=[];topicTotals[t].push(pct);
    });
  });

  // Try to load richer per-question topic data from Apps Script
  const asUrl=(localStorage.getItem('vns_apps_script_url')||'').trim();
  let serverTopics=null;
  if(asUrl&&SES.user){
    try{
      const r=await fetch(asUrl+'?action=getTopicAnalysis&studentId='+encodeURIComponent(SES.user.id));
      if(r.ok){const j=await r.json();if(j.analysis&&j.analysis.length)serverTopics=j.analysis;}
    }catch(e){}
  }

  // Prefer server data (per-question) over local (per-attempt summary)
  let allTopics;
  if(serverTopics&&serverTopics.length){
    allTopics=serverTopics;
  } else {
    allTopics=Object.entries(topicTotals)
      .map(([topic,ps])=>({topic,total:ps.length,correct:0,accuracy:avg(ps)}))
      .sort((a,b)=>a.accuracy-b.accuracy);
  }

  const weakTopics=allTopics.filter(t=>t.accuracy<60&&(t.total||1)>=1).slice(0,6);
  const strongTopics=allTopics.filter(t=>t.accuracy>=80&&(t.total||1)>=1).slice(0,3);
  const allForBar=[...allTopics].sort((a,b)=>a.accuracy-b.accuracy).slice(0,10);

  // Build improvement suggestions based on weak topics
  const suggestions=weakTopics.map(({topic,accuracy})=>{
    const tip=accuracy<30?'Critical — dedicate focused study sessions to this topic.'
      :accuracy<50?'Needs significant work — review fundamentals.'
      :'Getting there — practice more questions on this topic.';
    return {topic,accuracy,tip};
  });

  el.innerHTML=`
    <div class="sg sg4" style="margin-bottom:16px">
      <div class="sc bl"><div class="sl">Tests Taken</div><div class="sv">${totalTests}</div></div>
      <div class="sc gn"><div class="sl">Avg Score</div><div class="sv">${avgScore}%</div></div>
      <div class="sc yw"><div class="sl">Best Score</div><div class="sv">${bestScore}%</div></div>
      <div class="sc cy"><div class="sl">Pass Rate</div><div class="sv">${passRate}%</div><div class="ss">≥${DB.settings.passmark}%</div></div>
    </div>

    ${suggestions.length?`
    <div style="background:rgba(239,68,68,.06);border:1px solid rgba(239,68,68,.2);border-radius:14px;padding:16px 20px;margin-bottom:16px">
      <div style="font-size:14px;font-weight:700;color:var(--r);margin-bottom:12px">🎯 Improvement Plan — Focus on These Topics</div>
      <div style="display:grid;gap:8px">
        ${suggestions.map(({topic,accuracy,tip})=>`
          <div style="display:flex;align-items:center;gap:12px;padding:10px 14px;background:rgba(0,0,0,.2);border-radius:10px">
            <div style="min-width:44px;text-align:center;font-family:'JetBrains Mono',monospace;font-size:16px;font-weight:800;color:var(--r)">${accuracy}%</div>
            <div style="flex:1">
              <div style="font-size:13px;font-weight:600;margin-bottom:2px">${esc(topic)}</div>
              <div style="font-size:11px;color:var(--t2)">${tip}</div>
            </div>
            <div style="width:80px">
              <div style="height:5px;background:var(--bg4);border-radius:3px;overflow:hidden">
                <div style="height:100%;width:${accuracy}%;background:${accuracy<50?'var(--r)':'var(--y)'};border-radius:3px"></div>
              </div>
            </div>
          </div>`).join('')}
      </div>
    </div>`:''}

    ${strongTopics.length?`
    <div style="background:rgba(34,197,94,.06);border:1px solid rgba(34,197,94,.2);border-radius:14px;padding:14px 18px;margin-bottom:16px">
      <div style="font-size:13px;font-weight:700;color:var(--g);margin-bottom:10px">✅ Your Strong Topics</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${strongTopics.map(({topic,accuracy})=>`<span style="padding:4px 12px;background:rgba(34,197,94,.12);border:1px solid rgba(34,197,94,.25);border-radius:20px;font-size:12px;color:var(--g)">${esc(topic)} — ${accuracy}%</span>`).join('')}
      </div>
    </div>`:''}

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px">
      <div class="card">
        <div class="ct">📊 Module Performance</div>
        ${Object.entries(modBreakdown).map(([mid,scores])=>{
          const m=DB.modules.find(x=>parseInt(x.id)===parseInt(mid));
          const a=avg(scores);const col=a>=75?'var(--g)':a>=50?'var(--y)':'var(--r)';
          return `<div class="chart-bar-h"><div class="cbl">${m?m.icon+' '+m.name.split(' ')[0]:'Mod '+mid}</div><div class="cbw"><div class="cbf" style="width:${a}%;background:${col}"></div></div><div class="cbv" style="color:${col}">${a}%</div></div>`;
        }).join('')}
      </div>
      <div class="card">
        <div class="ct">💡 Topic Accuracy${serverTopics?'<span style="font-size:10px;color:var(--g);margin-left:8px">● Live data</span>':''}</div>
        ${allForBar.length?allForBar.map(({topic,accuracy})=>{
          const col=accuracy<50?'var(--r)':accuracy<75?'var(--y)':'var(--g)';
          return `<div class="chart-bar-h"><div class="cbl" style="font-size:10px;max-width:100px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(topic)}</div><div class="cbw"><div class="cbf" style="width:${accuracy}%;background:${col}"></div></div><div class="cbv" style="color:${col}">${accuracy}%</div></div>`;
        }).join(''):'<div style="font-size:13px;color:var(--t2)">Take more tests for topic analysis.</div>'}
      </div>
    </div>

    <div class="card">
      <div class="ct">📋 Test History</div>
      <div class="tw"><table>
        <thead><tr><th>Date</th><th>Module</th><th>Set</th><th>Score</th><th>Correct</th><th>Time</th><th>Result</th></tr></thead>
        <tbody>${[...myScores].sort((a,b)=>b.id-a.id).map(s=>{
          const col=s.pct>=75?'var(--g)':s.pct>=50?'var(--y)':'var(--r)';
          const pass=s.pct>=DB.settings.passmark;
          const setObj=DB.sets.find(x=>String(x.id)===String(s.setId));
          return `<tr>
            <td style="color:var(--t2);font-size:12px">${s.date||'Today'}</td>
            <td style="font-size:12px">${s.moduleName}</td>
            <td style="font-size:11px;color:var(--t2)">${setObj?esc(setObj.name):'—'}</td>
            <td style="font-weight:700;font-family:'JetBrains Mono',monospace;color:${col}">${s.pct}%</td>
            <td style="font-family:'JetBrains Mono',monospace;font-size:12px">${s.correct}/${s.total}</td>
            <td style="font-family:'JetBrains Mono',monospace;font-size:12px">${fmt(s.timeTaken)}</td>
            <td><span class="badge ${pass?'bact':'bina'}">${pass?'Pass':'Fail'}</span></td>
          </tr>`;
        }).join('')}</tbody>
      </table></div>
    </div>`;
}

// ── STUDENT: LEADERBOARD ──
async function renderStudentLeaderboard(){
  const container=$('s-leaderboard-content');
  container.innerHTML=`<div style="text-align:center;padding:40px;color:var(--t2);font-size:13px">⏳ Loading leaderboard...</div>`;

  // Try to load live leaderboard from Apps Script
  const asUrl=(localStorage.getItem('vns_apps_script_url')||'').trim();
  let lb=null;
  let liveData=false;
  if(asUrl){
    try{
      const r=await fetch(asUrl+'?action=getLeaderboard');
      if(r.ok){const j=await r.json();if(j.leaderboard&&j.leaderboard.length){lb=j.leaderboard;liveData=true;}}
    }catch(e){}
  }
  // Fallback to local in-memory
  if(!lb) lb=buildLeaderboard();

  const myRank=lb.findIndex(l=>String(l.studentId)===String(SES.user?.id));
  const lastSync=liveData?new Date().toLocaleTimeString():(localStorage.getItem('vns_lb_synced')||'Not synced');
  if(liveData) localStorage.setItem('vns_lb_synced',lastSync);

  // Shareable leaderboard URL
  const sheetUrl=localStorage.getItem('vns_sheet_url')||'';
  const sheetId=getSheetId(sheetUrl);
  const shareUrl=sheetId?`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:html&sheet=Leaderboard`:'';

  let html=`
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px">
      <div>
        <div style="font-size:12px;color:${liveData?'var(--g)':'var(--t3)'}">
          ${liveData?'● Live data':'○ Local cache'} · Last updated: ${lastSync}
        </div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${shareUrl?`<button class="btn bsm bo" onclick="window.open('${shareUrl}','_blank')">🔗 Share Leaderboard</button>`:''}
        <button class="btn bsm bc" onclick="renderStudentLeaderboard()">🔄 Refresh</button>
      </div>
    </div>`;
 
  if(!lb.length){
    container.innerHTML=html+`
      <div class="card" style="text-align:center;padding:44px;background:rgba(108,99,255,.05);border-color:rgba(108,99,255,.2)">
        <div style="font-size:52px;margin-bottom:14px">🏆</div>
        <div style="font-size:17px;font-weight:700;margin-bottom:8px">Be the first on the board!</div>
        <div style="font-size:13px;color:var(--t2);line-height:1.7;margin-bottom:18px">Complete a test to claim your rank.<br>Leaderboard updates in real-time after each submission.</div>
        <button class="btn ba" onclick="sp('modules')">Start Practising →</button>
      </div>`;
    return;
  }
 
  // Your rank banner
  if(myRank>=0){
    const me=lb[myRank];
    const rankColors=['#fbbf24','#9ca3af','#cd7f32'];
    const rankColor=myRank<3?rankColors[myRank]:'var(--a2)';
    html+=`
      <div style="background:linear-gradient(135deg,rgba(108,99,255,.12),rgba(6,182,212,.08));border:1px solid rgba(108,99,255,.25);border-radius:14px;padding:16px 20px;margin-bottom:20px;display:flex;align-items:center;gap:14px;flex-wrap:wrap">
        <div style="font-size:32px;font-weight:900;font-family:'JetBrains Mono',monospace;color:${rankColor};flex-shrink:0">#${myRank+1}</div>
        <div style="flex:1">
          <div style="font-size:14px;font-weight:700">Your Rank among ${lb.length} students</div>
          <div style="font-size:12px;color:var(--t2);margin-top:2px">
            Avg: <strong style="color:${me.avg>=75?'var(--g)':me.avg>=50?'var(--y)':'var(--r)'}">${me.avg}%</strong> &nbsp;·&nbsp;
            Best: <strong style="color:var(--g)">${me.best}%</strong> &nbsp;·&nbsp;
            Tests: <strong style="color:var(--c)">${me.tests}</strong>
          </div>
        </div>
        ${myRank===0?'<div style="font-size:28px">🥇</div>':myRank===1?'<div style="font-size:28px">🥈</div>':myRank===2?'<div style="font-size:28px">🥉</div>':''}
      </div>`;
  }
 
  // TOP 3 PODIUM (if enough students)
  if(lb.length>=3){
    const podiumOrder=[lb[1],lb[0],lb[2]]; // silver, gold, bronze
    const podiumH=['160px','200px','140px'];
    const podiumColors=['#9ca3af','#fbbf24','#cd7f32'];
    const podiumLabels=['2nd','1st','3rd'];
    const podiumEmoji=['🥈','🥇','🥉'];
    html+=`
      <div style="display:flex;align-items:flex-end;justify-content:center;gap:8px;margin-bottom:24px;padding:20px 0">
        ${podiumOrder.map((p,i)=>{
          if(!p)return '';
          const init=p.name.split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase();
          const isMe=p.studentId===SES.user?.id;
          return `
          <div style="display:flex;flex-direction:column;align-items:center;gap:8px;flex:1;max-width:140px">
            <div style="font-size:22px">${podiumEmoji[i]}</div>
            <div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,${podiumColors[i]},${podiumColors[i]}99);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;color:#111;${isMe?'box-shadow:0 0 0 3px var(--a)':''}">${init}</div>
            <div style="text-align:center">
              <div style="font-size:12px;font-weight:700;color:var(--t)">${esc(p.name.trim().split(' ')[0])}</div>
              <div style="font-size:18px;font-weight:900;font-family:'JetBrains Mono',monospace;color:${podiumColors[i]}">${p.avg}%</div>
            </div>
            <div style="height:${podiumH[i]};width:100%;background:linear-gradient(to top,${podiumColors[i]}22,${podiumColors[i]}08);border:1px solid ${podiumColors[i]}33;border-bottom:none;border-radius:8px 8px 0 0;display:flex;align-items:flex-start;justify-content:center;padding-top:10px">
              <span style="font-size:13px;font-weight:700;color:${podiumColors[i]}">${podiumLabels[i]}</span>
            </div>
          </div>`;
        }).join('')}
      </div>`;
  }
 
  // Full rankings table
  html+=`
    <div class="card" style="padding:0;overflow:hidden">
      <div style="padding:14px 18px;border-bottom:1px solid var(--b);display:flex;justify-content:space-between;align-items:center">
        <div style="font-size:14px;font-weight:700">Full Rankings</div>
        <div style="font-size:12px;color:var(--t2)">${lb.length} student${lb.length!==1?'s':''} · sorted by avg score</div>
      </div>
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr style="background:rgba(26,26,36,.85)">
              <th style="padding:10px 14px;text-align:left;font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.6px;width:50px">Rank</th>
              <th style="padding:10px 14px;text-align:left;font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.6px">Student</th>
              <th style="padding:10px 14px;text-align:center;font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.6px">Tests</th>
              <th style="padding:10px 14px;text-align:center;font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.6px">Avg</th>
              <th style="padding:10px 14px;text-align:center;font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.6px">Best</th>
              <th style="padding:10px 14px;text-align:left;font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.6px">Progress</th>
            </tr>
          </thead>
          <tbody>
            ${lb.map((l,i)=>{
              const rankIcons=['🥇','🥈','🥉'];
              const isMe=l.studentId===SES.user?.id;
              const init=l.name.split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase();
              const col=l.avg>=75?'var(--g)':l.avg>=50?'var(--y)':'var(--r)';
              const bgColor=i<3?['rgba(251,191,36,.06)','rgba(251,191,36,.04)','rgba(205,127,50,.04)'][i]:'';
              return `<tr style="border-top:1px solid var(--b);${isMe?'background:rgba(108,99,255,.08);':'background:'+bgColor};transition:background .15s" onmouseover="this.style.background='rgba(108,99,255,.05)'" onmouseout="this.style.background='${isMe?'rgba(108,99,255,.08)':bgColor}'">
                <td style="padding:11px 14px;text-align:center">
                  ${i<3?`<span style="font-size:18px">${rankIcons[i]}</span>`:`<span style="font-size:13px;font-weight:700;font-family:'JetBrains Mono',monospace;color:var(--t3)">${i+1}</span>`}
                </td>
                <td style="padding:11px 14px">
                  <div style="display:flex;align-items:center;gap:10px">
                    <div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,var(--a),var(--p));display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0;${isMe?'box-shadow:0 0 0 2px var(--a)':''}">${init}</div>
                    <div>
                      <div style="font-size:13px;font-weight:600">${esc(l.name.trim())}${isMe?' <span style="font-size:10px;padding:1px 6px;border-radius:4px;background:rgba(108,99,255,.2);color:var(--a2)">You</span>':''}</div>
                      <div style="font-size:11px;color:var(--t3);font-family:'JetBrains Mono',monospace">${l.studentId}</div>
                    </div>
                  </div>
                </td>
                <td style="padding:11px 14px;text-align:center;font-family:'JetBrains Mono',monospace;font-size:13px;color:var(--c)">${l.tests}</td>
                <td style="padding:11px 14px;text-align:center;font-family:'JetBrains Mono',monospace;font-size:15px;font-weight:800;color:${col}">${l.avg}%</td>
                <td style="padding:11px 14px;text-align:center;font-family:'JetBrains Mono',monospace;font-size:13px;color:var(--g)">${l.best}%</td>
                <td style="padding:11px 14px;min-width:100px">
                  <div style="height:6px;background:var(--bg4);border-radius:3px;overflow:hidden">
                    <div style="height:100%;width:${l.avg}%;background:${col};border-radius:3px;transition:width .6s ease"></div>
                  </div>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
 
  container.innerHTML=html;
}

async function syncLeaderboardNow(){
  await autoSyncDataFromSheet(false);
  await renderStudentLeaderboard();
  toast('Leaderboard refreshed!','success',2000);
}

function buildLeaderboard(){
  const map={};
  const SKIP_VALUES=new Set([
    'studentid','studentname','time','date','id','pct','correct',
    'wrong','total','diff','moduleid','setid','timesec','score',
    'difficultyreached','timestamp','unanswered','modulename',
    'setname','setname'
  ]);
  DB.scores.forEach(s=>{
    const sid=String(s.studentId||'').trim();
    // Skip if studentId looks like a column header name
    if(!sid) return;
    if(SKIP_VALUES.has(sid.toLowerCase().replace(/[^a-z0-9]/g,''))) return;
    // Skip if studentId has no digits (definitely not a real student ID)
    if(!/\d/.test(sid)) return;
    if(!map[sid])map[sid]={studentId:sid,name:s.studentName||sid,scores:[],tests:0};
    // Only push valid numeric scores
    const pct=parseInt(s.pct)||0;
    if(pct>0||s.total>0) map[sid].scores.push(pct);
    map[sid].tests++;
  });
  return Object.values(map)
    .filter(s=>s.tests>0)
    .map(s=>({...s,avg:avg(s.scores),best:s.scores.length?Math.max(...s.scores):0}))
    .sort((a,b)=>b.avg-a.avg||b.tests-a.tests);
}

function renderLBItem(l,i){
  const ranks=['🥇','🥈','🥉'];
  const colors=['#fbbf24','#9ca3af','#b45309'];
  const init=l.name.split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase();
  const bg=i===0?'linear-gradient(135deg,#fbbf24,#f59e0b)':i===1?'linear-gradient(135deg,#9ca3af,#6b7280)':i===2?'linear-gradient(135deg,#b45309,#92400e)':'linear-gradient(135deg,var(--a),var(--p))';
  const isMe=l.studentId===SES.user?.id;
  return `<div class="leaderboard-item" style="${isMe?'border:1px solid rgba(108,99,255,.4);background:rgba(108,99,255,.08)':''}">
    <div class="lb-rank">${i<3?ranks[i]:`<span style="font-size:13px;font-family:'JetBrains Mono',monospace;color:var(--t3)">${i+1}</span>`}</div>
    <div class="lb-av" style="background:${bg};color:white">${init}</div>
    <div class="lb-info">
      <div class="lb-name">${esc(l.name.trim())} ${isMe?'<span style="font-size:10px;color:var(--a2)">(You)</span>':''}</div>
      <div class="lb-detail">${l.tests} test${l.tests!==1?'s':''} · Best: ${l.best}%</div>
    </div>
    <div class="lb-score" style="color:${l.avg>=75?'var(--g)':l.avg>=50?'var(--y)':'var(--r)'}">${l.avg}%</div>
  </div>`;
}

// ── ADMIN: DASHBOARD ──
function refreshAdminDash(){
  $('ad-st').textContent=DB.students.length;
  $('ad-q').textContent=DB.mcqBank.length;
  $('ad-tt').textContent=DB.scores.length;
  const pubSets=DB.sets.filter(s=>s.status==='published'&&s.active!==false).length;
  if($('ad-sets'))$('ad-sets').textContent=pubSets;
  $('snb').textContent=DB.students.length;
  $('qnb').textContent=DB.mcqBank.length;
  if($('sets-nb'))$('sets-nb').textContent=pubSets+'/'+DB.sets.length;
  // Update avg score if exists
  const scores=DB.scores.map(s=>s.pct);
  if($('ad-av'))$('ad-av').textContent=scores.length?avg(scores)+'%':'—';
  // Hide getting-started guide once questions are loaded
  const guide=$('admin-getting-started');
  if(guide) guide.style.display=DB.mcqBank.length>0?'none':'block';
  // Recent tests
  const recent=[...DB.scores].sort((a,b)=>b.id-a.id).slice(0,6);
  $('dash-recent-tests').innerHTML=recent.length?recent.map(s=>`
    <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--b)">
      <div>
        <div style="font-size:12px;font-weight:500">${esc(s.studentName.trim().split(' ').slice(0,2).join(' '))}</div>
        <div style="font-size:11px;color:var(--t2)">${s.moduleName} · ${s.date||'Today'}</div>
      </div>
      <div style="text-align:right">
        <div style="font-family:'JetBrains Mono',monospace;font-weight:700;color:${s.pct>=75?'var(--g)':s.pct>=50?'var(--y)':'var(--r)'}">${s.pct}%</div>
        <div style="font-size:10px;color:var(--t3)">${s.correct}/${s.total}</div>
      </div>
    </div>`).join(''):'<div style="font-size:13px;color:var(--t2);padding:8px 0">No tests completed yet.</div>';
}

// ── ADMIN: STUDENTS ──
function renderStudents(){
  const q=($('stu-search')||{value:''}).value.toLowerCase();
  const sf=($('stu-sf')||{value:''}).value;
  let list=DB.students.filter(s=>(!q||s.name.toLowerCase().includes(q)||s.id.includes(q))&&(!sf||s.status===sf));
  $('stu-cnt').textContent=list.length+' student'+(list.length!==1?'s':'');
  $('snb').textContent=DB.students.length;
  $('stu-tbody').innerHTML=list.map((s,i)=>{
    const sts=DB.scores.filter(x=>x.studentId===s.id);
    const a=sts.length?avg(sts.map(x=>x.pct))+'%':'—';
    return `<tr>
      <td style="color:var(--t3);font-size:11px;font-family:'JetBrains Mono',monospace">${i+1}</td>
      <td style="font-family:'JetBrains Mono',monospace;color:var(--a2);font-size:12px">${esc(s.id)}</td>
      <td style="font-weight:500">${esc(s.name)}</td>
      <td style="font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--t2)">${esc(s.pass)}</td>
      <td><span class="badge ${s.status==='active'?'bact':'bina'}">${s.status}</span></td>
      <td style="font-family:'JetBrains Mono',monospace;font-size:12px">${sts.length}</td>
      <td style="font-family:'JetBrains Mono',monospace;font-size:12px;color:${sts.length&&avg(sts.map(x=>x.pct))>=75?'var(--g)':sts.length&&avg(sts.map(x=>x.pct))>=50?'var(--y)':'var(--t2)'}">${a}</td>
      <td><div class="flex g2">
        <button class="btn bxs by" onclick="editStudent('${esc(s.id)}')">✏️</button>
        <button class="btn bxs bc" onclick="resetPass1('${esc(s.id)}')">🔑</button>
        <button class="btn bxs br" onclick="delStudent('${esc(s.id)}')">🗑️</button>
      </div></td>
    </tr>`;
  }).join('')||`<tr><td colspan="8" class="empty" style="padding:24px;text-align:center">No students found</td></tr>`;

  saveDB();
}

function openAddStudent(){
  $('stu-m-tit').textContent='➕ Add Student';$('stu-orig').value='';
  ['f-sid','f-sname','f-spw','f-sform'].forEach(id=>$(id).value='');$('f-sst').value='active';
  openModal('stu-modal');
}
function editStudent(sid){
  const s=DB.students.find(x=>x.id===sid);if(!s)return;
  $('stu-m-tit').textContent='✏️ Edit Student';$('stu-orig').value=s.id;
  $('f-sid').value=s.id;$('f-sname').value=s.name;$('f-spw').value=s.pass;
  $('f-sst').value=s.status||'active';$('f-sform').value=s.form||'';
  openModal('stu-modal');
}
function saveStudent(){
  const orig=$('stu-orig').value;const sid=$('f-sid').value.trim();const name=$('f-sname').value.trim();const pw=$('f-spw').value.trim();
  if(!sid||!name||!pw){toast('Fill ID, Name and Password','error');return}
  if(!orig&&DB.students.find(s=>s.id===sid)){toast('ID already exists!','error');return}
  const stu={id:sid,name,pass:pw,status:$('f-sst').value,form:$('f-sform').value.trim()};
  if(!orig){DB.students.push(stu);toast('Student added','success')}
  else{const idx=DB.students.findIndex(s=>s.id===orig);if(idx>-1)DB.students[idx]=stu;toast('Student updated','success')}
  closeModal('stu-modal');renderStudents();refreshAdminDash();
  saveDB();
  // Sync to Students sheet
  pushToAppsScript({action:'saveStudent',student:stu});
}
function delStudent(sid){
  const s=DB.students.find(x=>x.id===sid);
  confAction(`Delete "${s?.name}"?`,'Permanently removes this student.',()=>{
    DB.students=DB.students.filter(x=>x.id!==sid);
    toast('Deleted','warning');
    renderStudents();refreshAdminDash();
    saveDB();
    pushToAppsScript({action:'deleteStudent',studentId:sid});
  },'🗑️');
}
function resetPass1(sid){
  const s=DB.students.find(x=>x.id===sid);const np=s.name.split(' ')[0].toLowerCase();
  confAction(`Reset password for "${s.name}"?`,`New password: "${np}"`,()=>{s.pass=np;toast(`Password reset to "${np}"`,'info');renderStudents()},'🔑');
}
function resetAllPasses(){DB.students.forEach(s=>{s.pass=s.name.split(' ')[0].toLowerCase()});toast('All passwords reset','info');renderStudents();saveDB();}

// ── ADMIN: MCQ ──
function populateModSels(){
  const opts=DB.modules.map(m=>`<option value="${m.id}">${m.icon} ${esc(m.name)}</option>`).join('');
  // dropdowns with "All" placeholder
  ['qmf','ag-mod','eq-mod','paste-mod'].forEach(id=>{
    const el=$(id);if(!el)return;
    const ph=el.options[0]?.value===''?el.options[0].outerHTML:'';
    el.innerHTML=ph+opts;
  });
  // csv override - has "Use CSV column" placeholder
  const csvMod=$('csv-mod-override');
  if(csvMod){const ph=csvMod.options[0]?.outerHTML||'<option value="">Use CSV column</option>';csvMod.innerHTML=ph+opts}
}
function renderMCQ(){
  const mfRaw=$('qmf').value;const mf=mfRaw!==''?parseInt(mfRaw):null;
  const df=$('qdf').value;const sf=($('qsf').value||'').toLowerCase();
  let list=DB.mcqBank.filter(q=>{
    const modOk=mf===null||parseInt(q.moduleId)===mf;
    const diffOk=!df||q.diff===df;
    const searchOk=!sf||(q.q||'').toLowerCase().includes(sf)||(q.topic||'').toLowerCase().includes(sf);
    return modOk&&diffOk&&searchOk;
  });
  $('qcnt').textContent=list.length+' question'+(list.length!==1?'s':'');$('qnb').textContent=DB.mcqBank.length;
  if(!list.length){$('mcq-list').innerHTML='<div class="empty"><div class="ei">❓</div><div style="font-size:15px;font-weight:600;margin-bottom:6px">No questions</div><div>Use Bulk Import or AI Generate to add questions.</div></div>';return}
  $('mcq-list').innerHTML=list.map(q=>{
    const m=DB.modules.find(x=>parseInt(x.id)===parseInt(q.moduleId));
    const modLabel=m?m.icon+' '+m.name:'Unknown Module';
    return `<div style="background:var(--bg3);border:1px solid var(--b);border-radius:12px;padding:15px;margin-bottom:9px">
      <div class="flex jb ic" style="margin-bottom:8px">
        <div class="flex g2" style="flex-wrap:wrap;align-items:center">
          <span style="font-size:11px;padding:3px 10px;border-radius:6px;background:rgba(108,99,255,.18);color:var(--a2);font-weight:600;border:1px solid rgba(108,99,255,.25)">${esc(modLabel)}</span>
          <span class="badge b${(q.diff||'e')[0]}">${q.diff||'easy'}</span>
          <span style="font-size:11px;padding:3px 8px;border-radius:5px;background:rgba(6,182,212,.12);color:var(--c);border:1px solid rgba(6,182,212,.2)">${esc(q.topic||'General')}</span>
        </div>
        <div class="flex g2">
          <button class="btn bxs by" onclick="openEditMCQ(${q.id})">✏️ Edit</button>
          <button class="btn bxs br" onclick="delMCQ(${q.id})">🗑️</button>
        </div>
      </div>
      <div style="font-size:13px;font-weight:500;margin-bottom:8px;line-height:1.55;color:var(--t)">${esc(q.q)}</div>
      <div style="display:grid;gap:4px">${(q.opts||[]).map((o,i)=>`<div style="font-size:12px;color:${i===q.ans?'var(--g)':'var(--t2)'};display:flex;align-items:center;gap:6px;padding:3px 0"><span style="font-size:13px">${i===q.ans?'✅':'○'}</span><span>${esc(o)}</span></div>`).join('')}</div>
      ${q.explain?`<div style="font-size:11px;color:var(--t2);margin-top:8px;padding-top:8px;border-top:1px solid var(--b)">💡 ${esc(q.explain)}</div>`:''}
    </div>`;
  }).join('');
}
function openEditMCQ(id){
  const q=DB.mcqBank.find(x=>x.id===id);if(!q)return;
  $('mcq-m-tit').textContent='✏️ Edit Question';$('eq-id').value=id;
  $('eq-mod').value=q.moduleId;$('eq-dif').value=q.diff;$('eq-topic').value=q.topic;
  $('eq-q').value=q.q;$('eq-exp').value=q.explain||'';
  q.opts.forEach((o,i)=>$('eq-o'+i).value=o);
  const r=document.querySelector(`input[name="eqr"][value="${q.ans}"]`);if(r)r.checked=true;
  openModal('mcq-edit-modal');
}
function saveMCQEdit(){
  const eid=parseInt($('eq-id').value);const mid=parseInt($('eq-mod').value);
  const diff=$('eq-dif').value;const topic=$('eq-topic').value.trim();
  const q=$('eq-q').value.trim();const exp=$('eq-exp').value.trim();
  const opts=[0,1,2,3].map(i=>$('eq-o'+i).value.trim());
  const cr=document.querySelector('input[name="eqr"]:checked');
  if(!q||opts.some(o=>!o)||!cr){toast('Fill all fields and select correct answer','error');return}
  const ans=parseInt(cr.value);
  if(eid){const idx=DB.mcqBank.findIndex(x=>x.id===eid);if(idx>-1)DB.mcqBank[idx]={id:eid,moduleId:mid,diff,topic:topic||'General',q,opts,ans,explain:exp};toast('Updated','success')}
  else{DB.mcqBank.push({id:uid(),moduleId:mid,diff,topic:topic||'General',q,opts,ans,explain:exp});toast('Added','success')}
  closeModal('mcq-edit-modal');renderMCQ();refreshAdminDash();
  saveDB();
}
function delMCQ(id){confAction('Delete this question?','This cannot be undone.',()=>{DB.mcqBank=DB.mcqBank.filter(x=>x.id!==id);toast('Deleted','warning');renderMCQ();refreshAdminDash();saveDB();},'🗑️')}

// ── ADMIN: MODULES ──
function renderAdminMods(){
  $('admin-mod-list').innerHTML=DB.modules.map(m=>{
    const qc=DB.mcqBank.filter(q=>parseInt(q.moduleId)===parseInt(m.id)).length;
    return `<div class="card" style="margin-bottom:13px">
      <div class="flex jb ic">
        <div class="flex ic g3"><div style="font-size:26px">${m.icon}</div><div><div style="font-size:15px;font-weight:600">${esc(m.name)}</div><div style="font-size:12px;color:var(--t2)">${esc(m.desc||'')}${m.sheetTab?` · Sheet tab: <code style="color:var(--c)">${m.sheetTab}</code>`:''}</div><div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:5px">${m.topics.map(t=>`<span class="tag tai">${esc(t)}</span>`).join('')}</div></div></div>
        <div style="text-align:right"><div style="font-size:24px;font-weight:700;font-family:'JetBrains Mono',monospace;color:var(--a2)">${qc}</div><div style="font-size:11px;color:var(--t2)">Questions</div></div>
      </div>
      <div class="flex g2 mt3" style="padding-top:12px;border-top:1px solid var(--b)">
        <button class="btn bsm ba" onclick="filterMCQMod(${m.id})">❓ Questions</button>
        <button class="btn bsm bg" onclick="openAIGenMod(${m.id})">🤖 AI Generate</button>
        <button class="btn bsm bo" onclick="goImportMod(${m.id})">📥 Import</button>
      </div>
    </div>`;
  }).join('');
}
function filterMCQMod(mid){sp('amcq');setTimeout(()=>{$('qmf').value=String(mid);renderMCQ();},50)}
function openAIGenMod(mid){openAIGen();$('ag-mod').value=mid}
function goImportMod(mid){
  sp('aimport');
  // Set both the CSV override and paste-mod dropdowns to this module
  setTimeout(()=>{
    if($('csv-mod-override'))$('csv-mod-override').value=mid;
    if($('paste-mod'))$('paste-mod').value=mid;
  },100);
}
function saveModule(){
  const name=$('f-mname').value.trim();const icon=$('f-micon').value.trim()||'📦';
  const desc=$('f-mdesc').value.trim();const topics=($('f-mtopics').value||'').split(',').map(t=>t.trim()).filter(Boolean);
  if(!name){toast('Module name required','error');return}
  const nid=DB.modules.length?Math.max(...DB.modules.map(m=>m.id))+1:0;
  const sheetTab=($('f-msheet')?.value||'').trim();
  DB.modules.push({id:nid,name,icon,desc,topics:topics.length?topics:[name],sheetTab:sheetTab||name.replace(/\s+/g,'')});
  // No auto-seeded sets — admin creates sets intentionally via Manage Sets
  populateModSels();toast('Module added — go to Manage Sets to create test sets for this module.','success',4000);
  closeModal('mod-modal');renderAdminMods();refreshAdminDash();saveDB();
}

// ── ADMIN: SCORE ANALYTICS ──
function switchScoreTab(tab){
  document.querySelectorAll('#p-ascores .tab').forEach((t,i)=>{t.classList.toggle('active',['overview','students','modules','attempts'][i]===tab)});
  renderScoreAnalytics(tab);
}
function renderScoreAnalytics(tab){
  const el=$('score-tab-content');
  if(tab==='overview') renderScoreOverview(el);
  else if(tab==='students') renderScoreByStudent(el);
  else if(tab==='modules') renderScoreByModule(el);
  else if(tab==='attempts') renderAllAttempts(el);
}
function renderScoreOverview(el){
  const total=DB.scores.length;
  if(!total){el.innerHTML='<div class="empty"><div class="ei">📈</div><div>No scores recorded yet. Students need to complete tests.</div></div>';return}
  const allPcts=DB.scores.map(s=>s.pct);
  const a=avg(allPcts);
  const passRate=Math.round(DB.scores.filter(s=>s.pct>=DB.settings.passmark).length/total*100);
  const studentsAttempted=new Set(DB.scores.map(s=>s.studentId)).size;
  const topStudents=buildLeaderboard().slice(0,5);
  const modStats={};
  DB.scores.forEach(s=>{if(!modStats[s.moduleId])modStats[s.moduleId]=[];modStats[s.moduleId].push(s.pct)});
  el.innerHTML=`
    <div class="sg sg4" style="margin-bottom:16px">
      <div class="sc bl"><div class="sl">Total Tests</div><div class="sv">${total}</div><div class="ss">All students</div></div>
      <div class="sc gn"><div class="sl">Avg Score</div><div class="sv">${a}%</div><div class="ss">Platform-wide</div></div>
      <div class="sc yw"><div class="sl">Pass Rate</div><div class="sv">${passRate}%</div><div class="ss">≥${DB.settings.passmark}%</div></div>
      <div class="sc cy"><div class="sl">Active Students</div><div class="sv">${studentsAttempted}</div><div class="ss">of ${DB.students.length}</div></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px">
      <div class="card">
        <div class="ct">📊 Module-wise Avg Scores</div>
        ${Object.entries(modStats).map(([mid,pcts])=>{
          const m=DB.modules.find(x=>x.id===parseInt(mid));const a2=avg(pcts);
          const col=a2>=75?'var(--g)':a2>=50?'var(--y)':'var(--r)';
          return `<div class="chart-bar-h"><div class="cbl">${m?m.icon+' '+m.name.split(' ')[0]:'Mod'}</div><div class="cbw"><div class="cbf" style="width:${a2}%;background:${col}"></div></div><div class="cbv" style="color:${col}">${a2}%</div></div>`;
        }).join('')}
      </div>
      <div class="card">
        <div class="ct">🏆 Top 5 Students</div>
        ${topStudents.map((l,i)=>renderLBItem(l,i)).join('')}
      </div>
    </div>
    <div class="card">
      <div class="ct">📉 Score Distribution</div>
      <div style="display:flex;gap:14px;flex-wrap:wrap">
        ${[['90-100%',90,100,'var(--g)'],['75-89%',75,89,'var(--g)'],['60-74%',60,74,'var(--y)'],['40-59%',40,59,'var(--y)'],['0-39%',0,39,'var(--r)']].map(([label,lo,hi,col])=>{
          const cnt=DB.scores.filter(s=>s.pct>=lo&&s.pct<=hi).length;
          const pct=total?Math.round(cnt/total*100):0;
          return `<div style="text-align:center;min-width:80px"><div style="font-size:22px;font-weight:700;font-family:'JetBrains Mono',monospace;color:${col}">${cnt}</div><div style="font-size:11px;color:var(--t2)">${label}</div><div style="font-size:11px;color:var(--t3)">${pct}% of tests</div></div>`;
        }).join('')}
      </div>
    </div>`;
}
function renderScoreByStudent(el){
  const lb=buildLeaderboard();
  el.innerHTML=`<div class="tw"><table>
    <thead><tr><th>Rank</th><th>Student</th><th>Tests</th><th>Avg</th><th>Best</th><th>Pass Rate</th></tr></thead>
    <tbody>${lb.map((l,i)=>{
      const sts=DB.scores.filter(s=>s.studentId===l.studentId);
      const pr=Math.round(sts.filter(s=>s.pct>=DB.settings.passmark).length/sts.length*100);
      const col=l.avg>=75?'var(--g)':l.avg>=50?'var(--y)':'var(--r)';
      return `<tr>
        <td style="font-family:'JetBrains Mono',monospace">${i<3?['🥇','🥈','🥉'][i]:i+1}</td>
        <td><div style="font-weight:500">${esc(l.name.trim())}</div><div style="font-size:11px;color:var(--t2);font-family:'JetBrains Mono',monospace">${l.studentId}</div></td>
        <td style="font-family:'JetBrains Mono',monospace">${l.tests}</td>
        <td style="font-family:'JetBrains Mono',monospace;font-weight:700;color:${col}">${l.avg}%</td>
        <td style="font-family:'JetBrains Mono',monospace;color:var(--g)">${l.best}%</td>
        <td style="font-family:'JetBrains Mono',monospace;color:${pr>=60?'var(--g)':'var(--r)'}">${pr}%</td>
      </tr>`;
    }).join('')}</tbody>
  </table></div>`;
}
function renderScoreByModule(el){
  const modStats={};
  DB.scores.forEach(s=>{
    if(!modStats[s.moduleId])modStats[s.moduleId]={id:s.moduleId,name:s.moduleName,scores:[],tests:0,students:new Set()};
    modStats[s.moduleId].scores.push(s.pct);modStats[s.moduleId].tests++;modStats[s.moduleId].students.add(s.studentId);
  });
  const rows=Object.values(modStats).sort((a,b)=>avg(b.scores)-avg(a.scores));
  if(!rows.length){el.innerHTML='<div class="empty"><div class="ei">📦</div><div>No module data yet</div></div>';return}
  el.innerHTML=`<div class="tw"><table>
    <thead><tr><th>Module</th><th>Tests</th><th>Students</th><th>Avg</th><th>Pass Rate</th><th>Trend</th></tr></thead>
    <tbody>${rows.map(r=>{
      const a=avg(r.scores);const col=a>=75?'var(--g)':a>=50?'var(--y)':'var(--r)';
      const m=DB.modules.find(x=>x.id===r.id);
      const pr=Math.round(r.scores.filter(p=>p>=DB.settings.passmark).length/r.scores.length*100);
      const bars=r.scores.slice(-7).map(p=>`<div style="width:7px;border-radius:2px 2px 0 0;background:${p>=75?'var(--g)':p>=50?'var(--y)':'var(--r)'};height:${Math.round(p*0.4)+2}px;opacity:.8"></div>`).join('');
      return `<tr>
        <td><div style="font-weight:500">${m?m.icon+' ':''} ${esc(r.name)}</div></td>
        <td style="font-family:'JetBrains Mono',monospace">${r.tests}</td>
        <td style="font-family:'JetBrains Mono',monospace">${r.students.size}</td>
        <td style="font-family:'JetBrains Mono',monospace;font-weight:700;color:${col}">${a}%</td>
        <td style="font-family:'JetBrains Mono',monospace;color:${pr>=60?'var(--g)':'var(--r)'}">${pr}%</td>
        <td><div style="display:flex;align-items:flex-end;gap:2px;height:20px">${bars}</div></td>
      </tr>`;
    }).join('')}</tbody>
  </table></div>`;
}
function renderAllAttempts(el){
  const sorted=DB.scores.sort((a,b)=>b.id-a.id);
  if(!sorted.length){el.innerHTML='<div class="empty"><div class="ei">📋</div><div>No attempts yet</div></div>';return}
  el.innerHTML=`<div class="tw" style="max-height:550px;overflow-y:auto"><table>
    <thead><tr><th>Date</th><th>Student</th><th>Module</th><th>Score</th><th>Time</th><th>Level</th></tr></thead>
    <tbody>${sorted.map(s=>{
      const col=s.pct>=75?'var(--g)':s.pct>=50?'var(--y)':'var(--r)';
      return `<tr>
        <td style="color:var(--t2);font-size:12px">${s.date||'Today'}</td>
        <td><div style="font-size:13px;font-weight:500">${esc(s.studentName.trim().split(' ')[0])}</div><div style="font-size:11px;color:var(--t2);font-family:'JetBrains Mono',monospace">${s.studentId}</div></td>
        <td style="font-size:12px">${s.moduleName}</td>
        <td style="font-family:'JetBrains Mono',monospace;font-weight:700;color:${col}">${s.pct}% <span style="font-size:11px;color:var(--t2)">(${s.correct}/${s.total})</span></td>
        <td style="font-family:'JetBrains Mono',monospace;font-size:12px">${fmt(s.timeTaken)}</td>
        <td><span class="badge b${s.diff?s.diff[0]:'e'}">${s.diff||'easy'}</span></td>
      </tr>`;
    }).join('')}</tbody>
  </table></div>`;
}

// ── ADMIN: LEADERBOARD ──
function renderAdminLeaderboard(){
  const lb=buildLeaderboard();
  const el=$('admin-lb-content');
  if(!lb.length){el.innerHTML='<div class="empty"><div class="ei">🏆</div><div>No scores yet — students need to complete tests</div></div>';return}
 
  // Re-sort for most tests
  const mostTests=[...lb].sort((a,b)=>b.tests-a.tests);
  const topAvg=lb[0];
  const topTests=mostTests[0];
  const passRate=Math.round(DB.scores.filter(s=>s.pct>=DB.settings.passmark).length/DB.scores.length*100);
 
  el.innerHTML=`
    <div class="sg sg4" style="margin-bottom:20px">
      <div class="sc gn">
        <div class="sl">🥇 Top Scorer</div>
        <div class="sv" style="font-size:18px;line-height:1.3">${topAvg.name.trim().split(' ')[0]}</div>
        <div class="ss">${topAvg.avg}% avg · ${topAvg.tests} test${topAvg.tests!==1?'s':''}</div>
      </div>
      <div class="sc yw">
        <div class="sl">🏃 Most Active</div>
        <div class="sv" style="font-size:18px;line-height:1.3">${topTests.name.trim().split(' ')[0]}</div>
        <div class="ss">${topTests.tests} test${topTests.tests!==1?'s':''} taken</div>
      </div>
      <div class="sc cy">
        <div class="sl">👥 Participants</div>
        <div class="sv">${lb.length}</div>
        <div class="ss">of ${DB.students.length} enrolled</div>
      </div>
      <div class="sc bl">
        <div class="sl">✅ Pass Rate</div>
        <div class="sv">${passRate}%</div>
        <div class="ss">Pass = ≥${DB.settings.passmark}%</div>
      </div>
    </div>
    <div class="card" style="padding:0;overflow:hidden">
      <div style="padding:14px 18px;border-bottom:1px solid var(--b);display:flex;justify-content:space-between;align-items:center">
        <div style="font-size:14px;font-weight:700">Full Rankings · ${lb.length} students</div>
        <button class="btn bsm bo" onclick="exportScoresCSV()">📥 Export CSV</button>
      </div>
      <div style="overflow-x:auto;max-height:500px;overflow-y:auto">
        <table style="width:100%;border-collapse:collapse">
          <thead style="position:sticky;top:0;z-index:1">
            <tr style="background:rgba(26,26,36,.95)">
              <th style="padding:10px 14px;text-align:center;font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.6px">Rank</th>
              <th style="padding:10px 14px;text-align:left;font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.6px">Student</th>
              <th style="padding:10px 14px;text-align:center;font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.6px">Tests</th>
              <th style="padding:10px 14px;text-align:center;font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.6px">Avg Score</th>
              <th style="padding:10px 14px;text-align:center;font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.6px">Best</th>
              <th style="padding:10px 14px;text-align:center;font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.6px">Pass Rate</th>
              <th style="padding:10px 14px;text-align:left;font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.6px">Trend</th>
            </tr>
          </thead>
          <tbody>
            ${lb.map((l,i)=>{
              const sts=DB.scores.filter(s=>s.studentId===l.studentId);
              const pr=sts.length?Math.round(sts.filter(s=>s.pct>=DB.settings.passmark).length/sts.length*100):0;
              const col=l.avg>=75?'var(--g)':l.avg>=50?'var(--y)':'var(--r)';
              const init=l.name.split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase();
              const rankIcons=['🥇','🥈','🥉'];
              const sparkBars=sts.slice(-8).map(s=>`<div style="width:5px;height:${Math.max(3,Math.round(s.pct*0.28)+2)}px;border-radius:2px;background:${s.pct>=75?'var(--g)':s.pct>=50?'var(--y)':'var(--r)'};opacity:.85"></div>`).join('');
              return `<tr style="border-top:1px solid var(--b)" onmouseover="this.style.background='rgba(108,99,255,.04)'" onmouseout="this.style.background=''">
                <td style="padding:11px 14px;text-align:center">
                  ${i<3?`<span style="font-size:18px">${rankIcons[i]}</span>`:`<span style="font-size:12px;font-weight:700;font-family:'JetBrains Mono',monospace;color:var(--t3)">${i+1}</span>`}
                </td>
                <td style="padding:11px 14px">
                  <div style="display:flex;align-items:center;gap:9px">
                    <div style="width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,var(--a),var(--p));display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0">${init}</div>
                    <div>
                      <div style="font-size:13px;font-weight:600">${esc(l.name.trim())}</div>
                      <div style="font-size:10px;color:var(--t3);font-family:'JetBrains Mono',monospace">${l.studentId}</div>
                    </div>
                  </div>
                </td>
                <td style="padding:11px 14px;text-align:center;font-family:'JetBrains Mono',monospace;color:var(--c);font-weight:700">${l.tests}</td>
                <td style="padding:11px 14px;text-align:center">
                  <span style="font-family:'JetBrains Mono',monospace;font-size:16px;font-weight:900;color:${col}">${l.avg}%</span>
                </td>
                <td style="padding:11px 14px;text-align:center;font-family:'JetBrains Mono',monospace;color:var(--g);font-weight:600">${l.best}%</td>
                <td style="padding:11px 14px;text-align:center">
                  <span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:6px;background:${pr>=60?'rgba(34,197,94,.12)':'rgba(239,68,68,.1)'};color:${pr>=60?'var(--g)':'var(--r)'}">${pr}%</span>
                </td>
                <td style="padding:11px 14px">
                  <div style="display:flex;align-items:flex-end;gap:2px;height:22px">${sparkBars}</div>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
}

// ── BULK IMPORT ──
function switchImportTab(tab){
  ['csv','paste','json','gsheets'].forEach(t=>{
    const el=$('itab-'+t);
    if(el) el.classList.toggle('hidden',t!==tab);
  });
  document.querySelectorAll('#p-aimport .tab').forEach((t,i)=>{
    t.classList.toggle('active',['csv','paste','json','gsheets'][i]===tab);
  });
  if(tab==='gsheets') initGSTabMapping();
}
function renderModIDRef(){
  $('mod-id-ref').innerHTML=DB.modules.map(m=>
    `<div style="display:flex;align-items:center;gap:8px;padding:3px 0;border-bottom:1px solid var(--b)">
      <span style="color:var(--a2);font-weight:700;min-width:18px">${m.id}</span>
      <span style="font-size:14px">${m.icon}</span>
      <span style="color:var(--t)">${esc(m.name)}</span>
    </div>`
  ).join('');
}
function downloadTemplate(){
  const header='module_id,difficulty,topic,question,opt_a,opt_b,opt_c,opt_d,correct(0-3),explanation\n';
  const row='0,easy,Data Types,"What is output of print(type([]))?","<class \'list\'>","<class \'tuple\'>","<class \'set\'>","<class \'dict\'>",0,"[] creates a list object"\n';
  const blob=new Blob([header+row],{type:'text/csv'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='vnslabs_mcq_template.csv';a.click();
  toast('Template downloaded','info');
}
function dzOver(e){e.preventDefault();$('dz').classList.add('drag-over')}
function dzLeave(){$('dz').classList.remove('drag-over')}
function dzDrop(e){e.preventDefault();dzLeave();const f=e.dataTransfer.files[0];if(f)processCSVFile(f)}
function handleCSVFile(e){const f=e.target.files[0];if(f)processCSVFile(f)}
function processCSVFile(file){
  const reader=new FileReader();
  reader.onload=e=>{
    const text=e.target.result;parseCSV(text);
  };
  reader.readAsText(file);
}
function parseCSV(text){
  const rawLines=text.trim().split('\n').filter(l=>l.trim());
  if(!rawLines.length){toast('File is empty','error');return}

  // Read override values from UI
  const modOverride=$('csv-mod-override')?.value||'';
  const diffOverride=$('csv-diff-override')?.value||'';
  const topicOverride=$('csv-topic-override')?.value.trim()||'';

  // ── STEP 1: Detect header row ─────────────────────────────
  // Check if first line looks like a header (has non-numeric text in key positions)
  const firstParts=parseCSVLine(rawLines[0]);
  const firstColLower=(firstParts[0]||'').toLowerCase().trim();
  const hasHeader=isNaN(parseInt(firstColLower))||
    firstColLower.includes('id')||firstColLower.includes('q')||
    firstColLower.includes('module')||firstColLower.includes('diff')||
    firstColLower.includes('question');
  const dataStart=hasHeader?1:0;
  const headerRowRaw=hasHeader?firstParts.map(h=>h.toLowerCase().trim()):[];
  const headerRow=headerRowRaw.map(h=>h.replace(/[^a-z0-9]/g,''));
  // ── STEP 2: Map header names to column indices ────────────
  // Each key = internal field name, value = array of possible header strings
   const ALIASES={
    mid:    ['moduleid','module_id','module','mod'],
    diff:   ['difficulty','diff','level','hard_easy'],
    topic:  ['topic','tag','subject','category'],
    q:      ['questiontext','question_text','question text','question','q','qtext'],
    a:      ['option a','option_a','opta','opt_a','optiona','a'],
    b:      ['option b','option_b','optb','opt_b','optionb','b'],
    c:      ['option c','option_c','optc','opt_c','optionc','c'],
    d:      ['option d','option_d','optd','opt_d','optiond','d'],
    ans:    ['correct03','correct_03','correct0_3','correct','correctanswer','correct_answer','ans','answer_index','correctindex'],
    explain:['explanation','explain','exp','hint','reason','note'],
    setid:  ['setid','set_id','set id'],
    active: ['active yn','active_yn','activey_n','active'],
  };

  const colIdx={};
  if(hasHeader){
    Object.entries(ALIASES).forEach(([field,alts])=>{
    let idx=headerRow.findIndex(h=>alts.includes(h));
    if(idx<0) idx=headerRowRaw.findIndex(h=>alts.includes(h));
    if(idx>=0)colIdx[field]=idx;
  });
  }

  // ── STEP 3: Determine layout ──────────────────────────────
  // If no header, fall back to position-based layouts
  const LAYOUTS={
    // Our standard template: module_id,diff,topic,q,a,b,c,d,ans,exp
    standard10: {mid:0,diff:1,topic:2,q:3,a:4,b:5,c:6,d:7,ans:8,explain:9},
    // Without module_id: diff,topic,q,a,b,c,d,ans,exp
    noMod9:     {diff:0,topic:1,q:2,a:3,b:4,c:5,d:6,ans:7,explain:8},
    // Excel exported from our schema: Q#,diff,topic,q,a,b,c,d,ans,correct_text,exp,set_id,active
    excelSchema:{diff:1,topic:2,q:3,a:4,b:5,c:6,d:7,ans:8,explain:10},
  };

  // Build the final column map
  let cm={};
  if(hasHeader&&Object.keys(colIdx).length>=4){
    // Header-detected: use colIdx
    cm=colIdx;
  } else {
    // No header or too few matches: guess by column count
    const sampleCols=parseCSVLine(rawLines[dataStart]||rawLines[0]).length;
    if(sampleCols>=13) cm=LAYOUTS.excelSchema;      // our Excel export format
    else if(sampleCols>=10) cm=LAYOUTS.standard10;  // standard with module_id
    else cm=LAYOUTS.noMod9;                          // no module_id
  }

  const rows=[];const errors=[];

  for(let i=dataStart;i<rawLines.length;i++){
    const parts=parseCSVLine(rawLines[i]);
    if(parts.every(p=>!p.trim())) continue; // skip blank rows

    const get=(field)=>(cm[field]!==undefined&&parts[cm[field]]!==undefined)?parts[cm[field]].trim():'';

    let mid    = get('mid');
    let diff   = get('diff');
    let topic  = get('topic');
    const q    = get('q');
    const a    = get('a');
    const b    = get('b');
    const c    = get('c');
    const d    = get('d');
    const ans  = get('ans');
    const exp  = get('explain');

    // Apply overrides (override wins if set)
    if(modOverride)   mid   = modOverride;
    if(diffOverride)  diff  = diffOverride;
    if(topicOverride) topic = topicOverride;

    // Validate module
    const modId=parseInt(mid);
    if(!modOverride&&(isNaN(modId)||!DB.modules.find(x=>parseInt(x.id)===modId))){
      // If no override set AND module is invalid, skip with helpful message
      errors.push(`Row ${i+1}: unrecognised module_id "${mid || '(empty)'}" — set "Force Module" above to assign all rows to a module, or use IDs: ${DB.modules.map(m=>m.id).join(', ')}`);
      continue;
    }
    const finalModId = modOverride ? parseInt(modOverride) : modId;
    if(isNaN(finalModId)){errors.push(`Row ${i+1}: no module — set Force Module override`);continue}

    // Validate answer index
    const ansIdx=parseInt(ans);
    if(isNaN(ansIdx)||ansIdx<0||ansIdx>3){
      errors.push(`Row ${i+1}: correct answer "${ans}" must be 0-3 (0=A,1=B,2=C,3=D)`);continue;
    }

    // Validate required fields
    if(!q||!a||!b||!c||!d){
      errors.push(`Row ${i+1}: missing question or option text`);continue;
    }

    // Normalise difficulty
    const diffNorm=(diff||'').toLowerCase().trim();
    const finalDiff=['easy','medium','hard'].includes(diffNorm)?diffNorm:'easy';

    const rawSetId = cm.setid!==undefined ? (parts[cm.setid]||'').trim() : '';
    const rawActive = cm.active!==undefined ? (parts[cm.active]||'').trim().toLowerCase() : 'y';
    const isActive = rawActive==='n'||rawActive==='no'||rawActive==='false' ? false : true;
    rows.push({
      moduleId:finalModId,
      diff:finalDiff,
      topic:(topic||'General').trim(),
      q:q.trim(),
      opts:[a,b,c,d],
      ans:ansIdx,
      explain:exp.trim(),
      presetSetId: rawSetId||null,
      active: isActive,
    });
  }

  _csvData=rows;

  // ── STEP 4: Show results ──────────────────────────────────
  const preEl=$('csv-preview-area');
  const btnEl=$('csv-import-btn-area');

  // Format detection summary
  const detectedFmt=hasHeader?'Header row detected — columns mapped by name':
    (parseCSVLine(rawLines[0]).length>=13?'Excel schema format detected (13+ cols)':
    'Standard CSV format');

  let html=`
    <div style="margin:10px 0 12px;display:flex;gap:8px;flex-wrap:wrap;align-items:center">
      <span class="pill pg">✅ ${rows.length} valid questions</span>
      ${errors.length?`<span class="pill pr">⚠️ ${errors.length} skipped</span>`:''}
      <span style="font-size:11px;color:var(--t2);padding:3px 9px;background:var(--bg3);border-radius:6px">📋 ${detectedFmt}</span>
    </div>`;

  if(errors.length){
    // Show first 5 errors + count
    const shown=errors.slice(0,5);
    const more=errors.length-5;
    html+=`<div style="background:rgba(239,68,68,.07);border:1px solid rgba(239,68,68,.2);border-radius:10px;padding:10px 14px;font-size:12px;color:var(--r);margin-bottom:10px;max-height:130px;overflow-y:auto">
      ${shown.map(esc).join('<br>')}
      ${more>0?`<div style="margin-top:6px;color:var(--y)">...and ${more} more skipped rows. Use the <strong>Force Module</strong> override above to fix most errors.</div>`:''}
    </div>
    <div style="background:rgba(245,158,11,.07);border:1px solid rgba(245,158,11,.25);border-radius:10px;padding:10px 14px;font-size:12px;color:var(--y);margin-bottom:10px">
      💡 <strong>Quick fix:</strong> Select a module in <strong>Force Module</strong> above, then drop the file again — all rows will be assigned to that module automatically.
    </div>`;
  }

  if(rows.length){
    html+=`<div class="csv-preview"><table class="csv-table">
      <thead><tr><th>#</th><th>Module</th><th>Diff</th><th>Topic</th><th>Question</th><th>Correct Answer</th></tr></thead>
      <tbody>
        ${rows.slice(0,20).map((r,idx)=>{
          const m=DB.modules.find(x=>parseInt(x.id)===r.moduleId);
          return `<tr>
            <td>${idx+1}</td>
            <td>${m?m.icon+' '+m.name:'?'}</td>
            <td><span class="badge b${r.diff[0]}">${r.diff}</span></td>
            <td>${esc(r.topic)}</td>
            <td>${esc(r.q.substring(0,55))}${r.q.length>55?'...':''}</td>
            <td style="color:var(--g)">${esc(r.opts[r.ans])}</td>
          </tr>`;
        }).join('')}
        ${rows.length>20?`<tr><td colspan="6" style="text-align:center;color:var(--t2);padding:8px">...and ${rows.length-20} more rows</td></tr>`:''}
      </tbody>
    </table></div>`;
  }

  preEl.innerHTML=html;
  preEl.classList.remove('hidden');
  if(rows.length){
    $('csv-valid-count').textContent=`${rows.length} question${rows.length!==1?'s':''} ready to import`;
    btnEl.classList.remove('hidden');
  } else {
    btnEl.classList.add('hidden');
  }
}
function parseCSVLine(line){
  const result=[];let cur='';let inQ=false;
  for(let i=0;i<line.length;i++){
    const ch=line[i];
    if(ch==='"'){if(inQ&&line[i+1]==='"'){cur+='"';i++}else inQ=!inQ}
    else if(ch===','&&!inQ){result.push(cur.trim());cur=''}
    else cur+=ch;
  }
  result.push(cur.trim());return result;
}
function importCSVData(){
  if(!_csvData.length){toast('No valid data to import','error');return}
  showUploadDestModal(_csvData,'csv');
}
function parsePasteImport(){
  const text=$('paste-area').value.trim();
  const modId=parseInt($('paste-mod').value);
  const diff=$('paste-diff').value;const topic=$('paste-topic').value.trim()||'General';
  if(!text){toast('Paste some questions first','error');return}
  if(isNaN(modId)){toast('Select a target module','error');return}
  const blocks=text.split(/\n\s*\n/).filter(b=>b.trim());
  const questions=[];const errors=[];
  blocks.forEach((block,i)=>{
    const lines=block.split('\n').map(l=>l.trim()).filter(Boolean);
    let q='';const opts=[];let ans=-1;let exp='';
    lines.forEach(l=>{
      if(l.match(/^Q:/i))q=l.replace(/^Q:/i,'').trim();
      else if(l.match(/^A\)/i))opts[0]=l.replace(/^A\)/i,'').trim();
      else if(l.match(/^B\)/i))opts[1]=l.replace(/^B\)/i,'').trim();
      else if(l.match(/^C\)/i))opts[2]=l.replace(/^C\)/i,'').trim();
      else if(l.match(/^D\)/i))opts[3]=l.replace(/^D\)/i,'').trim();
      else if(l.match(/^ANS:/i)){const a=l.replace(/^ANS:/i,'').trim().toUpperCase();ans=['A','B','C','D'].indexOf(a)}
      else if(l.match(/^EXP:/i))exp=l.replace(/^EXP:/i,'').trim();
    });
    if(!q||opts.filter(Boolean).length<4||ans<0)errors.push(`Block ${i+1}: incomplete (need Q:, A)-D), ANS:)`);
    else questions.push({moduleId:modId,diff,topic,q,opts,ans,explain:exp});
  });
  const prev=$('paste-preview');
  if(!questions.length){prev.innerHTML=`<div style="color:var(--r);padding:12px;background:rgba(239,68,68,.08);border-radius:10px;">${errors.map(esc).join('<br>')}</div>`;prev.classList.remove('hidden');return}
  prev.innerHTML=`<div class="ai-preview">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px">
      <span class="pill pg">✅ ${questions.length} questions parsed</span>
      ${errors.length?`<span class="pill pr">⚠️ ${errors.length} skipped</span>`:''}
      <button class="btn bg bsm" onclick="showUploadDestModal(window._pasteQuestions,'paste')">📥 Choose Where to Import →</button>
    </div>
    ${questions.slice(0,5).map((q,i)=>`<div class="q-prev-item"><div class="q-prev-text">Q${i+1}: ${esc(q.q)}</div><div class="q-prev-opts">${q.opts.map((o,j)=>`<div class="q-prev-opt ${j===q.ans?'correct':''}">${['A','B','C','D'][j]}) ${esc(o)}</div>`).join('')}</div></div>`).join('')}
    ${questions.length>5?`<div style="font-size:12px;color:var(--t2);text-align:center;padding:8px">...and ${questions.length-5} more</div>`:''}
  </div>`;
  prev.classList.remove('hidden');
  window._pasteQuestions=questions;
}
function importParsedQuestions(){
  const qs=window._pasteQuestions||[];
  if(!qs.length){toast('Nothing to import','error');return}
  qs.forEach(q=>DB.mcqBank.push({id:uid(),...q}));
  toast(`✅ ${qs.length} questions added to MCQ Bank!`,'success');
  $('paste-area').value='';$('paste-preview').classList.add('hidden');
  window._pasteQuestions=[];refreshAdminDash();
}
function parseJSONImport(){
  const text=$('json-area').value.trim();
  if(!text){toast('Paste JSON first','error');return}
  let data;
  try{data=JSON.parse(text)}catch(e){toast('Invalid JSON: '+e.message,'error');return}
  if(!Array.isArray(data)){toast('JSON must be an array []','error');return}
  let count=0;const errors=[];
  data.forEach((q,i)=>{
    if(!q.q||!q.opts||!Array.isArray(q.opts)||q.opts.length<4||q.ans===undefined||q.moduleId===undefined){errors.push(`Item ${i+1}: missing required fields (moduleId, q, opts, ans)`);return}
    if(!DB.modules.find(m=>m.id===parseInt(q.moduleId))){errors.push(`Item ${i+1}: invalid moduleId ${q.moduleId}`);return}
    DB.mcqBank.push({id:uid(),moduleId:parseInt(q.moduleId),diff:q.diff||'easy',topic:q.topic||'General',q:q.q,opts:q.opts.slice(0,4),ans:parseInt(q.ans),explain:q.explain||''});
    count++;
  });
  if(count)toast(`✅ ${count} questions imported!`,'success');
  if(errors.length)toast(`⚠️ ${errors.length} items skipped — check console`,'warning');
  if(count){$('json-area').value='';refreshAdminDash()}
}

// ── AI MCQ GENERATOR ──
function openAIGen(){openModal('ai-gen-modal');populateModSels();$('ag-preview').classList.add('hidden');$('ag-status').classList.add('hidden');$('ag-import-btn').classList.add('hidden');_aiQuestions=[]}
function openAIGenNoModal(){openAIGen()}

async function generateAIMCQ(){
  const modId=parseInt($('ag-mod').value);const diff=$('ag-dif').value;
  const cnt=Math.min(20,Math.max(1,parseInt($('ag-cnt').value)||5));
  const topic=$('ag-topic').value.trim();const notes=$('ag-notes').value.trim();
  if(isNaN(modId)){toast('Select a module','error');return}
  const m=DB.modules.find(x=>x.id===modId);
  const status=$('ag-status');const preview=$('ag-preview');const importBtn=$('ag-import-btn');
  status.innerHTML=`<div class="ai-loading"><div class="ai-spinner"></div><span>Generating ${cnt} ${diff} questions for ${m.icon} ${m.name}${topic?' on "'+topic+'"':''}...</span></div>`;
  status.classList.remove('hidden');preview.classList.add('hidden');importBtn.classList.add('hidden');

  const prompt=`You are an expert MCQ creator for a Data Science course (PGCP-BDA at C-DAC Kharghar).
Generate exactly ${cnt} multiple-choice questions for the module: "${m.name}" (${m.desc}).
${topic?'Focus specifically on the topic: "'+topic+'"':'Cover various topics: '+m.topics.join(', ')+'.'} 
Difficulty level: ${diff}.
${notes?'Additional instructions: '+notes:''}

Return ONLY a JSON array with no markdown, no explanation, no code fences. Just the raw JSON array:
[
  {
    "topic": "specific topic tag",
    "q": "Question text here?",
    "opts": ["Option A text", "Option B text", "Option C text", "Option D text"],
    "ans": 0,
    "explain": "Brief explanation of why the answer is correct."
  }
]
- ans is the 0-based index of the correct option (0=A, 1=B, 2=C, 3=D)
- Make questions clear, specific, and exam-appropriate for PGCP-BDA students
- Ensure distractors are plausible but clearly wrong upon examination`;

  try{
    const res=await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        model:'claude-sonnet-4-20250514',max_tokens:4000,
        messages:[{role:'user',content:prompt}]
      })
    });
    const data=await res.json();
    const text=data.content?.[0]?.text||'';
    let parsed;
    try{
      const clean=text.replace(/```json\n?/g,'').replace(/```\n?/g,'').trim();
      parsed=JSON.parse(clean);
    }catch{
      const match=text.match(/\[[\s\S]*\]/);
      if(match)parsed=JSON.parse(match[0]);
      else throw new Error('Could not parse AI response as JSON');
    }
    if(!Array.isArray(parsed)||!parsed.length)throw new Error('AI returned empty array');
    _aiQuestions=parsed.map(q=>({moduleId:modId,diff,topic:q.topic||topic||m.topics[0],q:q.q,opts:q.opts.slice(0,4),ans:parseInt(q.ans),explain:q.explain||''}));
    status.innerHTML=`<div style="background:rgba(34,197,94,.08);border:1px solid rgba(34,197,94,.2);border-radius:10px;padding:11px 14px;color:var(--g);font-size:13px">✅ Generated ${_aiQuestions.length} questions successfully!</div>`;
    preview.innerHTML=`<div class="ai-preview"><div class="ct" style="margin-bottom:10px">Preview (${_aiQuestions.length} questions)</div>`+_aiQuestions.map((q,i)=>`
      <div class="q-prev-item">
        <div class="q-prev-text">Q${i+1}: ${esc(q.q)}</div>
        <div class="q-prev-opts">${q.opts.map((o,j)=>`<div class="q-prev-opt ${j===q.ans?'correct':''}">${['A','B','C','D'][j]}) ${esc(o)}</div>`).join('')}</div>
        ${q.explain?`<div style="font-size:11px;color:var(--t2);margin-top:5px;padding-top:5px;border-top:1px solid var(--b)">💡 ${esc(q.explain)}</div>`:''}
      </div>`).join('')+'</div>';
    preview.classList.remove('hidden');
    importBtn.innerHTML='';
    importBtn.innerHTML=`<button class="btn bg wfull" onclick="showUploadDestModal(_aiQuestions,'ai')">📥 Choose Where to Add These Questions →</button>`;
    importBtn.classList.remove('hidden');
  }catch(err){
    status.innerHTML=`<div style="background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.2);border-radius:10px;padding:11px 14px;color:var(--r);font-size:13px">❌ AI generation failed: ${esc(err.message)}<br><span style="font-size:11px;color:var(--t3)">Check your network connection. The AI endpoint requires internet access.</span></div>`;
  }
}
function importAIQuestions(){
  if(!_aiQuestions.length){toast('Nothing to import','error');return}
  showUploadDestModal(_aiQuestions,'ai');
  closeModal('ai-gen-modal');
}

// ── SETTINGS ──
function changeAdminPass(){
  const p=$('new-ap').value.trim();
  if(!p||p.length<4){toast('Min 4 chars','error');return}
  DB.adminPass=p;
  $('new-ap').value='';
  toast('Admin password updated','success');
  saveDB();
  // Also push to Config sheet so it persists across devices
  const asUrl=localStorage.getItem('vns_apps_script_url')||'';
  if(asUrl) pushToAppsScript({action:'saveConfig',config:{adminPass:p}},asUrl);
}
function saveSettings(){DB.settings.timer=parseInt($('s-timer').value)||45;DB.settings.qCount=parseInt($('s-qc').value)||50;DB.settings.passmark=parseInt($('s-pass').value)||60;toast('Settings saved','success'),saveDB();}
function exportStudentsCSV(){
  const h='Student ID,Name,Password,Status\n';
  const rows=DB.students.map(s=>`${s.id},"${s.name}",${s.pass},${s.status}`).join('\n');
  dl(h+rows,'vnslabs_students.csv','text/csv');toast('Exported','success'),saveDB();
}
function exportMCQCSV(){
  const h='ID,Module ID,Difficulty,Topic,Question,Opt A,Opt B,Opt C,Opt D,Correct(0-3),Explanation\n';
  const rows=DB.mcqBank.map(q=>`${q.id},${q.moduleId},${q.diff},"${q.topic}","${q.q}","${q.opts[0]}","${q.opts[1]}","${q.opts[2]}","${q.opts[3]}",${q.ans},"${q.explain||''}"`).join('\n');
  dl(h+rows,'vnslabs_mcq_bank.csv','text/csv');toast('Exported','success'),saveDB();
}
function exportScoresCSV(){
  const h='Date,Student ID,Student Name,Module,Set Name,Score%,Correct,Wrong,Total,Time(sec),Level\n';
  const rows=DB.scores.map(s=>`${s.date||''},${s.studentId},"${s.studentName}","${s.moduleName}","${s.setName||s.setId||''}",${s.pct},${s.correct},${s.wrong||0},${s.total},${s.timeTaken},${s.diff||'easy'}`).join('\n');
  dl(h+rows,'vnslabs_scores.csv','text/csv');toast('Exported','success'),saveDB();
}
function dl(content,filename,type){const b=new Blob([content],{type});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=filename;a.click()}

// ── TEST ENGINE ──
function startTest(modId,setId){
  closeModal('mod-sel-mo');
  modId=parseInt(modId);
  setId=String(setId);

  const setObj=DB.sets.find(s=>String(s.id)===setId)||{timer:45,qCount:50,name:'Set',diffMix:'mixed'};

  // Build question pool: filter by moduleId + Difficulty Mix from the set
  let bank=DB.mcqBank.filter(q=>parseInt(q.moduleId)===modId);

  const diffMix=(setObj.diffMix||'mixed').toLowerCase().trim();
  if(diffMix&&diffMix!=='mixed'&&diffMix!=='all'){
    // Support single value ('easy') or comma-separated ('easy,medium')
    const allowed=diffMix.split(/[,|]/).map(d=>d.trim()).filter(Boolean);
    const filtered=bank.filter(q=>allowed.includes((q.diff||'easy').toLowerCase()));
    if(filtered.length>0) bank=filtered; // only filter if it yields results
  }

  if(!bank.length){toast('No questions in this module yet!','error',4000);return;}

  clearInterval(SES.timerInt);
  SES.modIdx=modId;
  SES.setId=setId;

  const base=shuf(bank);
  const targetCount=Math.min(parseInt(setObj.qCount)||50, bank.length);
  SES.questions=shuf(base).slice(0,targetCount).map((q,i)=>{
    const oi=shuf([0,1,2,3]);
    return{...q, opts:oi.map(j=>q.opts[j]), ans:oi.indexOf(q.ans), id:i};
  });

  SES.answers={}; SES.marked=new Set(); SES.curQ=0;
  SES.secs=(parseInt(setObj.timer)||45)*60;
  SES.startTime=Date.now();
  SES.diff=diffMix==='hard'?'hard':diffMix==='medium'?'medium':'easy';

  const m=DB.modules.find(x=>parseInt(x.id)===modId);
  $('t-tit').textContent=`${m?m.icon+' '+m.name:'Module'} · ${esc(setObj.name||'Set')}`;
  $('t-dif').textContent=`Difficulty: ${diffMix==='mixed'?'Adaptive':diffMix} Mode`;
  showScreen('s-test');
  renderQ();
  startTimer();
}

function startTimer(){
  clearInterval(SES.timerInt);
  SES.timerInt=setInterval(()=>{
    SES.secs--;
    $('t-tmr').textContent=fmt(SES.secs);
    const b=$('t-tbox');b.className='tbox '+(SES.secs>900?'ok':SES.secs>300?'warn':'danger');
    if(SES.secs<=0){clearInterval(SES.timerInt);submitTest()}
  },1000);
}
function renderQ(){
  const q=SES.questions[SES.curQ];
  const i=SES.curQ;
  const done=Object.keys(SES.answers).length;
  const total=SES.questions.length;

  $('t-qn').textContent='Q'+(i+1);
  // Render code snippets: ```...``` as <pre><code> blocks, `inline` as <code>
  const renderQText=txt=>{
    const escaped=esc(txt);
    // Fenced code blocks first
    const withBlocks=escaped.replace(/```([^`]*?)```/gs,(_,code)=>
      `<pre style="background:var(--bg4);border:1px solid var(--b2);border-radius:8px;padding:10px 14px;font-family:'JetBrains Mono',monospace;font-size:12px;line-height:1.6;overflow-x:auto;margin:8px 0;color:var(--c);white-space:pre">${code.trim()}</pre>`
    );
    // Inline code
    const withInline=withBlocks.replace(/`([^`]+?)`/g,
      (_,code)=>`<code style="background:var(--bg4);border:1px solid var(--b);border-radius:4px;padding:1px 6px;font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--c)">${code}</code>`
    );
    return withInline;
  };
  $('t-qtxt').innerHTML=renderQText(q.q);
  $('t-pl').textContent=`Q${i+1} of ${total}`;
  $('t-pa').textContent=`${done} answered · ${total-done} remaining`;
  $('t-pf').style.width=`${Math.max(2,((i+1)/total)*100)}%`;

  const dc={easy:'be',medium:'bm',hard:'bh'};
  const diff=q.d||'easy';
  $('t-qd').textContent=diff[0].toUpperCase()+diff.slice(1);
  $('t-qd').className='badge '+(dc[diff]||'be');
  $('t-qt').textContent=q.topic||q.t||'General';

  const sel=SES.answers[i];
  const rev=SES.marked.has(i);
  $('t-opts').innerHTML=q.opts.map((o,j)=>`
    <button class="obtn${sel===j?' sel':''}" onclick="selAns(${j})" style="${rev?'border-color:rgba(245,158,11,.4)':''}">
      <span class="oltr">${['A','B','C','D'][j]}</span>
      <span>${esc(o)}</span>
    </button>`).join('');

  renderNav();
  updateAdaptive();
}
function selAns(j){SES.answers[SES.curQ]=j;renderQ()}
function nextQ(){if(SES.curQ<SES.questions.length-1){SES.curQ++;renderQ()}}
function prevQ(){if(SES.curQ>0){SES.curQ--;renderQ()}}
function jumpQ(n){SES.curQ=n;renderQ()}
function markRev(){
  SES.marked.has(SES.curQ)?SES.marked.delete(SES.curQ):SES.marked.add(SES.curQ);
  const btn=document.querySelector('.nav-btn.review-btn');
  if(btn) btn.textContent=SES.marked.has(SES.curQ)?'🔖 Marked':'🔖 Mark Review';
  renderQ();
}
function updateAdaptive(){
  const done=Object.keys(SES.answers).length;if(done<5)return;
  let ok=0;for(const[qi,a]of Object.entries(SES.answers))if(SES.questions[qi].ans===a)ok++;
  const acc=ok/done;SES.diff=acc>=.75?(done>30?'hard':'medium'):acc>=.5?'medium':'easy';
  const dm={easy:{t:'Easy',c:'var(--g)',cl:'easy'},medium:{t:'Medium',c:'var(--y)',cl:'medium'},hard:{t:'Hard',c:'var(--r)',cl:'hard'}};
  const d=dm[SES.diff];$('t-dlvl').textContent=d.t;$('t-dlvl').style.color=d.c;
  $('t-dbar').className='dfill '+d.cl;$('t-dif').textContent=`Difficulty: ${d.t} · Adaptive`;
  $('sb-c').textContent=ok;$('sb-w').textContent=done-ok;
}
function renderNav(){
  $('t-nav').innerHTML=Array.from({length:SES.questions.length},(_,i)=>{
    let cls='qgb';if(i===SES.curQ)cls+=' cur';else if(SES.marked.has(i))cls+=' rev';else if(i in SES.answers)cls+=' ans';
    return `<button class="${cls}" onclick="jumpQ(${i})">${i+1}</button>`;
  }).join('');
}
function confSubmit(){
  const u=SES.questions.length-Object.keys(SES.answers).length;
  const title=u>0?`⚠️ ${u} Unanswered Question${u!==1?'s':''}`:'✅ Submit Test?';
  const msg=u>0?`You have ${u} question${u!==1?'s':''} unanswered. They will be marked wrong. Submit anyway?`:'You\'ve answered all questions. Submit now — you cannot change answers after submitting.';
  confAction(title,msg,()=>submitTest(),'📋');
}
function submitTest(){
  clearInterval(SES.timerInt);
  const time=Math.floor((Date.now()-SES.startTime)/1000);
  let correct=0,wrong=0;
  const topicMap={};
  const attemptKey=SES.user.id+'_'+SES.setId+'_'+Date.now();
  const today=new Date().toLocaleDateString('en-IN');
  const m=DB.modules.find(x=>parseInt(x.id)===SES.modIdx);
  const setForScore=DB.sets.find(s=>String(s.id)===String(SES.setId));

  // Build per-question answer log
  const answerLog=[];
  for(let i=0;i<SES.questions.length;i++){
    const q=SES.questions[i];
    const t=(q.topic||q.t||'General').trim();
    if(!topicMap[t])topicMap[t]={c:0,tot:0};
    topicMap[t].tot++;
    const studentAns=i in SES.answers?SES.answers[i]:null;
    const isCorrect=studentAns!==null&&studentAns===q.ans;
    if(studentAns!==null){if(isCorrect){correct++;topicMap[t].c++;}else wrong++;}
    answerLog.push({
      attemptKey,studentId:SES.user.id,studentName:SES.user.name,
      moduleId:SES.modIdx,setId:SES.setId,date:today,
      qId:String(q.id||i),topic:t,diff:q.d||q.diff||'easy',
      isCorrect,studentAns,correctAns:q.ans
    });
  }

  const pct=Math.round(correct/SES.questions.length*100);
  SES.stats.tests++;
  SES.stats.qs+=Object.keys(SES.answers).length;
  SES.stats.best=Math.max(SES.stats.best,pct);
  SES.stats.streak++;
  updateStuStats();

  const ts={};
  Object.entries(topicMap).forEach(([t,d])=>{ts[t]=d.tot>0?Math.round(d.c/d.tot*100):0});

  const scoreEntry={
    id:uid(),attemptKey,studentId:SES.user.id,studentName:SES.user.name,
    moduleId:SES.modIdx,moduleName:m?m.name:'Unknown',
    setId:SES.setId,setName:setForScore?setForScore.name:'—',
    pct,correct,wrong,unanswered:SES.questions.length-Object.keys(SES.answers).length,
    total:SES.questions.length,timeTaken:time,diff:SES.diff,
    topicScores:ts,date:today
  };
  DB.scores.push(scoreEntry);
  saveDB();

  // Push to Apps Script — score + per-question answers
  const asUrl=(localStorage.getItem('vns_apps_script_url')||'').trim();
  if(asUrl){
    pushToAppsScript({action:'writeScore',score:scoreEntry},asUrl);
    pushToAppsScript({action:'writeAnswers',answers:answerLog},asUrl);
  }
  // Populate result
  const rc=pct>=80?'var(--g)':pct>=60?'var(--y)':'var(--r)';
  const unanswered=SES.questions.length-Object.keys(SES.answers).length;
  const passed=pct>=DB.settings.passmark;
  $('r-ring').style.background=`conic-gradient(${rc} ${pct*3.6}deg,var(--bg4) 0%)`;
  $('r-pct').textContent=pct+'%'; $('r-pct').style.color=rc;
  $('r-tit').textContent=pct>=80?'🏆 Excellent!':pct>=60?'👍 Good Job!':'📚 Keep Practising!';
  const set2=DB.sets.find(s=>String(s.id)===String(SES.setId));
  $('r-sub').textContent=`${m?m.name:'Module'} · ${set2?set2.name:'Set'}`;
  // Inject pass/fail badge next to title
  const passBadge=passed
    ?`<span style="margin-left:10px;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700;background:rgba(34,197,94,.15);color:var(--g);border:1px solid rgba(34,197,94,.3)">✅ PASSED</span>`
    :`<span style="margin-left:10px;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700;background:rgba(239,68,68,.12);color:var(--r);border:1px solid rgba(239,68,68,.25)">❌ FAILED</span>`;
  $('r-tit').innerHTML=$('r-tit').textContent+passBadge;
  $('r-cor').textContent=correct;
  $('r-wrg').textContent=wrong;
  $('r-tm').textContent=fmt(time);
  $('r-dif').textContent=SES.diff[0].toUpperCase()+SES.diff.slice(1)+(unanswered>0?` (${unanswered} skipped)`:'');
  $('r-tops').innerHTML=Object.entries(topicMap).map(([t,d])=>{
    const tp=d.tot>0?Math.round(d.c/d.tot*100):0;const col=tp<50?'var(--r)':tp<75?'var(--y)':'var(--g)';
    return `<div class="tbrow"><div class="tbn">${esc(t)}</div><div class="tbw"><div class="tbf" style="width:${tp}%;background:${col}"></div></div><div class="tbp" style="color:${col}">${tp}%</div></div>`;
  }).join('');
  // Build full answer review
  const allQsHtml=SES.questions.map((q,i)=>{
    const ua=SES.answers[i]; const ok=i in SES.answers&&ua===q.ans;
    return `<div class="aritem${!ok?' w':''}">
      <div style="font-size:13px;margin-bottom:7px;line-height:1.5"><strong>Q${i+1}.</strong> ${esc(q.q)}</div>
      <div class="ara">
        ${i in SES.answers
          ?`<span class="arbadge ${ok?'c':'w'}">${ok?'✓':'✗'} ${esc(q.opts[ua])}</span>`
          :'<span style="font-size:11px;color:var(--t3)">Not answered</span>'}
        ${!ok&&i in SES.answers?`<span class="arbadge c">✓ ${esc(q.opts[q.ans])}</span>`:''}
      </div>
      ${q.explain?`<div style="font-size:12px;color:var(--t2);padding-top:7px;border-top:1px solid var(--b)">💡 ${esc(q.explain)}</div>`:''}
    </div>`;
  }).join('');

  $('r-rev').innerHTML=`
    <div id="r-rev-collapsed">
      ${SES.questions.slice(0,10).map((q,i)=>{
        const ua=SES.answers[i]; const ok=i in SES.answers&&ua===q.ans;
        return `<div class="aritem${!ok?' w':''}">
          <div style="font-size:13px;margin-bottom:7px;line-height:1.5"><strong>Q${i+1}.</strong> ${esc(q.q)}</div>
          <div class="ara">
            ${i in SES.answers?`<span class="arbadge ${ok?'c':'w'}">${ok?'✓':'✗'} ${esc(q.opts[ua])}</span>`:'<span style="font-size:11px;color:var(--t3)">Not answered</span>'}
            ${!ok&&i in SES.answers?`<span class="arbadge c">✓ ${esc(q.opts[q.ans])}</span>`:''}
          </div>
          ${q.explain?`<div style="font-size:12px;color:var(--t2);padding-top:7px;border-top:1px solid var(--b)">💡 ${esc(q.explain)}</div>`:''}
        </div>`;
      }).join('')}
      ${SES.questions.length>10?`<div style="text-align:center;padding:12px 0">
        <button class="btn bo bsm" onclick="
          document.getElementById('r-rev-collapsed').style.display='none';
          document.getElementById('r-rev-full').style.display='block'">
          Show all ${SES.questions.length} questions ↓
        </button>
      </div>`:''}
    </div>
    <div id="r-rev-full" style="display:none">${allQsHtml}</div>
  `;

  // Show success overlay
  const ov=$('sov');ov.style.display='flex';
  $('si').textContent=pct>=80?'🏆':pct>=60?'👏':'📚';
  $('stit').textContent=pct>=80?'Excellent Work!':pct>=60?'Good Job!':'Keep Practising!';
  $('ssc').textContent=pct+'%';
  $('ssub').textContent=`${correct}/${SES.questions.length} correct · ${fmt(time)}`;
  $('sbar').style.transition='none';$('sbar').style.width='100%';
  setTimeout(()=>{$('sbar').style.transition='width 3s linear';$('sbar').style.width='0%'},50);
  setTimeout(()=>{ov.style.display='none';showScreen('s-result')},3000);
}
// ── SHARED UTILS (also defined in main.js for safety) ──
function getSheetId(url){const m=(url||'').match(/\/d\/([a-zA-Z0-9-_]+)/);return m?m[1]:(url||'').trim();}

// ── APPS SCRIPT POST HELPER ──
async function pushToAppsScript(payload, url){
  if(!url) url=(localStorage.getItem('vns_apps_script_url')||'').trim();
  if(!url) return;
  try{
    await fetch(url,{method:'POST',mode:'no-cors',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  }catch(e){console.warn('AppsScript push failed:',payload.action,e);}
}

function retryTest(){startTest(SES.modIdx,SES.setId)}
function backToDash(){
  clearInterval(SES.timerInt);
  showScreen('s-app');
  sp('modules');
  // Refresh leaderboard in background so rank updates immediately
  autoSyncDataFromSheet(false).then(()=>{
    if(SES.user&&!SES.isAdmin) renderStudentLeaderboard&&renderStudentLeaderboard();
  });
}
