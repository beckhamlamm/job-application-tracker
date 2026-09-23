// Displays editable month-day-year dates while submitting ISO values for storage and sorting.
import { useId, useRef, useState, type KeyboardEvent } from 'react';
import {
  calendarDays,
  calendarValue,
  parseCalendarDate,
  displayCalendarDate,
  storedCalendarDate,
} from '../../lib/applications/calendar';
import { today } from '../../lib/applications/formatting';

export default function DateField({
  name,
  label,
  initialValue,
  required = false,
}: {
  name: string;
  label: string;
  initialValue: string;
  required?: boolean;
}) {
  const id = useId();
  const [value, setValue] = useState(displayCalendarDate(initialValue));
  const storedValue = storedCalendarDate(value);
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(
    () => parseCalendarDate(initialValue) || parseCalendarDate(today())!,
  );
  const trigger = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const { offset, days } = calendarDays(month);
  const title = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(month);
  const dayValue = (day: number) => {
    const date = new Date(month);
    date.setUTCDate(day);
    return calendarValue(date);
  };
  function select(next: string) {
    setValue(displayCalendarDate(next));
    input.current?.setCustomValidity('');
    setOpen(false);
    trigger.current?.focus();
  }
  function changeMonth(delta: number) {
    const next = new Date(month);
    next.setUTCDate(1);
    next.setUTCMonth(next.getUTCMonth() + delta);
    setMonth(next);
  }
  function moveDay(event: KeyboardEvent<HTMLButtonElement>, day: number) {
    const steps: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
    };
    if (!(event.key in steps)) {
      return;
    }
    event.preventDefault();
    const next = new Date(month);
    next.setUTCDate(day + steps[event.key]);
    const nextValue = calendarValue(next);
    setMonth(next);
    requestAnimationFrame(() => document.getElementById(`${id}-${nextValue}`)?.focus());
  }
  return (
    <div
      className="date-field"
      onKeyDown={(event) => {
        if (open && event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          setOpen(false);
          trigger.current?.focus();
        }
      }}
    >
      <label htmlFor={id}>{label}</label>
      <input type="hidden" name={name} value={storedValue} />
      <div className="date-input-shell">
        <input
          ref={input}
          id={id}
          value={value}
          required={required}
          placeholder="MM-DD-YYYY"
          autoComplete="off"
          pattern="\d{2}-\d{2}-\d{4}"
          maxLength={10}
          onChange={(event) => {
            const next = event.target.value;
            setValue(next);
            const parsed = parseCalendarDate(storedCalendarDate(next));
            event.target.setCustomValidity(
              next && !parsed ? 'Enter a valid date in MM-DD-YYYY format.' : '',
            );
            if (parsed) {
              setMonth(parsed);
            }
          }}
        />
        <button
          ref={trigger}
          type="button"
          aria-label={`Choose ${label.toLowerCase()}`}
          aria-expanded={open}
          aria-controls={`${id}-calendar`}
          onClick={() => {
            setMonth(parseCalendarDate(storedValue) || parseCalendarDate(today())!);
            setOpen(!open);
          }}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="3" y="5" width="18" height="16" rx="3" />
            <path d="M7 3v4m10-4v4M3 11h18m-13 4h2m4 0h2" />
          </svg>
        </button>
      </div>
      {open && (
        <section id={`${id}-calendar`} className="date-calendar" aria-label={`${label} calendar`}>
          <div className="calendar-heading">
            <button type="button" aria-label="Previous month" onClick={() => changeMonth(-1)}>
              ‹
            </button>
            <span aria-live="polite">{title}</span>
            <button type="button" aria-label="Next month" onClick={() => changeMonth(1)}>
              ›
            </button>
          </div>
          <div className="calendar-grid">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
              <span className="calendar-weekday" key={index} aria-hidden="true">
                {day}
              </span>
            ))}
            {Array.from({ length: offset }, (_, index) => (
              <span key={`blank-${index}`} />
            ))}
            {Array.from({ length: days }, (_, index) => {
              const day = index + 1;
              const date = dayValue(day);
              return (
                <button
                  id={`${id}-${date}`}
                  key={date}
                  type="button"
                  aria-label={displayCalendarDate(date)}
                  aria-pressed={date === storedValue}
                  aria-current={date === today() ? 'date' : undefined}
                  className={`calendar-day${date === storedValue ? ' selected' : ''}${date === today() ? ' today' : ''}`}
                  onKeyDown={(event) => moveDay(event, day)}
                  onClick={() => select(date)}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
