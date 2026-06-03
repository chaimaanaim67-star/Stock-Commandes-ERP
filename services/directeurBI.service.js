/**
 * Agrégations décisionnelles pour le rôle Directeur (KPIs, tendances, prévisions heuristiques).
 * Sources : bon_commande / bon_commande_ligne (commercial), produit, mouvement, catalogue pivot (MySQL).
 */
const { pool } = require("../db");
const commercialService = require("./commercial.service");

const ESTIMATED_MARGIN_RATE = Number(
  process.env.MARGE_ESTIMEE_DIRECTEUR || 0.22,
);
const VELOCITY_DAYS = 30;
const FORECAST_HISTORY_DAYS = 45;
const LOW_STOCK_UNITS = 5;

function lineKey(idModele, ligneKey, colKey) {
  return `${Number(idModele)}\n${String(ligneKey)}\n${String(colKey)}`;
}

async function sumCa(whereSql, params = []) {
  const [rows] = await pool.query(
    `SELECT COALESCE(SUM(total_ht), 0) AS s, COUNT(*) AS n FROM bon_commande WHERE ${whereSql}`,
    params,
  );
  const r = rows[0] || {};
  return { ca: parseFloat(r.s) || 0, count: parseInt(r.n, 10) || 0 };
}

async function getKpisGlobal() {
  await commercialService.ensureSchema();

  const today = await sumCa("DATE(created_at) = CURDATE()");
  const week = await sumCa("created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)");
  const month = await sumCa(
    "YEAR(created_at) = YEAR(CURDATE()) AND MONTH(created_at) = MONTH(CURDATE())",
  );
  const prevMonth = await sumCa(
    "YEAR(created_at) = YEAR(DATE_SUB(CURDATE(), INTERVAL 1 MONTH)) AND MONTH(created_at) = MONTH(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))",
  );
  const year = await sumCa("YEAR(created_at) = YEAR(CURDATE())");
  const prevYear = await sumCa("YEAR(created_at) = YEAR(CURDATE()) - 1");
  const allTime = await sumCa("1=1");

  const [pq] = await pool.query(
    `SELECT COALESCE(SUM(quantite), 0) AS q FROM bon_commande_ligne bl
     INNER JOIN bon_commande b ON bl.id_bc = b.id_bc
     WHERE YEAR(b.created_at) = YEAR(CURDATE()) AND MONTH(b.created_at) = MONTH(CURDATE())`,
  );
  const produitsVendusMois = parseFloat(pq[0]?.q) || 0;

  let stockMysqlTotal = 0;
  let produitsRuptureMysql = 0;
  try {
    const [pr] = await pool.query(
      "SELECT COALESCE(SUM(quantite),0) AS t, SUM(CASE WHEN COALESCE(quantite,0) <= 0 THEN 1 ELSE 0 END) AS r FROM produit",
    );
    stockMysqlTotal = parseFloat(pr[0]?.t) || 0;
    produitsRuptureMysql = parseInt(pr[0]?.r, 10) || 0;
  } catch {
    /* table produit absente */
  }

  const beneficeEstime = month.ca * ESTIMATED_MARGIN_RATE || 0;

  return {
    chiffre_affaires_total: allTime.ca,
    ventes_aujourdhui: today,
    ventes_semaine: week,
    ventes_mois: month,
    ventes_mois_precedent: prevMonth,
    ventes_annee: year,
    ventes_annee_precedente: prevYear,
    benefice_estime_mois: beneficeEstime,
    produits_vendus_volume_mois: produitsVendusMois,
    stock_mysql_total: stockMysqlTotal,
    produits_rupture_mysql: produitsRuptureMysql,
    marge_estimee_ratio: ESTIMATED_MARGIN_RATE,
  };
}

