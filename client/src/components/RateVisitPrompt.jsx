import { Link } from 'react-router-dom';
import { MessageSquareHeart, Star } from 'lucide-react';
import { Cover, formatDate } from './ui.jsx';

// "Rate your visit" cards for finished bookings that have no feedback yet.
export default function RateVisitPrompt({ pending }) {
  if (!pending?.length) return null;
  return (
    <section className="prompt" aria-labelledby="rate-heading">
      <div className="prompt-head">
        <span className="prompt-icon"><MessageSquareHeart size={22} /></span>
        <div>
          <h2 id="rate-heading">Rate your visit</h2>
          <p>How was your trip? Your feedback helps other travelers and the destinations.</p>
        </div>
      </div>
      <ul className="prompt-list">
        {pending.map((b) => (
          <li key={b.id}>
            <Cover destination={{ name: b.destination_name, image_url: b.image_url }} size="thumb" />
            <div className="prompt-info">
              <strong>{b.destination_name}</strong>
              <span className="muted small">{b.province} · visited {formatDate(b.visit_date)}</span>
            </div>
            <Link className="btn btn-primary" to={`/bookings/${b.id}/rate`}><Star size={16} /> Rate your visit</Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
