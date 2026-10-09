/* ============================================================
   Masjid e Mohammadi · Kidmat Committee — Family Records
   Application logic (vanilla JS, local-first + optional Supabase)
   ============================================================ */
'use strict';

/* ---------------- config / constants ---------------- */
const CFG = window.APP_CONFIG || {};
const PREFIX = CFG.FAMILY_ID_PREFIX || 'MEMC';
const LS = { users:'memc_users', families:'memc_families', seq:'memc_seq', session:'memc_session', theme:'memc_theme', seeded:'memc_seeded' };

const DOC_TYPES = [
  ['aadhaar','Aadhaar Card'], ['pan','PAN Card'], ['passport','Passport'],
  ['birth','Birth Certificate'], ['voter','Voter ID'], ['ration','Ration Card'],
  ['driving','Driving Licence'], ['income','Income Certificate'],
  ['disability','Disability Certificate'], ['bpl','BPL / Ayushman Card']
];
const CUSTOM_DOCS = 12; // "more than 10" empty custom boxes

const ROLE_LABEL = { super:'Super Admin', admin:'Admin', family:'Family Member' };
const GENDERS = ['Male','Female','Other'];
const MARITAL = ['Unmarried','Married','Widow','Widower','Divorced'];

/* ---------------- tiny helpers ---------------- */
const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }
function pad(n,l){ return String(n).padStart(l,'0'); }

async function hashPass(pw, salt){
  const raw = salt + '::' + pw;
  if (window.crypto && crypto.subtle && crypto.subtle.digest){
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
    return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
  }
  let h = 2166136261; for (let i=0;i<raw.length;i++){ h ^= raw.charCodeAt(i); h = Math.imul(h, 16777619); }
  return 'fnv' + (h>>>0).toString(16);
}
function ageFromDob(dob){
  if (!dob) return null; const d = new Date(dob); if (isNaN(d)) return null;
  const t = new Date(); let a = t.getFullYear()-d.getFullYear();
  const m = t.getMonth()-d.getMonth();
  if (m<0 || (m===0 && t.getDate()<d.getDate())) a--;
  return a>=0 && a<130 ? a : null;
}
function fmtDate(d){ if(!d) return '—'; const x=new Date(d); return isNaN(x)?d:x.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}); }
function todayStr(){ const d=new Date(); return d.getFullYear()+'-'+pad(d.getMonth()+1,2)+'-'+pad(d.getDate(),2); }

/* ---------------- storage ---------------- */
const DB = {
  users(){ try{ return JSON.parse(localStorage.getItem(LS.users)||'[]'); }catch(e){ return []; } },
  setUsers(v){ localStorage.setItem(LS.users, JSON.stringify(v)); },
  families(){ try{ return JSON.parse(localStorage.getItem(LS.families)||'[]'); }catch(e){ return []; } },
  setFamilies(v){ localStorage.setItem(LS.families, JSON.stringify(v)); },
  seq(){ return parseInt(localStorage.getItem(LS.seq)||'0',10)||0; },
  setSeq(n){ localStorage.setItem(LS.seq, String(n)); },
  seeded(){ return localStorage.getItem(LS.seeded)==='1'; },
  setSeeded(){ localStorage.setItem(LS.seeded,'1'); }
};

function getSession(){ try{ return JSON.parse(localStorage.getItem(LS.session)||'null'); }catch(e){ return null; } }
function setSession(s){ localStorage.setItem(LS.session, JSON.stringify(s)); }
function clearSession(){ localStorage.removeItem(LS.session); }
function currentUser(){ const s=getSession(); if(!s) return null; return DB.users().find(u=>u.id===s.userId) || null; }

/* ---------------- theme ---------------- */
function applyTheme(t){ document.documentElement.setAttribute('data-theme', t); localStorage.setItem(LS.theme, t);
  const b=$('#themeBtn'); if(b) b.textContent = t==='night' ? '☾ Night' : '☀ Day'; }
function toggleTheme(){ applyTheme(document.documentElement.getAttribute('data-theme')==='night' ? 'day' : 'night'); }
applyTheme(localStorage.getItem(LS.theme) || 'day');

/* ---------------- toast ---------------- */
function toast(msg, type){
  const wrap = $('#toasts'); if(!wrap) return;
  const t = document.createElement('div'); t.className = 'toast' + (type==='err'?' err':''); t.textContent = msg;
  wrap.appendChild(t); setTimeout(()=>{ t.style.opacity='0'; t.style.transition='opacity .3s'; setTimeout(()=>t.remove(),320); }, 2600);
}

/* ---------------- caption helper icons (inline SVG) ---------------- */
const ICON = {
  dash:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>',
  list:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="3.5" cy="6" r="1"/><circle cx="3.5" cy="12" r="1"/><circle cx="3.5" cy="18" r="1"/></svg>',
  plus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  users:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  gear:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  home:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
  out:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>'
};

/* ============================================================
   AUTH
   ============================================================ */
let pending = null; // {user, otp} during login

function renderAuth(){
  const app = $('#appScreen'); if (app) app.classList.add('hidden');
  const auth = $('#authScreen'); auth.classList.remove('hidden');
  if (!DB.users().some(u=>u.role==='super')) { renderSetup(); return; }
  if (!currentUser()) { renderLogin(); return; }
  enterApp();
}

function renderSetup(){
  $('#authScreen').innerHTML = `
  <div class="auth-wrap"><div class="auth-card">
    <div class="auth-brand"><span class="crest">M</span><div><div class="t">${esc(CFG.ORG_NAME||'Masjid e Mohammadi')}</div><div class="s">${esc(CFG.ORG_SUB||'Masjid Kidmat Committee')}</div></div></div>
    <h1>First-time setup</h1>
    <p class="lead">Create the <b>Super Admin</b> account. Iske baad login screen khulegi.</p>
    <form id="setupForm">
      <div class="field"><label>Full name</label><input class="inp" name="name" required placeholder="e.g. Abdul Rahman" /></div>
      <div class="grid g2">
        <div class="field"><label>Mobile number</label><input class="inp" name="phone" inputmode="numeric" placeholder="10-digit number" /></div>
        <div class="field"><label>Login ID</label><input class="inp" name="id" required placeholder="e.g. admin" /></div>
      </div>
      <div class="grid g2">
        <div class="field"><label>Password</label><input class="inp" name="pass" type="password" required minlength="4" placeholder="min 4 characters" /></div>
        <div class="field"><label>Confirm password</label><input class="inp" name="pass2" type="password" required minlength="4" /></div>
      </div>
      <div id="setupAlert"></div>
      <button class="btn block" type="submit">Create Super Admin</button>
    </form>
  </div></div>`;
  $('#setupForm').addEventListener('submit', async (e)=>{
    e.preventDefault();
    const E = e.target.elements;
    const name=E.name.value.trim(), phone=E.phone.value.trim(), id=E.id.value.trim().toLowerCase(), pass=E.pass.value, pass2=E.pass2.value;
    const alertBox = $('#setupAlert');
    if (pass !== pass2){ alertBox.innerHTML = '<div class="alert err">Passwords do not match.</div>'; return; }
    if (DB.users().some(u=>u.id===id)){ alertBox.innerHTML = '<div class="alert err">That ID is already taken.</div>'; return; }
    const salt = uid();
    const user = { id, role:'super', name:name||id, phone, salt, passHash: await hashPass(pass, salt), createdAt: Date.now() };
    const users = DB.users(); users.push(user); DB.setUsers(users);
    toast('Super Admin created — please log in');
    renderLogin();
  });
}

