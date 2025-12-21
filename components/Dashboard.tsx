
import React from 'react';
import { Database, ScanLine, Box, Layers, Fingerprint, Container, Cloud, ChevronRight, Settings, ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  const menuItems = [
    { title: "Escaneo de Campo", sub: "Inventario físico directo", icon: ScanLine, path: "/reports", color: "text-blue-600", bg: "bg-blue-50" },
    { title: "Ruta de Entrada", sub: "Recepción de bultos", icon: Container, path: "/reception", color: "text-indigo-600", bg: "bg-indigo-50" },
    { title: "Control de Nube", sub: "Sincronización remota", icon: Cloud, path: "/sync", color: "text-emerald-600", bg: "bg-emerald-50" },
    { title: "Métricas Consolidadas", sub: "Reportes inteligentes", icon: Layers, path: "/consolidated", color: "text-purple-600", bg: "bg-purple-50" },
    { title: "Módulo Detective", sub: "Conciliación de discrepancias", icon: Fingerprint, path: "/conciliator", color: "text-orange-600", bg: "bg-orange-50" },
    { title: "Maestro de Datos", sub: "Gestión de SKUs locales", icon: Database, path: "/database", color: "text-slate-600", bg: "bg-slate-50" },
  ];

  return (
    <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <div className="mb-8 flex justify-between items-end border-b border-slate-200 pb-6 pt-2">
          <div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 mb-1 uppercase">Control Tower</h1>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em]">LogiCount Pro Enterprise Edition</p>
          </div>
          
          <button 
            onClick={() => navigate('/settings')}
            className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm active:scale-90"
            aria-label="Configuración"
          >
            <Settings className="w-6 h-6" />
          </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {menuItems.map((item, idx) => (
          <button 
            key={idx}
            onClick={() => navigate(item.path)}
            className="w-full bg-white border border-slate-200 p-5 md:p-6 rounded-[2rem] flex items-center justify-between shadow-sm active:scale-[0.98] transition-all hover:border-blue-400 group relative overflow-hidden"
          >
            <div className="flex items-center gap-5 relative z-10">
              <div className={`p-4 rounded-2xl ${item.bg} ${item.color} group-hover:scale-110 transition-transform duration-500 shadow-sm`}>
                  <item.icon className="w-7 h-7" />
              </div>
              <div className="text-left">
                <h2 className="text-lg font-black text-slate-800 leading-tight uppercase tracking-tight">{item.title}</h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1.5">{item.sub}</p>
              </div>
            </div>
            <div className="bg-slate-50 p-2 rounded-full group-hover:bg-blue-50 transition-colors">
                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-colors" />
            </div>
          </button>
        ))}
      </div>

      <div className="mt-12 flex flex-col items-center">
        <div className="h-1 w-16 bg-slate-100 rounded-full mb-4"></div>
        <p className="text-[9px] text-slate-300 font-black uppercase tracking-[0.3em]">Stable Build 2.5.0</p>
      </div>
    </div>
  );
};
