
import React, { useMemo } from 'react';
import { Database, ScanLine, Settings, ArrowRight, Box, Layers, Fingerprint, Container, Calendar, PackageCheck, WifiOff, Cloud } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { getSettings } from '../services/settings';

interface DashboardProps {
  onNavigate: (view: any) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  // Read settings
  const settings = useMemo(() => getSettings(), []);

  // --- REAL-TIME STATS LOGIC ---
  const todayStart = useMemo(() => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      return date.getTime();
  }, []);

  const dailyStats = useLiveQuery(async () => {
      // If disabled, skip query to save resources
      if (!settings.controlTowerEnabled) return { bultos: 0, units: 0, pendingSync: 0 };

      const todaySessions = await db.sessions
          .where('createdAt')
          .aboveOrEqual(todayStart)
          .toArray();

      const bultos = todaySessions.length;
      const units = todaySessions.reduce((acc, s) => acc + (s.totalUnits || 0), 0);
      
      const pendingSync = await db.scans.where('synced').equals(0).count();

      return { bultos, units, pendingSync };
  }, [settings.controlTowerEnabled], { bultos: 0, units: 0, pendingSync: 0 });

  return (
    <div className="w-full max-w-7xl mx-auto pb-24 px-4 md:px-8 animate-in fade-in duration-500">
      
      {/* Welcome Section */}
      <div className="pt-8 mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3 text-slate-900">
          <div className="bg-slate-900 text-white p-2 rounded-xl">
             <Box className="w-6 h-6" />
          </div>
          Centro de Operaciones
        </h1>
        <p className="text-lg text-slate-500">
          Resumen operativo del día.
        </p>
      </div>

      {/* --- CONTROL TOWER WIDGETS (CONDITIONAL) --- */}
      {settings.controlTowerEnabled && (
        <div className="grid grid-cols-3 gap-4 mb-8 animate-in slide-in-from-top-4">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center justify-center text-center hover:border-blue-200 transition-colors">
                <div className="text-slate-400 mb-2"><Calendar className="w-6 h-6" /></div>
                <div className="text-3xl font-black text-slate-900">{dailyStats.bultos}</div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mt-1">Bultos Hoy</div>
            </div>
            
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center justify-center text-center hover:border-blue-200 transition-colors">
                <div className="text-blue-500 mb-2"><PackageCheck className="w-6 h-6" /></div>
                <div className="text-3xl font-black text-blue-600">{dailyStats.units}</div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mt-1">Unidades</div>
            </div>

            <div className={`p-5 rounded-2xl shadow-sm border flex flex-col items-center justify-center text-center transition-colors ${dailyStats.pendingSync > 0 ? 'bg-orange-50 border-orange-200' : 'bg-emerald-50 border-emerald-200'}`}>
                <div className={dailyStats.pendingSync > 0 ? 'text-orange-500 mb-2' : 'text-emerald-500 mb-2'}><WifiOff className="w-6 h-6" /></div>
                <div className={`text-3xl font-black ${dailyStats.pendingSync > 0 ? 'text-orange-600' : 'text-emerald-600'}`}>{dailyStats.pendingSync}</div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mt-1">Pendientes</div>
            </div>
        </div>
      )}

      {/* MAIN ACTIONS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
        
        {/* TARJETA 1: CONTEOS (Main Action - Spans 2 Cols on Large) */}
        <button 
            onClick={() => onNavigate('reports')}
            className="col-span-1 md:col-span-2 group relative overflow-hidden bg-gradient-to-br from-blue-600 to-blue-700 rounded-[2rem] shadow-xl shadow-blue-200 p-8 text-left transition-all hover:scale-[1.01] flex flex-col justify-between h-56 lg:h-64"
        >
            <div className="absolute top-0 right-0 p-32 bg-white rounded-full blur-3xl -mr-16 -mt-16 opacity-10 group-hover:opacity-20 transition-opacity"></div>
            
            <div className="flex justify-between items-start z-10">
                <div className="bg-white/20 backdrop-blur-md w-14 h-14 rounded-2xl flex items-center justify-center text-white mb-4 border border-white/10">
                    <ScanLine className="w-7 h-7" />
                </div>
                <div className="bg-white/20 backdrop-blur-md rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0 duration-300">
                    <ArrowRight className="w-5 h-5 text-white" />
                </div>
            </div>

            <div className="z-10 text-white">
                <h2 className="text-3xl font-bold mb-2">Conteos</h2>
                <p className="font-medium text-blue-100 text-sm leading-relaxed opacity-90 max-w-xs">
                    Gestión de inventario y sesiones activas.
                </p>
            </div>
        </button>

        {/* TARJETA 2: CHECK-IN */}
        <button 
            onClick={() => onNavigate('reception')}
            className="group relative overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 rounded-[2rem] shadow-xl shadow-slate-300 p-8 text-left transition-all hover:scale-[1.01] flex flex-col justify-between h-56 lg:h-64"
        >
            <div className="absolute top-0 right-0 p-32 bg-white rounded-full blur-3xl -mr-16 -mt-16 opacity-5 group-hover:opacity-10 transition-opacity"></div>
            
            <div className="flex justify-between items-start z-10">
                <div className="bg-white/10 backdrop-blur-md w-14 h-14 rounded-2xl flex items-center justify-center text-white mb-4 border border-white/10">
                    <Container className="w-7 h-7" />
                </div>
            </div>

            <div className="z-10 text-white">
                <h2 className="text-2xl font-bold mb-1">Check-in</h2>
                <p className="font-medium text-slate-400 text-xs">Recepción Ciega Rápida</p>
            </div>
        </button>

        {/* TARJETA 3: NUBE */}
        <button 
            onClick={() => onNavigate('sync')}
            className="group relative overflow-hidden bg-gradient-to-br from-indigo-500 to-violet-600 rounded-[2rem] shadow-xl shadow-indigo-200 p-6 text-left transition-all hover:scale-[1.01] flex flex-col justify-between h-56 lg:h-64"
        >
            <div className="absolute top-0 right-0 p-24 bg-white rounded-full blur-3xl -mr-12 -mt-12 opacity-10 group-hover:opacity-20 transition-opacity"></div>
            <div className="bg-white/20 backdrop-blur-md w-12 h-12 rounded-2xl flex items-center justify-center text-white border border-white/10 shrink-0 z-10 mb-4">
                <Cloud className="w-6 h-6" />
            </div>
            <div className="z-10">
                <h2 className="text-xl font-bold text-white mb-1">Gestor Nube</h2>
                <p className="font-medium text-indigo-100 text-xs opacity-90">Sincronización</p>
            </div>
        </button>

        {/* TARJETA 4: CONSOLIDADOS */}
        <button 
            onClick={() => onNavigate('consolidated')}
            className="group relative overflow-hidden bg-gradient-to-br from-purple-600 to-fuchsia-700 rounded-[2rem] shadow-xl shadow-purple-200 p-6 text-left transition-all hover:scale-[1.01] flex flex-col justify-between h-48 lg:h-auto"
        >
            <div className="absolute top-0 right-0 p-24 bg-white rounded-full blur-3xl -mr-12 -mt-12 opacity-10 group-hover:opacity-20 transition-opacity"></div>
            <div className="bg-white/20 backdrop-blur-md w-12 h-12 rounded-2xl flex items-center justify-center text-white border border-white/10 shrink-0 z-10 mb-4">
                <Layers className="w-6 h-6" />
            </div>
            <div className="z-10">
                <h2 className="text-xl font-bold text-white mb-1">Consolidados</h2>
                <p className="font-medium text-purple-100 text-xs opacity-90">Por Orden ERP</p>
            </div>
        </button>

        {/* TARJETA 5: DETECTIVE */}
        <button 
            onClick={() => onNavigate('conciliator')}
            className="group relative overflow-hidden bg-gradient-to-br from-emerald-600 to-teal-700 rounded-[2rem] shadow-xl shadow-emerald-200 p-6 text-left transition-all hover:scale-[1.01] flex flex-col justify-between h-48 lg:h-auto"
        >
            <div className="absolute top-0 right-0 p-24 bg-white rounded-full blur-3xl -mr-12 -mt-12 opacity-10 group-hover:opacity-20 transition-opacity"></div>
            <div className="bg-white/20 backdrop-blur-md w-10 h-10 rounded-xl flex items-center justify-center text-white border border-white/10 shrink-0 z-10 mb-3">
                <Fingerprint className="w-5 h-5" />
            </div>
            <div className="z-10">
                <h2 className="text-lg font-bold text-white">Detective</h2>
                <p className="font-medium text-emerald-100 text-[10px] opacity-90">Conciliación</p>
            </div>
        </button>

        {/* TARJETA 6: DATOS */}
        <button 
            onClick={() => onNavigate('database')}
            className="group relative overflow-hidden bg-gradient-to-br from-cyan-500 to-blue-600 rounded-[2rem] shadow-xl shadow-cyan-200/50 p-6 text-left transition-all hover:scale-[1.01] flex flex-col justify-between h-48 lg:h-auto"
        >
            <div className="absolute top-0 right-0 p-24 bg-white rounded-full blur-3xl -mr-12 -mt-12 opacity-10 group-hover:opacity-20 transition-opacity"></div>
            <div className="bg-white/20 backdrop-blur-md w-10 h-10 rounded-xl flex items-center justify-center text-white border border-white/10 shrink-0 z-10 mb-3">
                <Database className="w-5 h-5" />
            </div>
            <div className="z-10">
                <h2 className="text-lg font-bold text-white">Base Datos</h2>
                <p className="font-medium text-cyan-50 text-[10px] opacity-90">Maestro</p>
            </div>
        </button>

      </div>

      <div className="text-center text-xs text-slate-400 mt-12 font-mono">
        LogiCount Pro Desktop Experience
      </div>

    </div>
  );
};
