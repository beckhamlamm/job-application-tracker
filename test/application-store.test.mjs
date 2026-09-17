// Verifies application persistence, updates, creation timestamps, and removal behavior.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createApplicationStore } from '../public/js/application-store.mjs';

function memoryStorage(initial = null) {
  let value = initial;
  return {
    getItem: () => value,
    setItem: (_key, next) => {
      value = next;
    },
    value: () => value,
  };
}

test('adds and persists an application', () => {
  const storage = memoryStorage();
  const store = createApplicationStore(storage);
  assert.equal(store.upsert({ id: '1', company: 'Acme' }), 'added');
  assert.equal(JSON.parse(storage.value())[0].company, 'Acme');
  assert.ok(store.find('1').createdAt);
});

test('preserves creation time when updating an application', () => {
  const storage = memoryStorage(JSON.stringify([{ id: '1', company: 'Acme', createdAt: 42 }]));
  const store = createApplicationStore(storage);
  assert.equal(store.upsert({ id: '1', company: 'Acme Labs' }), 'updated');
  assert.equal(store.find('1').createdAt, 42);
});

test('removes and persists an application', () => {
  const storage = memoryStorage(JSON.stringify([{ id: '1', company: 'Acme', createdAt: 42 }]));
  const store = createApplicationStore(storage);
  store.remove('1');
  assert.deepEqual(store.all(), []);
  assert.deepEqual(JSON.parse(storage.value()), []);
});

test('starring persists and survives edits without changing creation time', () => {
  const storage = memoryStorage(JSON.stringify([{ id: '1', company: 'Acme', createdAt: 42 }]));
  const store = createApplicationStore(storage);
  assert.equal(store.setStarred('1', true), true);
  assert.equal(store.find('1').starred, true);
  store.upsert({ id: '1', company: 'Acme Labs' });
  assert.equal(store.find('1').starred, true);
  assert.equal(store.find('1').createdAt, 42);
  assert.equal(createApplicationStore(storage).find('1').starred, true);
  store.setStarred('1', false);
  assert.equal(store.find('1').starred, false);
});

test('star updates preserve saved state when browser storage fails', () => {
  const original = JSON.stringify([{ id: '1', company: 'Acme', starred: false, createdAt: 42 }]);
  const store = createApplicationStore({
    getItem: () => original,
    setItem: () => {
      throw Error('quota');
    },
  });
  assert.throws(() => store.setStarred('1', true), /Could not save/);
  assert.equal(store.find('1').starred, false);
  assert.equal(store.setStarred('missing', true), false);
});
