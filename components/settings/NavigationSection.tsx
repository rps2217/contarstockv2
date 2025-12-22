
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
        let current = [...(settings.mobileNavConfig || ['dashboard', 'database', 'reports'])];
        
        if (current.includes(id)) {
            // No permitir dejar el dock vacío
            if (current.length <= 1) return;
            current = current.filter(i => i !== id);
        } else {
            // Límite de 5 elementos para mantener la estética y usabilidad
            if (current.length >= 5) {
                alert("El Dock inferior admite un máximo de 5 accesos directos.");
                return;
            }
            current.push(id);
        }
        
        updateSetting('mobileNavConfig', current);
        
        // Feedback háptico opcional si está disponible
        if (navigator.vibrate) navigator.vibrate(10);
    };

    return (
        <section className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 p-8">
            <div className="flex items-center gap-3 mb-2">
                <div className="bg-indigo-50 p-2.5 rounded-xl">
                    <LayoutTemplate className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                    <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Navegación Móvil</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Personalizar Dock Inferior</p>
                </div>
            </div>
            
            <p className="text-xs text-slate-500 mb-8 mt-4 leading-relaxed">
                Seleccione hasta <span className="font-bold text-slate-900">5 elementos</span> para anclar en la barra de navegación rápida de su dispositivo móvil.
            </p>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {availableNavItems.map(item => {
                    const isActive = (settings.mobileNavConfig || []).includes(item.id);
                    const Icon = item.icon;
                    return (
                        <button 
                            key={item.id}
                            onClick={() => toggleNavOption(item.id)}
                            className={`flex flex-col items-center justify-center p-5 rounded-[1.5rem] border-2 transition-all duration-300 relative group active:scale-95 ${
                                isActive 
                                ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-md shadow-indigo-100 ring-4 ring-indigo-50' 
                                : 'bg-white border-slate-100 text-slate-300 hover:border-slate-200 hover:text-slate-400'
                            }`}
                        >
                            <Icon className={`w-7 h-7 mb-2 transition-transform group-hover:scale-110 ${isActive ? 'text-indigo-600' : ''}`} />
                            <span className="text-[10px] font-black uppercase tracking-tighter">{item.label}</span>
                            
                            {isActive && (
                                <div className="absolute top-2 right-2 w-2 h-2 bg-indigo-600 rounded-full animate-pulse" />
                            )}
                        </button>
                    );
                })}
            </div>
        </section>
    );
};
