import test from 'node:test';
import assert from 'node:assert/strict';
import { sortApplications } from '../public/js/application-sorting.mjs';

const applications = [
  { company: 'Beta', status: 'Applied', dateApplied: '2026-01-02', datePosted: '2026-01-01', createdAt: 1 },
  { company: 'alpha', status: 'Offer', dateApplied: '2026-01-03', datePosted: '2026-01-01', createdAt: 3 },
  { company: 'Gamma', status: 'Withdrawn', dateApplied: '2026-01-01', datePosted: '', createdAt: 2 },
];

test('sorts by application date by default', () => {
  assert.deepEqual(sortApplications(applications).map((item) => item.company), ['alpha', 'Beta', 'Gamma']);
});

test('sorts companies in both directions', () => {
  assert.deepEqual(sortApplications(applications, 'company').map((item) => item.company), ['alpha', 'Beta', 'Gamma']);
  assert.deepEqual(sortApplications(applications, 'companyReverse').map((item) => item.company), ['Gamma', 'Beta', 'alpha']);
});

test('sorts statuses in both priority directions', () => {
  assert.deepEqual(sortApplications(applications, 'status').map((item) => item.status), ['Offer', 'Applied', 'Withdrawn']);
  assert.deepEqual(sortApplications(applications, 'statusReverse').map((item) => item.status), ['Withdrawn', 'Applied', 'Offer']);
});

test('puts missing posted dates last and breaks ties by most recently added', () => {
  assert.deepEqual(sortApplications(applications, 'posted').map((item) => item.company), ['alpha', 'Beta', 'Gamma']);
});
