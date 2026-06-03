import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axiosConfig';
import { User, Calendar, Clock, MapPin, Monitor, Shield, Activity, ArrowLeft } from 'lucide-react';

const UserProfile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [activityHistory, setActivityHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserData();
  }, [userId]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const [userRes, activityRes] = await Promise.all([
        api.get(`/api/users/${userId}`),
        api.get(`/api/admin/audit-logs`, { params: { limit: 50 } })
      ]);

      setUser(userRes.data);
      setActivityHistory(activityRes.data.filter(log => log.username === userRes.data?.username));
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return '—';
    return new Date(date).toLocaleString('fr-FR');
  };

  const getInitials = (name) => {
    return (name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#9DC183]" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Utilisateur non trouvé</p>
        <button onClick={() => navigate('/admin-dashboard')} className="mt-4 text-[#9DC183] hover:underline">
          Retour au tableau de bord
        </button>
      </div>
    );
  }

  const actionCount = activityHistory.length;
  const recentActivity = activityHistory.slice(0, 10);

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate('/admin-dashboard')}
          className="p-2 rounded-xl hover:bg-[#F9F7F5] transition-colors"
        >
          <ArrowLeft size={20} className="text-[#4B3621]" />
        </button>
        <h1 className="text-2xl font-black text-[#4B3621] uppercase tracking-tight">
          Profil Utilisateur
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Card */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-[32px] border border-[#E8E2DC] p-8 shadow-sm">
            <div className="flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-full bg-[#9DC183] flex items-center justify-center text-white text-3xl font-black mb-4">
                {getInitials(user.username || user.nom)}
              </div>
              <h2 className="text-xl font-black text-[#4B3621] mb-2">
                {user.username || user.nom}
              </h2>
              <span className="bg-[#9DC183]/20 text-[#4B3621] px-4 py-1 rounded-full text-xs font-black uppercase mb-4">
                {user.role}
              </span>
              <p className="text-gray-500 text-sm">{user.email || '—'}</p>
            </div>

            <div className="mt-8 space-y-4">
              <div className="flex items-center gap-3 p-3 bg-[#F9F7F5] rounded-2xl">
                <Calendar size={18} className="text-[#9DC183]" />
                <div>
                  <p className="text-[10px] font-black uppercase text-gray-400">Membre depuis</p>
                  <p className="text-sm font-bold text-[#4B3621]">{formatDate(user.created_at)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-[#F9F7F5] rounded-2xl">
                <Clock size={18} className="text-[#9DC183]" />
                <div>
                  <p className="text-[10px] font-black uppercase text-gray-400">Dernière connexion</p>
                  <p className="text-sm font-bold text-[#4B3621]">{formatDate(user.last_login)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-[#F9F7F5] rounded-2xl">
                <Shield size={18} className={user.actif ? 'text-green-500' : 'text-red-500'} />
                <div>
                  <p className="text-[10px] font-black uppercase text-gray-400">Statut</p>
                  <p className={`text-sm font-bold ${user.actif ? 'text-green-600' : 'text-red-600'}`}>
                    {user.actif ? 'Actif' : 'Bloqué'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Statistics */}
          <div className="bg-white rounded-[32px] border border-[#E8E2DC] p-6 shadow-sm mt-6">
            <h3 className="font-black text-[#4B3621] uppercase text-xs tracking-widest mb-4">
              Statistiques
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Actions totales</span>
                <span className="text-xl font-black text-[#4B3621]">{actionCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Sessions actives</span>
                <span className="text-xl font-black text-[#4B3621]">1</span>
              </div>
            </div>
          </div>
        </div>

        {/* Activity Timeline */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-[32px] border border-[#E8E2DC] p-8 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-black text-[#4B3621] uppercase text-xs tracking-widest flex items-center gap-2">
                <Activity size={16} /> Timeline d'activité
              </h3>
              <span className="text-[10px] font-bold text-gray-400">{recentActivity.length} actions récentes</span>
            </div>

            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-[#E8E2DC]" />

              <div className="space-y-6">
                {recentActivity.map((activity, index) => (
                  <div key={activity.id_log} className="relative flex gap-6">
                    {/* Timeline dot */}
                    <div className="relative z-10 w-12 h-12 rounded-full border-4 border-white shadow-md flex items-center justify-center bg-[#9DC183] text-white">
                      <Activity size={16} />
                    </div>

                    {/* Timeline content */}
                    <div className="flex-1 bg-[#F9F7F5] rounded-2xl p-5 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-3">
                          <span className="text-[9px] font-black uppercase bg-[#9DC183]/30 text-[#4B3621] px-3 py-1 rounded-full">
                            {activity.action}
                          </span>
                        </div>
                        <span className="text-[10px] text-gray-400">{formatDate(activity.created_at)}</span>
                      </div>
                      <p className="text-xs text-gray-600 mb-2">{activity.details || '—'}</p>
                      <div className="flex items-center gap-4 text-[10px] text-gray-400">
                        <span className="flex items-center gap-1">
                          <MapPin size={12} /> IP: {activity.ip || '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}

                {recentActivity.length === 0 && (
                  <p className="text-center text-gray-400 py-10">Aucune activité récente</p>
                )}
              </div>
            </div>
          </div>

          {/* Device & Browser Info */}
          <div className="bg-white rounded-[32px] border border-[#E8E2DC] p-8 shadow-sm mt-6">
            <h3 className="font-black text-[#4B3621] uppercase text-xs tracking-widest mb-6 flex items-center gap-2">
              <Monitor size={16} /> Appareils & Navigateurs
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#F9F7F5] rounded-2xl p-4">
                <p className="text-[10px] font-black uppercase text-gray-400 mb-1">Navigateur actuel</p>
                <p className="text-sm font-bold text-[#4B3621]">Chrome / Firefox / Safari</p>
              </div>
              <div className="bg-[#F9F7F5] rounded-2xl p-4">
                <p className="text-[10px] font-black uppercase text-gray-400 mb-1">Adresse IP</p>
                <p className="text-sm font-bold text-[#4B3621]">192.168.1.xxx</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
