// Site assistant: a rule-based FAQ bot. No AI service, no API key, no cost.
// It only answers from the FAQ below and the live destination list, so it never makes things up.
// Pure functions (no React, no Supabase) so `npm test` can exercise them in Node.

const REGIONS = ['Luzon', 'Visayas', 'Mindanao'];

const CATEGORY_WORDS = {
  beach: ['beach', 'beaches', 'dagat', 'beach resort', 'white sand', 'swimming', 'langoy'],
  island: ['island', 'islands', 'isla', 'island hopping'],
  falls: ['falls', 'waterfall', 'waterfalls', 'talon'],
  marine: ['marine', 'diving', 'dive', 'snorkel', 'snorkeling', 'whale shark', 'butanding', 'reef', 'coral', 'turtle'],
  mountain: ['mountain', 'mountains', 'highland', 'highlands', 'bundok', 'hike', 'hiking', 'trek', 'terraces', 'volcano', 'bulkan'],
  heritage: ['heritage', 'history', 'historical', 'church', 'churches', 'simbahan', 'museum', 'old town', 'kasaysayan', 'culture'],
};
const CATEGORY_LABELS = {
  beach: 'beaches', island: 'islands', falls: 'waterfalls', marine: 'marine life spots',
  mountain: 'highland spots', heritage: 'heritage spots', other: 'spots',
};

const CHEAP_WORDS = ['cheap', 'cheapest', 'budget', 'affordable', 'mura', 'pinakamura', 'low cost', 'murang'];
const TOP_WORDS = ['best', 'top', 'highest rated', 'most rated', 'popular', 'recommend', 'recommended', 'maganda', 'pinakamaganda', 'sikat', 'magandang'];
const LIST_WORDS = ['destinations', 'destination', 'spots', 'places', 'lugar', 'pasyalan', 'puntahan', 'list', 'show', 'saan', 'where'];

