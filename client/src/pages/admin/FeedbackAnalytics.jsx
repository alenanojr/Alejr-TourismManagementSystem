import { useMemo, useState } from 'react';
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart,
  ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { BarChart3, ChevronDown, Download, MessageSquare, SlidersHorizontal, Smile, Star, ThumbsDown, X } from 'lucide-react';
import { ViewOnlyNotice } from '../../auth.jsx';
import { adminData, destinations as destinationData } from '../../data.js';
import { FEEDBACK_CSV_COLUMNS, downloadCsv, toCsv } from '../../lib/csv.js';
import { useUI } from '../../components/overlays.jsx';
import { EmptyState, Loadable, SentimentBadge, Stars, formatDate, useFetch, useMediaQuery } from '../../components/ui.jsx';
import { useChartColors } from './useChartColors.js';

const SENTIMENTS = [
  { key: 'positive', label: 'Positive' },
  { key: 'neutral', label: 'Neutral' },
  { key: 'negative', label: 'Negative' },
];

const fmtScore = (n) => (n > 0 ? `+${n.toFixed(3)}` : n.toFixed(3));
const truncate = (s, n) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

// Single-line axis label: Recharts' default tick wraps long names onto two lines.
function CategoryTick({ x, y, payload, fill, fontSize, max, format = (v) => v }) {
  return (
    <text x={x} y={y} dy={4} textAnchor="end" fill={fill} fontSize={fontSize}>
      <title>{payload.value}</title>
      {truncate(format(payload.value), max)}
    </text>
  );
}

function ChartTooltip({ active, payload, render }) {
  if (!active || !payload?.length) return null;
  return <div className="chart-tooltip">{render(payload[0].payload)}</div>;
}

function ChartCard({ title, subtitle, children, className = '' }) {
  return (
    <figure className={`card chart-card ${className}`}>
      <figcaption>
        <h2>{title}</h2>
        {subtitle && <p className="muted small">{subtitle}</p>}
      </figcaption>
      {children}
    </figure>
  );
}

