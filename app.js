// ============ DocVault — pro edition ============
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

const HASH_KEY = 'docvault_pass_hash';
const DATA_KEY = 'docvault_docs_v2';

let docs = [];
let currentCat = 'all';
let currentSearch = '';
let editingId = null;
let viewingId = null;
let pendingFile = null;
let viewMode = 'grid';

// ---------- Crypto ----------
async function sha256(text) {
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2,'0')).join('');
}

// ---------- Categories ----------
const CAT_ICONS = {
  aadhaar:'🇮🇳', pan:'💳', passport:'📘', dl:'🚗', voter:'🗳️',
  birth:'👶', certificate:'🏆', degree:'🎓', medical:'🏥',
  financial:'💰', legal:'⚖️', vehicle:'🚙', property:'🏠',
  employment:'💼', other:'📄'
};
const CAT_NAMES = {
  aadhaar:'Aadhaar Card', pan:'PAN Card', passport:'Passport',
  dl:'Driving License', voter:'Voter ID', birth:'Birth Certificate',
  certificate:'Certificate', degree:'Degree / Marksheet',
  medical:'Medical', financial:'Financial', legal:'Legal',
  vehicle:'Vehicle (RC/Insurance)', property:'Property',
  employment:'Employment', other:'Other'
};

// ---------- Lock ----------
let failedAttempts = 0;

function showError(msg) {
  $('#lockErrorText').textContent = msg;
  const err = $('#lockError');
  err.classList.remove('hidden');
  err.style.animation = 'none'; void err.offsetWidth; err.style.animation = '';
  $('#lockIcon').classList.add('error');
  $('.lock-card').animate(
    [{transform:'translateX(-10px)'},{transform:'translateX(10px)'},{transform:'translateX(0)'}],
    {duration:300}
  );
  setTimeout(() => $('#lockIcon').classList.remove('error'), 600);
}
function clearError() {
  $('#lockError').classList.add('hidden');
}

async function handleUnlock() {
  const pass = $('#masterPass').value;
  const stored = localStorage.getItem(HASH_KEY);
  const isSetup = !stored;

  if (!pass) return showError('Please enter a password');

  if (isSetup) {
    // First-time setup
    const confirm = $('#confirmPass').value;
    if (pass.length < 6) return showError('Password must be at least 6 characters');
    if (!confirm) return showError('Please confirm your password');
    if (pass !== confirm) return showError("Passwords don't match");
    localStorage.setItem(HASH_KEY, await sha256(pass));
    $('#lockIcon').classList.add('success');
    clearError();
    toast('🎉 Vault created successfully!');
    setTimeout(() => {
      $('#lockScreen').classList.add('hidden');
      promptRecoverySetup();
    }, 500);
  } else {
    // Returning user
    if (await sha256(pass) === stored) {
      failedAttempts = 0;
      $('#lockIcon').classList.add('success');
      clearError();
      setTimeout(enterApp, 350);
    } else {
      failedAttempts++;
      $('#masterPass').value = '';
      const remaining = Math.max(0, 5 - failedAttempts);
      if (failedAttempts >= 5) {
        showError('Too many failed attempts. Wait 30 seconds.');
        $('#unlockBtn').disabled = true;
        $('#masterPass').disabled = true;
        setTimeout(() => {
          failedAttempts = 0;
          $('#unlockBtn').disabled = false;
          $('#masterPass').disabled = false;
          clearError();
        }, 30000);
      } else {
        showError(`Wrong password — ${remaining} attempt${remaining===1?'':'s'} left`);
      }
    }
  }
}

function showLock() {
  $('#landing').classList.add('hidden');
  $('#app').classList.add('hidden');
  $('#lockScreen').classList.remove('hidden');
  clearError();
  $('#masterPass').value = '';
  $('#confirmPass').value = '';

  const isSetup = !localStorage.getItem(HASH_KEY);
  const pill = $('#modePill');
  const confirmWrap = $('#confirmWrap');
  const strengthWrap = $('#strengthWrap');

  const submitLabel = $('#unlockBtn').querySelector('.lr-label');
  const submitIcon = $('#unlockBtn').querySelector('.lr-icon');
  if (isSetup) {
    pill.textContent = '✨ NEW VAULT';
    pill.classList.add('setup');
    $('#lockTitle').textContent = 'Create Your Vault';
    $('#lockSub').textContent = 'Set a master password to secure your documents';
    $('#masterPass').placeholder = 'Create a strong password';
    confirmWrap.classList.remove('hidden');
    strengthWrap.classList.remove('hidden');
    if (submitLabel) submitLabel.textContent = 'Create Vault';
    if (submitIcon) submitIcon.textContent = '🔐';
    $('#lockHint').textContent = '⚠ Remember this password carefully — it cannot be recovered.';
  } else {
    pill.textContent = '🔐 SECURE LOGIN';
    pill.classList.remove('setup');
    $('#lockTitle').textContent = 'Welcome Back';
    $('#lockSub').textContent = 'Unlock your vault to access documents';
    $('#masterPass').placeholder = '••••••••';
    confirmWrap.classList.add('hidden');
    strengthWrap.classList.add('hidden');
    if (submitLabel) submitLabel.textContent = 'Unlock Vault';
    if (submitIcon) submitIcon.textContent = '🔓';
    $('#lockHint').textContent = 'Enter your master password to continue.';
  }
  setTimeout(() => $('#masterPass').focus(), 250);
}

// Live strength meter on lock screen (setup mode)
$('#masterPass').addEventListener('input', () => {
  if (localStorage.getItem(HASH_KEY)) return; // not setup mode
  const v = $('#masterPass').value;
  let score = 0;
  if (v.length >= 6) score++;
  if (v.length >= 10) score++;
  if (/[A-Z]/.test(v) && /[a-z]/.test(v)) score++;
  if (/\d/.test(v)) score++;
  if (/[^A-Za-z0-9]/.test(v)) score++;
  const fills = ['0%','20%','40%','60%','80%','100%'];
  const colors = ['#ff6b81','#ff6b81','#ff9933','#ffcc66','#3ddc97','#3ddc97'];
  const labels = ['—','Very Weak','Weak','Fair','Good','Strong'];
  $('#lockStrength').style.width = fills[score];
  $('#lockStrength').style.background = colors[score];
  $('#lockStrengthText').textContent = 'Strength: ' + labels[score];
});

// Clear error on typing
['#masterPass','#confirmPass'].forEach(s => $(s).addEventListener('input', clearError));

// Enter on confirm field also submits
$('#confirmPass').addEventListener('keydown', e => { if (e.key === 'Enter') handleUnlock(); });

