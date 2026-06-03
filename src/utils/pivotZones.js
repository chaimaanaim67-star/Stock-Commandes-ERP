/** Mapping zones pivot UI ↔ codes MySQL (L/C/F/V) utilisés par le backend. */
export const UI_ZONE_TO_DB = {
  filters: 'F',
  rows: 'L',
  columns: 'C',
  values: 'V',
};

export const DB_ZONE_TO_UI = {
  F: 'filters',
  L: 'rows',
  C: 'columns',
  V: 'values',
  f: 'filters',
  l: 'rows',
  c: 'columns',
  v: 'values',
  filtre: 'filters',
  filter: 'filters',
  filters: 'filters',
  ligne: 'rows',
  row: 'rows',
  rows: 'rows',
  colonne: 'columns',
  column: 'columns',
  columns: 'columns',
  valeur: 'values',
  value: 'values',
  values: 'values',
};

export function normalizePivotPosition(position) {
  const raw = String(position || '').trim();
  if (!raw) return '';
  const upper = raw.toUpperCase();
  if (DB_ZONE_TO_UI[upper]) return DB_ZONE_TO_UI[upper];
  const lower = raw.toLowerCase();
  if (DB_ZONE_TO_UI[lower]) return DB_ZONE_TO_UI[lower];
  return lower;
}

export function uiZoneToDbPosition(uiZone) {
  return UI_ZONE_TO_DB[uiZone] || String(uiZone || '').toUpperCase();
}

export const normalizePivotKeyPart = (part) => {
  const s = String(part ?? '').trim();
  const empty = ['', 'vide', '-', '—', 'null', 'undefined', 'n/a', 'na'];
  if (empty.includes(s.toLowerCase())) return '-';
  return s;
};

export const normalizePivotKey = (key) =>
  String(key ?? '')
    .split('|')
    .map((p) => normalizePivotKeyPart(p.trim()))
    .join(' | ');
