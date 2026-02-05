
import React from 'react';
import { ScanLine, Radio, Zap, History, Database, Settings, Gauge, UserCircle, Target, Award, ShieldAlert } from 'lucide-react';
import { useDashboard } from '../hooks/useDashboard';
import { IndustrialButton } from './common/IndustrialButton';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';

const Dashboard: React.FC = () => {
  const { stats, operatorId, isSyncNeeded, handleEnterMartillo, navigate } = useDashboard();

  // Métricas avanzadas para el nuevo Dashboard
  const metrics = useLiveQuery(async () => {
      const allSessions = await db.sessions.toArray();
      const totalUnits = allSessions.reduce((acc, s) => acc + (s.totalUnits || 0), 0);
      const verifiedCount = allSessions.filter(s => s.auditStatus === 'verified').length;
      const accuracy = allSessions.length > 0 ? (verifiedCount / allSessions.length) * 100 : 100;
      return { totalUnits, accuracy, sessions: allSessions.length };
  }, []);

  const StatPill = ({ icon: Icon, value, label, color }: any) => (
      <div className="bg-slate-900/60 border border-white/5 p-4 rounded-3xl flex flex-col items-center justify-center text-center">
          <Icon className={`w-5 h-5 mb-2 ${color}`} />
          <span className="text-xl font-black text-white leading-none">{value}</span>
          <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest mt-1">{label}</span>
      </div>
  );

  return (
    <div className="h-full w-full bg-black overflow-y-auto no-scrollbar pb-32 font-mono">
      
      {/* HEADER DE ALTO IMPACTO */}
      <header className="px-6 py-8 border-b-4 border-white/5 bg-slate-900/20 sticky top-0 z-50 backdrop-blur-xl">
          <div className="flex justify-between items-start">
              <div>
                  <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]"></div>
                      <span className="text-[9px] font-black text-emerald-500 tracking-[0.3em] uppercase">Terminal_Active</span>
                  </div>
                  <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase leading-none">
                      CORE<span className="text-blue-500">_OPS</span>
                  </h1>
              </div>
              <div className="text-right">
                  <div className="flex items-center gap-2 justify-end mb-1">
                      <span className="text-[10px] font-black text-white/40 uppercase">{operatorId}</span>
                      <UserCircle className="w-4 h-4 text-blue-500" />
                  </div>
                  <div className="text-[10px] font-black text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-lg border border-blue-500/20">V4.5_ENTERPRISE</div>
              </div>
          </div>
      </header>

      <div className="p-5 max-w-4xl mx-auto space-y-6">
        
        {/* WIDGET DE RENDIMIENTO */}
        <div className="grid grid-cols-3 gap-3">
            <StatPill icon={Target} value={metrics?.totalUnits || 0} label="Unidades" color="text-blue-400" />
            <StatPill icon={Award} value={`${metrics?.accuracy.toFixed(0)}%`} label="Precisión" color="text-emerald-400" />
            <StatPill icon={Gauge} value={stats.scansToday || 0} label="Picks_Hoy" color="text-amber-400" />
        </div>

        {/* ACCIONES PRINCIPALES - Diseño "Heavy Duty" */}
        <div className="grid grid-cols-1 gap-4">
            <button 
                onClick={() => navigate('/reports?create=true')}
                className="group h-40 bg-blue-600 rounded-[2.5rem] border-b-[12px] border-blue-900 flex items-center px-8 gap-8 transition-all active:translate-y-2 active:border-b-[4px] relative overflow-hidden"
            >
                <div className="absolute top-0 right-0 p-8 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10 group-hover:scale-150 transition-transform"></div>
                <div className="bg-black/20 p-6 rounded-[2rem] border-2 border-white/20 shadow-2xl">
                    <ScanLine className="w-12 h-12 text-white" />
                </div>
                <div className="text-left relative z-10">
                    <h2 className="text-3xl font-black text-white uppercase italic leading-none tracking-tighter">Nueva_Carga</h2>
                    <p className="text-blue-100 text-[10px] font-bold uppercase tracking-widest mt-2 flex items-center gap-2">
                        <Zap className="w-3 h-3 fill-current" /> Iniciar Protocolo de Conteo
                    </p>
                </div>
            </button>

            <div className="grid grid-cols-2 gap-4">
                <button 
                    onClick={handleEnterMartillo}
                    className="h-44 bg-slate-900 rounded-[2.5rem] border-b-[10px] border-black flex flex-col items-center justify-center gap-4 transition-all active:translate-y-2 active:border-b-[2px] group"
                >
                    <div className="bg-blue-500/10 p-5 rounded-3xl border-2 border-blue-500/20 group-hover:bg-blue-600 group-hover:text-white transition-all">
                        <Zap className="w-8 h-8 text-blue-500 group-hover:text-white" />
                    </div>
                    <span className="text-[10px] font-black text-white uppercase tracking-[0.3em]">Modo_Martillo</span>
                </button>

                <button 
                    onClick={() => navigate('/database')}
                    className="h-44 bg-slate-900 rounded-[2.5rem] border-b-[10px] border-black flex flex-col items-center justify-center gap-4 transition-all active:translate-y-2 active:border-b-[2px] group"
                >
                    <div className="bg-amber-500/10 p-5 rounded-3xl border-2 border-amber-500/20 group-hover:bg-amber-500 group-hover:text-black transition-all">
                        <Database className="w-8 h-8 text-amber-500 group-hover:text-black" />
                    </div>
                    <span className="text-[10px] font-black text-white uppercase tracking-[0.3em]">Catálogo_SKU</span>
                </button>
            </div>
        </div>

        {/* SECCIÓN SECUNDARIA */}
        <div className="grid grid-cols-2 gap-4">
             <button onClick={() => navigate('/sync')} className={`h-24 rounded-3xl border-4 flex items-center justify-center gap-4 transition-all ${isSyncNeeded ? 'bg-orange-600 border-orange-800 animate-pulse' : 'bg-slate-900/40 border-white/5 opacity-40'}`}>
                <Radio className="w-6 h-6 text-white" />
                <span className="text-[10px] font-black uppercase tracking-widest text-white">Sincronizar</span>
            </button>
            <button onClick={() => navigate('/reports')} className="h-24 bg-slate-900/40 border-4 border-white/5 rounded-3xl flex items-center justify-center gap-4 opacity-40 hover:opacity-100 transition-all">
                <History className="w-6 h-6 text-white" />
                <span className="text-[10px] font-black uppercase tracking-widest text-white">Historial</span>
            </button>
        </div>

        <IndustrialButton 
            variant="black" 
            onClick={() => navigate('/settings')} 
            icon={Settings}
            className="border-white/5 text-white/20 hover:text-white"
        >
            SYSTEM_RESOURCES
        </IndustrialButton>

      </div>
    </div>
  );
};

export default Dashboard;