// Eye toggle
$('#eyeBtn').addEventListener('click', () => {
  const inp = $('#masterPass');
  inp.type = inp.type === 'password' ? 'text' : 'password';
  $('#eyeBtn').textContent = inp.type === 'password' ? '👁' : '🙈';
});
function backToLanding() {
  $('#lockScreen').classList.add('hidden');
  $('#landing').classList.remove('hidden');
}
function enterApp() {
  $('#lockScreen').classList.add('hidden');
  $('#landing').classList.add('hidden');
  $('#app').classList.remove('hidden');
  loadDocs();
  render();
}
function lock() {
  $('#app').classList.add('hidden');
  $('#landing').classList.remove('hidden');
}

// ---------- Storage ----------
function loadDocs() {
  try { docs = JSON.parse(localStorage.getItem(DATA_KEY) || '[]'); }
  catch { docs = []; }
}
function saveDocs() { localStorage.setItem(DATA_KEY, JSON.stringify(docs)); }

// ---------- Helpers ----------
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }
function fmtDate(d) { return d ? new Date(d).toLocaleDateString('en-IN', {day:'numeric',month:'short',year:'numeric'}) : '—'; }
function daysUntil(d) { if (!d) return Infinity; return Math.ceil((new Date(d) - new Date()) / 86400000); }
function escapeHtml(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

// ---------- Render ----------
function render() {
  const grid = $('#docGrid');
  const empty = $('#emptyState');
  const q = currentSearch.toLowerCase();

  let list = docs.filter(d => {
    if (currentCat === 'favorites' && !d.favorite) return false;
    if (currentCat === 'expiring') {
      const x = daysUntil(d.expiry);
      if (x === Infinity || x > 60 || x < 0) return false;
    }
    if (!['all','favorites','expiring'].includes(currentCat)) {
      if (d.category !== currentCat) return false;
    }
    if (q) {
      const blob = [d.name, d.issuer, d.number, d.holder, d.notes, (d.tags||[]).join(' '), CAT_NAMES[d.category]].join(' ').toLowerCase();
      if (!blob.includes(q)) return false;
    }
    return true;
  });

  $('#docCount').textContent = `${list.length} doc${list.length !== 1 ? 's' : ''}`;
  grid.className = 'grid' + (viewMode === 'list' ? ' list-view' : '');

  if (!list.length) { empty.classList.remove('hidden'); grid.innerHTML = ''; return; }
  empty.classList.add('hidden');

  grid.innerHTML = list.map((d, i) => {
    const exp = daysUntil(d.expiry);
    let expTag = '';
    if (d.expiry) {
      if (exp < 0) expTag = `<span class="tag exp-gone">Expired</span>`;
      else if (exp <= 60) expTag = `<span class="tag exp-soon">Expires in ${exp}d</span>`;
      else expTag = `<span class="tag">Exp ${fmtDate(d.expiry)}</span>`;
    }
    const fav = d.favorite ? `<span class="tag fav">★</span>` : '';
    const tags = (d.tags||[]).slice(0,2).map(t => `<span class="tag">#${escapeHtml(t)}</span>`).join('');
    const fileTag = d.fileData ? `<span class="tag">📎 File</span>` : '';

    // Visual preview - image thumbnail, PDF icon, or themed gradient + icon
    let preview;
    if (d.fileData && d.fileType?.startsWith('image/')) {
      preview = `<div class="card-preview"><img src="${d.fileData}" alt=""/><div class="cp-badge">${CAT_ICONS[d.category]||'📄'}</div></div>`;
    } else if (d.fileData && d.fileType === 'application/pdf') {
      preview = `<div class="card-preview pdf cat-${d.category}"><div class="pdf-icon">📕<span>PDF</span></div><div class="cp-badge">${CAT_ICONS[d.category]||'📄'}</div></div>`;
    } else {
      preview = `<div class="card-preview themed cat-${d.category}"><div class="themed-emoji">${CAT_ICONS[d.category]||'📄'}</div><div class="themed-name">${CAT_NAMES[d.category]||'Document'}</div></div>`;
    }

    return `
      <div class="card" data-id="${d.id}" style="animation-delay:${Math.min(i*40, 400)}ms">
        ${preview}
        <h3>${escapeHtml(d.name)}</h3>
        <div class="issuer">${escapeHtml(d.issuer || CAT_NAMES[d.category] || '—')}</div>
        <div class="card-meta">${fav}${expTag}${fileTag}${tags}</div>
      </div>`;
  }).join('');

  $$('#docGrid .card').forEach(c => c.addEventListener('click', () => openView(c.dataset.id)));
}

// ---------- Add / Edit ----------
function openModal(doc) {
  editingId = doc ? doc.id : null;
  pendingFile = null;
  $('#modalTitle').textContent = doc ? '✏ Edit Document' : '+ Add Document';
  $('#fName').value = doc?.name || '';
  $('#fCategory').value = doc?.category || 'aadhaar';
  $('#fIssuer').value = doc?.issuer || '';
  $('#fNumber').value = doc?.number || '';
  $('#fIssue').value = doc?.issue || '';
  $('#fExpiry').value = doc?.expiry || '';
  $('#fHolder').value = doc?.holder || '';
  $('#fTags').value = (doc?.tags || []).join(', ');
  $('#fNotes').value = doc?.notes || '';
  $('#fFile').value = '';
  $('#fileInfo').textContent = doc?.fileName ? `Saved: ${doc.fileName}` : '';
  $('#docModal').classList.remove('hidden');
  setTimeout(() => $('#fName').focus(), 100);
}
function closeModal(sel) { $(sel).classList.add('hidden'); }

$('#fFile').addEventListener('change', (e) => {
  const f = e.target.files[0]; if (!f) return;
  if (f.size > 8 * 1024 * 1024) { toast('File too large (max 8 MB)'); e.target.value=''; return; }
  const r = new FileReader();
  r.onload = () => { pendingFile = { name:f.name, type:f.type, data:r.result }; $('#fileInfo').textContent = `✓ Loaded: ${f.name}`; };
  r.readAsDataURL(f);
});

$('#docForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const data = {
    name: $('#fName').value.trim(),
    category: $('#fCategory').value,
    issuer: $('#fIssuer').value.trim(),
    number: $('#fNumber').value.trim(),
    issue: $('#fIssue').value,
    expiry: $('#fExpiry').value,
    holder: $('#fHolder').value.trim(),
    tags: $('#fTags').value.split(',').map(t=>t.trim()).filter(Boolean),
    notes: $('#fNotes').value.trim(),
  };
  if (editingId) {
    const d = docs.find(x => x.id === editingId);
    Object.assign(d, data);
    if (pendingFile) { d.fileName=pendingFile.name; d.fileType=pendingFile.type; d.fileData=pendingFile.data; }
    toast('✓ Updated');
  } else {
    const d = { id: uid(), favorite: false, createdAt: Date.now(), ...data };
    if (pendingFile) { d.fileName=pendingFile.name; d.fileType=pendingFile.type; d.fileData=pendingFile.data; }
    docs.unshift(d);
    toast('✓ Saved to vault');
  }
  saveDocs();
  closeModal('#docModal');
  render();
});

