/** Formatage partagé bon de commande (écran + PDF). */

export const formatBonMoney = (n) =>
  `${(parseFloat(n) || 0).toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} DH`;

export const formatBonDateFr = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

export const BON_STATUT_LABEL = {
  brouillon: "Aperçu — à valider",
  en_attente: "En attente",
  en_cours: "En cours",
  valide: "Validé",
  annule: "Annulé",
};

export function groupLignesByModele(lignes) {
  const map = new Map();
  for (const l of lignes || []) {
    const key = l.nom_modele || "Autres articles";
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(l);
  }
  return [...map.entries()];
}

export function ligneSousTotal(l) {
  const q = parseFloat(l.quantite) || 0;
  const pu = parseFloat(l.prix_unitaire ?? l.prix_unitaire_ht) || 0;
  if (l.sous_total_ht != null && l.sous_total_ht !== "") {
    return parseFloat(l.sous_total_ht) || 0;
  }
  return Math.round(q * pu * 100) / 100;
}

/** Normalise les lignes API / panier pour l’affichage document. */
export function normalizeBonLignes(lignes, getModeleNom) {
  return (lignes || []).map((l) => ({
    ...l,
    nom_modele:
      l.nom_modele ||
      (getModeleNom ? getModeleNom(l.id_modele) : null) ||
      (l.id_modele ? `Modèle #${l.id_modele}` : "Autres articles"),
    prix_unitaire:
      l.prix_unitaire != null && l.prix_unitaire !== ""
        ? l.prix_unitaire
        : l.prix_unitaire_ht,
    sous_total_ht: ligneSousTotal(l),
  }));
}

export const BON_PRINT_ROOT_ID = "bon-commande-print";
