import React, { useState, useEffect } from 'react';
import api from '../../api/axiosConfig';
import { Bell, Check, X, AlertTriangle, CheckCircle, Info, Package, Clock, Trash2 } from 'lucide-react';

const CommercialNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, unread, stock, order, system

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await api.get('/commercial/notifications');
      const backendNotifications = response.data?.notifications || [];
      setNotifications(
        backendNotifications.map((notification) => ({
          ...notification,
          createdAt: notification.createdAt
            ? new Date(notification.createdAt)
            : new Date(),
        })),
      );
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(n => ({ ...n, read: true }))
    );
  };

  const deleteNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !n.read;
    return n.type === filter;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'success': return 'bg-green-100 text-green-800 border-green-200';
      case 'info': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical': return <AlertTriangle size={16} />;
      case 'warning': return <AlertTriangle size={16} />;
      case 'success': return <CheckCircle size={16} />;
      case 'info': return <Info size={16} />;
      default: return <Info size={16} />;
    }
  };

  const formatTime = (date) => {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'À l\'instant';
    if (minutes < 60) return `Il y a ${minutes} min`;
    if (hours < 24) return `Il y a ${hours} h`;
    return `Il y a ${days} j`;
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
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-black text-[#4B3621]">Notifications</h2>
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={markAllAsRead}
            disabled={unreadCount === 0}
            className="px-4 py-2 rounded-xl bg-[#9DC183] text-[#4B3621] font-bold hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            <Check size={16} />
            Tout marquer comme lu
          </button>
          <button
            onClick={clearAll}
            disabled={notifications.length === 0}
            className="px-4 py-2 rounded-xl bg-red-100 text-red-700 font-bold hover:bg-red-200 disabled:opacity-50 flex items-center gap-2"
          >
            <Trash2 size={16} />
            Effacer tout
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-2xl p-2 border border-[#E8E2DC] flex gap-2">
        {['all', 'unread', 'stock', 'order', 'system'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 px-4 py-2 rounded-xl font-bold transition-all ${
              filter === f
                ? 'bg-[#4B3621] text-white'
                : 'text-[#4B3621] hover:bg-[#F9F7F5]'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <div className="bg-white border border-[#E8E2DC] rounded-2xl p-12 text-center">
            <Bell size={48} className="text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Aucune notification</p>
          </div>
        ) : (
          filteredNotifications.map(notification => (
            <div
              key={notification.id}
              className={`bg-white border rounded-2xl p-4 transition-all ${
                notification.read ? 'border-[#E8E2DC] opacity-75' : 'border-[#9DC183] shadow-sm'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-full ${getSeverityColor(notification.severity)}`}>
                  {notification.icon ? (
                    <notification.icon size={20} />
                  ) : (
                    getSeverityIcon(notification.severity)
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-bold text-[#4B3621]">{notification.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                    </div>
                    <div className="flex gap-2">
                      {!notification.read && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="p-2 rounded-lg hover:bg-gray-100"
                          title="Marquer comme lu"
                        >
                          <Check size={16} className="text-gray-400" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification(notification.id)}
                        className="p-2 rounded-lg hover:bg-gray-100"
                        title="Supprimer"
                      >
                        <X size={16} className="text-gray-400" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400">{formatTime(notification.createdAt)}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E8E2DC] rounded-2xl p-4">
          <p className="text-sm text-gray-500 mb-1">Total</p>
          <p className="text-2xl font-black text-[#4B3621]">{notifications.length}</p>
        </div>
        <div className="bg-white border border-[#E8E2DC] rounded-2xl p-4">
          <p className="text-sm text-gray-500 mb-1">Non lues</p>
          <p className="text-2xl font-black text-[#9DC183]">{unreadCount}</p>
        </div>
        <div className="bg-white border border-[#E8E2DC] rounded-2xl p-4">
          <p className="text-sm text-gray-500 mb-1">Stock</p>
          <p className="text-2xl font-black text-yellow-600">
            {notifications.filter(n => n.type === 'stock').length}
          </p>
        </div>
        <div className="bg-white border border-[#E8E2DC] rounded-2xl p-4">
          <p className="text-sm text-gray-500 mb-1">Commandes</p>
          <p className="text-2xl font-black text-blue-600">
            {notifications.filter(n => n.type === 'order').length}
          </p>
        </div>
      </div>
    </div>
  );
};

export default CommercialNotifications;
