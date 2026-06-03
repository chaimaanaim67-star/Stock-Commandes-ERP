import React, { useState, useEffect } from 'react';
import api from '../../api/axiosConfig';
import { Star, Copy, Save, Clock, Folder, Trash2, Plus, Zap } from 'lucide-react';

const CommercialProductivity = () => {
  const [activeTab, setActiveTab] = useState('favorites');
  const [favorites, setFavorites] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProductivityData();
  }, []);

  const fetchProductivityData = async () => {
    setLoading(true);
    try {
      // Mock data for now - in production, fetch from backend
      const mockFavorites = [
        { id: 1, name: 'Chêne Premium 22x100', type: 'model', usage: 45, lastUsed: '2 days ago' },
        { id: 2, name: 'Hêtre Standard 18x80', type: 'model', usage: 32, lastUsed: '5 days ago' },
        { id: 3, name: 'Pin Standard 25x120', type: 'model', usage: 28, lastUsed: '1 week ago' },
      ];

      const mockTemplates = [
        { id: 1, name: 'Commande Standard', items: 5, usage: 120, lastUsed: '1 day ago' },
        { id: 2, name: 'Commande Premium', items: 8, usage: 85, lastUsed: '3 days ago' },
        { id: 3, name: 'Commande Économique', items: 3, usage: 65, lastUsed: '1 week ago' },
      ];

      const mockRecentOrders = [
        { id: 1, reference: 'BC-2024-001', client: 'Client XYZ', total: 5400, date: '2 days ago' },
        { id: 2, reference: 'BC-2024-002', client: 'Client ABC', total: 3200, date: '5 days ago' },
        { id: 3, reference: 'BC-2024-003', client: 'Client DEF', total: 7800, date: '1 week ago' },
      ];

      setFavorites(mockFavorites);
      setTemplates(mockTemplates);
      setRecentOrders(mockRecentOrders);
    } catch (err) {
      console.error('Error fetching productivity data:', err);
    } finally {
      setLoading(false);
    }
  };

  const duplicateOrder = async (reference) => {
    try {
      await api.post(`/api/commercial/commandes/ref/${reference}/duplicate`, {});
      alert('Commande dupliquée avec succès!');
    } catch (err) {
      console.error('Error duplicating order:', err);
      alert('Erreur lors de la duplication');
    }
  };

  const useTemplate = async (templateId) => {
    try {
      alert('Template appliqué avec succès!');
    } catch (err) {
      console.error('Error using template:', err);
      alert('Erreur lors de l\'application du template');
    }
  };

  const removeFavorite = (id) => {
    setFavorites(prev => prev.filter(f => f.id !== id));
  };

  const removeTemplate = (id) => {
    setTemplates(prev => prev.filter(t => t.id !== id));
  };

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-[#4B3621]">Productivité Commerciale</h2>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-[#9DC183] text-[#4B3621] font-bold rounded-xl hover:opacity-90 flex items-center gap-2">
            <Plus size={16} />
            Nouveau Template
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-2xl p-2 border border-[#E8E2DC] flex gap-2">
        <button
          onClick={() => setActiveTab('favorites')}
          className={`flex-1 px-6 py-3 rounded-xl font-bold transition-all ${
            activeTab === 'favorites'
              ? 'bg-[#4B3621] text-white'
              : 'text-[#4B3621] hover:bg-[#F9F7F5]'
          }`}
        >
          Modèles Favoris
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`flex-1 px-6 py-3 rounded-xl font-bold transition-all ${
            activeTab === 'templates'
              ? 'bg-[#4B3621] text-white'
              : 'text-[#4B3621] hover:bg-[#F9F7F5]'
          }`}
        >
          Templates
        </button>
        <button
          onClick={() => setActiveTab('recent')}
          className={`flex-1 px-6 py-3 rounded-xl font-bold transition-all ${
            activeTab === 'recent'
              ? 'bg-[#4B3621] text-white'
              : 'text-[#4B3621] hover:bg-[#F9F7F5]'
          }`}
        >
          Commandes Récentes
        </button>
      </div>

      {/* Favorites Tab */}
      {activeTab === 'favorites' && (
        <div className="space-y-4">
          {favorites.length === 0 ? (
            <div className="bg-white border border-[#E8E2DC] rounded-2xl p-12 text-center">
              <Star className="text-gray-300 mx-auto mb-4" size={48} />
              <p className="text-gray-500">Aucun modèle favori</p>
              <p className="text-sm text-gray-400 mt-2">Ajoutez des modèles à vos favoris pour un accès rapide</p>
            </div>
          ) : (
            favorites.map((favorite) => (
              <div
                key={favorite.id}
                className="bg-white border border-[#E8E2DC] rounded-2xl p-4 flex items-center justify-between hover:shadow-sm transition-shadow"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-[#9DC183] rounded-full p-3">
                    <Star className="text-white" size={20} fill="white" />
                  </div>
                  <div>
                    <p className="font-bold text-[#4B3621]">{favorite.name}</p>
                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock size={14} />
                        {favorite.lastUsed}
                      </span>
                      <span>•</span>
                      <span>{favorite.usage} utilisations</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="px-4 py-2 bg-[#4B3621] text-white font-bold rounded-lg hover:opacity-90 flex items-center gap-2">
                    <Copy size={16} />
                    Utiliser
                  </button>
                  <button
                    onClick={() => removeFavorite(favorite.id)}
                    className="p-2 rounded-lg hover:bg-red-100 text-red-600"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div className="space-y-4">
          {templates.length === 0 ? (
            <div className="bg-white border border-[#E8E2DC] rounded-2xl p-12 text-center">
              <Folder className="text-gray-300 mx-auto mb-4" size={48} />
              <p className="text-gray-500">Aucun template</p>
              <p className="text-sm text-gray-400 mt-2">Créez des templates pour accélérer la création de commandes</p>
            </div>
          ) : (
            templates.map((template) => (
              <div
                key={template.id}
                className="bg-white border border-[#E8E2DC] rounded-2xl p-4 flex items-center justify-between hover:shadow-sm transition-shadow"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-[#4B3621] rounded-full p-3">
                    <Folder className="text-white" size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-[#4B3621]">{template.name}</p>
                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                      <span>{template.items} articles</span>
                      <span>•</span>
                      <span>{template.usage} utilisations</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock size={14} />
                        {template.lastUsed}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => useTemplate(template.id)}
                    className="px-4 py-2 bg-[#9DC183] text-[#4B3621] font-bold rounded-lg hover:opacity-90 flex items-center gap-2"
                  >
                    <Zap size={16} />
                    Appliquer
                  </button>
                  <button
                    onClick={() => removeTemplate(template.id)}
                    className="p-2 rounded-lg hover:bg-red-100 text-red-600"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Recent Orders Tab */}
      {activeTab === 'recent' && (
        <div className="space-y-4">
          {recentOrders.length === 0 ? (
            <div className="bg-white border border-[#E8E2DC] rounded-2xl p-12 text-center">
              <Clock className="text-gray-300 mx-auto mb-4" size={48} />
              <p className="text-gray-500">Aucune commande récente</p>
            </div>
          ) : (
            recentOrders.map((order) => (
              <div
                key={order.id}
                className="bg-white border border-[#E8E2DC] rounded-2xl p-4 flex items-center justify-between hover:shadow-sm transition-shadow"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-[#6d5035] rounded-full p-3">
                    <Copy className="text-white" size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-[#4B3621]">{order.reference}</p>
                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                      <span>{order.client}</span>
                      <span>•</span>
                      <span>{formatMoney(order.total)} DH</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock size={14} />
                        {order.date}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => duplicateOrder(order.reference)}
                    className="px-4 py-2 bg-[#4B3621] text-white font-bold rounded-lg hover:opacity-90 flex items-center gap-2"
                  >
                    <Copy size={16} />
                    Dupliquer
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-[#E8E2DC] rounded-2xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <Star className="text-[#9DC183]" size={20} />
            <p className="text-sm text-gray-500">Favoris</p>
          </div>
          <p className="text-2xl font-black text-[#4B3621]">{favorites.length}</p>
        </div>
        <div className="bg-white border border-[#E8E2DC] rounded-2xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <Folder className="text-[#4B3621]" size={20} />
            <p className="text-sm text-gray-500">Templates</p>
          </div>
          <p className="text-2xl font-black text-[#4B3621]">{templates.length}</p>
        </div>
        <div className="bg-white border border-[#E8E2DC] rounded-2xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <Copy className="text-[#6d5035]" size={20} />
            <p className="text-sm text-gray-500">Dupliquer</p>
          </div>
          <p className="text-2xl font-black text-[#4B3621]">{recentOrders.length}</p>
        </div>
      </div>
    </div>
  );
};

export default CommercialProductivity;
