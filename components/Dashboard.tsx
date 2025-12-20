
import React from 'react';
import { Database, ScanLine, Box, Layers, Fingerprint, Container, Cloud, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  const menuItems = [
    { title: "Sesión de Conteo", sub: "Iniciar inventario físico", icon: ScanLine, path: "/reports" },
    { title: "Recepción Ciega", sub: "Check-in rápido", icon: Container, path: "/reception" },
    { title: "Gestor Nube", sub: "Sincronización", icon: Cloud, path: "/sync" },
    { title: "Consolidados", sub: "Reportes por ERP", icon: Layers, path: "/consolidated" },
    { title: "Detective", sub: "Conciliación Excel", icon: Fingerprint, path: "/conciliator" },
    { title: "Base de Datos", sub: "Maestro de Productos", icon: Database, path: "/database" },
  ];

  return (
    <div className="w-full max-w-2xl mx-auto pb-20 animate-in fade-in duration-700 pt-4">
      <div className="mb-10 px-2">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-[#1a1f2c] p-2 rounded-xl shadow-lg">
                <Box className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">Centro de Control</h1>
          </div>
          <p className="text-slate-400 font-medium text-sm">Resumen operativo del día.</p>
      </div>

      <div className="space-y-4 px-2">
        {menuItems.map((item, idx) => (
          <button 
            key={idx}
            onClick={() => navigate(item.path)}
            className="w-full bg-white border border-slate-100 p-5 rounded-[1.5rem] flex items-center justify-between shadow-sm active:scale-[0.98] transition-all hover:bg-slate-50 group"
          >
            <div className="flex items-center gap-5">
              <div className="p-3 bg-slate-50 rounded-2xl group-hover:bg-white transition-colors">
                  <item.icon className="w-6 h-6 text-slate-500" />
              </div>
              <div className="text-left">
                <h2 className="text-lg font-bold text-slate-800 leading-tight">{item.title}</h2>
                <p className="text-xs text-slate-400 font-medium">{item.sub}</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-colors" />
          </button>
        ))}
      </div>

      <div className="mt-16 text-center">
        <p className="text-[10px] text-slate-300 font-bold uppercase tracking-[0.2em]">LogiCount Pro Modular Architecture</p>
      </div>
    </div>
  );
};