async function getSeriesVentes() {
  await commercialService.ensureSchema();
  const [byDay] = await pool.query(
    `SELECT DATE(created_at) AS d, COALESCE(SUM(total_ht),0) AS ca, COUNT(*) AS nbc
     FROM bon_commande
     WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)
     GROUP BY DATE(created_at)
     ORDER BY d ASC`,
  );
  const [byMonth] = await pool.query(
    `SELECT DATE_FORMAT(created_at, '%Y-%m') AS m, COALESCE(SUM(total_ht),0) AS ca, COUNT(*) AS nbc
     FROM bon_commande
     WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 24 MONTH)
     GROUP BY DATE_FORMAT(created_at, '%Y-%m')
     ORDER BY m ASC`,
  );
  return {
    par_jour: (byDay || []).map((r) => ({
      date: String(r.d).slice(0, 10),
      ca: parseFloat(r.ca) || 0,
      commandes: parseInt(r.nbc, 10) || 0,
    })),
    par_mois: (byMonth || []).map((r) => ({
      mois: r.m,
      ca: parseFloat(r.ca) || 0,
      commandes: parseInt(r.nbc, 10) || 0,
    })),
  };
}

async function getTopProduits() {
  await commercialService.ensureSchema();
  const [top] = await pool.query(
    `SELECT bl.designation,
            SUM(bl.quantite) AS qty,
            SUM(bl.quantite * bl.prix_unitaire) AS ca_ligne,
            AVG(bl.prix_unitaire) AS pu_moy
     FROM bon_commande_ligne bl
     INNER JOIN bon_commande b ON bl.id_bc = b.id_bc
     WHERE b.created_at >= DATE_SUB(CURDATE(), INTERVAL 365 DAY)
     GROUP BY bl.designation
     ORDER BY qty DESC
     LIMIT 25`,
  );

  const [faibles] = await pool.query(
    `SELECT bl.designation,
            SUM(bl.quantite) AS qty
     FROM bon_commande_ligne bl
     INNER JOIN bon_commande b ON bl.id_bc = b.id_bc
     WHERE b.created_at >= DATE_SUB(CURDATE(), INTERVAL 365 DAY)
     GROUP BY bl.designation
     ORDER BY qty ASC
     LIMIT 15`,
  );

  const [cats] = await pool.query(
    `SELECT TRIM(SUBSTRING_INDEX(bl.designation, '—', 1)) AS categorie,
            SUM(bl.quantite) AS qty,
            SUM(bl.quantite * bl.prix_unitaire) AS ca
     FROM bon_commande_ligne bl
     INNER JOIN bon_commande b ON bl.id_bc = b.id_bc
     WHERE b.created_at >= DATE_SUB(CURDATE(), INTERVAL 365 DAY)
     GROUP BY TRIM(SUBSTRING_INDEX(bl.designation, '—', 1))
     ORDER BY qty DESC
     LIMIT 15`,
  );

  const rentables = (top || []).slice(0, 15).map((r) => ({
    designation: r.designation,
    qty: parseFloat(r.qty) || 0,
    ca_ligne: parseFloat(r.ca_ligne) || 0,
    score: (parseFloat(r.ca_ligne) || 0) * (parseFloat(r.qty) || 0),
  }));
  rentables.sort((a, b) => b.score - a.score);

  return {
    top: (top || []).map((r) => ({
      designation: r.designation,
      qty: parseFloat(r.qty) || 0,
      ca_ligne: parseFloat(r.ca_ligne) || 0,
      pu_moy: parseFloat(r.pu_moy) || 0,
    })),
    rentables,
    faibles: (faibles || []).map((r) => ({
      designation: r.designation,
      qty: parseFloat(r.qty) || 0,
    })),
    categories: (cats || []).map((r) => ({
      categorie: r.categorie || "—",
      qty: parseFloat(r.qty) || 0,
      ca: parseFloat(r.ca) || 0,
    })),
  };
}

