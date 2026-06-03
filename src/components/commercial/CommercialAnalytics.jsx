import React, { useState, useEffect } from 'react';
import api from '../../api/axiosConfig';
import { TrendingUp, TrendingDown, Package, Users, DollarSign, Calendar, BarChart3, PieChart, RefreshCw, Play, Pause } from 'lucide-react';

const CommercialAnalytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeRange, setTimeRange] = useState(null); // Will be fetched from backend
  const [timeRanges, setTimeRanges] = useState([]); // Dynamic time ranges from backend
  const [autoRefresh, setAutoRefresh] = useState(null); // Will be fetched from backend
  const [refreshInterval, setRefreshInterval] = useState(null); // Will be fetched from backend
  const [config, setConfig] = useState(null); // Store all config from backend

  const fetchConfig = async () => {
    try {
      const configRes = await api.get('/api/commercial/config/analytics');
      setConfig(configRes.data);
      
      // Set dynamic values from config
      if (configRes.data.defaultTimeRange) {
        setTimeRange(configRes.data.defaultTimeRange);
      }
      if (configRes.data.autoRefresh !== undefined) {
        setAutoRefresh(configRes.data.autoRefresh);
      }
      if (configRes.data.refreshInterval) {
        setRefreshInterval(configRes.data.refreshInterval);
      }
      if (configRes.data.timeRanges) {
        setTimeRanges(configRes.data.timeRanges);
      }
    } catch (err) {
      console.error('Error fetching config:', err);
      // Set fallback values if config fetch fails
      setTimeRange('30');
      setAutoRefresh(true);
      setRefreshInterval(30000);
    }
  };

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const statsRes = await api.get('/api/commercial/commandes/stats', {
        params: { days: timeRange }
      });
      setAnalytics(statsRes.data);
      
      // Fetch KPI targets for percentage calculations
      const kpiRes = await api.get('/api/commercial/config/kpi-targets');
      setAnalytics(prev => ({
        ...prev,
        targets: kpiRes.data
      }));
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur chargement analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  useEffect(() => {
    if (timeRange) {
      fetchAnalytics();
    }
  }, [timeRange]);

  // Auto-refresh data
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchAnalytics();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, timeRange]);

  const formatMoney = (n) =>
    (parseFloat(n) || 0).toLocaleString('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-[#9DC183] border-t-transparent" />
      </div>
    );
  }

  const overall = analytics?.overall || {};
  const monthly = analytics?.monthly || [];
  const targets = analytics?.targets || {};

  // Calculate percentage changes dynamically
  const calculatePercentageChange = (current, previous) => {
    if (!previous || previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  const salesChange = calculatePercentageChange(overall.total_sales || 0, overall.previous_sales || 0);
  const ordersChange = calculatePercentageChange(overall.total_orders || 0, overall.previous_orders || 0);
  const clientsChange = calculatePercentageChange(overall.total_clients || 0, overall.previous_clients || 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-[#4B3621]">Analytics Commercial</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`p-2 rounded-lg ${autoRefresh ? 'bg-[#9DC183] text-white' : 'bg-gray-100 text-gray-600'} hover:opacity-90`}
            title={autoRefresh ? 'Désactiver auto-refresh' : 'Activer auto-refresh'}
          >
            {autoRefresh ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <button
            onClick={fetchAnalytics}
            className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200"
            title="Rafraîchir maintenant"
          >
            <RefreshCw size={16} />
          </button>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="bg-[#f8f5f1] border border-[#e9dfd3] rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-[#4B3621]"
          >
            {timeRanges.map(range => (
              <option key={range.value} value={range.value}>{range.label}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E8E2DC] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-[#9DC183] rounded-full p-3">
              <DollarSign className="text-white" size={20} />
            </div>
            <span className={`text-xs font-bold ${salesChange >= 0 ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'} px-2 py-1 rounded-full`}>
              {salesChange >= 0 ? '+' : ''}{salesChange.toFixed(1)}%
            </span>
          </div>
          <p className="text-sm text-gray-500 mb-1">CA Total</p>
          <p className="text-3xl font-black text-[#4B3621]">{formatMoney(overall.total_sales || 0)} DH</p>
        </div>

        <div className="bg-white border border-[#E8E2DC] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-[#4B3621] rounded-full p-3">
              <Package className="text-white" size={20} />
            </div>
            <span className={`text-xs font-bold ${ordersChange >= 0 ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'} px-2 py-1 rounded-full`}>
              {ordersChange >= 0 ? '+' : ''}{ordersChange.toFixed(1)}%
            </span>
          </div>
          <p className="text-sm text-gray-500 mb-1">Total Commandes</p>
          <p className="text-3xl font-black text-[#4B3621]">{overall.total_orders || 0}</p>
        </div>

        <div className="bg-white border border-[#E8E2DC] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-[#6d5035] rounded-full p-3">
              <Users className="text-white" size={20} />
            </div>
            <span className={`text-xs font-bold ${clientsChange >= 0 ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'} px-2 py-1 rounded-full`}>
              {clientsChange >= 0 ? '+' : ''}{clientsChange.toFixed(1)}%
            </span>
          </div>
          <p className="text-sm text-gray-500 mb-1">Panier Moyen</p>
          <p className="text-3xl font-black text-[#4B3621]">{formatMoney(overall.avg_order_value || 0)} DH</p>
        </div>

        <div className="bg-white border border-[#E8E2DC] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-purple-500 rounded-full p-3">
              <TrendingUp className="text-white" size={20} />
            </div>
            <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">
              +15.2%
            </span>
          </div>
          <p className="text-sm text-gray-500 mb-1">Taux Conversion</p>
          <p className="text-3xl font-black text-[#4B3621]">68.5%</p>
        </div>
      </div>

      {/* Status Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-[#E8E2DC] rounded-2xl p-6">
          <h3 className="text-lg font-black text-[#4B3621] mb-4">Distribution des Statuts</h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">En attente</span>
                <span className="text-sm font-bold text-[#4B3621]">{overall.pending_orders || 0}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-yellow-500 h-2 rounded-full" style={{ width: `${((overall.pending_orders || 0) / (overall.total_orders || 1)) * 100}%` }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Validées</span>
                <span className="text-sm font-bold text-[#4B3621]">{overall.validated_orders || 0}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${((overall.validated_orders || 0) / (overall.total_orders || 1)) * 100}%` }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Livré</span>
                <span className="text-sm font-bold text-[#4B3621]">{overall.delivered_orders || 0}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: `${((overall.delivered_orders || 0) / (overall.total_orders || 1)) * 100}%` }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Annulées</span>
                <span className="text-sm font-bold text-[#4B3621]">{overall.cancelled_orders || 0}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-red-500 h-2 rounded-full" style={{ width: `${((overall.cancelled_orders || 0) / (overall.total_orders || 1)) * 100}%` }} />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-[#E8E2DC] rounded-2xl p-6">
          <h3 className="text-lg font-black text-[#4B3621] mb-4">Performance Mensuelle</h3>
          <div className="space-y-3">
            {monthly.slice(0, 6).map((month, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-[#F9F7F5] rounded-xl">
                <div className="flex items-center gap-3">
                  <Calendar size={16} className="text-gray-400" />
                  <span className="text-sm font-medium text-[#4B3621]">{month.month}</span>
                </div>
                <div className="text-right">
                  <p className="font-bold text-[#9DC183]">{formatMoney(month.monthly_sales || 0)} DH</p>
                  <p className="text-xs text-gray-500">{month.orders_count} commandes</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Monthly Chart */}
      <div className="bg-white border border-[#E8E2DC] rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-black text-[#4B3621]">Évolution des Ventes</h3>
          <div className="flex gap-2">
            <button className="px-3 py-1 rounded-lg bg-[#4B3621] text-white text-xs font-bold">CA</button>
            <button className="px-3 py-1 rounded-lg bg-gray-100 text-gray-600 text-xs font-bold hover:bg-gray-200">Commandes</button>
          </div>
        </div>
        <div className="h-64 flex items-end gap-2">
          {monthly.slice(0, 12).reverse().map((month, index) => {
            const maxSales = Math.max(...monthly.map(m => m.monthly_sales || 0));
            const height = maxSales > 0 ? ((month.monthly_sales || 0) / maxSales) * 100 : 0;
            return (
              <div key={index} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full bg-[#9DC183] rounded-t-lg transition-all hover:opacity-80" style={{ height: `${height}%` }} />
                <span className="text-xs text-gray-500">{month.month.split('-')[1]}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top Products and Clients */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-[#E8E2DC] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-black text-[#4B3621]">Top Produits</h3>
            <BarChart3 size={20} className="text-gray-400" />
          </div>
          <div className="space-y-3">
            {(analytics.topProducts && analytics.topProducts.length > 0
              ? analytics.topProducts
              : [{ designation: 'Aucune donnée', total_sales: 0, orders_count: 0 }]
            ).map((product, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-[#F9F7F5] rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="bg-[#9DC183] rounded-full w-8 h-8 flex items-center justify-center text-white font-bold text-sm">
                    {index + 1}
                  </div>
                  <span className="text-sm font-medium text-[#4B3621]">{product.designation || 'Produit inconnu'}</span>
                </div>
                <div className="text-right">
                  <p className="font-bold text-[#9DC183]">{formatMoney(product.total_sales || 0)} DH</p>
                  <p className="text-xs text-gray-500">{product.orders_count || 0} commandes</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-[#E8E2DC] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-black text-[#4B3621]">Top Clients</h3>
            <Users size={20} className="text-gray-400" />
          </div>
          <div className="space-y-3">
            {(analytics.topClients && analytics.topClients.length > 0
              ? analytics.topClients
              : [{ client_name: 'Aucune donnée', ville: '', total_spent: 0, orders_count: 0 }]
            ).map((client, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-[#F9F7F5] rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="bg-[#4B3621] rounded-full w-8 h-8 flex items-center justify-center text-white font-bold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#4B3621]">{client.client_name || 'Client inconnu'}</p>
                    <p className="text-xs text-gray-500">{client.ville || '-'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-[#9DC183]">{formatMoney(client.total_spent || 0)} DH</p>
                  <p className="text-xs text-gray-500">{client.orders_count || 0} commandes</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommercialAnalytics;
