// Every database call the UI makes. Pages import from here, never from supabase.js.
import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from './supabase.js';

export const FEEDBACK_TAGS = ['Cleanliness', 'Accessibility', 'Safety', 'Staff/Guides', 'Value for Money', 'Scenery'];
export const MIN_COMMENT_LENGTH = 10;

export class DataError extends Error {
  constructor(message, { status, fields } = {}) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

async function run(promise) {
  const { data, error } = await promise;
  if (error) {
    if (error.message?.includes('Failed to fetch')) {
      throw new DataError('Cannot reach Supabase. Check your internet connection and the URL in .env.local.');
    }
    throw new DataError(error.message);
  }
  return data;
}

const rpc = (name, args) => run(supabase.rpc(name, args));
const orNull = (v) => (v === '' || v === undefined ? null : v);

// "Today" in the Philippines, as YYYY-MM-DD.
export const todayInManila = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });

// Whole days from today (Manila) to a YYYY-MM-DD date; both parse as UTC midnight.
export const daysUntil = (date) => Math.round((Date.parse(date) - Date.parse(todayInManila())) / 86400000);

export const withPercentages = (s) => {
  const total = s?.total ?? 0;
  const pct = (n) => (total ? Math.round((n / total) * 1000) / 10 : 0);
  return { ...s, total, positive_pct: pct(s?.positive ?? 0), neutral_pct: pct(s?.neutral ?? 0), negative_pct: pct(s?.negative ?? 0) };
};

/* ───────── Auth & profile ───────── */

export const auth = {
  signIn: (email, password) => run(supabase.auth.signInWithPassword({ email, password })),
  signUp: ({ name, email, password }) =>
    run(supabase.auth.signUp({ email, password, options: { data: { name } } })),
  signOut: () => supabase.auth.signOut(),
  profile: (userId) => run(supabase.from('profiles').select('id, name, email, role').eq('id', userId).single()),
};

/* ───────── Destinations (public) ───────── */

export const destinations = {
  list: (region) => rpc('destinations_with_stats', { p_region: orNull(region) }),
  get: (id) => run(supabase.from('destinations').select('*').eq('id', id).single()),
  summary: async (id) =>
    withPercentages((await rpc('destination_feedback_summary', { p_destination_id: id }))[0]),
  recentFeedback: async (id, { limit = 6, sentiment = null, offset = 0 } = {}) => {
    const rows = await rpc('destination_recent_feedback', {
      p_destination_id: id, p_limit: limit, p_sentiment: sentiment, p_offset: offset,
    });
    return { items: rows, total: rows[0]?.total_count ?? 0 };
  },
};

/* ───────── Tourist ───────── */

export const bookings = {
  mine: () => rpc('my_bookings'),
  get: async (id) => {
    const rows = await rpc('my_bookings', { p_booking_id: id });
    if (!rows.length) throw new DataError('Booking not found.', { status: 404 });
    return rows[0];
  },
  create: ({ destination_id, visit_date, guests }) =>
    run(supabase.from('bookings').insert({ destination_id, visit_date, guests }).select().single()),
  cancel: (id) => rpc('cancel_booking', { p_booking_id: id }),
};

export const feedback = {
  mine: async (userId) =>
    run(
      supabase
        .from('feedback')
        .select('*, destination:destinations(id, name, province, category, image_url), booking:bookings(visit_date)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
    ),

  // Goes through the Edge Function: VADER runs there, never in the browser.
  submit: async ({ booking_id, rating, comment, tags }) => {
    const { data, error } = await supabase.functions.invoke('submit-feedback', {
      body: { booking_id, rating, comment, tags },
    });
    if (error) {
      if (error instanceof FunctionsHttpError) {
        const body = await error.context.json().catch(() => ({}));
        throw new DataError(body.error || 'Could not submit feedback.', { status: error.context.status, fields: body.fields });
      }
      throw new DataError('Cannot reach the feedback service. Is the submit-feedback function deployed?');
    }
    return data;
  },
};

/* ───────── Admin ───────── */

export const IMAGE_BUCKET = 'destination-images';
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_IMAGE_MB = 5;

const filterArgs = ({ destination_id, from, to } = {}) => ({
  p_destination_id: orNull(destination_id),
  p_from: orNull(from),
  p_to: orNull(to),
});

export const adminData = {
  breakdown: (f) => rpc('admin_feedback_breakdown', filterArgs(f)),
  trend: (f, granularity) => rpc('admin_feedback_trend', { p_granularity: granularity, ...filterArgs(f) }),
  ranking: (f) => rpc('admin_feedback_ranking', { p_from: orNull(f.from), p_to: orNull(f.to) }),
  list: async (f, { sentiment, page = 1, pageSize = 15 }) => {
    const rows = await rpc('admin_feedback_list', {
      ...filterArgs(f),
      p_sentiment: sentiment === 'All' ? null : sentiment,
      p_limit: pageSize,
      p_offset: (page - 1) * pageSize,
    });
    return { items: rows, total: rows[0]?.total_count ?? 0 };
  },
  exportRows: (f) => rpc('admin_feedback_list', { ...filterArgs(f), p_sentiment: null, p_limit: null, p_offset: 0 }),
  bookings: () => rpc('admin_bookings'),
  setBookingStatus: (id, status) => run(supabase.from('bookings').update({ status }).eq('id', id).select().single()),

  createDestination: (values) => run(supabase.from('destinations').insert(values).select().single()),
  updateDestination: (id, values) => run(supabase.from('destinations').update(values).eq('id', id).select().single()),
  deleteDestination: (id) => run(supabase.from('destinations').delete().eq('id', id)),

  // Photos live in the public "destination-images" bucket; only admins can write (see migration).
  uploadImage: async (file) => {
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
    const path = `${crypto.randomUUID()}.${ext}`;
    await run(supabase.storage.from(IMAGE_BUCKET).upload(path, file, { contentType: file.type, cacheControl: '31536000' }));
    return supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;
  },
  // Best effort: only files in our bucket are removed; outside URLs are left alone.
  removeImage: async (url) => {
    const marker = `/storage/v1/object/public/${IMAGE_BUCKET}/`;
    const at = url?.indexOf(marker) ?? -1;
    if (at === -1) return;
    await supabase.storage.from(IMAGE_BUCKET).remove([decodeURIComponent(url.slice(at + marker.length))]);
  },
};
