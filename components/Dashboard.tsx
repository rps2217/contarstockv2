
import React, { useMemo } from 'react';
import { Database, ScanLine, Settings, ArrowRight, Box, Layers, Fingerprint, Container, Calendar, PackageCheck, WifiOff } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import * as storage from '../services/storage';

interface DashboardProps {
  onNavigate: (view: any) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  // Read settings (No need for full reactivity loop here, useMemo is fine as Dashboard remounts often)
  const settings = useMemo(() => storage.getSettings(), []);

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
    <div className="w-full max-w-4xl mx-auto pb-24 px-4 md:px-0 animate-in fade-in duration-500">
      
      {/* Welcome Section */}
      <div className="pt-8 mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
          <div className="bg-slate-900 text-white p-2 rounded-xl">
             <Box className="w-6 h-6" />
          </div>
          Centro de Operaciones
        </h1>
        <p className="text-lg opacity-60">
          Resumen operativo del día.
        </p>
      </div>

      {/* --- CONTROL TOWER WIDGETS (CONDITIONAL) --- */}
      {settings.controlTowerEnabled && (
        <div className="grid grid-cols-3 gap-3 mb-8 animate-in slide-in-from-top-4">
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center justify-center text-center">
                <div className="text-slate-400 mb-1"><Calendar className="w-5 h-5" /></div>
                <div className="text-2xl font-black text-slate-900">{dailyStats.bultos}</div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Bultos Hoy</div>
            </div>
            
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center justify-center text-center">
                <div className="text-blue-500 mb-1"><PackageCheck className="w-5 h-5" /></div>
                <div className="text-2xl font-black text-blue-600">{dailyStats.units}</div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Unidades</div>
            </div>

            <div className={`p-4 rounded-2xl shadow-sm border flex flex-col items-center justify-center text-center transition-colors ${dailyStats.pendingSync > 0 ? 'bg-orange-50 border-orange-200' : 'bg-emerald-50 border-emerald-200'}`}>
                <div className={dailyStats.pendingSync > 0 ? 'text-orange-500 mb-1' : 'text-emerald-500 mb-1'}><WifiOff className="w-5 h-5" /></div>
                <div className={`text-2xl font-black ${dailyStats.pendingSync > 0 ? 'text-orange-600' : 'text-emerald-600'}`}>{dailyStats.pendingSync}</div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Pendientes</div>
            </div>
        </div>
      )}

      {/* MAIN ACTIONS GRID */}
      <div className="grid grid-cols-1 gap-6 mb-8">
        
        {/* ROW 1: PRIMARY ACTIONS (Counts & Reception) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* TARJETA 1: IR AL MODULO DE CONTEOS/HISTORIAL */}
            <button 
                onClick={() => onNavigate('reports')}
                className="group relative overflow-hidden bg-gradient-to-br from-blue-600 to-blue-700 rounded-[2rem] shadow-lg shadow-blue-200 p-8 text-left transition-all hover:shadow-xl hover:scale-[1.01] flex flex-col justify-between h-56"
            >
                <div className="absolute top-0 right-0 p-32 bg-white rounded-full blur-3xl -mr-16 -mt-16 opacity-10 group-hover:opacity-20 transition-opacity"></div>
                
                <div className="flex justify-between items-start z-10">
                    <div className="bg-white/20 backdrop-blur-md w-14 h-14 rounded-2xl flex items-center justify-center text-white mb-4 border border-white/10">
                        <ScanLine className="w-7 h-7" />
                    </div>
                    <div className="bg-white/20 backdrop-blur-md rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ArrowRight className="w-5 h-5 text-white" />
                    </div>
                </div>

                <div className="z-10 text-white">
                    <h2 className="text-2xl font-bold mb-2">Conteos</h2>
                    <p className="font-medium text-blue-100 text-sm leading-relaxed opacity-80">
                        Iniciar escaneo o ver historial.
                    </p>
                </div>
            </button>

            {/* TARJETA 2: RECEPCION CIEGA (Check-In) */}
            <button 
                onClick={() => onNavigate('reception')}
                className="group relative overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 rounded-[2rem] shadow-lg shadow-slate-300 p-8 text-left transition-all hover:shadow-xl hover:scale-[1.01] flex flex-col justify-between h-56"
            >
                <div className="absolute top-0 right-0 p-32 bg-white rounded-full blur-3xl -mr-16 -mt-16 opacity-5 group-hover:opacity-10 transition-opacity"></div>
                
                <div className="flex justify-between items-start z-10">
                    <div className="bg-white/10 backdrop-blur-md w-14 h-14 rounded-2xl flex items-center justify-center text-white mb-4 border border-white/10">
                        <Container className="w-7 h-7" />
                    </div>
                    <div className="bg-white/10 backdrop-blur-md rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ArrowRight className="w-5 h-5 text-white" />
                    </div>
                </div>

