import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, CheckCircle, Loader2, Save, X, ChevronLeft, AlertCircle, Camera, RefreshCw, Zap } from 'lucide-react';
import * as documentProcessor from '../../services/documentProcessor';
import { SoundFX } from '../../services/audio';
import { db } from '../../db';

export const DocumentReceptionPage: React.FC = () => {
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'idle' | 'camera' | 'upload'>('idle');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const [isStable, setIsStable] = useState(false);
  const stabilityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (stabilityTimerRef.current) clearTimeout(stabilityTimerRef.current);
    setCountdown(null);
    setMode('idle');
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } } 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setMode('camera');
      setError(null);
      
      // Start auto-shoot logic
      startStabilityCheck();
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("No se pudo acceder a la cámara. Verifique los permisos.");
      setMode('upload');
    }
  };

  const startStabilityCheck = () => {
    setCountdown(3);
    let count = 3;
    
    const tick = () => {
      count--;
      setCountdown(count);
      if (count > 0) {
        stabilityTimerRef.current = setTimeout(tick, 1000);
      } else {
        capturePhoto();
        setCountdown(null);
      }
    };
    
    stabilityTimerRef.current = setTimeout(tick, 1000);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // 1. Capture raw frame
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // 2. Apply "Document Mode" Enhancement (High Contrast / Grayscale)
      // This mimics the Google Drive "Document" filter
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        // Grayscale
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        
        // High Contrast (Threshold-like)
        const contrast = 1.5; // Factor
        const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
        const final = factor * (gray - 128) + 128;
        
        data[i] = data[i+1] = data[i+2] = final;
      }
      ctx.putImageData(imageData, 0, 0);

      // 3. Visual Flash Effect
      const flash = document.createElement('div');
      flash.className = 'fixed inset-0 bg-white z-[100] animate-flash-out pointer-events-none';
      document.body.appendChild(flash);
      setTimeout(() => flash.remove(), 500);

      const base64 = canvas.toDataURL('image/jpeg', 0.9).split(',')[1];
      processDocument(base64, 'image/jpeg');
      stopCamera();
    }
  };

  const processDocument = async (base64: string, mimeType: string) => {
    setIsProcessing(true);
    setError(null);
    try {
      const data = await documentProcessor.parseGuidePDF(base64, mimeType);
      if (data && data.erpOrder && data.items) {
        setResult((prev: any) => {
          if (!prev) return data;
          
          // Merge items logic:
          // We keep the original ERP order if it was already set
          // and append new items that aren't already in the list (by barcode)
          const existingBarcodes = new Set(prev.items.map((i: any) => i.barcode));
          const uniqueNewItems = data.items.filter((i: any) => !existingBarcodes.has(i.barcode));
          
          return {
            ...prev,
            items: [...prev.items, ...uniqueNewItems]
          };
        });
        SoundFX.play('success');
      } else {
        throw new Error("La IA no pudo detectar una tabla de productos clara. Intente con una foto más cercana.");
      }
    } catch (err: any) {
      setError(err.message || "Error procesando documento");
      SoundFX.play('error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const res = e.target?.result as string;
      const mimeType = res.split(';')[0].split(':')[1];
      const base64 = res.split(',')[1];
      processDocument(base64, mimeType);
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    return () => {
      if (stream) stream.getTracks().forEach(track => track.stop());
    };
  }, [stream]);

  const handleSave = async () => {
    if (!result) return;
    try {
      await db.expectedOrders.put({
        id: result.erpOrder,
        internalId: result.erpOrder,
        items: result.items,
        totalExpectedUnits: result.items.reduce((acc: number, item: any) => acc + item.expectedQty, 0),
        totalExpectedSKUs: result.items.length,
        importedAt: Date.now()
      });
      SoundFX.play('success');
      setResult(null);
      alert("Orden guardada exitosamente");
    } catch (error) {
      console.error("Error saving expected order:", error);
      alert("Error al guardar la orden");
    }
  };

  const handleItemChange = (index: number, field: string, value: string | number) => {
    const newItems = [...result.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setResult({ ...result, items: newItems });
  };

  const handleRemoveItem = (index: number) => {
    const newItems = result.items.filter((_: any, i: number) => i !== index);
    setResult({ ...result, items: newItems });
  };

  return (
    <div className="h-full w-full bg-black overflow-y-auto no-scrollbar pb-32 font-mono text-white">
      {/* HEADER */}
      <header className="px-6 py-6 border-b-4 border-white/5 bg-slate-900/20 sticky top-0 z-50 flex items-center gap-4">
        <button onClick={() => navigate('/dashboard')} className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl active:bg-blue-600 transition-colors">
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>
        <div>
          <h1 className="text-2xl font-black text-white italic tracking-tighter uppercase leading-none">
            DOC<span className="text-blue-500">RECEPTION</span>
          </h1>
          <span className="text-[9px] font-black text-slate-500 tracking-[0.3em] uppercase">Procesamiento de Guías</span>
        </div>
      </header>

      <div className="p-6 max-w-4xl mx-auto space-y-6">
        
        {error && (
          <div className="bg-rose-900/40 text-rose-400 p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-rose-500/30 flex items-center gap-3 animate-in shake">
            <AlertCircle className="w-5 h-5 shrink-0" />
            {error}
          </div>
        )}

        {!result && mode === 'idle' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button 
              onClick={startCamera}
              className="group relative h-64 bg-slate-900 border-2 border-slate-800 rounded-[2rem] flex flex-col items-center justify-center gap-4 hover:border-blue-500 transition-all overflow-hidden"
            >
              <div className="absolute inset-0 bg-blue-600/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-900/40 group-active:scale-90 transition-transform">
                <Camera className="w-8 h-8 text-white" />
              </div>
              <div className="text-center">
                <span className="block text-sm font-black uppercase tracking-widest text-white">Escáner en Vivo</span>
                <span className="text-[9px] text-slate-500 uppercase font-bold mt-1 block">Uso recomendado para fotos</span>
              </div>
            </button>

            <label className="group relative h-64 bg-slate-900 border-2 border-slate-800 rounded-[2rem] flex flex-col items-center justify-center gap-4 hover:border-emerald-500 transition-all cursor-pointer overflow-hidden">
              <div className="absolute inset-0 bg-emerald-600/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-900/40 group-active:scale-90 transition-transform">
                <Upload className="w-8 h-8 text-white" />
              </div>
              <div className="text-center">
                <span className="block text-sm font-black uppercase tracking-widest text-white">Subir Archivo</span>
                <span className="text-[9px] text-slate-500 uppercase font-bold mt-1 block">PDF o Imágenes guardadas</span>
              </div>
              <input type="file" accept="application/pdf,image/*" className="hidden" onChange={handleFileUpload} />
            </label>
          </div>
        )}

        {mode === 'camera' && (
          <div className="relative w-full aspect-[3/4] bg-black rounded-[2rem] overflow-hidden border-4 border-slate-800 shadow-2xl">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              className="w-full h-full object-cover"
            />
            
            {/* FRAMING GUIDE OVERLAY */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Darkened edges */}
              <div className="absolute inset-0 border-[40px] border-black/40" />
              
              {/* Scanner Corners */}
              <div className="absolute top-10 left-10 w-12 h-12 border-t-4 border-l-4 border-blue-500 rounded-tl-lg" />
              <div className="absolute top-10 right-10 w-12 h-12 border-t-4 border-r-4 border-blue-500 rounded-tr-lg" />
              <div className="absolute bottom-10 left-10 w-12 h-12 border-b-4 border-l-4 border-blue-500 rounded-bl-lg" />
              <div className="absolute bottom-10 right-10 w-12 h-12 border-b-4 border-r-4 border-blue-500 rounded-br-lg" />
              
              {/* Scan Line Animation */}
              <div className="absolute top-1/2 left-10 right-10 h-0.5 bg-blue-400/50 shadow-[0_0_15px_rgba(59,130,246,0.8)] animate-scan-line" />
              
              <div className="absolute bottom-16 left-0 right-0 text-center flex flex-col items-center gap-3">
                {countdown !== null && (
                  <div className="bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center text-xl font-black shadow-2xl animate-bounce">
                    {countdown}
                  </div>
                )}
                <span className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 border border-blue-500/30">
                  {countdown !== null ? 'Mantenga estable para auto-disparo' : 'Alinee el documento con el marco'}
                </span>
              </div>
            </div>

            {/* CAMERA CONTROLS */}
            <div className="absolute bottom-6 left-0 right-0 flex justify-center items-center gap-8 px-6">
              <button 
                onClick={stopCamera}
                className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-white"
              >
                <X className="w-6 h-6" />
              </button>
              
              <button 
                onClick={() => {
                  if (stabilityTimerRef.current) clearTimeout(stabilityTimerRef.current);
                  capturePhoto();
                }}
                className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-2xl active:scale-90 transition-transform"
              >
                <div className="w-16 h-16 border-4 border-black rounded-full" />
              </button>

              <button 
                onClick={() => {
                  if (stabilityTimerRef.current) clearTimeout(stabilityTimerRef.current);
                  startStabilityCheck();
                }}
                className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-white"
                title="Reiniciar Auto-disparo"
              >
                <RefreshCw className="w-6 h-6" />
              </button>
            </div>
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />

        {result && (
          <>
            <div className="bg-slate-900 p-6 rounded-3xl border border-emerald-500/30">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle className="w-5 h-5" />
                  <span className="text-sm font-black uppercase tracking-widest">Documento Procesado</span>
                </div>
                <button onClick={() => setResult(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Orden ERP / Documento</label>
                  <input 
                    type="text" 
                    value={result.erpOrder}
                    onChange={(e) => setResult({...result, erpOrder: e.target.value})}
                    className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 font-mono font-bold text-lg mt-1 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="bg-slate-900 rounded-3xl border border-white/10 overflow-hidden">
              <div className="p-4 border-b border-white/10 bg-black/50 flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ítems Extraídos ({result.items.length})</span>
                <button 
                  onClick={() => startCamera()}
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 rounded-lg border border-blue-500/30 transition-colors"
                >
                  <Camera className="w-4 h-4" />
                  <span className="text-[9px] font-black uppercase">Escanear Otra Guía</span>
                </button>
              </div>
              <div className="divide-y divide-white/5">
                {result.items.map((item: any, idx: number) => (
                  <div key={idx} className="p-4 flex flex-col md:flex-row gap-4 items-start md:items-center">
                    <div className="flex-1 space-y-2 w-full">
                      <input 
                        type="text" 
                        value={item.barcode}
                        onChange={(e) => handleItemChange(idx, 'barcode', e.target.value)}
                        className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 font-mono text-sm focus:border-blue-500 outline-none"
                        placeholder="SKU / Código"
                      />
                      <input 
                        type="text" 
                        value={item.name}
                        onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                        className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 font-mono text-xs text-slate-400 focus:border-blue-500 outline-none"
                        placeholder="Descripción"
                      />
                    </div>
                    <div className="flex items-center gap-4 w-full md:w-auto">
                      <div className="flex-1 md:w-32">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Cant. Esperada</label>
                        <input 
                          type="number" 
                          value={item.expectedQty}
                          onChange={(e) => handleItemChange(idx, 'expectedQty', parseInt(e.target.value) || 0)}
                          className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 font-mono text-lg font-bold text-center focus:border-blue-500 outline-none"
                        />
                      </div>
                      <button 
                        onClick={() => handleRemoveItem(idx)}
                        className="p-3 bg-rose-900/20 text-rose-500 hover:bg-rose-900/40 rounded-xl transition-colors mt-4 md:mt-0"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <button 
              onClick={handleSave}
              className="w-full h-16 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-colors shadow-xl shadow-blue-900/20"
            >
              <Save className="w-6 h-6" />
              Confirmar y Guardar Orden
            </button>
          </>
        )}

        {isProcessing && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
            <span className="text-sm font-black uppercase tracking-widest text-white animate-pulse">Analizando Documento...</span>
            <span className="text-[10px] text-slate-400 mt-2 uppercase">Extrayendo ERP y SKUs</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentReceptionPage;