async function getClients() {
  await commercialService.ensureSchema();
  const [rows] = await pool.query(
    `SELECT nom_client, ville,
            COUNT(*) AS nb_commandes,
            COALESCE(SUM(total_ht),0) AS ca,
            MAX(created_at) AS dernier_achat
     FROM bon_commande
     GROUP BY nom_client, ville
     ORDER BY ca DESC
     LIMIT 40`,
  );

  const [villes] = await pool.query(
    `SELECT ville, COUNT(*) AS n, COALESCE(SUM(total_ht),0) AS ca
     FROM bon_commande
     WHERE ville IS NOT NULL AND TRIM(ville) <> ''
     GROUP BY ville
     ORDER BY ca DESC
     LIMIT 20`,
  );

  return {
    meilleurs: (rows || []).map((r) => ({
      nom_client: r.nom_client,
      ville: r.ville,
      nb_commandes: parseInt(r.nb_commandes, 10) || 0,
      ca: parseFloat(r.ca) || 0,
      dernier_achat: r.dernier_achat,
    })),
    villes: (villes || []).map((r) => ({
      ville: r.ville,
      commandes: parseInt(r.n, 10) || 0,
      ca: parseFloat(r.ca) || 0,
    })),
  };
}

async function getMouvementsStats() {
  try {
    const [rows] = await pool.query(
      `SELECT type_mouvement, COALESCE(SUM(quantite),0) AS q, COUNT(*) AS n
       FROM mouvement
       WHERE date_mouvement >= DATE_SUB(NOW(), INTERVAL 90 DAY)
       GROUP BY type_mouvement`,
    );
    return (rows || []).map((r) => ({
      type_mouvement: r.type_mouvement,
      quantite: parseFloat(r.q) || 0,
      operations: parseInt(r.n, 10) || 0,
    }));
  } catch {
    return [];
  }
}

