import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../api/axiosConfig';
import Swal from 'sweetalert2';
import {Shield,Users,Activity,Server,UserPlus,Pencil,Trash2,Ban,LogOut,RefreshCcw,ScrollText,Circle,Database,HardDrive,Cpu,HardDrive as HD,Network,Clock,AlertTriangle,
} from 'lucide-react';
import { OrdersChart, UserActivityChart, TopSalespeopleChart, CriticalStockChart, ServerMetricsChart } from '../components/DashboardCharts';
import NotificationCenter from '../components/NotificationCenter';

const ROLES = [
  { value: 'admin', label: 'Admin / IT' },
  { value: 'directeur', label: 'Directeur' },
  { value: 'commerciale', label: 'Commercial' },
  { value: 'stock', label: 'Responsable Stock' },
];

const emptyUserForm = () => ({
  username: '',
  email: '',
  password: '',
  role: 'commerciale',
});

const formatDate = (d) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleString('fr-FR');
  } catch {
    return String(d);
  }
};

const AdminDashboard = () => {
  const role = localStorage.getItem('role')?.toLowerCase() || '';
  /** Admin et IT = même profil (comptes legacy `it` toujours acceptés). */
  const isItAdmin = role === 'admin' || role === 'it';

  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [systemHealth, setSystemHealth] = useState(null);
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [roleMatrix, setRoleMatrix] = useState([]);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [userModalMode, setUserModalMode] = useState('create');
  const [editingUser, setEditingUser] = useState(null);
  const [userForm, setUserForm] = useState(emptyUserForm());
  const [saving, setSaving] = useState(false);
  
  // User management filters
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(10);

  const fetchOverview = useCallback(async () => {
    if (!isItAdmin) return;
    const { data } = await api.get('/api/admin/overview');
    setOverview(data);
  }, [isItAdmin]);

  const fetchAnalytics = useCallback(async () => {
    if (!isItAdmin) return;
    try {
      const { data } = await api.get('/api/admin/analytics');
      setAnalytics(data);
    } catch (err) {
      console.error('Analytics fetch error:', err);
    }
  }, [isItAdmin]);

  const fetchSystemHealth = useCallback(async () => {
    if (!isItAdmin) return;
    try {
      const { data } = await api.get('/api/admin/system-health');
      setSystemHealth(data);
    } catch (err) {
      console.error('System health fetch error:', err);
    }
  }, [isItAdmin]);

  const fetchUsers = useCallback(async () => {
    if (!isItAdmin) return;
    const { data } = await api.get('/api/users');
    setUsers(Array.isArray(data) ? data : []);
  }, [isItAdmin]);

  const fetchAudit = useCallback(async () => {
    if (!isItAdmin) return;
    const { data } = await api.get('/api/admin/audit-logs', { params: { limit: 150 } });
    setAuditLogs(Array.isArray(data) ? data : []);
  }, [isItAdmin]);

  const fetchRoles = useCallback(async () => {
    if (!isItAdmin) return;
    try {
      const { data } = await api.get('/api/admin/role-permissions');
      setRoleMatrix(data?.roles || []);
    } catch {
      setRoleMatrix([]);
    }
  }, [isItAdmin]);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([fetchOverview(), fetchAnalytics(), fetchSystemHealth(), fetchUsers(), fetchAudit(), fetchRoles()]);
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: 'error',
        title: 'Erreur chargement',
        text: err.response?.data?.error || err.message,
        confirmButtonColor: '#4B3621',
      });
    } finally {
      setLoading(false);
    }
  }, [fetchOverview, fetchAnalytics, fetchSystemHealth, fetchUsers, fetchAudit, fetchRoles]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const onlineUsers = useMemo(
    () => (overview?.online_users || []).filter((u) => u.is_online),
    [overview]
  );

  // Filter users based on search, role, and status
  const filteredUsersList = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch =
        searchTerm === '' ||
        (user.username || user.nom || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.email || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesRole = roleFilter === 'all' || user.role === roleFilter;

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && user.actif !== 0) ||
        (statusFilter === 'blocked' && user.actif === 0);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchTerm, roleFilter, statusFilter]);

  // Pagination
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * usersPerPage;
    return filteredUsersList.slice(startIndex, startIndex + usersPerPage);
  }, [filteredUsersList, currentPage, usersPerPage]);

  const totalPages = Math.ceil(filteredUsersList.length / usersPerPage);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, roleFilter, statusFilter]);

  const openCreateUser = () => {
    setUserModalMode('create');
    setEditingUser(null);
    setUserForm(emptyUserForm());
    setUserModalOpen(true);
  };

  const openEditUser = (u) => {
    setUserModalMode('edit');
    setEditingUser(u);
    setUserForm({
      username: u.username || u.nom || '',
      email: u.email || '',
      password: '',
      role: String(u.role || '').toLowerCase(),
    });
    setUserModalOpen(true);
  };

  const saveUser = async () => {
    if (!userForm.username?.trim()) {
      return Swal.fire({ icon: 'warning', title: 'Le nom est obligatoire', confirmButtonColor: '#4B3621' });
    }
    if (userModalMode === 'create' && (!userForm.password || userForm.password.length < 4)) {
      return Swal.fire({ icon: 'warning', title: 'Mot de passe min. 4 caractères', confirmButtonColor: '#4B3621' });
    }

    setSaving(true);
    try {
      if (userModalMode === 'create') {
        await api.post('/api/users/create', {
          username: userForm.username.trim(),
          email: userForm.email.trim(),
          password: userForm.password,
          role: userForm.role,
        });
        Swal.fire({ icon: 'success', title: 'Utilisateur créé', timer: 1800, showConfirmButton: false });
      } else {
        const payload = {
          username: userForm.username.trim(),
          email: userForm.email.trim(),
          role: userForm.role,
        };
        if (userForm.password) payload.password = userForm.password;
        await api.put(`/api/users/${editingUser.id}`, payload);
        Swal.fire({ icon: 'success', title: 'Utilisateur mis à jour', timer: 1800, showConfirmButton: false });
      }
      setUserModalOpen(false);
      await refreshAll();
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Erreur',
        text: err.response?.data?.error || err.message,
        confirmButtonColor: '#4B3621',
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleBlockUser = async (u) => {
    const actif = u.actif === 0 || u.actif === false ? 1 : 0;
    const actionLabel = actif ? 'réactiver' : 'bloquer';
    const confirm = await Swal.fire({
      icon: 'question',
      title: `${actif ? 'Réactiver' : 'Bloquer'} ${u.username} ?`,
      showCancelButton: true,
      confirmButtonColor: '#4B3621',
      cancelButtonColor: '#999',
      confirmButtonText: 'Confirmer',
    });
    if (!confirm.isConfirmed) return;

    try {
      await api.put(`/api/users/${u.id}`, { actif: actif === 1 });
      await refreshAll();
      Swal.fire({
        icon: 'success',
        title: actif ? 'Compte réactivé' : 'Compte bloqué',
        timer: 1600,
        showConfirmButton: false,
      });
    } catch (err) {
      Swal.fire({
        icon: 'error',
        text: err.response?.data?.error || err.message,
        confirmButtonColor: '#4B3621',
      });
    }
  };

  const deleteUser = async (u) => {
    const confirm = await Swal.fire({
      icon: 'warning',
      title: `Supprimer ${u.username} ?`,
      text: 'Action irréversible.',
      showCancelButton: true,
      confirmButtonColor: '#b91c1c',
      confirmButtonText: 'Supprimer',
    });
    if (!confirm.isConfirmed) return;
    try {
      await api.delete(`/api/users/${u.id}`);
      await refreshAll();
      Swal.fire({ icon: 'success', title: 'Supprimé', timer: 1500, showConfirmButton: false });
    } catch (err) {
      Swal.fire({
        icon: 'error',
        text: err.response?.data?.error || err.message,
        confirmButtonColor: '#4B3621',
      });
    }
  };

  const forceLogout = async (u) => {
    try {
      await api.post(`/api/admin/force-logout/${u.id}`);
      Swal.fire({
        icon: 'success',
        title: 'Déconnexion forcée',
        text: `${u.username} devra se reconnecter.`,
        timer: 2200,
        showConfirmButton: false,
      });
    } catch (err) {
      Swal.fire({
        icon: 'error',
        text: err.response?.data?.error || err.message,
        confirmButtonColor: '#4B3621',
      });
    }
  };

  const clearCache = async () => {
    try {
      await api.post('/api/admin/cache/clear');
      Swal.fire({ icon: 'success', title: 'Cache vidé', timer: 1500, showConfirmButton: false });
      await fetchAudit();
    } catch (err) {
      Swal.fire({
        icon: 'error',
        text: err.response?.data?.error || err.message,
        confirmButtonColor: '#4B3621',
      });
    }
  };

  if (!isItAdmin) {
    return (
      <div className="p-8 text-center">
        <Shield className="mx-auto text-[#9DC183] mb-4" size={48} />
        <h2 className="text-xl font-black text-[#4B3621]">Accès réservé Admin / IT</h2>
        <p className="text-gray-500 mt-2 text-sm">Connectez-vous avec un compte administrateur.</p>
      </div>
    );
  }

  if (loading && !overview) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#9DC183]" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 animate-in fade-in duration-500 max-w-[1400px] mx-auto dark:text-gray-100 transition-colors duration-300">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-black text-[#4B3621] dark:text-gray-100 uppercase tracking-tight flex items-center gap-3">
            <Shield className="text-[#9DC183]" size={32} />
            Administration IT
          </h1>
          <p className="text-gray-400 text-xs font-bold uppercase tracking-[0.25em] mt-2">
            Utilisateurs · Sécurité · Maintenance
          </p>
        </div>
        <div className="flex items-center gap-3">
          <NotificationCenter />
          <button
            type="button"
            onClick={refreshAll}
            className="flex items-center gap-2 bg-white border border-[#E8E2DC] px-5 py-2.5 rounded-2xl text-xs font-black uppercase text-[#4B3621] hover:bg-[#F9F7F5]"
          >
            <RefreshCcw size={14} /> Actualiser
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 bg-white p-2 rounded-3xl border border-[#E8E2DC] shadow-sm mb-10">
        {[
          { id: 'overview', label: 'Tableau de bord IT', icon: Activity },
          { id: 'analytics', label: 'Analytics & Charts', icon: Activity },
          { id: 'system-health', label: 'Système & Monitoring', icon: Server },
          { id: 'users', label: 'Utilisateurs', icon: Users },
          { id: 'audit', label: 'Logs d\'activité', icon: ScrollText },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-[10px] font-black uppercase transition-all ${
              activeTab === id
                ? 'bg-[#4B3621] text-white shadow-lg'
                : 'text-gray-400 hover:text-[#4B3621]'
            }`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* TAB 1 — Overview */}
      {activeTab === 'overview' && overview && (
        <div className="space-y-8 animate-in fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <KpiCard
              label="Utilisateurs en ligne"
              value={overview.users?.online ?? 0}
              sub={`${overview.users?.active_accounts ?? 0} comptes actifs`}
              accent="green"
            />
            <KpiCard
              label="Comptes total"
              value={overview.users?.total ?? 0}
              sub="Base utilisateurs"
            />
            <KpiCard
              label="Commandes"
              value={overview.data?.commandes ?? 0}
              sub="Bons enregistrés"
              icon={<Database size={18} />}
            />
            <KpiCard
              label="Base "
              value={overview.data?.db_size_mb != null ? `${overview.data.db_size_mb} Mo` : '—'}
              sub="Taille estimée"
              icon={<HardDrive size={18} />}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Online users */}
            <div className="bg-white rounded-[32px] border border-[#E8E2DC] p-8 shadow-sm">
              <h3 className="font-black text-[#4B3621] uppercase text-xs tracking-widest mb-6 flex items-center gap-2">
                <Circle size={12} className="text-green-500 fill-green-500" />
                Utilisateurs connectés
              </h3>
              {onlineUsers.length === 0 ? (
                <p className="text-gray-400 text-sm">Aucun utilisateur en ligne (fenêtre 5 min).</p>
              ) : (
                <ul className="space-y-3">
                  {onlineUsers.map((u) => (
                    <li
                      key={u.id}
                      className="flex items-center justify-between p-4 bg-[#F9F7F5] rounded-2xl"
                    >
                      <div>
                        <span className="font-bold text-[#4B3621]">{u.username}</span>
                        <span className="ml-2 text-[9px] font-black uppercase bg-[#9DC183]/30 text-[#4B3621] px-2 py-0.5 rounded-full">
                          {u.role}
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-400">{formatDate(u.last_seen)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Server info */}
            <div className="bg-[#4B3621] text-white rounded-[32px] p-8 shadow-xl">
              <h3 className="font-black text-[#9DC183] uppercase text-xs tracking-widest mb-6 flex items-center gap-2">
                <Server size={16} /> Système Node.js
              </h3>
              <dl className="space-y-3 text-sm">
                <Row label="Version" value={overview.server?.node_version} />
                <Row
                  label="Uptime"
                  value={`${Math.floor((overview.server?.uptime_seconds || 0) / 3600)}h ${Math.floor(((overview.server?.uptime_seconds || 0) % 3600) / 60)}m`}
                />
                <Row
                  label="Mémoire (RSS)"
                  value={`${overview.server?.memory_mb?.rss ?? '—'} Mo`}
                />
                <Row
                  label="Heap utilisé"
                  value={`${overview.server?.memory_mb?.heap_used ?? '—'} Mo`}
                />
                <Row label="Hôte" value={overview.server?.hostname} />
                <Row label="Plateforme" value={overview.server?.platform} />
              </dl>
              <button
                type="button"
                onClick={clearCache}
                className="mt-8 w-full bg-[#9DC183] text-[#4B3621] py-3 rounded-2xl font-black text-[10px] uppercase hover:opacity-90"
              >
                Vider le cache applicatif
              </button>
            </div>
          </div>

          {/* RBAC summary */}
          <div className="bg-white rounded-[32px] border border-[#E8E2DC] p-8">
            <h3 className="font-black text-[#4B3621] uppercase text-xs tracking-widest mb-6">
              Rôles et accès (RBAC)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {roleMatrix.map((r) => (
                <div key={r.role} className="border border-dashed border-[#E8E2DC] rounded-2xl p-5">
                  <p className="font-black text-[#4B3621] text-sm uppercase">{r.role}</p>
                  <p className="text-xs text-gray-500 mt-2">{r.description}</p>
                  <ul className="mt-3 text-[10px] text-[#4B3621] font-bold space-y-1">
                    {(r.pages || []).map((p) => (
                      <li key={p}>• {p}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2 — Analytics */}
      {activeTab === 'analytics' && analytics && (
        <div className="space-y-8 animate-in fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <OrdersChart data={analytics} />
            <UserActivityChart data={analytics} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <TopSalespeopleChart data={analytics} />
            <CriticalStockChart data={analytics} />
          </div>
        </div>
      )}

      {/* TAB 3 — System Health */}
      {activeTab === 'system-health' && systemHealth && (
        <div className="space-y-8 animate-in fade-in">
          <ServerMetricsChart data={systemHealth} />
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <HealthCard
              title="CPU"
              value={systemHealth.cpu?.cores || '—'}
              sub={`${systemHealth.cpu?.manufacturer || '—'} ${systemHealth.cpu?.brand || '—'}`}
              icon={<Cpu size={24} />}
              status="good"
            />
            <HealthCard
              title="Mémoire"
              value={`${systemHealth.memory?.usage_percent || 0}%`}
              sub={`${systemHealth.memory?.used || '—'} Go / ${systemHealth.memory?.total || '—'} Go`}
              icon={<HD size={24} />}
              status={systemHealth.memory?.usage_percent > 80 ? 'warning' : 'good'}
            />
            <HealthCard
              title="API Latency"
              value={`${systemHealth.api?.latency_ms || '—'} ms`}
              sub="Temps de réponse moyen"
              icon={<Clock size={24} />}
              status={systemHealth.api?.latency_ms > 100 ? 'warning' : 'good'}
            />
          </div>

          <div className="bg-white rounded-[32px] border border-[#E8E2DC] p-8 shadow-sm">
            <h3 className="font-black text-[#4B3621] uppercase text-xs tracking-widest mb-6 flex items-center gap-2">
              <Network size={16} /> Espace Disque
            </h3>
            <div className="space-y-4">
              {systemHealth.disk?.map((d, i) => (
                <div key={i} className="bg-[#F9F7F5] rounded-2xl p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-[#4B3621] text-sm">{d.mount}</span>
                    <span className="text-[10px] font-black uppercase text-gray-400">{d.usage_percent}%</span>
                  </div>
                  <div className="w-full bg-[#E8E2DC] rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${d.usage_percent > 80 ? 'bg-red-500' : d.usage_percent > 60 ? 'bg-yellow-500' : 'bg-[#9DC183]'}`}
                      style={{ width: `${d.usage_percent}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">{d.used} Go / {d.size} Go</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-[32px] border border-[#E8E2DC] p-8 shadow-sm">
            <h3 className="font-black text-[#4B3621] uppercase text-xs tracking-widest mb-6 flex items-center gap-2">
              <Database size={16} /> Base de données
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#F9F7F5] rounded-2xl p-4">
                <p className="text-[10px] font-black uppercase text-gray-400">Connexions actives</p>
                <p className="text-2xl font-black text-[#4B3621]">{systemHealth.database?.connections || '—'}</p>
              </div>
              <div className="bg-[#F9F7F5] rounded-2xl p-4">
                <p className="text-[10px] font-black uppercase text-gray-400">Statut</p>
                <p className="text-2xl font-black text-green-600">En ligne</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4 — Users */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-[32px] border border-[#E8E2DC] shadow-sm overflow-hidden animate-in fade-in">
          <div className="p-6 border-b flex flex-wrap justify-between items-center gap-4">
            <h3 className="font-black text-[#4B3621] uppercase text-xs tracking-widest">
              Gestion des utilisateurs
            </h3>
            <button
              type="button"
              onClick={openCreateUser}
              className="flex items-center gap-2 bg-[#9DC183] text-[#4B3621] px-5 py-3 rounded-2xl text-[10px] font-black uppercase"
            >
              <UserPlus size={16} /> Ajouter utilisateur
            </button>
          </div>

          {/* Filters */}
          <div className="p-6 border-b border-[#F9F7F5] flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="Rechercher par nom ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full border rounded-2xl px-4 py-3 bg-[#F9F7F5] focus:ring-2 focus:ring-[#4B3621] outline-none text-sm"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="border rounded-2xl px-4 py-3 bg-[#F9F7F5] focus:ring-2 focus:ring-[#4B3621] outline-none text-sm"
            >
              <option value="all">Tous les rôles</option>
              <option value="admin">Admin</option>
              <option value="directeur">Directeur</option>
              <option value="commerciale">Commercial</option>
              <option value="stock">Stock</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border rounded-2xl px-4 py-3 bg-[#F9F7F5] focus:ring-2 focus:ring-[#4B3621] outline-none text-sm"
            >
              <option value="all">Tous les statuts</option>
              <option value="active">Actif</option>
              <option value="blocked">Bloqué</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-[#F9F7F5] text-[10px] font-black uppercase text-gray-400">
                  <th className="p-4">Nom</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Rôle</th>
                  <th className="p-4">Statut</th>
                  <th className="p-4">Dernière connexion</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.map((u) => {
                  const blocked = u.actif === 0 || u.actif === false;
                  return (
                    <tr key={u.id} className="border-t border-[#F9F7F5] hover:bg-amber-50/30">
                      <td className="p-4 font-bold text-[#4B3621]">{u.username || u.nom}</td>
                      <td className="p-4 text-gray-600">{u.email || '—'}</td>
                      <td className="p-4">
                        <span className="bg-[#9DC183]/20 text-[#4B3621] px-3 py-1 rounded-full text-[9px] font-black uppercase">
                          {u.role}
                        </span>
                      </td>
                      <td className="p-4">
                        {blocked ? (
                          <span className="text-red-500 text-[10px] font-black uppercase">Bloqué</span>
                        ) : (
                          <span className="text-green-600 text-[10px] font-black uppercase">Actif</span>
                        )}
                      </td>
                      <td className="p-4 text-xs text-gray-500">{formatDate(u.last_login)}</td>
                      <td className="p-4">
                        <div className="flex justify-end gap-1 flex-wrap">
                          <IconBtn title="Modifier" onClick={() => openEditUser(u)}>
                            <Pencil size={14} />
                          </IconBtn>
                          <IconBtn
                            title={blocked ? 'Réactiver' : 'Bloquer'}
                            onClick={() => toggleBlockUser(u)}
                          >
                            <Ban size={14} />
                          </IconBtn>
                          <IconBtn title="Forcer déconnexion" onClick={() => forceLogout(u)}>
                            <LogOut size={14} />
                          </IconBtn>
                          <IconBtn title="Supprimer" danger onClick={() => deleteUser(u)}>
                            <Trash2 size={14} />
                          </IconBtn>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {paginatedUsers.length === 0 && (
              <p className="p-10 text-center text-gray-400">Aucun utilisateur trouvé.</p>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-6 border-t border-[#F9F7F5] flex justify-between items-center">
              <p className="text-xs text-gray-500">
                Affichage de {(currentPage - 1) * usersPerPage + 1} à {Math.min(currentPage * usersPerPage, filteredUsersList.length)} sur {filteredUsersList.length} utilisateurs
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 rounded-xl border border-[#E8E2DC] text-[10px] font-black uppercase disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#F9F7F5]"
                >
                  Précédent
                </button>
                <span className="px-4 py-2 text-[10px] font-black text-[#4B3621]">
                  Page {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 rounded-xl border border-[#E8E2DC] text-[10px] font-black uppercase disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#F9F7F5]"
                >
                  Suivant
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 5 — Audit */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-[32px] border border-[#E8E2DC] shadow-sm overflow-hidden animate-in fade-in">
          <div className="p-6 border-b flex justify-between items-center">
            <h3 className="font-black text-[#4B3621] uppercase text-xs tracking-widest">
              Historique des actions (Audit Trail)
            </h3>
            <button className="text-[10px] font-bold text-[#9DC183] hover:underline">
              Exporter les logs
            </button>
          </div>
          
          {/* Timeline View */}
          <div className="p-6">
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-[#E8E2DC]" />
              
              <div className="space-y-6">
                {auditLogs.map((log, index) => {
                  const actionColor = getActionColor(log.action);
                  return (
                    <div key={log.id_log} className="relative flex gap-6">
                      {/* Timeline dot */}
                      <div className={`relative z-10 w-12 h-12 rounded-full border-4 border-white shadow-md flex items-center justify-center ${actionColor.bg}`}>
                        {getActionIcon(log.action)}
                      </div>
                      
                      {/* Timeline content */}
                      <div className="flex-1 bg-[#F9F7F5] rounded-2xl p-5 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-3">
                            <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full ${actionColor.badge}`}>
                              {log.action}
                            </span>
                            <span className="font-bold text-[#4B3621] text-sm">{log.username || '—'}</span>
                          </div>
                          <span className="text-[10px] text-gray-400">{formatDate(log.created_at)}</span>
                        </div>
                        <p className="text-xs text-gray-600 mb-2">{log.details || '—'}</p>
                        <div className="flex items-center gap-2 text-[10px] text-gray-400">
                          <span>IP: {log.ip || '—'}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {auditLogs.length === 0 && (
                <p className="text-center text-gray-400 py-10">Aucun log pour le moment.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* User modal */}
      {userModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-[32px] border shadow-2xl w-full max-w-md p-8">
            <h3 className="font-black text-[#4B3621] uppercase text-sm mb-6">
              {userModalMode === 'create' ? 'Nouvel utilisateur' : 'Modifier utilisateur'}
            </h3>
            <div className="space-y-4">
              <Field
                label="Nom d'utilisateur"
                value={userForm.username}
                onChange={(v) => setUserForm((f) => ({ ...f, username: v }))}
              />
              <Field
                label="Email"
                type="email"
                value={userForm.email}
                onChange={(v) => setUserForm((f) => ({ ...f, email: v }))}
              />
              <Field
                label={userModalMode === 'create' ? 'Mot de passe' : 'Nouveau mot de passe (optionnel)'}
                type="password"
                value={userForm.password}
                onChange={(v) => setUserForm((f) => ({ ...f, password: v }))}
              />
              <div>
                <label className="block text-[10px] font-black uppercase text-gray-400 mb-2">Rôle</label>
                <select
                  value={userForm.role}
                  onChange={(e) => setUserForm((f) => ({ ...f, role: e.target.value }))}
                  className="w-full border rounded-2xl px-4 py-3 bg-[#F9F7F5] focus:ring-2 focus:ring-[#4B3621] outline-none"
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button
                type="button"
                onClick={() => setUserModalOpen(false)}
                className="flex-1 border py-3 rounded-2xl font-bold text-sm text-gray-500"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={saveUser}
                className="flex-1 bg-[#4B3621] text-white py-3 rounded-2xl font-black text-sm uppercase disabled:opacity-50"
              >
                {saving ? '...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function KpiCard({ label, value, sub, accent, icon }) {
  const green = accent === 'green';
  return (
    <div
      className={`p-6 rounded-[28px] border ${
        green ? 'bg-[#9DC183] border-[#9DC183]' : 'bg-white border-[#E8E2DC]'
      } shadow-sm`}
    >
      <p
        className={`text-[10px] font-black uppercase tracking-widest mb-2 ${
          green ? 'text-[#4B3621]/60' : 'text-gray-400'
        }`}
      >
        {label}
      </p>
      <div className="flex items-end gap-2">
        {icon}
        <h4 className={`text-3xl font-black ${green ? 'text-[#4B3621]' : 'text-[#4B3621]'}`}>{value}</h4>
      </div>
      {sub && (
        <p className={`text-xs mt-2 ${green ? 'text-[#4B3621]/70' : 'text-gray-400'}`}>{sub}</p>
      )}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-4 border-b border-white/10 pb-2">
      <dt className="text-[#9DC183]/80 text-xs uppercase font-bold">{label}</dt>
      <dd className="font-medium text-sm text-right">{value ?? '—'}</dd>
    </div>
  );
}

function IconBtn({ children, onClick, title, danger }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`p-2 rounded-xl border transition-colors ${
        danger
          ? 'border-red-100 text-red-500 hover:bg-red-50'
          : 'border-[#E8E2DC] text-[#4B3621] hover:bg-[#F9F7F5]'
      }`}
    >
      {children}
    </button>
  );
}

function Field({ label, value, onChange, type = 'text' }) {
  return (
    <div>
      <label className="block text-[10px] font-black uppercase text-gray-400 mb-2">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border rounded-2xl px-4 py-3 bg-[#F9F7F5] focus:ring-2 focus:ring-[#4B3621] outline-none"
      />
    </div>
  );
}

function HealthCard({ title, value, sub, icon, status }) {
  const statusColors = {
    good: 'bg-green-100 text-green-600 border-green-200',
    warning: 'bg-yellow-100 text-yellow-600 border-yellow-200',
    error: 'bg-red-100 text-red-600 border-red-200',
  };

  return (
    <div className="bg-white rounded-[28px] border border-[#E8E2DC] p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl border ${statusColors[status]}`}>
          {icon}
        </div>
        <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full ${statusColors[status]}`}>
          {status}
        </span>
      </div>
      <p className="text-[10px] font-black uppercase text-gray-400 mb-1">{title}</p>
      <h4 className="text-2xl font-black text-[#4B3621]">{value}</h4>
      {sub && <p className="text-xs text-gray-500 mt-2">{sub}</p>}
    </div>
  );
}

function getActionColor(action) {
  const actionLower = String(action || '').toLowerCase();
  if (actionLower.includes('delete') || actionLower.includes('supprimer') || actionLower.includes('remove')) {
    return { bg: 'bg-red-100 text-red-600', badge: 'bg-red-200 text-red-700' };
  }
  if (actionLower.includes('update') || actionLower.includes('modifier') || actionLower.includes('edit')) {
    return { bg: 'bg-orange-100 text-orange-600', badge: 'bg-orange-200 text-orange-700' };
  }
  if (actionLower.includes('create') || actionLower.includes('ajouter') || actionLower.includes('insert')) {
    return { bg: 'bg-green-100 text-green-600', badge: 'bg-green-200 text-green-700' };
  }
  if (actionLower.includes('login') || actionLower.includes('connexion')) {
    return { bg: 'bg-blue-100 text-blue-600', badge: 'bg-blue-200 text-blue-700' };
  }
  if (actionLower.includes('logout') || actionLower.includes('déconnexion')) {
    return { bg: 'bg-purple-100 text-purple-600', badge: 'bg-purple-200 text-purple-700' };
  }
  if (actionLower.includes('block') || actionLower.includes('bloquer') || actionLower.includes('ban')) {
    return { bg: 'bg-red-100 text-red-600', badge: 'bg-red-200 text-red-700' };
  }
  return { bg: 'bg-gray-100 text-gray-600', badge: 'bg-gray-200 text-gray-700' };
}

function getActionIcon(action) {
  const actionLower = String(action || '').toLowerCase();
  if (actionLower.includes('delete') || actionLower.includes('supprimer')) {
    return <Trash2 size={16} />;
  }
  if (actionLower.includes('update') || actionLower.includes('modifier') || actionLower.includes('edit')) {
    return <Pencil size={16} />;
  }
  if (actionLower.includes('create') || actionLower.includes('ajouter') || actionLower.includes('insert')) {
    return <UserPlus size={16} />;
  }
  if (actionLower.includes('login') || actionLower.includes('connexion')) {
    return <Shield size={16} />;
  }
  if (actionLower.includes('logout') || actionLower.includes('déconnexion')) {
    return <LogOut size={16} />;
  }
  if (actionLower.includes('block') || actionLower.includes('bloquer') || actionLower.includes('ban')) {
    return <Ban size={16} />;
  }
  return <ScrollText size={16} />;
}

export default AdminDashboard;
