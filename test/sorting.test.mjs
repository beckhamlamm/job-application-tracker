// Verifies every application sorting mode and its recently-added tie-breaking behavior.
import test from 'node:test';
import assert from 'node:assert/strict';
import { sortApplications } from '../public/js/application-sorting.mjs';

const applications = [
  {
    company: 'Beta',
    status: 'Applied',
    dateApplied: '2026-01-02',
    datePosted: '2026-01-01',
    createdAt: 1,
  },
  {
    company: 'alpha',
    status: 'Offer',
    dateApplied: '2026-01-03',
    datePosted: '2026-01-01',
    createdAt: 3,
  },
  {
    company: 'Gamma',
    status: 'Withdrawn',
    dateApplied: '2026-01-01',
    datePosted: '',
    createdAt: 2,
  },
];

test('sorts by application date by default', () => {
  assert.deepEqual(
    sortApplications(applications).map((item) => item.company),
    ['alpha', 'Beta', 'Gamma'],
  );
});

test('sorts companies in both directions', () => {
  assert.deepEqual(
    sortApplications(applications, 'company').map((item) => item.company),
    ['alpha', 'Beta', 'Gamma'],
  );
  assert.deepEqual(
    sortApplications(applications, 'companyReverse').map((item) => item.company),
    ['Gamma', 'Beta', 'alpha'],
  );
});

test('sorts statuses in both priority directions', () => {
  assert.deepEqual(
    sortApplications(applications, 'status').map((item) => item.status),
    ['Offer', 'Applied', 'Withdrawn'],
  );
  assert.deepEqual(
    sortApplications(applications, 'statusReverse').map((item) => item.status),
    ['Withdrawn', 'Applied', 'Offer'],
  );
});

test('places OA between Applied and Interviewing in both status sort directions', () => {
  const statuses = ['Applied', 'OA', 'Interviewing', 'Offer', 'Rejected', 'Withdrawn'];
  const items = statuses.map((status, createdAt) => ({ status, createdAt }));
  assert.deepEqual(
    sortApplications(items, 'status').map((item) => item.status),
    ['Offer', 'Interviewing', 'OA', 'Applied', 'Rejected', 'Withdrawn'],
  );
  assert.deepEqual(
    sortApplications(items, 'statusReverse').map((item) => item.status),
    ['Withdrawn', 'Rejected', 'Applied', 'OA', 'Interviewing', 'Offer'],
  );
});

test('puts missing posted dates last and breaks ties by most recently added', () => {
  assert.deepEqual(
    sortApplications(applications, 'posted').map((item) => item.company),
    ['alpha', 'Beta', 'Gamma'],
  );
});

test('starred applications come first while each group follows the selected sort', () => {
  const mixed = [
    { ...applications[0], starred: true },
    { ...applications[1], starred: true },
    { ...applications[2], starred: false },
  ];
  for (const [mode, expected] of [
    ['applied', ['alpha', 'Beta', 'Gamma']],
    ['posted', ['alpha', 'Beta', 'Gamma']],
    ['companyReverse', ['Beta', 'alpha', 'Gamma']],
    ['statusReverse', ['Beta', 'alpha', 'Gamma']],
  ]) {
    assert.deepEqual(
      sortApplications(mixed, mode).map((item) => item.company),
      expected,
    );
  }
  assert.deepEqual(
    mixed.map((item) => item.company),
    ['Beta', 'alpha', 'Gamma'],
  );
});
