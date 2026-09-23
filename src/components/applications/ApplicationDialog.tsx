// Edits application fields in a native modal, retaining star metadata and validating the submitted draft.
import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  STATUSES,
  isStatus,
  type ApplicationDraft,
  type ApplicationInput,
} from '../../lib/applications/types';
import { today } from '../../lib/applications/formatting';
import DateField from './DateField';
import { parseCalendarDate } from '../../lib/applications/calendar';
export default function ApplicationDialog({
  draft,
  onSave,
  onClose,
}: {
  draft: ApplicationDraft;
  onSave: (item: ApplicationInput) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState('');
  const [companyChanged, setCompanyChanged] = useState(false);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    element?.querySelector<HTMLInputElement>(draft.company ? '#company' : '#jobUrl')?.focus();
    return () => {
      element?.close();
    };
  }, [draft.company]);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const value = (key: string) => String(data.get(key) || '').trim();
    const status = value('status');
    if (!isStatus(status) || !value('company') || !value('role')) {
      setError('Enter a company, role, and valid status.');
      return;
    }
    const url = value('url');
    if (
      !parseCalendarDate(value('dateApplied')) ||
      (value('datePosted') && !parseCalendarDate(value('datePosted')))
    ) {
      setError('Enter valid dates in MM-DD-YYYY format.');
      return;
    }
    if (url && !/^https?:\/\//i.test(url)) {
      setError('Use an http:// or https:// job URL.');
      return;
    }
    try {
      onSave({
        id: draft.id || crypto.randomUUID(),
        company: value('company'),
        role: value('role'),
        url,
        datePosted: value('datePosted'),
        dateApplied: value('dateApplied'),
        status,
        starred: draft.starred,
        companySource: companyChanged ? 'manual review' : draft.companySource,
        companyConfidence: companyChanged ? 'high' : draft.companyConfidence,
      });
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not save application.');
    }
  }
  return (
    <dialog ref={dialog} aria-labelledby="dialogTitle" onCancel={onClose}>
      <form onSubmit={submit}>
        <div className="dialog-head">
          <div>
            <p className="eyebrow">APPLICATION DETAILS</p>
            <h2 id="dialogTitle">{draft.id ? 'Edit application' : 'Add an application'}</h2>
          </div>
          <button type="button" className="icon-button" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>
        <label>
          Job posting URL
          <input
            name="url"
            id="jobUrl"
            type="url"
            defaultValue={draft.url || ''}
            placeholder="https://…"
          />
        </label>
        <div className="form-grid">
          <label>
            Company
            <input
              name="company"
              id="company"
              required
              defaultValue={draft.company || ''}
              placeholder="Lam, Inc."
              onChange={() => setCompanyChanged(true)}
            />
          </label>
          <label>
            Role
            <input
              name="role"
              required
              defaultValue={draft.role || ''}
              placeholder="Software Engineer"
            />
          </label>
        </div>
        <div className="form-grid">
          <DateField name="datePosted" label="Date posted" initialValue={draft.datePosted || ''} />
          <DateField
            name="dateApplied"
            label="Date applied"
            initialValue={draft.dateApplied || today()}
            required
          />
        </div>
        <label>
          Status
          <select name="status" aria-label="Status" defaultValue={draft.status || 'Applied'}>
            {STATUSES.map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </label>
        {error && (
          <p className="helper error" role="alert">
            {error}
          </p>
        )}
        <div className="dialog-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="button primary">
            Save application
          </button>
        </div>
      </form>
    </dialog>
  );
}
