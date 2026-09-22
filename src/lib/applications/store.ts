// Owns application collection state and persists it through an injected storage provider.
import { isRecord, isStatus, type Application, type ApplicationInput } from './types';
export const STORAGE_KEY = 'applyboard.applications.v1';
type StorageAdapter = Pick<Storage, 'getItem' | 'setItem'>;

export function createApplicationStore(storage: StorageAdapter) {
  let applications = load();

  function load(): Application[] {
    try {
      const raw = storage.getItem(STORAGE_KEY);
      const saved: unknown = raw === null ? [] : JSON.parse(raw);
      if (
        !Array.isArray(saved) ||
        !saved.every(
          (item) =>
            isRecord(item) &&
            typeof item.id === 'string' &&
            [
              'company',
              'role',
              'url',
              'datePosted',
              'dateApplied',
              'companySource',
              'companyConfidence',
            ].every((key) => item[key] === undefined || typeof item[key] === 'string') &&
            (item.status === undefined || isStatus(item.status)) &&
            (item.starred === undefined || typeof item.starred === 'boolean') &&
            (item.createdAt === undefined ||
              (typeof item.createdAt === 'number' && Number.isFinite(item.createdAt))),
        )
      ) {
        throw new Error('Invalid saved applications');
      }
      if (new Set(saved.map((item) => item.id)).size !== saved.length) {
        throw new Error('Duplicate saved application IDs');
      }
      const migrationTime = Date.now();
      return saved.map((item, index) => ({
        company: '',
        role: '',
        url: '',
        datePosted: '',
        dateApplied: '',
        status: 'Applied',
        ...item,
        createdAt: item.createdAt || migrationTime - index,
      })) as Application[];
    } catch {
      throw new Error(
        'Your saved applications could not be read. They have been left untouched. Reload to try again.',
      );
    }
  }

  function persist(next: Application[]) {
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
    find: (id: string) => {
      const item = applications.find((item) => item.id === id);
      return item ? { ...item } : undefined;
    },
    upsert(item: ApplicationInput) {
      const index = applications.findIndex((entry) => entry.id === item.id);
      const stored = {
        ...item,
        createdAt: index >= 0 ? applications[index].createdAt : Date.now(),
        starred: index >= 0 ? applications[index].starred === true : item.starred === true,
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
    setStarred(id: string, starred: boolean) {
      const index = applications.findIndex((item) => item.id === id);
      if (index < 0) {
        return false;
      }
      const next = [...applications];
      next[index] = { ...next[index], starred: starred === true };
      persist(next);
      return true;
    },
    remove(id: string) {
      persist(applications.filter((item) => item.id !== id));
    },
  };
}
