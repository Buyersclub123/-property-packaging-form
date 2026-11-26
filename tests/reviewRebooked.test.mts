import { test } from 'node:test';
import assert from 'node:assert/strict';
import { kindOfCalendar } from '../src/lib/reviewOutcomes/types.ts';

test('calendar decides the meeting type', () => {
  assert.equal(kindOfCalendar('OfHMBFJUzIEMAx7UGZrR'), 'NL');
  assert.equal(kindOfCalendar('qmizFGxloa0uIBhJTRIv'), 'CF');
  assert.equal(kindOfCalendar('ziiNfM0fl5q8iWL5MDtF'), 'PR');
});
