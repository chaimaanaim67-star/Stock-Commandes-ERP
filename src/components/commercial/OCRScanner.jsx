import React, { useState, useRef } from 'react';
import api from '../../api/axiosConfig';
import { Camera, Upload, X, Check, AlertCircle, Loader2, FileText, Edit2 } from 'lucide-react';

const OCRScanner = ({ onClose, onOrderCreated }) => {
  const [step, setStep] = useState(1); // 1: capture, 2: processing, 3: preview, 4: success
  const [image, setImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImage(e.target.result);
        setPreviewUrl(e.target.result);
        setStep(2);
      };
      reader.readAsDataURL(file);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      setError('Camera access denied or not available');
    }
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);
      const imageData = canvas.toDataURL('image/jpeg');
      setImage(imageData);
      setPreviewUrl(imageData);
      
      // Stop camera
      const stream = video.srcObject;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      setStep(2);
    }
  };

  const processOCR = async () => {
    setProcessing(true);
    setError('');
    
    try {
      // Send image to backend for OCR processing
      const formData = new FormData();
      const blob = await fetch(image).then(r => r.blob());
      formData.append('image', blob, 'scan.jpg');
      
      const res = await api.post('/api/commercial/ocr/process', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setExtractedData(res.data);
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur traitement OCR');
    } finally {
      setProcessing(false);
    }
  };

  const updateExtractedData = (field, value) => {
    setExtractedData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const updateProduct = (index, field, value) => {
    setExtractedData(prev => ({
      ...prev,
      products: prev.products.map((p, i) => 
        i === index ? { ...p, [field]: value } : p
      )
    }));
  };

  const confirmOrder = async () => {
    setProcessing(true);
    setError('');
    
    try {
      const res = await api.post('/api/commercial/commandes', {
        nom_client: extractedData.clientName,
        ville: extractedData.ville || '',
        telephone: extractedData.telephone || '',
        email: extractedData.email || '',
        articles: extractedData.products.map(p => ({
          id_modele: p.id_modele,
          ligne_key: p.ligne_key,
          col_key: p.col_key,
          quantite: parseFloat(p.quantity),
          prix_unitaire: parseFloat(p.price),
          designation: p.designation
        })),
        statut: 'en_attente'
      });
      
      setStep(4);
      if (onOrderCreated) {
        onOrderCreated(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur création commande');
    } finally {
      setProcessing(false);
    }
  };

  const formatMoney = (n) =>
    (parseFloat(n) || 0).toLocaleString('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return (
    <div className="fixed inset-0 z-[500] bg-black/50 overflow-y-auto p-4 md:p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-black text-[#4B3621]">Scanner Bon / Facture</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-4 flex items-center gap-2">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {/* Step 1: Capture */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-8 border-2 border-dashed border-[#E8E2DC] rounded-2xl hover:border-[#9DC183] transition-colors flex flex-col items-center gap-3"
              >
                <Upload size={48} className="text-[#9DC183]" />
                <span className="font-bold text-[#4B3621]">Importer une image</span>
                <span className="text-sm text-gray-500">JPG, PNG, PDF</span>
              </button>
              <button
                onClick={startCamera}
                className="p-8 border-2 border-dashed border-[#E8E2DC] rounded-2xl hover:border-[#9DC183] transition-colors flex flex-col items-center gap-3"
              >
                <Camera size={48} className="text-[#9DC183]" />
                <span className="font-bold text-[#4B3621]">Prendre une photo</span>
                <span className="text-sm text-gray-500">Caméra</span>
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />

            {videoRef.current && (
              <div className="relative">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full rounded-2xl"
                />
                <button
                  onClick={captureImage}
                  className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-[#9DC183] text-white p-4 rounded-full hover:opacity-90"
                >
                  <Camera size={24} />
                </button>
              </div>
            )}

            <canvas ref={canvasRef} className="hidden" />
          </div>
        )}

        {/* Step 2: Processing */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="relative">
              <img src={previewUrl} alt="Preview" className="w-full rounded-2xl" />
              <button
                onClick={() => {
                  setImage(null);
                  setPreviewUrl(null);
                  setStep(1);
                }}
                className="absolute top-4 right-4 bg-white p-2 rounded-full shadow-lg hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>

            <button
              onClick={processOCR}
              disabled={processing}
              className="w-full py-4 bg-[#4B3621] text-white font-bold rounded-2xl hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {processing ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Traitement OCR en cours...
                </>
              ) : (
                <>
                  <FileText size={20} />
                  Extraire les données
                </>
              )}
            </button>
          </div>
        )}

        {/* Step 3: Preview & Edit */}
        {step === 3 && extractedData && (
          <div className="space-y-6">
            <div className="bg-[#F9F7F5] rounded-2xl p-6">
              <h3 className="text-lg font-black text-[#4B3621] mb-4">Informations Client</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-2">Nom Client</label>
                  <input
                    type="text"
                    value={extractedData.clientName}
                    onChange={(e) => updateExtractedData('clientName', e.target.value)}
                    className="w-full bg-white border border-[#E8E2DC] rounded-xl px-4 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-2">Ville</label>
                  <input
                    type="text"
                    value={extractedData.ville || ''}
                    onChange={(e) => updateExtractedData('ville', e.target.value)}
                    className="w-full bg-white border border-[#E8E2DC] rounded-xl px-4 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-2">Téléphone</label>
                  <input
                    type="text"
                    value={extractedData.telephone || ''}
                    onChange={(e) => updateExtractedData('telephone', e.target.value)}
                    className="w-full bg-white border border-[#E8E2DC] rounded-xl px-4 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-2">Email</label>
                  <input
                    type="email"
                    value={extractedData.email || ''}
                    onChange={(e) => updateExtractedData('email', e.target.value)}
                    className="w-full bg-white border border-[#E8E2DC] rounded-xl px-4 py-2"
                  />
                </div>
              </div>
            </div>

            <div className="bg-[#F9F7F5] rounded-2xl p-6">
              <h3 className="text-lg font-black text-[#4B3621] mb-4">Produits</h3>
              <div className="space-y-3">
                {extractedData.products.map((product, index) => (
                  <div key={index} className="bg-white border border-[#E8E2DC] rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Edit2 size={16} className="text-gray-400" />
                      <input
                        type="text"
                        value={product.designation}
                        onChange={(e) => updateProduct(index, 'designation', e.target.value)}
                        className="flex-1 bg-transparent border-none font-medium text-[#4B3621] focus:outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Quantité</label>
                        <input
                          type="number"
                          value={product.quantity}
                          onChange={(e) => updateProduct(index, 'quantity', e.target.value)}
                          className="w-full bg-[#F9F7F5] border border-[#E8E2DC] rounded-lg px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Prix Unitaire</label>
                        <input
                          type="number"
                          value={product.price}
                          onChange={(e) => updateProduct(index, 'price', e.target.value)}
                          className="w-full bg-[#F9F7F5] border border-[#E8E2DC] rounded-lg px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Sous-total</label>
                        <div className="bg-[#F9F7F5] border border-[#E8E2DC] rounded-lg px-3 py-2 text-sm font-bold text-[#9DC183]">
                          {formatMoney(product.quantity * product.price)} DH
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t border-[#E8E2DC] flex justify-between items-center">
                <span className="font-bold text-[#4B3621]">Total</span>
                <span className="text-2xl font-black text-[#9DC183]">
                  {formatMoney(extractedData.products.reduce((sum, p) => sum + (p.quantity * p.price), 0))} DH
                </span>
              </div>
            </div>

            <button
              onClick={confirmOrder}
              disabled={processing}
              className="w-full py-4 bg-[#9DC183] text-white font-bold rounded-2xl hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {processing ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Création commande...
                </>
              ) : (
                <>
                  <Check size={20} />
                  Valider et créer la commande
                </>
              )}
            </button>
          </div>
        )}

        {/* Step 4: Success */}
        {step === 4 && (
          <div className="text-center py-12">
            <div className="bg-green-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
              <Check size={40} className="text-green-600" />
            </div>
            <h3 className="text-2xl font-black text-[#4B3621] mb-2">Commande créée avec succès!</h3>
            <p className="text-gray-600 mb-6">Le stock a été mis à jour automatiquement.</p>
            <button
              onClick={onClose}
              className="px-8 py-3 bg-[#4B3621] text-white font-bold rounded-2xl hover:opacity-90"
            >
              Fermer
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default OCRScanner;
