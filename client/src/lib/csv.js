// RFC 4180 quoting, plus a leading apostrophe on values that spreadsheet apps
// would otherwise run as formulas (=, +, -, @, tab, CR).
export function csvCell(value) {
  if (value === null || value === undefined) return '';
  let text = value instanceof Date ? value.toISOString() : String(value);
  if (/^[=+\-@\t\r]/.test(text) && !/^-?\d+(\.\d+)?$/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(columns, rows) {
  const header = columns.map((c) => csvCell(c.label)).join(',');
  const lines = rows.map((row) => columns.map((c) => csvCell(c.get(row))).join(','));
  return [header, ...lines].join('\r\n');
}

export const FEEDBACK_CSV_COLUMNS = [
  { label: 'feedback_id', get: (r) => r.id },
  { label: 'created_at', get: (r) => r.created_at },
  { label: 'booking_id', get: (r) => r.booking_id },
  { label: 'visit_date', get: (r) => r.visit_date },
  { label: 'destination', get: (r) => r.destination_name },
  { label: 'region', get: (r) => r.region },
  { label: 'user_name', get: (r) => r.user_name },
  { label: 'user_email', get: (r) => r.user_email },
  { label: 'rating', get: (r) => r.rating },
  { label: 'sentiment_label', get: (r) => r.sentiment_label },
  { label: 'compound', get: (r) => r.compound },
  { label: 'pos', get: (r) => r.pos },
  { label: 'neu', get: (r) => r.neu },
  { label: 'neg', get: (r) => r.neg },
  { label: 'tags', get: (r) => (r.tags || []).join('; ') },
  { label: 'comment', get: (r) => r.comment },
];

// BOM so Excel opens UTF-8 (ñ, é) correctly.
export function downloadCsv(filename, csv) {
  const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}
