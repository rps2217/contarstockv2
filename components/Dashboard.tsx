
import React from 'react';
import { Database, ScanLine, Box, Layers, Fingerprint, Container, Cloud, Settings, Zap, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
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
    { title: "Inventario", sub: "Campo / Físico", icon: ScanLine, path: "/reports", color: "text-blue-700", bg: "bg-blue-100", border: "border-blue-200" },
    { title: "Recepción", sub: "Entrada Bultos", icon: Container, path: "/reception", color: "text-indigo-700", bg: "bg-indigo-100", border: "border-indigo-200" },
    { title: "Sincronizar", sub: "Subir a la Nube", icon: Cloud, path: "/sync", color: "text-emerald-700", bg: "bg-emerald-100", border: "border-emerald-200" },
    { title: "Reportes", sub: "Consolidados", icon: Layers, path: "/consolidated", color: "text-purple-700", bg: "bg-purple-100", border: "border-purple-200" },
    { title: "Conciliador", sub: "Modo Detective", icon: Fingerprint, path: "/conciliator", color: "text-orange-700", bg: "bg-orange-100", border: "border-orange-200" },
    { title: "Productos", sub: "Maestro SKU", icon: Database, path: "/database", color: "text-slate-700", bg: "bg-slate-100", border: "border-slate-200" },
  ];

  return (
    <div className="w-full pb-24 px-2">
      <header className="mb-10 flex justify-between items-center pt-6">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-slate-900">
                LogiCount <span className="text-blue-600">Pro</span>
            </h1>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">Panel de Control</p>
          </div>
          <button 
            onClick={() => navigate('/settings')}
            className="p-4 bg-white border-2 border-slate-200 rounded-2xl text-slate-600 shadow-sm active:scale-90 transition-all"
          >
            <Settings className="w-7 h-7" />
          </button>
      </header>

      {/* WIDGETS DE ESTADO - ALTO CONTRASTE */}
      <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white border-2 border-blue-500 p-6 rounded-[2.5rem] shadow-lg">
              <div className="flex justify-between items-center mb-4">
                  <div className="p-2 bg-blue-100 rounded-xl text-blue-700"><Zap className="w-6 h-6" /></div>
                  <span className="text-xs font-black text-blue-600 bg-blue-50 px-2 py-1 rounded">HOY</span>
              </div>
              <div className="text-4xl font-black text-slate-900">{stats?.scansToday || 0}</div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-1">Escaneos realizados</div>
          </div>
          <div className={`bg-white border-2 p-6 rounded-[2.5rem] shadow-lg ${stats?.pendingSync && stats.pendingSync > 0 ? 'border-orange-500' : 'border-slate-200'}`}>
              <div className="flex justify-between items-center mb-4">
                  <div className={`p-2 rounded-xl ${stats?.pendingSync && stats.pendingSync > 0 ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-500'}`}><Clock className="w-6 h-6" /></div>
              </div>
              <div className="text-4xl font-black text-slate-900">{stats?.pendingSync || 0}</div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-1">Pendientes de subida</div>
          </div>
      </div>

      {/* ACCESOS RÁPIDOS - BOTONES GIGANTES DEFINIDOS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {menuItems.map((item, idx) => (
          <button 
            key={idx}
            onClick={() => navigate(item.path)}
            className={`bg-white border-2 ${item.border} p-6 rounded-[2.5rem] flex items-center gap-6 text-left transition-all active:scale-[0.97] shadow-sm hover:shadow-md group`}
          >
            <div className={`p-5 rounded-[1.5rem] ${item.bg} ${item.color} group-hover:scale-105 transition-transform`}>
                <item.icon className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">{item.title}</h2>
              <p className="text-sm font-semibold text-slate-500">{item.sub}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
