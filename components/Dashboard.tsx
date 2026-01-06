
import React from 'react';
import { Database, ScanLine, Box, Layers, Fingerprint, Container, Cloud, Settings, Zap, Clock, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  
  const stats = useLiveQuery(async () => {
      const today = new Date().setHours(0,0,0,0);
      const scansToday = await db.scans.where('timestamp').above(today).count();
      const pendingSync = await db.scans.where('synced').equals(0).count();
      return { scansToday, pendingSync };
  }, []);

  const menuItems = [
    { title: "INVENTARIO", sub: "Conteo Físico", icon: ScanLine, path: "/reports", color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200" },
    { title: "RECEPCIÓN", sub: "Entrada de Bultos", icon: Container, path: "/reception", color: "text-indigo-700", bg: "bg-indigo-50", border: "border-indigo-200" },
    { title: "NUBE", sub: "Sincronizar Datos", icon: Cloud, path: "/sync", color: "text-emerald-800", bg: "bg-emerald-50", border: "border-emerald-200" },
    { title: "DETECTIVE", sub: "Conciliador", icon: Fingerprint, path: "/conciliator", color: "text-orange-800", bg: "bg-orange-50", border: "border-orange-200" },
    { title: "CATÁLOGO", sub: "Base Maestra", icon: Database, path: "/database", color: "text-slate-800", bg: "bg-slate-100", border: "border-slate-200" },
  ];

  return (
    <div className="w-full px-4 pt-6 max-w-lg mx-auto page-transition">
      <header className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-slate-900 uppercase leading-none">
                LogiCount <span className="text-blue-600">Pro</span>
            </h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">Enterprise Edition v2.5</p>
          </div>
          <button 
            onClick={() => navigate('/settings')}
            className="p-3 bg-white border-2 border-slate-200 rounded-2xl shadow-sm active:scale-95 transition-all"
          >
            <Settings className="w-6 h-6 text-slate-600" />
          </button>
      </header>

      {/* MÉTRICAS CRÍTICAS */}
      <div className="grid grid-cols-1 gap-3 mb-6">
          <div className="bg-slate-900 text-white p-6 rounded-[2.5rem] flex items-center justify-between shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-12 bg-blue-600/20 rounded-full blur-3xl -mr-8 -mt-8"></div>
              <div className="relative z-10">
                  <div className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] mb-1">Items Hoy</div>
                  <div className="text-6xl font-black leading-none tabular-nums">{stats?.scansToday || 0}</div>
              </div>
              <Zap className="w-12 h-12 text-yellow-400 fill-yellow-400 relative z-10" />
          </div>
          
          {stats?.pendingSync && stats.pendingSync > 0 ? (
              <button 
                onClick={() => navigate('/sync')}
                className="bg-orange-50 border-2 border-orange-200 p-5 rounded-[2rem] flex items-center justify-between animate-pulse"
              >
                  <div className="flex items-center gap-4">
                      <div className="bg-orange-100 p-3 rounded-xl"><Clock className="w-6 h-6 text-orange-600" /></div>
                      <div className="text-left">
                          <div className="text-[10px] font-black text-orange-700 uppercase tracking-widest">Pendiente Sincro</div>
                          <div className="text-2xl font-black text-orange-950 leading-none">{stats.pendingSync} <span className="text-xs">unid.</span></div>
                      </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-orange-400" />
              </button>
          ) : null}
      </div>

      {/* MENÚ DE ACCIÓN RÁPIDA */}
      <div className="grid grid-cols-1 gap-3">
        {menuItems.map((item, idx) => (
          <button 
            key={idx}
            onClick={() => navigate(item.path)}
            className={`bg-white border-2 ${item.border} p-4 rounded-[2.2rem] flex items-center gap-4 text-left transition-all active:scale-[0.97] shadow-sm hover:shadow-md`}
          >
            <div className={`p-4 rounded-2xl ${item.bg} ${item.color} shrink-0`}>
                <item.icon className="w-6 h-6 stroke-[2.5px]" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-black text-slate-900 tracking-tight leading-none mb-1 uppercase">{item.title}</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">{item.sub}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-300" />
          </button>
        ))}
      </div>
    </div>
  );
};
