
import React from 'react';
import { Database, ScanLine, Fingerprint, Container, Cloud, Settings, Zap, Clock, ChevronRight, Activity } from 'lucide-react';
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

  const primaryActions = [
    { title: "CONTAR", sub: "Inventario", icon: ScanLine, path: "/reports", color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200" },
    { title: "RECIBIR", sub: "Bultos", icon: Container, path: "/reception", color: "text-indigo-700", bg: "bg-indigo-50", border: "border-indigo-200" },
  ];

  const secondaryActions = [
    { title: "DETECTIVE", sub: "Conciliador", icon: Fingerprint, path: "/conciliator", color: "text-orange-800", bg: "bg-orange-50", border: "border-orange-200" },
    { title: "NUBE", sub: "Sync", icon: Cloud, path: "/sync", color: "text-emerald-800", bg: "bg-emerald-50", border: "border-emerald-200" },
  ];

  return (
    <div className="h-full w-full overflow-y-auto no-scrollbar px-4 pt-6 pb-32 md:pb-8 page-transition bg-slate-50 dark:bg-black">
      <header className="mb-6 flex justify-between items-center px-1">
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-slate-900 dark:text-white uppercase leading-none italic">
                LogiCount <span className="text-blue-600">Pro</span>
            </h1>
          </div>
          <div className="flex gap-2">
            <button onClick={() => navigate('/audit')} className="p-3 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-white/10 rounded-2xl shadow-sm active:scale-95"><Activity className="w-5 h-5 text-emerald-600" /></button>
            <button onClick={() => navigate('/settings')} className="p-3 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-white/10 rounded-2xl shadow-sm active:scale-95"><Settings className="w-5 h-5 text-slate-600" /></button>
          </div>
      </header>

      <div className="space-y-4 mb-6">
          <div className="bg-slate-900 dark:bg-blue-900/20 text-white p-6 rounded-[2rem] flex items-center justify-between shadow-2xl relative overflow-hidden border-4 border-black">
              <div className="absolute top-0 right-0 p-12 bg-blue-600/20 rounded-full blur-3xl -mr-8 -mt-8"></div>
              <div className="relative z-10">
                  <div className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] mb-1">Items Hoy</div>
                  <div className="text-6xl font-black leading-none tabular-nums tracking-tighter">{stats?.scansToday || 0}</div>
              </div>
              <Zap className="w-10 h-10 text-yellow-400 animate-pulse relative z-10" />
          </div>
          
          <AuditSummary certifiedCount={stats?.certifiedCount || 0} />
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        {primaryActions.map((item, idx) => (
          <button 
            key={idx}
            onClick={() => navigate(item.path)}
            className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-white/5 p-5 rounded-[2rem] flex flex-col gap-4 text-left transition-all active:scale-95 shadow-sm"
          >
            <div className={`p-3 rounded-2xl ${item.bg} dark:bg-white/5 ${item.color} w-fit shadow-inner`}>
                <item.icon className="w-6 h-6 stroke-[2.5px]" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase leading-none">{item.title}</h2>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">{item.sub}</p>
            </div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {secondaryActions.map((item, idx) => (
          <button 
            key={idx}
            onClick={() => navigate(item.path)}
            className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-white/5 p-5 rounded-[2rem] flex flex-col gap-3 text-left transition-all active:scale-95 shadow-sm"
          >
            <div className={`p-3 rounded-2xl ${item.bg} dark:bg-white/5 ${item.color} w-fit shadow-inner`}>
                <item.icon className="w-5 h-5 stroke-[2.5px]" />
            </div>
            <div>
              <h2 className="text-xs font-black text-slate-900 dark:text-white uppercase leading-none">{item.title}</h2>
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">{item.sub}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
