/**
 * app.js – Multi-file version
 * Logic: อัปโหลดหลายไฟล์ → แสดงเฉพาะพนักงานที่ได้คะแนนเต็มในทุกไฟล์
 */
'use strict';

const API_BASE = window.location.origin;

/* ── STATE ── */
let selectedFiles  = [];   // File objects ที่ผู้ใช้เลือก
let fileResults    = [];   // ผลลัพธ์จาก API แต่ละไฟล์ [{filename, data:[...], total_rows, max_scores}]
let allData        = [];   // พนักงานที่ผ่านทุกไฟล์ (intersection)
let filteredData   = [];
let currentPage    = 1;
let rowsPerPage    = 25;
let sortCol        = null;
let sortAsc        = true;

/* ── DOM ── */
const fileInput      = document.getElementById('fileInput');
const dropZone       = document.getElementById('dropZone');
const fileList       = document.getElementById('fileList');
const fileItems      = document.getElementById('fileItems');
const fileCount      = document.getElementById('fileCount');
const clearFilesBtn  = document.getElementById('clearFilesBtn');
const uploadBtn      = document.getElementById('uploadBtn');
const clearBtn       = document.getElementById('clearBtn');
const progressWrap   = document.getElementById('progressWrap');
const progressBar    = document.getElementById('progressBar');
const progressText   = document.getElementById('progressText');
const alertBox       = document.getElementById('alertBox');
const resultsSection = document.getElementById('resultsSection');
const tableBody      = document.getElementById('tableBody');
const emptyState     = document.getElementById('emptyState');
const searchInput    = document.getElementById('searchInput');
const clearSearch    = document.getElementById('clearSearch');
const rowsPerPageSel = document.getElementById('rowsPerPage');
const exportBtn      = document.getElementById('exportBtn');
const pagination     = document.getElementById('pagination');
const paginationInfo = document.getElementById('paginationInfo');
const statFiles      = document.getElementById('statFiles');
const statTotal      = document.getElementById('statTotal');
const statPerfect    = document.getElementById('statPerfect');
const statShowing    = document.getElementById('statShowing');
const scoreColHeader = document.getElementById('scoreColHeader');

/* ══════════════════════════════════════════════
   FILE SELECTION
══════════════════════════════════════════════ */

dropZone.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', () => {
  addFiles(Array.from(fileInput.files));
  fileInput.value = '';
});

dropZone.addEventListener('dragover',  (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', ()  => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  addFiles(Array.from(e.dataTransfer.files));
});

function addFiles(files) {
  const xlsx = files.filter(f => f.name.endsWith('.xlsx'));
  if (xlsx.length < files.length) {
    showAlert('warning', `<i class="bi bi-exclamation-triangle-fill me-2"></i>ไฟล์บางรายการไม่ใช่ .xlsx จะถูกข้ามไป`);
  }
  xlsx.forEach(f => {
    // ไม่เพิ่มซ้ำถ้าชื่อเหมือนกัน
    if (!selectedFiles.find(sf => sf.name === f.name)) {
      selectedFiles.push(f);
    }
  });
  renderFileList();
}

function renderFileList() {
  if (selectedFiles.length === 0) {
    fileList.style.display = 'none';
    uploadBtn.disabled = true;
    return;
  }
  fileList.style.display = 'block';
  fileCount.textContent = selectedFiles.length;
  fileItems.innerHTML = '';
  selectedFiles.forEach((f, i) => {
    const div = document.createElement('div');
    div.className = 'file-item';
    div.id = `file-item-${i}`;
    div.innerHTML = `
      <i class="bi bi-file-earmark-spreadsheet text-success fs-5"></i>
      <span class="file-name">${escapeHtml(f.name)}</span>
      <span class="file-size">${formatBytes(f.size)}</span>
      <span class="file-status" id="status-${i}"></span>
      <button class="btn btn-outline-danger btn-remove btn-sm" onclick="removeFile(${i})">
        <i class="bi bi-x"></i>
      </button>
    `;
    fileItems.appendChild(div);
  });
  uploadBtn.disabled = false;
}

