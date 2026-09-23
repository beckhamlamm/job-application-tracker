// Coordinates React application state, filtering, dialogs, and CSV export after browser storage loads.
'use client';
import { useEffect, useState } from 'react';
import { useApplications } from '../../hooks/useApplications';
import { sortApplications } from '../../lib/applications/sorting';
import { applicationsToCsv, csvFilename } from '../../lib/applications/formatting';
import ApplicationInfo from './ApplicationInfo';
import type { ApplicationDraft, SortMode } from '../../lib/applications/types';
import ApplicationTable from './ApplicationTable';
import ApplicationDialog from './ApplicationDialog';
import SortControls from './SortControls';
import JobUrlForm from './JobUrlForm';

export default function ApplicationBoard() {
  const { applications, ready, loadError, save, remove, star } = useApplications();
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortMode>('applied');
  const [draft, setDraft] = useState<ApplicationDraft | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [formVersion, setFormVersion] = useState(0);
  useEffect(() => {
    if (!notice) {
      return;
    }
    const timer = setTimeout(() => setNotice(''), 2200);
    return () => clearTimeout(timer);
  }, [notice]);
  const term = search.trim().toLowerCase();
  const visible = sortApplications(
    applications.filter((item) =>
      [item.company, item.role, item.status].some((value) => value?.toLowerCase().includes(term)),
    ),
    sort,
  );
  function act(action: () => void, message: string) {
    try {
      action();
      setError('');
      setNotice(message);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not save changes.');
    }
  }
  function exportCsv() {
    if (!applications.length) {
      setNotice('Add an application before exporting');
      return;
    }
    const link = document.createElement('a');
    const url = URL.createObjectURL(
      new Blob([applicationsToCsv(applications)], { type: 'text/csv' }),
    );
    link.href = url;
    link.download = csvFilename();
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    setNotice('CSV exported');
  }
  return (
    <>
      <header className="site-header">
        <a className="brand" href="#">
          <span className="brand-mark">A</span>
          <span>ApplyBoard</span>
        </a>
        <div className="header-actions">
          <button className="button secondary" disabled={!ready} onClick={exportCsv}>
            Export CSV
          </button>
          <button className="button primary compact" disabled={!ready} onClick={() => setDraft({})}>
            <span>＋</span> Add manually
          </button>
        </div>
      </header>
      <main>
        <JobUrlForm key={formVersion} disabled={!ready} onDraft={setDraft} />
        <section className="dashboard">
          <div className="section-heading">
            <div>
              <div className="application-heading">
                <h2>Your applications</h2>
                {ready && <ApplicationInfo items={applications} />}
              </div>
              <p>
                {ready
                  ? null
                  : loadError
                    ? 'Applications unavailable'
                    : 'Loading your applications…'}
              </p>
            </div>
            <SortControls sort={sort} search={search} onSort={setSort} onSearch={setSearch} />
          </div>
          {(loadError || error) && (
            <p className="helper error" role="alert">
              {loadError || error}
            </p>
          )}
          {ready && (
            <ApplicationTable
              items={visible}
              onEdit={setDraft}
              onStar={(item) =>
                act(
                  () => star(item.id, !item.starred),
                  item.starred ? 'Application unstarred' : 'Application starred',
                )
              }
              onRemove={(item) => {
                if (confirm(`Remove ${item.role} at ${item.company}?`)) {
                  act(() => remove(item.id), 'Application removed');
                }
              }}
            />
          )}
          <p className="save-note">
            <span>✓</span> Saved automatically in this browser
          </p>
        </section>
      </main>
      {draft && (
        <ApplicationDialog
          draft={draft}
          onClose={() => setDraft(null)}
          onSave={(item) => {
            save(item);
            setFormVersion((version) => version + 1);
            setDraft(null);
            setNotice(item.id === draft.id ? 'Application updated' : 'Application added');
          }}
        />
      )}
      <div className={`toast${notice ? ' visible' : ''}`} role="status">
        {notice}
      </div>
    </>
  );
}