function renderLogin(){
  $('#authScreen').innerHTML = `
  <div class="auth-wrap"><div class="auth-card">
    <div class="auth-brand"><span class="crest">M</span><div><div class="t">${esc(CFG.ORG_NAME||'Masjid e Mohammadi')}</div><div class="s">${esc(CFG.ORG_SUB||'Masjid Kidmat Committee')}</div></div></div>
    <h1>Sign in</h1>
    <p class="lead">Apna login ID aur password daaliye.</p>
    <div class="role-tabs" id="roleTabs">
      <button data-role="super" class="active">Super Admin</button>
      <button data-role="admin">Admin</button>
      <button data-role="family">Family</button>
    </div>
    <form id="loginForm">
      <div class="field"><label>Login ID</label><input class="inp" name="id" required autocomplete="username" placeholder="ID / Family ID" /></div>
      <div class="field"><label>Password</label><input class="inp" name="pass" type="password" required autocomplete="current-password" /></div>
      <div class="field"><label>Captcha — answer the sum</label>
        <div class="captcha-box"><div class="captcha-q" id="captchaQ"></div><button type="button" class="icon-btn" id="captchaReload" aria-label="New captcha">↻</button></div>
        <input class="inp" name="captcha" inputmode="numeric" required placeholder="Answer" style="margin-top:6px" />
      </div>
      <div id="loginAlert"></div>
      <button class="btn block" type="submit">Continue</button>
    </form>
  </div></div>`;

  let role = 'super', capA = 0, capB = 0;
  const newCaptcha = ()=>{ capA = 2+Math.floor(Math.random()*8); capB = 1+Math.floor(Math.random()*8); $('#captchaQ').textContent = capA + ' + ' + capB + ' = ?'; };
  newCaptcha();
  $('#captchaReload').addEventListener('click', newCaptcha);
  $('#roleTabs').addEventListener('click', (e)=>{ const b=e.target.closest('button'); if(!b) return; $$('#roleTabs button').forEach(x=>x.classList.remove('active')); b.classList.add('active'); role=b.dataset.role; });

  $('#loginForm').addEventListener('submit', async (e)=>{
    e.preventDefault();
    const f=e.target, E=f.elements, alertBox=$('#loginAlert');
    const id=E.id.value.trim().toLowerCase(), pass=E.pass.value, cap=parseInt(E.captcha.value,10);
    if (cap !== capA + capB){ alertBox.innerHTML='<div class="alert err">Captcha answer is wrong.</div>'; newCaptcha(); E.captcha.value=''; return; }
    const user = DB.users().find(u=>u.id===id);
    if (!user){ alertBox.innerHTML='<div class="alert err">No account with that ID.</div>'; newCaptcha(); return; }
    if (user.role !== role){ alertBox.innerHTML=`<div class="alert err">This is not a ${ROLE_LABEL[role]} account.</div>`; newCaptcha(); return; }
    const h = await hashPass(pass, user.salt);
    if (h !== user.passHash){ alertBox.innerHTML='<div class="alert err">Incorrect password.</div>'; newCaptcha(); return; }
    // demo OTP step
    pending = { user, otp: String(100000 + Math.floor(Math.random()*900000)) };
    renderOtp();
  });
}

function renderOtp(){
  $('#authScreen').innerHTML = `
  <div class="auth-wrap"><div class="auth-card">
    <div class="auth-brand"><span class="crest">M</span><div><div class="t">${esc(CFG.ORG_NAME||'Masjid e Mohammadi')}</div><div class="s">${esc(CFG.ORG_SUB||'Masjid Kidmat Committee')}</div></div></div>
    <h1>Verify mobile OTP</h1>
    <p class="lead">A 6-digit code was sent to <b>${esc(pending.user.phone||'your mobile')}</b>.</p>
    <div class="alert info">Demo mode — SMS is not connected yet. Your code is: <span class="otp-badge">${pending.otp}</span></div>
    <form id="otpForm" style="margin-top:14px">
      <div class="field"><label>Enter OTP</label><input class="inp" name="otp" inputmode="numeric" maxlength="6" required placeholder="6-digit code" style="letter-spacing:.3em;text-align:center;font-size:1.2rem" /></div>
      <div id="otpAlert"></div>
      <button class="btn block" type="submit">Verify &amp; Sign in</button>
      <button class="btn ghost block" type="button" id="otpBack">Back</button>
    </form>
  </div></div>`;
  $('#otpBack').addEventListener('click', ()=>{ pending=null; renderLogin(); });
  $('#otpForm').addEventListener('submit', (e)=>{
    e.preventDefault();
    if (e.target.elements.otp.value.trim() !== pending.otp){ $('#otpAlert').innerHTML='<div class="alert err">Wrong OTP. Try again.</div>'; return; }
    const u = pending.user; pending=null;
    setSession({ userId:u.id });
    enterApp();
  });
}

/* ============================================================
   APP SHELL
   ============================================================ */
const state = { view:'dashboard', param:null, draft:null };

function enterApp(){
  $('#authScreen').classList.add('hidden');
  $('#appScreen').classList.remove('hidden');
  renderShell();
  go('dashboard');
}

function navItems(){
  const u = currentUser(); if(!u) return [];
  if (u.role==='family') return [ ['myfamily','My Family',ICON.home], ['settings','Settings',ICON.gear] ];
  const items = [ ['dashboard','Dashboard',ICON.dash], ['families','Families',ICON.list], ['add','Add Family',ICON.plus] ];
  if (u.role==='super') items.push(['users','Users',ICON.users]);
  items.push(['settings','Settings',ICON.gear]);
  return items;
}

function renderShell(){
  const u = currentUser();
  $('#nav').innerHTML = navItems().map(([v,label,ic])=>`<a class="nav-item" data-act="goto" data-view="${v}">${ic}<span>${label}</span></a>`).join('');
  const initials = (u.name||u.id).split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();
  $('#userChip').innerHTML = `<span class="av">${esc(initials)}</span><span><span class="nm">${esc(u.name||u.id)}</span><br><span class="rl">${ROLE_LABEL[u.role]}</span></span>`;
  $('#userChip').setAttribute('data-act','logout');
  $('#userChip').title = 'Click to sign out';
  $$('#nav .nav-item').forEach(a=>a.classList.toggle('active', a.dataset.view===state.view || (state.view==='add' && a.dataset.view==='add')));
  closeNav();
}

