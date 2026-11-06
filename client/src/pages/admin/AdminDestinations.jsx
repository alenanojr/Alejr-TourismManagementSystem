import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, ImageIcon, MapPin, MapPinned, Pencil, Plus, Search, Star, Trash2 } from 'lucide-react';
import { ViewOnlyNotice, isViewer, useAuth } from '../../auth.jsx';
import { adminData, destinations } from '../../data.js';
import { useUI } from '../../components/overlays.jsx';
import { CategoryIcon, Cover, EmptyState, Loadable, categoryLabel, peso, plural, useFetch } from '../../components/ui.jsx';

const REGIONS = ['', 'Luzon', 'Visayas', 'Mindanao'];

function AdminDestinationCard({ d, onDelete, readOnly }) {
  return (
    <article className="card admin-dest">
      <Cover destination={d}>
        <span className="cover-tag"><CategoryIcon category={d.category} size={13} /> {categoryLabel(d.category)}</span>
      </Cover>
      <div className="admin-dest-body">
        <h3>{d.name}</h3>
        <p className="dest-place"><MapPin size={14} /> {d.province}, {d.region}</p>
        <div className="admin-dest-meta">
          <span className="price">{peso(d.price)}<small>/person</small></span>
          <span className="muted small">
            {d.feedback_count ? <><Star size={13} className="star on" /> {d.avg_rating.toFixed(1)} · {plural(d.feedback_count, 'review')}</> : 'No reviews yet'}
          </span>
        </div>
        {!d.image_url && <p className="admin-dest-warn"><ImageIcon size={14} /> Add a photo so tourists can see this spot.</p>}
      </div>
      <div className="admin-dest-actions">
        <Link className="btn btn-ghost btn-sm" to={`/destinations/${d.id}`}><Eye size={15} /> View</Link>
        {!readOnly && (
          <>
            <Link className="btn btn-ghost btn-sm" to={`/admin/destinations/${d.id}/edit`}><Pencil size={15} /> Edit</Link>
            <button type="button" className="btn btn-ghost btn-sm btn-danger-text" onClick={() => onDelete(d)} aria-label={`Delete ${d.name}`}>
              <Trash2 size={15} /> Delete
            </button>
          </>
        )}
      </div>
    </article>
  );
}

export default function AdminDestinations() {
  const { toast, confirm } = useUI();
  const readOnly = isViewer(useAuth().user);
  const [reload, setReload] = useState(0);
  const state = useFetch(() => destinations.list(''), [reload]);
  const [search, setSearch] = useState('');
  const [region, setRegion] = useState('');

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (state.data || [])
      .filter((d) => !region || d.region === region)
      .filter((d) => !term || `${d.name} ${d.province}`.toLowerCase().includes(term))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [state.data, search, region]);

  const missingPhotos = (state.data || []).filter((d) => !d.image_url).length;

  const remove = async (d) => {
    const ok = await confirm({
      title: `Delete ${d.name}?`,
      message: 'This permanently removes the destination together with its bookings and visitor feedback. This cannot be undone.',
      confirmLabel: 'Delete destination',
      cancelLabel: 'Keep it',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await adminData.deleteDestination(d.id);
      if (d.image_url) adminData.removeImage(d.image_url).catch(() => {});
      toast.success(`${d.name} was deleted.`);
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
          <h1>Destinations</h1>
          <p className="muted">Tourist spots that visitors can book. Add photos, location and price.</p>
        </div>
        {!readOnly && <Link to="/admin/destinations/new" className="btn btn-primary"><Plus size={18} /> Add destination</Link>}
      </div>
      <ViewOnlyNotice />

      <Loadable state={state}
        empty={(
          <EmptyState icon={MapPinned} title="No destinations yet">
            <p>Add your first tourist spot with a photo, location and price.</p>
            {!readOnly && <Link to="/admin/destinations/new" className="btn btn-primary"><Plus size={18} /> Add destination</Link>}
          </EmptyState>
        )}>
        {(all) => (
          <>
            {missingPhotos > 0 && !readOnly && (
              <p className="alert alert-info"><ImageIcon size={18} /> <span>{plural(missingPhotos, 'destination')} {missingPhotos === 1 ? 'has' : 'have'} no photo yet. Open <strong>Edit</strong> to upload one.</span></p>
            )}
            <div className="card table-toolbar-card">
              <label className="search-field">
                <Search size={17} aria-hidden="true" />
                <input type="search" placeholder="Search name or location" value={search}
                  onChange={(e) => setSearch(e.target.value)} aria-label="Search destinations" />
              </label>
              <div className="chip-scroll compact" role="group" aria-label="Region">
                {REGIONS.map((r) => (
                  <button key={r || 'all'} type="button" aria-pressed={region === r}
                    className={region === r ? 'chip active' : 'chip'} onClick={() => setRegion(r)}>
                    {r || 'All'} <span className="chip-count">{r ? all.filter((d) => d.region === r).length : all.length}</span>
                  </button>
                ))}
              </div>
            </div>

            {rows.length ? (
              <div className="admin-dest-grid">
                {rows.map((d) => <AdminDestinationCard key={d.id} d={d} onDelete={remove} readOnly={readOnly} />)}
              </div>
            ) : (
              <EmptyState icon={Search} title="No destinations match">Try another name, location or region.</EmptyState>
            )}
          </>
        )}
      </Loadable>
    </main>
  );
}
