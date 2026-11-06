import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, Check, Info, MapPin, Users } from 'lucide-react';
import { FEEDBACK_TAGS, MIN_COMMENT_LENGTH, bookings, feedback } from '../data.js';
import { useUI } from '../components/overlays.jsx';
import { Cover, ErrorNote, Loadable, StarInput, TAG_ICONS, formatDate, plural, useFetch } from '../components/ui.jsx';

function TripSummary({ booking }) {
  return (
    <aside className="card trip-summary">
      <Cover destination={{ name: booking.destination_name, image_url: booking.image_url }} size="sm" />
      <div className="trip-summary-body">
        <span className="eyebrow">Your visit</span>
        <h2>{booking.destination_name}</h2>
        <ul className="trip-summary-meta">
          <li><MapPin size={15} /> {booking.province}, {booking.region}</li>
          <li><CalendarDays size={15} /> Visited {formatDate(booking.visit_date)}</li>
          <li><Users size={15} /> {plural(booking.guests, 'guest')}</li>
        </ul>
        <p className="note"><Info size={15} /> <span>We read written feedback with VADER sentiment analysis to understand how visitors feel about each destination.</span></p>
      </div>
    </aside>
  );
}

function FeedbackForm({ booking }) {
  const navigate = useNavigate();
  const { toast } = useUI();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [tags, setTags] = useState([]);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const toggleTag = (tag) => setTags((t) => (t.includes(tag) ? t.filter((x) => x !== tag) : [...t, tag]));
  const length = comment.trim().length;
  const remaining = MIN_COMMENT_LENGTH - length;

  const onSubmit = async (e) => {
    e.preventDefault();
    const local = {};
    if (!rating) local.rating = 'Please choose a star rating.';
    if (remaining > 0) local.comment = `Please write at least ${MIN_COMMENT_LENGTH} characters about your visit.`;
    setErrors(local);
    if (Object.keys(local).length) return;

    setBusy(true);
    setFormError('');
    try {
      // Only the raw input is sent; the Edge Function computes the sentiment.
      await feedback.submit({ booking_id: booking.id, rating, comment, tags });
      toast.success('Salamat! Your feedback has been submitted.');
      navigate('/my-feedback');
    } catch (err) {
      setErrors(err.fields || {});
      setFormError(err.message);
      setBusy(false);
    }
  };

  return (
    <form className="card rate-form" onSubmit={onSubmit} noValidate>
      <fieldset>
        <legend>How would you rate your visit?</legend>
        <StarInput value={rating} onChange={setRating} />
        {errors.rating && <p className="field-error">{errors.rating}</p>}
      </fieldset>

      <fieldset>
        <legend><label htmlFor="comment">Tell us about your experience</label></legend>
        <textarea
          id="comment"
          rows={6}
          maxLength={2000}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={`What did you enjoy at ${booking.destination_name}? What could be better?`}
          aria-describedby="comment-hint"
          aria-invalid={Boolean(errors.comment)}
        />
        <div className="counter" id="comment-hint">
          <div className="counter-bar"><span style={{ width: `${Math.min(100, (length / MIN_COMMENT_LENGTH) * 100)}%` }} /></div>
          <span className="muted small">
            {remaining > 0 ? `${remaining} more character${remaining === 1 ? '' : 's'} needed` : `${comment.length} / 2000`}
          </span>
        </div>
        {errors.comment && <p className="field-error">{errors.comment}</p>}
      </fieldset>

      <fieldset>
        <legend>What stood out? <span className="muted">(optional)</span></legend>
        <div className="tag-picker">
          {FEEDBACK_TAGS.map((tag) => {
            const on = tags.includes(tag);
            const Icon = TAG_ICONS[tag];
            return (
              <button key={tag} type="button" className={on ? 'tag-toggle on' : 'tag-toggle'} aria-pressed={on} onClick={() => toggleTag(tag)}>
                {on ? <Check size={15} strokeWidth={3} /> : <Icon size={15} />} {tag}
              </button>
            );
          })}
        </div>
        {errors.tags && <p className="field-error">{errors.tags}</p>}
      </fieldset>

      {formError && <ErrorNote>{formError}</ErrorNote>}
      <div className="form-actions">
        <Link to="/bookings" className="btn btn-ghost">Cancel</Link>
        <button className="btn btn-primary btn-lg" disabled={busy}>{busy ? 'Submitting…' : 'Submit feedback'}</button>
      </div>
    </form>
  );
}

export default function RateVisit() {
  const { id } = useParams();
  const state = useFetch(() => bookings.get(id), [id]);

  return (
    <main className="page container">
      <Link to="/bookings" className="back-link"><ArrowLeft size={16} /> My Bookings</Link>
      <Loadable state={state}>
        {(booking) => (
          <>
            <div className="page-head">
              <div>
                <span className="eyebrow">Rate your visit</span>
                <h1>How was {booking.destination_name}?</h1>
              </div>
            </div>
            <div className="rate-layout">
              <TripSummary booking={booking} />
              {booking.feedback_id ? (
                <p className="alert alert-info"><Info size={18} /> <span>You already left feedback for this visit. <Link to="/my-feedback">See My Feedback</Link>.</span></p>
              ) : !booking.can_rate ? (
                <p className="alert alert-info"><Info size={18} /> <span>You can rate this destination after your visit date.</span></p>
              ) : (
                <FeedbackForm booking={booking} />
              )}
            </div>
          </>
        )}
      </Loadable>
    </main>
  );
}