// ---------- View ----------
function openView(id) {
  const d = docs.find(x => x.id === id); if (!d) return;
  viewingId = id;
  $('#viewTitle').textContent = `${CAT_ICONS[d.category]||'📄'} ${d.name}`;
  $('#favBtn').textContent = d.favorite ? '★ Favorited' : '☆ Favorite';

  let preview = '<div class="muted">📄 No file attached</div>';
  if (d.fileData) {
    if (d.fileType?.startsWith('image/')) preview = `<img src="${d.fileData}" alt="preview"/>`;
    else if (d.fileType === 'application/pdf') preview = `<iframe src="${d.fileData}"></iframe>`;
    else preview = `<div class="muted">📎 ${escapeHtml(d.fileName)}</div>`;
  }
  const dl = d.fileData ? `<a class="dl-link" href="${d.fileData}" download="${escapeHtml(d.fileName)}">⬇ Download File</a>` : '';

  const exp = daysUntil(d.expiry);
  let status = '';
  if (d.expiry) {
    if (exp < 0) status = `<span style="color:var(--red)">Expired</span>`;
    else if (exp <= 60) status = `<span style="color:var(--yellow)">Expires in ${exp} days</span>`;
    else status = `<span style="color:var(--green)">${exp} days left</span>`;
  }

  $('#viewBody').innerHTML = `
    <div class="view-grid">
      <div>
        <div class="view-preview">${preview}</div>
        ${dl}
      </div>
      <div class="view-info">
        <dl>
          <dt>Category</dt><dd>${CAT_ICONS[d.category]||'📄'} ${CAT_NAMES[d.category]||d.category}</dd>
          <dt>Holder Name</dt><dd>${escapeHtml(d.holder || '—')}</dd>
          <dt>Issuer</dt><dd>${escapeHtml(d.issuer || '—')}</dd>
          <dt>Document Number</dt><dd style="font-family:'Space Grotesk',monospace;letter-spacing:1px">${escapeHtml(d.number || '—')}</dd>
          <dt>Issue Date</dt><dd>${fmtDate(d.issue)}</dd>
          <dt>Expiry</dt><dd>${fmtDate(d.expiry)} ${status ? `<span class="muted"> · ${status}</span>` : ''}</dd>
          <dt>Tags</dt><dd>${(d.tags||[]).map(t=>`<span class="tag">#${escapeHtml(t)}</span>`).join(' ') || '—'}</dd>
          <dt>Notes</dt><dd>${escapeHtml(d.notes || '—')}</dd>
        </dl>
      </div>
    </div>`;
  $('#viewModal').classList.remove('hidden');
}

$('#favBtn').addEventListener('click', () => {
  const d = docs.find(x => x.id === viewingId);
  d.favorite = !d.favorite; saveDocs(); openView(viewingId); render();
  toast(d.favorite ? '★ Added to favorites' : '☆ Removed from favorites');
});
$('#editBtn').addEventListener('click', () => {
  const d = docs.find(x => x.id === viewingId);
  closeModal('#viewModal'); openModal(d);
});
$('#delBtn').addEventListener('click', () => {
  const d = docs.find(x => x.id === viewingId); if (!d) return;
  showConfirm({
    title: 'Delete this document?',
    message: 'This document will be permanently removed from your vault. This action cannot be undone.',
    doc: d,
    confirmText: '🗑 Yes, Delete',
    onConfirm: () => {
      docs = docs.filter(x => x.id !== viewingId);
      saveDocs(); closeModal('#viewModal'); render();
      toast('🗑 Document deleted');
    }
  });
});

// ---------- Custom confirm dialog ----------
function showConfirm({ title, message, doc, confirmText='Confirm', onConfirm }) {
  $('#confirmTitle').textContent = title;
  $('#confirmMsg').textContent = message;
  $('#confirmYes').textContent = confirmText;
  const docBox = $('#confirmDoc');
  if (doc) {
    docBox.style.display = 'flex';
    docBox.innerHTML = `
      <div class="ci-icon">${CAT_ICONS[doc.category]||'📄'}</div>
      <div class="ci-text">
        <b>${escapeHtml(doc.name)}</b>
        <span>${escapeHtml(CAT_NAMES[doc.category]||'Document')} ${doc.issuer ? '· '+escapeHtml(doc.issuer) : ''}</span>
      </div>`;
  } else {
    docBox.style.display = 'none';
  }
  $('#confirmModal').classList.remove('hidden');
  const cleanup = () => {
    $('#confirmModal').classList.add('hidden');
    $('#confirmYes').onclick = null;
    $('#confirmNo').onclick = null;
  };
  $('#confirmYes').onclick = () => { cleanup(); onConfirm?.(); };
  $('#confirmNo').onclick = cleanup;
}

// ---------- Backup ----------
$('#exportBtn').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(docs, null, 2)], { type:'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `docvault-backup-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  toast('⬇ Backup downloaded');
});
$('#importBtn').addEventListener('click', () => $('#importFile').click());
$('#importFile').addEventListener('change', (e) => {
  const f = e.target.files[0]; if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const arr = JSON.parse(r.result);
      if (!Array.isArray(arr)) throw 0;
      const ids = new Set(docs.map(d => d.id));
      let added = 0;
      arr.forEach(d => { if (!ids.has(d.id)) { docs.push(d); added++; } });
      saveDocs(); render();
      toast(`⬆ Imported ${added} docs`);
    } catch { toast('Invalid backup file'); }
  };
  r.readAsText(f);
});

