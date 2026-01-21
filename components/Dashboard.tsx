
import React from 'react';
import { ScanLine, Container, Settings, Zap, ArrowRight, Activity, ShieldAlert, Radio, Database, History } from 'lucide-react';
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

  return (
    <div className="h-full w-full bg-black font-mono select-none overflow-x-hidden">
      
      {/* MINIMAL STATUS HEADER */}
      <div className="px-6 py-6 border-b-4 border-white/10 flex justify-between items-center bg-[#0a0a0a]">
          <div className="flex flex-col">
              <span className="text-[10px] font-black text-blue-500 tracking-[0.4em] uppercase leading-none mb-1">LogiCount.Core</span>
              <h1 className="text-2xl font-black text-white italic tracking-tighter uppercase">Terminal_01</h1>
          </div>
          <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${isSyncNeeded ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></div>
              <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">{isSyncNeeded ? 'Sync_Req' : 'Online'}</span>
          </div>
      </div>

      <div className="p-4 space-y-3 max-w-2xl mx-auto">
        
        {/* CRITICAL METRIC BLOCK */}
        <div className="bg-[#111] border-4 border-white/5 p-6 rounded-none flex items-center justify-between">
            <div>
                <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] block mb-2">Total_Shift_Units</span>
                <div className="text-7xl font-black text-white tabular-nums tracking-tighter leading-none">
                    {stats?.scansToday || 0}
                </div>
            </div>
            <Activity className="w-12 h-12 text-blue-600 opacity-20" />
        </div>

        {/* ACTIONS: HIGH CONTRAST BOXES */}
        <div className="grid grid-cols-1 gap-3">
            
            {/* INVENTARIO RAPIDO */}
            <button 
                onClick={() => navigate('/reports')}
                className="w-full h-28 bg-white text-black rounded-none flex items-center px-6 gap-6 active:bg-blue-500 active:text-white transition-colors border-b-8 border-slate-300"
            >
                <div className="bg-black text-white p-3">
                    <ScanLine className="w-10 h-10" />
                </div>
                <div className="text-left flex-1">
                    <h2 className="text-2xl font-black uppercase italic leading-none">Nueva_Carga</h2>
                    <span className="text-[10px] font-black opacity-40 uppercase tracking-widest mt-1 block">Standard_Audit_v3</span>
                </div>
                <ArrowRight className="w-6 h-6 opacity-20" />
            </button>

            {/* MODO MARTILLO (BURST) */}
            <button 
                onClick={() => navigate(`/massive/BURST-${Date.now()}`)}
                className="w-full h-28 bg-blue-600 text-white rounded-none flex items-center px-6 gap-6 active:bg-white active:text-blue-600 transition-colors border-b-8 border-blue-900"
            >
                <div className="bg-black/40 p-3 border border-white/20">
                    <Zap className="w-10 h-10 fill-current" />
                </div>
                <div className="text-left flex-1">
                    <h2 className="text-2xl font-black uppercase italic leading-none">Modo_Martillo</h2>
                    <span className="text-[10px] font-black text-white/50 uppercase tracking-widest mt-1 block">High_Speed_Blind_Scan</span>
                </div>
                <ShieldAlert className="w-6 h-6 animate-pulse" />
            </button>

            {/* UTILS GRID - NO GRASA */}
            <div className="grid grid-cols-2 gap-3">
                <button 
                    onClick={() => navigate('/database')}
                    className="h-24 bg-[#111] border-2 border-white/10 flex flex-col items-center justify-center gap-2 active:bg-white active:text-black"
                >
                    <Database className="w-6 h-6" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Catálogo</span>
                </button>
                <button 
                    onClick={() => navigate('/sync')}
                    className={`h-24 border-2 flex flex-col items-center justify-center gap-2 transition-colors ${isSyncNeeded ? 'bg-amber-500/10 border-amber-500 text-amber-500 animate-pulse' : 'bg-[#111] border-white/10 text-white/40'}`}
                >
                    <Radio className="w-6 h-6" />
                    <span className="text-[10px] font-black uppercase tracking-widest">{isSyncNeeded ? 'Sincronizar' : 'Cloud_OK'}</span>
                </button>
            </div>

            <button 
                onClick={() => navigate('/settings')}
                className="w-full h-16 bg-[#0a0a0a] border-2 border-white/5 text-white/30 flex items-center justify-center gap-3 active:text-white"
            >
                <Settings className="w-4 h-4" />
                <span className="text-[9px] font-black uppercase tracking-[0.4em]">Configuración_Sistema</span>
            </button>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