function removeFile(i) {
  selectedFiles.splice(i, 1);
  renderFileList();
  if (selectedFiles.length === 0) hideAlert();
}

clearFilesBtn.addEventListener('click', () => {
  selectedFiles = [];
  renderFileList();
  hideAlert();
});

/* ══════════════════════════════════════════════
   UPLOAD & PROCESS
══════════════════════════════════════════════ */

uploadBtn.addEventListener('click', async () => {
  if (selectedFiles.length === 0) return;

  setLoading(true);
  hideAlert();
  resultsSection.style.display = 'none';
  fileResults = [];

  // อัปโหลดทีละไฟล์
  for (let i = 0; i < selectedFiles.length; i++) {
    const f = selectedFiles[i];
    setFileStatus(i, 'loading', '<i class="bi bi-hourglass-split text-primary"></i> กำลังประมวลผล...');
    setProgress(i, selectedFiles.length);

    const formData = new FormData();
    formData.append('file', f);

    try {
      const res  = await fetch(`${API_BASE}/api/upload`, { method: 'POST', body: formData });
      const json = await res.json();

      if (json.success) {
        fileResults.push({
          filename:   f.name,
          data:       json.data,          // [{รหัสพนักงาน, ชื่อ-สกุล, Score, ...}]
          total_rows: json.total_rows,
          max_scores: json.max_scores || []
        });
        setFileStatus(i, 'success', `<i class="bi bi-check-circle-fill text-success"></i> พบ ${json.data.length} คน (เต็ม)`);
      } else {
        setFileStatus(i, 'error', `<i class="bi bi-x-circle-fill text-danger"></i> ${json.error}`);
      }
    } catch (err) {
      setFileStatus(i, 'error', '<i class="bi bi-wifi-off text-danger"></i> เชื่อมต่อไม่ได้');
    }
  }

  setLoading(false);

  if (fileResults.length === 0) {
    showAlert('danger', '<i class="bi bi-exclamation-triangle-fill me-2"></i>ไม่มีไฟล์ที่ประมวลผลสำเร็จ');
    return;
  }

  // Intersection: หารหัสพนักงานที่ปรากฏในทุกไฟล์
  computeIntersection();
  onDataLoaded();
  clearBtn.style.display = 'inline-block';
});

function computeIntersection() {
  if (fileResults.length === 0) { allData = []; return; }

  // สร้าง Map แต่ละไฟล์: รหัสพนักงาน → record
  const maps = fileResults.map(fr => {
    const m = new Map();
    fr.data.forEach(r => m.set(r['รหัสพนักงาน'], r));
    return { filename: fr.filename, map: m };
  });

  // เอาเฉพาะรหัสที่อยู่ในทุก map
  let ids = [...maps[0].map.keys()];
  for (let k = 1; k < maps.length; k++) {
    ids = ids.filter(id => maps[k].map.has(id));
  }

  // สร้าง allData: หนึ่งแถวต่อพนักงาน พร้อม scores แต่ละไฟล์
  allData = ids.map(id => {
    const base = maps[0].map.get(id);
    const scores = {};
    maps.forEach(({ filename, map }) => {
      scores[filename] = map.get(id)?.['Score'] || '';
    });
    return {
      'รหัสพนักงาน': id,
      'ชื่อ-สกุล':   base['ชื่อ-สกุล'] || '',
      scores          // { filename: scoreStr }
    };
  });
}

/* ══════════════════════════════════════════════
   CLEAR RESULTS
══════════════════════════════════════════════ */

clearBtn.addEventListener('click', () => {
  allData = []; filteredData = []; fileResults = [];
  selectedFiles = [];
  renderFileList();
  clearBtn.style.display = 'none';
  resultsSection.style.display = 'none';
  hideAlert();
});

/* ══════════════════════════════════════════════
   DATA DISPLAY
══════════════════════════════════════════════ */

