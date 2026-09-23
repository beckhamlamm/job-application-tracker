// Fetches parsed job details on demand and offers manual entry when extraction fails.
import { useState, type FormEvent } from 'react';
import { isParsedJob, isRecord, type ApplicationDraft } from '../../lib/applications/types';
export default function JobUrlForm({
  disabled,
  onDraft,
}: {
  disabled: boolean;
  onDraft: (draft: ApplicationDraft) => void;
}) {
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(
    'Works best with job pages that include structured posting details.',
  );
  const [failed, setFailed] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setFailed(false);
    try {
      const response = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });
      const result: unknown = await response.json();
      if (!response.ok || !isParsedJob(result)) {
        throw new Error(
          isRecord(result) && typeof result.error === 'string'
            ? result.error
            : 'Could not read this page. Enter the details manually.',
        );
      }
      onDraft(result);
      setMessage('Details found. Review them before saving.');
    } catch (error) {
      onDraft({ url: url.trim() });
      setFailed(true);
      setMessage(
        error instanceof Error
          ? error.message
          : 'Could not read this page. Enter the details manually.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="hero">
      <p className="eyebrow">YOUR APPLICATION WORKSPACE</p>
      <h1>
        One link. <span>Everything tracked.</span>
      </h1>
      <p className="intro">
        Paste a job posting and we&apos;ll pull in the details. Keep every opportunity organized,
        without the spreadsheet busywork.
      </p>
      <form className="url-form" onSubmit={submit}>
        <label className="url-input-wrap">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M10.6 13.4a4 4 0 0 0 5.66.03l2.12-2.12a4 4 0 0 0-5.66-5.66l-1.21 1.2m1.89 3.75a4 4 0 0 0-5.66-.03l-2.12 2.12a4 4 0 0 0 5.66 5.66l1.2-1.2" />
          </svg>
          <input
            aria-label="Job posting URL to parse"
            type="url"
            required
            placeholder="Paste a job posting URL…"
            autoComplete="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
          />
        </label>
        <button className="button primary track-button" disabled={disabled || busy} type="submit">
          {busy ? (
            'Reading job page…'
          ) : (
            <>
              Track application <span>→</span>
            </>
          )}
        </button>
      </form>
      <p className={`helper${failed ? ' error' : ''}`} role="status">
        {message}
      </p>
    </section>
  );
}