// `guest`: shown when logged out. `tourist` / `staff`: shown to that role. Anything missing falls back to `all`.
export const FAQ = [
  // Order matters: on equal scores the earlier entry wins, so specific topics come first
  // and broad ones (greeting, about) last.
  {
    id: 'cant-rate',
    keywords: ['cant rate', 'cannot rate', 'no rate button', 'hindi ma rate', 'di ma rate', 'walang rate', 'rate button'],
    all: 'You can only rate a trip after its visit date has passed (or once the admin marks it Completed). Pending and cancelled trips cannot be rated, and each booking can only be rated once.',
  },
  {
    id: 'edit-feedback',
    keywords: ['edit', 'edit feedback', 'edit review', 'edit my review', 'edit my feedback', 'delete my review', 'delete my feedback', 'change my rating', 'delete feedback', 'delete review', 'change my review', 'change rating', 'burahin', 'palitan'],
    all: 'Once submitted, feedback can no longer be edited or deleted, so please check your rating and comment before you send it.',
  },
  {
    id: 'my-feedback',
    keywords: ['my feedback', 'my reviews', 'past reviews', 'mga review ko'],
    all: 'My Feedback lists every review you have written, with its stars, tags and sentiment label.',
    links: [{ to: '/my-feedback', label: 'My Feedback' }],
  },
  {
    id: 'cancel',
    keywords: ['cancel', 'cancellation', 'icancel', 'i cancel', 'ikansela', 'kansela', 'refund'],
    guest: 'Once you are logged in, you can cancel any upcoming trip from My Bookings. Past trips can no longer be cancelled.',
    tourist: 'Go to My Bookings → Upcoming and press Cancel on the trip. Only upcoming trips (today or later) can be cancelled. This site does not handle payments, so there is nothing to refund here.',
    staff: 'Admins can change a booking’s status, including to Cancelled, from the Bookings page.',
    links: { tourist: [{ to: '/bookings', label: 'My Bookings' }], staff: [{ to: '/admin/bookings', label: 'Bookings' }] },
  },
  {
    id: 'status',
    keywords: ['status', 'pending', 'confirmed', 'completed', 'cancelled', 'canceled'],
    all: 'Booking statuses: Confirmed means your trip is set. Pending means it is waiting for the admin. Completed means the visit is done. Cancelled means it was cancelled and will not happen.',
  },
  {
    id: 'book',
    keywords: ['book', 'booking', 'reserve', 'reservation', 'mag book', 'magbook', 'paano mag book', 'how to book', 'pa book', 'schedule a trip'],
    guest: 'To book, first create a free account or log in. Then open any destination, pick your visit date and number of guests (1 to 50), and press Book. Your trip appears in My Bookings.',
    tourist: 'Open any destination, pick your visit date and number of guests (1 to 50), then press Book. The total is the price per person × guests. Your trip then appears in My Bookings.',
    staff: 'Admin accounts manage bookings instead of making them. Tourists book from a destination page by choosing a date and number of guests. You can see and update every booking under Bookings.',
    links: { guest: [{ to: '/register', label: 'Create an account' }, { to: '/login', label: 'Log in' }], tourist: [{ to: '/', label: 'Browse destinations' }, { to: '/bookings', label: 'My Bookings' }], staff: [{ to: '/admin/bookings', label: 'Bookings' }] },
  },
  {
    id: 'price',
    keywords: ['price', 'prices', 'cost', 'how much', 'magkano', 'presyo', 'bayad', 'fee', 'payment', 'pay', 'gcash', 'total'],
    all: 'Each destination shows its price per person. When you book, the total is the price per person × number of guests. This site does not take online payments.',
  },
  {
    id: 'feedback',
    keywords: ['feedback', 'rate', 'rating', 'review', 'reviews', 'comment', 'stars', 'star', 'mag rate', 'magrate', 'puna', 'leave a review', 'i rate'],
    guest: 'Visitors who booked through the site can rate their trip after the visit: 1 to 5 stars, a comment of at least 10 characters, and optional tags like Cleanliness or Scenery. Log in to see your trips.',
    tourist: 'After your visit date passes, the trip shows up in My Bookings → Past with a Rate button. Give 1 to 5 stars, write a comment of at least 10 characters, and pick any tags that fit. Each booking can be rated once.',
    staff: 'Tourists rate their own finished trips. You can read every review and its sentiment under Analytics.',
    links: { guest: [{ to: '/login', label: 'Log in' }], tourist: [{ to: '/bookings', label: 'My Bookings' }, { to: '/my-feedback', label: 'My Feedback' }], staff: [{ to: '/admin/feedback', label: 'Analytics' }] },
  },
  {
    id: 'sentiment',
    keywords: ['sentiment', 'positive', 'negative', 'neutral', 'vader', 'analysis', 'analyze', 'mood'],
    all: 'Every comment is scored by VADER sentiment analysis on the server. A score of 0.05 or higher is Positive, −0.05 or lower is Negative, and anything in between is Neutral. The label comes from the words you write, not the star rating.',
  },
  {
    id: 'tags',
    keywords: ['tags', 'tag', 'cleanliness', 'accessibility', 'safety', 'guides', 'value for money', 'scenery'],
    all: 'When rating a trip you can tag what stood out: Cleanliness, Accessibility, Safety, Staff/Guides, Value for Money and Scenery.',
  },
  {
    id: 'account',
    keywords: ['sign up', 'signup', 'register', 'create account', 'account', 'gumawa ng account', 'mag register', 'magregister', 'mag sign up'],
    all: 'Press Sign up at the top, then enter your name, email and a password. It is free. After signing up you can book trips and leave feedback.',
    links: [{ to: '/register', label: 'Create an account' }],
  },
  {
    id: 'login',
    keywords: ['login', 'log in', 'sign in', 'signin', 'mag login', 'maglogin', 'cant login', 'cant log in', 'cannot log in', 'hindi makapag login', 'password', 'forgot'],
    all: 'Use Log in at the top with your email and password. If it says your email is not confirmed, open the confirmation link sent to your inbox first. There is no password reset on the site yet, so contact the site admin if you are locked out.',
    links: [{ to: '/login', label: 'Log in' }],
  },
  {
    id: 'logout',
    keywords: ['logout', 'log out', 'sign out', 'signout', 'mag logout'],
    all: 'Press the log-out icon beside your name at the top. On a phone or tablet, open the menu (☰) and press Log out.',
  },
  {
    id: 'photo',
    keywords: ['photo', 'picture', 'image', 'no photo', 'larawan', 'litrato', 'walang picture'],
    all: 'Destination photos are uploaded by the site admin. Spots without one show “No photo yet” until a photo is added.',
  },
  {
    id: 'dark-mode',
    keywords: ['dark mode', 'light mode', 'theme', 'dark', 'madilim'],
    all: 'Use the moon/sun button at the top right to switch between light and dark mode. The site remembers your choice.',
  },
  {
    id: 'regions',
    keywords: ['region', 'regions', 'luzon visayas mindanao'],
    all: 'Destinations are grouped by region: Luzon, Visayas and Mindanao. Use the region tabs on the Explore page, or ask me something like “beaches in Visayas”.',
  },
  {
    id: 'admin-destinations',
    staffOnly: true,
    keywords: ['add destination', 'add a destination', 'new destination', 'add spot', 'edit destination', 'delete destination', 'upload photo', 'magdagdag ng destination'],
    all: 'Go to Destinations → Add destination (or Edit on an existing one). Fill in the name, location, region, type, price and description, and upload a JPG, PNG or WebP photo up to 5 MB. Deleting a destination also deletes its bookings and feedback.',
    links: [{ to: '/admin/destinations', label: 'Destinations' }],
  },
  {
    id: 'admin-export',
    staffOnly: true,
    keywords: ['export', 'csv', 'download', 'excel', 'report'],
    all: 'On Analytics, set your filters and press Export CSV to download every matching review with its sentiment scores.',
    links: [{ to: '/admin/feedback', label: 'Analytics' }],
  },
  {
    id: 'admin-analytics',
    staffOnly: true,
    keywords: ['analytics', 'chart', 'charts', 'dashboard', 'statistics', 'stats', 'trend', 'ranking'],
    all: 'Analytics shows the sentiment breakdown, trend over time, destination ranking and the full review list. Filter by destination and date range at the top.',
    links: [{ to: '/admin/feedback', label: 'Analytics' }],
  },
  {
    id: 'viewer',
    staffOnly: true,
    keywords: ['view only', 'viewer', 'read only', 'cant edit', 'cannot edit'],
    all: 'A view-only admin can open every admin page but cannot add, edit or delete anything, and tourist emails are partly hidden.',
  },
  {
    id: 'greeting',
    keywords: ['hi', 'hello', 'hey', 'kumusta', 'kamusta', 'good morning', 'good afternoon', 'good evening', 'magandang umaga', 'magandang hapon', 'magandang gabi'],
    all: "Hi! I'm the Philippine Tourism assistant. Ask me about destinations, booking a trip, cancelling, or leaving feedback after your visit.",
  },
  {
    id: 'thanks',
    keywords: ['thanks', 'thank you', 'salamat', 'ty', 'ok thanks', 'sige salamat'],
    all: "You're welcome! Anything else about the site you'd like to know?",
  },
  {
    id: 'about',
    keywords: ['what is this', 'about', 'ano ito', 'ano to', 'purpose', 'website', 'site', 'what can you do', 'help', 'tulong'],
    all: 'Philippine Tourism lets you browse destinations across Luzon, Visayas and Mindanao, book a visit, and rate it afterwards. Every review is analyzed as Positive, Neutral or Negative so others can see how visits really went.',
    links: [{ to: '/', label: 'Explore destinations' }],
  },
];