// ---------- Wire up ----------
$('#unlockBtn').addEventListener('click', handleUnlock);
$('#masterPass').addEventListener('keydown', e => { if (e.key === 'Enter') handleUnlock(); });
$('#lockBtn').addEventListener('click', lock);
$('#backLanding').addEventListener('click', backToLanding);
$('#addBtn').addEventListener('click', () => openModal(null));
$('#emptyAdd').addEventListener('click', () => openModal(null));
// Close button: closes the parent modal it belongs to
document.addEventListener('click', e => {
  const btn = e.target.closest('[data-close]');
  if (!btn) return;
  const modal = btn.closest('.modal');
  if (modal) modal.classList.add('hidden');
});
// Debounced search for smoother typing on mobile
let searchTimer;
$('#searchInput').addEventListener('input', e => {
  clearTimeout(searchTimer);
  const v = e.target.value;
  searchTimer = setTimeout(() => { currentSearch = v; render(); }, 120);
});
$$('#categoryList li, .nav li').forEach(li => {
  li.addEventListener('click', () => {
    $$('.nav li').forEach(x => x.classList.remove('active'));
    li.classList.add('active');
    currentCat = li.dataset.cat;
    render();
  });
});
$$('.vt').forEach(b => b.addEventListener('click', () => {
  $$('.vt').forEach(x => x.classList.remove('active'));
  b.classList.add('active');
  viewMode = b.dataset.view;
  render();
}));

// Landing buttons
['#goAppBtn','#heroOpen','#ctaOpen'].forEach(s => $(s)?.addEventListener('click', showLock));
$('#heroLearn')?.addEventListener('click', () => $('#features').scrollIntoView({behavior:'smooth'}));

// Close modals on backdrop click
$$('.modal').forEach(m => m.addEventListener('click', e => { if (e.target === m) m.classList.add('hidden'); }));
// Esc to close
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    $$('.modal').forEach(m => m.classList.add('hidden'));
  }
});

// ---------- Toast ----------
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('show'), 2200);
}

// ---------- Enhanced Reveal on scroll ----------
const io = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); }
    else if (e.boundingClientRect.top > 0) { e.target.classList.remove('in'); } // re-trigger on scroll up from below
  });
}, { threshold: 0.12, rootMargin: '0px 0px -50px 0px' });
$$('.reveal, .reveal-left, .reveal-right, .reveal-zoom').forEach(el => io.observe(el));

// Stagger index for doc-types
$$('.doc-types .dt').forEach((el, i) => el.style.setProperty('--i', i));

// Parallax on hero shield (desktop only)
if (window.innerWidth > 900) {
  window.addEventListener('scroll', () => {
    const sh = document.querySelector('.shield-anim');
    if (sh) sh.style.transform = `translate(-50%,calc(-50% + ${window.scrollY * 0.15}px)) rotate(${window.scrollY * 0.1}deg)`;
    const visual = document.querySelector('.hero-visual');
    if (visual && window.scrollY < 800) visual.style.transform = `translateY(${window.scrollY * 0.08}px)`;
  }, { passive: true });
}

// Disable hero tilt on touch devices
if ('ontouchstart' in window) {
  document.querySelectorAll('.float-card').forEach(c => c.style.transition = 'none');
}

// Smooth-scroll for nav anchors
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    if (id.length > 1) {
      const target = document.querySelector(id);
      if (target) { e.preventDefault(); target.scrollIntoView({ behavior:'smooth', block:'start' }); }
    }
  });
});

// ---------- Category Banner ----------
const CAT_INFO = {
  all: { title: 'All Documents', sub: 'Your complete vault at a glance', icon: '📁', decor:['📄','📋','🗂'] },
  favorites: { title: 'Favorites', sub: 'Your most important documents', icon: '⭐', decor:['⭐','✨','💛'] },
  expiring: { title: 'Expiring Soon', sub: 'Documents needing renewal', icon: '⏰', decor:['⏰','📅','⚠'] },
  aadhaar: { title: 'Aadhaar Cards', sub: '12-digit unique identity issued by UIDAI', icon: '🇮🇳', decor:['🇮🇳','🪪','#'] },
  pan: { title: 'PAN Cards', sub: 'Permanent Account Number for tax & finance', icon: '💳', decor:['💳','💼','₹'] },
  passport: { title: 'Passports', sub: 'International travel documents', icon: '📘', decor:['📘','✈','🌍'] },
  dl: { title: 'Driving Licenses', sub: 'Authority to drive vehicles', icon: '🚗', decor:['🚗','🛣','🪪'] },
  voter: { title: 'Voter IDs', sub: 'Election Commission identification', icon: '🗳️', decor:['🗳','🇮🇳','✓'] },
  birth: { title: 'Birth Certificates', sub: 'Proof of date and place of birth', icon: '👶', decor:['👶','🎂','📜'] },
  certificate: { title: 'Certificates', sub: 'Achievements, awards & credentials', icon: '🏆', decor:['🏆','🎖','✨'] },
  degree: { title: 'Degrees & Marksheets', sub: 'Academic credentials & transcripts', icon: '🎓', decor:['🎓','📚','🏛'] },
  medical: { title: 'Medical Records', sub: 'Health reports, prescriptions, insurance', icon: '🏥', decor:['🏥','💊','🩺'] },
  financial: { title: 'Financial Documents', sub: 'Bank, investments, tax records', icon: '💰', decor:['💰','📊','₹'] },
  legal: { title: 'Legal Papers', sub: 'Contracts, agreements, court documents', icon: '⚖️', decor:['⚖','📜','🏛'] },
  vehicle: { title: 'Vehicle Documents', sub: 'RC, insurance, PUC certificates', icon: '🚙', decor:['🚙','🛞','📋'] },
  property: { title: 'Property Papers', sub: 'Deeds, agreements, ownership records', icon: '🏠', decor:['🏠','🔑','📜'] },
  employment: { title: 'Employment', sub: 'Offer letters, payslips, certificates', icon: '💼', decor:['💼','📝','💻'] },
  other: { title: 'Other Documents', sub: 'Miscellaneous important papers', icon: '📄', decor:['📄','📁','✏'] },
};

function updateCatHero() {
  const info = CAT_INFO[currentCat] || CAT_INFO.all;
  const hero = $('#catHero');
  hero.dataset.cat = currentCat;
  $('#catHeroTitle').textContent = info.title;
  $('#catHeroSub').textContent = info.sub;
  $('#catHeroIcon').textContent = info.icon;
  // decorative emojis
  const bg = $('#catHeroBg');
  bg.querySelectorAll('.cat-decor').forEach(x => x.remove());
  info.decor.forEach(em => {
    const el = document.createElement('div');
    el.className = 'cat-decor'; el.textContent = em;
    bg.appendChild(el);
  });
}

