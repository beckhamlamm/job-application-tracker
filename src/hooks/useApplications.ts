// Loads the existing browser store after hydration and publishes state only after successful writes.
'use client';
import { useEffect, useRef, useState } from 'react';
import { createApplicationStore } from '../lib/applications/store';
import type { Application, ApplicationInput } from '../lib/applications/types';

export function useApplications() {
  const store = useRef<ReturnType<typeof createApplicationStore> | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState('');
  useEffect(() => {
    try {
      const loaded = createApplicationStore(window.localStorage);
      store.current = loaded;
      setApplications(loaded.all());
      setReady(true);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Unable to load saved applications.');
    }
  }, []);
  function mutate(action: (current: NonNullable<typeof store.current>) => void) {
    if (!store.current) {
      throw new Error('Applications have not loaded yet.');
    }
    action(store.current);
    setApplications(store.current.all());
  }
  return {
    applications,
    ready,
    loadError,
    save: (item: ApplicationInput) =>
      mutate((current) => {
        current.upsert(item);
      }),
    remove: (id: string) => mutate((current) => current.remove(id)),
    star: (id: string, value: boolean) =>
      mutate((current) => {
        current.setStarred(id, value);
      }),
  };
}
