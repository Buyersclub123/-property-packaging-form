import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rescheduledWeeks } from '../src/lib/reviewOutcomes/moves.ts';
import { sydYmd } from '../src/lib/reviewOutcomes/types.ts';

const move = (oldStart: string, currentStart = '2026-11-23T11:00:00+11:00', appointmentId = 'meeting') => ({
  appointmentId, oldStart, currentStart,
});

test('Stats full range and Meetings weekly range retain the same departed week', () => {
  const rows = [move('2026-11-10T10:30:00+11:00'), move('2026-11-16T10:30:00+11:00')];
  const all = rescheduledWeeks(rows, '2026-01-01', '2027-01-01');
  assert.equal(all.length, 2);
  assert.deepEqual(
    all.filter((m) => sydYmd(m.oldStart) >= '2026-11-06' && sydYmd(m.oldStart) <= '2026-11-12'),
    rescheduledWeeks(rows, '2026-11-06', '2026-11-12'),
  );
});

test('repeated moves within a week retain one original slot, including day views', () => {
  const rows = [move('2026-11-10T10:30:00+11:00'), move('2026-11-09T10:30:00+11:00'), move('2026-11-10T10:30:00+11:00')];
  assert.deepEqual(rescheduledWeeks(rows, '2026-11-06', '2026-11-12'), [rows[0]]);
  assert.deepEqual(rescheduledWeeks(rows, '2026-11-09', '2026-11-09'), []);
  assert.deepEqual(rescheduledWeeks(rows, '2026-11-10', '2026-11-10'), [rows[0]]);
});

test('moves within or back into the current week do not double count its booking', () => {
  const rows = [
    move('2026-11-10T10:30:00+11:00', '2026-11-12T10:30:00+11:00'),
    move('2026-11-16T10:30:00+11:00', '2026-11-12T10:30:00+11:00'),
  ];
  assert.deepEqual(rescheduledWeeks(rows, '2026-11-06', '2026-11-12'), []);
  assert.deepEqual(rescheduledWeeks(rows, '2026-11-13', '2026-11-19'), [rows[1]]);
});

test('Friday boundary uses Sydney time, with separate appointments preserved', () => {
  const rows = [
    move('2026-11-12T12:59:00Z'),
    move('2026-11-12T13:00:00Z'),
    move('2026-11-12T12:59:00Z', undefined, 'another'),
  ];
  assert.deepEqual(rescheduledWeeks(rows, '2026-11-06', '2026-11-12'), [rows[0], rows[2]]);
  assert.deepEqual(rescheduledWeeks(rows, '2026-11-13', '2026-11-19'), [rows[1]]);
});