function go(view, param){
  const u = currentUser(); if(!u){ renderAuth(); return; }
  if (u.role==='family' && !['myfamily','settings'].includes(view)) view='myfamily';
  state.view = view; state.param = param||null;
  closeNav();
  const titles = { dashboard:'Dashboard', families:'Families', add:(state.param?'Edit Family':'Add Family'), detail:'Family Record', users:'Users', settings:'Settings', myfamily:'My Family' };
  $('#pageTitle').textContent = titles[view] || 'Dashboard';
  let html='';
  if (view==='dashboard') html = viewDashboard();
  else if (view==='families') html = viewFamilies();
  else if (view==='add') html = viewFamilyForm();
  else if (view==='detail') html = viewFamilyDetail(state.param);
  else if (view==='users') html = viewUsers();
  else if (view==='settings') html = viewSettings();
  else if (view==='myfamily') html = viewMyFamily();
  $('#content').innerHTML = html;
  $$('#nav .nav-item').forEach(a=>a.classList.toggle('active', a.dataset.view===view || (view==='detail'&&a.dataset.view==='families')||(view==='add'&&a.dataset.view==='add')));
  afterRender(view);
}

function closeNav(){ const s=$('#sidebar'), sc=$('#scrimNav'); if(s) s.classList.remove('open'); if(sc) sc.classList.remove('show'); }

/* ============================================================
   DASHBOARD
   ============================================================ */
function computeStats(){
  const fams = DB.families();
  let men=0,women=0,children=0,married=0,unmarried=0,widow=0,disability=0,scheme=0;
  fams.forEach(f => (f.members||[]).forEach(m=>{
    const g=(m.gender||'').toLowerCase();
    if (g==='male') men++; else if (g==='female') women++;
    const a = ageFromDob(m.dob);
    if (a!==null && a<18) children++;
    const ms=(m.maritalStatus||'').toLowerCase();
    if (ms==='married') married++; else if (ms==='unmarried'||ms==='') unmarried++;
    if (ms==='widow'||ms==='widower') widow++;
    if (m.disability==='yes') disability++;
    if (m.govtScheme==='yes') scheme++;
  }));
  return { houses:fams.length, men, women, children, married, unmarried, widow, disability, scheme };
}

function statCard(icon, num, label){
  return `<div class="stat"><div class="ic">${icon}</div><div class="n">${num}</div><div class="l">${label}</div></div>`;
}
function icSmall(path){ return `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`; }

function viewDashboard(){
  const s = computeStats();
  const u = currentUser();
  const cards = [
    [icSmall('<path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/>'), s.houses, 'Total Houses'],
    [icSmall('<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 12 0v1"/>'), s.men, 'Men'],
    [icSmall('<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 12 0v1"/><path d="M18 8a3 3 0 0 1 0 6"/>'), s.women, 'Women'],
    [icSmall('<circle cx="12" cy="8" r="3"/><path d="M9 21v-2a3 3 0 0 1 6 0v2"/>'), s.children, 'Children'],
    [icSmall('<path d="M20.8 6.6a5 5 0 0 0-7.1 0L12 8.3l-1.7-1.7a5 5 0 1 0-7.1 7.1L12 22l8.8-8.3a5 5 0 0 0 0-7.1z"/>'), s.married, 'Married'],
    [icSmall('<circle cx="12" cy="7" r="4"/><path d="M5 21a7 7 0 0 1 14 0"/>'), s.unmarried, 'Unmarried'],
    [icSmall('<circle cx="12" cy="7" r="4"/><path d="M5 21a7 7 0 0 1 14 0"/><line x1="12" y1="11" x2="12" y2="20"/>'), s.widow, 'Widow'],
    [icSmall('<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>'), s.disability, 'Disability'],
    [icSmall('<path d="M20 7 9 18l-5-5"/>'), s.scheme, 'Govt. Scheme']
  ];
  const fams = DB.families().slice(-5).reverse();
  const recent = fams.length ? `<div class="sec-title">Recently added</div>
    <div class="table-wrap"><table><thead><tr><th>Family ID</th><th>House</th><th>Members</th><th>Phone</th></tr></thead><tbody>
    ${fams.map(f=>`<tr data-act="view-family" data-id="${esc(f.id)}"><td><span class="mono">${esc(f.id)}</span></td><td>${esc(f.houseName||'—')}</td><td>${(f.members||[]).length}</td><td>${esc(f.phone||'—')}</td></tr>`).join('')}
    </tbody></table></div>` : '';
  const empty = s.houses ? '' : `<div class="empty"><div class="big">🕌</div><h3>No families yet</h3><p>Add the first family to see the dashboard fill up.</p>
     <div style="margin-top:16px;display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
     ${u.role!=='family' ? '<button class="btn" data-act="goto" data-view="add">Add first family</button>' : ''}
     <button class="btn ghost" data-act="load-sample">Load sample data</button></div></div>`;
  return `
    <div class="page-head"><div><h1>Dashboard</h1><p>Live totals across all mohalla families.</p></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn ghost sm" data-act="export-excel">⭳ Excel</button>
        <button class="btn ghost sm" data-act="print-all">⎙ PDF / Print</button>
      </div></div>
    <div class="stat-grid">${cards.map(c=>statCard(c[0],c[1],c[2])).join('')}</div>
    ${empty}${recent}`;
}

/* ============================================================
   FAMILIES LIST
   ============================================================ */
function viewFamilies(){
  const fams = DB.families();
  if (!fams.length) return emptyFamilies();
  return `
    <div class="page-head"><div><h1>Families</h1><p>${fams.length} families on record.</p></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn ghost sm" data-act="export-excel">⭳ Excel</button><button class="btn ghost sm" data-act="print-all">⎙ PDF</button><button class="btn sm" data-act="goto" data-view="add">+ Add Family</button></div></div>
    <div class="toolbar">
      <input class="inp grow" id="famSearch" placeholder="Search name, Family ID, phone, address…" />
      <select class="inp" id="famGenderF" style="max-width:170px"><option value="">All genders</option>${GENDERS.map(g=>`<option>${g}</option>`).join('')}</select>
      <select class="inp" id="famMaritalF" style="max-width:190px"><option value="">All marital status</option>${MARITAL.map(m=>`<option>${m}</option>`).join('')}</select>
    </div>
    <div id="famListWrap"></div>`;
}
function emptyFamilies(){
  return `<div class="page-head"><div><h1>Families</h1><p>No families on record yet.</p></div></div>
    <div class="card"><div class="empty"><div class="big">📋</div><h3>Start the register</h3><p>Add your first family, or load sample data to explore.</p>
      <div style="margin-top:16px;display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
      <button class="btn" data-act="goto" data-view="add">+ Add Family</button>
      <button class="btn ghost" data-act="load-sample">Load sample data</button></div></div></div>`;
}
function familyMatches(f, q, g, ms){
  q = (q||'').toLowerCase();
  const hay = [f.id, f.houseName, f.phone, f.address, f.houseNo].join(' ').toLowerCase()
    + ' ' + (f.members||[]).map(m=>[m.name,m.fatherName,m.motherName].join(' ')).join(' ').toLowerCase();
  if (q && !hay.includes(q)) return false;
  if (g && !(f.members||[]).some(m=>(m.gender||'')===g)) return false;
  if (ms && !(f.members||[]).some(m=>(m.maritalStatus||'')===ms)) return false;
  return true;
}
function renderFamilyList(){
  const wrap = $('#famListWrap'); if(!wrap) return;
  const q = ($('#famSearch')||{}).value||'', g=($('#famGenderF')||{}).value||'', ms=($('#famMaritalF')||{}).value||'';
  const u = currentUser();
  const rows = DB.families().filter(f=>familyMatches(f,q,g,ms)).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
  if (!rows.length){ wrap.innerHTML = `<div class="card"><div class="empty"><h3>No matching families</h3><p>Try a different search or filter.</p></div></div>`; return; }
  wrap.innerHTML = `<div class="table-wrap"><table><thead><tr><th>Family ID</th><th>House</th><th>Members</th><th>Phone</th><th>Address</th><th></th></tr></thead><tbody>
    ${rows.map(f=>`<tr>
      <td><span class="mono">${esc(f.id)}</span></td>
      <td>${esc(f.houseName||'—')}</td>
      <td>${(f.members||[]).length}</td>
      <td>${esc(f.phone||'—')}</td>
      <td class="muted">${esc((f.address||'—').slice(0,34))}${(f.address||'').length>34?'…':''}</td>
      <td style="white-space:nowrap">
        <button class="btn ghost sm" data-act="view-family" data-id="${esc(f.id)}">View</button>
        <button class="btn ghost sm" data-act="edit-family" data-id="${esc(f.id)}">Edit</button>
        <button class="btn ghost sm" data-act="del-family" data-id="${esc(f.id)}" style="color:var(--danger)">Del</button>
      </td></tr>`).join('')}
    </tbody></table></div>`;
}