function Filters({ destinations, filters, setFilters }) {
  const [open, setOpen] = useState(false);
  const set = (key) => (e) => setFilters((f) => ({ ...f, [key]: e.target.value }));
  const activeCount = [filters.destination_id, filters.from, filters.to].filter(Boolean).length;
  return (
    <div className={`card filters ${open ? 'open' : ''}`}>
      <button type="button" className="filters-toggle" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <SlidersHorizontal size={17} /> Filters
        {activeCount > 0 && <span className="chip-count">{activeCount}</span>}
        <ChevronDown size={17} className="chevron" />
      </button>
      <div className="filters-body">
        <label>
          <span className="label-text">Destination</span>
          <select value={filters.destination_id} onChange={set('destination_id')}>
            <option value="">All destinations</option>
            {destinations.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </label>
        <label><span className="label-text">From</span><input type="date" value={filters.from} onChange={set('from')} /></label>
        <label><span className="label-text">To</span><input type="date" value={filters.to} min={filters.from || undefined} onChange={set('to')} /></label>
        <label>
          <span className="label-text">Trend by</span>
          <select value={filters.granularity} onChange={set('granularity')}>
            <option value="day">Day</option>
            <option value="week">Week</option>
            <option value="month">Month</option>
          </select>
        </label>
        {activeCount > 0 && (
          <button type="button" className="btn btn-ghost btn-sm filters-clear"
            onClick={() => setFilters((f) => ({ ...f, destination_id: '', from: '', to: '' }))}>
            <X size={14} /> Clear filters
          </button>
        )}
      </div>
    </div>
  );
}

function KpiRow({ rows }) {
  const total = rows.reduce((s, r) => s + r.total, 0);
  const sum = (k) => rows.reduce((s, r) => s + r[k], 0);
  const avgRating = rows.reduce((s, r) => s + r.avg_rating * r.total, 0) / total;
  const avgCompound = rows.reduce((s, r) => s + r.avg_compound * r.total, 0) / total;
  const kpis = [
    { icon: MessageSquare, tone: 'blue', label: 'Total feedback', value: total },
    { icon: Star, tone: 'amber', label: 'Average rating', value: avgRating.toFixed(2) },
    { icon: BarChart3, tone: 'violet', label: 'Average sentiment', value: fmtScore(avgCompound) },
    { icon: Smile, tone: 'green', label: 'Positive', value: `${Math.round((sum('positive') / total) * 100)}%` },
    { icon: ThumbsDown, tone: 'red', label: 'Negative to follow up', value: sum('negative') },
  ];
  return (
    <div className="kpis">
      {kpis.map(({ icon: Icon, tone, label, value }) => (
        <div key={label} className="stat">
          <span className={`stat-icon ${tone}`}><Icon size={20} /></span>
          <div><span className="stat-value">{value}</span><span className="stat-label">{label}</span></div>
        </div>
      ))}
    </div>
  );
}

function BreakdownCharts({ rows, colors, compact }) {
  const totals = SENTIMENTS.map((s) => ({ ...s, value: rows.reduce((n, r) => n + r[s.key], 0) }));
  const grand = totals.reduce((n, t) => n + t.value, 0);
  const pct = (n) => (grand ? Math.round((n / grand) * 100) : 0);
  const tick = { fill: colors.axis, fontSize: compact ? 11 : 12 };

  return (
    <div className="chart-row chart-row-main">
      <ChartCard title="Sentiment by destination" subtitle="Number of feedback entries">
        <ResponsiveContainer width="100%" height={Math.max(220, rows.length * (compact ? 30 : 34) + 60)}>
          <BarChart data={rows} layout="vertical" margin={{ left: 0, right: compact ? 8 : 16 }} barCategoryGap={compact ? 6 : 8}>
            <CartesianGrid horizontal={false} stroke={colors.grid} />
            <XAxis type="number" allowDecimals={false} tick={tick} stroke={colors.grid} />
            <YAxis type="category" dataKey="destination_name" width={compact ? 100 : 150} stroke={colors.grid}
              tick={<CategoryTick fill={tick.fill} fontSize={tick.fontSize} max={compact ? 14 : 24} />} />
            <Tooltip cursor={{ fill: colors.grid, opacity: 0.5 }}
              content={<ChartTooltip render={(r) => (
                <>
                  <strong>{r.destination_name}</strong>
                  {SENTIMENTS.map((s) => (
                    <div key={s.key}><span className={`dot seg-${s.key}`} /> {s.label}: {r[s.key]} ({Math.round((r[s.key] / r.total) * 100)}%)</div>
                  ))}
                  <div className="muted">Average rating {r.avg_rating.toFixed(2)} · score {fmtScore(r.avg_compound)}</div>
                </>
              )} />} />
            <Legend wrapperStyle={{ color: colors.text, fontSize: 13 }} />
            {SENTIMENTS.map((s, i) => (
              <Bar key={s.key} dataKey={s.key} name={s.label} stackId="s" fill={colors[s.key]}
                stroke={colors.surface} strokeWidth={2} maxBarSize={22} isAnimationActive={false}
                radius={i === SENTIMENTS.length - 1 ? [0, 4, 4, 0] : 0} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Overall sentiment" subtitle={`${grand} feedback entries`}>
        <div className="donut">
          <ResponsiveContainer width="100%" height={compact ? 200 : 230}>
            <PieChart>
              <Pie data={totals} dataKey="value" nameKey="label" innerRadius="62%" outerRadius="90%"
                stroke={colors.surface} strokeWidth={3} isAnimationActive={false}>
                {totals.map((t) => <Cell key={t.key} fill={colors[t.key]} />)}
              </Pie>
              <Tooltip content={<ChartTooltip render={(t) => <><strong>{t.label}</strong><div>{t.value} ({pct(t.value)}%)</div></>} />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="donut-center" aria-hidden="true">
            <strong>{pct(totals[0].value)}%</strong>
            <span>positive</span>
          </div>
        </div>
        <ul className="sentiment-legend stacked">
          {totals.map((t) => (
            <li key={t.key}>
              <span className={`dot seg-${t.key}`} aria-hidden="true" />
              {t.label}
              <span className="legend-value"><strong>{pct(t.value)}%</strong> <span className="muted">({t.value})</span></span>
            </li>
          ))}
        </ul>
      </ChartCard>
    </div>
  );
}

function TrendChart({ points, granularity, colors, compact }) {
  const fmtPeriod = (p) => {
    const d = new Date(`${p}T00:00:00`);
    return granularity === 'month'
      ? d.toLocaleDateString('en-PH', { month: 'short', year: '2-digit' })
      : d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
  };
  const tick = { fill: colors.axis, fontSize: compact ? 11 : 12 };
  return (
    <ChartCard title="Sentiment trend" subtitle={`Average compound score per ${granularity} · shaded band (−0.05 to +0.05) is Neutral`}>
      {points.length ? (
        <ResponsiveContainer width="100%" height={compact ? 240 : 300}>
          <LineChart data={points} margin={{ left: compact ? -18 : -10, right: compact ? 8 : 16, top: 8 }}>
            <CartesianGrid vertical={false} stroke={colors.grid} />
            <XAxis dataKey="period" tickFormatter={fmtPeriod} tick={tick} stroke={colors.grid} minTickGap={compact ? 18 : 10} />
            <YAxis domain={[-1, 1]} ticks={[-1, -0.5, 0, 0.5, 1]} tick={tick} stroke={colors.grid} />
            <ReferenceArea y1={-0.05} y2={0.05} fill={colors.neutral} fillOpacity={0.3} ifOverflow="extendDomain" />
            <ReferenceLine y={0} stroke={colors.axis} strokeDasharray="3 3" />
            <Tooltip cursor={{ stroke: colors.axis, strokeWidth: 1 }}
              content={<ChartTooltip render={(p) => (
                <>
                  <strong>{fmtPeriod(p.period)}</strong>
                  <div>Average score {fmtScore(p.avg_compound)} · {p.total} entries</div>
                  {SENTIMENTS.map((s) => <div key={s.key}><span className={`dot seg-${s.key}`} /> {s.label}: {p[s.key]}</div>)}
                </>
              )} />} />
            <Line type="monotone" dataKey="avg_compound" name="Average score" stroke={colors.series}
              strokeWidth={2} dot={{ r: compact ? 3 : 4, fill: colors.series, stroke: colors.surface, strokeWidth: 2 }}
              activeDot={{ r: 6 }} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      ) : <p className="muted">No feedback in this range.</p>}
    </ChartCard>
  );
}

function RankingChart({ ranking, colors, compact }) {
  const tick = { fill: colors.axis, fontSize: compact ? 11 : 12 };
  return (
    <ChartCard title="Destinations ranked by sentiment" subtitle="Average compound score (−1 to +1)">
      {ranking.length ? (
        <>
          <ResponsiveContainer width="100%" height={Math.max(200, ranking.length * (compact ? 28 : 32) + 40)}>
            <BarChart data={ranking} layout="vertical" margin={{ left: 0, right: compact ? 8 : 24 }}>
              <CartesianGrid horizontal={false} stroke={colors.grid} />
              <XAxis type="number" domain={[-1, 1]} ticks={[-1, -0.5, 0, 0.5, 1]} tick={tick} stroke={colors.grid} />
              <YAxis type="category" dataKey="destination_name" width={compact ? 110 : 170} stroke={colors.grid}
                tick={(
                  <CategoryTick fill={tick.fill} fontSize={tick.fontSize} max={compact ? 16 : 26}
                    format={(name) => `${ranking.find((r) => r.destination_name === name)?.rank}. ${name}`} />
                )} />
              <ReferenceLine x={0} stroke={colors.axis} />
              <Tooltip cursor={{ fill: colors.grid, opacity: 0.5 }}
                content={<ChartTooltip render={(r) => (
                  <>
                    <strong>#{r.rank} {r.destination_name}</strong>
                    <div>Average score {fmtScore(r.avg_compound)}</div>
                    <div>{r.positive_pct}% positive · average rating {r.avg_rating.toFixed(2)} · {r.total} entries</div>
                  </>
                )} />} />
              <Bar dataKey="avg_compound" name="Average score" fill={colors.series} maxBarSize={18} radius={4} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
          <details>
            <summary>Show as table</summary>
            <div className="table-wrap">
              <table className="rtable">
                <thead><tr><th>#</th><th>Destination</th><th className="num">Score</th><th className="num">% Positive</th><th className="num">Rating</th><th className="num">Entries</th></tr></thead>
                <tbody>
                  {ranking.map((r) => (
                    <tr key={r.destination_id}>
                      <td data-label="Rank">{r.rank}</td>
                      <td data-label="Destination">{r.destination_name}</td>
                      <td data-label="Score" className="num">{fmtScore(r.avg_compound)}</td>
                      <td data-label="% Positive" className="num">{r.positive_pct}%</td>
                      <td data-label="Rating" className="num">{r.avg_rating.toFixed(2)}</td>
                      <td data-label="Entries" className="num">{r.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      ) : <p className="muted">No feedback in this range.</p>}
    </ChartCard>
  );
}

function FeedbackTable({ filters }) {
  const [sentiment, setSentiment] = useState('Negative');
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const state = useFetch(
    () => adminData.list(filters, { sentiment, page, pageSize }),
    [JSON.stringify(filters), sentiment, page],
  );

  return (
    <section className="card table-section">
      <div className="section-head">
        <div>
          <h2>{sentiment === 'Negative' ? 'Negative feedback for follow-up' : `${sentiment} feedback`}</h2>
          <p className="muted small">Newest first. Contact the visitor by email to follow up.</p>
        </div>
        <div className="chip-scroll compact" role="group" aria-label="Sentiment">
          {['Negative', 'Neutral', 'Positive', 'All'].map((s) => (
            <button key={s} type="button" aria-pressed={sentiment === s}
              className={sentiment === s ? 'chip active' : 'chip'} onClick={() => { setSentiment(s); setPage(1); }}>
              {s}
            </button>
          ))}
        </div>
      </div>
      <Loadable state={state}>
        {({ items, total }) => (items.length ? (
          <>
            <div className="table-wrap">
              <table className="rtable">
                <thead>
                  <tr><th>Date</th><th>Destination</th><th>Visitor</th><th>Rating</th><th>Sentiment</th><th className="num">Score</th><th>Feedback</th></tr>
                </thead>
                <tbody>
                  {items.map((f) => (
                    <tr key={f.id}>
                      <td data-label="Date" className="nowrap">{formatDate(f.created_at)}</td>
                      <td data-label="Destination">{f.destination_name}</td>
                      <td data-label="Visitor"><div>{f.user_name}{f.user_email && <><br /><a className="small" href={`mailto:${f.user_email}`}>{f.user_email}</a></>}</div></td>
                      <td data-label="Rating" className="nowrap"><Stars value={f.rating} size={13} /></td>
                      <td data-label="Sentiment"><SentimentBadge label={f.sentiment_label} /></td>
                      <td data-label="Score" className="num">{fmtScore(f.compound)}</td>
                      <td data-label="Feedback" className="comment-cell">
                        <div>
                          {f.comment}
                          {f.tags.length > 0 && <div className="tags">{f.tags.map((t) => <span key={t} className="tag">{t}</span>)}</div>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pager">
              <button type="button" className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
              <span className="muted small">Page {page} of {Math.max(1, Math.ceil(total / pageSize))} · {total} entries</span>
              <button type="button" className="btn btn-ghost btn-sm" disabled={page * pageSize >= total} onClick={() => setPage(page + 1)}>Next</button>
            </div>
          </>
        ) : <p className="muted">No matching feedback.</p>)}
      </Loadable>
    </section>
  );
}

export default function FeedbackAnalytics() {
  const colors = useChartColors();
  const compact = useMediaQuery('(max-width: 640px)');
  const { toast } = useUI();
  const destinationList = useFetch(() => destinationData.list(''), []);
  const [filters, setFilters] = useState({ destination_id: '', from: '', to: '', granularity: 'month' });
  const [exporting, setExporting] = useState(false);

  const base = useMemo(
    () => ({ destination_id: filters.destination_id, from: filters.from, to: filters.to }),
    [filters.destination_id, filters.from, filters.to],
  );
  const key = JSON.stringify(base);
  const breakdown = useFetch(() => adminData.breakdown(base), [key]);
  const trend = useFetch(() => adminData.trend(base, filters.granularity), [key, filters.granularity]);
  const ranking = useFetch(() => adminData.ranking(base), [base.from, base.to]);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const rows = await adminData.exportRows(base);
      downloadCsv(`feedback-sentiment-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(FEEDBACK_CSV_COLUMNS, rows));
      toast.success(`Exported ${rows.length} feedback entries.`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <main className="page container wide">
      <div className="page-head">
        <div>
          <span className="eyebrow">Admin</span>
          <h1>Feedback Analytics</h1>
          <p className="muted">Visitor sentiment from VADER analysis of post-visit feedback.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={exportCsv} disabled={exporting}>
          <Download size={17} /> {exporting ? 'Exporting…' : 'Export CSV'}
        </button>
      </div>
      <ViewOnlyNotice />

      <Filters destinations={destinationList.data || []} filters={filters} setFilters={setFilters} />

      <Loadable state={breakdown}
        empty={<EmptyState icon={BarChart3} title="No feedback yet">Charts appear once visitors start rating their trips.</EmptyState>}>
        {(rows) => (
          <>
            <KpiRow rows={rows} />
            <BreakdownCharts rows={rows} colors={colors} compact={compact} />
          </>
        )}
      </Loadable>

      <div className="chart-row">
        <Loadable state={trend}>{(points) => <TrendChart points={points} granularity={filters.granularity} colors={colors} compact={compact} />}</Loadable>
        <Loadable state={ranking}>{(r) => <RankingChart ranking={r} colors={colors} compact={compact} />}</Loadable>
      </div>

      <FeedbackTable filters={base} />
    </main>
  );
}
