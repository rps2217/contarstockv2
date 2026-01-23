
import React, { useState, useEffect } from 'react';
import { ScanLine, Database, Radio, Activity, Zap, ArrowRight, Settings, Box, Loader2, History } from 'lucide-react';
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
    <div className="relative mb-4 group">
        <button 
            onClick={onClick}
            disabled={loading}
            className={`w-full h-28 ${color} text-white flex items-center px-6 gap-5 transition-all active:translate-y-1 border-b-[10px] ${border} overflow-hidden relative disabled:opacity-50 rounded-xl`}
        >
            <div className="bg-black/30 p-4 border-2 border-white/10 shrink-0">
                {loading ? <Loader2 className="w-8 h-8 animate-spin" /> : <Icon className="w-8 h-8" />}
            </div>
            <div className="text-left flex-1 min-w-0">
                <h2 className="text-xl font-black uppercase italic leading-none tracking-tighter truncate">{title}</h2>
                <div className="flex items-center gap-2 mt-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-white/40 led-active"></div>
                    <span className="text-[7px] font-bold text-white/50 uppercase tracking-[0.2em] truncate">{sub}</span>
                </div>
            </div>
            <div className="absolute right-0 top-0 h-full w-12 bg-white/5 flex items-center justify-center border-l border-white/5">
                <ArrowRight className="w-4 h-4 opacity-30 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </div>
        </button>
        {secondaryAction && (
            <button 
                onClick={(e) => { e.stopPropagation(); secondaryAction.onClick(); }}
                className="absolute -top-2 -right-2 bg-black border-2 border-white/20 p-2 rounded-lg text-white/40 hover:text-white hover:bg-blue-600 transition-all shadow-xl z-20"
                title={secondaryAction.title}
            >
                <secondaryAction.icon className="w-4 h-4" />
            </button>
        )}
    </div>
  );

  return (
    <div className="h-full w-full bg-slate-950 overflow-y-auto no-scrollbar pb-32">
      
      <header className="px-6 py-8 border-b-4 border-white/5 bg-slate-900/40 flex justify-between items-center sticky top-0 z-50 backdrop-blur-md">
          <div className="flex flex-col min-w-0">
              <span className="text-[7px] font-black text-blue-500 tracking-[0.4em] uppercase mb-1">TERMINAL_LOGISTICA_V4.3</span>
              <h1 className="text-2xl font-black text-white italic tracking-tighter uppercase leading-none truncate">PANEL_DE_CONTROL</h1>
          </div>
          <div className="flex flex-col items-end shrink-0">
              <div className={`w-3 h-3 rounded-full mb-1 led-active ${isSyncNeeded ? 'bg-amber-500' : 'bg-emerald-500'} border-2 border-black`}></div>
              <span className="text-[7px] font-black text-white/30 uppercase tracking-widest">{isSyncNeeded ? 'SYNC_REQD' : 'ONLINE'}</span>
          </div>
      </header>

      <div className="p-4 max-w-4xl mx-auto space-y-4">
        
        <div className="bg-slate-900/80 border-4 border-white/5 p-6 flex items-center justify-between relative overflow-hidden group rounded-xl">
            <div className="absolute top-0 right-0 p-8 opacity-5 rotate-12 transition-transform group-hover:scale-110">
                <Box className="w-32 h-32" />
            </div>
            <div className="relative z-10">
                <span className="text-[7px] font-black text-blue-400 uppercase tracking-[0.4em] block mb-2">PRODUCCION_TOTAL</span>
                <div className="text-7xl font-black text-white tabular-nums tracking-tighter leading-none">
                    {stats?.scansToday || 0}
                </div>
            </div>
            <div className="text-right relative z-10">
                <div className="text-[8px] font-black text-white/40 uppercase mb-1">INTEGRIDAD</div>
                <div className="text-emerald-500 font-black text-[9px] uppercase tracking-widest flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 led-active"></div>
                    VERIFICADA
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <button onClick={() => navigate('/database')} className="h-28 bg-slate-900/50 border-4 border-white/5 flex flex-col items-center justify-center gap-3 active:bg-blue-600 transition-all group rounded-xl">
                <Database className="w-6 h-6 text-blue-400 group-active:text-white" />
                <span className="text-[8px] font-black uppercase tracking-[0.3em]">Catalogo_SKU</span>
            </button>
            <button onClick={() => navigate('/sync')} className={`h-28 border-4 flex flex-col items-center justify-center gap-3 transition-all rounded-xl ${isSyncNeeded ? 'bg-amber-600 border-amber-800' : 'bg-slate-900/50 border-white/5 text-white/30'}`}>
                <Radio className={`w-6 h-6 ${isSyncNeeded ? 'text-white' : 'text-white/20'}`} />
                <span className="text-[8px] font-black uppercase tracking-[0.3em]">{isSyncNeeded ? 'Sincronizar' : 'Cloud_Link'}</span>
            </button>
        </div>

        <button onClick={() => navigate('/settings')} className="w-full h-14 bg-black/40 border-2 border-white/5 text-white/20 flex items-center justify-center gap-3 active:text-white active:bg-white/5 transition-all rounded-xl">
            <Settings className="w-4 h-4" />
            <span className="text-[8px] font-black uppercase tracking-[0.5em]">CONFIG_DEL_SISTEMA</span>
        </button>
      </div>
    </div>
  );
};

export default Dashboard;
