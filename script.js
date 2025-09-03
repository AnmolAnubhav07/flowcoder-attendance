/* ===============================
   Optimized script.js for Campus360/FlowCoder
   Safe, null-checked, single DOMContentLoaded
=============================== */

/* ---------- Utils ---------- */
function formatDateLong(d = new Date()) {
  return d.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
}
function formatTime(d = new Date()) {
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

/* ---------- Toast (non-blocking) ---------- */
function showToast(message, timeout = 3000) {
  let container = document.getElementById('campus-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'campus-toast-container';
    container.style.position = 'fixed';
    container.style.right = '20px';
    container.style.bottom = '20px';
    container.style.zIndex = 9999;
    document.body.appendChild(container);
  }

  const t = document.createElement('div');
  t.textContent = message;
  t.style.cssText = `
    background: rgba(0,0,0,0.8);
    color: #fff;
    padding: 10px 14px;
    border-radius: 10px;
    margin-top: 8px;
    box-shadow: 0 6px 18px rgba(0,0,0,0.12);
    font-size: 13px;
    opacity: 0;
    transition: opacity .18s ease, transform .18s ease;
  `;
  container.appendChild(t);
  requestAnimationFrame(() => {
    t.style.opacity = '1';
    t.style.transform = 'translateY(-4px)';
  });

  setTimeout(() => {
    t.style.opacity = '0';
    t.style.transform = 'translateY(0)';
    setTimeout(() => t.remove(), 220);
  }, timeout);
}

/* ---------- CSV / Download Helpers ---------- */
function downloadBlob(content, filename, mime='text/plain') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function exportCSV(rows = [], filename = 'export.csv') {
  if (!Array.isArray(rows) || rows.length === 0) {
    showToast('No rows to export');
    return;
  }
  const csv = rows.map(r => r.map(cell => {
    if (cell === null || cell === undefined) return '';
    const s = String(cell);
    if (s.includes('"') || s.includes(',') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
    return s;
  }).join(',')).join('\n');
  downloadBlob(csv, filename, 'text/csv');
  showToast('CSV exported: ' + filename);
}

/* ---------- Scan Attendance ---------- */
function scanAttendance(mode = 'QR/Face Scan') {
  const now = new Date();
  const scheduled = new Date(now);
  scheduled.setHours(9, 5, 0, 0);

  const status = now > scheduled ? 'Late' : 'Present';
  const logEntry = { timestamp: now.toISOString(), status, mode, time: formatTime(now) };

  try {
    const raw = localStorage.getItem('campus_attendance_log_v1');
    const arr = raw ? JSON.parse(raw) : [];
    arr.unshift(logEntry);
    localStorage.setItem('campus_attendance_log_v1', JSON.stringify(arr.slice(0, 200)));
  } catch(e) { console.warn('Could not save attendance log', e); }

  showToast(`${mode} → ${status} at ${formatTime(now)}`);
  document.querySelectorAll('.today-status, #today-status, .status-badge').forEach(el => el.textContent = status);
  const alerts = document.querySelector('.alert-box ul');
  if (alerts) {
    const li = document.createElement('li');
    li.textContent = `Attendance ${status} recorded at ${formatTime(now)} via ${mode}`;
    alerts.prepend(li);
  }
}

function attachScanButtons() {
  const scanEls = document.querySelectorAll('[data-scan], #scan-attendance, #scan-btn');
  scanEls.forEach(el => el.addEventListener('click', () => {
    const mode = el.getAttribute('data-scan') || el.id || 'Scan';
    scanAttendance(mode);
  }));
  window.scanAttendance = scanAttendance;
}

/* ---------- Notes Helpers ---------- */
function saveNote(key = 'campus_note', text = '') {
  try { localStorage.setItem(key, text); showToast('Note saved'); }
  catch(e) { showToast('Unable to save note'); }
}

function loadNote(key = 'campus_note') {
  try { return localStorage.getItem(key) || ''; } catch(e){ return ''; }
}

function restoreNotesIfAny() {
  const possibleIds = ['notes-area', 'note-area', 'class-notes', 'notes'];
  possibleIds.forEach(id => {
    const el = document.getElementById(id);
    if (el && el.tagName === 'TEXTAREA') {
      const saved = loadNote('campus_note_' + id);
      if(saved) el.value = saved;
      el.addEventListener('input', () => saveNote('campus_note_' + id, el.value));
    }
  });
}

/* ---------- Sidebar Toggle ---------- */
function attachSidebarToggle() {
  const toggleBtn = document.querySelector('.menu-toggle');
  const sidebar = document.querySelector('.sidebar');
  if(toggleBtn && sidebar){
    toggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('active');
      document.body.classList.toggle('sidebar-open');
    });
  }
}

