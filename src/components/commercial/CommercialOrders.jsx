import React, { useState, useEffect } from 'react';
import api from '../../api/axiosConfig';
import { Clock, CheckCircle, XCircle, Package, TrendingUp, Calendar, User, MoreVertical, Copy, History } from 'lucide-react';

const CommercialOrders = () => {
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const limit = 10;
  const [statusDropdown, setStatusDropdown] = useState(null);
  const [timelineOrder, setTimelineOrder] = useState(null);
  const [timelineData, setTimelineData] = useState(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const offset = page * limit;
      const [ordersRes, statsRes] = await Promise.all([
        api.get(`/api/commercial/commandes/previous?limit=${limit}&offset=${offset}`),
        api.get('/api/commercial/commandes/stats')
      ]);
      setOrders(ordersRes.data.orders || []);
      setTotal(ordersRes.data.total || 0);
      setStats(statsRes.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur chargement commandes');
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (reference, newStatus) => {
    try {
      await api.put(`/api/commercial/commandes/ref/${reference}/status`, { statut: newStatus });
      await fetchOrders();
      setStatusDropdown(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur mise à jour statut');
    }
  };

  const fetchWorkflowHistory = async (reference) => {
    try {
      const res = await api.get(`/api/commercial/commandes/ref/${reference}/workflow/history`);
      setTimelineData(res.data);
      setTimelineOrder(reference);
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur chargement historique workflow');
    }
  };

  const duplicateOrder = async (reference) => {
    try {
      await api.post(`/api/commercial/commandes/ref/${reference}/duplicate`, {});
      await fetchOrders();
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur duplication commande');
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [page]);

  const getStatusColor = (statut) => {
    switch (statut) {
      case 'en_attente': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'validée': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'en_production': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'livrée': return 'bg-green-100 text-green-800 border-green-200';
      case 'annulée': return 'bg-red-100 text-red-800 border-red-200';
      case 'brouillon': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (statut) => {
    switch (statut) {
      case 'en_attente': return <Clock size={16} />;
      case 'validée': return <CheckCircle size={16} />;
      case 'livrée': return <CheckCircle size={16} />;
      case 'annulée': return <XCircle size={16} />;
      default: return <Package size={16} />;
    }
  };

  const statusOptions = ['brouillon', 'en_attente', 'validée', 'en_production', 'livrée', 'annulée'];

  const formatMoney = (n) =>
    (parseFloat(n) || 0).toLocaleString('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const formatDate = (date) => {
    if (!date) return '—';
    try {
      return new Date(date).toLocaleString('fr-FR');
    } catch {
      return String(date);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-[#9DC183] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-[#4B3621]">Commandes précédentes</h2>
        <button
          onClick={fetchOrders}
          className="px-4 py-2 rounded-xl bg-[#9DC183] text-[#4B3621] text-sm font-bold hover:opacity-90 transition-opacity"
        >
          Actualiser
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-[#E8E2DC] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <Package className="text-[#9DC183]" size={20} />
              <p className="text-[10px] font-black uppercase text-gray-400">Total commandes</p>
            </div>
            <p className="text-2xl font-black text-[#4B3621]">{stats.overall?.total_orders || 0}</p>
          </div>
          <div className="bg-white border border-[#E8E2DC] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="text-[#9DC183]" size={20} />
              <p className="text-[10px] font-black uppercase text-gray-400">Total ventes</p>
            </div>
            <p className="text-2xl font-black text-[#4B3621]">{formatMoney(stats.overall?.total_sales || 0)} DH</p>
          </div>
          <div className="bg-white border border-[#E8E2DC] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="text-[#9DC183]" size={20} />
              <p className="text-[10px] font-black uppercase text-gray-400">Livré</p>
            </div>
            <p className="text-2xl font-black text-[#4B3621]">{stats.overall?.delivered_orders || 0}</p>
          </div>
          <div className="bg-white border border-[#E8E2DC] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="text-[#9DC183]" size={20} />
              <p className="text-[10px] font-black uppercase text-gray-400">En attente</p>
            </div>
            <p className="text-2xl font-black text-[#4B3621]">{stats.overall?.pending_orders || 0}</p>
          </div>
        </div>
      )}

      <div className="bg-white border border-[#E8E2DC] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-[#F9F7F5] border-b border-[#E8E2DC]">
                <th className="px-6 py-4 text-left text-[10px] font-black uppercase text-gray-400">Référence</th>
                <th className="px-6 py-4 text-left text-[10px] font-black uppercase text-gray-400">Client</th>
                <th className="px-6 py-4 text-left text-[10px] font-black uppercase text-gray-400">Ville</th>
                <th className="px-6 py-4 text-left text-[10px] font-black uppercase text-gray-400">Total</th>
                <th className="px-6 py-4 text-left text-[10px] font-black uppercase text-gray-400">Statut</th>
                <th className="px-6 py-4 text-left text-[10px] font-black uppercase text-gray-400">Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                    Aucune commande trouvée
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id_bc} className="border-b border-[#F9F7F5] hover:bg-[#FDFCFB]">
                    <td className="px-6 py-4 font-bold text-[#4B3621]">{order.reference}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <User size={16} className="text-gray-400" />
                        <span className="font-medium">{order.nom_client}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{order.ville || '—'}</td>
                    <td className="px-6 py-4 font-bold text-[#9DC183]">{formatMoney(order.total_ht)} DH</td>
                    <td className="px-6 py-4 relative">
                      <div className="relative">
                        <button
                          onClick={() => setStatusDropdown(statusDropdown === order.id_bc ? null : order.id_bc)}
                          className="flex items-center gap-2"
                        >
                          <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(order.statut)}`}>
                            {getStatusIcon(order.statut)}
                            {order.statut}
                          </span>
                          <MoreVertical size={16} className="text-gray-400" />
                        </button>
                        {statusDropdown === order.id_bc && (
                          <div className="absolute right-0 mt-2 w-48 bg-white border border-[#E8E2DC] rounded-xl shadow-lg z-10">
                            {statusOptions.map((status) => (
                              <button
                                key={status}
                                onClick={() => updateOrderStatus(order.reference, status)}
                                className="w-full text-left px-4 py-2 text-sm hover:bg-[#F9F7F5] first:rounded-t-xl last:rounded-b-xl"
                              >
                                {status}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-gray-400" />
                        {formatDate(order.created_at)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => fetchWorkflowHistory(order.reference)}
                          className="p-2 rounded-lg hover:bg-gray-100"
                          title="Voir historique"
                        >
                          <History size={16} className="text-gray-600" />
                        </button>
                        <button
                          onClick={() => duplicateOrder(order.reference)}
                          className="p-2 rounded-lg hover:bg-gray-100"
                          title="Dupliquer"
                        >
                          <Copy size={16} className="text-gray-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {total > limit && (
          <div className="px-6 py-4 border-t border-[#E8E2DC] flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Affichage {page * limit + 1}-{Math.min((page + 1) * limit, total)} sur {total}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-4 py-2 rounded-lg border border-[#E8E2DC] text-sm font-bold disabled:opacity-50 hover:bg-[#F9F7F5]"
              >
                Précédent
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={(page + 1) * limit >= total}
                className="px-4 py-2 rounded-lg bg-[#9DC183] text-[#4B3621] text-sm font-bold disabled:opacity-50 hover:opacity-90"
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>

      {timelineOrder && timelineData && (
        <div className="fixed inset-0 z-[400] bg-black/50 overflow-y-auto p-4 md:p-8">
          <div className="max-w-2xl mx-auto bg-white rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-[#4B3621]">Historique Workflow</h3>
              <button
                onClick={() => {
                  setTimelineOrder(null);
                  setTimelineData(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              {timelineData.map((item, index) => (
                <div key={index} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      index === 0 ? 'bg-[#9DC183]' : 'bg-gray-200'
                    }`}>
                      {index === 0 && <Package size={16} className="text-white" />}
                      {index === 1 && <CheckCircle size={16} className="text-white" />}
                      {index === 2 && <Package size={16} className="text-white" />}
                      {index === 3 && <CheckCircle size={16} className="text-white" />}
                    </div>
                    {index < timelineData.length - 1 && (
                      <div className="w-0.5 h-12 bg-gray-200 mt-2" />
                    )}
                  </div>
                  <div className="flex-1 pb-6">
                    <p className="font-bold text-[#4B3621]">{item.action}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {formatDate(item.timestamp)}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      ID Utilisateur: {item.user_id || 'N/A'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommercialOrders;