/* ============================================================
   FAMILY FORM
   ============================================================ */
function blankMember(){ return { relation:'', name:'', fatherName:'', motherName:'', gender:'Male', dob:'', education:'', maritalStatus:'Unmarried', children:'', disability:'no', govtScheme:'no' }; }
function blankDraft(){
  return { id:null, houseName:'', houseNo:'', address:'', phone:'', notes:'',
    members:[ blankMember() ],
    docs: Object.fromEntries(DOC_TYPES.map(d=>[d[0],'no'])),
    custom: Array.from({length:CUSTOM_DOCS}, ()=>({label:'', value:'no'})) };
}

function viewFamilyForm(){
  if (!state.draft) state.draft = blankDraft();
  const d = state.draft;
  const editing = !!d.id;
  return `
    <div class="page-head"><div><h1>${editing?'Edit Family':'Add Family'}</h1><p>${editing?'Update the household record.':'Fill the household details, then add each member.'}</p></div>
      <button class="btn ghost sm" data-act="goto" data-view="families">← Back</button></div>
    <form id="famForm">
      <div class="card">
        <div class="sec-title" style="margin-top:0">Household details</div>
        <div class="grid g2">
          <div class="field"><label>Family / House name *</label><input class="inp" data-field="houseName" value="${esc(d.houseName)}" placeholder="e.g. Abdul Rahman" /></div>
          <div class="field"><label>House number</label><input class="inp" data-field="houseNo" value="${esc(d.houseNo)}" placeholder="e.g. 12-B" /></div>
        </div>
        <div class="grid g2" style="margin-top:12px">
          <div class="field"><label>Phone number</label><input class="inp" data-field="phone" inputmode="numeric" value="${esc(d.phone)}" placeholder="10-digit mobile" /></div>
          <div class="field"><label>Address</label><input class="inp" data-field="address" value="${esc(d.address)}" placeholder="Street / mohalla" /></div>
        </div>
        <div class="field" style="margin-top:12px"><label>Notes (optional)</label><textarea class="inp" data-field="notes" placeholder="Any remark about this household">${esc(d.notes)}</textarea></div>
      </div>

      <div class="sec-title">Members</div>
      <div id="membersWrap"></div>
      <button type="button" class="btn ghost sm" data-act="add-member">+ Add member</button>

      <div class="sec-title">Documents held</div>
      <div class="card">
        <p class="muted small" style="margin-bottom:12px">Mark Yes / No for each document. Add your own fields in the empty boxes below.</p>
        <div class="doc-grid">
          ${DOC_TYPES.map(([k,label])=>docRow(label, d.docs[k], k, null)).join('')}
          ${d.custom.map((c,i)=>`
            <div class="doc-row custom">
              <input data-field="customLabel" data-ci="${i}" value="${esc(c.label)}" placeholder="Custom document ${i+1}" />
              ${segHTML(c.value, 'custom:'+i)}
            </div>`).join('')}
        </div>
      </div>

      <div id="formAlert" style="margin-top:14px"></div>
      <div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap">
        <button class="btn" type="submit">${editing?'Save changes':'Save & generate Family ID'}</button>
        <button class="btn ghost" type="button" data-act="goto" data-view="families">Cancel</button>
      </div>
    </form>`;
}
function segHTML(value, key){
  return `<div class="seg" data-doc="${key}">
    <button type="button" data-v="yes" class="${value==='yes'?'on':''}">Yes</button>
    <button type="button" data-v="no" class="${value!=='yes'?'on':''}">No</button></div>`;
}
function docRow(label, value, key, _x){
  return `<div class="doc-row"><span class="nm">${esc(label)}</span>${segHTML(value,key)}</div>`;
}
function renderMembers(){
  const wrap = $('#membersWrap'); if(!wrap) return;
  wrap.innerHTML = state.draft.members.map((m,i)=>`
    <div class="member-card">
      <div class="member-head">
        <span class="idx">Member ${i+1}</span>
        ${state.draft.members.length>1 ? `<button type="button" class="btn ghost sm" data-act="remove-member" data-idx="${i}" style="color:var(--danger)">Remove</button>` : ''}
      </div>
      <div class="member-grid">
        <div class="field"><label>Full name *</label><input class="inp" data-field="m.name" data-idx="${i}" value="${esc(m.name)}" /></div>
        <div class="field"><label>Relation to head</label><input class="inp" data-field="m.relation" data-idx="${i}" value="${esc(m.relation)}" placeholder="Self / Wife / Son…" /></div>
        <div class="field"><label>Gender</label><select class="inp" data-field="m.gender" data-idx="${i}">${GENDERS.map(g=>`<option ${m.gender===g?'selected':''}>${g}</option>`).join('')}</select></div>
        <div class="field"><label>Date of birth</label><input class="inp" type="date" data-field="m.dob" data-idx="${i}" value="${esc(m.dob)}" /></div>
        <div class="field"><label>Education</label><input class="inp" data-field="m.education" data-idx="${i}" value="${esc(m.education)}" placeholder="e.g. 10th / Graduate" /></div>
        <div class="field"><label>Marital status</label><select class="inp" data-field="m.maritalStatus" data-idx="${i}">${MARITAL.map(x=>`<option ${m.maritalStatus===x?'selected':''}>${x}</option>`).join('')}</select></div>
        <div class="field"><label>Number of children</label><input class="inp" inputmode="numeric" data-field="m.children" data-idx="${i}" value="${esc(m.children)}" /></div>
        <div class="field"><label>Father name</label><input class="inp" data-field="m.fatherName" data-idx="${i}" value="${esc(m.fatherName)}" /></div>
        <div class="field"><label>Mother name</label><input class="inp" data-field="m.motherName" data-idx="${i}" value="${esc(m.motherName)}" /></div>
        <div class="field"><label>Disability</label><div class="field-yn">${segYN('m.disability', i, m.disability)}</div></div>
        <div class="field"><label>Govt. scheme</label><div class="field-yn">${segYN('m.govtScheme', i, m.govtScheme)}</div></div>
      </div>
    </div>`).join('');
}
function segYN(field, idx, value){
  return `<div class="seg" data-mfield="${field}" data-idx="${idx}">
    <button type="button" data-v="yes" class="${value==='yes'?'on':''}">Yes</button>
    <button type="button" data-v="no" class="${value!=='yes'?'on':''}">No</button></div>`;
}

