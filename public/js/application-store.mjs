// Owns application collection state and persists it through an injected storage provider.
const STORAGE_KEY = 'applyboard.applications.v1';

export function createApplicationStore(storage) {
  let applications = load();

  function load() {
    try {
      const saved = JSON.parse(storage.getItem(STORAGE_KEY)) || [];
      const migrationTime = Date.now();
      return saved.map((item, index) => ({
        ...item,
        createdAt: item.createdAt || migrationTime - index,
      }));
    } catch {
      return [];
    }
  }

  function persist(next) {
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      throw new Error(
        'Could not save applications. Browser storage may be full or unavailable. Please export a backup and try again.',
      );
    }
    applications = next;
  }

  return {
    all: () => applications.map((item) => ({ ...item })),
    find: (id) => {
      const item = applications.find((item) => item.id === id);
      return item ? { ...item } : undefined;
    },
    upsert(item) {
      const index = applications.findIndex((entry) => entry.id === item.id);
      const stored = {
        ...item,
        createdAt: index >= 0 ? applications[index].createdAt : Date.now(),
      };
      const next = [...applications];
      if (index >= 0) {
        next[index] = stored;
      } else {
        next.unshift(stored);
      }
      persist(next);
      return index >= 0 ? 'updated' : 'added';
    },
    remove(id) {
      persist(applications.filter((item) => item.id !== id));
    },
  };
}
