
import React from 'react';
import { ScanLine, Container, Database, Radio, Activity, Zap, ShieldAlert, ArrowRight, Settings } from 'lucide-react';
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

  const isSyncNeeded = (stats?.pendingSync || 0) > 0;

  const MainButton = ({ onClick, icon: Icon, title, sub, color, border }: any) => (
    <button 
        onClick={onClick}
        className={`w-full h-32 ${color} text-white flex items-center px-8 gap-8 transition-all active:translate-y-1 border-b-[12px] ${border} mb-4 group`}
    >
        <div className="bg-black/20 p-4 border-2 border-white/20 group-active:scale-90 transition-transform">
            <Icon className="w-10 h-10" />
        </div>
        <div className="text-left flex-1">
            <h2 className="text-2xl font-black uppercase italic leading-none tracking-tighter">{title}</h2>
            <span className="text-[10px] font-black text-white/50 uppercase tracking-[0.3em] mt-2 block">{sub}</span>
        </div>
        <ArrowRight className="w-6 h-6 opacity-20 group-hover:opacity-100 group-hover:translate-x-2 transition-all" />
    </button>
  );

  return (
    <div className="h-full w-full bg-slate-950 overflow-y-auto no-scrollbar pb-32">
      
      <div className="px-8 py-10 border-b-4 border-white/5 bg-slate-900/50 flex justify-between items-end">
          <div className="flex flex-col">
              <span className="text-[10px] font-black text-blue-500 tracking-[0.5em] uppercase mb-2">Operational_Terminal</span>
              <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase leading-none">Main_Core</h1>
          </div>
          <div className="flex flex-col items-end">
              <div className={`w-3 h-3 rounded-full mb-2 ${isSyncNeeded ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></div>
              <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">{isSyncNeeded ? 'Sync_Pending' : 'System_Ready'}</span>
          </div>
      </div>

      <div className="p-6 max-w-4xl mx-auto">
        
        <div className="bg-slate-900 border-4 border-white/5 p-8 flex items-center justify-between mb-8 relative overflow-hidden">
            <div className="absolute right-0 top-0 p-10 opacity-5 rotate-12">
                <Activity className="w-48 h-48 text-white" />
            </div>
            <div className="relative z-10">
                <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.4em] block mb-2">Shift_Performance</span>
                <div className="text-8xl font-black text-white tabular-nums tracking-tighter leading-none">
                    {stats?.scansToday || 0}
                </div>
            </div>
            <div className="text-right relative z-10">
                <div className="text-xs font-black text-white/40 uppercase mb-1">Status_OK</div>
                <div className="text-blue-500 font-black text-xs uppercase tracking-widest">Active_Session</div>
            </div>
        </div>

        <MainButton 
            onClick={() => navigate('/reports')}
            icon={ScanLine}
            title="Nueva_Carga"
            sub="Standard_Audit_Protocol"
            color="bg-slate-800"
            border="border-slate-900"
        />

        <MainButton 
            onClick={() => navigate(`/massive/MARTILLO-${Date.now()}`)}
            icon={Zap}
            title="Modo_Martillo"
            sub="Industrial_Burst_Scanner"
            color="bg-blue-600"
            border="border-blue-900"
        />

        <div className="grid grid-cols-2 gap-4">
            <button 
                onClick={() => navigate('/database')}
                className="h-28 bg-slate-900 border-4 border-white/5 flex flex-col items-center justify-center gap-3 active:bg-white active:text-black transition-colors"
            >
                <Database className="w-7 h-7" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em]">Catálogo</span>
            </button>
            <button 
                onClick={() => navigate('/sync')}
                className={`h-28 border-4 flex flex-col items-center justify-center gap-3 transition-all ${isSyncNeeded ? 'bg-amber-600 border-amber-800 animate-pulse' : 'bg-slate-900 border-white/5 text-white/40'}`}
            >
                <Radio className="w-7 h-7" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em]">{isSyncNeeded ? 'Sincronizar' : 'Cloud_Link'}</span>
            </button>
        </div>

        <button 
            onClick={() => navigate('/settings')}
            className="w-full h-16 mt-4 bg-black/40 border-2 border-white/5 text-white/30 flex items-center justify-center gap-3 active:text-white transition-colors"
        >
            <Settings className="w-4 h-4" />
            <span className="text-[9px] font-black uppercase tracking-[0.5em]">SYSTEM_CONFIG_v4.0</span>
        </button>
      </div>
    </div>
  );
};

export default Dashboard;
