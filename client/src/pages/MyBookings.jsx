import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Compass, Luggage, Star, Users, Wallet } from 'lucide-react';
import { bookings, daysUntil, todayInManila } from '../data.js';
import { useUI } from '../components/overlays.jsx';
import {
  Cover, EmptyState, Loadable, SentimentBadge, Stars, countdownLabel, formatDate, peso, plural, useFetch,
} from '../components/ui.jsx';

const STATUS_LABEL = { pending: 'Pending', confirmed: 'Confirmed', completed: 'Completed', cancelled: 'Cancelled' };
const TABS = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'past', label: 'Past trips' },
  { key: 'cancelled', label: 'Cancelled' },
];

function groupOf(b, today) {
  if (b.status === 'cancelled') return 'cancelled';
  if (['pending', 'confirmed'].includes(b.status) && b.visit_date >= today) return 'upcoming';
  return 'past';
}

function BookingRow({ b, group, onCancel }) {
  return (
    <li className={`card booking-row ${b.can_rate ? 'needs-rating' : ''}`}>
      <Cover destination={{ name: b.destination_name, image_url: b.image_url }} size="thumb" />
      <div className="booking-info">
        <div className="booking-title">
          <Link to={`/destinations/${b.destination_id}`}><strong>{b.destination_name}</strong></Link>
          <span className={`status status-${b.status}`}>{STATUS_LABEL[b.status]}</span>
        </div>
        <span className="booking-meta">
          <span><CalendarDays size={14} /> {formatDate(b.visit_date)}</span>
          <span><Users size={14} /> {plural(b.guests, 'guest')}</span>
          <span><Wallet size={14} /> {peso(Number(b.price) * b.guests)}</span>
          {group === 'upcoming' && <span className="countdown">{countdownLabel(daysUntil(b.visit_date))}</span>}
        </span>
      </div>
      <div className="booking-action">
        {b.feedback_id ? (
          <span className="rated"><Stars value={b.feedback_rating} /> <SentimentBadge label={b.feedback_sentiment} /></span>
        ) : b.can_rate ? (
          <Link className="btn btn-primary" to={`/bookings/${b.id}/rate`}><Star size={16} /> Rate your visit</Link>
        ) : group === 'upcoming' ? (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => onCancel(b)}>Cancel booking</button>
        ) : null}
      </div>
    </li>
  );
}

export default function MyBookings() {
  const { toast, confirm } = useUI();
  const [reload, setReload] = useState(0);
  const state = useFetch(() => bookings.mine(), [reload]);
  const today = todayInManila();
  const [tab, setTab] = useState(null);

  const groups = useMemo(() => {
    const g = { upcoming: [], past: [], cancelled: [] };
    (state.data || []).forEach((b) => g[groupOf(b, today)].push(b));
    g.upcoming.sort((a, b) => a.visit_date.localeCompare(b.visit_date));
    return g;
  }, [state.data, today]);

  // Default to Upcoming, or Past trips when nothing is coming up.
  useEffect(() => {
    if (tab === null && state.data) setTab(groups.upcoming.length ? 'upcoming' : 'past');
  }, [state.data, groups, tab]);

  const toRate = groups.past.filter((b) => b.can_rate).length;

  const cancel = async (b) => {
    const ok = await confirm({
      title: 'Cancel this booking?',
      message: `Your trip to ${b.destination_name} on ${formatDate(b.visit_date)} will be cancelled.`,
      confirmLabel: 'Cancel booking',
      cancelLabel: 'Keep booking',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await bookings.cancel(b.id);
      toast.success('Booking cancelled.');
      setReload((n) => n + 1);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const active = tab ?? 'upcoming';
  const rows = groups[active];

  return (
    <main className="page container">
      <div className="page-head">
        <div>
          <span className="eyebrow">Trips</span>
          <h1>My Bookings</h1>
        </div>
        <Link to="/" className="btn btn-ghost"><Compass size={17} /> Book a new trip</Link>
      </div>

      <Loadable state={state}
        empty={<EmptyState icon={Luggage} title="No bookings yet"><Link to="/">Explore destinations</Link> to plan your first trip.</EmptyState>}>
        {() => (
          <>
            <div className="tabs" role="tablist" aria-label="Booking groups">
              {TABS.map((t) => (
                <button key={t.key} type="button" role="tab" aria-selected={active === t.key}
                  className={active === t.key ? 'active' : ''} onClick={() => setTab(t.key)}>
                  {t.label}
                  <span className="tab-count">{groups[t.key].length}</span>
                  {t.key === 'past' && toRate > 0 && <span className="tab-dot" title={`${toRate} to rate`} />}
                </button>
              ))}
            </div>

            {active === 'past' && toRate > 0 && (
              <p className="alert alert-info"><Star size={18} /> <span>You have {plural(toRate, 'trip')} waiting for your feedback.</span></p>
            )}

            {rows.length ? (
              <ul className="booking-list">
                {rows.map((b) => <BookingRow key={b.id} b={b} group={active} onCancel={cancel} />)}
              </ul>
            ) : (
              <EmptyState icon={Luggage} title={`No ${TABS.find((t) => t.key === active).label.toLowerCase()}`}>
                {active === 'upcoming' && <Link to="/">Plan your next trip</Link>}
              </EmptyState>
            )}
          </>
        )}
      </Loadable>
    </main>
  );
}
