// Checks calendar-only parsing, leap years, and month layout without timezone conversion.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calendarDays,
  calendarValue,
  parseCalendarDate,
} from '../src/lib/applications/calendar.ts';

test('calendar dates reject impossible dates and retain ISO values', () => {
  for (const value of ['', '2026-02-29', '2026-04-31', '2026-13-01', '9/23/2026']) {
    assert.equal(parseCalendarDate(value), null);
  }
  assert.equal(calendarValue(parseCalendarDate('2024-02-29')), '2024-02-29');
  assert.deepEqual(calendarDays(parseCalendarDate('2024-02-15')), { offset: 4, days: 29 });
  assert.deepEqual(calendarDays(parseCalendarDate('2026-02-15')), { offset: 0, days: 28 });
});