export const SUGGESTIONS = {
  guest: ['How do I book?', 'Beaches in Visayas', 'Cheapest destinations', 'How does feedback work?'],
  tourist: ['How do I book?', 'How do I cancel?', 'How do I rate my trip?', 'Top rated destinations'],
  staff: ['Add a destination', 'Export CSV', 'What do the sentiment labels mean?', 'Top rated destinations'],
};

/* ───────── Matching ───────── */

export const normalize = (s) =>
  ` ${String(s ?? '').toLowerCase().replace(/['’]/g, '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()} `;

const has = (text, phrase) => text.includes(normalize(phrase));
const anyOf = (text, words) => words.some((w) => has(text, w));

// Longer phrases count more, so "edit review" beats "review".
function scoreFaq(text, entry) {
  return entry.keywords.reduce((sum, k) => (has(text, k) ? sum + normalize(k).trim().split(' ').length : sum), 0);
}

export function roleOf(user) {
  if (!user) return 'guest';
  return user.role === 'admin' || user.role === 'viewer' ? 'staff' : 'tourist';
}

function faqReply(entry, role) {
  const text = entry[role] ?? entry.all;
  const links = Array.isArray(entry.links) ? entry.links : entry.links?.[role] ?? [];
  return { text, links };
}

const ACTIONS = new Set(['book', 'cancel', 'feedback', 'cant-rate', 'edit-feedback', 'account', 'login', 'logout', 'status']);

const peso = (n) => `₱${Number(n).toLocaleString('en-PH', { maximumFractionDigits: 0 })}`;
const destLink = (d) => ({ to: `/destinations/${d.id}`, label: d.name });

export function describeDestination(d) {
  const rating = d.feedback_count
    ? `rated ${Number(d.avg_rating).toFixed(1)}★ from ${d.feedback_count} review${d.feedback_count === 1 ? '' : 's'}`
    : 'no reviews yet';
  return `${d.name} is in ${d.province} (${d.region}), ${peso(d.price)} per person, ${rating}.`;
}