async function getVelocityMap() {
  await commercialService.ensureSchema();
  const [rows] = await pool.query(
    `SELECT bl.id_modele, bl.ligne_key, bl.col_key, bl.quantite
     FROM bon_commande_ligne bl
     INNER JOIN bon_commande b ON bl.id_bc = b.id_bc
     WHERE b.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
    [FORECAST_HISTORY_DAYS],
  );
  const map = new Map();
  for (const r of rows || []) {
    const k = lineKey(r.id_modele, r.ligne_key, r.col_key);
    map.set(k, (map.get(k) || 0) + (parseFloat(r.quantite) || 0));
  }
  const perDay = new Map();
  for (const [k, v] of map) {
    perDay.set(k, v / FORECAST_HISTORY_DAYS);
  }
  return perDay;
}

async function getStockForecast() {
  const velocity = await getVelocityMap();
  let catalog;
  try {
    catalog = await commercialService.buildCatalog();
  } catch (e) {
    return { items: [], error: e.message, ruptures_catalogue: 0 };
  }
  const items = [];
  let ruptures = 0;
  for (const it of catalog.items || []) {
    const k = lineKey(it.id_modele, it.ligne_key, it.col_key);
    const disp = parseFloat(it.quantite_disponible) || 0;
    if (disp <= 0) ruptures += 1;
    const vDay = velocity.get(k) || 0;
    let jours_avant_rupture = null;
    if (vDay > 0.0001 && disp > 0)
      jours_avant_rupture = Math.floor(disp / vDay);
    items.push({
      designation: it.designation,
      id_modele: it.id_modele,
      quantite_disponible: disp,
      unite: it.unite,
      consommation_moy_jour: Number(vDay.toFixed(6)),
      jours_avant_rupture,
      niveau:
        jours_avant_rupture == null
          ? disp <= 0
            ? "rupture"
            : "stable"
          : jours_avant_rupture <= 7
            ? "critique"
            : jours_avant_rupture <= 21
              ? "attention"
              : "ok",
    });
  }
  items.sort((a, b) => {
    const av = a.jours_avant_rupture == null ? 9999 : a.jours_avant_rupture;
    const bv = b.jours_avant_rupture == null ? 9999 : b.jours_avant_rupture;
    return av - bv;
  });
  return { items: items.slice(0, 60), ruptures_catalogue: ruptures };
}

async function getSaisonnaliteMois() {
  await commercialService.ensureSchema();
  const [rows] = await pool.query(
    `SELECT MONTH(created_at) AS mois_num,
            COALESCE(SUM(total_ht),0) AS ca,
            COUNT(*) AS nbc
     FROM bon_commande
     WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 36 MONTH)
     GROUP BY MONTH(created_at)
     ORDER BY mois_num`,
  );
  const noms = [
    "",
    "Janvier",
    "Février",
    "Mars",
    "Avril",
    "Mai",
    "Juin",
    "Juillet",
    "Août",
    "Septembre",
    "Octobre",
    "Novembre",
    "Décembre",
  ];
  return (rows || []).map((r) => ({
    mois_num: parseInt(r.mois_num, 10),
    mois_label: noms[parseInt(r.mois_num, 10)] || r.mois_num,
    ca: parseFloat(r.ca) || 0,
    commandes: parseInt(r.nbc, 10) || 0,
  }));
}

function buildAlertes(kpis, series, forecast) {
  const alertes = [];
  const m = kpis.ventes_mois?.ca || 0;
  const pm = kpis.ventes_mois_precedent?.ca || 0;
  if (pm > 0 && m < pm * 0.85) {
    alertes.push({
      niveau: "warning",
      code: "BAISSE_CA",
      message: `CA du mois courant (${m.toFixed(0)} DH) inférieur de plus de 15 % au mois précédent (${pm.toFixed(0)} DH).`,
    });
  }
  if (kpis.produits_rupture_mysql > 0) {
    alertes.push({
      niveau: "danger",
      code: "RUPTURE_MYSQL",
      message: `${kpis.produits_rupture_mysql} produit(s) à quantité nulle ou négative.`,
    });
  }
  if (forecast.ruptures_catalogue > 0) {
    alertes.push({
      niveau: "warning",
      code: "RUPTURE_CATALOGUE",
      message: `${forecast.ruptures_catalogue} ligne(s) catalogue (pivot) en rupture.`,
    });
  }
  const last7 = (series.par_jour || []).slice(-7);
  const prev7 = (series.par_jour || []).slice(-14, -7);
  const ca7 = last7.reduce((s, x) => s + x.ca, 0);
  const caPrev7 = prev7.reduce((s, x) => s + x.ca, 0);
  if (caPrev7 > 0 && ca7 > caPrev7 * 1.5) {
    alertes.push({
      niveau: "info",
      code: "SPIKE_VENTES",
      message: `Pic d'activité : CA 7 derniers jours (${ca7.toFixed(0)} DH) > 150 % de la fenêtre précédente.`,
    });
  }
  const crit = (forecast.items || []).filter(
    (x) => x.niveau === "critique",
  ).length;
  if (crit > 0) {
    alertes.push({
      niveau: "danger",
      code: "STOCK_CRITIQUE",
      message: `${crit} ligne(s) avec rupture prévue sous 7 jours (estimation).`,
    });
  }
  return alertes;
}

async function getFinancier(kpis) {
  let valeurStock = 0;
  let coutStockEstime = 0;
  try {
    const [sum] = await pool.query(
      "SELECT COALESCE(SUM(COALESCE(quantite,0) * COALESCE(m3,0)),0) AS v FROM produit",
    );
    valeurStock = parseFloat(sum[0]?.v) || 0;
    const [vol] = await pool.query(
      "SELECT COALESCE(SUM(COALESCE(m3,0)),0) AS v FROM produit",
    );
    coutStockEstime = parseFloat(vol[0]?.v) || 0;
  } catch {
    /* ignore */
  }

  const revenu = kpis.chiffre_affaires_total || 0;
  const profitEstimeTotal = revenu * ESTIMATED_MARGIN_RATE;
  const pertesEstimees = Math.max(0, coutStockEstime * 0.02);

  return {
    revenu_total: revenu,
    profit_estime_total: profitEstimeTotal,
    cout_stock_estime: coutStockEstime,
    pertes_estimees: pertesEstimees,
    valeur_stock_mysql: valeurStock,
    marge_ratio: ESTIMATED_MARGIN_RATE,
  };
}

