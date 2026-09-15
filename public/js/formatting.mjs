// Provides shared display, escaping, date, and CSV formatting helpers for the browser UI.
export function today(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function escapeHtml(value = '') {
  const node = document.createElement('div');
  node.textContent = value;
  return node.innerHTML;
}

export function formatDate(value) {
  if (!value) {
    return '—';
  }
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00Z`));
}

export function companyInitial(value = '') {
  return value.trim().charAt(0).toUpperCase() || '?';
}

export function applicationsToCsv(applications) {
  const fields = ['Company', 'Role', 'URL', 'Date Posted', 'Date Applied', 'Status'];
  const quote = (value) => `"${String(value || '').replaceAll('"', '""')}"`;
  const records = applications.map((item) => [
    item.company,
    item.role,
    item.url,
    item.datePosted,
    item.dateApplied,
    item.status,
  ]);
  return [fields, ...records].map((line) => line.map(quote).join(',')).join('\n');
}
