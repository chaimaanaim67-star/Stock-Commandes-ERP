import React, { useState, useEffect } from 'react';
import api from '../../api/axiosConfig';
import { Sparkles, TrendingUp, Package, DollarSign, ArrowRight, Star, Zap } from 'lucide-react';

const IntelligentSuggestions = ({ currentProduct, onAddToCart }) => {
  const [suggestions, setSuggestions] = useState({
    similar: [],
    crossSell: [],
    bestPrice: []
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentProduct) {
      fetchSuggestions();
    }
  }, [currentProduct]);

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      // Mock data for now - in production, fetch from backend
      const mockSuggestions = {
        similar: [
          {
            id: 1,
            designation: 'Chêne — 22x100 — Premium',
            price: 120,
            stock: 15,
            similarity: 0.95,
            reason: 'Même essence, dimensions similaires'
          },
          {
            id: 2,
            designation: 'Chêne — 20x90 — Premium',
            price: 105,
            stock: 20,
            similarity: 0.88,
            reason: 'Même essence, qualité identique'
          },
          {
            id: 3,
            designation: 'Chêne — 25x120 — Premium',
            price: 145,
            stock: 8,
            similarity: 0.82,
            reason: 'Même essence, qualité identique'
          }
        ],
        crossSell: [
          {
            id: 4,
            designation: 'Hêtre — 18x80 — Standard',
            price: 90,
            stock: 25,
            frequency: 0.75,
            reason: 'Souvent commandé ensemble'
          },
          {
            id: 5,
            designation: 'Pin — 25x120 — Standard',
            price: 85,
            stock: 30,
            frequency: 0.68,
            reason: 'Combinaison populaire'
          }
        ],
        bestPrice: [
          {
            id: 6,
            designation: 'Chêne — 22x100 — Standard',
            price: 95,
            stock: 40,
            savings: 25,
            reason: 'Meilleur prix pour même dimensions'
          },
          {
            id: 7,
            designation: 'Chêne — 22x100 — Économique',
            price: 88,
            stock: 50,
            savings: 32,
            reason: 'Option économique disponible'
          }
        ]
      };
      setSuggestions(mockSuggestions);
    } catch (err) {
      console.error('Error fetching suggestions:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (n) =>
    (parseFloat(n) || 0).toLocaleString('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  if (!currentProduct) {
    return (
      <div className="bg-white border border-[#E8E2DC] rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Sparkles className="text-[#9DC183]" size={20} />
          <h3 className="text-lg font-black text-[#4B3621]">Suggestions Intelligentes</h3>
        </div>
        <p className="text-gray-500 text-sm">Sélectionnez un produit pour voir les suggestions</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Similar Products */}
      {suggestions.similar.length > 0 && (
        <div className="bg-white border border-[#E8E2DC] rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Package className="text-[#9DC183]" size={20} />
            <h3 className="text-lg font-black text-[#4B3621]">Produits Similaires</h3>
          </div>
          <div className="space-y-3">
            {suggestions.similar.map((product) => (
              <div
                key={product.id}
                className="flex items-center justify-between p-3 bg-[#F9F7F5] rounded-xl hover:bg-[#F0EEE9] transition-colors"
              >
                <div className="flex-1">
                  <p className="font-medium text-[#4B3621]">{product.designation}</p>
                  <p className="text-xs text-gray-500 mt-1">{product.reason}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-gray-400">Similarité: {Math.round(product.similarity * 100)}%</span>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs text-gray-400">Stock: {product.stock}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-[#9DC183]">{formatMoney(product.price)} DH</p>
                  {onAddToCart && (
                    <button
                      onClick={() => onAddToCart(product)}
                      className="mt-2 px-3 py-1 bg-[#4B3621] text-white text-xs font-bold rounded-lg hover:opacity-90 flex items-center gap-1"
                    >
                      <ArrowRight size={12} />
                      Ajouter
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cross-sell Products */}
      {suggestions.crossSell.length > 0 && (
        <div className="bg-white border border-[#E8E2DC] rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="text-[#9DC183]" size={20} />
            <h3 className="text-lg font-black text-[#4B3621]">Souvent Commandés Ensemble</h3>
          </div>
          <div className="space-y-3">
            {suggestions.crossSell.map((product) => (
              <div
                key={product.id}
                className="flex items-center justify-between p-3 bg-[#F9F7F5] rounded-xl hover:bg-[#F0EEE9] transition-colors"
              >
                <div className="flex-1">
                  <p className="font-medium text-[#4B3621]">{product.designation}</p>
                  <p className="text-xs text-gray-500 mt-1">{product.reason}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-gray-400">Fréquence: {Math.round(product.frequency * 100)}%</span>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs text-gray-400">Stock: {product.stock}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-[#9DC183]">{formatMoney(product.price)} DH</p>
                  {onAddToCart && (
                    <button
                      onClick={() => onAddToCart(product)}
                      className="mt-2 px-3 py-1 bg-[#4B3621] text-white text-xs font-bold rounded-lg hover:opacity-90 flex items-center gap-1"
                    >
                      <ArrowRight size={12} />
                      Ajouter
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Best Price Options */}
      {suggestions.bestPrice.length > 0 && (
        <div className="bg-white border border-[#E8E2DC] rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <DollarSign className="text-[#9DC183]" size={20} />
            <h3 className="text-lg font-black text-[#4B3621]">Meilleurs Prix</h3>
          </div>
          <div className="space-y-3">
            {suggestions.bestPrice.map((product) => (
              <div
                key={product.id}
                className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-white rounded-xl hover:from-green-100 transition-colors border border-green-200"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-[#4B3621]">{product.designation}</p>
                    <Zap size={14} className="text-green-600" />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{product.reason}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-green-600 font-bold">Économisez {formatMoney(product.savings)} DH</span>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs text-gray-400">Stock: {product.stock}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-600">{formatMoney(product.price)} DH</p>
                  {onAddToCart && (
                    <button
                      onClick={() => onAddToCart(product)}
                      className="mt-2 px-3 py-1 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 flex items-center gap-1"
                    >
                      <ArrowRight size={12} />
                      Ajouter
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div className="bg-white border border-[#E8E2DC] rounded-2xl p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#9DC183] border-t-transparent mx-auto" />
          <p className="text-sm text-gray-500 mt-2">Chargement des suggestions...</p>
        </div>
      )}

      {!loading && suggestions.similar.length === 0 && suggestions.crossSell.length === 0 && suggestions.bestPrice.length === 0 && (
        <div className="bg-white border border-[#E8E2DC] rounded-2xl p-6 text-center">
          <Sparkles className="text-gray-300 mx-auto mb-2" size={32} />
          <p className="text-gray-500 text-sm">Aucune suggestion disponible</p>
        </div>
      )}
    </div>
  );
};

export default IntelligentSuggestions;
