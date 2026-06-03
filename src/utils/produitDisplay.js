/** Helpers affichage produits (API /api/produit, stock, mouvements). */

export function normalizeProduitList(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.rows) && Array.isArray(data.columns)) {
    const cols = data.columns;
    return data.rows.map((row) => {
      const o = {};
      cols.forEach((c, i) => {
        o[c] = row[i];
      });
      return {
        id_produit: o.id_produit,
        designation: o.designation,
        num_colis: o.num_colis,
        essence: o.essence,
        marque: o.marque,
        qualite: o.qualite,
        m3: o.m3,
        quantite: o.quantite,
        volume_m3: o.m3,
        colis: o.num_colis,
        produit: o.designation,
      };
    });
  }
  return [];
}

export function produitId(p) {
  if (!p) return '';
  return String(p.id_produit ?? p.id_article ?? '');
}

export function produitStockM3(p) {
  if (!p) return 0;
  const v = parseFloat(p.volume_m3 ?? p.m3 ?? p.quantite);
  return Number.isFinite(v) ? v : 0;
}

export function produitLabel(p, { short = false } = {}) {
  if (!p) return '—';
  const designation = p.designation || p.produit || p.nom_pro || '';
  if (short && designation) return designation;
  const parts = [designation, p.essence, p.marque, p.qualite].filter(Boolean);
  const base = parts.length ? parts.join(' · ') : `Produit #${produitId(p)}`;
  const colis = p.num_colis || p.colis;
  const m3 = produitStockM3(p);
  const extras = [];
  if (colis) extras.push(`Colis ${colis}`);
  if (m3 > 0) extras.push(`${m3.toFixed(2)} m³`);
  return extras.length ? `${base} (${extras.join(' — ')})` : base;
}

/** Libellé produit depuis une ligne mouvement (JOIN backend). */
export function mouvementProduitLabel(m) {
  if (!m) return '—';
  const parts = [
    m.produit_nom,
    m.produit_essence,
    m.produit_marque,
    m.produit_qualite,
  ].filter(Boolean);
  const base = parts.length
    ? parts.join(' · ')
    : m.produit_nom || `Produit #${m.id_produit}`;
  if (m.num_colis) return `${base} — Colis ${m.num_colis}`;
  return base;
}
