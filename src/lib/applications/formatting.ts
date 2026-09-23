// Provides shared display, date, and CSV formatting helpers for the browser UI.
import type { Application } from './types';
export function pipelineSummary(applications: Pick<Application, 'status'>[]) {
  const count = applications.length;
  const activeCount = applications.filter(
    ({ status }) => !['Rejected', 'Withdrawn'].includes(status),
  ).length;
  return `${count === 1 ? 'There is' : 'There are'} ${count} ${count === 1 ? 'application' : 'applications'} in your pipeline (${activeCount} active ${activeCount === 1 ? 'application' : 'applications'})`;
}

export function today(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function csvFilename(date = new Date()) {
  const [year, month, day] = today(date).split('-');
  return `ApplyBoard-${month}-${day}-${year}.csv`;
}

export function formatDate(value: string) {
  if (!value) {
    return '—';
  }
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

export function companyInitial(value = '') {
  return value.trim().charAt(0).toUpperCase() || '?';
}

export function applicationsToCsv(applications: Application[]) {
  const fields = ['Company', 'Role', 'URL', 'Date Posted', 'Date Applied', 'Status'];
  const quote = (value: string) => `"${String(value || '').replaceAll('"', '""')}"`;
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
