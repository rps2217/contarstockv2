
import React from 'react';
import { LayoutTemplate, Home, Database, History, Layers, Container, Fingerprint, Cloud } from 'lucide-react';
import { AppSettings, ViewState } from '../../types';

interface Props {
    settings: AppSettings;
    updateSetting: (key: keyof AppSettings, value: any) => void;
}

export const NavigationSection: React.FC<Props> = ({ settings, updateSetting }) => {
    const availableNavItems: {id: ViewState, label: string, icon: any}[] = [
        { id: 'dashboard', label: 'Inicio', icon: Home },
        { id: 'database', label: 'Datos', icon: Database },
        { id: 'reports', label: 'Historial', icon: History },
        { id: 'consolidated', label: 'Consol.', icon: Layers },
        { id: 'reception', label: 'Recep.', icon: Container },
        { id: 'conciliator', label: 'Detect.', icon: Fingerprint },
        { id: 'sync', label: 'Nube', icon: Cloud },
    ];

    const toggleNavOption = (id: ViewState) => {
        let current = settings.mobileNavConfig || ['dashboard', 'database', 'reports'];
        if (current.includes(id)) {
            if (current.length <= 1) return;
            current = current.filter(i => i !== id);
        } else {
            if (current.length >= 5) {
                alert("Máximo 5 elementos permitidos.");
                return;
            }
            current = [...current, id];
        }
        updateSetting('mobileNavConfig', current);
    };

    return (
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <LayoutTemplate className="w-5 h-5 text-indigo-600" /> Navegación Móvil
            </h2>
            <p className="text-[10px] text-slate-500 mb-6 uppercase font-bold tracking-widest">Dock inferior (Máx 5)</p>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {availableNavItems.map(item => {
                    const isActive = (settings.mobileNavConfig || []).includes(item.id);
                    const Icon = item.icon;
                    return (
                        <button 
                            key={item.id}
                            onClick={() => toggleNavOption(item.id)}
                            className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${
                                isActive 
                                ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm' 
                                : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                            }`}
                        >
                            <Icon className="w-6 h-6 mb-2" />
                            <span className="text-[10px] font-black uppercase">{item.label}</span>
                        </button>
                    );
                })}
            </div>
        </section>
    );
};
