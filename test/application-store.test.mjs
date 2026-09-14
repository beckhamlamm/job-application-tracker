import test from 'node:test';
import assert from 'node:assert/strict';
import { createApplicationStore } from '../public/js/application-store.mjs';

function memoryStorage(initial = null) {
  let value = initial;
  return {
    getItem: () => value,
    setItem: (_key, next) => { value = next; },
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
