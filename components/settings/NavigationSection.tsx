
import React from 'react';
import { Home, Database, History, Container, Cloud } from 'lucide-react';
import { AppSettings, ViewState } from '../../types';

interface Props {
 settings: AppSettings;
 updateSetting: (key: keyof AppSettings, value: any) => void;
}

export const NavigationSection: React.FC<Props> = ({ settings, updateSetting }) => {
 // Lista filtrada: Solo módulos activos en la nueva arquitectura
 const availableNavItems: {id: ViewState, label: string, icon: any}[] = [
 { id: 'dashboard', label: 'Métricas', icon: Home },
 { id: 'reports', label: 'Historial', icon: History },
 { id: 'database', label: 'Catálogo', icon: Database },
 { id: 'reception', label: 'Recepción', icon: Container },
 { id: 'sync', label: 'Nube', icon: Cloud },
 ];

 const currentNav = settings.mobileNavConfig || ['dashboard', 'reports', 'sync'];

 const toggleNavOption = (id: ViewState) => {
 let next = [...currentNav];
 if (next.includes(id)) {
 if (next.length <= 1) return;
 next = next.filter(i => i !== id);
 } else {
 if (next.length >= 5) {
 if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
 return;
 }
 next.push(id);
 }
 if (navigator.vibrate) navigator.vibrate(10);
 updateSetting('mobileNavConfig', next);
 };

 return (
 <section className="space-y-6 animate-in slide-in-from-bottom-2">
 <div className="flex justify-between items-center px-4">
 <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Personalizar Dock</h3>
 <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${currentNav.length === 5 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
 {currentNav.length}/5 Iconos
 </span>
 </div>
 
 <div className="grid grid-cols-1 gap-3">
 {availableNavItems.map(item => {
 const isActive = currentNav.includes(item.id);
 const Icon = item.icon;
 return (
 <button 
 key={item.id}
 onClick={() => toggleNavOption(item.id)}
 className={`
 w-full p-6 rounded-[2.5rem] border-4 flex items-center justify-between transition-all active:scale-[0.97]
 ${isActive 
 ? 'bg-blue-600 border-blue-400 text-white shadow-xl shadow-blue-900/20' 
 : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-white/5 opacity-80'
 }
 `}
 >
 <div className="flex items-center gap-5">
 <div className={`p-4 rounded-2xl ${isActive ? 'bg-white/20 text-white shadow-inner' : 'bg-slate-100 dark:bg-black/20 text-slate-400'}`}>
 <Icon className="w-7 h-7 stroke-[2.5px]" />
 </div>
 <span className={`text-sm font-black uppercase tracking-widest ${isActive ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
 {item.label}
 </span>
 </div>
 
 <div className={`w-8 h-8 rounded-full border-4 flex items-center justify-center transition-all ${isActive ? 'bg-white border-white' : 'border-slate-200 dark:border-white/10'}`}>
 {isActive && <div className="w-3 h-3 bg-blue-600 rounded-full"></div>}
 </div>
 </button>
 );
 })}
 </div>
 </section>
 );
};
