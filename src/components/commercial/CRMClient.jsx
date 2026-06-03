import React, { useState, useEffect } from 'react';
import api from '../../api/axiosConfig';
import { User, Phone, Mail, MapPin, Package, TrendingUp, Calendar, Star, Heart, FileText, Plus, Edit, Trash2 } from 'lucide-react';

const CRMClient = ({ clientName, onClose }) => {
  const [clientData, setClientData] = useState(null);
  const [history, setHistory] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [newNote, setNewNote] = useState('');

  const fetchClientData = async () => {
    try {
      setLoading(true);
      const [historyRes, statsRes] = await Promise.all([
        api.get(`/api/commercial/clients/${encodeURIComponent(clientName)}/history`),
        api.get(`/api/commercial/clients/${encodeURIComponent(clientName)}/stats`)
      ]);
      setHistory(historyRes.data || []);
      setClientData(statsRes.data);
      
      setFavorites([
        { id: 1, designation: 'Chêne — 22x100 — Premium', lastOrder: '2024-01-15' },
        { id: 2, designation: 'Hêtre — 18x80 — Standard', lastOrder: '2024-02-20' },
      ]);
      
      setNotes([
        { id: 1, date: '2024-03-10', content: 'Client préfère les produits en chêne', author: 'Commercial' },
        { id: 2, date: '2024-02-05', content: 'Livraison toujours le mardi', author: 'Logistique' },
      ]);
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur chargement données client');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!clientName) {
      setError('Nom du client manquant.');
      setHistory([]);
      setClientData(null);
      setFavorites([]);
      setNotes([]);
      setLoading(false);
      return;
    }

    setError('');
    fetchClientData();
  }, [clientName]);

  const addNote = () => {
    if (newNote.trim()) {
      const newNoteObj = {
        id: Date.now(),
        date: new Date().toISOString().split('T')[0],
        content: newNote,
        author: 'Commercial'
      };
      setNotes([newNoteObj, ...notes]);
      setNewNote('');
    }
  };

  const deleteNote = (id) => {
    setNotes(notes.filter(note => note.id !== id));
  };

  const toggleFavorite = (id) => {
    setFavorites(favorites.map(fav => 
      fav.id === id ? { ...fav, isFavorite: !fav.isFavorite } : fav
    ));
  };

  const formatMoney = (n) =>
    (parseFloat(n) || 0).toLocaleString('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const formatQuantity = (value) => {
    const q = parseFloat(value);
    return Number.isFinite(q) ? q.toFixed(2) : '0.00';
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
        <h2 className="text-2xl font-black text-[#4B3621]">Fiche Client</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      <div className="bg-gradient-to-r from-[#4B3621] to-[#6d5035] rounded-2xl p-6 text-white">
        <div className="flex items-start gap-4">
          <div className="bg-white/20 rounded-full p-4">
            <User size={32} />
          </div>
          <div className="flex-1">
            <h3 className="text-2xl font-black">{latestOrder.nom_client || clientName}</h3>
            <p className="text-white/80 mt-1">Client depuis {formatDate(clientData?.overall?.first_order)}</p>
            <div className="flex gap-4 mt-4">
              <div className="flex items-center gap-2">
                <Phone size={16} />
                <span className="text-sm">{latestOrder.telephone || '—'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail size={16} />
                <span className="text-sm">{latestOrder.email || '—'}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={16} />
                <span className="text-sm">{latestOrder.ville || '—'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {clientData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-[#E8E2DC] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <Package className="text-[#9DC183]" size={20} />
              <p className="text-[10px] font-black uppercase text-gray-400">Total commandes</p>
            </div>
            <p className="text-2xl font-black text-[#4B3621]">{clientData.overall?.total_orders || 0}</p>
          </div>
          <div className="bg-white border border-[#E8E2DC] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="text-[#9DC183]" size={20} />
              <p className="text-[10px] font-black uppercase text-gray-400">Total dépensé</p>
            </div>
            <p className="text-2xl font-black text-[#4B3621]">{formatMoney(clientData.overall?.total_spent || 0)} DH</p>
          </div>
          <div className="bg-white border border-[#E8E2DC] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <Star className="text-[#9DC183]" size={20} />
              <p className="text-[10px] font-black uppercase text-gray-400">Panier moyen</p>
            </div>
            <p className="text-2xl font-black text-[#4B3621]">{formatMoney(clientData.overall?.avg_order_value || 0)} DH</p>
          </div>
          <div className="bg-white border border-[#E8E2DC] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="text-[#9DC183]" size={20} />
              <p className="text-[10px] font-black uppercase text-gray-400">Dernière commande</p>
            </div>
            <p className="text-sm font-bold text-[#4B3621]">{formatDate(clientData.overall?.last_order)}</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl p-2 border border-[#E8E2DC] flex gap-2">
        <button onClick={() => setActiveTab('overview')} className={`flex-1 px-4 py-2 rounded-xl font-bold transition-all ${activeTab === 'overview' ? 'bg-[#4B3621] text-white' : 'text-[#4B3621] hover:bg-[#F9F7F5]'}`}>Vue d'ensemble</button>
        <button onClick={() => setActiveTab('history')} className={`flex-1 px-4 py-2 rounded-xl font-bold transition-all ${activeTab === 'history' ? 'bg-[#4B3621] text-white' : 'text-[#4B3621] hover:bg-[#F9F7F5]'}`}>Historique</button>
        <button onClick={() => setActiveTab('favorites')} className={`flex-1 px-4 py-2 rounded-xl font-bold transition-all ${activeTab === 'favorites' ? 'bg-[#4B3621] text-white' : 'text-[#4B3621] hover:bg-[#F9F7F5]'}`}>Favoris</button>
        <button onClick={() => setActiveTab('notes')} className={`flex-1 px-4 py-2 rounded-xl font-bold transition-all ${activeTab === 'notes' ? 'bg-[#4B3621] text-white' : 'text-[#4B3621] hover:bg-[#F9F7F5]'}`}>Notes</button>
      </div>

      {activeTab === 'overview' && clientData?.topProducts && (
        <div className="bg-white border border-[#E8E2DC] rounded-2xl p-6">
          <h3 className="text-lg font-black text-[#4B3621] mb-4">Produits favoris</h3>
          <div className="space-y-3">
            {clientData.topProducts.slice(0, 5).map((product, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-[#F9F7F5] rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="bg-[#9DC183] rounded-full p-2">
                    <Package size={16} className="text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-[#4B3621]">{product.designation}</p>
                    <p className="text-xs text-gray-500">{product.order_count} commandes</p>
                  </div>
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

      {activeTab === 'history' && (
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
                  <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-400">Aucune commande trouvée</td></tr>
                ) : (
                  history.map((order) => (
                    <tr key={order.id_bc} className="border-b border-[#F9F7F5] hover:bg-[#FDFCFB]">
                      <td className="px-6 py-4 font-bold text-[#4B3621]">{order.reference}</td>
                      <td className="px-6 py-4 text-gray-600 text-sm">{formatDate(order.created_at)}</td>
                      <td className="px-6 py-4 font-bold text-[#9DC183]">{formatMoney(order.total_ht)} DH</td>
                      <td className="px-6 py-4"><span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">{order.statut}</span></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'favorites' && (
        <div className="bg-white border border-[#E8E2DC] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-black text-[#4B3621]">Produits favoris</h3>
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#9DC183] text-[#4B3621] text-sm font-bold hover:opacity-90">
              <Plus size={16} /> Ajouter
            </button>
          </div>
          <div className="space-y-3">
            {favorites.map((fav) => (
              <div key={fav.id} className="flex items-center justify-between p-4 bg-[#F9F7F5] rounded-xl">
                <div className="flex items-center gap-3">
                  <button onClick={() => toggleFavorite(fav.id)} className={`p-2 rounded-full ${fav.isFavorite ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-400'}`}>
                    <Heart size={16} fill={fav.isFavorite ? 'currentColor' : 'none'} />
                  </button>
                  <div>
                    <p className="font-medium text-[#4B3621]">{fav.designation}</p>
                    <p className="text-xs text-gray-500">Dernière commande: {formatDate(fav.lastOrder)}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="p-2 rounded-lg hover:bg-gray-200"><Edit size={16} className="text-gray-600" /></button>
                  <button className="p-2 rounded-lg hover:bg-red-100"><Trash2 size={16} className="text-red-600" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'notes' && (
        <div className="bg-white border border-[#E8E2DC] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-black text-[#4B3621]">Notes commerciales</h3>
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#9DC183] text-[#4B3621] text-sm font-bold hover:opacity-90">
              <FileText size={16} /> Exporter
            </button>
          </div>
          
          <div className="mb-6">
            <textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Ajouter une note..." rows={3} className="w-full bg-[#f8f5f1] border border-[#e9dfd3] rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-[#4B3621]" />
            <button onClick={addNote} className="mt-2 px-6 py-2 rounded-xl bg-[#4B3621] text-white font-bold hover:opacity-90">Ajouter note</button>
          </div>

          <div className="space-y-3">
            {notes.map((note) => (
              <div key={note.id} className="p-4 bg-[#F9F7F5] rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-gray-400" />
                    <span className="text-xs text-gray-500">{note.date}</span>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs font-bold text-[#4B3621]">{note.author}</span>
                  </div>
                  <button onClick={() => deleteNote(note.id)} className="text-red-600 hover:text-red-800">
                    <Trash2 size={14} />
                  </button>
                </div>
                <p className="text-sm text-gray-700">{note.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CRMClient;
