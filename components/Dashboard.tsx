
import React, { useState, useEffect } from 'react';
import { ScanLine, Database, Radio, Activity, Zap, ArrowRight, Settings, Box, Loader2, History, Gauge } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { massiveDb } from '../db.massive';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [isEnteringMartillo, setIsEnteringMartillo] = useState(false);
  
  const stats = useLiveQuery(async () => {
      const today = new Date().setHours(0,0,0,0);
      const scansToday = await db.scans.where('timestamp').above(today).count();
      const pendingSync = await db.scans.where('synced').equals(0).count();
      return { scansToday, pendingSync };
  }, []);

  const isSyncNeeded = (stats?.pendingSync || 0) > 0;

  const handleEnterMartillo = async () => {
    setIsEnteringMartillo(true);
    try {
        const lastScan = await massiveDb.blindScans.orderBy('timestamp').reverse().first();
        const lastManifest = await massiveDb.blindManifests.toCollection().first();
        const activeBatchId = lastScan?.batchId || lastManifest?.batchId || `MARTILLO-${Date.now()}`;
        navigate(`/massive/${activeBatchId}`);
    } catch (e) {
        navigate(`/massive/MARTILLO-${Date.now()}`);
    } finally {
        setIsEnteringMartillo(false);
    }
  };

  const MainButton = ({ onClick, icon: Icon, title, sub, color, border, loading, secondaryAction }: any) => (
    <div className="relative mb-2 group">
        <button 
            onClick={onClick}
            disabled={loading}
            className={`w-full h-32 ${color} text-white flex items-center px-6 gap-6 transition-all active:translate-y-1 border-b-[10px] ${border} overflow-hidden relative disabled:opacity-50 rounded-[2rem]`}
        >
            <div className="bg-black/30 p-5 border-2 border-white/10 shrink-0 rounded-2xl transition-transform group-hover:scale-110">
                {loading ? <Loader2 className="w-10 h-10 animate-spin" /> : <Icon className="w-10 h-10" />}
            </div>
            <div className="text-left flex-1 min-w-0">
                <h2 className="text-2xl font-black uppercase italic leading-none tracking-tighter truncate">{title}</h2>
                <div className="flex items-center gap-2 mt-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-white/40 led-active"></div>
                    <span className="text-[8px] font-bold text-white/50 uppercase tracking-[0.2em] truncate">{sub}</span>
                </div>
            </div>
            <div className="absolute right-0 top-0 h-full w-14 bg-white/5 flex items-center justify-center border-l border-white/5">
                <ArrowRight className="w-5 h-5 opacity-30 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </div>
        </button>
        {secondaryAction && (
            <button 
                onClick={(e) => { e.stopPropagation(); secondaryAction.onClick(); }}
                className="absolute -top-1 -right-1 bg-black border-2 border-white/20 p-2.5 rounded-xl text-white/40 hover:text-white hover:bg-blue-600 transition-all shadow-xl z-20"
                title={secondaryAction.title}
            >
                <secondaryAction.icon className="w-4 h-4" />
            </button>
        )}
    </div>
  );

  return (
    <div className="h-full w-full bg-slate-950 overflow-y-auto no-scrollbar pb-32">
      
      <header className="px-6 py-6 border-b-4 border-white/5 bg-slate-900/40 flex justify-between items-center sticky top-0 z-50 backdrop-blur-md">
          <div className="flex flex-col min-w-0">
              <span className="text-[7px] font-black text-blue-500 tracking-[0.4em] uppercase mb-1">TERMINAL_LOGISTICA_V4.5</span>
              <h1 className="text-2xl font-black text-white italic tracking-tighter uppercase leading-none truncate">PANEL_DE_CONTROL</h1>
          </div>
          
          <div className="flex flex-col items-end shrink-0 gap-2">
              <div className="bg-blue-600/10 border border-blue-500/20 px-3 py-1.5 rounded-xl flex items-center gap-2 shadow-inner">
                  <Gauge className="w-3 h-3 text-blue-400" />
                  <span className="text-[10px] font-black text-white tabular-nums tracking-widest">{stats?.scansToday || 0}</span>
                  <span className="text-[6px] font-black text-blue-400 uppercase opacity-60">Picks</span>
              </div>
              <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full led-active ${isSyncNeeded ? 'bg-amber-500' : 'bg-emerald-500'} border border-black`}></div>
                  <span className="text-[7px] font-black text-white/30 uppercase tracking-widest">{isSyncNeeded ? 'SYNC_REQD' : 'ONLINE'}</span>
              </div>
          </div>
      </header>

      <div className="p-4 max-w-4xl mx-auto space-y-6 pt-6">
        
        <div className="grid grid-cols-1 gap-4">
            <MainButton 
                onClick={() => navigate('/reports')}
                icon={ScanLine}
                title="Nueva_Carga"
                sub="CARGAS_DOCUMENTADAS"
                color="bg-slate-800"
                border="border-slate-950"
            />
            <MainButton 
                onClick={handleEnterMartillo}
                icon={Zap}
                title="Modo_Martillo"
                sub="AUDITORIA_RAPIDA"
                color="bg-blue-600"
                border="border-blue-900"
                loading={isEnteringMartillo}
                secondaryAction={{
                    icon: History,
                    title: "Ver Archivo Martillo",
                    onClick: () => navigate('/reports?type=hammer')
                }}
            />
        </div>

        <div className="grid grid-cols-2 gap-4">
            <button onClick={() => navigate('/database')} className="h-32 bg-slate-900/50 border-4 border-white/5 flex flex-col items-center justify-center gap-3 active:bg-blue-600 transition-all group rounded-[2rem]">
                <div className="p-4 bg-black/20 rounded-2xl border border-white/5 group-active:border-white/20">
                    <Database className="w-7 h-7 text-blue-400 group-active:text-white" />
                </div>
                <span className="text-[8px] font-black uppercase tracking-[0.3em] text-white/60">Catalogo_SKU</span>
            </button>
            <button onClick={() => navigate('/sync')} className={`h-32 border-4 flex flex-col items-center justify-center gap-3 transition-all rounded-[2rem] ${isSyncNeeded ? 'bg-amber-600 border-amber-800' : 'bg-slate-900/50 border-white/5 text-white/30'}`}>
                <div className={`p-4 rounded-2xl border ${isSyncNeeded ? 'bg-white/10 border-white/20' : 'bg-black/20 border-white/5'}`}>
                    <Radio className={`w-7 h-7 ${isSyncNeeded ? 'text-white' : 'text-white/20'}`} />
                </div>
                <span className="text-[8px] font-black uppercase tracking-[0.3em]">{isSyncNeeded ? 'Sincronizar' : 'Cloud_Link'}</span>
            </button>
        </div>

        <button onClick={() => navigate('/settings')} className="w-full h-16 bg-black/40 border-2 border-white/5 text-white/20 flex items-center justify-center gap-3 active:text-white active:bg-white/5 transition-all rounded-2xl">
            <Settings className="w-4 h-4" />
            <span className="text-[8px] font-black uppercase tracking-[0.5em]">CONFIG_DEL_SISTEMA</span>
        </button>
      </div>
    </div>
  );
};

export default Dashboard;
