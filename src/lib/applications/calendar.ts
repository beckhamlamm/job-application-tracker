// Handles calendar-only dates without timezone shifts and validates manually entered values.
export function parseCalendarDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? date : null;
}

export function calendarValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function displayCalendarDate(value: string) {
  if (!parseCalendarDate(value)) {
    return '';
  }
  const [year, month, day] = value.split('-');
  return `${month}-${day}-${year}`;
}

export function storedCalendarDate(value: string) {
  if (!/^\d{2}-\d{2}-\d{4}$/.test(value)) {
    return '';
  }
  const [month, day, year] = value.split('-');
  const iso = `${year}-${month}-${day}`;
  return parseCalendarDate(iso) ? iso : '';
}

export function calendarDays(month: Date) {
  const start = new Date(month);
  start.setUTCDate(1);
  const offset = start.getUTCDay();
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1, 0);
  return { offset, days: end.getUTCDate() };
}
