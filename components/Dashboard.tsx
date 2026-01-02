
import React from 'react';
import { Database, ScanLine, Box, Layers, Fingerprint, Container, Cloud, ChevronRight, Settings, Zap, TrendingUp, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { settings } = useAppStore();
  
  // Datos vivos para los widgets
  const stats = useLiveQuery(async () => {
      const today = new Date().setHours(0,0,0,0);
      const scansToday = await db.scans.where('timestamp').above(today).count();
      const sessionsActive = await db.sessions.where('status').equals('active').count();
      const pendingSync = await db.scans.where('synced').equals(0).count();
      return { scansToday, sessionsActive, pendingSync };
  }, []);

  const menuItems = [
    { title: "Campo", sub: "Inventario físico", icon: ScanLine, path: "/reports", color: "text-blue-400", bg: "bg-blue-500/10" },
    { title: "Entrada", sub: "Recibir bultos", icon: Container, path: "/reception", color: "text-indigo-400", bg: "bg-indigo-500/10" },
    { title: "Cloud", sub: "Sync remoto", icon: Cloud, path: "/sync", color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { title: "Reportes", sub: "Consolidados", icon: Layers, path: "/consolidated", color: "text-purple-400", bg: "bg-purple-500/10" },
    { title: "Detective", sub: "Conciliación", icon: Fingerprint, path: "/conciliator", color: "text-orange-400", bg: "bg-orange-500/10" },
    { title: "Maestro", sub: "Gestión SKUs", icon: Database, path: "/database", color: "text-slate-400", bg: "bg-slate-500/10" },
  ];

  return (
    <div className="w-full animate-flow pb-24 px-1">
      <header className="mb-8 flex justify-between items-start pt-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Sistema Operativo Online</span>
            </div>
            <h1 className="text-4xl font-black tracking-tighter text-white uppercase">Control <span className="text-blue-500">Center</span></h1>
          </div>
          <button 
            onClick={() => navigate('/settings')}
            className="p-3 glass-card rounded-2xl text-slate-400 hover:text-white transition-all btn-press"
          >
            <Settings className="w-6 h-6" />
          </button>
      </header>

      {/* WIDGETS DE ESTADO */}
      <div className="grid grid-cols-2 gap-3 mb-8">
          <div className="glass-card p-5 rounded-[2rem] flex flex-col justify-between h-32">
              <div className="flex justify-between items-start">
                  <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400"><Zap className="w-4 h-4" /></div>
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
              </div>
              <div>
                  <div className="text-2xl font-black text-white">{stats?.scansToday || 0}</div>
                  <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Escaneos Hoy</div>
              </div>
          </div>
          <div className="glass-card p-5 rounded-[2rem] flex flex-col justify-between h-32">
              <div className="flex justify-between items-start">
                  <div className="p-2 bg-orange-500/20 rounded-lg text-orange-400"><Clock className="w-4 h-4" /></div>
                  {stats?.pendingSync && stats.pendingSync > 0 && <div className="w-2 h-2 rounded-full bg-rose-500"></div>}
              </div>
              <div>
                  <div className="text-2xl font-black text-white">{stats?.pendingSync || 0}</div>
                  <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Pendientes Nube</div>
              </div>
          </div>
      </div>

      {/* ACCESOS RÁPIDOS */}
      <div className="grid grid-cols-2 gap-3">
        {menuItems.map((item, idx) => (
          <button 
            key={idx}
            onClick={() => navigate(item.path)}
            className="glass-card p-6 rounded-[2rem] flex flex-col gap-4 text-left btn-press group"
          >
            <div className={`p-4 rounded-2xl w-fit ${item.bg} ${item.color} group-hover:scale-110 transition-transform duration-300`}>
                <item.icon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white uppercase tracking-tight">{item.title}</h2>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-1">{item.sub}</p>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-12 text-center opacity-20">
        <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.4em]">LogiCount Pro Enterprise Edition</p>
      </div>
    </div>
  );
};