// ---------- Stats dashboard ----------
function renderStats() {
  const total = docs.length;
  const fav = docs.filter(d => d.favorite).length;
  const expSoon = docs.filter(d => { const x = daysUntil(d.expiry); return x !== Infinity && x >= 0 && x <= 60; }).length;
  const files = docs.filter(d => d.fileData).length;
  animateCount('#statTotal', total);
  animateCount('#statFav', fav);
  animateCount('#statExp', expSoon);
  animateCount('#statFiles', files);
}
function animateCount(sel, target, suffix='') {
  const el = $(sel); if (!el) return;
  const start = parseInt(el.textContent) || 0;
  const dur = 600; const t0 = performance.now();
  function step(t) {
    const p = Math.min((t - t0) / dur, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(start + (target - start) * eased) + suffix;
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}
const _origRender = render;
render = function() { _origRender(); renderStats(); updateCatHero(); };

// ---------- Hero stat counters (lazy: only when visible) ----------
function runHeroCounters() {
  $$('.hero-stats b[data-count]').forEach(el => {
    if (el.dataset.done) return;
    el.dataset.done = '1';
    const target = parseInt(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    const dur = 1200; const t0 = performance.now();
    function step(t) {
      const p = Math.min((t - t0) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased) + suffix;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  });
}
const heroStats = document.querySelector('.hero-stats');
if (heroStats && 'IntersectionObserver' in window) {
  const hsIO = new IntersectionObserver(es => {
    es.forEach(e => { if (e.isIntersecting) { runHeroCounters(); hsIO.disconnect(); } });
  });
  hsIO.observe(heroStats);
} else { setTimeout(runHeroCounters, 400); }

// ---------- Rotating hero word ----------
(function rotateHero() {
  const el = $('#rotateWord'); if (!el) return;
  const words = ['safely vaulted.','always with you.','never lost.','100% private.','beautifully organized.'];
  let i = 0;
  setInterval(() => {
    i = (i + 1) % words.length;
    el.style.transition = 'opacity .3s, transform .3s';
    el.style.opacity = '0'; el.style.transform = 'translateY(-10px)';
    setTimeout(() => {
      el.textContent = words[i];
      el.style.opacity = '1'; el.style.transform = 'translateY(0)';
    }, 320);
  }, 2800);
})();

// ---------- Cursor spotlight on hero ----------
(function spotlight() {
  const h = $('#heroSpot'); if (!h) return;
  h.addEventListener('mousemove', e => {
    const r = h.getBoundingClientRect();
    h.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    h.style.setProperty('--my', (e.clientY - r.top) + 'px');
  });
})();

// ---------- 3D tilt on float cards ----------
(function tilt() {
  const visual = document.querySelector('.hero-visual'); if (!visual) return;
  visual.addEventListener('mousemove', e => {
    const r = visual.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - .5;
    const y = (e.clientY - r.top) / r.height - .5;
    $$('.float-card').forEach((c, i) => {
      const baseR = [-6,5,-3][i] || 0;
      c.style.transform = `rotate(${baseR + x*4}deg) translate(${x*15}px, ${y*15}px)`;
    });
  });
  visual.addEventListener('mouseleave', () => {
    $$('.float-card').forEach(c => c.style.transform = '');
  });
})();

// ---------- Ripple on buttons ----------
document.addEventListener('click', e => {
  const btn = e.target.closest('.btn-primary, .add-btn, .primary');
  if (!btn) return;
  const r = btn.getBoundingClientRect();
  const ripple = document.createElement('span');
  ripple.className = 'ripple';
  const size = Math.max(r.width, r.height);
  ripple.style.width = ripple.style.height = size + 'px';
  ripple.style.left = (e.clientX - r.left - size/2) + 'px';
  ripple.style.top = (e.clientY - r.top - size/2) + 'px';
  if (getComputedStyle(btn).position === 'static') btn.style.position = 'relative';
  btn.style.overflow = 'hidden';
  btn.appendChild(ripple);
  setTimeout(() => ripple.remove(), 600);
});

// ---------- Confetti ----------
function confetti() {
  const colors = ['#6c8cff','#b56cff','#4cc9ff','#3ddc97','#ffcc66','#ff6b81'];
  for (let i = 0; i < 60; i++) {
    const c = document.createElement('div');
    c.className = 'confetti';
    c.style.left = Math.random()*100 + 'vw';
    c.style.background = colors[Math.floor(Math.random()*colors.length)];
    c.style.animationDelay = Math.random()*0.4 + 's';
    c.style.transform = `rotate(${Math.random()*360}deg)`;
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 3000);
  }
}

// Confetti on first save
const origSubmit = $('#docForm').onsubmit;
$('#docForm').addEventListener('submit', () => { if (!editingId) setTimeout(confetti, 100); });

// ---------- Doc-type chips on landing → open vault to that category ----------
const chipMap = {
  'Aadhaar':'aadhaar','PAN':'pan','Passport':'passport','Driving':'dl','Voter':'voter',
  'Degree':'degree','Certificates':'certificate','Medical':'medical','Property':'property',
  'Bank':'financial','Legal':'legal','RC':'vehicle','Birth':'birth','Employment':'employment','Other':'other'
};
$$('.dt').forEach(el => {
  el.addEventListener('click', () => {
    const text = el.textContent;
    const key = Object.keys(chipMap).find(k => text.includes(k));
    if (key) sessionStorage.setItem('jumpCat', chipMap[key]);
    showLock();
  });
});

// After unlock, jump to saved category
const _enter = enterApp;
enterApp = function() {
  _enter();
  const j = sessionStorage.getItem('jumpCat');
  if (j) {
    const li = document.querySelector(`.nav li[data-cat="${j}"]`);
    if (li) li.click();
    sessionStorage.removeItem('jumpCat');
  }
};

// ---------- Keyboard shortcuts ----------
document.addEventListener('keydown', e => {
  // Ctrl/Cmd+K → focus search
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    if (!$('#app').classList.contains('hidden')) {
      e.preventDefault();
      $('#searchInput').focus();
    }
  }
  // N → new doc
  if (e.key.toLowerCase() === 'n' && !e.ctrlKey && !e.metaKey
      && document.activeElement.tagName !== 'INPUT'
      && document.activeElement.tagName !== 'TEXTAREA'
      && !$('#app').classList.contains('hidden')) {
    e.preventDefault(); openModal(null);
  }
  // / → focus search
  if (e.key === '/' && document.activeElement.tagName !== 'INPUT'
      && document.activeElement.tagName !== 'TEXTAREA'
      && !$('#app').classList.contains('hidden')) {
    e.preventDefault(); $('#searchInput').focus();
  }
});

// ---------- Scroll progress bar ----------
(function scrollBar() {
  const bar = document.createElement('div');
  bar.className = 'scroll-bar';
  document.body.appendChild(bar);
  window.addEventListener('scroll', () => {
    const h = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = (window.scrollY / h * 100) + '%';
  });
})();

// ---------- Tooltips on action buttons ----------
$('#favBtn').setAttribute('title', 'Toggle favorite (★)');
$('#editBtn').setAttribute('title', 'Edit document');
$('#delBtn').setAttribute('title', 'Delete permanently');

// ============ RECOVERY SYSTEM ============
const REC_KEY_HASH = 'docvault_rec_key';
const REC_Q_KEY = 'docvault_rec_q';
const REC_A_HASH = 'docvault_rec_a';

function genRecoveryKey(length = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const arr = new Uint32Array(length);
  crypto.getRandomValues(arr);
  let key = '';
  for (let i = 0; i < length; i++) {
    if (i > 0 && i % 4 === 0) key += '-';
    key += chars[arr[i] % chars.length];
  }
  return key;
}

let pendingRecoveryKey = null;
let pendingKeyLength = 6;

function updateKeyStrength(len) {
  const el = $('#keyStrength');
  const chars = $('#keyChars');
  chars.textContent = `${len} chars`;
  let label, color;
  if (len < 6) { label = '●○○○ Weak'; color = 'var(--red)'; }
  else if (len < 10) { label = '●●○○ Fair'; color = 'var(--yellow)'; }
  else if (len < 16) { label = '●●●○ Strong'; color = 'var(--green)'; }
  else if (len < 24) { label = '●●●● Very Strong'; color = 'var(--green)'; }
  else { label = '●●●● Military Grade'; color = 'var(--accent-3)'; }
  el.textContent = label;
  el.style.color = color;
}

function regenerateKey() {
  pendingRecoveryKey = genRecoveryKey(pendingKeyLength);
  const el = $('#recoveryKey');
  el.style.opacity = '0';
  el.style.transform = 'scale(.95)';
  setTimeout(() => {
    el.textContent = pendingRecoveryKey;
    el.style.transition = 'all .3s';
    el.style.opacity = '1';
    el.style.transform = 'scale(1)';
  }, 150);
  updateKeyStrength(pendingKeyLength);
}

// Close recovery modal via ✕ → still enter app
document.addEventListener('click', e => {
  if (e.target.closest('#recoverySetupModal [data-close]')) {
    setTimeout(() => {
      if ($('#app').classList.contains('hidden')) enterApp();
    }, 50);
  }
});

// Safety: Press Esc on stuck recovery modal → enter vault
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !$('#recoverySetupModal').classList.contains('hidden')) {
    $('#recoverySetupModal').classList.add('hidden');
    if ($('#app').classList.contains('hidden') && localStorage.getItem(HASH_KEY)) enterApp();
  }
});