/* ============================================================
   FAMILY DETAIL
   ============================================================ */
function viewFamilyDetail(id){
  const f = DB.families().find(x=>x.id===id);
  if (!f) return `<div class="empty"><h3>Family not found</h3><p>It may have been deleted.</p><button class="btn ghost" data-act="goto" data-view="families" style="margin-top:14px">← Back</button></div>`;
  const u = currentUser();
  const canEdit = u.role!=='family';
  const docsYes = DOC_TYPES.filter(([k])=>f.docs && f.docs[k]==='yes').map(([,l])=>l);
  const customYes = (f.custom||[]).filter(c=>c.label && c.value==='yes').map(c=>c.label);
  return `
    <div class="page-head"><div><h1>${esc(f.houseName||'Family')}</h1><p>Created ${fmtDate(f.createdAt ? new Date(f.createdAt).toISOString() : '')} · ${(f.members||[]).length} member(s)</p></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn ghost sm" data-act="print-family" data-id="${esc(f.id)}">⎙ PDF</button>
        <button class="btn ghost sm" data-act="goto" data-view="families">← Back</button>
        ${canEdit?`<button class="btn sm" data-act="edit-family" data-id="${esc(f.id)}">Edit</button>`:''}
      </div></div>

    <div class="card" style="display:flex;justify-content:space-between;gap:24px;flex-wrap:wrap">
      <div class="qr-panel">
        <div class="qr-box" id="qrBox"></div>
        <div><div class="muted small">FAMILY ID</div><div class="fid">${esc(f.id)}</div>
        <div class="muted small" style="margin-top:6px">Scan to view this family's record</div></div>
      </div>
      <div style="min-width:220px">
        <div class="kv">
          <div class="row"><span>House no.</span><span>${esc(f.houseNo||'—')}</span></div>
          <div class="row"><span>Phone</span><span>${esc(f.phone||'—')}</span></div>
          <div class="row"><span>Address</span><span>${esc(f.address||'—')}</span></div>
          <div class="row"><span>Total members</span><span>${(f.members||[]).length}</span></div>
        </div>
      </div>
    </div>

    <div class="sec-title">Members</div>
    <div class="table-wrap"><table><thead><tr><th>#</th><th>Name</th><th>Relation</th><th>Gender</th><th>Age</th><th>Education</th><th>Marital</th><th>Children</th><th>Disability</th><th>Scheme</th></tr></thead><tbody>
      ${(f.members||[]).map((m,i)=>{ const a=ageFromDob(m.dob); return `<tr>
        <td>${i+1}</td><td>${esc(m.name||'—')}</td><td>${esc(m.relation||'—')}</td><td>${esc(m.gender||'—')}</td>
        <td>${a===null?'—':a}</td><td>${esc(m.education||'—')}</td><td>${esc(m.maritalStatus||'—')}</td><td>${esc(m.children||'0')}</td>
        <td>${m.disability==='yes'?'Yes':'No'}</td><td>${m.govtScheme==='yes'?'Yes':'No'}</td></tr>`; }).join('')}
    </tbody></table></div>

    <div class="sec-title">Documents held</div>
    <div class="card">
      <div style="display:flex;flex-wrap:wrap;gap:8px">
        ${[].concat(docsYes, customYes).length ? [].concat(docsYes,customYes).map(x=>`<span class="badge">✔ ${esc(x)}</span>`).join('') : '<span class="muted">No documents marked.</span>'}
      </div>
    </div>
    ${f.notes?`<div class="sec-title">Notes</div><div class="card">${esc(f.notes)}</div>`:''}`;
}

/* ============================================================
   USERS (super admin)
   ============================================================ */
function viewUsers(){
  const u = currentUser();
  if (u.role!=='super') return `<div class="empty"><h3>Admins only</h3><p>Only the Super Admin can manage logins.</p></div>`;
  const users = DB.users();
  const fams = DB.families();
  return `
    <div class="page-head"><div><h1>Users</h1><p>Create admin logins and family view-only logins.</p></div></div>

    <div class="card">
      <div class="sec-title" style="margin-top:0">Add an Admin</div>
      <form id="addAdminForm" class="grid g3">
        <div class="field"><label>Name</label><input class="inp" name="name" required /></div>
        <div class="field"><label>Login ID</label><input class="inp" name="id" required /></div>
        <div class="field"><label>Mobile</label><input class="inp" name="phone" inputmode="numeric" /></div>
        <div class="field"><label>Password</label><input class="inp" name="pass" type="password" required minlength="4" /></div>
        <div class="field" style="justify-content:flex-end"><button class="btn" type="submit">Add Admin</button></div>
      </form>
    </div>

    <div class="card" style="margin-top:16px">
      <div class="sec-title" style="margin-top:0">Create a Family login</div>
      <p class="muted small" style="margin-bottom:12px">Family login ID = the Family ID. The member can only view their own record.</p>
      <form id="addFamForm" class="grid g3">
        <div class="field"><label>Family</label><select class="inp" name="familyId" required>
          <option value="">Select family…</option>${fams.map(f=>`<option value="${esc(f.id)}">${esc(f.id)} — ${esc(f.houseName||'')}</option>`).join('')}</select></div>
        <div class="field"><label>Password</label><input class="inp" name="pass" type="password" required minlength="4" /></div>
        <div class="field" style="justify-content:flex-end"><button class="btn" type="submit">Create Family Login</button></div>
      </form>
    </div>

    <div class="sec-title">All logins</div>
    <div class="table-wrap"><table><thead><tr><th>Login ID</th><th>Name</th><th>Role</th><th>Linked Family</th><th></th></tr></thead><tbody>
      ${users.map(x=>`<tr>
        <td><span class="mono">${esc(x.id)}</span></td><td>${esc(x.name||'—')}</td>
        <td><span class="badge ${x.role==='super'?'':'gray'}">${ROLE_LABEL[x.role]}</span></td>
        <td>${esc(x.familyId||'—')}</td>
        <td>${x.role==='super'?'':`<button class="btn ghost sm" data-act="del-user" data-id="${esc(x.id)}" style="color:var(--danger)">Delete</button>`}</td>
      </tr>`).join('')}
    </tbody></table></div>`;
}

