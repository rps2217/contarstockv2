import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, FileText, Box, DownloadCloud, Camera, CheckCircle2, AlertCircle, Loader2, Zap, ScanLine } from 'lucide-react';
import ReceptionPage from './ReceptionPage';
import DocumentReceptionPage from '../documents/DocumentReceptionPage';
import { erpService, ErpManifest } from '../../services/erpService';
import { SoundFX } from '../../services/audio';
import { MassiveDbRepository } from '../../repositories/MassiveDbRepository';

type ReceptionMode = 'menu' | 'trays' | 'documents' | 'cloud';

export const ReceptionHub: React.FC = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<ReceptionMode>('menu');
  const [manifestId, setManifestId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadedManifest, setDownloadedManifest] = useState<ErpManifest | null>(null);

  const handleDownload = async () => {
    if (!manifestId.trim()) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const manifest = await erpService.downloadManifest(manifestId);
      setDownloadedManifest(manifest);
      SoundFX.play('success');
      // After success, we switch to trays mode with the downloaded data
      setMode('trays');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al descargar');
      SoundFX.play('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnterMartillo = async () => {
    try {
      const lastScan = await MassiveDbRepository.getLastBlindScan();
      const lastManifest = await MassiveDbRepository.getFirstBlindManifest();
      const activeBatchId = lastScan?.batchId || lastManifest?.batchId || `MARTILLO-${Date.now()}`;
      navigate(`/massive/${activeBatchId}`);
    } catch (e) {
      navigate(`/massive/MARTILLO-${Date.now()}`);
    }
  };

  if (mode === 'trays') {
    return (
      <div className="h-screen w-full flex flex-col bg-black overflow-hidden font-mono text-white">
        <header className="h-16 px-4 flex items-center justify-between border-b border-white/10 bg-slate-900 shrink-0 z-50">
          <button onClick={() => { setMode('menu'); setDownloadedManifest(null); }} className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl active:bg-blue-600 transition-colors">
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          <div className="flex flex-col items-center">
            <span className="text-[8px] font-black uppercase tracking-[0.3em] text-white/40 leading-none mb-1">CONTROL</span>
            <span className="text-xs font-black uppercase tracking-widest text-white italic">Arribo de Bandejas</span>
          </div>
          <div className="w-10"></div>
        </header>
        <div className="flex-1 min-h-0 relative">
          <ReceptionPage 
            isEmbedded 
            initialExpectedCount={downloadedManifest?.expectedTrays}
            initialErp={downloadedManifest?.id}
          />
        </div>
      </div>
    );
  }

  if (mode === 'documents') {
    return (
      <div className="h-screen w-full flex flex-col bg-black overflow-hidden font-mono text-white">
        <header className="h-16 px-4 flex items-center justify-between border-b border-white/10 bg-slate-900 shrink-0 z-50">
          <button onClick={() => setMode('menu')} className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl active:bg-blue-600 transition-colors">
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          <div className="flex flex-col items-center">
            <span className="text-[8px] font-black uppercase tracking-[0.3em] text-white/40 leading-none mb-1">DIGITALIZAR</span>
            <span className="text-xs font-black uppercase tracking-widest text-white italic">Manifiesto OCR</span>
          </div>
          <div className="w-10"></div>
        </header>
        <div className="flex-1 min-h-0 relative">
          <DocumentReceptionPage isEmbedded />
        </div>
      </div>
    );
  }

  if (mode === 'cloud') {
    return (
      <div className="h-screen w-full flex flex-col bg-black overflow-hidden font-mono text-white">
        <header className="h-16 px-4 flex items-center justify-between border-b border-white/10 bg-slate-900 shrink-0 z-50">
          <button onClick={() => setMode('menu')} className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl active:bg-blue-600 transition-colors">
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          <div className="flex flex-col items-center">
            <span className="text-[8px] font-black uppercase tracking-[0.3em] text-white/40 leading-none mb-1">DESCARGAR</span>
            <span className="text-xs font-black uppercase tracking-widest text-white italic">Guía de la Nube</span>
          </div>
          <div className="w-10"></div>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-20 h-20 bg-blue-600/20 rounded-3xl flex items-center justify-center mb-6 border border-blue-500/30">
            {isLoading ? <Loader2 className="w-10 h-10 text-blue-500 animate-spin" /> : <DownloadCloud className="w-10 h-10 text-blue-500" />}
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tighter italic mb-2">Sincronización ERP</h2>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-8 max-w-xs">
            Ingresa el número de guía o manifiesto para descargar el listado esperado.
          </p>
          
          <div className="w-full max-w-xs mb-4">
            <input 
              type="text" 
              value={manifestId}
              onChange={(e) => setManifestId(e.target.value)}
              placeholder="N° DE GUÍA / ERP"
              className={`w-full bg-slate-900 border-2 rounded-2xl px-6 py-4 text-center font-black text-xl tracking-widest outline-none transition-colors ${error ? 'border-rose-500' : 'border-slate-800 focus:border-blue-500'}`}
              disabled={isLoading}
            />
            {error && (
              <p className="text-rose-500 text-[10px] font-black uppercase tracking-widest mt-2">
                {error}
              </p>
            )}
          </div>

          <button 
            onClick={handleDownload}
            disabled={isLoading || !manifestId.trim()}
            className="w-full max-w-xs bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-blue-900/40 transition-all active:scale-95 uppercase tracking-widest text-xs flex items-center justify-center gap-2"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isLoading ? 'Descargando...' : 'Descargar Guía'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col bg-black overflow-hidden font-mono text-white">
      <header className="h-16 px-6 flex items-center border-b border-white/10 bg-slate-900 shrink-0 z-50">
        <button onClick={() => navigate('/dashboard')} className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl active:bg-blue-600 transition-colors">
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>
        <div className="ml-4">
          <h1 className="text-xl font-black uppercase tracking-tighter italic leading-none">INBOUND</h1>
          <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.3em]">Módulo de Recepción</span>
        </div>
      </header>

      <div className="flex-1 p-6 flex flex-col gap-4 overflow-y-auto">
        <div className="bg-blue-600/10 border border-blue-500/20 p-4 rounded-2xl flex items-start gap-3 mb-2">
          <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-[10px] font-bold text-blue-200 uppercase tracking-widest leading-relaxed">
            Selecciona el modo de operación. Cada módulo tiene una responsabilidad única para evitar errores.
          </p>
        </div>

        <button 
          onClick={() => setMode('trays')}
          className="group relative bg-slate-900 border-2 border-slate-800 rounded-[2rem] p-6 flex items-center gap-6 hover:border-blue-500 transition-all text-left active:scale-[0.98]"
        >
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-900/40 shrink-0">
            <Box className="w-8 h-8 text-white" />
          </div>
          <div>
            <span className="block text-lg font-black uppercase tracking-tighter italic text-white">Control de Arribo</span>
            <span className="text-[9px] text-slate-500 uppercase font-black tracking-widest mt-1 block">Conteo de Bandejas / Bultos (Gatekeeper)</span>
          </div>
          <CheckCircle2 className="absolute top-6 right-6 w-5 h-5 text-blue-500 opacity-20 group-hover:opacity-100 transition-opacity" />
        </button>

        <button 
          onClick={() => setMode('documents')}
          className="group relative bg-slate-900 border-2 border-slate-800 rounded-[2rem] p-6 flex items-center gap-6 hover:border-emerald-500 transition-all text-left active:scale-[0.98]"
        >
          <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-900/40 shrink-0">
            <Camera className="w-8 h-8 text-white" />
          </div>
          <div>
            <span className="block text-lg font-black uppercase tracking-tighter italic text-white">Digitalizar Manifiesto</span>
            <span className="text-[9px] text-slate-500 uppercase font-black tracking-widest mt-1 block">OCR / Captura de Guías Físicas</span>
          </div>
          <FileText className="absolute top-6 right-6 w-5 h-5 text-emerald-500 opacity-20 group-hover:opacity-100 transition-opacity" />
        </button>

        <button 
          onClick={() => setMode('cloud')}
          className="group relative bg-slate-900 border-2 border-slate-800 rounded-[2rem] p-6 flex items-center gap-6 hover:border-amber-500 transition-all text-left active:scale-[0.98]"
        >
          <div className="w-16 h-16 bg-amber-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-900/40 shrink-0">
            <DownloadCloud className="w-8 h-8 text-white" />
          </div>
          <div>
            <span className="block text-lg font-black uppercase tracking-tighter italic text-white">Descargar de la Nube</span>
            <span className="text-[9px] text-slate-500 uppercase font-black tracking-widest mt-1 block">Sincronizar listado esperado del ERP</span>
          </div>
          <DownloadCloud className="absolute top-6 right-6 w-5 h-5 text-amber-500 opacity-20 group-hover:opacity-100 transition-opacity" />
        </button>

        <div className="h-px bg-white/5 my-2"></div>

        <button 
          onClick={() => navigate('/reports?create=true')}
          className="group relative bg-blue-900/20 border-2 border-blue-500/20 rounded-[2rem] p-6 flex items-center gap-6 hover:border-blue-500 transition-all text-left active:scale-[0.98]"
        >
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-900/40 shrink-0">
            <ScanLine className="w-8 h-8 text-white" />
          </div>
          <div>
            <span className="block text-lg font-black uppercase tracking-tighter italic text-white">Nueva Carga</span>
            <span className="text-[9px] text-blue-400 uppercase font-black tracking-widest mt-1 block">Conteo de Inventario Individual</span>
          </div>
          <ScanLine className="absolute top-6 right-6 w-5 h-5 text-blue-500 opacity-20 group-hover:opacity-100 transition-opacity" />
        </button>

        <button 
          onClick={handleEnterMartillo}
          className="group relative bg-slate-900 border-2 border-slate-800 rounded-[2rem] p-6 flex items-center gap-6 hover:border-blue-400 transition-all text-left active:scale-[0.98]"
        >
          <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center shadow-lg shrink-0">
            <Zap className="w-8 h-8 text-blue-400" />
          </div>
          <div>
            <span className="block text-lg font-black uppercase tracking-tighter italic text-white">Modo Martillo</span>
            <span className="text-[9px] text-slate-500 uppercase font-black tracking-widest mt-1 block">Escaneo Masivo / Alta Velocidad</span>
          </div>
          <Zap className="absolute top-6 right-6 w-5 h-5 text-blue-400 opacity-20 group-hover:opacity-100 transition-opacity" />
        </button>

        <div className="mt-auto pt-8 border-t border-white/5">
          <div className="flex items-center gap-2 text-slate-600 mb-4">
            <div className="w-1 h-1 bg-slate-600 rounded-full"></div>
            <span className="text-[9px] font-black uppercase tracking-widest">¿Necesitas revisar reportes?</span>
          </div>
          <button 
            onClick={() => navigate('/reports')}
            className="w-full bg-slate-800 text-slate-400 font-black py-4 rounded-2xl uppercase tracking-widest text-[10px] hover:text-white transition-colors"
          >
            Ver Historial de Reportes
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReceptionHub;
