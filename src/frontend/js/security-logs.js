// #COMPLETION_DRIVE: Building a lightweight admin logs UI without polluting global scope
// #SUGGEST_VERIFY: If switching to modules/React later, port this into a component
(function () {
  const state = { currentPage: 1, pageSize: 10, currentSeverity: '' };

function showToast(message, type = 'info', timeout = 3000) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const msg = document.createElement('div');
  msg.className = 'toast-message';
  msg.textContent = message;
  const close = document.createElement('button');
  close.className = 'toast-close';
  close.innerHTML = '×';
  close.addEventListener('click', () => container.removeChild(toast));
  toast.appendChild(msg);
  toast.appendChild(close);
  container.appendChild(toast);
  setTimeout(() => { if (toast.parentElement === container) container.removeChild(toast); }, timeout);
}



async function loadAndRenderLogs() {
  try {
  const headers = {};
    const params = new URLSearchParams();
  params.set('page', String(state.currentPage));
  params.set('limit', String(state.pageSize));
  if (state.currentSeverity) params.set('severity', state.currentSeverity);

  const res = await fetch(`/api/admin/security-logs?${params.toString()}`, { headers });
  let data = { success: false };
  try { data = await res.json(); } catch (_) { data = { success: false }; }
  if (!data || !data.success) throw new Error('Failed to load logs');
  renderLogs(Array.isArray(data.logs) ? data.logs : []);
  } catch (error) {
    console.error('Load logs failed:', error);
    showToast('Failed to load logs', 'error');
  }
}

function renderLogs(rows) {
  const tbody = document.getElementById('logsBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (!rows.length) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 7;
    td.textContent = 'No logs found';
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  rows.forEach(l => {
    const tr = document.createElement('tr');
    tr.style.borderBottom = '1px solid rgba(101,90,124,0.1)';
    const ts = l && l.timestamp ? new Date(l.timestamp).toLocaleString() : '-';
    const sev = (l && l.severity ? l.severity : 'info').toLowerCase();
    const sevBadge = `<span style="padding:.2rem .4rem;border-radius:.4rem;background:${sev==='error'?'#fdd':'#CEF9F2'};color:${sev==='error'?'#900':'#655A7C'};font-weight:600;text-transform:uppercase;font-size:.75rem;">${sev}</span>`;
    const user = (l && l.userFullName) ? `${l.userFullName} (@${l.userUsername})` : '-';
    const emp = (l && l.employeeFullName) ? `${l.employeeFullName} (@${l.employeeUsername})` : '-';
    const details = (l && l.details) ? String(l.details) : '';

    tr.innerHTML = `
      <td class="form-label" style="font-weight: 500;">${ts}</td>
      <td>${sevBadge}</td>
      <td>${l.action}</td>
      <td>${user}</td>
      <td>${emp}</td>
      <td>${l.ipAddress || '-'}</td>
      <td><div style="max-width:480px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${details.replace(/\"/g,'&quot;')}">${details}</div></td>
    `;
    tbody.appendChild(tr);
  });

  const pageIndicator = document.getElementById('pageIndicator');
  if (pageIndicator) pageIndicator.textContent = `Page ${state.currentPage}`;
}

function bindControls() {
  const severityFilter = document.getElementById('severityFilter');
  const pageSizeSel = document.getElementById('pageSize');
  const prevBtn = document.getElementById('prevPageBtn');
  const nextBtn = document.getElementById('nextPageBtn');
  const refreshBtn = document.getElementById('refreshLogsBtn');
  const goToPaymentBtn = document.getElementById('goToPaymentBtn');

  if (severityFilter) severityFilter.addEventListener('change', async () => { state.currentSeverity = severityFilter.value; state.currentPage = 1; await loadAndRenderLogs(); });
  if (pageSizeSel) pageSizeSel.addEventListener('change', async () => { state.pageSize = Number(pageSizeSel.value) || 10; state.currentPage = 1; await loadAndRenderLogs(); });
  if (prevBtn) prevBtn.addEventListener('click', async () => { if (state.currentPage > 1) { state.currentPage--; await loadAndRenderLogs(); } });
  if (nextBtn) nextBtn.addEventListener('click', async () => { state.currentPage++; await loadAndRenderLogs(); });
  if (refreshBtn) refreshBtn.addEventListener('click', loadAndRenderLogs);
  if (goToPaymentBtn) goToPaymentBtn.addEventListener('click', () => { if (globalThis.location) globalThis.location.href = '/view-payments'; });
}

(function init() {
  bindControls();
  loadAndRenderLogs();
})();

})();