/* ============================================================
   SETTINGS
   ============================================================ */
function viewSettings(){
  const u = currentUser();
  const cloudOn = !!(CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY);
  return `
    <div class="page-head"><div><h1>Settings</h1><p>Appearance, data and account.</p></div></div>

    <div class="card">
      <div class="sec-title" style="margin-top:0">Appearance</div>
      <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">
        <button class="toggle" data-act="toggle-theme" id="themeBtn2">☀ Day / ☾ Night</button>
        <span class="muted small">Emerald Lattice theme · day &amp; night.</span>
      </div>
    </div>

    ${u.role==='family'?'':`<div class="card" style="margin-top:16px">
      <div class="sec-title" style="margin-top:0">Data &amp; backup</div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn ghost sm" data-act="export-excel">⭳ Export Excel (.xlsx)</button>
        <button class="btn ghost sm" data-act="print-all">⎙ Export PDF / Print</button>
        <button class="btn ghost sm" data-act="backup-json">⭳ Backup (JSON)</button>
        <button class="btn ghost sm" data-act="load-sample">Load sample data</button>
      </div>
    </div>`}

    <div class="card" style="margin-top:16px">
      <div class="sec-title" style="margin-top:0">Cloud sync (Supabase)</div>
      <p class="muted small">Status: <b style="color:${cloudOn?'var(--ok)':'var(--warn)'}">${cloudOn?'Connected':'Not connected — running on this device'}</b></p>
      ${cloudOn?'':'<p class="muted small" style="margin-top:8px">Add your Supabase Project URL + anon key in <span class="mono">config.js</span> and run <span class="mono">supabase/schema.sql</span> to switch to shared cloud storage.</p>'}
    </div>

    <div class="card" style="margin-top:16px">
      <div class="sec-title" style="margin-top:0">Account</div>
      <div class="kv"><div class="row"><span>Name</span><span>${esc(u.name||u.id)}</span></div>
        <div class="row"><span>Login ID</span><span>${esc(u.id)}</span></div>
        <div class="row"><span>Role</span><span>${ROLE_LABEL[u.role]}</span></div>
        <div class="row"><span>Mobile</span><span>${esc(u.phone||'—')}</span></div></div>
      <button class="btn danger sm" data-act="logout" style="margin-top:16px">Sign out</button>
    </div>

    ${u.role==='super'?`<div class="card" style="margin-top:16px;border-color:var(--danger-brd)">
      <div class="sec-title" style="margin-top:0;color:var(--danger)">Danger zone</div>
      <p class="muted small" style="margin-bottom:12px">Deletes all family records on this device. Logins are kept.</p>
      <button class="btn danger sm" data-act="clear-data">Erase all family records</button>
    </div>`:''}`;
}

/* ============================================================
   MY FAMILY (family role)
   ============================================================ */
function viewMyFamily(){
  const u = currentUser();
  const f = DB.families().find(x=>x.id===u.familyId);
  if (!f) return `<div class="empty"><h3>No record linked</h3><p>Your login is not linked to a family record yet. Please contact the committee.</p></div>`;
  return viewFamilyDetail(f.id);
}

/* ============================================================
   ACTIONS (event delegation)
   ============================================================ */
document.addEventListener('click', (e)=>{
  const el = e.target.closest('[data-act]'); if(!el) return;
  const act = el.dataset.act;
  const id = el.dataset.id;

  if (act==='toggle-theme') { toggleTheme(); const b=$('#themeBtn2'); if(b) b.textContent = document.documentElement.getAttribute('data-theme')==='night'?'☾ Night':'☀ Day'; return; }
  if (act==='goto'){ if (el.dataset.view==='add') state.draft=blankDraft(); go(el.dataset.view); return; }
  if (act==='logout'){ clearSession(); state.draft=null; renderAuth(); return; }
  if (act==='load-sample'){ loadSample(); enterApp(); go('dashboard'); toast('Sample data loaded'); return; }
  if (act==='clear-data'){ if(confirm('Erase ALL family records on this device? This cannot be undone.')){ DB.setFamilies([]); DB.setSeq(0); toast('All family records erased'); go('dashboard'); } return; }
  if (act==='export-excel'){ exportExcel(); return; }
  if (act==='print-all'){ printFamilies(DB.families(), 'All Families'); return; }
  if (act==='print-family'){ const f=DB.families().find(x=>x.id===id); if(f) printFamilies([f], f.houseName||f.id); return; }
  if (act==='backup-json'){ backupJSON(); return; }
  if (act==='view-family'){ go('detail', id); return; }
  if (act==='edit-family'){ const f=DB.families().find(x=>x.id===id); if(f){ state.draft = JSON.parse(JSON.stringify(f)); state.draft.docs = Object.assign(Object.fromEntries(DOC_TYPES.map(d=>[d[0],'no'])), state.draft.docs||{}); state.draft.custom = padCustom(state.draft.custom); go('add', id); } return; }
  if (act==='del-family'){ if(confirm('Delete this family record permanently?')){ DB.setFamilies(DB.families().filter(f=>f.id!==id)); toast('Family deleted'); go('families'); } return; }
  if (act==='del-user'){ if(confirm('Delete this login?')){ DB.setUsers(DB.users().filter(u=>u.id!==id)); toast('Login deleted'); go('users'); } return; }
  if (act==='add-member'){ state.draft.members.push(blankMember()); renderMembers(); return; }
  if (act==='remove-member'){ state.draft.members.splice(+el.dataset.idx,1); renderMembers(); return; }
});

// document yes/no + member inline updates
document.addEventListener('click', (e)=>{
  const seg = e.target.closest('.seg'); if(!seg || !state.draft) return;
  const btn = e.target.closest('button[data-v]'); if(!btn) return;
  const v = btn.dataset.v;
  if (seg.dataset.doc){
    const key = seg.dataset.doc;
    if (key.startsWith('custom:')){ const i = +key.split(':')[1]; state.draft.custom[i].value = v; }
    else state.draft.docs[key] = v;
  } else if (seg.dataset.mfield){
    const i = +seg.dataset.idx; state.draft.members[i][seg.dataset.mfield.replace('m.','')] = v;
  }
  $$('button', seg).forEach(b=>b.classList.toggle('on', b.dataset.v===v));
});

// text/select inputs update the draft
function applyField(el){
  if(!state.draft || !el || !el.dataset || !el.dataset.field) return;
  const f = el.dataset.field;
  if (f==='customLabel'){ state.draft.custom[+el.dataset.ci].label = el.value; return; }
  if (f.startsWith('m.')){ const i = +el.dataset.idx; state.draft.members[i][f.slice(2)] = el.value; return; }
  state.draft[f] = el.value;
}
document.addEventListener('input', (e)=>{ const el=e.target; if(el.dataset&&el.dataset.field){ applyField(el); return; } if(el.id==='famSearch') renderFamilyList(); });
document.addEventListener('change', (e)=>{ const el=e.target; if(el.dataset&&el.dataset.field){ applyField(el); return; } if(el.id==='famGenderF'||el.id==='famMaritalF') renderFamilyList(); });

