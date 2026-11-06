import { useMemo, useState } from 'react';
import { ArrowUpDown, MapPin, MessageSquare, Search, SearchX, Smile, X } from 'lucide-react';
import { destinations } from '../data.js';
import DestinationCard from '../components/DestinationCard.jsx';
import { CATEGORIES, EmptyState, Loadable, plural, useFetch } from '../components/ui.jsx';

const REGIONS = [
  { key: '', label: 'All' },
  { key: 'Luzon', label: 'Luzon' },
  { key: 'Visayas', label: 'Visayas' },
  { key: 'Mindanao', label: 'Mindanao' },
];

// Laplace-smoothed share of positive feedback, so one glowing review doesn't top the list.
const positiveShare = (d) => (d.positive_count + 1) / (d.feedback_count + 2);

const SORTS = {
  recommended: { label: 'Recommended', fn: (a, b) => positiveShare(b) - positiveShare(a) || b.feedback_count - a.feedback_count },
  rating: { label: 'Top rated', fn: (a, b) => (b.avg_rating ?? 0) - (a.avg_rating ?? 0) || b.feedback_count - a.feedback_count },
  reviews: { label: 'Most reviewed', fn: (a, b) => b.feedback_count - a.feedback_count },
  'price-asc': { label: 'Price: low to high', fn: (a, b) => a.price - b.price },
  'price-desc': { label: 'Price: high to low', fn: (a, b) => b.price - a.price },
};

function CardSkeleton() {
  return (
    <div className="dest-grid" aria-hidden="true">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="dest-card skeleton">
          <div className="sk-cover" />
          <div className="sk-line w60" />
          <div className="sk-line w40" />
          <div className="sk-line w90" />
        </div>
      ))}
    </div>
  );
}

export default function Destinations() {
  const state = useFetch(() => destinations.list(''), []);
  const [region, setRegion] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('recommended');
  const [search, setSearch] = useState('');

  const stats = useMemo(() => {
    const all = state.data || [];
    const reviews = all.reduce((n, d) => n + d.feedback_count, 0);
    const positive = all.reduce((n, d) => n + d.positive_count, 0);
    return { count: all.length, reviews, positivePct: reviews ? Math.round((positive / reviews) * 100) : null };
  }, [state.data]);

  const list = useMemo(() => {
    if (!state.data) return null;
    const term = search.trim().toLowerCase();
    return state.data
      .filter((d) => !region || d.region === region)
      .filter((d) => !category || d.category === category)
      .filter((d) => !term || `${d.name} ${d.province} ${d.description}`.toLowerCase().includes(term))
      .sort(SORTS[sort].fn);
  }, [state.data, region, category, sort, search]);

  const filtered = Boolean(category || search.trim() || region);
  const reset = () => { setRegion(''); setCategory(''); setSearch(''); };

  return (
    <main className="page">
      <section className="hero hero-photo">
        <div className="hero-inner">
          <span className="eyebrow">Discover the Philippines</span>
          <h1>Explore the <em>Philippines</em></h1>
          <p>White-sand beaches, whale sharks, rice terraces and hidden falls from Luzon to Mindanao. Book your next trip
            and see what real visitors felt after they went.</p>
          <label className="hero-search">
            <Search size={19} aria-hidden="true" />
            <input type="search" placeholder="Search a destination or province" value={search}
              onChange={(e) => setSearch(e.target.value)} aria-label="Search destinations" />
            {search && (
              <button type="button" className="icon-btn" aria-label="Clear search" onClick={() => setSearch('')}><X size={17} /></button>
            )}
          </label>
          {stats.count > 0 && (
            <ul className="hero-stats">
              <li><MapPin size={17} /><strong>{stats.count}</strong> destinations nationwide</li>
              <li><MessageSquare size={17} /><strong>{stats.reviews}</strong> visitor reviews</li>
              {stats.positivePct !== null && <li><Smile size={17} /><strong>{stats.positivePct}%</strong> positive feedback</li>}
            </ul>
          )}
        </div>
        <svg className="hero-wave" viewBox="0 0 1440 60" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 30 C240 0 480 60 720 30 S1200 0 1440 30 V60 H0Z" />
        </svg>
      </section>

      <div className="container">
        <div className="toolbar">
          <div className="segmented" role="tablist" aria-label="Region">
            {REGIONS.map((r) => (
              <button key={r.key || 'all'} type="button" role="tab" aria-selected={region === r.key}
                className={region === r.key ? 'active' : ''} onClick={() => setRegion(r.key)}>
                {r.label}
              </button>
            ))}
          </div>
          <div className="chip-scroll" role="group" aria-label="Category">
            <button type="button" className={!category ? 'chip active' : 'chip'} aria-pressed={!category} onClick={() => setCategory('')}>
              All types
            </button>
            {CATEGORIES.map(({ key, label, Icon }) => (
              <button key={key} type="button" className={category === key ? 'chip active' : 'chip'}
                aria-pressed={category === key} onClick={() => setCategory(category === key ? '' : key)}>
                <Icon size={15} aria-hidden="true" /> {label}
              </button>
            ))}
          </div>
        </div>

        <div className="results-head">
          <span className="results-count">
            {list ? plural(list.length, 'destination') : 'Loading destinations…'}
            {filtered && <button type="button" className="link-btn" onClick={reset}>Reset</button>}
          </span>
          <label className="sort-select">
            <ArrowUpDown size={16} aria-hidden="true" />
            <span className="visually-hidden">Sort by</span>
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              {Object.entries(SORTS).map(([key, s]) => <option key={key} value={key}>{s.label}</option>)}
            </select>
          </label>
        </div>

        <Loadable state={{ ...state, data: list }} skeleton={<CardSkeleton />}
          empty={(
            <EmptyState icon={SearchX} title="No destinations match">
              Try another search, type or region. <button type="button" className="link-btn" onClick={reset}>Reset filters</button>
            </EmptyState>
          )}>
          {(rows) => (
            <div className="dest-grid">
              {rows.map((d) => <DestinationCard key={d.id} d={d} />)}
            </div>
          )}
        </Loadable>
      </div>
    </main>
  );
}
