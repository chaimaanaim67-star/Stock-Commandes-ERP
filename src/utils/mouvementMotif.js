/** Motifs affichés dans l'UI — stockés dans commentaire sous la forme `[Motif] texte libre` */
export const MOTIFS_ENTREE = [
  'Réception fournisseur',
  'Retour client',
  'Production terminée',
  'Autre (entrée)',
];

export const MOTIFS_SORTIE = [
  'Vente',
  'Livraison',
  'Bon de commande',
  'Perte/Casse',
  'Autre (sortie)',
];

export function parseMotifFromCommentaire(commentaire) {
  const s = String(commentaire || '');
  const m = /^\[([^\]]+)\]\s*(.*)$/s.exec(s);
  if (m) return { motif: m[1].trim(), detail: m[2].trim() };
  return { motif: null, detail: s };
}

export function buildCommentaireWithMotif(motif, detail) {
  const d = String(detail || '').trim();
  if (!motif) return d;
  return d ? `[${motif}] ${d}` : `[${motif}]`;
}
