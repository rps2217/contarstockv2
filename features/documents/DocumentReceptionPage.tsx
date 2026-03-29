import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Loader2, X, ChevronLeft, AlertCircle, Camera } from 'lucide-react';
import { useScannerCamera } from './hooks/useScannerCamera';
import { useDocumentProcessor } from './hooks/useDocumentProcessor';
import { ScannerOverlay } from './components/ScannerOverlay';
import { ScannerControls } from './components/ScannerControls';
import { DocumentResults } from './components/DocumentResults';

export const DocumentReceptionPage: React.FC<{ isEmbedded?: boolean }> = ({ isEmbedded = false }) => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'idle' | 'camera' | 'upload'>('idle');
  const [autoShootEnabled, setAutoShootEnabled] = useState(true);

  const {
    isProcessing,
    result,
    error: processorError,
    setError: setProcessorError,
    processDocument,
    handleSave,
    handleItemChange,
    handleRemoveItem,
    clearResults,
    setErpOrder,
    setResult
  } = useDocumentProcessor();

  const {
    videoRef,
    canvasRef,
    countdown,
    error: cameraError,
    startCamera,
    stopCamera,
    capturePhoto,
    startStabilityCheck
  } = useScannerCamera({
    autoShootEnabled,
    onCapture: (base64) => processDocument(base64, 'image/jpeg')
  });

  const handleStartCamera = async () => {
    setMode('camera');
    await startCamera();
  };

  const handleStopCamera = () => {
    stopCamera();
    setMode('idle');
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

  const error = processorError || cameraError;

  return (
    <div className="h-full w-full bg-black overflow-y-auto no-scrollbar pb-32 font-mono text-white">
      {/* HEADER */}
      {!isEmbedded && (
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
      )}

      {isEmbedded && (
        <div className="h-12 px-4 flex items-center justify-between border-b border-white/10 bg-slate-900 shrink-0 z-50">
          <div className="flex flex-col">
            <span className="text-[8px] font-black uppercase tracking-[0.3em] text-white/40 leading-none mb-1">MODO</span>
            <span className="text-xs font-black uppercase tracking-widest text-white italic">Recepción con Guía</span>
          </div>
        </div>
      )}

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
              onClick={handleStartCamera}
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
            
            <ScannerOverlay countdown={countdown} />

            <ScannerControls 
              autoShootEnabled={autoShootEnabled}
              onToggleAutoShoot={() => setAutoShootEnabled(!autoShootEnabled)}
              onStop={handleStopCamera}
              onCapture={capturePhoto}
              onRestartStability={startStabilityCheck}
            />
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />

        <DocumentResults 
          result={result}
          onClear={clearResults}
          onScanMore={handleStartCamera}
          onSave={handleSave}
          onItemChange={handleItemChange}
          onRemoveItem={handleRemoveItem}
          onErpOrderChange={setErpOrder}
        />

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
