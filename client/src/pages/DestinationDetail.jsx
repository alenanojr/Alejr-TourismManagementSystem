import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, CalendarDays, MapPin, MessageSquare, Minus, Plus, Smile, Star, Tag, Users,
} from 'lucide-react';
import { bookings, destinations, todayInManila } from '../data.js';
import { isViewer, useAuth } from '../auth.jsx';
import { useUI } from '../components/overlays.jsx';
import {
  CategoryIcon, Cover, EmptyState, ErrorNote, Loadable, SentimentBadge, Stars, TAG_ICONS, categoryLabel, formatDate,
  initials, peso, plural, useFetch,
} from '../components/ui.jsx';

const SPLIT = [
  ['Positive', 'positive'],
  ['Neutral', 'neutral'],
  ['Negative', 'negative'],
];
const PAGE_SIZE = 6;

function FeedbackSummary({ summary }) {
  if (!summary.total) {
    return <p className="muted">No feedback yet. Visitors can rate this place after their trip.</p>;
  }
  const maxStars = Math.max(...summary.star_counts, 1);
  return (
    <div className="summary-grid">
      <div className="summary-rating">
        <div className="hero-stat">
          <span className="hero-number">{summary.avg_rating.toFixed(1)}</span>
          <div>
            <Stars value={summary.avg_rating} size={19} />
            <p className="muted small">{plural(summary.total, 'visitor review')}</p>
          </div>
        </div>
        <ul className="star-bars" aria-label="Ratings breakdown">
          {[5, 4, 3, 2, 1].map((n) => (
            <li key={n}>
              <span className="star-bars-label">{n} <Star size={12} aria-hidden="true" /></span>
              <span className="star-bars-track"><span style={{ width: `${(summary.star_counts[n - 1] / maxStars) * 100}%` }} /></span>
              <span className="star-bars-count">{summary.star_counts[n - 1]}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="summary-mood">
        <p className="summary-label">How visitors feel</p>
        <div className="sentiment-split" role="img"
          aria-label={SPLIT.map(([l, k]) => `${summary[`${k}_pct`]}% ${l}`).join(', ')}>
          {SPLIT.map(([label, key]) => summary[`${key}_pct`] > 0 && (
            <span key={label} className={`seg seg-${key}`} style={{ flexGrow: summary[`${key}_pct`] }} />
          ))}
        </div>
        <ul className="sentiment-legend">
          {SPLIT.map(([label, key]) => (
            <li key={label}>
              <span className={`dot seg-${key}`} aria-hidden="true" />
              {label} <strong>{summary[`${key}_pct`]}%</strong>
            </li>
          ))}
        </ul>

        {summary.top_tags.length > 0 && (
          <>
            <p className="summary-label">What visitors mention</p>
            <div className="tags">
              {summary.top_tags.map(({ tag, count }) => {
                const Icon = TAG_ICONS[tag] ?? Tag;
                return <span key={tag} className="tag tag-lg"><Icon size={14} aria-hidden="true" /> {tag} <b>{count}</b></span>;
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Reviews({ destinationId, summary }) {
  const { toast } = useUI();
  const [sentiment, setSentiment] = useState(null);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    destinations.recentFeedback(destinationId, { limit: PAGE_SIZE, sentiment })
      .then((res) => { if (alive) { setItems(res.items); setTotal(res.total); setError(null); } })
      .catch((err) => alive && setError(err))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [destinationId, sentiment]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const res = await destinations.recentFeedback(destinationId, { limit: PAGE_SIZE, sentiment, offset: items.length });
      setItems((current) => [...current, ...res.items]);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoadingMore(false);
    }
  };

  const filters = [
    { key: null, label: 'All', count: summary?.total },
    ...SPLIT.map(([label, key]) => ({ key: label, label, count: summary?.[key] })),
  ];

  return (
    <section className="reviews" aria-labelledby="reviews-title">
      <div className="section-head">
        <h2 id="reviews-title">Visitor reviews</h2>
        {summary?.total > 0 && (
          <div className="chip-scroll compact" role="group" aria-label="Filter reviews by sentiment">
            {filters.map((f) => (
              <button key={f.label} type="button" aria-pressed={sentiment === f.key}
                className={sentiment === f.key ? 'chip active' : 'chip'} onClick={() => setSentiment(f.key)}>
                {f.label} <span className="chip-count">{f.count ?? 0}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? <div className="loader"><span className="spinner" /> Loading reviews…</div>
        : error ? <ErrorNote>{error.message}</ErrorNote>
          : items.length === 0 ? (
            <EmptyState icon={MessageSquare} title={sentiment ? `No ${sentiment.toLowerCase()} reviews` : 'No reviews yet'}>
              {sentiment ? 'Try another filter.' : 'Be the first to share after your visit.'}
            </EmptyState>
          ) : (
            <>
              <ul className="review-grid">
                {items.map((f) => (
                  <li key={f.id} className="card review">
                    <div className="review-head">
                      <span className="avatar sm" aria-hidden="true">{initials(f.author)}</span>
                      <div>
                        <strong>{f.author}</strong>
                        <span className="muted small">{formatDate(f.created_at)}</span>
                      </div>
                      <SentimentBadge label={f.sentiment_label} />
                    </div>
                    <Stars value={f.rating} />
                    <p>{f.comment}</p>
                    {f.tags.length > 0 && <div className="tags">{f.tags.map((t) => <span key={t} className="tag">{t}</span>)}</div>}
                  </li>
                ))}
              </ul>
              {items.length < total && (
                <div className="center">
                  <button type="button" className="btn btn-ghost" onClick={loadMore} disabled={loadingMore}>
                    {loadingMore ? 'Loading…' : `Show more reviews (${total - items.length})`}
                  </button>
                </div>
              )}
            </>
          )}
    </section>
  );
}

function GuestStepper({ value, onChange }) {
  return (
    <div className="stepper">
      <button type="button" aria-label="Fewer guests" disabled={value <= 1} onClick={() => onChange(value - 1)}><Minus size={16} /></button>
      <output aria-live="polite">{plural(value, 'guest')}</output>
      <button type="button" aria-label="More guests" disabled={value >= 50} onClick={() => onChange(value + 1)}><Plus size={16} /></button>
    </div>
  );
}

function BookingCard({ destination }) {
  const { user } = useAuth();
  const { toast } = useUI();
  const navigate = useNavigate();
  const [visitDate, setVisitDate] = useState('');
  const [guests, setGuests] = useState(2);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await bookings.create({ destination_id: destination.id, visit_date: visitDate, guests });
      toast.success(`Your trip to ${destination.name} is booked!`);
      navigate('/bookings');
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <aside className="card booking-card" id="book" aria-label="Book this trip">
      <p className="booking-price">{peso(destination.price)} <span className="muted">/ person</span></p>
      {isViewer(user) ? (
        <p className="muted">Booking is turned off for the view-only admin account.</p>
      ) : user ? (
        <form onSubmit={onSubmit}>
          <label>
            <span className="label-text"><CalendarDays size={15} /> Visit date</span>
            <input type="date" required min={todayInManila()} value={visitDate} onChange={(e) => setVisitDate(e.target.value)} />
          </label>
          <div className="field">
            <span className="label-text"><Users size={15} /> Guests</span>
            <GuestStepper value={guests} onChange={setGuests} />
          </div>
          <div className="booking-total">
            <span>{peso(destination.price)} × {plural(guests, 'guest')}</span>
            <strong>{peso(Number(destination.price) * guests)}</strong>
          </div>
          {error && <ErrorNote>{error}</ErrorNote>}
          <button className="btn btn-primary btn-block btn-lg" disabled={busy}>{busy ? 'Booking…' : 'Book this trip'}</button>
          <p className="muted small center booking-note">You can rate this destination after your visit.</p>
        </form>
      ) : (
        <>
          <p className="muted">Log in to book this destination and share feedback after your visit.</p>
          <Link className="btn btn-primary btn-block btn-lg" to="/login" state={{ from: `/destinations/${destination.id}` }}>Log in to book</Link>
        </>
      )}
    </aside>
  );
}

// Phone/tablet: a bar pinned to the bottom until the booking card scrolls into view.
function MobileBookingBar({ destination, summary }) {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const card = document.getElementById('book');
    if (!card || !('IntersectionObserver' in window)) return undefined;
    const io = new IntersectionObserver(([entry]) => setHidden(entry.isIntersecting), { threshold: 0.15 });
    io.observe(card);
    return () => io.disconnect();
  }, []);

  return (
    <div className={`mobile-cta ${hidden ? 'is-hidden' : ''}`}>
      <div className="mobile-cta-info">
        <strong>{peso(destination.price)}</strong> <span className="muted small">/ person</span>
        {summary?.total > 0 && <span className="small mobile-cta-rating"><Star size={12} className="star on" /> {summary.avg_rating.toFixed(1)} · {summary.positive_pct}% positive</span>}
      </div>
      <button type="button" className="btn btn-primary"
        onClick={() => document.getElementById('book')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>
        Book now
      </button>
    </div>
  );
}

export default function DestinationDetail() {
  const { id } = useParams();
  const destination = useFetch(() => destinations.get(id), [id]);
  const summary = useFetch(() => destinations.summary(id), [id]);

  return (
    <main className="page detail-page">
      <div className="container">
        <Link to="/" className="back-link"><ArrowLeft size={16} /> All destinations</Link>
        <Loadable state={destination}>
          {(d) => (
            <>
              <div className="detail-top">
                <div className="detail-title">
                  <span className="category-pill"><CategoryIcon category={d.category} size={14} /> {categoryLabel(d.category)}</span>
                  <h1>{d.name}</h1>
                  <p className="detail-meta">
                    <span><MapPin size={16} /> {d.province}, {d.region}</span>
                    {summary.data?.total > 0 && (
                      <>
                        <span><Star size={16} className="star on" /> {summary.data.avg_rating.toFixed(1)} · {plural(summary.data.total, 'review')}</span>
                        <span><Smile size={16} /> {summary.data.positive_pct}% positive</span>
                      </>
                    )}
                  </p>
                </div>
                <div className="detail-cover">
                  <Cover destination={d} size="lg" />
                </div>
              </div>

              <div className="detail-layout">
                <div className="detail-main">
                  <section className="card">
                    <h2>About this place</h2>
                    <p className="lead">{d.description}</p>
                  </section>

                  <section className="card">
                    <h2>Visitor feedback</h2>
                    <Loadable state={summary}>{(s) => <FeedbackSummary summary={s} />}</Loadable>
                  </section>

                  <Reviews destinationId={d.id} summary={summary.data} />
                </div>
                <BookingCard destination={d} />
              </div>
              <MobileBookingBar destination={d} summary={summary.data} />
            </>
          )}
        </Loadable>
      </div>
    </main>
  );
}