                <div className="z-10 text-white">
                    <h2 className="text-2xl font-bold mb-2">Check-in Bultos</h2>
                    <p className="font-medium text-slate-300 text-sm leading-relaxed opacity-80">
                        Recepción rápida de etiquetas (Modo Ráfaga).
                    </p>
                </div>
            </button>
        </div>

        {/* ROW 2: ANALYSIS TOOLS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* TARJETA 3: CONSOLIDADOS ERP */}
            <button 
                onClick={() => onNavigate('consolidated')}
                className="group relative overflow-hidden bg-gradient-to-br from-purple-600 to-indigo-700 rounded-[2rem] shadow-lg shadow-purple-200 p-6 text-left transition-all hover:shadow-xl hover:scale-[1.01] flex flex-col justify-between h-48"
            >
                <div className="absolute top-0 right-0 p-24 bg-white rounded-full blur-3xl -mr-12 -mt-12 opacity-10 group-hover:opacity-20 transition-opacity"></div>

                <div className="bg-white/20 backdrop-blur-md w-12 h-12 rounded-2xl flex items-center justify-center text-white border border-white/10 shrink-0 z-10 mb-4">
                    <Layers className="w-6 h-6" />
                </div>
                
                <div className="z-10">
                    <h2 className="text-xl font-bold text-white mb-1">Consolidados ERP</h2>
                    <p className="font-medium text-purple-100 text-xs opacity-90">
                        Agrupación por Orden.
                    </p>
                </div>
            </button>

            {/* TARJETA 4: DETECTIVE / CONCILIADOR */}
            <button 
                onClick={() => onNavigate('conciliator')}
                className="group relative overflow-hidden bg-gradient-to-br from-emerald-600 to-teal-700 rounded-[2rem] shadow-lg shadow-emerald-200 p-6 text-left transition-all hover:shadow-xl hover:scale-[1.01] flex flex-col justify-between h-48"
            >
                <div className="absolute top-0 right-0 p-24 bg-white rounded-full blur-3xl -mr-12 -mt-12 opacity-10 group-hover:opacity-20 transition-opacity"></div>

                <div className="bg-white/20 backdrop-blur-md w-12 h-12 rounded-2xl flex items-center justify-center text-white border border-white/10 shrink-0 z-10 mb-4">
                    <Fingerprint className="w-6 h-6" />
                </div>
                
                <div className="z-10">
                    <h2 className="text-xl font-bold text-white mb-1">Detective</h2>
                    <p className="font-medium text-emerald-100 text-xs opacity-90">
                        Conciliación Inteligente.
                    </p>
                </div>
            </button>
        </div>

        {/* ROW 3: SYSTEM */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* TARJETA 5: DATOS MAESTROS */}
            <button 
                onClick={() => onNavigate('database')}
                className="group relative overflow-hidden bg-gradient-to-br from-cyan-500 to-blue-600 rounded-[2rem] shadow-lg shadow-cyan-200/50 p-6 text-left transition-all hover:shadow-xl hover:scale-[1.01] flex flex-col justify-between h-40"
            >
                <div className="absolute top-0 right-0 p-24 bg-white rounded-full blur-3xl -mr-12 -mt-12 opacity-10 group-hover:opacity-20 transition-opacity"></div>

                <div className="bg-white/20 backdrop-blur-md w-12 h-12 rounded-2xl flex items-center justify-center text-white border border-white/10 shrink-0 z-10 mb-4">
                    <Database className="w-6 h-6" />
                </div>
                
                <div className="z-10">
                    <h2 className="text-xl font-bold text-white mb-1">Base de Datos</h2>
                    <p className="font-medium text-cyan-50 text-xs opacity-90">
                        Catálogo de productos.
                    </p>
                </div>
            </button>

            {/* TARJETA 6: AJUSTES */}
            <button 
                onClick={() => onNavigate('settings')}
                className="group relative overflow-hidden bg-gradient-to-br from-slate-700 to-zinc-800 rounded-[2rem] shadow-lg shadow-slate-300 p-6 text-left transition-all hover:shadow-xl hover:scale-[1.01] flex flex-col justify-between h-40"
            >
                <div className="absolute top-0 right-0 p-24 bg-white rounded-full blur-3xl -mr-12 -mt-12 opacity-5 group-hover:opacity-10 transition-opacity"></div>

                <div className="bg-white/10 backdrop-blur-md w-12 h-12 rounded-2xl flex items-center justify-center text-white border border-white/10 shrink-0 z-10 mb-4">
                    <Settings className="w-6 h-6" />
                </div>
                
                <div className="z-10">
                    <h2 className="text-xl font-bold text-white mb-1">Ajustes</h2>
                    <p className="font-medium text-slate-300 text-xs opacity-90">
                        Configuración global.
                    </p>
                </div>
            </button>
        </div>

      </div>

      <div className="text-center text-xs opacity-30 mt-12 font-mono">
        LogiCount Pro v1.15.0
      </div>

    </div>
  );
};