function onDataLoaded() {
  // อัปเดต header คอลัมน์ score
  if (fileResults.length === 1) {
    scoreColHeader.textContent = 'Score';
  } else {
    scoreColHeader.innerHTML = fileResults.map(fr =>
      `<span class="badge bg-secondary badge-files me-1">${escapeHtml(fr.filename)}</span>`
    ).join('');
  }

  updateStats();
  applyFilter();
  resultsSection.style.display = 'block';

  const totalRows = fileResults.reduce((s, fr) => s + fr.total_rows, 0);
  const fileWord  = fileResults.length > 1 ? `${fileResults.length} ไฟล์` : fileResults[0]?.filename || '';
  showAlert('success',
    `<i class="bi bi-check-circle-fill me-2"></i>ประมวลผลสำเร็จ! ` +
    `พบ <strong>${allData.length}</strong> คน ที่ได้คะแนนเต็มในทุกไฟล์ (${fileWord}, รวม ${totalRows.toLocaleString()} แถว)`
  );
}

function updateStats() {
  const totalRows = fileResults.reduce((s, fr) => s + fr.total_rows, 0);
  statFiles.textContent   = fileResults.length;
  statTotal.textContent   = totalRows.toLocaleString();
  statPerfect.textContent = allData.length.toLocaleString();
}

/* ── SEARCH ── */

searchInput.addEventListener('input', () => { currentPage = 1; applyFilter(); });
clearSearch.addEventListener('click', () => { searchInput.value = ''; currentPage = 1; applyFilter(); });

function applyFilter() {
  const q = searchInput.value.trim().toLowerCase();
  filteredData = q
    ? allData.filter(r =>
        r['ชื่อ-สกุล'].toLowerCase().includes(q) ||
        r['รหัสพนักงาน'].toLowerCase().includes(q))
    : [...allData];

  if (sortCol) applySortToFiltered();
  statShowing.textContent = filteredData.length.toLocaleString();
  renderTable();
}

/* ── SORT ── */

document.querySelectorAll('.sortable').forEach(th => {
  th.addEventListener('click', () => {
    const col = th.dataset.col;
    sortAsc = (sortCol === col) ? !sortAsc : true;
    sortCol = col;
    document.querySelectorAll('.sortable').forEach(el => el.classList.remove('asc', 'desc'));
    th.classList.add(sortAsc ? 'asc' : 'desc');
    applySortToFiltered();
    currentPage = 1;
    renderTable();
  });
});

function applySortToFiltered() {
  filteredData.sort((a, b) => {
    const va = (a[sortCol] || '').toString().toLowerCase();
    const vb = (b[sortCol] || '').toString().toLowerCase();
    return va < vb ? (sortAsc ? -1 : 1) : va > vb ? (sortAsc ? 1 : -1) : 0;
  });
}

/* ── ROWS PER PAGE ── */

rowsPerPageSel.addEventListener('change', () => {
  rowsPerPage = parseInt(rowsPerPageSel.value);
  currentPage = 1;
  renderTable();
});

/* ── RENDER TABLE ── */

