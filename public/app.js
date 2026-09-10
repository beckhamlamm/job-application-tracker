const STORAGE_KEY = 'applyboard.applications.v1';
const $ = (selector) => document.querySelector(selector);
const rows = $('#applicationRows');
const dialog = $('#applicationDialog');
let applications = load();

function load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; }
}
function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(applications)); render(); }
function today() { return new Date().toISOString().slice(0, 10); }
function escapeHtml(value = '') { const node = document.createElement('div'); node.textContent = value; return node.innerHTML; }
function formatDate(value) { return value ? new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`)) : '—'; }
function initial(value = '') { return value.trim().charAt(0).toUpperCase() || '?'; }
function toast(message) { const el = $('#toast'); el.textContent = message; el.classList.add('visible'); clearTimeout(toast.timer); toast.timer = setTimeout(() => el.classList.remove('visible'), 2200); }

function render() {
  const term = $('#searchInput').value.trim().toLowerCase();
  const visible = applications.filter((item) => [item.company, item.role, item.status].some((value) => value?.toLowerCase().includes(term)));
  const count = applications.length;
  $('#applicationCount').textContent = `${count === 1 ? 'There is' : 'There are'} ${count} ${count === 1 ? 'application' : 'applications'} in your pipeline`;
  $('#emptyState').hidden = visible.length > 0;
  rows.innerHTML = visible.map((item) => `
    <tr>
      <td><div class="company-cell"><span class="company-mark">${escapeHtml(initial(item.company))}</span>${escapeHtml(item.company)}</div></td>
      <td>${item.url ? `<a class="role-link" href="${escapeHtml(item.url)}" target="_blank" rel="noopener">${escapeHtml(item.role)} ↗</a>` : `<span class="role-link">${escapeHtml(item.role)}</span>`}</td>
      <td class="date">${formatDate(item.datePosted)}</td><td class="date">${formatDate(item.dateApplied)}</td>
      <td><span class="status ${item.status.toLowerCase()}">${escapeHtml(item.status)}</span></td>
      <td><div class="row-actions"><button class="icon-button edit" data-id="${item.id}" aria-label="Edit">✎</button><button class="icon-button delete" data-id="${item.id}" aria-label="Delete">×</button></div></td>
    </tr>`).join('');
}

function openDialog(item = {}) {
  $('#dialogTitle').textContent = item.id ? 'Edit application' : 'Add an application';
  $('#editId').value = item.id || '';
  $('#jobUrl').value = item.url || '';
  $('#company').value = item.company || '';
  $('#role').value = item.role || '';
  $('#datePosted').value = item.datePosted || '';
  $('#dateApplied').value = item.dateApplied || today();
  $('#status').value = item.status || 'Applied';
  dialog.showModal();
  setTimeout(() => (item.company ? $('#company') : $('#jobUrl')).focus(), 0);
}

$('#urlForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = $('#trackButton'); const message = $('#formMessage'); const url = $('#urlInput').value.trim();
  button.disabled = true; button.innerHTML = 'Reading job page…'; message.classList.remove('error');
  try {
    const response = await fetch('/api/parse', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    openDialog({ ...data, dateApplied: today(), status: 'Applied' });
    message.textContent = 'Details found. Review them before saving.';
  } catch (error) {
    openDialog({ url, dateApplied: today(), status: 'Applied' });
    message.textContent = error.message || 'We could not read that page. Add the details manually.'; message.classList.add('error');
  } finally { button.disabled = false; button.innerHTML = 'Track application <span>→</span>'; }
});

$('#applicationForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const id = $('#editId').value || crypto.randomUUID();
  const item = { id, url: $('#jobUrl').value.trim(), company: $('#company').value.trim(), role: $('#role').value.trim(), datePosted: $('#datePosted').value, dateApplied: $('#dateApplied').value, status: $('#status').value };
  const index = applications.findIndex((entry) => entry.id === id);
  if (index >= 0) applications[index] = item; else applications.unshift(item);
  save(); dialog.close(); $('#urlInput').value = ''; toast(index >= 0 ? 'Application updated' : 'Application added');
});

rows.addEventListener('click', (event) => {
  const id = event.target.dataset.id; if (!id) return;
  const item = applications.find((entry) => entry.id === id);
  if (event.target.classList.contains('edit')) openDialog(item);
  if (event.target.classList.contains('delete') && confirm(`Remove ${item.role} at ${item.company}?`)) { applications = applications.filter((entry) => entry.id !== id); save(); toast('Application removed'); }
});

$('#manualButton').addEventListener('click', () => openDialog());
$('#closeDialog').addEventListener('click', () => dialog.close());
$('#cancelDialog').addEventListener('click', () => dialog.close());
$('#searchInput').addEventListener('input', render);
$('#exportButton').addEventListener('click', () => {
  if (!applications.length) return toast('Add an application before exporting');
  const fields = ['Company', 'Role', 'URL', 'Date Posted', 'Date Applied', 'Status'];
  const quote = (value) => `"${String(value || '').replaceAll('"', '""')}"`;
  const csv = [fields, ...applications.map((a) => [a.company, a.role, a.url, a.datePosted, a.dateApplied, a.status])].map((line) => line.map(quote).join(',')).join('\n');
  const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); link.download = `applications-${today()}.csv`; link.click(); URL.revokeObjectURL(link.href); toast('CSV exported');
});

render();
