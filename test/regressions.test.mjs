// Regression coverage for date boundaries, failed storage writes, and employer evidence ranking.
import test from 'node:test';
import assert from 'node:assert/strict';
import { pipelineSummary, today } from '../public/js/formatting.mjs';
import { createApplicationStore } from '../public/js/application-store.mjs';
import resolver from '../src/company-resolver.js';

test('today uses the local calendar at evening and morning boundaries', () => {
  for (const hour of [0, 23]) {
    assert.equal(today(new Date(2026, 8, 14, hour, 30)), '2026-09-14');
  }
});

test('pipeline summary counts all applications and excludes rejected and withdrawn from active', () => {
  assert.equal(
    pipelineSummary([]),
    'There are 0 applications in your pipeline (0 active applications)',
  );
  assert.equal(
    pipelineSummary([{ status: 'Applied' }]),
    'There is 1 application in your pipeline (1 active application)',
  );
  assert.equal(
    pipelineSummary([{ status: 'Rejected' }]),
    'There is 1 application in your pipeline (0 active applications)',
  );
  const applications = ['Offer', 'Interviewing', 'Applied', 'Rejected', 'Withdrawn'].map(
    (status) => ({ status }),
  );
  assert.equal(
    pipelineSummary(applications),
    'There are 5 applications in your pipeline (3 active applications)',
  );
});

test('failed add, edit and remove preserve the saved collection', () => {
  const original = [{ id: 'a', company: 'Acme', createdAt: 1 }];
  const store = createApplicationStore({
    getItem: () => JSON.stringify(original),
    setItem: () => {
      throw Error('quota');
    },
  });
  for (const action of [
    () => store.upsert({ id: 'b' }),
    () => store.upsert({ id: 'a', company: 'Changed' }),
    () => store.remove('a'),
  ]) {
    assert.throws(action, /Could not save/);
    assert.deepEqual(store.all(), original);
  }
});

test('failed Greenhouse lookup never identifies Boards as employer', async () => {
  const result = await resolver.resolveCompany({
    html: '',
    url: 'https://boards.greenhouse.io/acme/jobs/123',
    fetchImpl: async () => {
      throw Error('offline');
    },
  });
  assert.equal(result.name, 'Acme');
  assert.equal(result.confidence, 'low');
});

test('descriptive company metadata outranks a Lever slug', async () => {
  const result = await resolver.resolveCompany({
    html: '<meta property="og:site_name" content="Acme Corporation">',
    url: 'https://jobs.lever.co/acme-inc/123',
  });
  assert.equal(result.name, 'Acme Corporation');
});
