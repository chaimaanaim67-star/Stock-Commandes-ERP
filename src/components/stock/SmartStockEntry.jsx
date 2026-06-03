import React, { useState, useRef, useEffect } from 'react';
import api from '../../api/axiosConfig';
import { Camera, Upload, X, Check, AlertTriangle, Package, Box, Ruler, Calculator, Sparkles, RefreshCw } from 'lucide-react';

const SmartStockEntry = ({ onClose, onStockUpdate }) => {
  const [step, setStep] = useState('capture'); // capture, processing, confirmation, success
  const [image, setImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [editedData, setEditedData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [confidence, setConfidence] = useState(0);
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(file);
        setPreviewUrl(reader.result);
        processImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      setError('Impossible d\'accéder à la caméra');
      console.error('Camera error:', err);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg');
      setPreviewUrl(dataUrl);
      
      // Stop camera
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
      
      processImage(dataUrl);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const processImage = async (imageData) => {
    setStep('processing');
    setLoading(true);
    setError(null);

    try {
      // Convert data URL to blob
      const response = await fetch(imageData);
      const blob = await response.blob();
      const formData = new FormData();
      formData.append('image', blob);

      const res = await api.post('/api/stock/ai-analyze', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setExtractedData(res.data);
      setEditedData(res.data);
      setConfidence(res.data.confidence || 0);
      setStep('confirmation');
    } catch (err) {
      console.error('Error processing image:', err);
      setError('Erreur lors du traitement de l\'image');
      setStep('capture');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await api.post('/api/stock/update-from-ai', editedData);
      if (onStockUpdate) {
        onStockUpdate(editedData);
      }
      setStep('success');
    } catch (err) {
      console.error('Error updating stock:', err);
      setError('Erreur lors de la mise à jour du stock');
    } finally {
      setLoading(false);
    }
  };

  const handleRetake = () => {
    setImage(null);
    setPreviewUrl(null);
    setExtractedData(null);
    setEditedData(null);
    setError(null);
    setStep('capture');
  };

  const formatMoney = (n) =>
    (parseFloat(n) || 0).toLocaleString('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const getConfidenceColor = (conf) => {
    if (conf >= 80) return 'text-green-600';
    if (conf >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceLabel = (conf) => {
    if (conf >= 80) return 'Élevée';
    if (conf >= 60) return 'Moyenne';
    return 'Faible';
  };

  return (
    <div className="fixed inset-0 z-[600] bg-black/50 overflow-y-auto p-4 md:p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Sparkles className="text-[#9DC183]" size={24} />
            <h2 className="text-2xl font-black text-[#4B3621]">Smart Stock Entry</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        {/* Step 1: Capture */}
        {step === 'capture' && (
          <div className="space-y-6">
            <div className="bg-[#9DC183]/10 border border-[#9DC183] rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <Camera className="text-[#9DC183] mt-1" size={20} />
                <div>
                  <p className="font-bold text-[#4B3621]">Capturez ou téléchargez une image</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Prenez une photo du colis/fardeau de bois ou téléchargez une image existante
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={startCamera}
                className="p-8 bg-[#f8f5f1] border-2 border-dashed border-[#E8E2DC] rounded-2xl hover:border-[#9DC183] transition-colors flex flex-col items-center gap-3"
              >
                <Camera className="text-[#4B3621]" size={48} />
                <p className="font-bold text-[#4B3621]">Utiliser la caméra</p>
                <p className="text-sm text-gray-500">Prendre une photo</p>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-8 bg-[#f8f5f1] border-2 border-dashed border-[#E8E2DC] rounded-2xl hover:border-[#9DC183] transition-colors flex flex-col items-center gap-3"
              >
                <Upload className="text-[#4B3621]" size={48} />
                <p className="font-bold text-[#4B3621]">Télécharger</p>
                <p className="text-sm text-gray-500">Choisir une image</p>
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />

            {stream && (
              <div className="relative">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full rounded-2xl"
                />
                <canvas ref={canvasRef} className="hidden" />
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-3">
                  <button
                    onClick={capturePhoto}
                    className="px-6 py-3 bg-[#9DC183] text-white font-bold rounded-xl hover:opacity-90 flex items-center gap-2"
                  >
                    <Camera size={20} />
                    Capturer
                  </button>
                  <button
                    onClick={stopCamera}
                    className="px-6 py-3 bg-red-500 text-white font-bold rounded-xl hover:opacity-90"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-100 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
                <AlertTriangle className="text-red-600" size={20} />
                <p className="text-red-700">{error}</p>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Processing */}
        {step === 'processing' && (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-[#9DC183] border-t-transparent mx-auto mb-6" />
            <p className="text-xl font-bold text-[#4B3621] mb-2">Analyse de l'image en cours...</p>
            <p className="text-gray-500">L'IA analyse le colis et extrait les informations</p>
          </div>
        )}

        {/* Step 3: Confirmation */}
        {step === 'confirmation' && editedData && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-bold text-[#4B3621] mb-3">Image capturée</h3>
                <img src={previewUrl} alt="Captured" className="w-full rounded-2xl" />
              </div>

              <div className="space-y-4">
                <div className="bg-[#9DC183]/10 border border-[#9DC183] rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-[#4B3621]">Confiance IA</span>
                    <span className={`font-bold ${getConfidenceColor(confidence)}`}>
                      {Math.round(confidence)}% ({getConfidenceLabel(confidence)})
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-[#9DC183] h-2 rounded-full transition-all"
                      style={{ width: `${confidence}%` }}
                    />
                  </div>
                </div>

                <div className="bg-white border border-[#E8E2DC] rounded-2xl p-4 space-y-3">
                  <div className="flex items-center gap-2 mb-4">
                    <Package className="text-[#4B3621]" size={20} />
                    <h3 className="font-bold text-[#4B3621]">Informations extraites</h3>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-[#4B3621] mb-1">
                      Produit
                    </label>
                    <input
                      type="text"
                      value={editedData.product || ''}
                      onChange={(e) => setEditedData({ ...editedData, product: e.target.value })}
                      className="w-full bg-[#f8f5f1] border border-[#e9dfd3] rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-[#4B3621]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-bold text-[#4B3621] mb-1">
                        Pièces
                      </label>
                      <input
                        type="number"
                        value={editedData.pieces || ''}
                        onChange={(e) => setEditedData({ ...editedData, pieces: parseInt(e.target.value) || 0 })}
                        className="w-full bg-[#f8f5f1] border border-[#e9dfd3] rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-[#4B3621]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-[#4B3621] mb-1">
                        Volume (m³)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={editedData.volume || ''}
                        onChange={(e) => setEditedData({ ...editedData, volume: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-[#f8f5f1] border border-[#e9dfd3] rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-[#4B3621]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-bold text-[#4B3621] mb-1">
                        Longueur (m)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={editedData.length || ''}
                        onChange={(e) => setEditedData({ ...editedData, length: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-[#f8f5f1] border border-[#e9dfd3] rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-[#4B3621]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-[#4B3621] mb-1">
                        Largeur (m)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={editedData.width || ''}
                        onChange={(e) => setEditedData({ ...editedData, width: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-[#f8f5f1] border border-[#e9dfd3] rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-[#4B3621]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-[#4B3621] mb-1">
                      Type de bois
                    </label>
                    <select
                      value={editedData.woodType || ''}
                      onChange={(e) => setEditedData({ ...editedData, woodType: e.target.value })}
                      className="w-full bg-[#f8f5f1] border border-[#e9dfd3] rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-[#4B3621]"
                    >
                      <option value="">Sélectionner...</option>
                      <option value="Chêne">Chêne</option>
                      <option value="Hêtre">Hêtre</option>
                      <option value="Pin">Pin</option>
                      <option value="Autre">Autre</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-[#4B3621] mb-1">
                      Qualité
                    </label>
                    <select
                      value={editedData.quality || ''}
                      onChange={(e) => setEditedData({ ...editedData, quality: e.target.value })}
                      className="w-full bg-[#f8f5f1] border border-[#e9dfd3] rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-[#4B3621]"
                    >
                      <option value="">Sélectionner...</option>
                      <option value="Premium">Premium</option>
                      <option value="Standard">Standard</option>
                      <option value="Économique">Économique</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {confidence < 70 && (
              <div className="bg-yellow-100 border border-yellow-200 rounded-2xl p-4 flex items-start gap-3">
                <AlertTriangle className="text-yellow-600 mt-1" size={20} />
                <div>
                  <p className="font-bold text-yellow-800">Confiance faible</p>
                  <p className="text-sm text-yellow-700 mt-1">
                    Veuillez vérifier et corriger les informations avant de confirmer
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleRetake}
                className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 flex items-center justify-center gap-2"
              >
                <RefreshCw size={16} />
                Recommencer
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="flex-1 py-3 bg-[#9DC183] text-white font-bold rounded-xl hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Check size={16} />
                Confirmer et mettre à jour
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Success */}
        {step === 'success' && (
          <div className="text-center py-20">
            <div className="bg-green-100 rounded-full p-6 mx-auto mb-6 w-24 h-24 flex items-center justify-center">
              <Check className="text-green-600" size={48} />
            </div>
            <h3 className="text-2xl font-black text-[#4B3621] mb-2">Stock mis à jour avec succès!</h3>
            <p className="text-gray-500 mb-6">
              {editedData?.pieces} pièces ajoutées ({editedData?.volume} m³)
            </p>
            <button
              onClick={onClose}
              className="px-8 py-3 bg-[#4B3621] text-white font-bold rounded-xl hover:opacity-90"
            >
              Fermer
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SmartStockEntry;