// Show recovery setup modal after successful first-time vault creation
function promptRecoverySetup() {
  pendingKeyLength = 6;
  $$('.kl-chip').forEach(c => c.classList.toggle('active', c.dataset.len === '6'));
  $('#customLen').classList.add('hidden');
  pendingRecoveryKey = genRecoveryKey(pendingKeyLength);
  $('#recoveryKey').textContent = pendingRecoveryKey;
  updateKeyStrength(pendingKeyLength);
  $('#recQuestion').value = 'pet';
  $('#customQWrap').classList.add('hidden');
  $('#recCustomQ').value = '';
  $('#recAnswer').value = '';
  $('#recoverySetupModal').classList.remove('hidden');
}

// Length chip clicks
$$('.kl-chip').forEach(c => c.addEventListener('click', () => {
  $$('.kl-chip').forEach(x => x.classList.remove('active'));
  c.classList.add('active');
  if (c.dataset.len === 'custom') {
    $('#customLen').classList.remove('hidden');
    $('#customLen').focus();
    pendingKeyLength = parseInt($('#customLen').value) || 6;
  } else {
    $('#customLen').classList.add('hidden');
    pendingKeyLength = parseInt(c.dataset.len);
  }
  pendingKeyLength = Math.max(4, Math.min(128, pendingKeyLength));
  regenerateKey();
}));
$('#customLen').addEventListener('input', e => {
  let v = parseInt(e.target.value) || 0;
  v = Math.max(4, Math.min(128, v));
  pendingKeyLength = v;
  regenerateKey();
});
$('#regenKeyBtn').addEventListener('click', regenerateKey);

$('#recQuestion').addEventListener('change', e => {
  $('#customQWrap').classList.toggle('hidden', e.target.value !== 'custom');
});

