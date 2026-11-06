// POST /functions/v1/submit-feedback  { booking_id, rating, comment, tags[] }
// Verifies the user, validates input, scores the comment with VADER, and saves it
// through insert_feedback(), which checks booking ownership and eligibility.
// Sentiment is computed only here; the client never sends or sees it before saving.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';
import vader from 'npm:vader-sentiment@1.1.3';
import { labelForCompound, validateFeedbackInput } from '../_shared/feedback.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

// SQLSTATEs raised by insert_feedback().
const DB_ERRORS: Record<string, number> = { TM404: 404, TM403: 403, TM409: 409 };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed.' });

  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  const { data: auth, error: authError } = await supabase.auth.getUser(token);
  if (authError || !auth?.user) return json(401, { error: 'Please log in.' });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'Invalid JSON.' });
  }

  const { value, errors } = validateFeedbackInput(body);
  if (errors) return json(400, { error: 'Please fix the highlighted fields.', fields: errors });

  // Any sentiment fields in the request body are ignored.
  const { compound, pos, neu, neg } = vader.SentimentIntensityAnalyzer.polarity_scores(value.comment);

  const { data, error } = await supabase.rpc('insert_feedback', {
    p_user_id: auth.user.id,
    p_booking_id: value.booking_id,
    p_rating: value.rating,
    p_comment: value.comment,
    p_tags: value.tags,
    p_compound: compound,
    p_pos: pos,
    p_neu: neu,
    p_neg: neg,
    p_sentiment_label: labelForCompound(compound),
  });

  if (error) {
    const status = DB_ERRORS[error.code];
    if (status) return json(status, { error: error.message });
    console.error(error);
    return json(500, { error: 'Something went wrong. Please try again.' });
  }

  return json(201, data);
});
