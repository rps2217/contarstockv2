
import React from 'react';
import { ScanLine, Container, Cloud, Settings, AlertTriangle, CheckCircle2, Zap, ArrowRight, Activity, ShieldAlert } from 'lucide-react';
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
    <div className="h-full w-full overflow-y-auto no-scrollbar px-5 pt-8 pb-32 bg-slate-50 dark:bg-black font-sans">
      
      {/* HEADER INDUSTRIAL */}
      <header className="mb-10 flex justify-between items-center border-l-8 border-blue-600 pl-4">
          <div>
            <h1 className="text-4xl font-black tracking-tighter text-slate-900 dark:text-white uppercase italic leading-none">
                LogiCount <span className="text-blue-600">Pro</span>
            </h1>
            <div className="flex items-center gap-2 mt-2">
                <span className="bg-slate-900 text-white text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-[0.2em]">Core v3.0</span>
                <span className="bg-blue-100 text-blue-700 text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-[0.2em]">Enterprise Mode</span>
            </div>
          </div>
      </header>

      {/* SEMÁFORO DE TRANSMISIÓN */}
      <div 
        onClick={() => navigate('/sync')}
        className={`mb-8 p-8 rounded-[2.5rem] border-[6px] shadow-2xl relative overflow-hidden transition-all active:scale-[0.97] ${
            isSyncNeeded 
            ? 'bg-amber-400 border-black text-black' 
            : 'bg-emerald-500 border-black text-white'
        }`}
      >
          <div className="absolute top-0 right-0 p-4 opacity-10">
              <Cloud className="w-40 h-40 -mr-10 -mt-10" />
          </div>
          
          <div className="relative z-10 flex justify-between items-end">
              <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.4em] mb-2 opacity-70">Estado de Transmisión</div>
                  <div className="text-5xl font-black leading-none tracking-tighter italic">
                      {isSyncNeeded ? 'PENDIENTES' : 'EN LÍNEA'}
                  </div>
                  {isSyncNeeded && (
                      <div className="mt-4 text-xs font-black bg-black/10 inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-black/10">
                          <Activity className="w-4 h-4 animate-pulse" /> {pendingCount} REGISTROS SIN RESPALDO
                      </div>
                  )}
              </div>
              <div className="bg-black/10 p-5 rounded-3xl border border-black/5">
                  {isSyncNeeded ? <AlertTriangle className="w-10 h-10" /> : <CheckCircle2 className="w-10 h-10" />}
              </div>
          </div>
      </div>

      {/* MÉTRICA DE PRODUCCIÓN MASIVA */}
      <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border-4 border-slate-200 dark:border-white/10 shadow-sm mb-8 flex items-center justify-between group">
          <div>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2">Rendimiento Turno Actual</div>
              <div className="text-7xl font-black text-slate-900 dark:text-white tabular-nums tracking-tighter font-mono">
                  {stats?.scansToday || 0}
              </div>
          </div>
          <div className="text-right">
              <div className="bg-blue-600 text-white p-4 rounded-2xl mb-2 group-active:rotate-12 transition-transform">
                  <Zap className="w-8 h-8 fill-current" />
              </div>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Unidades</div>
          </div>
      </div>

      {/* ACCIONES DE ALTO IMPACTO */}
      <div className="grid grid-cols-1 gap-4">
        <button 
            onClick={() => navigate('/reports')}
            className="w-full bg-slate-900 hover:bg-black text-white p-8 rounded-[2.5rem] flex items-center justify-between group transition-all active:scale-95 shadow-xl"
        >
            <div className="flex items-center gap-6">
                <div className="bg-white/10 p-4 rounded-2xl"><ScanLine className="w-8 h-8 text-blue-400" /></div>
                <div className="text-left">
                    <h2 className="text-xl font-black uppercase tracking-tight italic">Contar Inventario</h2>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-1">Iniciar nueva sesión física</p>
                </div>
            </div>
            <ArrowRight className="w-6 h-6 text-white/30 group-hover:translate-x-2 transition-transform" />
        </button>

        {/* BOTÓN MODO CIEGO (Protocolo Industrial) */}
        <button 
            onClick={startMassiveBlind}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white p-8 rounded-[2.5rem] flex items-center justify-between group transition-all active:scale-95 shadow-xl border-4 border-black"
        >
            <div className="flex items-center gap-6">
                <div className="bg-black/20 p-4 rounded-2xl"><ShieldAlert className="w-8 h-8 text-white" /></div>
                <div className="text-left">
                    <h2 className="text-xl font-black uppercase tracking-tight italic">Escudo Ciego</h2>
                    <p className="text-[9px] font-bold text-white/60 uppercase tracking-[0.3em] mt-1">Ráfaga masiva sin diálogos</p>
                </div>
            </div>
            <Zap className="w-6 h-6 text-white animate-pulse" />
        </button>

        <div className="grid grid-cols-2 gap-4">
            <button 
                onClick={() => navigate('/reception')}
                className="bg-white dark:bg-slate-900 border-4 border-slate-100 dark:border-white/5 p-6 rounded-[2.5rem] flex flex-col gap-4 text-left transition-all active:scale-95 shadow-sm"
            >
                <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 w-fit">
                    <Container className="w-6 h-6 stroke-[3px]" />
                </div>
                <div>
                    <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase">Recepción</h2>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">Bultos ciegos</p>
                </div>
            </button>

            <button 
                onClick={() => navigate('/settings')}
                className="bg-white dark:bg-slate-900 border-4 border-slate-100 dark:border-white/5 p-6 rounded-[2.5rem] flex flex-col gap-4 text-left transition-all active:scale-95 shadow-sm"
            >
                <div className="p-3 rounded-2xl bg-slate-100 dark:bg-white/5 text-slate-600 w-fit">
                    <Settings className="w-6 h-6 stroke-[3px]" />
                </div>
                <div>
                    <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase">Soporte</h2>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">Configuración</p>
                </div>
            </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
