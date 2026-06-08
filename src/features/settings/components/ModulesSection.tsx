import React from 'react';
import { LayoutGrid, AlertCircle } from 'lucide-react';
import { getModules, toggleModule } from '../../../services/moduleManager';

export const ModulesSection: React.FC = () => {
    const [modules, setModules] = React.useState(getModules());

    const handleToggle = async (key: string, enabled: boolean) => {
        await toggleModule(key, enabled);
        setModules(getModules());
    };

    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-6 rounded-2xl shadow-sm">
            <div className="flex items-center gap-3 mb-6">
                <LayoutGrid className="w-5 h-5 text-indigo-500" />
                <h2 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-wider">
                    Gestión de Módulos (Lego)
                </h2>
            </div>
            
            <div className="space-y-3">
                {Object.entries(modules).map(([key, config]) => (
                    <div key={key} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                        <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${config.enabled ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                            <span className="font-bold text-slate-700 dark:text-slate-200">{config.name}</span>
                        </div>
                        <button
                            onClick={() => handleToggle(key, !config.enabled)}
                            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                                config.enabled 
                                ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-500 hover:bg-slate-300'
                            }`}
                        >
                            {config.enabled ? 'Activo' : 'Inactivo'}
                        </button>
                    </div>
                ))}
            </div>
             <div className="mt-6 flex items-start gap-3 p-4 bg-indigo-50 dark:bg-indigo-900/10 rounded-xl text-indigo-800 dark:text-indigo-400">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p className="text-[11px] font-medium leading-relaxed">
                    Al desactivar un módulo, este desaparecerá del menú lateral y las rutas asociadas serán inaccesibles. La configuración se guarda localmente.
                </p>
            </div>
        </div>
    );
};
