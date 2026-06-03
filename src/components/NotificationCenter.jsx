import React, { useState, useEffect } from 'react';
import { Bell, X, Shield, Server, AlertTriangle, Database, Clock, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api/axiosConfig';

const NotificationCenter = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/commercial/notifications');
      const backendNotifications = response.data?.notifications || [];
      setNotifications(
        backendNotifications.map((notification) => ({
          ...notification,
          time: notification.createdAt
            ? new Date(notification.createdAt)
            : new Date(),
          read: notification.read ?? false,
        })),
      );
    } catch (error) {
      console.error('Erreur récupération notifications admin :', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const removeNotification = (id) => {
    setNotifications(notifications.filter(n => n.id !== id));
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

  const getTypeColor = (type, severity) => {
    if (severity === 'critical') return 'bg-red-100 text-red-600 border-red-200';
    if (severity === 'success') return 'bg-green-100 text-green-600 border-green-200';
    if (severity === 'warning') return 'bg-yellow-100 text-yellow-600 border-yellow-200';

    switch (type) {
      case 'error':
        return 'bg-red-100 text-red-600 border-red-200';
      case 'warning':
      case 'stock':
        return 'bg-yellow-100 text-yellow-600 border-yellow-200';
      case 'success':
      case 'order':
        return 'bg-green-100 text-green-600 border-green-200';
      default:
        return 'bg-blue-100 text-blue-600 border-blue-200';
    }
  };

  const getNotificationIcon = (notification) => {
    const severity = notification.severity || notification.type;
    if (severity === 'critical' || notification.type === 'error') return <AlertTriangle size={16} />;
    if (severity === 'success' || notification.type === 'order') return <Check size={16} />;
    if (notification.type === 'stock') return <AlertTriangle size={16} />;
    if (notification.type === 'system') return <Server size={16} />;
    return <Database size={16} />;
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl hover:bg-[#F9F7F5] dark:hover:bg-gray-700 transition-colors"
      >
        <Bell size={20} className="text-[#4B3621] dark:text-gray-100" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute right-0 top-12 w-96 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-[#E8E2DC] dark:border-gray-700 overflow-hidden z-50"
          >
            <div className="p-4 border-b border-[#E8E2DC] dark:border-gray-700 flex justify-between items-center">
              <h3 className="font-black text-[#4B3621] dark:text-gray-100 uppercase text-xs tracking-widest">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-[10px] font-bold text-[#9DC183] hover:underline"
                >
                  Tout marquer comme lu
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center text-gray-400 dark:text-gray-500 text-sm">
                  Chargement des notifications...
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-400 dark:text-gray-500 text-sm">
                  Aucune notification
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 border-b border-[#F9F7F5] dark:border-gray-700 hover:bg-[#F9F7F5]/50 dark:hover:bg-gray-700/50 transition-colors ${
                      !notification.read ? 'bg-[#F9F7F5] dark:bg-gray-700/30' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-xl border ${getTypeColor(notification.type, notification.severity)}`}>
                        {getNotificationIcon(notification)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-bold text-[#4B3621] dark:text-gray-100 text-sm">
                            {notification.title}
                          </p>
                          <button
                            onClick={() => removeNotification(notification.id)}
                            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                          >
                            <X size={14} />
                          </button>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Clock size={10} className="text-gray-400 dark:text-gray-500" />
                          <span className="text-[10px] text-gray-400 dark:text-gray-500">
                            {formatTime(notification.time)}
                          </span>
                          {!notification.read && (
                            <button
                              onClick={() => markAsRead(notification.id)}
                              className="text-[10px] font-bold text-[#9DC183] hover:underline"
                            >
                              Marquer comme lu
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-3 border-t border-[#E8E2DC] dark:border-gray-700 bg-[#F9F7F5] dark:bg-gray-700/30">
              <button className="w-full text-[10px] font-bold text-[#4B3621] dark:text-gray-100 hover:underline">
                Voir toutes les notifications
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationCenter;