async function getBiKpis(kpis, series) {
  const days = series.par_jour?.length || 1;
  const caWindow = (series.par_jour || []).reduce((s, x) => s + x.ca, 0);
  const moyenneVentesJour = days > 0 ? caWindow / Math.min(days, 90) : 0;
  const nCmd = (series.par_jour || []).reduce((s, x) => s + x.commandes, 0);
  const tauxRotation =
    kpis.stock_mysql_total > 0
      ? kpis.produits_vendus_volume_mois / kpis.stock_mysql_total
      : null;

  return {
    moyenne_ca_par_jour: Number(moyenneVentesJour.toFixed(2)),
    commandes_sur_periode: nCmd,
    taux_rotation_stock_mois:
      tauxRotation != null ? Number(tauxRotation.toFixed(4)) : null,
    performance_volume_mois: kpis.produits_vendus_volume_mois,
    tendance_jours_analyse: Math.min((series.par_jour || []).length, 90),
  };
}

function formatPercent(value) {
  return `${value >= 0 ? "+" : ""}${Number(value).toFixed(1)}%`;
}

function getAiRecommendations(
  kpis,
  series,
  forecast,
  topData,
  clients,
  dormant,
) {
  const recommendations = [];
  const monthCa = kpis.ventes_mois?.ca || 0;
  const prevMonthCa = kpis.ventes_mois_precedent?.ca || 0;
  const last7 = (series.par_jour || []).slice(-7);
  const prev7 = (series.par_jour || []).slice(-14, -7);
  const ca7 = last7.reduce((s, x) => s + x.ca, 0);
  const caPrev7 = prev7.reduce((s, x) => s + x.ca, 0);
  const topCategory = (topData.categories || [])[0];
  const criticalStock = (forecast.items || []).filter(
    (item) => item.niveau === "critique",
  );

  if (prevMonthCa > 0) {
    const delta = ((monthCa - prevMonthCa) / prevMonthCa) * 100;
    if (delta >= 12) {
      recommendations.push({
        title: "📈 Croissance prévue",
        message: `Le CA du mois courant est en hausse de ${formatPercent(delta)} par rapport au mois précédent : continuez à renforcer les meilleures lignes produits.`,
        tone: "success",
      });
    } else if (delta <= -10) {
      recommendations.push({
        title: "⚠️ Baisse de CA détectée",
        message: `Le CA mensuel est inférieur de ${formatPercent(delta)} au mois précédent : priorisez les actions commerciales ou promotions ciblées.`,
        tone: "warning",
      });
    }
  }

  if (caPrev7 > 0 && ca7 > caPrev7 * 1.3) {
    recommendations.push({
      title: "🚀 Pic d’activité",
      message: `Le CA des 7 derniers jours est ${formatPercent((ca7 - caPrev7) / caPrev7)} supérieur à la période précédente : préparez-vous à soutenir cette dynamique.`,
      tone: "success",
    });
  }

  if (forecast.ruptures_catalogue > 0) {
    recommendations.push({
      title: "⚠️ Stock à risque",
      message: `${forecast.ruptures_catalogue} ligne(s) catalogue identifiées en rupture potentielle : vérifiez les approvisionnements prioritaires.`,
      tone: "warning",
    });
  }

  if (criticalStock.length > 0) {
    const sample = criticalStock
      .slice(0, 3)
      .map((row) => row.designation)
      .join(", ");
    recommendations.push({
      title: "📦 Rupture imminente",
      message: `Attention : ${criticalStock.length} produit(s) en rupture prévue sous 7 jours, dont ${sample}.`,
      tone: "danger",
    });
  }

  if (topCategory && topCategory.categorie) {
    recommendations.push({
      title: "💡 Opportunité produit",
      message: `La catégorie la plus demandée est « ${topCategory.categorie} ». Pensez à ajuster le stock et la promotion autour de cette catégorie.`,
      tone: "info",
    });
  }

  if (dormant.length > 0) {
    recommendations.push({
      title: "🔄 Réactivation produit",
      message: `${dormant.length} référence(s) sans mouvement sur 60 jours : relancez ou repensez leur disponibilité.`,
      tone: "info",
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      title: "✅ Aucune alerte majeure",
      message:
        "Les tendances actuelles sont stables. Continuez à surveiller les ruptures stock et les meilleures ventes.",
      tone: "success",
    });
  }

  return recommendations.slice(0, 4);
}

