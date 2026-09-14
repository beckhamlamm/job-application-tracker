// Coordinates the Applyboard UI, including forms, rendering, URL parsing, and CSV export.
import { createApplicationStore } from './js/application-store.mjs';
import { sortApplications } from './js/application-sorting.mjs';
import { applicationsToCsv, companyInitial, escapeHtml, formatDate, today } from './js/formatting.mjs';

const $ = (selector) => document.querySelector(selector);
const rows = $('#applicationRows');
const dialog = $('#applicationDialog');
const store = createApplicationStore(localStorage);

function toast(message) {
  const element = $('#toast');
  element.textContent = message;
  element.classList.add('visible');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => element.classList.remove('visible'), 2200);
}

function matchesSearch(item, term) {
  return [item.company, item.role, item.status]
    .some((value) => value?.toLowerCase().includes(term));
}

function applicationRow(item) {
  const role = item.url
    ? `<a class="role-link" href="${escapeHtml(item.url)}" target="_blank" rel="noopener">${escapeHtml(item.role)} ↗</a>`
    : `<span class="role-link">${escapeHtml(item.role)}</span>`;
  return `<tr>
    <td><div class="company-cell"><span class="company-mark">${escapeHtml(companyInitial(item.company))}</span>${escapeHtml(item.company)}</div></td>
    <td>${role}</td>
    <td class="date">${formatDate(item.datePosted)}</td><td class="date">${formatDate(item.dateApplied)}</td>
    <td><span class="status ${item.status.toLowerCase()}">${escapeHtml(item.status)}</span></td>
    <td><div class="row-actions"><button class="icon-button edit" data-id="${item.id}" aria-label="Edit">✎</button><button class="icon-button delete" data-id="${item.id}" aria-label="Delete">×</button></div></td>
  </tr>`;
}

function render() {
  const applications = store.all();
  const term = $('#searchInput').value.trim().toLowerCase();
  const visible = sortApplications(applications.filter((item) => matchesSearch(item, term)), $('#sortSelect').value);
  const count = applications.length;
  $('#applicationCount').textContent = `${count === 1 ? 'There is' : 'There are'} ${count} ${count === 1 ? 'application' : 'applications'} in your pipeline`;
  $('#emptyState').hidden = visible.length > 0;
  rows.innerHTML = visible.map(applicationRow).join('');
}

function openDialog(item = {}) {
  $('#dialogTitle').textContent = item.id ? 'Edit application' : 'Add an application';
  $('#editId').value = item.id || '';
  $('#jobUrl').value = item.url || '';
  $('#company').value = item.company || '';
  $('#companySourceValue').value = item.companySource || '';
  $('#companyConfidence').value = item.companyConfidence || '';
  showCompanySource(item.companySource, item.companyConfidence);
  $('#role').value = item.role || '';
  $('#datePosted').value = item.datePosted || '';
  $('#dateApplied').value = item.dateApplied || today();
  $('#status').value = item.status || 'Applied';
  dialog.showModal();
  setTimeout(() => (item.company ? $('#company') : $('#jobUrl')).focus(), 0);
}

function showCompanySource(source, confidence) {
  const note = $('#companySource');
  note.textContent = source ? `Found via ${source} · ${confidence || 'unknown'} confidence` : '';
  note.className = `field-note ${confidence || ''}`;
}

async function parseJobUrl(url) {
  const response = await fetch('/api/parse', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  return data;
}

$('#urlForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = $('#trackButton');
  const message = $('#formMessage');
  const url = $('#urlInput').value.trim();
  button.disabled = true;
  button.textContent = 'Reading job page…';
  message.classList.remove('error');
  try {
    openDialog({ ...await parseJobUrl(url), dateApplied: today(), status: 'Applied' });
    message.textContent = 'Details found. Review them before saving.';
  } catch (error) {
    openDialog({ url, dateApplied: today(), status: 'Applied' });
    message.textContent = error.message || 'We could not read that page. Add the details manually.';
    message.classList.add('error');
  } finally {
    button.disabled = false;
    button.innerHTML = 'Track application <span>→</span>';
  }
});

$('#applicationForm').addEventListener('submit', (event) => {
  event.preventDefault();
  try {
  const result = store.upsert({
    id: $('#editId').value || crypto.randomUUID(), url: $('#jobUrl').value.trim(),
    company: $('#company').value.trim(), role: $('#role').value.trim(),
    datePosted: $('#datePosted').value, dateApplied: $('#dateApplied').value, status: $('#status').value,
    companySource: $('#companySourceValue').value, companyConfidence: $('#companyConfidence').value,
  });
  render();
  dialog.close();
  $('#urlInput').value = '';
  toast(`Application ${result}`);
  } catch (error) { alert(error.message); }
});

rows.addEventListener('click', (event) => {
  const id = event.target.dataset.id;
  if (!id) return;
  const item = store.find(id);
  if (event.target.classList.contains('edit')) openDialog(item);
  if (event.target.classList.contains('delete') && confirm(`Remove ${item.role} at ${item.company}?`)) {
    try { store.remove(id); }
    catch (error) { alert(error.message); return; }
    render();
    toast('Application removed');
  }
});

$('#manualButton').addEventListener('click', () => openDialog());
$('#company').addEventListener('input', () => {
  $('#companySourceValue').value = 'manual review';
  $('#companyConfidence').value = 'high';
  showCompanySource('manual review', 'high');
});
$('#closeDialog').addEventListener('click', () => dialog.close());
$('#cancelDialog').addEventListener('click', () => dialog.close());
$('#searchInput').addEventListener('input', render);
$('#sortSelect').addEventListener('change', render);
$('#exportButton').addEventListener('click', () => {
  const applications = store.all();
  if (!applications.length) return toast('Add an application before exporting');
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([applicationsToCsv(applications)], { type: 'text/csv' }));
  link.download = `applications-${today()}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
  toast('CSV exported');
});

render();
