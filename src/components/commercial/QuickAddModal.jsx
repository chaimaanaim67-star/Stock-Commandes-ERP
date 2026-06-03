import React, { useState, useEffect } from 'react';
import api from '../../api/axiosConfig';
import { Plus, X, Search, Package, DollarSign, Check } from 'lucide-react';

const QuickAddModal = ({ onClose, onAdd }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchTerm.length >= 2) {
      searchProducts();
    } else {
      setResults([]);
    }
  }, [searchTerm]);

  const searchProducts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/stock');
      const allRows = res.data.rows || [];
      const filtered = allRows
        .filter(row => row.join(' ').toLowerCase().includes(searchTerm.toLowerCase()))
        .slice(0, 10);
      setResults(filtered);
    } catch (err) {
      console.error('Error searching products:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    if (selectedProduct && quantity > 0 && price) {
      onAdd({
        designation: selectedProduct.join(' - '),
        quantity: parseFloat(quantity),
        price: parseFloat(price)
      });
      onClose();
    }
  };

  const formatMoney = (n) =>
    (parseFloat(n) || 0).toLocaleString('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return (
    <div className="fixed inset-0 z-[500] bg-black/50 overflow-y-auto p-4 md:p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-black text-[#4B3621]">Ajout Rapide</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <label className="block text-sm font-bold text-[#4B3621] mb-2">
            Rechercher un produit
          </label>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tapez pour rechercher..."
              className="w-full bg-[#f8f5f1] border border-[#e9dfd3] rounded-2xl pl-12 pr-4 py-4 outline-none focus:ring-2 focus:ring-[#4B3621]"
            />
          </div>
        </div>

        {/* Search Results */}
        {loading && (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#9DC183] border-t-transparent mx-auto" />
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="mb-6 max-h-48 overflow-y-auto">
            {results.map((row, index) => (
              <div
                key={index}
                onClick={() => {
                  setSelectedProduct(row);
                  setSearchTerm(row.join(' - '));
                  setResults([]);
                }}
                className="p-3 bg-[#F9F7F5] rounded-xl mb-2 cursor-pointer hover:bg-[#F0EEE9] transition-colors"
              >
                <p className="font-medium text-[#4B3621]">{row.join(' - ')}</p>
              </div>
            ))}
          </div>
        )}

        {/* Selected Product */}
        {selectedProduct && (
          <div className="mb-6 p-4 bg-[#9DC183]/10 border border-[#9DC183] rounded-2xl">
            <div className="flex items-center gap-3 mb-3">
              <Package className="text-[#9DC183]" size={20} />
              <p className="font-bold text-[#4B3621]">Produit sélectionné</p>
            </div>
            <p className="text-[#4B3621]">{selectedProduct.join(' - ')}</p>
          </div>
        )}

        {/* Quantity and Price */}
        {selectedProduct && (
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-bold text-[#4B3621] mb-2">
                Quantité
              </label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                min="1"
                className="w-full bg-[#f8f5f1] border border-[#e9dfd3] rounded-2xl px-4 py-4 outline-none focus:ring-2 focus:ring-[#4B3621]"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-[#4B3621] mb-2">
                Prix Unitaire (DH)
              </label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                min="0"
                step="0.01"
                className="w-full bg-[#f8f5f1] border border-[#e9dfd3] rounded-2xl px-4 py-4 outline-none focus:ring-2 focus:ring-[#4B3621]"
              />
            </div>
          </div>
        )}

        {/* Total */}
        {selectedProduct && quantity && price && (
          <div className="mb-6 p-4 bg-[#4B3621]/5 border border-[#4B3621] rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#4B3621]">Total</span>
              <span className="text-2xl font-black text-[#9DC183]">
                {formatMoney(quantity * price)} DH
              </span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-3">
          <button
            onClick={onClose}
            className="w-full py-4 bg-gray-100 text-gray-700 font-bold rounded-2xl hover:bg-gray-200 flex items-center justify-center"
          >
            Annuler
          </button>
          <button
            onClick={handleAdd}
            disabled={!selectedProduct || !quantity || !price}
            className="w-full py-4 bg-[#9DC183] text-white font-bold rounded-2xl hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-3"
          >
            <Plus size={20} />
            Ajouter au panier
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuickAddModal;