// form submissions
document.addEventListener('submit', async (e)=>{
  const form = e.target;
  if (form.id==='famForm'){ e.preventDefault(); saveFamily(); }
  else if (form.id==='addAdminForm'){ e.preventDefault(); await addAdmin(form); }
  else if (form.id==='addFamForm'){ e.preventDefault(); await addFamilyLogin(form); }
});

// hamburger
document.addEventListener('DOMContentLoaded', ()=>{
  const b=$('#burger'); if(b) b.addEventListener('click', ()=>{ $('#sidebar').classList.add('open'); $('#scrimNav').classList.add('show'); });
  const sc=$('#scrimNav'); if(sc) sc.addEventListener('click', closeNav);
  const tb=$('#themeBtn'); if(tb) tb.addEventListener('click', toggleTheme);
});

/* ---------------- render side-effects ---------------- */
function afterRender(view){
  if (view==='add' && state.draft){ renderMembers(); }
  if (view==='detail' || view==='myfamily'){ const id = (view==='detail')?state.param:currentUser().familyId; const f=DB.families().find(x=>x.id===id); const box=$('#qrBox'); if(f&&box) renderQR(box, f.id + ' | ' + (f.houseName||'')); }
  if (view==='families'){ renderFamilyList(); }
  const tb=$('#themeBtn2'); if(tb) tb.textContent = document.documentElement.getAttribute('data-theme')==='night'?'☾ Night':'☀ Day';
}

/* ---------------- QR ---------------- */
function renderQR(el, text){
  el.innerHTML='';
  try{
    if (typeof qrcode === 'function'){
      const qr = qrcode(0,'M'); qr.addData(text); qr.make();
      el.innerHTML = qr.createSvgTag({cellSize:4, margin:1, scalable:true});
      return;
    }
  }catch(err){ /* fall through */ }
  el.innerHTML = '<div style="font-size:.62rem;color:#555;padding:6px;word-break:break-all">QR unavailable offline<br>'+esc(text)+'</div>';
}

/* ============================================================
   SAVE FAMILY
   ============================================================ */
async function saveFamily(){
  const d = state.draft, u = currentUser();
  const alertBox = $('#formAlert');
  const fail = (msg)=>{ if(alertBox) alertBox.innerHTML='<div class="alert err">'+esc(msg)+'</div>'; window.scrollTo({top:0,behavior:'smooth'}); };
  if (!d.houseName.trim()) return fail('Family / House name is required.');
  const members = d.members.filter(m=> (m.name||'').trim());
  if (!members.length) return fail('Add at least one member with a name.');
  if (d.phone && !/^[0-9+\-\s]{6,15}$/.test(d.phone)) return fail('Phone number looks invalid.');

  d.members = members;
  const fams = DB.families();
  if (d.id){
    const i = fams.findIndex(f=>f.id===d.id);
    d.updatedAt = Date.now();
    if (i>=0) fams[i]=d; else fams.push(d);
  } else {
    d.id = nextFamilyId();
    d.createdAt = Date.now();
    d.createdBy = u.id;
    fams.push(d);
  }
  DB.setFamilies(fams);
  const wasNew = !state.param;
  state.draft = null;
  toast(wasNew ? 'Family saved — ID generated' : 'Changes saved');
  go('detail', d.id);
}
function nextFamilyId(){ const n=DB.seq()+1; DB.setSeq(n); return PREFIX+'-'+new Date().getFullYear()+'-'+pad(n,6); }
function padCustom(custom){
  const arr = Array.isArray(custom) ? custom.slice(0,CUSTOM_DOCS) : [];
  while (arr.length < CUSTOM_DOCS) arr.push({label:'', value:'no'});
  return arr;
}

/* ============================================================
   USERS create
   ============================================================ */
async function addAdmin(form){
  const E=form.elements;
  const name=E.name.value.trim(), id=E.id.value.trim().toLowerCase(), phone=E.phone.value.trim(), pass=E.pass.value;
  if (DB.users().some(u=>u.id===id)){ toast('That ID already exists','err'); return; }
  const salt=uid();
  const users=DB.users(); users.push({ id, role:'admin', name:name||id, phone, salt, passHash:await hashPass(pass,salt), createdAt:Date.now() });
  DB.setUsers(users); toast('Admin added'); go('users');
}
async function addFamilyLogin(form){
  const E=form.elements;
  const familyId=E.familyId.value, pass=E.pass.value;
  if (!familyId){ toast('Select a family','err'); return; }
  const id = familyId.toLowerCase();
  const fam = DB.families().find(f=>f.id===familyId);
  const users=DB.users().filter(u=>u.id!==id);
  const salt=uid();
  users.push({ id, role:'family', name:(fam&&fam.houseName)||familyId, phone:(fam&&fam.phone)||'', familyId, salt, passHash:await hashPass(pass,salt), createdAt:Date.now() });
  DB.setUsers(users); toast('Family login created (ID: '+familyId+')'); go('users');
}

/* ============================================================
   EXPORT
   ============================================================ */