/* ---------- Copy to Clipboard ---------- */
function copyToClipboard(text) {
  if (!navigator.clipboard) {
    const t = document.createElement('textarea');
    t.value = text;
    document.body.appendChild(t);
    t.select();
    try { document.execCommand('copy'); showToast('Copied'); } catch(e) { showToast('Copy failed'); }
    t.remove();
    return;
  }
  navigator.clipboard.writeText(text).then(() => showToast('Copied to clipboard'), () => showToast('Copy failed'));
}

/* ---------- Keyboard Shortcuts ---------- */
(function attachShortcuts(){
  let gPressed = false;
  document.addEventListener('keydown', (e) => {
    if(e.key === 'g'){ gPressed = true; setTimeout(() => gPressed = false, 800);}
    else if(gPressed && (e.key==='d' || e.key==='D')) window.location.href='index.html';
    else if(e.key==='?') showToast('Shortcuts: g + d → Dashboard | ? → Help', 3500);
  });
})();

/* ---------- Auto-bind CSV buttons ---------- */
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-download-csv]');
  if(!el) return;
  const v = el.getAttribute('data-download-csv');
  if(!v) return;
  const [tableId, filename] = v.split(',').map(s => s.trim());
  const table = document.getElementById(tableId);
  if(!table) return showToast('Table not found: ' + tableId);
  const rows = Array.from(table.querySelectorAll('tr')).map(r => Array.from(r.querySelectorAll('th,td')).map(td => td.innerText.trim()));
  exportCSV(rows, filename || 'table.csv');
});

/* ---------- DOMContentLoaded ---------- */
document.addEventListener('DOMContentLoaded', () => {
  // Dates
  const txt = formatDateLong();
  document.querySelectorAll('#date, #today-date').forEach(e => e.textContent = txt);

  // Buttons & Features
  attachScanButtons();
  attachSidebarToggle();
  restoreNotesIfAny();

  // Profile Pic
  const profilePic = document.getElementById('profilePic');
  const settingsBtn = document.getElementById('settingsBtn');
  const fileInput = document.getElementById('fileInput');

  if(settingsBtn && fileInput) settingsBtn.addEventListener('click', ()=>fileInput.click());
  if(profilePic && fileInput) profilePic.addEventListener('click', ()=>fileInput.click());

  if(fileInput && profilePic){
    fileInput.addEventListener('change', () => {
      const file = fileInput.files[0];
      if(file){
        const reader = new FileReader();
        reader.onload = e => profilePic.src = e.target.result;
        reader.readAsDataURL(file);
        localStorage.setItem('campus_profile_pic', reader.result);
        showToast('Profile picture updated!');
      }
    });
  }

  // Restore saved profile pic
  const savedPic = localStorage.getItem('campus_profile_pic');
  if(savedPic && profilePic) profilePic.src = savedPic;
});

/* ---------- Debug Helpers ---------- */
window._campus = {
  getAttendanceLog() { try { return JSON.parse(localStorage.getItem('campus_attendance_log_v1')||'[]'); } catch(e){return [];} },
  clearAttendanceLog() { localStorage.removeItem('campus_attendance_log_v1'); showToast('Attendance log cleared'); },
  getNotes(key){ return loadNote(key); },
  clearAll(){ localStorage.clear(); showToast('Local storage cleared'); }
};

window.showToast = showToast;
window.exportCSV = exportCSV;
window.downloadBlob = downloadBlob;
window.saveNote = saveNote;
window.loadNote = loadNote;
window.copyToClipboard = copyToClipboard;
window.scanAttendance = scanAttendance;

