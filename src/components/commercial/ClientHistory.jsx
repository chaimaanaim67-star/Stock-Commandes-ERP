import React, { useState, useEffect } from 'react';
import api from '../../api/axiosConfig';
import { User, Phone, Mail, MapPin, Package, TrendingUp, Calendar, Clock, CheckCircle, XCircle } from 'lucide-react';

const ClientHistory = ({ clientName, onClose }) => {
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchClientData = async () => {
    try {
      setLoading(true);
      const [historyRes, statsRes] = await Promise.all([
        api.get(`/api/commercial/clients/${encodeURIComponent(clientName)}/history`),
        api.get(`/api/commercial/clients/${encodeURIComponent(clientName)}/stats`)
      ]);
      setHistory(historyRes.data || []);
      setStats(statsRes.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur chargement historique client');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!clientName) {
      setError('Nom du client manquant.');
      setHistory([]);
      setStats(null);
      setLoading(false);
      return;
    }

    setError('');
    fetchClientData();
  }, [clientName]);

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

  const formatMoney = (n) =>
    (parseFloat(n) || 0).toLocaleString('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const formatQuantity = (value) => {
    const quantity = parseFloat(value);
    return Number.isFinite(quantity) ? quantity.toFixed(2) : '0.00';
  };

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

  const latestOrder = history[0] || {};

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-[#4B3621]">Historique client</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Client Info Card */}
      <div className="bg-white border border-[#E8E2DC] rounded-2xl p-6">
        <div className="flex items-start gap-4 mb-4">
          <div className="bg-[#9DC183] rounded-full p-3">
            <User className="text-white" size={24} />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-black text-[#4B3621]">{latestOrder.nom_client || clientName}</h3>
            <p className="text-sm text-gray-500 mt-1">Client depuis {formatDate(stats?.overall?.first_order)}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="flex items-center gap-2">
            <Phone size={16} className="text-gray-400" />
            <span className="text-sm">{latestOrder.telephone || '—'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Mail size={16} className="text-gray-400" />
            <span className="text-sm">{latestOrder.email || '—'}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin size={16} className="text-gray-400" />
            <span className="text-sm">{latestOrder.ville || '—'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-gray-400" />
            <span className="text-sm">Dernière: {formatDate(stats?.overall?.last_order)}</span>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
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
              <p className="text-[10px] font-black uppercase text-gray-400">Total dépensé</p>
            </div>
            <p className="text-2xl font-black text-[#4B3621]">{formatMoney(stats.overall?.total_spent || 0)} DH</p>
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
              <TrendingUp className="text-[#9DC183]" size={20} />
              <p className="text-[10px] font-black uppercase text-gray-400">Panier moyen</p>
            </div>
            <p className="text-2xl font-black text-[#4B3621]">{formatMoney(stats.overall?.avg_order_value || 0)} DH</p>
          </div>
        </div>
      )}

      {/* Top Products */}
      {stats?.topProducts && stats.topProducts.length > 0 && (
        <div className="bg-white border border-[#E8E2DC] rounded-2xl p-6">
          <h3 className="text-lg font-black text-[#4B3621] mb-4">Produits favoris</h3>
          <div className="space-y-3">
            {stats.topProducts.slice(0, 5).map((product, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-[#F9F7F5] rounded-xl">
                <div className="flex-1">
                  <p className="font-medium text-[#4B3621]">{product.designation}</p>
                  <p className="text-xs text-gray-500">{product.order_count} commandes</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-[#9DC183]">{formatQuantity(product.total_quantity)} m³</p>
                  <p className="text-xs text-gray-500">{formatMoney(product.avg_price)} DH/m³</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Order History */}
      <div className="bg-white border border-[#E8E2DC] rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E8E2DC]">
          <h3 className="text-lg font-black text-[#4B3621]">Historique des commandes</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-[#F9F7F5] border-b border-[#E8E2DC]">
                <th className="px-6 py-4 text-left text-[10px] font-black uppercase text-gray-400">Référence</th>
                <th className="px-6 py-4 text-left text-[10px] font-black uppercase text-gray-400">Date</th>
                <th className="px-6 py-4 text-left text-[10px] font-black uppercase text-gray-400">Total</th>
                <th className="px-6 py-4 text-left text-[10px] font-black uppercase text-gray-400">Statut</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                    Aucune commande trouvée
                  </td>
                </tr>
              ) : (
                history.map((order) => (
                  <tr key={order.id_bc} className="border-b border-[#F9F7F5] hover:bg-[#FDFCFB]">
                    <td className="px-6 py-4 font-bold text-[#4B3621]">{order.reference}</td>
                    <td className="px-6 py-4 text-gray-600 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-gray-400" />
                        {formatDate(order.created_at)}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-[#9DC183]">{formatMoney(order.total_ht)} DH</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(order.statut)}`}>
                        {getStatusIcon(order.statut)}
                        {order.statut}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ClientHistory;
