import React, { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../api/axiosConfig';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Calendar,
  FileSpreadsheet,
  History,
  LayoutDashboard,
  Pencil,
  Plus,
  Printer,
  Search,
  Trash2,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import MouvementForm from '../components/layout/MouvementForm';
import {
  MOTIFS_ENTREE,
  MOTIFS_SORTIE,
  parseMotifFromCommentaire,
  buildCommentaireWithMotif,
} from '../utils/mouvementMotif';
import {
  normalizeProduitList,
  produitId,
  produitLabel,
  mouvementProduitLabel,
} from '../utils/produitDisplay';

const isEntree = (type) => String(type || '').toLowerCase().includes('entr');

const MouvementsPage = () => {
  const userRole = localStorage.getItem('role')?.toLowerCase() || '';
  const canDeleteMouvement = userRole === 'admin' || userRole === 'it';

  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [productId, setProductId] = useState('');
  const [chartPeriod, setChartPeriod] = useState('day');
  const [products, setProducts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    id_produit: '',
    type_mouvement: 'Entrée',
    quantite: '',
    motif: '',
    detail: '',
  });

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/api/mouvements');
      setList(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Impossible de charger les mouvements');
      setList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/api/produit');
        setProducts(normalizeProduitList(res.data));
      } catch {
        setProducts([]);
      }
    };
    load();
  }, []);

  const enriched = useMemo(() => {
    return list.map((m) => {
      const { motif, detail } = parseMotifFromCommentaire(m.commentaire);
      return { ...m, motifLib: motif, detailLib: detail };
    });
  }, [list]);

  const filtered = useMemo(() => {
    return enriched.filter((m) => {
      if (productId && String(m.id_produit) !== String(productId)) return false;
      const d = m.date_mouvement ? new Date(m.date_mouvement) : null;
      if (dateFrom && d && d < new Date(dateFrom)) return false;
      if (dateTo && d) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        if (d > end) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        const blob = [
          mouvementProduitLabel(m),
          m.produit_nom,
          m.produit_essence,
          m.produit_marque,
          m.num_colis,
          m.nom_client,
          m.commentaire,
          m.motifLib,
          m.type_mouvement,
          String(m.quantite),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [enriched, search, dateFrom, dateTo, productId]);

  const stats = useMemo(() => {
    let entrees = 0;
    let sorties = 0;
    const byProduct = {};
    filtered.forEach((m) => {
      const q = parseFloat(m.quantite) || 0;
      if (isEntree(m.type_mouvement)) entrees += q;
      else sorties += q;
      const id = m.id_produit;
      const name = mouvementProduitLabel(m);
      if (!byProduct[name]) byProduct[name] = { name, total: 0 };
      byProduct[name].total += q;
    });
    const mostMoved = Object.values(byProduct).sort((a, b) => b.total - a.total)[0] || null;
    return { entrees, sorties, mostMoved };
  }, [filtered]);

  const chartData = useMemo(() => {
    const map = {};
    filtered.forEach((m) => {
      if (!m.date_mouvement) return;
      const day = String(m.date_mouvement).slice(0, 10);
      const key = chartPeriod === 'month' ? day.slice(0, 7) : day;
      if (!map[key]) map[key] = { periode: key, entrees: 0, sorties: 0 };
      const q = parseFloat(m.quantite) || 0;
      if (isEntree(m.type_mouvement)) map[key].entrees += q;
      else map[key].sorties += q;
    });
    return Object.values(map).sort((a, b) => a.periode.localeCompare(b.periode));
  }, [filtered, chartPeriod]);

  const entreesList = useMemo(
    () => filtered.filter((m) => isEntree(m.type_mouvement)),
    [filtered]
  );
  const sortiesList = useMemo(
    () => filtered.filter((m) => !isEntree(m.type_mouvement)),
    [filtered]
  );

  const openEdit = (m) => {
    const { motif, detail } = parseMotifFromCommentaire(m.commentaire);
    const motifs = isEntree(m.type_mouvement) ? MOTIFS_ENTREE : MOTIFS_SORTIE;
    setEditForm({
      id_produit: String(m.id_produit || ''),
      type_mouvement: isEntree(m.type_mouvement) ? 'Entrée' : 'Sortie',
      quantite: String(m.quantite ?? ''),
      motif: motif && motifs.includes(motif) ? motif : motifs[0],
      detail,
    });
    setSelected(m);
    setEditOpen(true);
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!selected) return;
    try {
      const commentaire = buildCommentaireWithMotif(editForm.motif, editForm.detail);
      await api.put(`/api/mouvements/${selected.id_mouvement}`, {
        id_produit: editForm.id_produit,
        id_client: selected.id_client || null,
        type_mouvement: editForm.type_mouvement,
        quantite: parseFloat(editForm.quantite),
        commentaire,
      });
      setEditOpen(false);
      setSelected(null);
      fetchList();
    } catch (err) {
      alert(err.response?.data?.error || err.message || 'Erreur mise à jour');
    }
  };

  const remove = async (m) => {
    if (!window.confirm('Supprimer ce mouvement ?')) return;
    try {
      await api.delete(`/api/mouvements/${m.id_mouvement}`);
      fetchList();
    } catch (err) {
      alert(err.response?.data?.error || err.message || 'Suppression refusée');
    }
  };

  const exportExcel = () => {
    const rows = [
      [
        'Date',
        'Type',
        'Motif',
        'Produit',
        'Quantité (m³)',
        'N° colis',
        'Essence',
        'Marque',
        'Client',
        'Détail',
      ],
    ];
    filtered.forEach((m) => {
      rows.push([
        m.date_mouvement,
        m.type_mouvement,
        m.motifLib || '',
        mouvementProduitLabel(m),
        m.quantite,
        m.num_colis || '',
        m.produit_essence || '',
        m.produit_marque || '',
        m.nom_client || '',
        m.detailLib || '',
      ]);
    });
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Mouvements');
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(
      new Blob([buf], { type: 'application/octet-stream' }),
      `mouvements_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  const printPdf = () => window.print();

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 print:p-4">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 no-print">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-[#4B3621] uppercase tracking-tight flex items-center gap-2">
            <History className="text-[#9DC183]" size={28} />
            Mouvements de stock
          </h1>
          <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">
            Entrées, sorties, historique et indicateurs
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowForm((s) => !s)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#9DC183] text-[#4B3621] text-xs font-black uppercase shadow-lg"
          >
            <Plus size={16} />
            {showForm ? 'Fermer' : 'Ajouter mouvement'}
          </button>
          <button
            type="button"
            onClick={exportExcel}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#E8E2DC] bg-white text-xs font-black uppercase text-[#4B3621]"
          >
            <FileSpreadsheet size={16} />
            Export Excel
          </button>
          <button
            type="button"
            onClick={printPdf}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#E8E2DC] bg-white text-xs font-black uppercase text-[#4B3621]"
          >
            <Printer size={16} />
            PDF / Imprimer
          </button>
        </div>
      </header>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm no-print">
          {error}
        </div>
      )}

      {showForm && (
        <div className="no-print">
          <MouvementForm
            onMouvementAdded={() => {
              fetchList();
              setShowForm(false);
            }}
          />
        </div>
      )}

      {/* 4 — Dashboard */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 no-print">
        <div className="bg-white border border-[#E8E2DC] rounded-[28px] p-6 shadow-sm">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2">
            <ArrowDownCircle className="text-[#9DC183]" size={18} />
            Total entrées
          </div>
          <p className="text-3xl font-black text-[#4B3621]">{stats.entrees.toFixed(2)}</p>
          <p className="text-[10px] text-gray-400 mt-1">Volume m³ (entrées)</p>
        </div>
        <div className="bg-white border border-[#E8E2DC] rounded-[28px] p-6 shadow-sm">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2">
            <ArrowUpCircle className="text-red-400" size={18} />
            Total sorties
          </div>
          <p className="text-3xl font-black text-[#4B3621]">{stats.sorties.toFixed(2)}</p>
          <p className="text-[10px] text-gray-400 mt-1">Volume m³ (sorties)</p>
        </div>
        <div className="bg-[#4B3621] text-white rounded-[28px] p-6 shadow-lg">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase text-white/50 tracking-widest mb-2">
            <LayoutDashboard size={18} className="text-[#9DC183]" />
            Stock le plus mouvant
          </div>
          <p className="text-xl font-black text-[#9DC183]">
            {stats.mostMoved ? stats.mostMoved.name : '—'}
          </p>
          <p className="text-sm text-white/80 mt-1">
            {stats.mostMoved ? `${stats.mostMoved.total.toFixed(2)} m³ cumulés` : 'Pas de données'}
          </p>
        </div>
      </section>

      {/* 1 & 2 — Entrées / Sorties (aperçu) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 no-print">
        <div className="bg-white border border-[#E8E2DC] rounded-2xl p-5 shadow-sm">
          <h2 className="font-black text-[#4B3621] uppercase text-xs tracking-widest mb-3 flex items-center gap-2">
            <ArrowDownCircle size={16} className="text-[#9DC183]" />
            Entrées de stock
          </h2>
          <p className="text-xs text-gray-500 mb-3">
            Réception fournisseur, retour client, production terminée… (motif dans le commentaire)
          </p>
          <ul className="text-sm space-y-1 text-[#4B3621] font-semibold list-disc pl-5">
            <li>Réception fournisseur</li>
            <li>Retour client</li>
            <li>Production terminée</li>
          </ul>
          <p className="text-[10px] text-gray-400 mt-4">
            {entreesList.length} mouvement(s) d&apos;entrée sur la sélection
          </p>
        </div>
        <div className="bg-white border border-[#E8E2DC] rounded-2xl p-5 shadow-sm">
          <h2 className="font-black text-[#4B3621] uppercase text-xs tracking-widest mb-3 flex items-center gap-2">
            <ArrowUpCircle size={16} className="text-red-400" />
            Sorties de stock
          </h2>
          <p className="text-xs text-gray-500 mb-3">Vente, livraison, perte / casse…</p>
          <ul className="text-sm space-y-1 text-[#4B3621] font-semibold list-disc pl-5">
            <li>Vente</li>
            <li>Livraison</li>
            <li>Bon de commande</li>
            <li>Perte / Casse</li>
          </ul>
          <p className="text-[10px] text-gray-400 mt-4">
            {sortiesList.length} mouvement(s) de sortie sur la sélection
          </p>
        </div>
      </div>

      {/* 5 — Graphique */}
      {chartData.length > 0 && (
        <section className="bg-white border border-[#E8E2DC] rounded-2xl p-6 shadow-sm no-print">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="font-black text-[#4B3621] uppercase text-xs tracking-widest">
              Entrées vs sorties m³ ({chartPeriod === 'month' ? 'par mois' : 'par jour'})
            </h2>
            <div className="flex rounded-full border border-[#E8E2DC] p-0.5 bg-[#F9F7F5]">
              <button
                type="button"
                onClick={() => setChartPeriod('day')}
                className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                  chartPeriod === 'day' ? 'bg-[#9DC183] text-[#4B3621]' : 'text-gray-500'
                }`}
              >
                Jour
              </button>
              <button
                type="button"
                onClick={() => setChartPeriod('month')}
                className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                  chartPeriod === 'month' ? 'bg-[#9DC183] text-[#4B3621]' : 'text-gray-500'
                }`}
              >
                Mois
              </button>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="periode" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="entrees" name="Entrées (m³)" fill="#9DC183" radius={[4, 4, 0, 0]} />
                <Bar dataKey="sorties" name="Sorties (m³)" fill="#c45c5c" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* 3 — Filtres + timeline */}
      <section className="bg-white border border-[#E8E2DC] rounded-2xl p-5 shadow-sm space-y-4">
        <h2 className="font-black text-[#4B3621] uppercase text-xs tracking-widest flex items-center gap-2">
          <Calendar size={16} className="text-[#9DC183]" />
          Historique & filtres
        </h2>
        <div className="flex flex-wrap gap-3 items-end no-print">
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-black uppercase text-gray-400">Du</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="border border-[#E8E2DC] rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-black uppercase text-gray-400">Au</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="border border-[#E8E2DC] rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1 min-w-[180px]">
            <label className="text-[9px] font-black uppercase text-gray-400">Produit</label>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="border border-[#E8E2DC] rounded-lg px-3 py-2 text-sm bg-[#F9F7F5]"
            >
              <option value="">Tous les produits</option>
              {products.map((p) => {
                const id = produitId(p);
                return (
                  <option key={id} value={id}>
                    {produitLabel(p, { short: true })}
                  </option>
                );
              })}
            </select>
          </div>
          <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
            <label className="text-[9px] font-black uppercase text-gray-400">Recherche</label>
            <div className="flex items-center gap-2 border border-[#E8E2DC] rounded-lg px-3 py-2 bg-[#F9F7F5]">
              <Search size={16} className="text-gray-400" />
              <input
                type="text"
                placeholder="Produit, client, motif…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-transparent outline-none text-sm flex-1"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <p className="text-center text-gray-400 py-8">Chargement…</p>
        ) : (
          <div className="relative border-l-2 border-[#9DC183]/40 ml-3 space-y-6 py-2">
            {filtered.map((m) => (
              <div key={m.id_mouvement} className="pl-8 relative">
                <span className="absolute left-0 top-1.5 w-3 h-3 rounded-full bg-[#9DC183] -translate-x-[17px] border-2 border-white shadow" />
                <div className="bg-[#F9F7F5] rounded-xl p-4 border border-[#E8E2DC] flex flex-wrap justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase text-gray-400">
                      {m.date_mouvement
                        ? new Date(m.date_mouvement).toLocaleString('fr-FR')
                        : '—'}
                    </p>
                    <p className="font-black text-[#4B3621] text-sm">
                      {isEntree(m.type_mouvement) ? 'Entrée' : 'Sortie'} ·{' '}
                      <span className="text-[#9DC183]">{m.motifLib || 'Non classé'}</span>
                    </p>
                    <p className="text-xs text-gray-600 mt-1 font-semibold">
                      {mouvementProduitLabel(m)}
                    </p>
                    <p className="text-xs text-[#4B3621] mt-1">
                      <strong>{parseFloat(m.quantite || 0).toFixed(2)} m³</strong>
                      {m.produit_m3_stock != null && (
                        <span className="text-gray-400 font-normal ml-2">
                          (stock actuel : {parseFloat(m.produit_m3_stock || 0).toFixed(2)} m³)
                        </span>
                      )}
                    </p>
                    {m.detailLib && (
                      <p className="text-xs text-gray-500 mt-1 italic">{m.detailLib}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 no-print">
                    <button
                      type="button"
                      onClick={() => openEdit(m)}
                      className="p-2 rounded-lg border border-[#E8E2DC] bg-white hover:bg-gray-50"
                      title="Modifier"
                    >
                      <Pencil size={16} className="text-[#4B3621]" />
                    </button>
                    {canDeleteMouvement && (
                      <button
                        type="button"
                        onClick={() => remove(m)}
                        className="p-2 rounded-lg border border-red-100 bg-red-50 hover:bg-red-100"
                        title="Supprimer (Admin / IT)"
                      >
                        <Trash2 size={16} className="text-red-600" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="text-center text-gray-400 py-6">Aucun mouvement pour ces filtres.</p>
            )}
          </div>
        )}
      </section>

      {/* Edit modal */}
      {editOpen && selected && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4 no-print">
          <div className="bg-white rounded-2xl border border-[#E8E2DC] max-w-md w-full p-6 shadow-xl">
            <h3 className="font-black text-[#4B3621] uppercase text-sm mb-4">Modifier le mouvement</h3>
            <form onSubmit={saveEdit} className="space-y-3">
              <div>
                <label className="text-[9px] font-black uppercase text-gray-400">Produit</label>
                <select
                  required
                  value={editForm.id_produit}
                  onChange={(e) => setEditForm({ ...editForm, id_produit: e.target.value })}
                  className="w-full border border-[#E8E2DC] rounded-lg p-2 text-sm mt-1"
                >
                  {(() => {
                    const pid = String(editForm.id_produit || '');
                    const inList = products.some((p) => String(produitId(p)) === pid);
                    return (
                      <>
                        {pid && !inList && (
                          <option value={pid}>
                            {mouvementProduitLabel(selected) || `Produit #${pid}`}
                          </option>
                        )}
                        {products.map((p) => {
                          const id = produitId(p);
                          return (
                            <option key={id} value={id}>
                              {produitLabel(p)}
                            </option>
                          );
                        })}
                      </>
                    );
                  })()}
                </select>
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-gray-400">Type</label>
                <select
                  value={editForm.type_mouvement}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      type_mouvement: e.target.value,
                      motif:
                        e.target.value === 'Entrée' ? MOTIFS_ENTREE[0] : MOTIFS_SORTIE[0],
                    })
                  }
                  className="w-full border border-[#E8E2DC] rounded-lg p-2 text-sm mt-1"
                >
                  <option value="Entrée">Entrée</option>
                  <option value="Sortie">Sortie</option>
                </select>
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-gray-400">Motif</label>
                <select
                  value={editForm.motif}
                  onChange={(e) => setEditForm({ ...editForm, motif: e.target.value })}
                  className="w-full border border-[#E8E2DC] rounded-lg p-2 text-sm mt-1"
                >
                  {(editForm.type_mouvement === 'Entrée' ? MOTIFS_ENTREE : MOTIFS_SORTIE).map(
                    (x) => (
                      <option key={x} value={x}>
                        {x}
                      </option>
                    )
                  )}
                </select>
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-gray-400">Quantité (m³)</label>
                <input
                  required
                  type="number"
                  min="0.0001"
                  step="0.01"
                  value={editForm.quantite}
                  onChange={(e) => setEditForm({ ...editForm, quantite: e.target.value })}
                  className="w-full border border-[#E8E2DC] rounded-lg p-2 text-sm mt-1"
                />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-gray-400">Détail</label>
                <textarea
                  value={editForm.detail}
                  onChange={(e) => setEditForm({ ...editForm, detail: e.target.value })}
                  className="w-full border border-[#E8E2DC] rounded-lg p-2 text-sm mt-1 min-h-[80px]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditOpen(false);
                    setSelected(null);
                  }}
                  className="px-4 py-2 rounded-lg border text-sm font-bold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#4B3621] text-white text-sm font-bold"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  );
};

export default MouvementsPage;
