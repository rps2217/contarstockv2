
import React, { useState, useEffect, useCallback, memo } from 'react';
import { ScanLine, Radio, Zap, Database, Settings, UserCircle, ShieldAlert, Terminal, RefreshCw, FileText } from 'lucide-react';
import { useDashboard } from './hooks/useDashboard';
import { Button, Card } from '../../shared/components/ui';
import { db } from '../../db';
import { getSettings } from '../../services/settings';
import { SoundFX } from '../../services/audio';

const Dashboard: React.FC = () => {
  const { operatorId, isSyncNeeded, handleEnterMartillo, navigate } = useDashboard();
  const [hasConfigError, setHasConfigError] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const config = getSettings().appSheetConfig;
    setHasConfigError(!config?.gasWebAppUrl);
  }, []);

  const handleHardRefresh = useCallback(async () => {
    setIsRefreshing(true);
    SoundFX.play('delete');
    
    try {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }

      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
      }

      sessionStorage.clear();
      setTimeout(() => {
        window.location.href = window.location.pathname + '?v=' + Date.now();
      }, 500);
    } catch (e) {
      window.location.reload();
    }
  }, []);

  return (
    <div className="h-full w-full bg-black overflow-y-auto no-scrollbar pb-32 font-mono">
      
      {/* HEADER DE OPERACIÓN */}
      <header className="px-6 py-10 border-b-4 border-white/5 bg-slate-900/20 sticky top-0 z-50">
        <div className="flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"></div>
              <span className="text-[9px] font-black text-emerald-500 tracking-[0.3em] uppercase">Engine_Pulse_OK</span>
            </div>
            <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase leading-none">
              LOGI<span className="text-blue-500">COUNT</span>
            </h1>
          </div>
          <div className="text-right flex flex-col items-end">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">{operatorId}</span>
              <UserCircle className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-[8px] font-black text-blue-400/60 uppercase tracking-[0.2em]">v5.0_Atomic</div>
          </div>
        </div>
      </header>

      <div className="p-6 max-w-4xl mx-auto space-y-4">
        
        {/* ALERTA DE CONFIGURACIÓN */}
        {hasConfigError && (
          <button 
            onClick={() => navigate('/settings?tab=cloud')}
            className="w-full p-6 bg-rose-900/20 border-4 border-rose-500/30 rounded-[2rem] flex items-center gap-5 animate-pulse"
          >
            <ShieldAlert className="w-8 h-8 text-rose-500" />
            <div className="text-left">
              <div className="text-xs font-black text-rose-500 uppercase tracking-widest">Sistema Incompleto</div>
              <p className="text-[10px] text-rose-400 font-bold uppercase">Falta configurar el vínculo con Google Sheets</p>
            </div>
          </button>
        )}

        {/* ACCIONES PRINCIPALES */}
        <div className="grid grid-cols-1 gap-4">
          <button 
            onClick={() => navigate('/reports?create=true')}
            className="group h-52 bg-blue-600 rounded-[2.5rem] border-b-[12px] border-blue-900 flex flex-col justify-center px-10 relative overflow-hidden active:translate-y-2 active:border-b-[4px] transition-all"
          >
            <div className="absolute -right-8 -bottom-8 opacity-10 group-hover:scale-110 transition-transform">
              <ScanLine className="w-56 h-56 text-white" />
            </div>
            <h2 className="text-5xl font-black text-white uppercase italic tracking-tighter mb-2">Nueva_Carga</h2>
            <p className="text-blue-100 text-[11px] font-black uppercase tracking-[0.4em]">Iniciar Protocolo de Conteo</p>
          </button>

          <div className="grid grid-cols-2 gap-4">
            <Card 
              hoverable
              onClick={() => navigate('/reception')}
              className="h-40 flex flex-col items-center justify-center gap-3 bg-emerald-900/10 border-emerald-500/20 rounded-[2rem]"
            >
              <div className="bg-emerald-500/10 p-4 rounded-2xl border-2 border-emerald-500/20">
                <FileText className="w-8 h-8 text-emerald-500" />
              </div>
              <span className="text-[9px] font-black text-white uppercase tracking-[0.3em]">Recepción</span>
            </Card>

            <Card 
              hoverable
              onClick={() => { handleEnterMartillo(); }}
              className="h-40 flex flex-col items-center justify-center gap-3 bg-blue-900/10 border-blue-500/20 rounded-[2rem]"
            >
              <div className="bg-blue-500/10 p-4 rounded-2xl border-2 border-blue-500/20">
                <Zap className="w-8 h-8 text-blue-500" />
              </div>
              <span className="text-[9px] font-black text-white uppercase tracking-[0.3em]">Modo_Martillo</span>
            </Card>
          </div>
        </div>

        {/* HERRAMIENTAS DE SOPORTE */}
        <div className="grid grid-cols-2 gap-4">
          <Card 
            hoverable
            onClick={() => navigate('/database')}
            className="h-24 flex flex-col items-center justify-center gap-2 bg-white/5 border-white/5 rounded-[1.5rem] opacity-80"
          >
            <Database className="w-5 h-5 text-amber-500" />
            <span className="text-[8px] font-black text-white uppercase tracking-[0.3em]">Catálogo_SKU</span>
          </Card>

          <Button 
            variant={isSyncNeeded ? 'primary' : 'secondary'}
            size="lg"
            className={`h-24 rounded-[1.5rem] ${isSyncNeeded ? 'bg-orange-600 border-orange-800 animate-pulse' : 'bg-white/5 border-white/5 opacity-60'}`}
            onClick={() => navigate('/sync')}
            leftIcon={<Radio className="w-5 h-5" />}
          >
            <span className="text-[9px] font-black uppercase tracking-widest">Sincronizar</span>
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Button 
            variant="secondary"
            size="lg"
            className="h-20 bg-white/5 border-emerald-500/10 rounded-[1.5rem] opacity-60 hover:opacity-100"
            onClick={() => { handleHardRefresh(); }}
            isLoading={isRefreshing}
            leftIcon={<RefreshCw className={`w-5 h-5 text-emerald-500 ${isRefreshing ? 'animate-spin' : ''}`} />}
          >
            <span className="text-[8px] font-black uppercase tracking-widest">Reiniciar_Kernel</span>
          </Button>
          
          <Button 
            variant="ghost"
            className="h-20 border-2 border-white/5 rounded-[1.5rem] opacity-40 hover:opacity-100"
            onClick={() => navigate('/settings')}
            leftIcon={<Settings className="w-4 h-4" />}
          >
            <span className="text-[8px] font-black uppercase tracking-widest">System_Setup</span>
          </Button>
        </div>

      </div>
    </div>
  );
};

export default memo(Dashboard);
