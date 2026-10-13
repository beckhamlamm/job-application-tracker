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
          <a
            className="github-link"
            href="https://github.com/beckhamlamm/job-application-tracker"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View ApplyBoard on GitHub"
            title="View ApplyBoard on GitHub"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 .75a11.25 11.25 0 0 0-3.558 21.923c.563.104.768-.244.768-.542 0-.267-.01-.975-.015-1.914-3.13.68-3.791-1.508-3.791-1.508-.512-1.3-1.25-1.646-1.25-1.646-1.023-.7.078-.686.078-.686 1.13.08 1.725 1.16 1.725 1.16 1.006 1.724 2.64 1.226 3.282.938.102-.729.394-1.226.716-1.508-2.499-.284-5.126-1.25-5.126-5.566 0-1.23.44-2.233 1.16-3.021-.117-.285-.503-1.43.11-2.98 0 0 .945-.303 3.094 1.154A10.79 10.79 0 0 1 12 6.176c.956.004 1.918.13 2.817.379 2.148-1.457 3.09-1.154 3.09-1.154.616 1.55.23 2.695.113 2.98.722.788 1.158 1.791 1.158 3.021 0 4.327-2.631 5.279-5.138 5.558.404.35.766 1.044.766 2.105 0 1.52-.014 2.747-.014 3.12 0 .3.202.65.774.54A11.252 11.252 0 0 0 12 .75Z" />
            </svg>
          </a>
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