function renderTable() {
  tableBody.innerHTML = '';

  if (filteredData.length === 0) {
    emptyState.style.display = 'block';
    document.querySelector('.table-responsive').style.display = 'none';
    renderPagination(0);
    paginationInfo.textContent = 'แสดง 0 จาก 0 รายการ';
    return;
  }

  emptyState.style.display = 'none';
  document.querySelector('.table-responsive').style.display = '';

  const start = (currentPage - 1) * rowsPerPage;
  const end   = Math.min(start + rowsPerPage, filteredData.length);

  filteredData.slice(start, end).forEach((row, idx) => {
    // สร้าง score badges
    let scoreCells = '';
    if (fileResults.length === 1) {
      const sc = Object.values(row.scores)[0] || '';
      scoreCells = `<span class="badge bg-success">${escapeHtml(sc)}</span>`;
    } else {
      scoreCells = fileResults.map(fr => {
        const sc = row.scores[fr.filename] || '';
        return `<span class="badge bg-success me-1" title="${escapeHtml(fr.filename)}">${escapeHtml(sc)}</span>`;
      }).join('');
    }

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="ps-4"><span class="row-num">${start + idx + 1}</span></td>
      <td><span class="emp-badge">${escapeHtml(row['รหัสพนักงาน'] || '')}</span></td>
      <td class="fw-medium">${escapeHtml(row['ชื่อ-สกุล'] || '')}</td>
      <td class="score-col">${scoreCells}</td>
    `;
    tableBody.appendChild(tr);
  });

  paginationInfo.textContent = `แสดง ${start + 1}–${end} จาก ${filteredData.length.toLocaleString()} รายการ`;
  renderPagination(filteredData.length);
}

/* ── PAGINATION ── */

function renderPagination(total) {
  const totalPages = Math.ceil(total / rowsPerPage);
  pagination.innerHTML = '';
  if (totalPages <= 1) return;

  const add = (label, page, disabled = false, active = false) => {
    const li = document.createElement('li');
    li.className = `page-item ${disabled ? 'disabled' : ''} ${active ? 'active' : ''}`;
    const a = document.createElement('a');
    a.className = 'page-link'; a.innerHTML = label;
    if (!disabled && !active) a.addEventListener('click', e => {
      e.preventDefault(); currentPage = page; renderTable();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    li.appendChild(a); pagination.appendChild(li);
  };

  add('<i class="bi bi-chevron-left"></i>', currentPage - 1, currentPage === 1);
  const delta = 2;
  const pages = [];
  for (let i = Math.max(1, currentPage - delta); i <= Math.min(totalPages, currentPage + delta); i++) pages.push(i);
  if (pages[0] > 1) { add('1', 1); if (pages[0] > 2) add('…', null, true); }
  pages.forEach(p => add(p, p, false, p === currentPage));
  if (pages[pages.length-1] < totalPages) {
    if (pages[pages.length-1] < totalPages-1) add('…', null, true);
    add(totalPages, totalPages);
  }
  add('<i class="bi bi-chevron-right"></i>', currentPage + 1, currentPage === totalPages);
}

/* ══════════════════════════════════════════════
   EXPORT
══════════════════════════════════════════════ */

exportBtn.addEventListener('click', async () => {
  if (filteredData.length === 0) { showAlert('warning', 'ไม่มีข้อมูลสำหรับ Export'); return; }

  exportBtn.disabled = true;
  exportBtn.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>กำลัง Export...';

  // แปลง filteredData เป็น flat records สำหรับ export
  const filenames = fileResults.map(fr => fr.filename);
  const exportData = filteredData.map(row => {
    const rec = {
      'รหัสพนักงาน': row['รหัสพนักงาน'],
      'ชื่อ-สกุล':   row['ชื่อ-สกุล']
    };
    filenames.forEach(fn => { rec[fn] = row.scores[fn] || ''; });
    return rec;
  });

  try {
    const res = await fetch(`${API_BASE}/api/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: exportData, columns: ['รหัสพนักงาน', 'ชื่อ-สกุล', ...filenames] })
    });
    if (!res.ok) throw new Error('Export failed');
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'perfect_score_employees.xlsx'; a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    showAlert('danger', 'เกิดข้อผิดพลาดขณะ Export กรุณาลองใหม่');
  } finally {
    exportBtn.disabled = false;
    exportBtn.innerHTML = '<i class="bi bi-file-earmark-excel me-1"></i>Export Excel';
  }
});

/* ══════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════ */

function setLoading(on) {
  progressWrap.style.display = on ? 'block' : 'none';
  uploadBtn.disabled = on;
}

function setProgress(done, total) {
  const pct = Math.round(((done) / total) * 100);
  progressBar.style.width = pct + '%';
  progressText.textContent = `กำลังประมวลผลไฟล์ที่ ${done + 1} / ${total}...`;
}

function setFileStatus(i, cls, html) {
  const item = document.getElementById(`file-item-${i}`);
  const stat = document.getElementById(`status-${i}`);
  if (item) { item.classList.remove('success', 'error', 'loading'); item.classList.add(cls); }
  if (stat) stat.innerHTML = html;
}

function showAlert(type, html) {
  alertBox.className = `alert alert-${type} mt-3 mb-0`;
  alertBox.innerHTML = html;
  alertBox.style.display = 'block';
}

function hideAlert() { alertBox.style.display = 'none'; }

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function formatBytes(b) {
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b/1024).toFixed(1)} KB`;
  return `${(b/1048576).toFixed(1)} MB`;
}
