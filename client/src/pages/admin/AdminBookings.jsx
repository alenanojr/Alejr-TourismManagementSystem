import { useMemo, useState } from 'react';
import { Info, Luggage, Search } from 'lucide-react';
import { ViewOnlyNotice, isViewer, useAuth } from '../../auth.jsx';
import { adminData } from '../../data.js';
import { useUI } from '../../components/overlays.jsx';
import { EmptyState, Loadable, formatDate, useFetch } from '../../components/ui.jsx';

const STATUSES = ['pending', 'confirmed', 'completed', 'cancelled'];
const label = (s) => s[0].toUpperCase() + s.slice(1);

export default function AdminBookings() {
  const { toast } = useUI();
  const readOnly = isViewer(useAuth().user);
  const [reload, setReload] = useState(0);
  const state = useFetch(() => adminData.bookings(), [reload]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (state.data || []).filter((b) =>
      (!status || b.status === status)
      && (!term || `${b.user_name} ${b.user_email} ${b.destination_name}`.toLowerCase().includes(term)));
  }, [state.data, search, status]);

  const counts = useMemo(() => {
    const c = { '': state.data?.length ?? 0 };
    STATUSES.forEach((s) => { c[s] = (state.data || []).filter((b) => b.status === s).length; });
    return c;
  }, [state.data]);

  const setBookingStatus = async (b, next) => {
    try {
      await adminData.setBookingStatus(b.id, next);
      toast.success(`Booking #${b.id} marked ${next}.`);
      setReload((n) => n + 1);
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <main className="page container wide">
      <div className="page-head">
        <div>
          <span className="eyebrow">Admin</span>
          <h1>Manage Bookings</h1>
        </div>
      </div>
      <ViewOnlyNotice />
      {!readOnly && <p className="alert alert-info"><Info size={18} /> <span>Marking a booking <strong>completed</strong> lets the tourist rate it right away, even before the visit date.</span></p>}

      <Loadable state={state} empty={<EmptyState icon={Luggage} title="No bookings yet" />}>
        {() => (
          <div className="card table-section">
            <div className="table-toolbar">
              <label className="search-field">
                <Search size={17} aria-hidden="true" />
                <input type="search" placeholder="Search tourist or destination" value={search}
                  onChange={(e) => setSearch(e.target.value)} aria-label="Search bookings" />
              </label>
              <div className="chip-scroll compact" role="group" aria-label="Status">
                {['', ...STATUSES].map((s) => (
                  <button key={s || 'all'} type="button" aria-pressed={status === s}
                    className={status === s ? 'chip active' : 'chip'} onClick={() => setStatus(s)}>
                    {s ? label(s) : 'All'} <span className="chip-count">{counts[s]}</span>
                  </button>
                ))}
              </div>
            </div>

            {rows.length ? (
              <div className="table-wrap">
                <table className="rtable">
                  <thead><tr><th>#</th><th>Tourist</th><th>Destination</th><th>Visit date</th><th className="num">Guests</th><th>Status</th><th>Feedback</th></tr></thead>
                  <tbody>
                    {rows.map((b) => (
                      <tr key={b.id}>
                        <td data-label="Booking" className="muted">#{b.id}</td>
                        <td data-label="Tourist"><div>{b.user_name}{b.user_email && <><br /><span className="muted small">{b.user_email}</span></>}</div></td>
                        <td data-label="Destination">{b.destination_name}</td>
                        <td data-label="Visit date" className="nowrap">{formatDate(b.visit_date)}</td>
                        <td data-label="Guests" className="num">{b.guests}</td>
                        <td data-label="Status">
                          {readOnly ? <span className={`status status-${b.status}`}>{label(b.status)}</span> : (
                            <select className={`status-select status-${b.status}`} value={b.status}
                              aria-label={`Status for booking ${b.id}`} onChange={(e) => setBookingStatus(b, e.target.value)}>
                              {STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
                            </select>
                          )}
                        </td>
                        <td data-label="Feedback">{b.feedback_id ? <span className="badge badge-positive">Received</span> : <span className="muted">—</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="muted">No bookings match.</p>}
          </div>
        )}
      </Loadable>
    </main>
  );
}
