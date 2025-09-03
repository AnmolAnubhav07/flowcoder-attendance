/* script.js
   Shared frontend helpers for Campus360 demo pages.
   - Shows today's date on elements with id="date" or id="today-date"
   - scanAttendance() simulates QR/Face scan and logs to localStorage
   - exportCSV(rows, filename) downloads CSV client-side
   - saveNote/loadNote for simple note persistence
   - showToast(msg) small non-blocking toast
   - downloadBlob helper
   - mobile sidebar toggle (if you add button with id="toggle-sidebar")
*/

/* ---------- Utils ---------- */
function formatDateLong(d = new Date()) {
  return d.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
}
function formatTime(d = new Date()) {
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

/* ---------- Date Initialization ---------- */
function setPageDates() {
  const txt = formatDateLong(new Date());
  const els1 = document.querySelectorAll('#date');
  const els2 = document.querySelectorAll('#today-date');
  els1.forEach(e => e.textContent = txt);
  els2.forEach(e => e.textContent = txt);
}

// Call on load
document.addEventListener('DOMContentLoaded', () => {
  setPageDates();
  attachScanButtons();
  attachSidebarToggle();
  restoreNotesIfAny();
});

/* ---------- Toast (non-blocking alert) ---------- */
function showToast(message, timeout = 3000) {
  // create container if missing
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
  t.style.background = 'rgba(0,0,0,0.8)';
  t.style.color = '#fff';
  t.style.padding = '10px 14px';
  t.style.borderRadius = '10px';
  t.style.marginTop = '8px';
  t.style.boxShadow = '0 6px 18px rgba(0,0,0,0.12)';
  t.style.fontSize = '13px';
  t.style.opacity = '0';
  t.style.transition = 'opacity .18s ease, transform .18s ease';
  container.appendChild(t);

  // entrance
  requestAnimationFrame(() => {
    t.style.opacity = '1';
    t.style.transform = 'translateY(-4px)';
  });

  setTimeout(() => {
    // exit
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
  // simple CSV escape for commas/quotes
  const csv = rows.map(r => r.map(cell => {
    if (cell === null || cell === undefined) return '';
    const s = String(cell);
    if (s.includes('"') || s.includes(',') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  }).join(',')).join('\n');
  downloadBlob(csv, filename, 'text/csv');
  showToast('CSV exported: ' + filename);
}

/* ---------- Scan Attendance (simulate QR/Face) ---------- */
function attachScanButtons() {
  // attach to any element with data-scan attribute or id scan-attendance
  const scanEls = document.querySelectorAll('[data-scan], #scan-attendance, #scan-btn');
  scanEls.forEach(el => {
    el.addEventListener('click', () => {
      // mode can be specified
      const mode = el.getAttribute('data-scan') || el.id || 'Scan';
      scanAttendance(mode);
    });
  });

  // keep compatibility with pages that call scanAttendance() directly
  window.scanAttendance = scanAttendance;
}

function scanAttendance(mode = 'QR/Face Scan') {
  const now = new Date();
  // simple business rule: if after 09:05 mark late
  const scheduledHour = 9;
  const scheduled = new Date(now);
  scheduled.setHours(scheduledHour, 5, 0, 0); // 09:05

  const status = now > scheduled ? 'Late' : 'Present';
  const logEntry = { timestamp: now.toISOString(), status, mode, time: formatTime(now) };

  // persist in simple localStorage log
  try {
    const raw = localStorage.getItem('campus_attendance_log_v1');
    const arr = raw ? JSON.parse(raw) : [];
    arr.unshift(logEntry);
    localStorage.setItem('campus_attendance_log_v1', JSON.stringify(arr.slice(0, 200))); // keep limit
  } catch(e) {
    console.warn('Could not save attendance log', e);
  }

  showToast(`${mode} → ${status} at ${formatTime(now)}`);
  // If page contains an element to show today's status, update it
  const todayStatusEls = document.querySelectorAll('.today-status, #today-status, .status-badge');
  todayStatusEls.forEach(el => el.textContent = status);
  // If there is a system alert area, append a small entry
  const alerts = document.querySelector('.alert-box ul');
  if (alerts) {
    const li = document.createElement('li');
    li.textContent = `Attendance ${status} recorded at ${formatTime(now)} via ${mode}`;
    alerts.prepend(li);
  }
}

/* ---------- Note helpers (generic) ---------- */
function saveNote(key = 'campus_note', text = '') {
  try {
    localStorage.setItem(key, text);
    showToast('Note saved');
  } catch(e) {
    console.warn('Could not save note', e);
    showToast('Unable to save note');
  }
}
function loadNote(key = 'campus_note') {
  try {
    return localStorage.getItem(key) || '';
  } catch(e) {
    return '';
  }
}
function restoreNotesIfAny() {
  // common note box IDs used across pages: notes-area, note-area, class-notes
  const possibleIds = ['notes-area', 'note-area', 'class-notes', 'notes'];
  possibleIds.forEach(id => {
    const el = document.getElementById(id);
    if (el && el.tagName === 'TEXTAREA') {
      const saved = loadNote('campus_note_' + (id || 'default'));
      if (saved) el.value = saved;
      // optionally auto-save on change
      el.addEventListener('input', () => {
        saveNote('campus_note_' + id, el.value);
      });
    }
  });
}

/* ---------- Sidebar toggle for mobile ---------- */
function attachSidebarToggle() {
  const toggleBtn = document.getElementById('toggle-sidebar');
  if (!toggleBtn) return;
  toggleBtn.addEventListener('click', () => {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;
    sidebar.classList.toggle('open');
    // optional body class
    document.body.classList.toggle('sidebar-open');
  });
}

/* ---------- Utility: copy text to clipboard ---------- */
function copyToClipboard(text) {
  if (!navigator.clipboard) {
    // fallback
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

/* ---------- Helpers to be used by page scripts ---------- */
window.showToast = showToast;
window.exportCSV = exportCSV;
window.downloadBlob = downloadBlob;
window.saveNote = saveNote;
window.loadNote = loadNote;
window.copyToClipboard = copyToClipboard;

/* ---------- Small convenience: auto-bind "data-download-csv" buttons ----------
   If a button has data-download-csv="tableId,filename.csv" it will gather table rows and download CSV.
*/
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-download-csv]');
  if (!el) return;
  const v = el.getAttribute('data-download-csv');
  if (!v) return;
  const [tableId, filename] = v.split(',').map(s => s && s.trim());
  if (!tableId) return showToast('No table id specified');
  const table = document.getElementById(tableId);
  if (!table) return showToast('Table not found: ' + tableId);
  // read table rows
  const rows = [];
  for (const r of table.querySelectorAll('tr')) {
    const cells = Array.from(r.querySelectorAll('th,td')).map(td => td.innerText.trim());
    rows.push(cells);
  }
  exportCSV(rows, filename || 'table.csv');
});

/* ---------- Small keyboard shortcuts (for power users) ----------
   - Press "g" then "d" to go to Dashboard (index.html)
   - Press "?" to show a quick help toast
*/
(function attachShortcuts(){
  let gPressed = false;
  document.addEventListener('keydown', (e) => {
    if (e.key === 'g') { gPressed = true; setTimeout(() => gPressed = false, 800); }
    else if (gPressed && (e.key === 'd' || e.key === 'D')) {
      window.location.href = 'index.html';
    } else if (e.key === '?') {
      showToast('Shortcuts: g + d → Dashboard | ? → Help', 3500);
    }
  });
})();

/* ---------- Debug helper (expose a console-friendly dump) ---------- */
window._campus = {
  getAttendanceLog() {
    try { return JSON.parse(localStorage.getItem('campus_attendance_log_v1') || '[]'); } catch(e) { return []; }
  },
  clearAttendanceLog() { localStorage.removeItem('campus_attendance_log_v1'); showToast('Attendance log cleared'); },
  getNotes(key) { return loadNote(key); },
  clearAll() { localStorage.clear(); showToast('Local storage cleared'); }
};
/* ---------- Profile Picture Change ---------- */
const profilePic = document.getElementById('profilePic');
const settingsBtn = document.getElementById('settingsBtn');
const fileInput = document.getElementById('fileInput');

// Click on settings or profile pic opens file picker
settingsBtn.addEventListener('click', () => fileInput.click());
profilePic.addEventListener('click', () => fileInput.click());

// Update profile picture dynamically
fileInput.addEventListener('change', () => {
  const file = fileInput.files[0];
  if(file){
    const reader = new FileReader();
    reader.onload = e => profilePic.src = e.target.result;
    reader.readAsDataURL(file);

    // Save in localStorage to persist across reloads
    localStorage.setItem('campus_profile_pic', reader.result);

    showToast('Profile picture updated!');
  }
});

// On page load, restore saved profile pic if any
document.addEventListener('DOMContentLoaded', () => {
  const savedPic = localStorage.getItem('campus_profile_pic');
  if(savedPic) profilePic.src = savedPic;
});
function toggleMenu() {
  document.querySelector(".sidebar").classList.toggle("active");
}

