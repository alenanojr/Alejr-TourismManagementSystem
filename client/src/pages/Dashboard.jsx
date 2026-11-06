import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, CheckCircle2, Compass, MessageSquare, Plane, Users } from 'lucide-react';
import { bookings, daysUntil, todayInManila } from '../data.js';
import { useAuth } from '../auth.jsx';
import RateVisitPrompt from '../components/RateVisitPrompt.jsx';
import { HeroArt } from '../components/HeroArt.jsx';
import { Cover, EmptyState, Loadable, countdownLabel, formatDate, plural, useFetch } from '../components/ui.jsx';

function Welcome({ name, next }) {
  const today = new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'Asia/Manila' });
  const days = next ? daysUntil(next.visit_date) : null;
  return (
    <section className="welcome">
      <div className="welcome-content">
        <span className="eyebrow">{today}</span>
        <h1>Mabuhay, {name}!</h1>
        {next ? (
          <p>Your next trip is <strong>{next.destination_name}</strong> on {formatDate(next.visit_date, { year: undefined })}
            {' '}— {countdownLabel(days).toLowerCase()}.</p>
        ) : (
          <p>No trips planned yet. Your next island adventure is a few taps away.</p>
        )}
        <div className="welcome-actions">
          {next && (
            <Link className="btn btn-light" to={`/destinations/${next.destination_id}`}>View trip <ArrowRight size={16} /></Link>
          )}
          <Link className="btn btn-glass" to="/"><Compass size={17} /> Explore destinations</Link>
        </div>
      </div>
      <HeroArt />
    </section>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const state = useFetch(() => bookings.mine(), []);
  const today = todayInManila();
  const firstName = user.name.split(' ')[0];

  return (
    <main className="page container">
      <Loadable state={state}>
        {(list) => {
          const upcoming = list
            .filter((b) => b.visit_date >= today && ['pending', 'confirmed'].includes(b.status))
            .sort((a, b) => a.visit_date.localeCompare(b.visit_date));
          const pending = list.filter((b) => b.can_rate);
          const visited = list.filter((b) => b.status === 'completed' || (b.status === 'confirmed' && b.visit_date < today));
          const rated = list.filter((b) => b.feedback_id);

          return (
            <>
              <Welcome name={firstName} next={upcoming[0]} />

              <div className="stat-row">
                <div className="stat"><span className="stat-icon blue"><Plane size={20} /></span><div><span className="stat-value">{upcoming.length}</span><span className="stat-label">Upcoming trips</span></div></div>
                <div className="stat"><span className="stat-icon green"><CheckCircle2 size={20} /></span><div><span className="stat-value">{visited.length}</span><span className="stat-label">Places visited</span></div></div>
                <div className="stat"><span className="stat-icon amber"><MessageSquare size={20} /></span><div><span className="stat-value">{rated.length}</span><span className="stat-label">Reviews given</span></div></div>
              </div>

              <RateVisitPrompt pending={pending} />

              <section>
                <div className="section-head">
                  <h2>Upcoming trips</h2>
                  {upcoming.length > 0 && <Link to="/bookings" className="see-all">All bookings <ArrowRight size={15} /></Link>}
                </div>
                {upcoming.length ? (
                  <ul className="trip-grid">
                    {upcoming.map((b) => (
                      <li key={b.id}>
                        <Link to={`/destinations/${b.destination_id}`} className="card trip-card">
                          <Cover destination={{ name: b.destination_name, image_url: b.image_url }} size="sm">
                            <span className="cover-countdown">{countdownLabel(daysUntil(b.visit_date))}</span>
                          </Cover>
                          <div className="trip-body">
                            <strong>{b.destination_name}</strong>
                            <span className="muted small">{b.province}, {b.region}</span>
                            <span className="trip-meta">
                              <span><CalendarDays size={14} /> {formatDate(b.visit_date)}</span>
                              <span><Users size={14} /> {plural(b.guests, 'guest')}</span>
                            </span>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState icon={Plane} title="No upcoming trips">
                    <Link to="/">Find your next destination</Link>
                  </EmptyState>
                )}
              </section>
            </>
          );
        }}
      </Loadable>
    </main>
  );
}
