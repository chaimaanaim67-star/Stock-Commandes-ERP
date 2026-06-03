import React, { useRef, useState, useEffect } from 'react';
import { PenTool, X, Check, Download, Trash2 } from 'lucide-react';

const ClientSignature = ({ onSave, onClose, initialSignature }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#4B3621';

    // Load initial signature if provided
    if (initialSignature) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        setHasSignature(true);
      };
      img.src = initialSignature;
    }
  }, [initialSignature]);

  const startDrawing = (e) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;
    
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (!hasSignature) return;
    
    const dataURL = canvas.toDataURL('image/png');
    if (onSave) {
      onSave(dataURL);
    }
  };

  const downloadSignature = () => {
    const canvas = canvasRef.current;
    if (!hasSignature) return;
    
    const dataURL = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = 'signature.png';
    link.href = dataURL;
    link.click();
  };

  return (
    <div className="fixed inset-0 z-[500] bg-black/50 overflow-y-auto p-4 md:p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-black text-[#4B3621]">Signature Client</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-bold text-[#4B3621] mb-2">
            Signez dans la zone ci-dessous
          </label>
          <div className="border-2 border-dashed border-[#E8E2DC] rounded-2xl overflow-hidden">
            <canvas
              ref={canvasRef}
              width={600}
              height={200}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="bg-white cursor-crosshair w-full"
              style={{ touchAction: 'none' }}
            />
          </div>
        </div>

        <div className="flex gap-3 mb-6">
          <button
            onClick={clearSignature}
            disabled={!hasSignature}
            className="flex-1 py-3 bg-red-100 text-red-700 font-bold rounded-xl hover:bg-red-200 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Trash2 size={16} />
            Effacer
          </button>
          <button
            onClick={downloadSignature}
            disabled={!hasSignature}
            className="flex-1 py-3 bg-[#f8f5f1] border border-[#e9dfd3] text-[#4B3621] font-bold rounded-xl hover:bg-[#f0eee9] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Download size={16} />
            Télécharger
          </button>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200"
          >
            Annuler
          </button>
          <button
            onClick={saveSignature}
            disabled={!hasSignature}
            className="flex-1 py-3 bg-[#9DC183] text-white font-bold rounded-xl hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Check size={16} />
            Enregistrer
          </button>
        </div>

        <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
          <PenTool size={14} />
          <p>Utilisez votre souris ou votre doigt pour signer</p>
        </div>
      </div>
    </div>
  );
};

export default ClientSignature;
