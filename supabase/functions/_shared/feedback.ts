// Feedback rules shared by the Edge Function and its tests. No imports, so it runs
// unchanged in Deno (Supabase) and in Node's test runner.

export const FEEDBACK_TAGS = [
  'Cleanliness',
  'Accessibility',
  'Safety',
  'Staff/Guides',
  'Value for Money',
  'Scenery',
];

export const MIN_COMMENT_LENGTH = 10;
export const MAX_COMMENT_LENGTH = 2000;

// Standard VADER cut-offs for the compound score.
export const POSITIVE_THRESHOLD = 0.05;
export const NEGATIVE_THRESHOLD = -0.05;

export type SentimentLabel = 'Positive' | 'Neutral' | 'Negative';

export function labelForCompound(compound: number): SentimentLabel {
  if (compound >= POSITIVE_THRESHOLD) return 'Positive';
  if (compound <= NEGATIVE_THRESHOLD) return 'Negative';
  return 'Neutral';
}

export interface FeedbackInput {
  booking_id: number;
  rating: number;
  comment: string;
  tags: string[];
}

// Returns the normalised input, or field errors.
export function validateFeedbackInput(body: Record<string, unknown> = {}): {
  value: FeedbackInput;
  errors: Record<string, string> | null;
} {
  const errors: Record<string, string> = {};

  const bookingId = Number(body.booking_id);
  if (!Number.isInteger(bookingId) || bookingId <= 0) {
    errors.booking_id = 'A valid booking is required.';
  }

  const rating = Number(body.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    errors.rating = 'Rating must be a whole number from 1 to 5.';
  }

  const comment = typeof body.comment === 'string' ? body.comment.trim() : '';
  if (comment.length < MIN_COMMENT_LENGTH) {
    errors.comment = `Please write at least ${MIN_COMMENT_LENGTH} characters about your visit.`;
  } else if (comment.length > MAX_COMMENT_LENGTH) {
    errors.comment = `Feedback must be ${MAX_COMMENT_LENGTH} characters or fewer.`;
  }

  let tags: string[] = [];
  if (body.tags !== undefined && body.tags !== null) {
    const raw = body.tags;
    if (!Array.isArray(raw) || raw.some((t) => !FEEDBACK_TAGS.includes(t))) {
      errors.tags = `Tags must be chosen from: ${FEEDBACK_TAGS.join(', ')}.`;
    } else {
      tags = [...new Set(raw as string[])];
    }
  }

  return {
    value: { booking_id: bookingId, rating, comment, tags },
    errors: Object.keys(errors).length ? errors : null,
  };
}
