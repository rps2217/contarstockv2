
import React from 'react';
import { Database, ScanLine, Box, Layers, Fingerprint, Container, Cloud, Settings, Zap, Clock } from 'lucide-react';
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
    { title: "INVENTARIO", sub: "Conteo Físico", icon: ScanLine, path: "/reports", color: "text-blue-700", bg: "bg-blue-100", border: "border-blue-400" },
    { title: "RECEPCIÓN", sub: "Entrada de Bultos", icon: Container, path: "/reception", color: "text-indigo-700", bg: "bg-indigo-100", border: "border-indigo-400" },
    { title: "NUBE", sub: "Sincronizar Datos", icon: Cloud, path: "/sync", color: "text-emerald-800", bg: "bg-emerald-100", border: "border-emerald-400" },
    { title: "DETECTIVE", sub: "Conciliador", icon: Fingerprint, path: "/conciliator", color: "text-orange-800", bg: "bg-orange-100", border: "border-orange-400" },
    { title: "CATÁLOGO", sub: "Base Maestra", icon: Database, path: "/database", color: "text-slate-800", bg: "bg-slate-200", border: "border-slate-400" },
  ];

  return (
    <div className="w-full pb-32 px-4 pt-6 max-w-lg mx-auto">
      <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-black tracking-tighter text-black uppercase leading-none">
                LogiCount <span className="text-blue-700">Pro</span>
            </h1>
            <p className="text-sm font-bold text-slate-600 uppercase tracking-widest mt-1">Alta Visibilidad v2.5</p>
          </div>
          <button 
            onClick={() => navigate('/settings')}
            className="p-4 bg-white border-4 border-black rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all"
          >
            <Settings className="w-8 h-8 text-black" />
          </button>
      </header>

      {/* MÉTRICAS CRÍTICAS */}
      <div className="grid grid-cols-1 gap-4 mb-8">
          <div className="bg-black text-white p-6 rounded-[2.5rem] flex items-center justify-between border-4 border-black shadow-xl">
              <div>
                  <div className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] mb-1">Items Hoy</div>
                  <div className="text-6xl font-black leading-none tabular-nums">{stats?.scansToday || 0}</div>
              </div>
              <Zap className="w-12 h-12 text-yellow-400 fill-yellow-400" />
          </div>
          
          {stats?.pendingSync && stats.pendingSync > 0 ? (
              <button 
                onClick={() => navigate('/sync')}
                className="bg-orange-100 border-4 border-orange-600 p-6 rounded-[2.5rem] flex items-center justify-between animate-pulse"
              >
                  <div>
                      <div className="text-[10px] font-black text-orange-700 uppercase tracking-[0.3em] mb-1">Pendiente Sincro</div>
                      <div className="text-4xl font-black text-orange-950 leading-none">{stats.pendingSync}</div>
                  </div>
                  <Clock className="w-10 h-10 text-orange-600" />
              </button>
          ) : null}
      </div>

      {/* MENÚ DE ACCIÓN RÁPIDA */}
      <div className="grid grid-cols-1 gap-4">
        {menuItems.map((item, idx) => (
          <button 
            key={idx}
            onClick={() => navigate(item.path)}
            className={`bg-white border-4 ${item.border} p-6 rounded-[2.5rem] flex items-center gap-6 text-left transition-all active:scale-[0.95] shadow-lg`}
          >
            <div className={`p-4 rounded-2xl ${item.bg} ${item.color} border-2 border-current`}>
                <item.icon className="w-8 h-8 stroke-[2.5px]" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-black tracking-tight leading-none mb-1">{item.title}</h2>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">{item.sub}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
