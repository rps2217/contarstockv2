
import React from 'react';
import { ScanLine, Container, Cloud, Settings, AlertTriangle, CheckCircle2, Zap, ArrowRight, Activity, ShieldAlert, Radio } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  
  const stats = useLiveQuery(async () => {
      const today = new Date().setHours(0,0,0,0);
      const scansToday = await db.scans.where('timestamp').above(today).count();
      const pendingSync = await db.scans.where('synced').equals(0).count();
      return { scansToday, pendingSync };
  }, []);

  const pendingCount = stats?.pendingSync || 0;
  const isSyncNeeded = pendingCount > 0;

  const startMassiveBlind = () => {
      const batchId = `BLIND-${new Date().toISOString().slice(11,19).replace(/:/g,'')}`;
      navigate(`/massive/${batchId}`);
  };

  return (
    <div className="h-full w-full overflow-y-auto no-scrollbar bg-black font-mono select-none">
      
      {/* TACTICAL STATUS BAR (TOP) */}
      <div className="px-6 pt-8 pb-4 flex justify-between items-end border-b border-white/5 bg-black/50 backdrop-blur-xl sticky top-0 z-50">
          <div>
            <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em]">System.Link.Active</span>
            </div>
            <h1 className="text-3xl font-black text-white uppercase tracking-tighter italic">
                LOGI<span className="text-blue-600">COUNT</span>
            </h1>
          </div>
          <div className="text-right">
             <span className="text-[8px] font-black text-white/30 uppercase tracking-widest block">Core Engine</span>
             <span className="text-[10px] font-black text-white bg-white/10 px-2 py-0.5 rounded border border-white/10 uppercase tracking-widest">v3.1-HAMMER</span>
          </div>
      </div>

      <div className="px-5 pt-6 pb-32 space-y-4 max-w-2xl mx-auto">
        
        {/* COMMS BEACON (TRANSMISSION STATUS) */}
        <button 
            onClick={() => navigate('/sync')}
            className={`w-full p-6 rounded-[2.5rem] border-4 flex items-center justify-between transition-all active:scale-[0.97] group ${
                isSyncNeeded 
                ? 'bg-amber-500/10 border-amber-500 text-amber-500' 
                : 'bg-emerald-500/10 border-emerald-500 text-emerald-500'
            }`}
        >
            <div className="flex items-center gap-5">
                <div className={`p-4 rounded-3xl ${isSyncNeeded ? 'bg-amber-500 text-black animate-pulse' : 'bg-emerald-500 text-black'}`}>
                    <Radio className="w-8 h-8 stroke-[3px]" />
                </div>
                <div className="text-left">
                    <div className="text-[10px] font-black uppercase tracking-[0.4em] opacity-60">Status de Enlace</div>
                    <div className="text-3xl font-black tracking-tighter uppercase italic leading-none">
                        {isSyncNeeded ? 'Pendientes' : 'Sincronizado'}
                    </div>
                </div>
            </div>
            {isSyncNeeded && (
                <div className="bg-amber-500/20 px-4 py-2 rounded-2xl border border-amber-500/30 text-xs font-black">
                    {pendingCount} PKT
                </div>
            )}
        </button>

        {/* PERFORMANCE CORE (MAIN METRIC) */}
        <div className="bg-[#0a0a0a] p-8 rounded-[3rem] border-2 border-white/10 flex items-center justify-between overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                <Zap className="w-64 h-64 -mr-20 -mt-20" />
            </div>
            
            <div className="relative z-10">
                <div className="text-[10px] font-black text-white/40 uppercase tracking-[0.5em] mb-2 flex items-center gap-2">
                    <Activity className="w-3 h-3 text-blue-500" /> Rendimiento Turno
                </div>
                <div className="text-8xl font-black text-white tabular-nums tracking-tighter leading-none drop-shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                    {stats?.scansToday || 0}
                </div>
                <div className="mt-2 text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-600/10 px-3 py-1 rounded-full border border-blue-600/20 inline-block">
                    Unidades Procesadas
                </div>
            </div>
        </div>

        {/* PRIMARY TACTICAL ACTIONS */}
        <div className="grid grid-cols-1 gap-4">
            
            {/* INVENTARIO (STANDARD) */}
            <button 
                onClick={() => navigate('/reports')}
                className="w-full h-32 bg-white text-black rounded-[2.5rem] flex items-center justify-between px-8 group transition-all active:scale-[0.98] border-b-[8px] border-slate-300"
            >
                <div className="flex items-center gap-6">
                    <div className="bg-black text-white p-4 rounded-[1.8rem]">
                        <ScanLine className="w-10 h-10 stroke-[2.5px]" />
                    </div>
                    <div className="text-left">
                        <h2 className="text-2xl font-black uppercase tracking-tighter italic leading-none">Nueva Carga</h2>
                        <p className="text-[10px] font-black text-black/40 uppercase tracking-widest mt-1">Modo Auditoría Local</p>
                    </div>
                </div>
                <ArrowRight className="w-8 h-8 text-black/20 group-hover:translate-x-2 transition-transform" />
            </button>

            {/* ESCUDO CIEGO (HIGH-SPEED) */}
            <button 
                onClick={startMassiveBlind}
                className="w-full h-32 bg-indigo-600 text-white rounded-[2.5rem] flex items-center justify-between px-8 group transition-all active:scale-[0.98] border-b-[8px] border-indigo-900 shadow-xl shadow-indigo-900/20"
            >
                <div className="flex items-center gap-6">
                    <div className="bg-black/30 p-4 rounded-[1.8rem] border border-white/20">
                        <ShieldAlert className="w-10 h-10 text-white animate-pulse" />
                    </div>
                    <div className="text-left">
                        <h2 className="text-2xl font-black uppercase tracking-tighter italic leading-none">Escudo Ciego</h2>
                        <p className="text-[10px] font-black text-white/50 uppercase tracking-widest mt-1">Ráfaga Industrial H-Speed</p>
                    </div>
                </div>
                <Zap className="w-8 h-8 text-white fill-current" />
            </button>

            {/* SECONDARY UTILS (VERTICAL FLOW) */}
            <div className="grid grid-cols-1 gap-4">
                <button 
                    onClick={() => navigate('/reception')}
                    className="w-full h-24 bg-[#0f0f0f] border-2 border-white/5 rounded-[2.5rem] flex items-center gap-6 px-8 transition-all active:scale-95"
                >
                    <div className="p-3 rounded-2xl bg-white/5 text-blue-400">
                        <Container className="w-8 h-8" />
                    </div>
                    <div className="text-left">
                        <h2 className="text-lg font-black text-white uppercase tracking-tight italic leading-none">Recepción</h2>
                        <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] mt-1">Entrada de Bultos</p>
                    </div>
                </button>

                <button 
                    onClick={() => navigate('/settings')}
                    className="w-full h-24 bg-[#0f0f0f] border-2 border-white/5 rounded-[2.5rem] flex items-center gap-6 px-8 transition-all active:scale-95"
                >
                    <div className="p-3 rounded-2xl bg-white/5 text-white/40">
                        <Settings className="w-8 h-8" />
                    </div>
                    <div className="text-left">
                        <h2 className="text-lg font-black text-white uppercase tracking-tight italic leading-none">Soporte</h2>
                        <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] mt-1">Configuración Core</p>
                    </div>
                </button>
            </div>

        </div>

      </div>
    </div>
  );
};

export default Dashboard;