$('#copyKeyBtn').addEventListener('click', () => {
  navigator.clipboard.writeText(pendingRecoveryKey).then(() => toast('📋 Recovery key copied'));
});
$('#downloadKeyBtn').addEventListener('click', () => {
  const blob = new Blob([
    `DocVault Recovery Key\n=====================\n\n${pendingRecoveryKey}\n\nKeep this safe! You will need this key to recover your vault if you forget your master password.\n\nGenerated: ${new Date().toLocaleString()}`
  ], { type:'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'docvault-recovery-key.txt';
  a.click();
  toast('⬇ Recovery key downloaded');
});

$('#saveRecBtn').addEventListener('click', async () => {
  // Save recovery key
  localStorage.setItem(REC_KEY_HASH, await sha256(pendingRecoveryKey));
  // Save security Q&A if filled
  const ans = $('#recAnswer').value.trim();
  if (ans) {
    let q = $('#recQuestion').value;
    let qText;
    if (q === 'custom') {
      const custom = $('#recCustomQ').value.trim();
      if (!custom) return toast('Enter your custom question');
      qText = custom;
    } else {
      qText = $('#recQuestion').selectedOptions[0].textContent;
    }
    localStorage.setItem(REC_Q_KEY, qText);
    localStorage.setItem(REC_A_HASH, await sha256(ans.toLowerCase()));
  }
  $('#recoverySetupModal').classList.add('hidden');
  toast('✓ Recovery saved');
  if ($('#app').classList.contains('hidden')) enterApp();
});

$('#skipRecBtn').addEventListener('click', () => {
  $('#recoverySetupModal').classList.add('hidden');
  if ($('#app').classList.contains('hidden')) enterApp();
  toast('💡 You can set up recovery anytime from Settings');
});

// ---------- Forgot password flow ----------
$('#forgotBtn').addEventListener('click', () => {
  if (!localStorage.getItem(HASH_KEY)) return toast('No vault to recover');
  // populate UI
  const hasKey = localStorage.getItem(REC_KEY_HASH);
  const qText = localStorage.getItem(REC_Q_KEY);
  $('#noKeyMsg').textContent = hasKey ? '' : '⚠ No recovery key was set up for this vault.';
  $('#questionDisplay').textContent = qText || 'No security question was set up for this vault.';
  // clear inputs
  ['#recKeyInput','#recNewPass','#recNewPass2','#recAnswerInput','#recQNewPass','#recQNewPass2'].forEach(s => $(s).value = '');
  $('#forgotModal').classList.remove('hidden');
});

// Switch tabs
$$('.rtab').forEach(b => b.addEventListener('click', () => {
  $$('.rtab').forEach(x => x.classList.remove('active'));
  $$('.rtab-panel').forEach(x => x.classList.remove('active'));
  b.classList.add('active');
  document.querySelector(`[data-rpanel="${b.dataset.rtab}"]`).classList.add('active');
}));

// Recover by key
$('#recoverByKeyBtn').addEventListener('click', async () => {
  const key = $('#recKeyInput').value.trim().toUpperCase();
  const np = $('#recNewPass').value;
  const np2 = $('#recNewPass2').value;
  const stored = localStorage.getItem(REC_KEY_HASH);
  if (!stored) return toast('No recovery key set up');
  if (!key) return toast('Enter your recovery key');
  // Accept ANY length the user originally chose. Re-format with dashes every 4.
  let normalized = key.replace(/[\s-]/g, '');
  if (!normalized) return toast('Enter your recovery key');
  normalized = normalized.match(/.{1,4}/g).join('-');
  if (await sha256(normalized) !== stored) return toast('❌ Wrong recovery key');
  if (np.length < 6) return toast('Password must be 6+ characters');
  if (np !== np2) return toast("Passwords don't match");
  localStorage.setItem(HASH_KEY, await sha256(np));
  $('#forgotModal').classList.add('hidden');
  toast('✓ Password reset successfully');
  $('#masterPass').value = np;
  setTimeout(handleUnlock, 400);
});

// Recover by question
$('#recoverByQBtn').addEventListener('click', async () => {
  const ans = $('#recAnswerInput').value.trim().toLowerCase();
  const np = $('#recQNewPass').value;
  const np2 = $('#recQNewPass2').value;
  const stored = localStorage.getItem(REC_A_HASH);
  if (!stored) return toast('No security question set up');
  if (!ans) return toast('Enter your answer');
  if (await sha256(ans) !== stored) return toast('❌ Wrong answer');
  if (np.length < 6) return toast('Password must be 6+ characters');
  if (np !== np2) return toast("Passwords don't match");
  localStorage.setItem(HASH_KEY, await sha256(np));
  $('#forgotModal').classList.add('hidden');
  toast('✓ Password reset successfully');
  $('#masterPass').value = np;
  setTimeout(handleUnlock, 400);
});

// Wipe vault (last resort)
$('#wipeVaultBtn').addEventListener('click', () => {
  if (!confirm('⚠ This will PERMANENTLY DELETE all documents and reset your vault. This cannot be undone.\n\nAre you absolutely sure?')) return;
  const c = prompt('Type "WIPE" to permanently erase your vault:');
  if (c !== 'WIPE') return toast('Cancelled');
  localStorage.removeItem(HASH_KEY);
  localStorage.removeItem(DATA_KEY);
  localStorage.removeItem(REC_KEY_HASH);
  localStorage.removeItem(REC_Q_KEY);
  localStorage.removeItem(REC_A_HASH);
  docs = [];
  $('#forgotModal').classList.add('hidden');
  toast('🗑 Vault wiped — create a new password');
  setTimeout(() => { showLock(); }, 800);
});

// ============ SETTINGS / SECURITY ============
const PREFS_KEY = 'docvault_prefs';
let prefs = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}');
function savePrefs() { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); }

function applyPrefs() {
  document.body.dataset.theme = prefs.theme || 'aurora';
  document.body.dataset.bg = prefs.bg === false ? 'off' : 'on';
  document.body.dataset.banner = prefs.banner === false ? 'off' : 'on';
}
applyPrefs();

// Open settings
$('#settingsBtn').addEventListener('click', () => {
  $('#settingsModal').classList.remove('hidden');
  // sync UI to prefs
  $('#autoLock').value = prefs.autoLock || '0';
  $('#maskToggle').checked = !!prefs.mask;
  $('#dlGuard').checked = !!prefs.dlGuard;
  $('#bgToggle').checked = prefs.bg !== false;
  $('#banToggle').checked = prefs.banner !== false;
  // recovery status
  const hasKey = !!localStorage.getItem(REC_KEY_HASH);
  const hasQ = !!localStorage.getItem(REC_Q_KEY);
  $('#recKeyStatus').classList.toggle('set', hasKey);
  $('#recKeyStatus').querySelector('b').textContent = hasKey ? '✓ Active' : 'Not set';
  $('#recQStatus').classList.toggle('set', hasQ);
  $('#recQStatus').querySelector('b').textContent = hasQ ? '✓ Active' : 'Not set';
  $$('.theme-card').forEach(t => t.classList.toggle('active', t.dataset.theme === (prefs.theme||'aurora')));
  // storage stat
  $('#docCountStat').textContent = docs.length;
  const used = new Blob([JSON.stringify(docs)]).size;
  $('#storageUsed').textContent = used > 1024*1024 ? (used/1024/1024).toFixed(2)+' MB' : Math.round(used/1024)+' KB';
});

// Tabs
$$('.stab').forEach(b => b.addEventListener('click', () => {
  $$('.stab').forEach(x => x.classList.remove('active'));
  $$('.stab-panel').forEach(x => x.classList.remove('active'));
  b.classList.add('active');
  document.querySelector(`[data-panel="${b.dataset.tab}"]`).classList.add('active');
}));

// Password strength
$('#newPass').addEventListener('input', e => {
  const v = e.target.value;
  let score = 0;
  if (v.length >= 6) score++;
  if (v.length >= 10) score++;
  if (/[A-Z]/.test(v) && /[a-z]/.test(v)) score++;
  if (/\d/.test(v)) score++;
  if (/[^A-Za-z0-9]/.test(v)) score++;
  const fills = ['0%','20%','40%','60%','80%','100%'];
  const colors = ['#ff6b81','#ff6b81','#ff9933','#ffcc66','#3ddc97','#3ddc97'];
  const labels = ['—','Very Weak','Weak','Fair','Good','Strong'];
  $('#strengthFill').style.width = fills[score];
  $('#strengthFill').style.background = colors[score];
  $('#strengthText').textContent = 'Strength: ' + labels[score];
});

// Change password
$('#changePassBtn').addEventListener('click', async () => {
  const cur = $('#curPass').value;
  const np = $('#newPass').value;
  const np2 = $('#newPass2').value;
  if (!cur || !np || !np2) return toast('Fill all password fields');
  const stored = localStorage.getItem(HASH_KEY);
  if (await sha256(cur) !== stored) return toast('Current password is wrong');
  if (np.length < 6) return toast('New password must be 6+ characters');
  if (np !== np2) return toast("New passwords don't match");
  localStorage.setItem(HASH_KEY, await sha256(np));
  $('#curPass').value = $('#newPass').value = $('#newPass2').value = '';
  $('#strengthFill').style.width = '0';
  $('#strengthText').textContent = 'Strength: —';
  toast('🔐 Password changed successfully');
  confetti();
});

