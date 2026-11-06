import { test } from 'node:test';
import assert from 'node:assert/strict';
import { labelForCompound, validateFeedbackInput } from '../../supabase/functions/_shared/feedback.ts';
import { csvCell, toCsv } from '../src/lib/csv.js';

test('labelForCompound uses the ±0.05 thresholds inclusively', () => {
  assert.equal(labelForCompound(0.05), 'Positive');
  assert.equal(labelForCompound(0.0499), 'Neutral');
  assert.equal(labelForCompound(0), 'Neutral');
  assert.equal(labelForCompound(-0.0499), 'Neutral');
  assert.equal(labelForCompound(-0.05), 'Negative');
});

test('validateFeedbackInput accepts a valid submission and trims the comment', () => {
  const { value, errors } = validateFeedbackInput({
    booking_id: '7', rating: 4, comment: '  Lovely view and kind guides.  ', tags: ['Scenery', 'Scenery'],
  });
  assert.equal(errors, null);
  assert.deepEqual(value, { booking_id: 7, rating: 4, comment: 'Lovely view and kind guides.', tags: ['Scenery'] });
});

test('validateFeedbackInput rejects bad rating, short comment and unknown tags', () => {
  const { errors } = validateFeedbackInput({ booking_id: 1, rating: 6, comment: 'short', tags: ['Food'] });
  assert.ok(errors.rating && errors.comment && errors.tags);
  assert.ok(validateFeedbackInput({ booking_id: 1, rating: 3.5, comment: 'x'.repeat(20) }).errors.rating);
  assert.ok(validateFeedbackInput({ rating: 3, comment: 'x'.repeat(20) }).errors.booking_id);
  assert.ok(validateFeedbackInput({ booking_id: 1, rating: 3, comment: '   abc     ' }).errors.comment);
});

test('csvCell quotes special characters and neutralises formulas', () => {
  assert.equal(csvCell('a,b'), '"a,b"');
  assert.equal(csvCell('say "hi"'), '"say ""hi"""');
  assert.equal(csvCell('=HYPERLINK("x")'), '"\'=HYPERLINK(""x"")"');
  assert.equal(csvCell(-0.5423), '-0.5423');
  assert.equal(csvCell(null), '');
  assert.equal(
    toCsv([{ label: 'id', get: (r) => r.id }, { label: 'note', get: (r) => r.note }], [{ id: 1, note: 'line\nbreak' }]),
    'id,note\r\n1,"line\nbreak"',
  );
});
