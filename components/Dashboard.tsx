
import React, { useState, useEffect } from 'react';
import { ScanLine, Radio, Zap, History, Database, Settings, UserCircle, Activity, Gauge } from 'lucide-react';
import { useDashboard } from '../hooks/useDashboard';
import { IndustrialButton } from './common/IndustrialButton';
import { db } from '../db';

const Dashboard: React.FC = () => {
  const { stats, operatorId, isSyncNeeded, handleEnterMartillo, navigate } = useDashboard();
  const [ipm, setIpm] = useState(0);

  // Lógica de cálculo de IPM (Items Per Minute) en tiempo real
  useEffect(() => {
    const calcIpm = async () => {
        const fiveMinsAgo = Date.now() - (5 * 60 * 1000);
        const recentScans = await db.scans.where('timestamp').above(fiveMinsAgo).toArray();
        const total = recentScans.reduce((acc, s) => acc + s.quantity, 0);
        setIpm(Math.round(total / 5));
    };
    calcIpm();
    const timer = setInterval(calcIpm, 30000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="h-full w-full bg-black overflow-y-auto no-scrollbar pb-32 font-mono">
      
      {/* HEADER DE OPERACIÓN */}
      <header className="px-6 py-10 border-b-4 border-white/5 bg-slate-900/20 sticky top-0 z-50 backdrop-blur-xl">
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
                  <div className="text-[8px] font-black text-blue-400/60 uppercase tracking-[0.2em]">v4.5_Enterprise</div>
              </div>
          </div>
      </header>

      <div className="p-6 max-w-4xl mx-auto space-y-4">
        
        {/* WIDGET DE PULSO (MÉTRICAS VIVAS) */}
        <div className="bg-slate-900/40 border-2 border-white/5 rounded-[2.5rem] p-6 flex items-center justify-between shadow-2xl">
            <div className="flex items-center gap-5">
                <div className={`p-4 rounded-2xl bg-black/60 border-2 ${ipm > 10 ? 'border-emerald-500/30' : 'border-white/5'}`}>
                    <Activity className={`w-8 h-8 ${ipm > 10 ? 'text-emerald-500 animate-pulse' : 'text-slate-600'}`} />
                </div>
                <div>
                    <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Rendimiento Actual</div>
                    <div className="text-3xl font-black text-white tabular-nums">{ipm} <span className="text-xs text-slate-500">IPM</span></div>
                </div>
            </div>
            <div className="text-right">
                <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Picks Hoy</div>
                <div className="text-3xl font-black text-blue-500 tabular-nums">{stats?.scansToday || 0}</div>
            </div>
        </div>

        {/* ACCIONES PRINCIPALES */}
        <div className="grid grid-cols-1 gap-4">
            <button 
                onClick={() => navigate('/reports?create=true')}
                className="group h-44 bg-blue-600 rounded-[2.5rem] border-b-[12px] border-blue-900 flex flex-col justify-center px-10 relative overflow-hidden active:translate-y-2 active:border-b-[4px] transition-all"
            >
                <div className="absolute -right-8 -bottom-8 opacity-10 group-hover:scale-110 transition-transform">
                    <ScanLine className="w-48 h-48 text-white" />
                </div>
                <h2 className="text-4xl font-black text-white uppercase italic tracking-tighter mb-2">Nueva_Carga</h2>
                <p className="text-blue-100 text-[10px] font-bold uppercase tracking-[0.3em]">Iniciar Protocolo de Conteo</p>
            </button>

            <div className="grid grid-cols-2 gap-4">
                <button 
                    onClick={handleEnterMartillo}
                    className="h-44 bg-slate-900 rounded-[2.5rem] border-b-[10px] border-black flex flex-col items-center justify-center gap-4 transition-all active:translate-y-2 active:border-b-[2px] border-2 border-white/5"
                >
                    <div className="bg-blue-500/10 p-5 rounded-3xl border-2 border-blue-500/20">
                        <Zap className="w-10 h-10 text-blue-500" />
                    </div>
                    <span className="text-[10px] font-black text-white uppercase tracking-[0.3em]">Modo_Martillo</span>
                </button>

                <button 
                    onClick={() => navigate('/database')}
                    className="h-44 bg-slate-900 rounded-[2.5rem] border-b-[10px] border-black flex flex-col items-center justify-center gap-4 transition-all active:translate-y-2 active:border-b-[2px] border-2 border-white/5"
                >
                    <div className="bg-amber-500/10 p-5 rounded-3xl border-2 border-amber-500/20">
                        <Database className="w-10 h-10 text-amber-500" />
                    </div>
                    <span className="text-[10px] font-black text-white uppercase tracking-[0.3em]">Catálogo_SKU</span>
                </button>
            </div>
        </div>

        {/* HERRAMIENTAS DE SOPORTE */}
        <div className="grid grid-cols-2 gap-4">
             <button 
                onClick={() => navigate('/sync')} 
                className={`h-28 rounded-[2rem] border-4 flex flex-col items-center justify-center gap-2 transition-all ${isSyncNeeded ? 'bg-orange-600 border-orange-800 animate-pulse' : 'bg-slate-900 border-white/5 opacity-60'}`}
             >
                <Radio className="w-6 h-6 text-white" />
                <span className="text-[9px] font-black uppercase tracking-widest text-white">Sincronizar</span>
            </button>
            <button 
                onClick={() => navigate('/reports')} 
                className="h-28 bg-slate-900 border-4 border-white/5 rounded-[2rem] flex flex-col items-center justify-center gap-2 opacity-60 hover:opacity-100 transition-all"
            >
                <History className="w-6 h-6 text-white" />
                <span className="text-[9px] font-black uppercase tracking-widest text-white">Historial</span>
            </button>
        </div>

        <div className="pt-4">
            <IndustrialButton 
                variant="black" 
                onClick={() => navigate('/settings')} 
                icon={Settings}
                fullWidth
                className="border-white/5 text-white/40 h-20 rounded-[2rem]"
            >
                SYSTEM_SETTINGS
            </IndustrialButton>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
