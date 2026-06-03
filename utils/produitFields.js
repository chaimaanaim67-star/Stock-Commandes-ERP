/** Alias noms ERP / pivot ↔ colonnes table produit */
const ALIASES = {
    nom_pro: ['designation'],
    designation: ['designation'],
    qte: ['quantite'],
    quantite: ['quantite'],
    ESS: ['essence'],
    essence: ['essence'],
    MRQ: ['marque'],
    marque: ['marque'],
    QAL: ['qualite'],
    qualite: ['qualite'],
    EPA: ['epaisseur'],
    epaisseur: ['epaisseur'],
    LAR: ['largeur'],
    largeur: ['largeur'],
    LON: ['longueur'],
    longueur: ['longueur'],
    cod_pro: ['num_produit'],
    num_produit: ['num_produit'],
    num_lot: ['num_lot_reception'],
    num_lot_reception: ['num_lot_reception'],
    dat_stock: ['date_stock'],
    date_stock: ['date_stock'],
    PYO: ['pays_origine'],
    pays_origine: ['pays_origine'],
    TYP: ['type'],
    type: ['type'],
    PLC: ['type_placage'],
    type_placage: ['type_placage'],
    SEC: ['sechage'],
    sechage: ['sechage'],
    FAC: ['face'],
    face: ['face'],
    JNT: ['jointage'],
    jointage: ['jointage'],
};

function fieldValue(row, key) {
    if (!row || !key) return undefined;
    const k = String(key).trim();
    if (row[k] !== undefined && row[k] !== null) return row[k];
    const lower = k.toLowerCase();
    if (row[lower] !== undefined && row[lower] !== null) return row[lower];
    for (const alt of ALIASES[k] || []) {
        if (row[alt] !== undefined && row[alt] !== null) return row[alt];
    }
    return undefined;
}

module.exports = { ALIASES, fieldValue };
