import React from 'react';
import { Home, Database, History, Container, Cloud, Calendar, FileText, Settings, Sparkles, Users, ShieldCheck } from 'lucide-react';
import { AppSettings, ViewState } from '../../../types';

interface Props {
 settings: AppSettings;
 updateSetting: (key: keyof AppSettings, value: any) => void;
}

export const NavigationSection: React.FC<Props> = ({ settings, updateSetting }) => {
  // Lista filtrada: Solo módulos activos en la nueva arquitectura
  const availableNavItems: {id: ViewState, label: string, icon: any}[] = [
    { id: 'dashboard', label: 'Inicio', icon: Home },
    { id: 'reception', label: 'Recepción', icon: Container },
    { id: 'expiry', label: 'Vencimientos', icon: Calendar },
    { id: 'events', label: 'Eventos', icon: FileText },
    { id: 'reports', label: 'Historial', icon: History },
    { id: 'database', label: 'Catálogo', icon: Database },
    { id: 'sync', label: 'Nube', icon: Cloud },
    { id: 'settings', label: 'Ajustes', icon: Settings },
    { id: 'providers' as ViewState, label: 'Proveedores', icon: Container },
    { id: 'customers' as ViewState, label: 'Clientes', icon: Users },
    { id: 'compliance' as ViewState, label: 'Control Canjes', icon: ShieldCheck },
  ];

  const defaultStart = settings.defaultStartModule || 'dashboard';

  return (
    <section className="space-y-8 animate-in slide-in-from-bottom-2">
      
      {/* NUEVO PANEL COMPAÑERO: EL MUELLE INTELIGENTE INFINITO */}
      <div className="space-y-4">
        <div className="flex justify-between items-center px-4">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Muelle Deslizable Activo</h3>
          <span className="text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest bg-blue-500/10 text-blue-500 border border-blue-500/20 flex items-center gap-1">
            <Sparkles className="w-3 h-3 animate-spin duration-3000" /> Nuevo Sistema
          </span>
        </div>
        
        <div className="px-4">
          <div className="bg-slate-900 border border-white/5 rounded-[2.5rem] p-6 shadow-xl relative overflow-hidden">
            <div className="absolute right-0 top-0 w-32 h-32 bg-blue-500/10 blur-[40px] pointer-events-none rounded-full" />
            
            <h4 className="text-white text-sm font-black uppercase tracking-wider mb-2">¡Navegación Sin Límites!</h4>
            <p className="text-xs text-slate-400 leading-relaxed mb-6">
              Hemos implementado la mejor solución según estándares móviles de alta densidad: un <strong>Muelle Deslizable de Alta Fidelidad</strong>. 
              Ahora tienes acceso inmediato a todos los módulos activos directamente desde el dock inferior:
            </p>

            {/* Visual Mini Preview Schema of the Horizontal Dock */}
            <div className="bg-slate-950/80 border border-white/10 rounded-2xl p-4 flex flex-col gap-3 relative mb-6">
              <div className="flex justify-between items-center">
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Vista Previa Táctil</span>
                <span className="text-[8px] font-black text-blue-400 tracking-wider">DESLIZA EN EL DE ACAPARADO ↔</span>
              </div>
              <div className="flex items-center gap-4 overflow-x-auto no-scrollbar py-2 border-y border-white/5">
                {availableNavItems.slice(0, 6).map((item, idx) => {
                  const Icon = item.icon;
                  const isActive = idx === 1; // Highlight second item as a mock active state
                  return (
                    <div key={item.id} className="flex flex-col items-center gap-1.5 shrink-0 min-w-[55px] opacity-80">
                      <div className={`p-2 rounded-xl ${isActive ? 'bg-blue-500/20 text-blue-400 scale-105' : 'bg-white/5 text-slate-500'}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className={`text-[7px] font-black tracking-widest ${isActive ? 'text-blue-400' : 'text-slate-500'}`}>{item.label.toUpperCase()}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3.5 text-xs text-slate-300 bg-white/5 p-4 rounded-2xl border border-white/5">
              <div className="flex gap-3">
                <div className="w-5 h-5 bg-blue-500/20 text-blue-400 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-black">1</div>
                <div>
                  <p className="font-bold text-white uppercase tracking-wider text-[10px]">Autofoco Inteligente</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Al cambiar de módulo o recargar la app, el muelle se desplaza automáticamente y centra el módulo activo.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-5 h-5 bg-blue-500/20 text-blue-400 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-black">2</div>
                <div>
                  <p className="font-bold text-white uppercase tracking-wider text-[10px]">Efecto Espejo Gradual</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Máscara de bordes transparentes derecha/izquierda en tiempo real que señala la disponibilidad de más módulos.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-5 h-5 bg-blue-500/20 text-blue-400 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-black">3</div>
                <div>
                  <p className="font-bold text-white uppercase tracking-wider text-[10px]">Gestión de Visibilidad</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Puedes habilitar o deshabilitar módulos completos desde la sección <strong>Módulos y Licencias</strong> (pestaña Soporte y Sys), la cual actualizará el muelle dinámicamente.</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
};
