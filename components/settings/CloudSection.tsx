
import React from 'react';
import { Cloud, Key, Database, Table as TableIcon } from 'lucide-react';
import { AppSettings } from '../../types';

interface Props {
    settings: AppSettings;
    updateSetting: (key: keyof AppSettings, value: any) => void;
}

export const CloudSection: React.FC<Props> = ({ settings, updateSetting }) => {
    const handleConfigChange = (key: string, value: string) => {
        updateSetting('appSheetConfig', {
            ...(settings.appSheetConfig || {}),
            [key]: value
        });
    };

    const config = settings.appSheetConfig || {
        appId: '',
        accessKey: '',
        countsTableName: '',
        productsTableName: '',
        receptionTableName: ''
    };

    return (
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Cloud className="w-5 h-5 text-blue-600" /> Configuración de Nube
            </h2>
            <p className="text-[10px] text-slate-500 mb-6 uppercase font-bold tracking-widest">Conexión con AppSheet API</p>
            
            <div className="space-y-4">
                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">App ID</label>
                    <div className="relative">
                        <Database className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                        <input 
                            type="text" 
                            value={config.appId} 
                            onChange={(e) => handleConfigChange('appId', e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/10 outline-none"
                            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                        />
                    </div>
                </div>

                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Access Key</label>
                    <div className="relative">
                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                        <input 
                            type="password" 
                            value={config.accessKey} 
                            onChange={(e) => handleConfigChange('accessKey', e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/10 outline-none"
                            placeholder="••••••••••••••••"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-50 mt-4">
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Tabla Conteos</label>
                        <div className="relative">
                            <TableIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                            <input 
                                type="text" 
                                value={config.countsTableName} 
                                onChange={(e) => handleConfigChange('countsTableName', e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none"
                                placeholder="REGISTROS_CONTEO"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Tabla Productos</label>
                        <div className="relative">
                            <TableIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                            <input 
                                type="text" 
                                value={config.productsTableName} 
                                onChange={(e) => handleConfigChange('productsTableName', e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none"
                                placeholder="MAESTRO_PRODUCTOS"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};
