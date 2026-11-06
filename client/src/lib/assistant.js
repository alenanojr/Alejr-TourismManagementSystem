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

const COUNT_WORDS = ['how many destinations', 'how many destination', 'how many spots', 'how many places', 'number of destinations', 'ilan ang destination', 'ilan ang destinations', 'ilang destination', 'ilan lahat', 'ilan ang spots'];
const CHEAP_WORDS = ['cheap', 'cheapest', 'budget', 'affordable', 'mura', 'pinakamura', 'low cost', 'murang'];
const TOP_WORDS = ['best', 'top', 'highest rated', 'most rated', 'popular', 'recommend', 'recommended', 'maganda', 'pinakamaganda', 'sikat', 'magandang'];
const LIST_WORDS = ['destinations', 'destination', 'spots', 'places', 'lugar', 'pasyalan', 'puntahan', 'list', 'show', 'saan', 'where'];

// `guest`: shown when logged out. `tourist` / `staff`: shown to that role. Anything missing falls back to `all`.
export const FAQ = [
  // Order matters: on equal scores the earlier entry wins, so specific topics come first
  // and broad ones (greeting, about) last.
  {
    id: 'change-booking',
    keywords: ['change date', 'change the date', 'change my booking', 'change booking', 'edit booking', 'edit my booking', 'reschedule', 'move my trip', 'move booking', 'palitan date', 'palitan ang date', 'ilipat', 'iba ang date', 'change guests', 'add guests'],
    all: 'Bookings cannot be edited once made. To change the date or the number of guests, cancel the trip in My Bookings and book again with the new details.',
    links: { tourist: [{ to: '/bookings', label: 'My Bookings' }] },
  },
  {
    id: 'guests',
    keywords: ['how many guests', 'max guests', 'maximum guests', 'guests', 'group', 'big group', 'pax', 'ilan tao', 'ilang tao', 'ilan ang tao', 'kids', 'children', 'bata', 'senior'],
    all: 'Each booking is for 1 to 50 guests. Every guest counts toward the total (price per person × guests); the site has no separate child or senior price. For groups over 50, make more than one booking.',
  },
  {
    id: 'booking-date',
    keywords: ['book today', 'same day', 'past date', 'advance', 'how far ahead', 'which date', 'what date', 'pick a date', 'anong date', 'bukas', 'today'],
    all: 'You can pick today or any future date when booking. Past dates cannot be chosen. Dates follow Philippine time.',
  },
  {
    id: 'multiple-bookings',
    keywords: ['multiple bookings', 'more than one booking', 'book again', 'book twice', 'same place again', 'another booking', 'two bookings', 'ulit'],
    all: 'Yes. You can make as many bookings as you like, including the same destination on different dates. Each booking is rated separately after its visit.',
  },
  {
    id: 'account-expiry',
    keywords: ['account deleted', 'account was deleted', 'account gone', 'account disappeared', 'account expired', 'expire', 'expired', 'nawala account', 'nawala ang account', 'na delete', 'nadelete', 'cant find my account', 'former visitor'],
    all: 'Tourist accounts on this site are temporary. An account is removed 7 days after its email is confirmed, or 7 days after its last trip, whichever is later, so you always have time to rate your visit. Unconfirmed sign-ups are removed after 7 days. Your reviews stay on the site and show as “Former visitor”. You can sign up again any time.',
    links: [{ to: '/register', label: 'Sign up again' }],
  },
  {
    id: 'delete-account',
    keywords: ['delete my account', 'delete account', 'remove my account', 'close my account', 'burahin account', 'burahin ang account'],
    all: 'There is no delete button. Tourist accounts are removed automatically 7 days after your email is confirmed or after your last trip, whichever is later. Your reviews remain as “Former visitor”.',
  },
  {
    id: 'edit-profile',
    keywords: ['profile', 'edit profile', 'edit my profile', 'change name', 'change my name', 'change email', 'change my email', 'change password', 'change my password', 'reset password', 'palitan pangalan', 'palitan password'],
    all: 'The site has no profile page yet, so your name, email and password cannot be changed after sign-up. If you need a change, contact the site admin.',
  },
  {
    id: 'email-confirm',
    keywords: ['confirm email', 'confirm my email', 'confirmation email', 'confirmation link', 'verify email', 'verification', 'verify', 'didnt get the email', 'no email', 'walang email', 'spam', 'email not confirmed'],
    all: 'After signing up, open the confirmation link sent to your email, then log in. If it is not in your inbox, check Spam or Promotions. Unconfirmed sign-ups are removed after 7 days, after which you can sign up again.',
    links: [{ to: '/login', label: 'Log in' }],
  },
  {
    id: 'email-taken',
    keywords: ['already has an account', 'already registered', 'email already', 'email is taken', 'email taken', 'gamit na email'],
    all: 'That email is already registered, so log in instead. If you never confirmed it, open the confirmation email first.',
    links: [{ to: '/login', label: 'Log in' }],
  },
  {
    id: 'admin-demo',
    keywords: ['demo', 'admin demo', 'try admin', 'view only account', 'demo account', 'viewer account', 'see the admin side'],
    all: 'The Log in page has a view-only admin demo. Press “Fill in for me” to load its email and password, then log in to look around the admin pages. It cannot change anything.',
    links: [{ to: '/login', label: 'Open Log in' }],
  },
  {
    id: 'become-admin',
    keywords: ['become admin', 'become an admin', 'admin access', 'how to be admin', 'make me admin', 'maging admin'],
    all: 'New sign-ups are tourist accounts. Admin access is given only by the site owner.',
  },
  {
    id: 'rating-vs-sentiment',
    keywords: ['stars but negative', 'stars but neutral', 'why negative', 'why neutral', 'why is my review negative', 'why is it negative', 'wrong sentiment', 'sentiment wrong', 'mismatch', 'bakit negative', 'bakit neutral'],
    all: 'The star rating and the sentiment label are separate. The label is read from the words in your comment by VADER, so a 5-star review whose comment mentions problems can come out Neutral or Negative.',
  },
  {
    id: 'review-privacy',
    keywords: ['who can see my review', 'who can see', 'is my review public', 'public', 'anonymous', 'privacy', 'private', 'my email', 'is my data safe', 'data safe', 'secure', 'makikita ba'],
    all: 'Reviews are public on the destination page and show only your first name and last initial, never your email. Admins can see bookings and reviews in full; the view-only demo admin sees emails partly hidden. Passwords are handled by Supabase Auth and are never shown to anyone.',
  },
  {
    id: 'loved-badge',
    keywords: ['loved by visitors', 'loved', 'heart badge', 'badge', 'red badge'],
    all: '“Loved by visitors” appears on destinations with at least 3 reviews where 70% or more are Positive.',
  },
  {
    id: 'read-reviews',
    keywords: ['read reviews', 'see reviews', 'other reviews', 'visitor reviews', 'filter reviews', 'basahin reviews', 'basahin ang reviews', 'mga review'],
    all: 'Open any destination to see its star breakdown, how visitors feel (Positive / Neutral / Negative) and every review. Use the chips above the reviews to show only Positive, Neutral or Negative ones.',
    links: [{ to: '/', label: 'Browse destinations' }],
  },
  {
    id: 'search-sort',
    keywords: ['search', 'sort', 'filter', 'hanapin', 'paano maghanap', 'maghanap', 'recommended', 'order'],
    all: 'On Explore, type in the search box to match a name, province or description. Use the region tabs (Luzon, Visayas, Mindanao) and type chips (Beaches, Islands, Waterfalls…) to filter, and the sort menu for Recommended, Top rated, Most reviewed or Price. Recommended puts spots with the highest share of positive reviews first.',
    links: [{ to: '/', label: 'Explore' }],
  },
  {
    id: 'dashboard',
    keywords: ['dashboard', 'my dashboard', 'home page', 'countdown', 'next trip', 'upcoming trip', 'upcoming trips', 'mabuhay'],
    guest: 'After you log in, your Dashboard shows a countdown to your next trip, your upcoming trips, places visited, reviews given, and any finished trip waiting for your rating.',
    tourist: 'Your Dashboard shows a countdown to your next trip, your upcoming trips, places visited, reviews given, and a “Rate your visit” reminder for finished trips you have not rated yet.',
    links: { tourist: [{ to: '/dashboard', label: 'Dashboard' }] },
  },
  {
    id: 'admin-bookings',
    staffOnly: true,
    keywords: ['update booking', 'change status', 'set status', 'mark completed', 'mark as completed', 'mark booking', 'mark the booking', 'mark a booking', 'confirm booking', 'approve', 'approve booking', 'booking status'],
    all: 'On Bookings, use the status menu on each row to set Pending, Confirmed, Completed or Cancelled. Marking a trip Completed lets the tourist rate it right away, even before the visit date. View-only admins cannot change statuses.',
    links: [{ to: '/admin/bookings', label: 'Bookings' }],
  },
  {
    id: 'cant-rate',
    keywords: ['cant rate', 'cant i rate', 'why cant i rate', 'cannot rate', 'no rate button', 'hindi ma rate', 'di ma rate', 'walang rate', 'rate button'],
    all: 'You can only rate a trip after its visit date has passed (or once the admin marks it Completed). Pending and cancelled trips cannot be rated, and each booking can only be rated once.',
  },
  {
    id: 'edit-feedback',
    keywords: ['edit', 'edit feedback', 'edit review', 'edit my review', 'edit my feedback', 'delete my review', 'delete my feedback', 'change my rating', 'delete feedback', 'delete review', 'change my review', 'change rating', 'burahin review', 'burahin ang review', 'palitan review', 'palitan ang review'],
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
    id: 'free',
    keywords: ['free', 'libre', 'is it free', 'may bayad ba', 'may bayad', 'free account'],
    all: 'Creating an account and using the site are free. Destinations show a price per person for the trip itself, but the site does not take payments.',
  },
  {
    id: 'mobile-app',
    keywords: ['app', 'mobile app', 'download app', 'install', 'android', 'iphone', 'phone', 'cellphone', 'cp'],
    all: 'There is no app to download. The website works in any phone browser, with a bottom tab bar once you log in.',
  },
  {
    id: 'language',
    keywords: ['tagalog', 'filipino', 'language', 'wika', 'bisaya', 'cebuano', 'english'],
    all: 'The site is in English. I understand simple English and Tagalog questions, like “paano mag book?” or “beaches sa Visayas”.',
  },
  {
    id: 'contact',
    keywords: ['contact', 'contact us', 'support', 'hotline', 'customer service', 'phone number', 'email the admin', 'makausap', 'tawagan', 'human', 'real person'],
    all: 'The site does not have a contact form or hotline yet. I can help with questions about using the site: destinations, booking, cancelling, feedback and your account.',
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

export const MORE_TOPICS_LABEL = 'More topics';

export const SUGGESTIONS = {
  guest: ['How do I book?', 'Beaches in Visayas', 'How many destinations?', 'Is it free?', MORE_TOPICS_LABEL],
  tourist: ['How do I book?', 'Can I change my booking date?', 'How do I rate my trip?', 'Why was my account deleted?', MORE_TOPICS_LABEL],
  staff: ['Mark booking as completed', 'Export CSV', 'How many destinations?', 'Add a destination', MORE_TOPICS_LABEL],
};

// Shown by the "More topics" chip: one question per topic that is not on the first screen.
const MORE_TOPICS = {
  guest: ['How do I cancel?', 'How many guests can I book?', 'Can I book today?', 'I did not get the confirmation email',
    'Who can see my review?', '5 stars but negative, why?', 'What does Loved by visitors mean?', 'What does Recommended mean?',
    'Cheapest destinations', 'Top rated destinations', 'Try the admin demo', 'Is there a mobile app?'],
  tourist: ['How do I cancel?', 'How many guests can I book?', 'Can I book the same place again?', 'Why can’t I rate my trip?',
    'Can I edit my review?', 'Who can see my review?', '5 stars but negative, why?', 'What is on my dashboard?',
    'Change my password', 'Cheapest destinations', 'Top rated destinations', 'Is there a mobile app?'],
  staff: ['5 stars but negative, why?', 'What do the sentiment labels mean?', 'Analytics', 'What can a view-only admin do?',
    'Who can see my review?', 'What does Loved by visitors mean?', 'Top rated destinations', 'Cheapest destinations'],
};
const MORE_WORDS = ['more topics', 'other topics', 'more questions', 'what else', 'iba pa', 'ano pa', 'topics', 'menu'];

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

// "There is 1 beach" / "There are 4 beaches".
const thereAre = (n, plural) => (n === 1
  ? `There is 1 ${plural.replace(/(ch)es$/, '$1').replace(/s$/, '')}`
  : `There are ${n} ${plural}`);

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
  if (anyOf(text, MORE_WORDS)) return { text: 'Here are more things you can ask me. Tap one, or type your own question.', suggestions: MORE_TOPICS[role] };

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

  // "How many destinations (in Visayas)?": counted from the live list.
  // Also "how many beaches in Visayas": a count word plus a region or type.
  if (anyOf(text, COUNT_WORDS) || (anyOf(text, ['how many', 'ilan', 'ilang', 'number of']) && (region || category))) {
    if (destinations === null) return { text: 'Loading destinations… please ask again in a moment.' };
    const pool = list.filter((d) => (!region || d.region === region) && (!category || d.category === category));
    const what = category ? CATEGORY_LABELS[category] : 'destinations';
    const links = [{ to: '/', label: 'Explore' }];
    if (region) return { text: `${thereAre(pool.length, what)} in ${region} on the site.`, links };
    const by = REGIONS.map((r) => `${pool.filter((d) => d.region === r).length} in ${r}`).join(', ');
    return { text: `${thereAre(pool.length, what)} on the site: ${by}.`, links };
  }

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
