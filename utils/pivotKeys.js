/** Aligné avec frontend/src/utils/pivotZones.js (clés pivot commercial / stock). */
function normalizePivotKeyPart(part) {
  const s = String(part ?? '').trim();
  const empty = ['', 'vide', '-', '—', 'null', 'undefined', 'n/a', 'na'];
  if (empty.includes(s.toLowerCase())) return '-';
  return s;
}

function normalizePivotKey(key) {
  return String(key ?? '')
    .split('|')
    .map((p) => normalizePivotKeyPart(p.trim()))
    .join(' | ');
}

function buildPivotKeyFromParts(parts) {
  return parts.map((p) => normalizePivotKeyPart(p)).join(' | ');
}

module.exports = {
  normalizePivotKeyPart,
  normalizePivotKey,
  buildPivotKeyFromParts,
};
