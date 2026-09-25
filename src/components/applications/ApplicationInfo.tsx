// Shows nonempty status totals for the whole collection on hover, keyboard focus, or tap.
import { useEffect, useId, useState } from 'react';
import { STATUS_ORDER } from '../../lib/applications/sorting';
import type { Application } from '../../lib/applications/types';

export default function ApplicationInfo({ items }: { items: Application[] }) {
  const id = useId();
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    const dismiss = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDismissed(true);
      }
    };
    document.addEventListener('keydown', dismiss);
    return () => document.removeEventListener('keydown', dismiss);
  }, []);
  const counts = STATUS_ORDER.map((status) => ({
    status,
    count: items.filter((item) => item.status === status).length,
  })).filter(({ count }) => count > 0);
  return (
    <span
      className={`application-info${dismissed ? ' dismissed' : ''}`}
      onMouseEnter={() => setDismissed(false)}
      onFocus={() => setDismissed(false)}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          setDismissed(true);
        }
      }}
    >
      <button
        type="button"
        className="application-info-button"
        aria-label="Application status counts"
        aria-describedby={id}
        onClick={() => setDismissed(false)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v6" />
          <circle className="info-dot" cx="12" cy="7.5" r="1" />
        </svg>
      </button>
      <span id={id} role="tooltip" className="application-info-tooltip">
        <span className="application-info-total">
          {items.length} total {items.length === 1 ? 'application' : 'applications'}
        </span>
        {counts.length ? (
          counts.map(({ status, count }) => (
            <span key={status}>
              {count}{' '}
              {status === 'Applied' ? 'active' : status === 'OA' ? 'OA' : status.toLowerCase()}{' '}
              {count === 1 ? 'application' : 'applications'}
            </span>
          ))
        ) : (
          <span>No applications yet</span>
        )}
      </span>
    </span>
  );
}
