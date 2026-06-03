import React, { useState, useEffect } from 'react';
import api from '../../api/axiosConfig';
import { Save, PackagePlus, Info, Hash, Tag } from 'lucide-react';
import {
  MOTIFS_ENTREE,
  MOTIFS_SORTIE,
  buildCommentaireWithMotif,
} from '../../utils/mouvementMotif';
import {
  normalizeProduitList,
  produitId,
  produitLabel,
  produitStockM3,
} from '../../utils/produitDisplay';

const MouvementForm = ({ onMouvementAdded, initialProductId }) => {
  const [formData, setFormData] = useState({
    id_produit: initialProductId || '',
    num_colis: '',
    type_mouvement: 'Entrée',
    quantite: '',
    id_client: '',
    motif: MOTIFS_ENTREE[0],
    detail: '',
  });

  const [articles, setArticles] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const res = await api.get('/api/produit');
        setArticles(normalizeProduitList(res.data));
      } catch (err) {
        console.error('Erreur chargement articles:', err);
        setArticles([]);
      }
    };
    fetchArticles();

    if (initialProductId) {
      setFormData((prev) => ({ ...prev, id_produit: String(initialProductId) }));
    }
  }, [initialProductId]);

  const selectedArticle = articles.find(
    (a) => String(produitId(a)) === String(formData.id_produit)
  );
  const stockM3 = produitStockM3(selectedArticle);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'id_produit' && value) {
      const art = articles.find((a) => String(produitId(a)) === String(value));
      setFormData((prev) => ({
        ...prev,
        id_produit: value,
        num_colis: art?.num_colis || art?.colis || prev.num_colis,
      }));
      return;
    }
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const q = parseFloat(formData.quantite);
    if (!(q > 0)) {
      alert('Indiquez une quantité en m³ supérieure à 0.');
      return;
    }
    if (
      formData.type_mouvement === 'Sortie' &&
      selectedArticle &&
      q > stockM3 + 1e-6
    ) {
      alert(
        `Stock insuffisant : ${stockM3.toFixed(2)} m³ disponible pour ce produit.`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const commentaire = buildCommentaireWithMotif(formData.motif, formData.detail);
      const payload = {
        id_produit: formData.id_produit,
        num_colis: formData.num_colis,
        type_mouvement: formData.type_mouvement,
        quantite: q,
        id_client: formData.id_client || null,
        commentaire,
      };
      const response = await api.post('/api/mouvements', payload);
      alert(
        '✅ ' + (response.data.data?.message || 'Mouvement enregistré — stock m³ mis à jour')
      );

      setFormData({
        id_produit: initialProductId || '',
        num_colis: '',
        type_mouvement: 'Entrée',
        quantite: '',
        id_client: '',
        motif: MOTIFS_ENTREE[0],
        detail: '',
      });

      if (onMouvementAdded) onMouvementAdded();
    } catch (error) {
      console.error('Erreur:', error.response?.data?.error || error.message);
      alert('❌ ' + (error.response?.data?.error || 'Enregistrement échoué'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-[#FDFCFB] p-8 rounded-[32px] border border-[#E8E2DC] shadow-inner animate-in fade-in">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-gray-400 ml-2 tracking-widest">
              Produit (stock pivot m³)
            </label>
            <div className="relative">
              <Tag className="absolute left-4 top-3.5 text-gray-300" size={16} />
              <select
                name="id_produit"
                required
                disabled={!!initialProductId}
                className="w-full bg-white border border-[#E8E2DC] py-3 pl-12 pr-6 rounded-2xl text-sm font-bold outline-none focus:ring-2 ring-[#9DC183] disabled:bg-gray-50"
                value={formData.id_produit}
                onChange={handleChange}
              >
                <option value="">Sélectionner…</option>
                {articles.map((art) => {
                  const pid = produitId(art);
                  return (
                    <option key={pid} value={pid}>
                      {produitLabel(art)}
                    </option>
                  );
                })}
              </select>
            </div>
            {selectedArticle && (
              <p className="text-[10px] text-[#4B3621] font-bold ml-2">
                Stock actuel : {stockM3.toFixed(2)} m³
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-gray-400 ml-2 tracking-widest">
              N° Colis (Ismawood)
            </label>
            <div className="relative">
              <Hash className="absolute left-4 top-3.5 text-gray-300" size={16} />
              <input
                name="num_colis"
                required
                placeholder="Ex: COL-2026"
                className="w-full bg-white border border-[#E8E2DC] py-3 pl-12 pr-6 rounded-2xl text-sm font-bold outline-none focus:ring-2 ring-[#9DC183]"
                value={formData.num_colis}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-gray-400 ml-2 tracking-widest">
              Opération
            </label>
            <div className="flex bg-white p-1 rounded-2xl border border-[#E8E2DC]">
              <button
                type="button"
                onClick={() =>
                  setFormData({
                    ...formData,
                    type_mouvement: 'Entrée',
                    motif: MOTIFS_ENTREE[0],
                  })
                }
                className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${formData.type_mouvement === 'Entrée' ? 'bg-[#9DC183] text-[#4B3621]' : 'text-gray-400'}`}
              >
                Entrée (+)
              </button>
              <button
                type="button"
                onClick={() =>
                  setFormData({
                    ...formData,
                    type_mouvement: 'Sortie',
                    motif: MOTIFS_SORTIE[0],
                  })
                }
                className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${formData.type_mouvement === 'Sortie' ? 'bg-red-400 text-white' : 'text-gray-400'}`}
              >
                Sortie (−)
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-gray-400 ml-2 tracking-widest">
              Quantité (m³)
            </label>
            <div className="relative">
              <PackagePlus className="absolute left-4 top-3.5 text-gray-300" size={16} />
              <input
                name="quantite"
                type="number"
                required
                min="0.0001"
                step="0.01"
                placeholder="Volume en m³"
                className="w-full bg-white border border-[#E8E2DC] py-3 pl-12 pr-6 rounded-2xl text-sm font-bold outline-none focus:ring-2 ring-[#9DC183]"
                value={formData.quantite}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-[10px] font-black uppercase text-gray-400 ml-2 tracking-widest">
              Motif
            </label>
            <div className="relative">
              <Tag className="absolute left-4 top-3.5 text-gray-300 pointer-events-none" size={16} />
              <select
                name="motif"
                className="w-full bg-white border border-[#E8E2DC] py-3 pl-12 pr-6 rounded-2xl text-sm font-bold outline-none focus:ring-2 ring-[#9DC183]"
                value={formData.motif}
                onChange={handleChange}
              >
                {(formData.type_mouvement === 'Entrée' ? MOTIFS_ENTREE : MOTIFS_SORTIE).map(
                  (m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-[10px] font-black uppercase text-gray-400 ml-2 tracking-widest">
              Détail / commentaire libre
            </label>
            <div className="relative">
              <Info className="absolute left-4 top-3.5 text-gray-300" size={16} />
              <textarea
                name="detail"
                placeholder="Réf. BL, client, bon de commande…"
                className="w-full bg-white border border-[#E8E2DC] py-3 pl-12 pr-6 rounded-2xl text-sm font-bold outline-none focus:ring-2 ring-[#9DC183] min-h-[100px]"
                value={formData.detail}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-[#4B3621] text-[#9DC183] px-10 py-4 rounded-2xl font-black uppercase text-[11px] flex items-center gap-2 hover:bg-[#3d2c1b] transition-all shadow-xl disabled:opacity-50"
          >
            <Save size={18} />
            {isSubmitting ? 'Enregistrement…' : 'Valider le mouvement'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default MouvementForm;
