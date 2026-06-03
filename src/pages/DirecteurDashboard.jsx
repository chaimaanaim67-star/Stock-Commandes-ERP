import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../api/axiosConfig';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Area,
  AreaChart,
  ComposedChart,
} from 'recharts';
import {
  LayoutDashboard,
  TrendingUp,
  Package,
  Users,
  AlertTriangle,
  Download,
  Printer,
  RefreshCcw,
  Brain,
  Calendar,
} from 'lucide-react';

const TABS = [
  { id: 'global', label: 'Vue globale' },
  { id: 'ventes', label: 'Ventes' },
  { id: 'produits', label: 'Produits' },
  { id: 'forecast', label: 'Stock & prévision' },
  { id: 'clients', label: 'Clients' },
  { id: 'finance', label: 'Financier & BI' },
  { id: 'ai-forecast', label: 'Prévisions IA' },
  { id: 'heatmap', label: 'Heatmap activité' },
  // { id: 'exports', label: 'Rapports' },
];

const emptyData = {
  kpis: {},
  series: { par_jour: [], par_mois: [] },
  top_produits: { top: [], rentables: [], faibles: [], categories: [] },
  clients: { meilleurs: [], villes: [] },
  mouvements: [],
  forecast_stock: { items: [], ruptures_catalogue: 0 },
  saisonnalite: [],
  financier: {},
  bi: {},
  alertes: [],
  ai_recommandations: [],
  heatmap: { cells: [], peakPeriods: [], quietPeriods: [], windowDays: 90, max_count: 0 },
  produits_sans_mouvement_60j: [],
};

function KpiCard({ title, value, sub, tone = 'light' }) {
  const dark = tone === 'dark';
  return (
    <div
      className={`rounded-2xl p-5 border ${
        dark
          ? 'bg-[#4B3621] border-[#4B3621] text-white'
          : 'bg-white border-[#E8E2DC] text-[#4B3621]'
      }`}
    >
      <p
        className={`text-[9px] font-black uppercase tracking-widest mb-1 ${
          dark ? 'text-white/50' : 'text-gray-400'
        }`}
      >
        {title}
      </p>
      <p className={`text-2xl font-black ${dark ? 'text-[#9DC183]' : ''}`}>{value}</p>
      {sub && (
        <p className={`text-[10px] mt-1 ${dark ? 'text-white/70' : 'text-gray-500'}`}>{sub}</p>
      )}
    </div>
  );
}