function collectRows(){
  const rows=[]; DB.families().forEach(f=>(f.members||[]).forEach(m=>{
    rows.push({
      'Family ID':f.id, 'House Name':f.houseName||'', 'House No':f.houseNo||'', 'Address':f.address||'', 'Phone':f.phone||'',
      'Member Name':m.name||'', 'Relation':m.relation||'', 'Gender':m.gender||'', 'DOB':m.dob||'', 'Age':(ageFromDob(m.dob)??''),
      'Education':m.education||'', 'Marital Status':m.maritalStatus||'', 'Children':m.children||'', 'Father Name':m.fatherName||'', 'Mother Name':m.motherName||'',
      'Disability':m.disability||'', 'Govt Scheme':m.govtScheme||''
    });
  }));
  return rows;
}
function exportExcel(){
  if (typeof XLSX === 'undefined'){ toast('Excel library not loaded (need internet once)','err'); return; }
  const rows = collectRows();
  if (!rows.length){ toast('No data to export','err'); return; }
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Members');
  // family sheet
  const famRows = DB.families().map(f=>({
    'Family ID':f.id,'House Name':f.houseName||'','House No':f.houseNo||'','Address':f.address||'','Phone':f.phone||'',
    'Members':(f.members||[]).length,
    'Docs (Yes)':DOC_TYPES.filter(([k])=>f.docs&&f.docs[k]==='yes').map(([,l])=>l).join(', ')
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(famRows), 'Families');
  // summary
  const s = computeStats();
  const sumRows = Object.entries({ 'Total Houses':s.houses,'Men':s.men,'Women':s.women,'Children':s.children,'Married':s.married,'Unmarried':s.unmarried,'Widow':s.widow,'Disability':s.disability,'Govt Scheme':s.scheme }).map(([k,v])=>({Metric:k,Total:v}));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sumRows), 'Summary');
  XLSX.writeFile(wb, 'masjid-kidmat-records-'+todayStr()+'.xlsx');
  toast('Excel file downloaded');
}
function backupJSON(){
  const data = { org:CFG.ORG_NAME, exportedAt:new Date().toISOString(), families:DB.families(), users:DB.users().map(u=>({id:u.id,role:u.role,name:u.name,phone:u.phone,familyId:u.familyId})) };
  const blob = new Blob([JSON.stringify(data,null,2)], {type:'application/json'});
  const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='masjid-kidmat-backup-'+todayStr()+'.json'; a.click(); URL.revokeObjectURL(a.href);
  toast('Backup downloaded');
}
function printFamilies(fams, title){
  if (!fams.length){ toast('Nothing to print','err'); return; }
  const s = computeStats();
  const head = `<h1>${esc(CFG.ORG_NAME||'Masjid e Mohammadi')} — ${esc(title)}</h1>
    <div class="pmeta">${esc(CFG.ORG_SUB||'Masjid Kidmat Committee')} · printed ${new Date().toLocaleDateString('en-GB')}
    ${title==='All Families'?` · Houses: ${s.houses} · Men: ${s.men} · Women: ${s.women} · Children: ${s.children} · Married: ${s.married} · Unmarried: ${s.unmarried} · Widow: ${s.widow} · Disability: ${s.disability} · Scheme: ${s.scheme}`:''}</div>`;
  const body = fams.map(f=>{
    const docs = DOC_TYPES.filter(([k])=>f.docs&&f.docs[k]==='yes').map(([,l])=>l).concat((f.custom||[]).filter(c=>c.label&&c.value==='yes').map(c=>c.label));
    return `<div class="pcard">
      <h2>${esc(f.houseName||'Family')} — ${esc(f.id)}</h2>
      <div class="pmeta">House No: ${esc(f.houseNo||'—')} · Phone: ${esc(f.phone||'—')} · Address: ${esc(f.address||'—')}</div>
      <table><thead><tr><th>#</th><th>Name</th><th>Relation</th><th>Gender</th><th>Age</th><th>Education</th><th>Marital</th><th>Children</th></tr></thead><tbody>
      ${(f.members||[]).map((m,i)=>{const a=ageFromDob(m.dob);return `<tr><td>${i+1}</td><td>${esc(m.name||'')}</td><td>${esc(m.relation||'')}</td><td>${esc(m.gender||'')}</td><td>${a===null?'':a}</td><td>${esc(m.education||'')}</td><td>${esc(m.maritalStatus||'')}</td><td>${esc(m.children||'')}</td></tr>`;}).join('')}
      </tbody></table>
      <div class="pmeta" style="margin-top:6pt">Documents: ${docs.length?esc(docs.join(', ')):'—'}</div>
    </div>`;
  }).join('');
  const area = $('#printArea'); area.innerHTML = head + body;
  setTimeout(()=>{ window.print(); }, 120);
}

/* ============================================================
   SAMPLE DATA
   ============================================================ */
function loadSample(){
  if (DB.families().length && !confirm('Add sample families on top of existing data?')) return;
  const sample = [
    { houseName:'Abdul Rahman', houseNo:'12-B', phone:'9876543210', address:'Masjid Road, Block A',
      members:[ {relation:'Self',name:'Abdul Rahman',gender:'Male',dob:'1979-04-12',education:'Graduate',maritalStatus:'Married',children:'3',fatherName:'Mohd Yusuf',motherName:'Ayesha Bibi',disability:'no',govtScheme:'yes'},
                {relation:'Wife',name:'Fatima Begum',gender:'Female',dob:'1984-08-20',education:'10th',maritalStatus:'Married',children:'3',fatherName:'Ibrahim',motherName:'Khatija',disability:'no',govtScheme:'no'},
                {relation:'Son',name:'Imran Khan',gender:'Male',dob:'2011-02-05',education:'8th',maritalStatus:'Unmarried',children:'0',fatherName:'Abdul Rahman',motherName:'Fatima Begum',disability:'no',govtScheme:'no'} ] },
    { houseName:'Sayeed Ahmed', houseNo:'45', phone:'9812345678', address:'Nala Road, Block C',
      members:[ {relation:'Self',name:'Sayeed Ahmed',gender:'Male',dob:'1965-11-01',education:'12th',maritalStatus:'Widower',children:'2',fatherName:'Late Karim',motherName:'Rahima',disability:'yes',govtScheme:'yes'},
                {relation:'Daughter',name:'Sana Ahmed',gender:'Female',dob:'2009-06-18',education:'9th',maritalStatus:'Unmarried',children:'0',fatherName:'Sayeed Ahmed',motherName:'Nasreen',disability:'no',govtScheme:'yes'} ] },
    { houseName:'Mohd Salim', houseNo:'7-A', phone:'9822001100', address:'Idgah Lane, Block B',
      members:[ {relation:'Self',name:'Mohd Salim',gender:'Male',dob:'1988-01-30',education:'Graduate',maritalStatus:'Married',children:'1',fatherName:'Abdul Karim',motherName:'Shabana',disability:'no',govtScheme:'no'},
                {relation:'Wife',name:'Rukhsana',gender:'Female',dob:'1990-09-09',education:'12th',maritalStatus:'Married',children:'1',fatherName:'Yusuf',motherName:'Zubeida',disability:'no',govtScheme:'no'} ] },
    { houseName:'Ismail Sheikh', houseNo:'88', phone:'9867891234', address:'Canal Side, Block A',
      members:[ {relation:'Self',name:'Ismail Sheikh',gender:'Male',dob:'1972-03-15',education:'10th',maritalStatus:'Married',children:'4',fatherName:'Rasheed',motherName:'Hameeda',disability:'no',govtScheme:'yes'},
                {relation:'Wife',name:'Naseem Bano',gender:'Female',dob:'1976-12-25',education:'8th',maritalStatus:'Married',children:'4',fatherName:'Anwar',motherName:'Salma',disability:'yes',govtScheme:'yes'} ] },
    { houseName:'Rizwan Ali', houseNo:'23', phone:'9800012345', address:'Station Road, Block D',
      members:[ {relation:'Self',name:'Rizwan Ali',gender:'Male',dob:'1995-07-07',education:'Post-Graduate',maritalStatus:'Unmarried',children:'0',fatherName:'Shakeel',motherName:'Farida',disability:'no',govtScheme:'no'} ] }
  ];
  const fams = DB.families();
  sample.forEach((s,i)=>{
    const id = nextFamilyId();
    const docs = {}; DOC_TYPES.forEach(([k],idx)=>{ docs[k] = (idx % 2 === 0 && i % 2 === 0) ? 'yes' : 'no'; });
    fams.push(Object.assign({ id, createdAt:Date.now()- (sample.length-i)*86400000, createdBy:'sample', notes:'Sample record', docs, custom:padCustom([]) }, s));
  });
  DB.setFamilies(fams);
}

/* ============================================================
   INIT
   ============================================================ */
function init(){ renderAuth(); }
if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', init);
else init();
