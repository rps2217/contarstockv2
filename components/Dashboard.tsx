
import React from 'react';
import { Database, ScanLine, Box, Layers, Fingerprint, Container, Cloud, Settings, Zap, Clock, ChevronRight, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { AuditSummary } from './dashboard/AuditSummary';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  
  const stats = useLiveQuery(async () => {
      const today = new Date().setHours(0,0,0,0);
      const scansToday = await db.scans.where('timestamp').above(today).count();
      const pendingSync = await db.scans.where('synced').equals(0).count();
      const certifiedCount = await db.sessions.where('auditStatus').equals('verified').count();
      return { scansToday, pendingSync, certifiedCount };
  }, []);

  const menuItems = [
    { title: "INVENTARIO", sub: "Conteo Físico", icon: ScanLine, path: "/reports", color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200" },
    { title: "RECEPCIÓN", sub: "Entrada de Bultos", icon: Container, path: "/reception", color: "text-indigo-700", bg: "bg-indigo-50", border: "border-indigo-200" },
    { title: "DETECTIVE", sub: "Conciliador", icon: Fingerprint, path: "/conciliator", color: "text-orange-800", bg: "bg-orange-50", border: "border-orange-200" },
    { title: "NUBE", sub: "Sincronizar Datos", icon: Cloud, path: "/sync", color: "text-emerald-800", bg: "bg-emerald-50", border: "border-emerald-200" },
    { title: "CATÁLOGO", sub: "Base Maestra", icon: Database, path: "/database", color: "text-slate-800", bg: "bg-slate-100", border: "border-slate-200" },
  ];

  return (
    <div className="h-full w-full overflow-y-auto no-scrollbar px-4 pt-6 pb-32 md:pb-6 page-transition">
      <header className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-slate-900 dark:text-white uppercase leading-none">
                LogiCount <span className="text-blue-600">Pro</span>
            </h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">Enterprise Edition v2.6</p>
          </div>
          <div className="flex gap-2">
            <button 
                onClick={() => navigate('/audit')}
                className="p-3 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-white/10 rounded-2xl shadow-sm active:scale-95 transition-all"
            >
                <Activity className="w-6 h-6 text-emerald-600" />
            </button>
            <button 
                onClick={() => navigate('/settings')}
                className="p-3 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-white/10 rounded-2xl shadow-sm active:scale-95 transition-all"
            >
                <Settings className="w-6 h-6 text-slate-600 dark:text-slate-400" />
            </button>
          </div>
      </header>

      <div className="grid grid-cols-1 gap-3 mb-6">
          <div className="bg-slate-900 dark:bg-blue-900/20 text-white p-6 rounded-[2.5rem] flex items-center justify-between shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-12 bg-blue-600/20 rounded-full blur-3xl -mr-8 -mt-8 group-hover:bg-blue-500/30 transition-colors"></div>
              <div className="relative z-10">
                  <div className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] mb-1">Carga Hoy</div>
                  <div className="text-6xl font-black leading-none tabular-nums">{stats?.scansToday || 0}</div>
                  <div className="text-[9px] font-bold text-white/30 uppercase mt-2 tracking-widest">Unidades verificadas</div>
              </div>
              <Zap className="w-12 h-12 text-yellow-400 fill-yellow-400 relative z-10 animate-pulse" />
          </div>
          
          <AuditSummary certifiedCount={stats?.certifiedCount || 0} />
          
          {stats?.pendingSync && stats.pendingSync > 0 ? (
              <button 
                onClick={() => navigate('/sync')}
                className="bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-200 dark:border-orange-500/20 p-5 rounded-[2rem] flex items-center justify-between animate-in slide-in-from-right-4"
              >
                  <div className="flex items-center gap-4">
                      <div className="bg-orange-100 dark:bg-orange-900/40 p-3 rounded-xl"><Clock className="w-6 h-6 text-orange-600" /></div>
                      <div className="text-left">
                          <div className="text-[10px] font-black text-orange-700 dark:text-orange-400 uppercase tracking-widest">Cola de Sincro</div>
                          <div className="text-2xl font-black text-orange-950 dark:text-orange-100 leading-none">{stats.pendingSync} <span className="text-xs">pend.</span></div>
                      </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-orange-400" />
              </button>
          ) : null}
      </div>

      <div className="grid grid-cols-1 gap-3">
        {menuItems.map((item, idx) => (
          <button 
            key={idx}
            onClick={() => navigate(item.path)}
            className={`bg-white dark:bg-slate-900 border-2 ${item.border} dark:border-white/5 p-4 rounded-[2.2rem] flex items-center gap-4 text-left transition-all active:scale-[0.97] shadow-sm hover:shadow-md hover:-translate-y-0.5`}
          >
            <div className={`p-4 rounded-2xl ${item.bg} dark:bg-white/5 ${item.color} shrink-0 shadow-inner`}>
                <item.icon className="w-6 h-6 stroke-[2.5px]" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight leading-none mb-1 uppercase">{item.title}</h2>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider truncate">{item.sub}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-300 dark:text-slate-700" />
          </button>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