async function getProduitsSansMouvement() {
  await commercialService.ensureSchema();
  const [rows] = await pool.query(
    `SELECT bl.designation, MAX(b.created_at) AS dernier
     FROM bon_commande_ligne bl
     INNER JOIN bon_commande b ON bl.id_bc = b.id_bc
     GROUP BY bl.designation
     HAVING MAX(b.created_at) < DATE_SUB(NOW(), INTERVAL 60 DAY)
     ORDER BY dernier ASC
     LIMIT 25`,
  );
  return (rows || []).map((r) => r.designation).filter(Boolean);
}

async function getHeatmapActivity(windowDays = 90) {
  await commercialService.ensureSchema();

  const [rows] = await pool.query(
    `SELECT DAYOFWEEK(created_at) - 1 AS day,
            HOUR(created_at) AS hour,
            COUNT(*) AS count
     FROM bon_commande
     WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
     GROUP BY DAYOFWEEK(created_at) - 1, HOUR(created_at)
     ORDER BY day, hour`,
    [windowDays],
  );

  const counts = {};
  let max_count = 0;
  (rows || []).forEach((row) => {
    const day = Number(row.day);
    const hour = Number(row.hour);
    const count = parseInt(row.count, 10) || 0;
    counts[`${day}-${hour}`] = count;
    if (count > max_count) max_count = count;
  });

  const cells = [];
  for (let day = 0; day < 7; day += 1) {
    for (let hour = 0; hour < 24; hour += 1) {
      const count = counts[`${day}-${hour}`] || 0;
      cells.push({
        day,
        hour,
        count,
        intensity: max_count > 0 ? count / max_count : 0,
      });
    }
  }

  const sortedByCount = [...cells].sort((a, b) => b.count - a.count);
  const sortedByQuiet = [...cells].sort((a, b) => a.count - b.count);

  return {
    cells,
    peakPeriods: sortedByCount.slice(0, 3),
    quietPeriods: sortedByQuiet.slice(0, 3),
    windowDays,
    max_count,
  };
}

async function getFullDashboard() {
  const kpis = await getKpisGlobal();
  const series = await getSeriesVentes();
  const topData = await getTopProduits();
  const clients = await getClients();
  const mouvements = await getMouvementsStats();
  const forecast = await getStockForecast();
  const saison = await getSaisonnaliteMois();
  const heatmap = await getHeatmapActivity();
  const financier = await getFinancier(kpis);
  const bi = await getBiKpis(kpis, series);
  const alertes = buildAlertes(kpis, series, forecast);
  let sansMouvement = [];
  try {
    sansMouvement = await getProduitsSansMouvement();
  } catch {
    sansMouvement = [];
  }
  if (sansMouvement.length) {
    alertes.push({
      niveau: "info",
      code: "PRODUIT_INACTIF",
      message: `${sansMouvement.length} référence(s) sans vente sur les 60 derniers jours (aperçu).`,
    });
  }

  const ai_recommandations = getAiRecommendations(
    kpis,
    series,
    forecast,
    topData,
    clients,
    sansMouvement,
  );

  return {
    generatedAt: new Date().toISOString(),
    kpis,
    series,
    top_produits: topData,
    clients,
    mouvements,
    forecast_stock: forecast,
    saisonnalite: saison,
    heatmap,
    financier,
    bi,
    alertes,
    ai_recommandations,
    produits_sans_mouvement_60j: sansMouvement.slice(0, 15),
  };
}

module.exports = {
  getFullDashboard,
  getKpisGlobal,
  getSeriesVentes,
};