// Destinations whose name or province appears in the question.
function matchDestinations(text, list) {
  const words = new Set(text.trim().split(' ').filter((w) => w.length >= 4));
  return list.filter((d) => {
    const name = normalize(d.name);
    if (text.includes(name)) return true;
    // Any distinctive word of the name or province ("Boracay", "Bohol"), skipping generic ones.
    return `${name} ${normalize(d.province)}`.trim().split(' ')
      .some((w) => w.length >= 4 && !GENERIC.has(w) && words.has(w));
  });
}
const GENERIC = new Set(['island', 'islands', 'beach', 'falls', 'park', 'city', 'national', 'river', 'mount', 'lake', 'church', 'reef', 'bay', 'cove', 'town', 'old', 'the', 'and', 'del', 'sur', 'norte', 'oriental', 'occidental', 'province',
  'white', 'sand', 'hills', 'rice', 'spring', 'springs', 'view', 'point', 'peak', 'resort', 'islet', 'mountain', 'mountains', 'water', 'park', 'garden', 'cave', 'caves', 'shrine', 'fort', 'heritage', 'marine', 'sanctuary']);

function listReply(intro, items, emptyText) {
  if (!items.length) return { text: emptyText, links: [{ to: '/', label: 'Explore all destinations' }] };
  const shown = items.slice(0, 5);
  const more = items.length > shown.length ? ` (showing ${shown.length} of ${items.length})` : '';
  return { text: `${intro}${more}:`, destinations: shown, links: [] };
}

/**
 * @param {string} question
 * @param {{ user?: object|null, destinations?: object[]|null }} ctx  destinations = rows of destinations_with_stats
 * @returns {{ text: string, links?: {to:string,label:string}[], destinations?: object[] }}
 */
export function answer(question, { user = null, destinations = null } = {}) {
  const text = normalize(question);
  const role = roleOf(user);
  if (!text.trim()) return { text: 'Type a question about the site, for example “How do I book?”.' };

  const faqs = FAQ.filter((f) => !f.staffOnly || role === 'staff');
  let best = null;
  let bestScore = 0;
  for (const f of faqs) {
    const s = scoreFaq(text, f);
    if (s > bestScore) { best = f; bestScore = s; }
  }

  const list = destinations ?? [];
  const region = REGIONS.find((r) => has(text, r));
  const category = Object.keys(CATEGORY_WORDS).find((c) => anyOf(text, CATEGORY_WORDS[c]));
  const cheap = anyOf(text, CHEAP_WORDS);
  const top = anyOf(text, TOP_WORDS);
  const named = matchDestinations(text, list);

  // "How do I book Boracay?": the how-to answer, plus a link to that spot.
  if (named.length && best && ['book', 'price', 'feedback'].includes(best.id)) {
    const r = faqReply(best, role);
    return { ...r, text: `${describeDestination(named[0])} ${r.text}`, links: [destLink(named[0]), ...r.links] };
  }
  if (named.length === 1) {
    return { text: describeDestination(named[0]), links: [{ to: `/destinations/${named[0].id}`, label: `Open ${named[0].name}` }] };
  }
  if (named.length > 1) return listReply('I found these matching destinations', named);

  // Region/type words ask for a list, unless the question is a how-to ("how do I rate a beach trip").
  // "best"/"cheap"/"where" alone are weaker and only win when no FAQ topic matched.
  const action = best && ACTIONS.has(best.id);
  const strong = (region || category) && !action;
  const weak = (cheap || top || anyOf(text, LIST_WORDS)) && (!best || best.id === 'price');
  if (strong || weak) {
    if (destinations === null) return { text: 'Loading destinations… please ask again in a moment.' };
    let items = list.filter((d) => (!region || d.region === region) && (!category || d.category === category));
    if (cheap) items = [...items].sort((a, b) => Number(a.price) - Number(b.price));
    else if (top) items = items.filter((d) => d.feedback_count > 0).sort((a, b) => b.avg_rating - a.avg_rating || b.feedback_count - a.feedback_count);
    const what = category ? CATEGORY_LABELS[category] : 'destinations';
    const where = region ? ` in ${region}` : '';
    const how = cheap ? 'Most affordable ' : top ? 'Top rated ' : 'Here are the ';
    return listReply(`${how}${what}${where}`, items,
      top ? `No reviewed ${what}${where} yet.` : `There are no ${what}${where} on the site yet.`);
  }

  if (best) return faqReply(best, role);

  return {
    text: 'Sorry, I can only answer questions about this website: destinations, booking, cancelling, feedback and your account. Try one of the suggestions below.',
    suggest: true,
  };
}
