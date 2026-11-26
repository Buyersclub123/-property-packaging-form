import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ccLabel, ccPeriod, lastMonSun } from '../src/lib/reviewOutcomes/ccPaysPeriod.ts';

test('Mon-Sun is the week containing the date; the Monday run writes the week before', () => {
  assert.deepEqual(ccPeriod('mon-sun', '2026-11-26'), { kind: 'mon-sun', from: '2026-11-23', to: '2026-11-29' });
  assert.deepEqual(ccPeriod('mon-sun', '2026-11-29'), { kind: 'mon-sun', from: '2026-11-23', to: '2026-11-29' });
  assert.deepEqual(lastMonSun('2026-11-30'), { kind: 'mon-sun', from: '2026-11-23', to: '2026-11-29' });
  assert.deepEqual(lastMonSun('2026-12-06'), { kind: 'mon-sun', from: '2026-11-23', to: '2026-11-29' });
});

test('Fri-Thu, month and custom periods', () => {
  assert.deepEqual(ccPeriod('fri-thu', '2026-11-19'), { kind: 'fri-thu', from: '2026-11-13', to: '2026-11-19' });
  assert.deepEqual(ccPeriod('month', '2026-02-14'), { kind: 'month', from: '2026-02-01', to: '2026-02-28' });
  assert.deepEqual(ccPeriod('month', '2026-12-31'), { kind: 'month', from: '2026-12-01', to: '2026-12-31' });
  assert.deepEqual(ccPeriod('custom', '2026-11-03', '2026-11-17'), { kind: 'custom', from: '2026-11-03', to: '2026-11-17' });
  assert.throws(() => ccPeriod('custom', '2026-11-17', '2026-11-03'));
  assert.throws(() => ccPeriod('custom', '2026-01-01', '2026-06-01'));
});

test('tab labels follow the manual tab style', () => {
  assert.equal(ccLabel(ccPeriod('fri-thu', '2026-11-13')), '13th - 19th NOV26');
  assert.equal(ccLabel(ccPeriod('mon-sun', '2026-11-23')), '23rd - 29th NOV26');
  assert.equal(ccLabel(ccPeriod('mon-sun', '2026-11-30')), '30th NOV - 6th DEC26');
  assert.equal(ccLabel(ccPeriod('mon-sun', '2026-12-30')), '28th DEC26 - 3rd JAN27');
  assert.equal(ccLabel(ccPeriod('month', '2026-11-05')), 'NOV26');
  assert.equal(ccLabel(ccPeriod('custom', '2026-11-03', '2026-11-17')), '3rd - 17th NOV26');
  assert.equal(ccLabel(ccPeriod('custom', '2026-11-21', '2026-11-21')), '21st NOV26');
});
