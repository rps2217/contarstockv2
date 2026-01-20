
import React from 'react';
import { LayoutTemplate, Home, Database, History, Layers, Container, Fingerprint, Cloud, CheckCircle2 } from 'lucide-react';
import { AppSettings, ViewState } from '../../types';

interface Props {
    settings: AppSettings;
    updateSetting: (key: keyof AppSettings, value: any) => void;
}

export const NavigationSection: React.FC<Props> = ({ settings, updateSetting }) => {
    const availableNavItems: {id: ViewState, label: string, icon: any}[] = [
        { id: 'dashboard', label: 'Métricas', icon: Home },
        { id: 'reports', label: 'Historial', icon: History },
        { id: 'database', label: 'Catálogo', icon: Database },
        { id: 'reception', label: 'Recepción', icon: Container },
        { id: 'consolidated', label: 'Consol.', icon: Layers },
        { id: 'sync', label: 'Nube', icon: Cloud },
        { id: 'conciliator', label: 'Detective', icon: Fingerprint },
    ];

    const currentNav = settings.mobileNavConfig || ['dashboard', 'database', 'reports'];

    const toggleNavOption = (id: ViewState) => {
        let next = [...currentNav];
        
        if (next.includes(id)) {
            if (next.length <= 1) return; // Mínimo 1
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
        <section className="space-y-4 animate-in slide-in-from-bottom-2">
            <div className="flex justify-between items-end px-2">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2">Dock Inferior</h3>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase ${currentNav.length === 5 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                    {currentNav.length}/5 Slots
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
                                w-full p-4 rounded-2xl border-2 flex items-center justify-between transition-all active:scale-[0.99]
                                ${isActive 
                                    ? 'bg-white border-blue-600 shadow-lg shadow-blue-100 z-10' 
                                    : 'bg-slate-50 border-transparent opacity-60 hover:opacity-100'
                                }
                            `}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`p-2.5 rounded-xl ${isActive ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
                                    <Icon className="w-5 h-5" />
                                </div>
                                <span className={`text-xs font-black uppercase tracking-widest ${isActive ? 'text-slate-900' : 'text-slate-400'}`}>
                                    {item.label}
                                </span>
                            </div>
                            
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isActive ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
                                {isActive && <CheckCircle2 className="w-4 h-4 text-white" />}
                            </div>
                        </button>
                    );
                })}
            </div>
        </section>
    );
};
