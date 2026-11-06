import { Link } from 'react-router-dom';
import { Heart, MapPin, Smile, Star } from 'lucide-react';
import { Cover, categoryLabel, peso, plural } from './ui.jsx';

export const isLoved = (d) => d.feedback_count >= 3 && d.positive_count / d.feedback_count >= 0.7;

// `preview` renders a non-clickable copy, used by the admin form.
export default function DestinationCard({ d, preview = false }) {
  const positivePct = d.feedback_count ? Math.round((d.positive_count / d.feedback_count) * 100) : null;
  const body = (
    <>
      <Cover destination={d}>
        <span className="cover-tag">{categoryLabel(d.category)}</span>
        {d.avg_rating ? <span className="cover-rating"><Star size={13} /> {d.avg_rating.toFixed(1)}</span> : null}
        {isLoved(d) && <span className="cover-loved"><Heart size={13} /> Loved by visitors</span>}
      </Cover>
      <div className="dest-body">
        <h3>{d.name || 'Destination name'}</h3>
        <p className="dest-place"><MapPin size={14} /> {d.province || 'Location'}, {d.region}</p>
        <p className="dest-desc">{d.description || 'A short description of the spot appears here.'}</p>
        <div className="dest-foot">
          {positivePct === null ? (
            <span className="muted small">No reviews yet</span>
          ) : (
            <span className="dest-mood" title={`${positivePct}% of ${plural(d.feedback_count, 'review')} are positive`}>
              <Smile size={15} /> {positivePct}% positive <span className="muted">· {d.feedback_count}</span>
            </span>
          )}
          <span className="price">{peso(d.price || 0)}<small>/person</small></span>
        </div>
      </div>
    </>
  );
  return preview
    ? <div className="dest-card is-preview" aria-label="Card preview">{body}</div>
    : <Link to={`/destinations/${d.id}`} className="dest-card">{body}</Link>;
}
