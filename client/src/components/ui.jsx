import { useEffect, useState } from 'react';
import {
  Accessibility, AlertCircle, Droplets, Fish, ImageIcon, Landmark, MapPin, Minus, Mountain, Palmtree, ShieldCheck,
  Sparkles, Star, TrendingDown, TrendingUp, Users, Wallet, Waves,
} from 'lucide-react';

/* ───────── Sentiment ───────── */

const SENTIMENT = {
  Positive: { cls: 'badge-positive', Icon: TrendingUp },
  Neutral: { cls: 'badge-neutral', Icon: Minus },
  Negative: { cls: 'badge-negative', Icon: TrendingDown },
};

// Icon + text label, so the sentiment never relies on color alone.
export function SentimentBadge({ label }) {
  if (!SENTIMENT[label]) return null;
  const { cls, Icon } = SENTIMENT[label];
  return (
    <span className={`badge ${cls}`}>
      <Icon size={13} strokeWidth={2.5} aria-hidden="true" /> {label}
    </span>
  );
}

/* ───────── Stars ───────── */

export function Stars({ value, size = 15 }) {
  const rounded = Math.round(value);
  return (
    <span className="stars" role="img" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={size} className={n <= rounded ? 'star on' : 'star'} aria-hidden="true" />
      ))}
    </span>
  );
}

const RATING_LABELS = ['Very poor', 'Poor', 'Okay', 'Good', 'Excellent'];

export function StarInput({ value, onChange }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div className="star-input" role="radiogroup" aria-label="Star rating" onMouseLeave={() => setHover(0)}>
      <div className="star-input-stars">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} star${n > 1 ? 's' : ''} – ${RATING_LABELS[n - 1]}`}
            className={n <= shown ? 'on' : ''}
            onMouseEnter={() => setHover(n)}
            onClick={() => onChange(n)}
          >
            <Star size={36} />
          </button>
        ))}
      </div>
      <span className={`star-caption ${shown ? 'chosen' : ''}`}>{RATING_LABELS[shown - 1] || 'Tap a star to rate'}</span>
    </div>
  );
}

/* ───────── Categories & tags ───────── */

export const CATEGORIES = [
  { key: 'beach', label: 'Beaches', Icon: Waves },
  { key: 'island', label: 'Islands', Icon: Palmtree },
  { key: 'falls', label: 'Waterfalls', Icon: Droplets },
  { key: 'marine', label: 'Marine life', Icon: Fish },
  { key: 'mountain', label: 'Highlands', Icon: Mountain },
  { key: 'heritage', label: 'Heritage', Icon: Landmark },
  { key: 'other', label: 'Other spots', Icon: MapPin },
];
const CATEGORY_BY_KEY = Object.fromEntries(CATEGORIES.map((c) => [c.key, c]));
export const categoryLabel = (key) => CATEGORY_BY_KEY[key]?.label ?? 'Destination';
export const CategoryIcon = ({ category, ...props }) => {
  const Icon = CATEGORY_BY_KEY[category]?.Icon ?? Waves;
  return <Icon {...props} />;
};

export const TAG_ICONS = {
  Cleanliness: Sparkles,
  Accessibility,
  Safety: ShieldCheck,
  'Staff/Guides': Users,
  'Value for Money': Wallet,
  Scenery: Mountain,
};

/* ───────── Destination cover ───────── */

// The admin-uploaded photo, or an empty placeholder until one is added.
export function Cover({ destination, size = 'md', children }) {
  const { image_url: image, name } = destination;
  return (
    <div className={`cover cover-${size} ${image ? '' : 'cover-empty'}`} role="img" aria-label={image ? name : `${name} (no photo yet)`}>
      {image ? (
        <img src={image} alt="" loading="lazy" />
      ) : (
        <span className="cover-placeholder" aria-hidden="true">
          <ImageIcon size={size === 'thumb' ? 22 : 34} strokeWidth={1.5} />
          {size !== 'thumb' && <span>No photo yet</span>}
        </span>
      )}
      {children}
    </div>
  );
}

/* ───────── Formatting ───────── */

export const formatDate = (value, opts = {}) =>
  new Date(value.length === 10 ? `${value}T00:00:00` : value).toLocaleDateString('en-PH', {
    year: 'numeric', month: 'short', day: 'numeric', ...opts,
  });

export const peso = (n) => `₱${Number(n).toLocaleString('en-PH', { maximumFractionDigits: 0 })}`;

export const initials = (name = '') =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '?';

export const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

export function countdownLabel(days) {
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `In ${days} days`;
}

/* ───────── Hooks ───────── */

export function useFetch(fn, deps) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true }));
    fn()
      .then((data) => alive && setState({ data, error: null, loading: false }))
      .catch((error) => alive && setState({ data: null, error, loading: false }));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}

export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setMatches(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [query]);
  return matches;
}

/* ───────── Feedback states ───────── */

export function PageLoader() {
  return <div className="loader" role="status"><span className="spinner" /> Loading…</div>;
}

export function ErrorNote({ children }) {
  return <p className="alert alert-error" role="alert"><AlertCircle size={18} /> <span>{children}</span></p>;
}

export function EmptyState({ icon: Icon, title, children }) {
  return (
    <div className="empty">
      {Icon && <span className="empty-icon"><Icon size={26} /></span>}
      <h3>{title}</h3>
      {children && <div className="muted">{children}</div>}
    </div>
  );
}

export function Loadable({ state, children, empty, skeleton }) {
  if (state.loading) return skeleton ?? <PageLoader />;
  if (state.error) return <ErrorNote>{state.error.message}</ErrorNote>;
  if (empty && (!state.data || state.data.length === 0)) return empty;
  return children(state.data);
}