// Auto-lock
$('#autoLock').addEventListener('change', e => {
  prefs.autoLock = parseInt(e.target.value); savePrefs(); resetAutoLock();
  toast('Auto-lock updated');
});
let lockTimer;
function resetAutoLock() {
  clearTimeout(lockTimer);
  if (prefs.autoLock && prefs.autoLock > 0 && !$('#app').classList.contains('hidden')) {
    lockTimer = setTimeout(() => { lock(); toast('🔒 Auto-locked'); }, prefs.autoLock * 1000);
  }
}
['mousemove','keydown','click'].forEach(ev => document.addEventListener(ev, resetAutoLock));

// Toggles
$('#maskToggle').addEventListener('change', e => { prefs.mask = e.target.checked; savePrefs(); render(); });
$('#dlGuard').addEventListener('change', e => { prefs.dlGuard = e.target.checked; savePrefs(); });
$('#bgToggle').addEventListener('change', e => { prefs.bg = e.target.checked; savePrefs(); applyPrefs(); });
$('#banToggle').addEventListener('change', e => { prefs.banner = e.target.checked; savePrefs(); applyPrefs(); });

// Theme picker
$$('.theme-card').forEach(t => t.addEventListener('click', () => {
  $$('.theme-card').forEach(x => x.classList.remove('active'));
  t.classList.add('active');
  prefs.theme = t.dataset.theme; savePrefs(); applyPrefs();
}));

// Setup/update recovery from Settings
$('#setupRecBtn').addEventListener('click', () => {
  $('#settingsModal').classList.add('hidden');
  promptRecoverySetup();
});

// When recovery is saved from Settings flow, don't enter app — stay
const _saveRec = $('#saveRecBtn').onclick;

// Settings duplicate buttons
$('#exportBtn2')?.addEventListener('click', () => $('#exportBtn').click());
$('#importBtn2')?.addEventListener('click', () => $('#importBtn').click());

// Clear vault
$('#clearVaultBtn').addEventListener('click', () => {
  if (!confirm('⚠ This will permanently delete ALL documents. This cannot be undone.\n\nType OK in the next prompt to confirm.')) return;
  const c = prompt('Type "DELETE" to permanently erase your vault:');
  if (c !== 'DELETE') return toast('Cancelled');
  docs = []; saveDocs(); render();
  $('#settingsModal').classList.add('hidden');
  toast('🗑 Vault cleared');
});

// Mask sensitive numbers in card display
function maskNum(num) {
  if (!num || !prefs.mask) return num;
  const s = String(num);
  if (s.length <= 4) return '****';
  return '••• ••• ' + s.slice(-4);
}
// Hook into view modal display
const _openView = openView;
openView = function(id) {
  _openView(id);
  if (prefs.mask) {
    const dd = document.querySelectorAll('#viewBody dd');
    if (dd[3]) {
      const d = docs.find(x => x.id === id);
      if (d?.number) dd[3].textContent = maskNum(d.number);
    }
  }
};

// ---------- Landing nav burger ----------
(function landingNav() {
  const burger = $('#navBurger');
  const links = $('#navLinks');
  if (!burger || !links) return;
  burger.addEventListener('click', () => {
    burger.classList.toggle('open');
    links.classList.toggle('open');
  });
  // Close on link click
  links.querySelectorAll('a, button').forEach(el => el.addEventListener('click', () => {
    burger.classList.remove('open');
    links.classList.remove('open');
  }));
  // Close on outside click
  document.addEventListener('click', e => {
    if (!burger.contains(e.target) && !links.contains(e.target)) {
      burger.classList.remove('open');
      links.classList.remove('open');
    }
  });
})();

// ---------- Mobile hamburger menu ----------
(function mobileMenu() {
  const toggle = $('#menuToggle');
  const sidebar = document.querySelector('.sidebar');
  if (!toggle || !sidebar) return;
  const backdrop = document.createElement('div');
  backdrop.className = 'sidebar-backdrop';
  document.body.appendChild(backdrop);

  function open() { sidebar.classList.add('open'); backdrop.classList.add('show'); }
  function close() { sidebar.classList.remove('open'); backdrop.classList.remove('show'); }

  toggle.addEventListener('click', () => {
    if (sidebar.classList.contains('open')) close();
    else open();
  });
  backdrop.addEventListener('click', close);
  // Close when clicking a category on mobile
  sidebar.querySelectorAll('.nav li').forEach(li => li.addEventListener('click', () => {
    if (window.innerWidth <= 900) close();
  }));
})();

// ---------- Particle background ----------
(function particles() {
  const c = $('#particles'); if (!c) return;
  // Skip on mobile/touch devices for performance
  if (window.innerWidth <= 760 || ('ontouchstart' in window && window.innerWidth < 1024)) {
    c.style.display = 'none'; return;
  }
  const ctx = c.getContext('2d');
  let w, h, parts = [];
  function resize() {
    w = c.width = window.innerWidth;
    h = c.height = window.innerHeight;
    parts = Array.from({length: 50}, () => ({
      x: Math.random()*w, y: Math.random()*h,
      vx: (Math.random()-.5)*.3, vy: (Math.random()-.5)*.3,
      r: Math.random()*1.5 + .5
    }));
  }
  function draw() {
    ctx.clearRect(0,0,w,h);
    parts.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x<0||p.x>w) p.vx*=-1;
      if (p.y<0||p.y>h) p.vy*=-1;
      ctx.beginPath();
      ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fillStyle = 'rgba(108,140,255,.4)';
      ctx.fill();
    });
    // connections
    for (let i=0;i<parts.length;i++) for (let j=i+1;j<parts.length;j++) {
      const dx = parts[i].x-parts[j].x, dy = parts[i].y-parts[j].y;
      const d = Math.sqrt(dx*dx+dy*dy);
      if (d < 130) {
        ctx.beginPath();
        ctx.moveTo(parts[i].x,parts[i].y);
        ctx.lineTo(parts[j].x,parts[j].y);
        ctx.strokeStyle = `rgba(108,140,255,${.15*(1-d/130)})`;
        ctx.lineWidth = .6;
        ctx.stroke();
      }
    }
    requestAnimationFrame(draw);
  }
  resize(); draw();
  window.addEventListener('resize', resize);
})();
