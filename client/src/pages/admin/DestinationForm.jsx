import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ImagePlus, RefreshCw, Save, Trash2 } from 'lucide-react';
import { IMAGE_TYPES, MAX_IMAGE_MB, adminData, destinations } from '../../data.js';
import { useUI } from '../../components/overlays.jsx';
import DestinationCard from '../../components/DestinationCard.jsx';
import { CATEGORIES, Loadable, useFetch } from '../../components/ui.jsx';

const REGIONS = ['Luzon', 'Visayas', 'Mindanao'];

function validate(v) {
  const errors = {};
  if (v.name.trim().length < 2) errors.name = 'Enter the name of the spot.';
  else if (v.name.trim().length > 120) errors.name = 'Keep the name under 120 characters.';
  if (v.province.trim().length < 2) errors.province = 'Enter the city or province.';
  const price = Number(v.price);
  if (v.price === '' || !Number.isFinite(price) || price < 0) errors.price = 'Enter a price of ₱0 or more.';
  else if (price > 1000000) errors.price = 'That price looks too high.';
  if (v.description.length > 1000) errors.description = 'Keep the description under 1,000 characters.';
  return errors;
}

function PhotoPicker({ preview, error, onPick, onRemove }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    onPick(e.dataTransfer.files?.[0]);
  };

  return (
    <div className="photo-picker">
      <span className="label-text">Photo</span>
      <div
        className={`dropzone ${dragging ? 'dragging' : ''} ${preview ? 'has-image' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        {preview ? (
          <img src={preview} alt="Selected destination photo" />
        ) : (
          <button type="button" className="dropzone-empty" onClick={() => inputRef.current?.click()}>
            <ImagePlus size={34} strokeWidth={1.5} />
            <strong>Upload a photo</strong>
            <span>Drag and drop or click to choose · JPG, PNG or WebP · up to {MAX_IMAGE_MB} MB</span>
          </button>
        )}
      </div>
      <input ref={inputRef} type="file" accept={IMAGE_TYPES.join(',')} hidden
        onChange={(e) => { onPick(e.target.files?.[0]); e.target.value = ''; }} />
      {preview && (
        <div className="photo-actions">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => inputRef.current?.click()}><RefreshCw size={15} /> Replace photo</button>
          <button type="button" className="btn btn-ghost btn-sm btn-danger-text" onClick={onRemove}><Trash2 size={15} /> Remove</button>
        </div>
      )}
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}

function Form({ initial }) {
  const navigate = useNavigate();
  const { toast, confirm } = useUI();
  const [values, setValues] = useState({
    name: initial?.name ?? '',
    province: initial?.province ?? '',
    region: initial?.region ?? 'Luzon',
    category: initial?.category ?? 'beach',
    description: initial?.description ?? '',
    price: initial ? String(Number(initial.price)) : '',
  });
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(initial?.image_url ?? null);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  // Free the temporary preview URL when it is replaced or the page closes.
  useEffect(() => () => { if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview); }, [preview]);

  const set = (key) => (e) => setValues((v) => ({ ...v, [key]: e.target.value }));

  const pickFile = (f) => {
    if (!f) return;
    if (!IMAGE_TYPES.includes(f.type)) {
      setErrors((e) => ({ ...e, image: 'Please choose a JPG, PNG or WebP image.' }));
      return;
    }
    if (f.size > MAX_IMAGE_MB * 1024 * 1024) {
      setErrors((e) => ({ ...e, image: `The photo must be ${MAX_IMAGE_MB} MB or smaller.` }));
      return;
    }
    setErrors(({ image, ...rest }) => rest);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const removePhoto = () => {
    setFile(null);
    setPreview(null);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length) return;

    setBusy(true);
    try {
      let imageUrl = preview && !file ? initial?.image_url ?? null : null;
      if (file) imageUrl = await adminData.uploadImage(file);

      const payload = {
        name: values.name.trim(),
        province: values.province.trim(),
        region: values.region,
        category: values.category,
        description: values.description.trim() || null,
        price: Number(values.price),
        image_url: imageUrl,
      };
      if (initial) await adminData.updateDestination(initial.id, payload);
      else await adminData.createDestination(payload);

      // The old photo is no longer used once it has been replaced or removed.
      if (initial?.image_url && initial.image_url !== imageUrl) adminData.removeImage(initial.image_url).catch(() => {});

      toast.success(initial ? `${payload.name} was updated.` : `${payload.name} was added.`);
      navigate('/admin/destinations');
    } catch (err) {
      toast.error(err.message);
      setBusy(false);
    }
  };

  const onDelete = async () => {
    const ok = await confirm({
      title: `Delete ${initial.name}?`,
      message: 'This permanently removes the destination together with its bookings and visitor feedback. This cannot be undone.',
      confirmLabel: 'Delete destination',
      cancelLabel: 'Keep it',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await adminData.deleteDestination(initial.id);
      if (initial.image_url) adminData.removeImage(initial.image_url).catch(() => {});
      toast.success(`${initial.name} was deleted.`);
      navigate('/admin/destinations');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const previewCard = {
    ...values,
    price: Number(values.price) || 0,
    image_url: preview,
    feedback_count: initial?.feedback_count ?? 0,
    positive_count: initial?.positive_count ?? 0,
    avg_rating: null,
  };

  return (
    <form className="dest-form" onSubmit={onSubmit} noValidate>
      <div className="dest-form-main">
        <section className="card">
          <h2>Spot details</h2>
          <label>
            <span className="label-text">Name of the spot *</span>
            <input value={values.name} onChange={set('name')} placeholder="e.g. Kawasan Falls" maxLength={120} aria-invalid={Boolean(errors.name)} />
            {errors.name && <span className="field-error">{errors.name}</span>}
          </label>
          <div className="form-grid">
            <label>
              <span className="label-text">Location (city / province) *</span>
              <input value={values.province} onChange={set('province')} placeholder="e.g. Badian, Cebu" maxLength={120} aria-invalid={Boolean(errors.province)} />
              {errors.province && <span className="field-error">{errors.province}</span>}
            </label>
            <label>
              <span className="label-text">Region *</span>
              <select value={values.region} onChange={set('region')}>
                {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </label>
            <label>
              <span className="label-text">Type of spot *</span>
              <select value={values.category} onChange={set('category')}>
                {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </label>
            <label>
              <span className="label-text">Price per person (₱) *</span>
              <input type="number" inputMode="decimal" min="0" step="1" value={values.price} onChange={set('price')}
                placeholder="e.g. 1500" aria-invalid={Boolean(errors.price)} />
              {errors.price && <span className="field-error">{errors.price}</span>}
            </label>
          </div>
          <label>
            <span className="label-text">Description</span>
            <textarea rows={5} value={values.description} onChange={set('description')} maxLength={1000}
              placeholder="What makes this spot special? Activities, what to bring, best time to visit…" />
            <span className="muted small">{values.description.length} / 1000</span>
            {errors.description && <span className="field-error">{errors.description}</span>}
          </label>
        </section>

        {initial && (
          <section className="card danger-zone">
            <div>
              <h2>Delete destination</h2>
              <p className="muted small">Removes the spot, its bookings and its visitor feedback.</p>
            </div>
            <button type="button" className="btn btn-danger" onClick={onDelete}><Trash2 size={16} /> Delete</button>
          </section>
        )}
      </div>

      <aside className="dest-form-side">
        <section className="card">
          <PhotoPicker preview={preview} error={errors.image} onPick={pickFile} onRemove={removePhoto} />
        </section>
        <section className="dest-form-preview">
          <span className="label-text">Preview</span>
          <DestinationCard d={previewCard} preview />
        </section>
      </aside>

      <div className="form-actions sticky-actions">
        <Link to="/admin/destinations" className="btn btn-ghost">Cancel</Link>
        <button className="btn btn-primary btn-lg" disabled={busy}>
          <Save size={17} /> {busy ? 'Saving…' : initial ? 'Save changes' : 'Add destination'}
        </button>
      </div>
    </form>
  );
}

export default function DestinationForm() {
  const { id } = useParams();
  const state = useFetch(() => (id ? destinations.get(id) : Promise.resolve(null)), [id]);

  return (
    <main className="page container wide">
      <Link to="/admin/destinations" className="back-link"><ArrowLeft size={16} /> Destinations</Link>
      <div className="page-head">
        <div>
          <span className="eyebrow">Admin</span>
          <h1>{id ? 'Edit destination' : 'Add destination'}</h1>
          <p className="muted">Fields marked * are required. The photo shows on the destination card and page.</p>
        </div>
      </div>
      <Loadable state={state}>{(d) => <Form initial={d} />}</Loadable>
    </main>
  );
}