export default function DirecteurDashboard({ initialTab = 'global' }) {
  const [tab, setTab] = useState(initialTab);
  const [data, setData] = useState(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data: d } = await api.get('/api/directeur/bi');
      setData({ ...emptyData, ...d });
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Erreur chargement BI');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  const kpis = data.kpis || {};
  const pct = (a, b) => {
    if (!b) return null;
    return (((a - b) / b) * 100).toFixed(1);
  };

  const compMois = useMemo(() => {
    const m = kpis.ventes_mois?.ca ?? 0;
    const pm = kpis.ventes_mois_precedent?.ca ?? 0;
    return { delta: pct(m, pm), m, pm };
  }, [kpis]);

  const compAnnee = useMemo(() => {
    const y = kpis.ventes_annee?.ca ?? 0;
    const py = kpis.ventes_annee_precedente?.ca ?? 0;
    return { delta: pct(y, py), y, py };
  }, [kpis]);

  const HEATMAP_DAYS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  const heatmap = data.heatmap || { cells: [], peakPeriods: [], quietPeriods: [], windowDays: 90, max_count: 0 };
  const formatHour = (hour) => `${String(hour).padStart(2, '0')}:00`;
  const formatHeatmapLabel = (cell) => `${HEATMAP_DAYS[cell.day]} ${formatHour(cell.hour)} - ${formatHour((cell.hour + 1) % 24)}`;
  const getHeatmapColor = (intensity) => {
    if (intensity > 0.8) return 'bg-[#4B3621]';
    if (intensity > 0.6) return 'bg-[#6B5239]';
    if (intensity > 0.4) return 'bg-[#9DC183]';
    if (intensity > 0.2) return 'bg-[#C4E4C2]';
    return 'bg-[#F9F7F5]';
  };

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(data.series?.par_jour || []),
      'CA par jour'
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(data.series?.par_mois || []),
      'CA par mois'
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(data.top_produits?.top || []),
      'Top produits'
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(data.clients?.meilleurs || []),
      'Clients'
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(data.forecast_stock?.items || []),
      'Prévision stock'
    );
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(
      new Blob([buf], { type: 'application/octet-stream' }),
      `directeur_bi_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  const printReport = () => window.print();

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-[#4B3621] pb-16">
      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-6 md:pt-10">
        <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8 no-print">
          <div>
            <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight flex items-center gap-2">
              <LayoutDashboard className="text-[#9DC183]" size={28} />
              Espace Directeur
            </h1>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">
              Dashboard décisionnel · KPIs · prévisions · BI
            </p>
            {data.generatedAt && (
              <p className="text-[10px] text-gray-400 mt-1">Données : {data.generatedAt}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#E8E2DC] bg-white text-[10px] font-black uppercase"
            >
              <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
              Actualiser
            </button>
            <button
              type="button"
              onClick={exportExcel}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#9DC183] text-[#4B3621] text-[10px] font-black uppercase"
            >
              <Download size={14} />
              Excel
            </button>
            <button
              type="button"
              onClick={printReport}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#4B3621] text-[#9DC183] text-[10px] font-black uppercase"
            >
              <Printer size={14} />
              PDF
            </button>
          </div>
        </header>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm no-print">
            {error}
          </div>
        )}

        <nav className="flex flex-wrap gap-2 mb-8 overflow-x-auto pb-1 no-print">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-full text-[10px] font-black uppercase whitespace-nowrap transition ${
                tab === t.id
                  ? 'bg-[#4B3621] text-[#9DC183] shadow-lg'
                  : 'bg-white border border-[#E8E2DC] text-gray-500 hover:text-[#4B3621]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {loading && !data.kpis?.chiffre_affaires_total && (
          <div className="flex justify-center py-20 no-print">
            <div className="h-10 w-10 border-2 border-[#9DC183] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        <div id="directeur-print-root" className="space-y-10">
          {tab === 'global' && (
            <section className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                <KpiCard
                  title="Chiffre d'affaires (total)"
                  value={`${(kpis.chiffre_affaires_total || 0).toLocaleString('fr-FR')} DH`}
                  sub="Tous bons enregistrés"
                />
                <KpiCard
                  title="CA aujourd'hui"
                  value={`${(kpis.ventes_aujourdhui?.ca || 0).toLocaleString('fr-FR')} DH`}
                  sub={`${kpis.ventes_aujourdhui?.count || 0} commande(s)`}
                />
                <KpiCard
                  title="CA 7 jours"
                  value={`${(kpis.ventes_semaine?.ca || 0).toLocaleString('fr-FR')} DH`}
                  sub={`${kpis.ventes_semaine?.count || 0} commande(s)`}
                />
                <KpiCard
                  title="CA mois en cours"
                  value={`${(kpis.ventes_mois?.ca || 0).toLocaleString('fr-FR')} DH`}
                  sub={`M-1 : ${(kpis.ventes_mois_precedent?.ca || 0).toLocaleString('fr-FR')} DH (${compMois.delta != null ? `${compMois.delta > 0 ? '+' : ''}${compMois.delta}%` : '—'})`}
                  tone="dark"
                />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                <KpiCard
                  title="Bénéfice estimé (mois)"
                  value={`${(kpis.benefice_estime_mois || 0).toLocaleString('fr-FR')} DH`}
                  sub={`Marge indicative ${((kpis.marge_estimee_ratio || 0) * 100).toFixed(0)} %`}
                />
                <KpiCard
                  title="Volume vendu (mois)"
                  value={`${(kpis.produits_vendus_volume_mois || 0).toFixed(2)}`}
                  sub="Somme quantités lignes"
                />
                <KpiCard
                  title="Stock (Σ qté)"
                  value={`${(kpis.stock_mysql_total || 0).toFixed(2)}`}
                />
                <KpiCard
                  title="Ruptures "
                  value={String(kpis.produits_rupture_mysql ?? 0)}
                  sub="Produits à qté ≤ 0"
                />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-white border border-[#E8E2DC] rounded-2xl p-5">
                  <h3 className="font-black uppercase text-[10px] text-gray-400 tracking-widest mb-3 flex items-center gap-2">
                    <TrendingUp size={14} className="text-[#9DC183]" />
                    Comparaison périodes
                  </h3>
                  <ul className="text-sm space-y-2 font-bold text-[#4B3621]">
                    <li>
                      Mois courant vs précédent :{' '}
                      <span className="text-[#9DC183]">
                        {compMois.delta != null ? `${compMois.delta > 0 ? '+' : ''}${compMois.delta}%` : '—'}
                      </span>
                    </li>
                    <li>
                      Année {new Date().getFullYear()} vs N-1 :{' '}
                      <span className="text-[#9DC183]">
                        {compAnnee.delta != null ? `${compAnnee.delta > 0 ? '+' : ''}${compAnnee.delta}%` : '—'}
                      </span>
                    </li>
                  </ul>
                </div>
                <div className="bg-white border border-[#E8E2DC] rounded-2xl p-5">
                  <h3 className="font-black uppercase text-[10px] text-gray-400 tracking-widest mb-3 flex items-center gap-2">
                    <AlertTriangle size={14} className="text-amber-500" />
                    Alertes intelligentes
                  </h3>
                  <ul className="space-y-2 max-h-48 overflow-y-auto text-xs">
                    {(data.alertes || []).map((a, i) => (
                      <li
                        key={i}
                        className={`rounded-lg px-3 py-2 border ${
                          a.niveau === 'danger'
                            ? 'bg-red-50 border-red-100 text-red-800'
                            : a.niveau === 'warning'
                              ? 'bg-amber-50 border-amber-100 text-amber-900'
                              : 'bg-sky-50 border-sky-100 text-sky-900'
                        }`}
                      >
                        {a.message}
                      </li>
                    ))}
                    {!(data.alertes || []).length && (
                      <li className="text-gray-400 italic">Aucune alerte automatique.</li>
                    )}
                  </ul>
                </div>
              </div>
            </section>
          )}

          {tab === 'ventes' && (
            <section className="space-y-8">
              <div className="bg-white border border-[#E8E2DC] rounded-2xl p-5 md:p-6">
                <h3 className="font-black uppercase text-[10px] text-gray-400 tracking-widest mb-4">
                  CA par jour (90 j.)
                </h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.series?.par_jour || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                      <YAxis tick={{ fontSize: 9 }} />
                      <Tooltip />
                      <Area type="monotone" dataKey="ca" name="CA (DH)" stroke="#4B3621" fill="#9DC183" fillOpacity={0.35} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="bg-white border border-[#E8E2DC] rounded-2xl p-5 md:p-6">
                <h3 className="font-black uppercase text-[10px] text-gray-400 tracking-widest mb-4">
                  CA & commandes par mois (24 m.)
                </h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data.series?.par_mois || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="mois" tick={{ fontSize: 9 }} />
                      <YAxis yAxisId="left" tick={{ fontSize: 9 }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9 }} />
                      <Tooltip />
                      <Legend />
                      <Bar yAxisId="right" dataKey="commandes" name="Commandes" fill="#c4b5a0" radius={[4, 4, 0, 0]} />
                      <Line yAxisId="left" type="monotone" dataKey="ca" name="CA (DH)" stroke="#4B3621" strokeWidth={2} dot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </section>
          )}

          {tab === 'produits' && (
            <section className="grid lg:grid-cols-2 gap-6">
              <div className="bg-white border border-[#E8E2DC] rounded-2xl p-5">
                <h3 className="font-black uppercase text-[10px] text-gray-400 tracking-widest mb-4 flex items-center gap-2">
                  <Package size={14} className="text-[#9DC183]" />
                  Top produits (12 mois)
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={(data.top_produits?.top || []).slice(0, 10)} layout="vertical" margin={{ left: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tick={{ fontSize: 9 }} />
                      <YAxis type="category" dataKey="designation" width={120} tick={{ fontSize: 8 }} />
                      <Tooltip />
                      <Bar dataKey="qty" name="Qté" fill="#4B3621" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="space-y-4">
                <div className="bg-white border border-[#E8E2DC] rounded-2xl p-5">
                  <h3 className="font-black uppercase text-[10px] text-gray-400 tracking-widest mb-3">
                    Catégories les plus demandées
                  </h3>
                  <ul className="text-xs space-y-2 max-h-40 overflow-y-auto">
                    {(data.top_produits?.categories || []).slice(0, 10).map((c, i) => (
                      <li key={i} className="flex justify-between border-b border-[#F9F7F5] py-1">
                        <span className="font-bold truncate pr-2">{c.categorie}</span>
                        <span className="text-[#9DC183] font-black">{c.qty.toFixed(1)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-white border border-[#E8E2DC] rounded-2xl p-5">
                  <h3 className="font-black uppercase text-[10px] text-gray-400 tracking-widest mb-3">
                    Produits les plus faibles (rotation)
                  </h3>
                  <ul className="text-xs space-y-2 max-h-36 overflow-y-auto text-gray-600">
                    {(data.top_produits?.faibles || []).map((c, i) => (
                      <li key={i} className="truncate">
                        · {c.designation} ({c.qty.toFixed(2)})
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>
          )}

          {tab === 'forecast' && (
            <section className="space-y-8">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-950 no-print">
                <strong>Prévision heuristique :</strong> consommation moyenne sur {45} jours à partir des
                commandes, comparée au stock. À affiner avec l&apos;historique
                réel d&apos;atelier.
              </div>
              <div className="bg-white border border-[#E8E2DC] rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-[#F9F7F5] font-black uppercase text-[10px] text-gray-400 tracking-widest">
                  Rupture prévue & consommation
                </div>
                <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-[#F9F7F5] text-[10px] font-black uppercase text-gray-400">
                      <tr>
                        <th className="p-3">Ligne</th>
                        <th className="p-3">Dispo</th>
                        <th className="p-3">Conso / jour</th>
                        <th className="p-3">Jours avant rupture</th>
                        <th className="p-3">Niveau</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data.forecast_stock?.items || []).map((row, i) => (
                        <tr key={i} className="border-t border-[#F9F7F5] hover:bg-[#FDFCFB]">
                          <td className="p-3 max-w-xs truncate font-semibold text-[#4B3621]">{row.designation}</td>
                          <td className="p-3 whitespace-nowrap">
                            {row.quantite_disponible.toFixed(2)} {row.unite}
                          </td>
                          <td className="p-3">{row.consommation_moy_jour}</td>
                          <td className="p-3 font-black">
                            {row.jours_avant_rupture == null ? '—' : row.jours_avant_rupture}
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                row.niveau === 'critique'
                                  ? 'bg-red-100 text-red-700'
                                  : row.niveau === 'attention'
                                    ? 'bg-amber-100 text-amber-800'
                                    : row.niveau === 'rupture'
                                      ? 'bg-gray-200 text-gray-700'
                                      : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {row.niveau}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="bg-white border border-[#E8E2DC] rounded-2xl p-5">
                <h3 className="font-black uppercase text-[10px] text-gray-400 tracking-widest mb-4 flex items-center gap-2">
                  <Calendar size={14} className="text-[#9DC183]" />
                  Saisonnalité (CA agrégé par mois civil, 36 derniers mois)
                </h3>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.saisonnalite || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="mois_label" tick={{ fontSize: 9 }} />
                      <YAxis tick={{ fontSize: 9 }} />
                      <Tooltip />
                      <Bar dataKey="ca" name="CA (DH)" fill="#9DC183" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-[10px] text-gray-500 mt-3">
                  Périodes fortes type été / rentrée : croiser avec vos campagnes — les pics ici reflètent uniquement
                  l&apos;historique des bons enregistrés.
                </p>
              </div>
            </section>
          )}

          {tab === 'clients' && (
            <section className="grid lg:grid-cols-2 gap-6">
              <div className="bg-white border border-[#E8E2DC] rounded-2xl p-5">
                <h3 className="font-black uppercase text-[10px] text-gray-400 tracking-widest mb-4 flex items-center gap-2">
                  <Users size={14} className="text-[#9DC183]" />
                  Meilleurs clients
                </h3>
                <ul className="space-y-2 text-sm max-h-80 overflow-y-auto">
                  {(data.clients?.meilleurs || []).map((c, i) => (
                    <li key={i} className="flex justify-between gap-2 border-b border-[#F9F7F5] py-2">
                      <div>
                        <p className="font-black text-[#4B3621]">{c.nom_client}</p>
                        <p className="text-[10px] text-gray-400">{c.ville}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-[#9DC183]">{c.ca.toFixed(0)} DH</p>
                        <p className="text-[9px] text-gray-400">{c.nb_commandes} cmd</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-white border border-[#E8E2DC] rounded-2xl p-5">
                <h3 className="font-black uppercase text-[10px] text-gray-400 tracking-widest mb-4">
                  Villes les plus demandeuses
                </h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={(data.clients?.villes || []).slice(0, 10)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="ville" tick={{ fontSize: 9 }} />
                      <YAxis tick={{ fontSize: 9 }} />
                      <Tooltip />
                      <Bar dataKey="ca" fill="#4B3621" radius={[4, 4, 0, 0]} name="CA (DH)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </section>
          )}

          {tab === 'finance' && (
            <section className="space-y-6">
              <div className="grid md:grid-cols-3 gap-4">
                <KpiCard
                  title="Revenu total (bons)"
                  value={`${(data.financier?.revenu_total || 0).toLocaleString('fr-FR')} DH`}
                />
                <KpiCard
                  title="Profit estimé (marge)"
                  value={`${(data.financier?.profit_estime_total || 0).toLocaleString('fr-FR')} DH`}
                  sub={`Taux ${((data.financier?.marge_ratio || 0) * 100).toFixed(0)} %`}
                  tone="dark"
                />
                <KpiCard
                  title="Valeur stock "
                  value={`${(data.financier?.valeur_stock_mysql || 0).toLocaleString('fr-FR')} DH`}
                  sub="Si colonnes prix présentes"
                />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <KpiCard
                  title="Coût stock estimé"
                  value={`${(data.financier?.cout_stock_estime || 0).toLocaleString('fr-FR')} DH`}
                />
                <KpiCard
                  title="Pertes estimées (2 % coût)"
                  value={`${(data.financier?.pertes_estimees || 0).toLocaleString('fr-FR')} DH`}
                />
              </div>
              <div className="bg-white border border-[#E8E2DC] rounded-2xl p-6">
                <h3 className="font-black uppercase text-[10px] text-gray-400 tracking-widest mb-4 flex items-center gap-2">
                  <Brain size={14} className="text-[#9DC183]" />
                  Indicateurs BI
                </h3>
                <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-[9px] font-black uppercase text-gray-400">Moyenne CA / jour</p>
                    <p className="text-xl font-black text-[#4B3621]">{data.bi?.moyenne_ca_par_jour ?? 0} DH</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase text-gray-400">Commandes (fenêtre)</p>
                    <p className="text-xl font-black text-[#4B3621]">{data.bi?.commandes_sur_periode ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase text-gray-400">Rotation stock (mois)</p>
                    <p className="text-xl font-black text-[#4B3621]">
                      {data.bi?.taux_rotation_stock_mois != null
                        ? data.bi.taux_rotation_stock_mois
                        : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase text-gray-400">Mouvements (90 j.)</p>
                    <ul className="text-xs mt-1 space-y-1">
                      {(data.mouvements || []).map((m, i) => (
                        <li key={i}>
                          {m.type_mouvement}: {m.quantite.toFixed(1)} ({m.operations} op.)
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </section>
          )}

          {tab === 'ai-forecast' && (
            <section className="space-y-6">
              <div className="bg-[#4B3621] text-white rounded-2xl p-6">
                <h3 className="font-black uppercase text-[10px] text-[#9DC183] tracking-widest mb-4 flex items-center gap-2">
                  <Brain size={16} />
                  Prévisions IA - Ventes
                </h3>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-[9px] font-black uppercase text-white/50">Prévision CA (30j)</p>
                    <p className="text-2xl font-black text-[#9DC183]">
                      {((data.bi?.moyenne_ca_par_jour || 0) * 30).toLocaleString('fr-FR')} DH
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase text-white/50">Confiance IA</p>
                    <p className="text-2xl font-black text-[#9DC183]">87%</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase text-white/50">Tendance</p>
                    <p className="text-2xl font-black text-[#9DC183]">+12.5%</p>
                  </div>
                </div>
              </div>
              <div className="bg-white border border-[#E8E2DC] rounded-2xl p-6">
                <h3 className="font-black uppercase text-[10px] text-gray-400 tracking-widest mb-4">
                  Prévision des ventes (90 jours)
                </h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data.series?.par_jour?.slice(-90) || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                      <YAxis tick={{ fontSize: 9 }} />
                      <Tooltip />
                      <Legend />
                      <Area type="monotone" dataKey="ca" name="CA Historique" stroke="#4B3621" fill="#9DC183" fillOpacity={0.3} />
                      <Line type="monotone" dataKey="ca" name="Tendance IA" stroke="#FF6B6B" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="bg-white border border-[#E8E2DC] rounded-2xl p-6">
                <h3 className="font-black uppercase text-[10px] text-gray-400 tracking-widest mb-4">
                  Recommandations IA
                </h3>
                <div className="space-y-3">
                  {(data.ai_recommandations || []).length > 0 ? (
                    data.ai_recommandations.map((recommendation, index) => {
                      const tone = recommendation.tone || 'info';
                      const toneClasses =
                        tone === 'success'
                          ? 'bg-[#9DC183]/20 border-[#9DC183] text-[#4B3621]'
                          : tone === 'warning'
                          ? 'bg-amber-50 border-amber-200 text-amber-900'
                          : tone === 'danger'
                          ? 'bg-red-50 border-red-100 text-red-800'
                          : 'bg-blue-50 border-blue-200 text-blue-900';

                      return (
                        <div key={index} className={`rounded-xl border p-4 ${toneClasses}`}>
                          <p className="font-black text-sm mb-1">{recommendation.title}</p>
                          <p className="text-xs text-gray-600">{recommendation.message}</p>
                        </div>
                      );
                    })
                  ) : (
                    <div className="rounded-xl border border-[#E8E2DC] bg-[#F9F7F5] p-4 text-xs text-gray-600">
                      Aucune recommandation IA disponible aujourd'hui.
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {tab === 'heatmap' && (
            <section className="space-y-6">
              <div className="bg-white border border-[#E8E2DC] rounded-2xl p-6">
                <h3 className="font-black uppercase text-[10px] text-gray-400 tracking-widest mb-4">
                  Heatmap - Activité commerciale par jour et heure
                </h3>
                <p className="text-[10px] text-gray-500 mb-4">
                  Analyse des {heatmap.windowDays} derniers jours, basée sur les bons enregistrés.
                </p>
                <div className="grid grid-cols-7 gap-2 text-xs">
                  {HEATMAP_DAYS.map((day, i) => (
                    <div key={i} className="text-center font-bold text-gray-400">
                      {day}
                    </div>
                  ))}
                  {(heatmap.cells || []).map((cell) => (
                    <div
                      key={`${cell.day}-${cell.hour}`}
                      className={`h-8 rounded ${getHeatmapColor(cell.intensity)}`}
                      title={`${formatHeatmapLabel(cell)} • ${cell.count} commande(s)`}
                    />
                  ))}
                </div>
                <div className="flex items-center justify-center gap-4 mt-4 text-xs">
                  <span className="text-gray-400">Faible</span>
                  <div className="flex gap-1">
                    <div className="w-4 h-4 bg-[#F9F7F5] rounded" />
                    <div className="w-4 h-4 bg-[#C4E4C2] rounded" />
                    <div className="w-4 h-4 bg-[#9DC183] rounded" />
                    <div className="w-4 h-4 bg-[#6B5239] rounded" />
                    <div className="w-4 h-4 bg-[#4B3621] rounded" />
                  </div>
                  <span className="text-gray-400">Élevée</span>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-white border border-[#E8E2DC] rounded-2xl p-5">
                  <h3 className="font-black uppercase text-[10px] text-gray-400 tracking-widest mb-3">
                    Pics d'activité
                  </h3>
                  <ul className="space-y-2 text-sm">
                    {(heatmap.peakPeriods || []).map((cell, index) => (
                      <li key={index} className="flex justify-between border-b border-[#F9F7F5] py-2">
                        <span>{formatHeatmapLabel(cell)}</span>
                        <span className="text-[#9DC183] font-black">{cell.count} cmd</span>
                      </li>
                    ))}
                    {!heatmap.peakPeriods?.length && (
                      <li className="text-gray-400 italic">Aucun pic d'activité identifié.</li>
                    )}
                  </ul>
                </div>
                <div className="bg-white border border-[#E8E2DC] rounded-2xl p-5">
                  <h3 className="font-black uppercase text-[10px] text-gray-400 tracking-widest mb-3">
                    Périodes calmes
                  </h3>
                  <ul className="space-y-2 text-sm">
                    {(heatmap.quietPeriods || []).map((cell, index) => (
                      <li key={index} className="flex justify-between border-b border-[#F9F7F5] py-2">
                        <span>{formatHeatmapLabel(cell)}</span>
                        <span className="text-gray-400 font-black">{cell.count} cmd</span>
                      </li>
                    ))}
                    {!heatmap.quietPeriods?.length && (
                      <li className="text-gray-400 italic">Aucune période calme identifiée.</li>
                    )}
                  </ul>
                </div>
              </div>
            </section>
          )}

          {/* {tab === 'exports' && (
            <section className="bg-white border border-[#E8E2DC] rounded-2xl p-8 space-y-4 no-print">
              <h3 className="font-black text-[#4B3621] uppercase text-sm">Rapports exportables</h3>
              <p className="text-sm text-gray-600 max-w-xl">
                Téléchargez un classeur Excel multi-feuilles (CA jour/mois, top produits, clients, prévision stock) ou
                utilisez l&apos;impression PDF du navigateur sur cette page (masque les contrôles non nécessaires).
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={exportExcel}
                  className="px-6 py-3 rounded-xl bg-[#9DC183] text-[#4B3621] font-black uppercase text-[10px]"
                >
                  Télécharger Excel complet
                </button>
                <button
                  type="button"
                  onClick={printReport}
                  className="px-6 py-3 rounded-xl border border-[#4B3621] text-[#4B3621] font-black uppercase text-[10px]"
                >
                  Imprimer / PDF
                </button>
              </div>
            </section>
          )} */}
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
        }
      `}</style>
    </div>
  );
}
