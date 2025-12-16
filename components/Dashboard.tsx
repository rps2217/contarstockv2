
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
  const dailyStats = useLiveQuery(async () => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      const todayStart = date.getTime();

      // Simple stats for Control Tower widgets
      const todaySessions = await db.sessions
          .where('createdAt')
          .aboveOrEqual(todayStart)
          .toArray();

      const bultos = todaySessions.length;
      const units = todaySessions.reduce((acc, s) => acc + (s.totalUnits || 0), 0);
      
      const pendingSync = await db.scans.where('synced').equals(0).count();

      return { bultos, units, pendingSync };
  }, [], { bultos: 0, units: 0, pendingSync: 0 });

  // --- COMPONENT: ACTION CARD (RESPONSIVE) ---
  const ActionCard = ({ title, sub, icon: Icon, colorClass, onClick, span = 1 }: any) => (
    <button 
        onClick={onClick}
        className={`
            group relative overflow-hidden text-left transition-all active:scale-95 duration-200
            /* MOBILE STYLES (Compact Row) */
            flex flex-row items-center gap-4 p-4 rounded-2xl shadow-sm border border-slate-100 bg-white
            /* DESKTOP STYLES (Big Card) */
            md:flex-col md:justify-between md:p-6 md:h-56 md:shadow-lg md:border-0 md:bg-gradient-to-br
            ${span === 2 ? 'md:col-span-2' : 'md:col-span-1'}
            ${colorClass}
        `}
    >
        {/* DESKTOP BACKGROUND DECORATION (Hidden on Mobile) */}
        <div className="hidden md:block absolute top-0 right-0 p-24 bg-white rounded-full blur-3xl -mr-12 -mt-12 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none"></div>

        {/* ICON CONTAINER */}
        <div className={`
            shrink-0 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110
            /* Mobile Icon */
            w-12 h-12 bg-slate-50 text-slate-600
            /* Desktop Icon */
            md:w-14 md:h-14 md:bg-white/20 md:backdrop-blur-md md:text-white md:mb-4 md:border md:border-white/10
        `}>
            <Icon className="w-6 h-6 md:w-7 md:h-7" />
        </div>

        {/* TEXT CONTENT */}
        <div className="flex-1 min-w-0 z-10">
            <h2 className="text-base font-bold text-slate-900 md:text-2xl md:text-white md:mb-1 truncate">{title}</h2>
            <p className="text-xs text-slate-500 font-medium md:text-blue-100 md:opacity-90 truncate">{sub}</p>
        </div>

        {/* MOBILE ARROW (Hidden on Desktop) */}
        <div className="md:hidden text-slate-300">
            <ArrowRight className="w-5 h-5" />
        </div>
    </button>
  );

  return (
    <div className="w-full max-w-7xl mx-auto pb-32 px-4 md:px-8 animate-in fade-in duration-500">
      
      {/* Welcome Section */}
      <div className="pt-6 md:pt-8 mb-6 md:mb-8 flex items-center justify-between">
        <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2 md:gap-3">
            <div className="bg-slate-900 text-white p-1.5 md:p-2 rounded-lg md:rounded-xl">
                <Box className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            Centro de Control
            </h1>
            <p className="text-sm md:text-lg text-slate-500 mt-1">
            Resumen operativo del día.
            </p>
        </div>
        {/* Mobile Settings Shortcut */}
        <button onClick={() => onNavigate('settings')} className="md:hidden p-2 bg-slate-100 rounded-full text-slate-600 hover:bg-slate-200">
            <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* --- CONTROL TOWER WIDGETS --- */}
      {settings.controlTowerEnabled && (
        <div className="grid grid-cols-3 gap-2 md:gap-4 mb-6 md:mb-8 animate-in slide-in-from-top-4">
            <div className="bg-white p-3 md:p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center justify-center text-center">
                <div className="text-slate-400 mb-1 md:mb-2"><Calendar className="w-5 h-5 md:w-6 md:h-6" /></div>
                <div className="text-xl md:text-3xl font-black text-slate-900">{dailyStats.bultos}</div>
                <div className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wide">Bultos Hoy</div>
            </div>
            
            <div className="bg-white p-3 md:p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center justify-center text-center">
                <div className="text-blue-500 mb-1 md:mb-2"><PackageCheck className="w-5 h-5 md:w-6 md:h-6" /></div>
                <div className="text-xl md:text-3xl font-black text-blue-600">{dailyStats.units}</div>
                <div className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wide">Unidades</div>
            </div>

            <div className={`p-3 md:p-5 rounded-2xl shadow-sm border flex flex-col items-center justify-center text-center transition-colors ${dailyStats.pendingSync > 0 ? 'bg-orange-50 border-orange-200' : 'bg-emerald-50 border-emerald-200'}`}>
                <div className={dailyStats.pendingSync > 0 ? 'text-orange-500 mb-1 md:mb-2' : 'text-emerald-500 mb-1 md:mb-2'}><WifiOff className="w-5 h-5 md:w-6 md:h-6" /></div>
                <div className={`text-xl md:text-3xl font-black ${dailyStats.pendingSync > 0 ? 'text-orange-600' : 'text-emerald-600'}`}>{dailyStats.pendingSync}</div>
                <div className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wide">Pendientes</div>
            </div>
        </div>
      )}

      {/* MAIN ACTIONS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6 mb-8">
        
        {/* PRIMARY ACTIONS */}
        <div className="md:col-span-2 md:row-span-2">
             <ActionCard 
                title="Sesión de Conteo" 
                sub="Iniciar inventario físico" 
                icon={ScanLine} 
                colorClass="md:from-blue-600 md:to-blue-700" 
                onClick={() => onNavigate('reports')}
                span={2}
             />
        </div>

        <ActionCard 
            title="Recepción Ciega" 
            sub="Check-in rápido" 
            icon={Container} 
            colorClass="md:from-slate-800 md:to-slate-900"
            onClick={() => onNavigate('reception')}
        />

        <ActionCard 
            title="Gestor Nube" 
            sub="Sincronización" 
            icon={Cloud} 
            colorClass="md:from-indigo-500 md:to-violet-600"
            onClick={() => onNavigate('sync')}
        />

        <ActionCard 
            title="Consolidados" 
            sub="Reportes por ERP" 
            icon={Layers} 
            colorClass="md:from-purple-600 md:to-fuchsia-700"
            onClick={() => onNavigate('consolidated')}
        />

        <ActionCard 
            title="Detective" 
            sub="Conciliación Excel" 
            icon={Fingerprint} 
            colorClass="md:from-emerald-600 md:to-teal-700"
            onClick={() => onNavigate('conciliator')}
        />

        <ActionCard 
            title="Base de Datos" 
            sub="Maestro de Productos" 
            icon={Database} 
            colorClass="md:from-cyan-500 md:to-blue-600"
            onClick={() => onNavigate('database')}
        />

      </div>

      <div className="text-center text-[10px] md:text-xs text-slate-400 mt-8 font-mono">
        LogiCount Pro Mobile Experience
      </div>

    </div>
  );
};
