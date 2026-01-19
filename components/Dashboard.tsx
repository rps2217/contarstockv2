
import React from 'react';
import { ScanLine, Container, Cloud, Settings, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  
  // Consulta ultraligera para métricas críticas
  const stats = useLiveQuery(async () => {
      const today = new Date().setHours(0,0,0,0);
      const scansToday = await db.scans.where('timestamp').above(today).count();
      const pendingSync = await db.scans.where('synced').equals(0).count();
      return { scansToday, pendingSync };
  }, []);

  const actions = [
    { title: "CONTAR", sub: "Inventario", icon: ScanLine, path: "/reports", color: "text-blue-600", bg: "bg-blue-50" },
    { title: "RECIBIR", sub: "Bultos", icon: Container, path: "/reception", color: "text-indigo-600", bg: "bg-indigo-50" },
    { title: "AJUSTES", sub: "Config", icon: Settings, path: "/settings", color: "text-slate-600", bg: "bg-slate-50" },
  ];

  const pendingCount = stats?.pendingSync || 0;
  const isSyncNeeded = pendingCount > 0;

  return (
    <div className="h-full w-full overflow-y-auto no-scrollbar px-4 pt-6 pb-32 md:pb-8 bg-slate-50 dark:bg-black font-sans">
      
      {/* HEADER MARCA */}
      <header className="mb-8 flex justify-between items-center px-1">
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-slate-900 dark:text-white uppercase italic leading-none">
                LogiCount <span className="text-blue-600">Pro</span>
            </h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">Terminal Industrial v3.0</p>
          </div>
      </header>

      {/* ESTADO CRÍTICO DE SINCRONIZACIÓN (El elemento más importante) */}
      <div 
        onClick={() => navigate('/sync')}
        className={`mb-6 p-6 rounded-[2.5rem] border-4 shadow-xl relative overflow-hidden transition-all active:scale-[0.98] ${
            isSyncNeeded 
            ? 'bg-amber-400 border-amber-500 text-amber-950' 
            : 'bg-emerald-500 border-emerald-600 text-white'
        }`}
      >
          <div className="relative z-10 flex justify-between items-center">
              <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.3em] mb-1 opacity-80">Estado Nube</div>
                  <div className="text-4xl font-black leading-none tracking-tight">
                      {isSyncNeeded ? 'DATOS PENDIENTES' : 'TODO SEGURO'}
                  </div>
                  {isSyncNeeded && (
                      <div className="mt-2 text-xs font-bold bg-white/20 inline-block px-3 py-1 rounded-lg">
                          {pendingCount} registros sin subir
                      </div>
                  )}
              </div>
              <div className="bg-white/20 p-4 rounded-2xl">
                  {isSyncNeeded ? <AlertTriangle className="w-8 h-8" /> : <CheckCircle2 className="w-8 h-8" />}
              </div>
          </div>
      </div>

      {/* KPI DIARIO (Solo lo esencial) */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border-2 border-slate-100 dark:border-white/10 shadow-sm mb-6 flex items-center justify-between">
          <div>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Productividad Hoy</div>
              <div className="text-5xl font-black text-slate-900 dark:text-white tabular-nums tracking-tighter">{stats?.scansToday || 0}</div>
          </div>
          <div className="h-12 w-1 bg-slate-100 dark:bg-white/10 rounded-full"></div>
          <div className="text-right">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Unidades</div>
              <div className="text-xs font-bold text-slate-500 uppercase">Procesadas</div>
          </div>
      </div>

      {/* ACCIONES OPERATIVAS GRID */}
      <div className="grid grid-cols-2 gap-3">
        {/* SYNC BUTTON EN GRID */}
        <button 
            onClick={() => navigate('/sync')}
            className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-white/5 p-5 rounded-[2rem] flex flex-col gap-4 text-left transition-all active:scale-95 shadow-sm group"
        >
            <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-700 w-fit">
                <Cloud className="w-6 h-6 stroke-[2.5px]" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase leading-none group-hover:text-emerald-600 transition-colors">Nube</h2>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Sincronizar</p>
            </div>
        </button>

        {actions.map((item, idx) => (
          <button 
            key={idx}
            onClick={() => navigate(item.path)}
            className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-white/5 p-5 rounded-[2rem] flex flex-col gap-4 text-left transition-all active:scale-95 shadow-sm group"
          >
            <div className={`p-3 rounded-2xl ${item.bg} dark:bg-white/5 ${item.color} w-fit`}>
                <item.icon className="w-6 h-6 stroke-[2.5px]" />
            </div>
            <div>
              <h2 className={`text-sm font-black text-slate-900 dark:text-white uppercase leading-none group-hover:${item.color.replace('text-', '')} transition-colors`}>{item.title}</h2>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">{item.sub}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
