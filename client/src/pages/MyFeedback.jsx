import { Link } from 'react-router-dom';
import { MessageSquare, Star } from 'lucide-react';
import { feedback } from '../data.js';
import { useAuth } from '../auth.jsx';
import { Cover, EmptyState, Loadable, SentimentBadge, Stars, formatDate, plural, useFetch } from '../components/ui.jsx';

function Summary({ items }) {
  const avg = items.reduce((s, f) => s + f.rating, 0) / items.length;
  const count = (label) => items.filter((f) => f.sentiment_label === label).length;
  return (
    <div className="stat-row two-up">
      <div className="stat"><span className="stat-icon blue"><MessageSquare size={20} /></span><div><span className="stat-value">{items.length}</span><span className="stat-label">{items.length === 1 ? 'Review' : 'Reviews'} written</span></div></div>
      <div className="stat"><span className="stat-icon amber"><Star size={20} /></span><div><span className="stat-value">{avg.toFixed(1)}</span><span className="stat-label">Average rating given</span></div></div>
      <div className="stat stat-mood">
        <div>
          <span className="stat-label">Sentiment of your reviews</span>
          <span className="mood-badges">
            {['Positive', 'Neutral', 'Negative'].map((l) => count(l) > 0 && (
              <span key={l} className="mood-item"><SentimentBadge label={l} /> {count(l)}</span>
            ))}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function MyFeedback() {
  const { user } = useAuth();
  const state = useFetch(() => feedback.mine(user.id), [user.id]);

  return (
    <main className="page container">
      <div className="page-head">
        <div>
          <span className="eyebrow">Reviews</span>
          <h1>My Feedback</h1>
        </div>
      </div>
      <Loadable state={state}
        empty={<EmptyState icon={MessageSquare} title="No feedback yet">You can rate a destination after your visit, from <Link to="/bookings">My Bookings</Link>.</EmptyState>}>
        {(items) => (
          <>
            <Summary items={items} />
            <ul className="review-list">
              {items.map((f) => (
                <li key={f.id} className="card review my-review">
                  <Cover destination={{ name: f.destination.name, image_url: f.destination.image_url }} size="thumb" />
                  <div className="my-review-body">
                    <div className="review-head">
                      <div>
                        <Link to={`/destinations/${f.destination.id}`}><strong>{f.destination.name}</strong></Link>
                        <span className="muted small">Visited {formatDate(f.booking.visit_date)} · reviewed {formatDate(f.created_at)}</span>
                      </div>
                      <SentimentBadge label={f.sentiment_label} />
                    </div>
                    <Stars value={f.rating} />
                    <p>{f.comment}</p>
                    {f.tags.length > 0 && <div className="tags">{f.tags.map((t) => <span key={t} className="tag">{t}</span>)}</div>}
                  </div>
                </li>
              ))}
            </ul>
            <p className="muted small center">{plural(items.length, 'review')} · thank you for helping other travelers.</p>
          </>
        )}
      </Loadable>
    </main>
  );
}
