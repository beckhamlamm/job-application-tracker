// Owns application collection state and persists it through an injected storage provider.
const STORAGE_KEY = 'applyboard.applications.v1';

export function createApplicationStore(storage) {
  let applications = load();

  function load() {
    try {
      const saved = JSON.parse(storage.getItem(STORAGE_KEY)) || [];
      const migrationTime = Date.now();
      return saved.map((item, index) => ({ ...item, createdAt: item.createdAt || migrationTime - index }));
    } catch {
      return [];
    }
  }

  function persist() {
    storage.setItem(STORAGE_KEY, JSON.stringify(applications));
  }

  return {
    all: () => [...applications],
    find: (id) => applications.find((item) => item.id === id),
    upsert(item) {
      const index = applications.findIndex((entry) => entry.id === item.id);
      const stored = { ...item, createdAt: index >= 0 ? applications[index].createdAt : Date.now() };
      if (index >= 0) applications[index] = stored;
      else applications.unshift(stored);
      persist();
      return index >= 0 ? 'updated' : 'added';
    },
    remove(id) {
      applications = applications.filter((item) => item.id !== id);
      persist();
    },
  };
}
