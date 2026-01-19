
import React, { useState } from 'react';
import { Smartphone, Zap, QrCode } from 'lucide-react';
import { AppSettings, AppSheetConfig } from '../../types';
import { CameraScanner } from '../CameraScanner';

interface Props {
    settings: AppSettings;
    updateSetting: (key: keyof AppSettings, value: any) => void;
}

export const CloudSection: React.FC<Props> = ({ settings, updateSetting }) => {
    const [isScanning, setIsScanning] = useState(false);

    const handleConfigChange = (key: keyof AppSheetConfig, value: string) => {
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
        receptionTableName: 'RECEPCION_BULTOS',
        gasWebAppUrl: ''
    };

    const InputField = ({ label, value, field, type = "text", placeholder }: any) => (
        <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">{label}</label>
            <input 
                type={type} 
                value={value} 
                onChange={(e) => handleConfigChange(field, e.target.value)}
                className="w-full h-14 px-4 bg-slate-100 border-2 border-slate-200 rounded-xl font-mono text-sm font-bold text-slate-900 focus:bg-white focus:border-black focus:ring-4 focus:ring-slate-100 outline-none transition-all placeholder:text-slate-300"
                placeholder={placeholder || "---"}
            />
        </div>
    );

    return (
        <div className="space-y-8 animate-in slide-in-from-bottom-2 pb-10">
            
            <div className="bg-black text-white p-6 rounded-[2.5rem] shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                <div className="flex justify-between items-start mb-6 relative z-10">
                    <div>
                        <h3 className="text-xl font-black uppercase italic">AppSheet API</h3>
                        <p className="text-[10px] text-white/50 font-bold uppercase tracking-widest mt-1">Credenciales Core</p>
                    </div>
                    <button 
                        onClick={() => setIsScanning(true)} 
                        className="bg-white/20 hover:bg-white/30 p-3 rounded-xl backdrop-blur-md active:scale-95 transition-all"
                    >
                        <QrCode className="w-6 h-6 text-white" />
                    </button>
                </div>

                <div className="space-y-4 relative z-10">
                    <div className="space-y-1">
                        <label className="text-[8px] font-black text-white/40 uppercase tracking-widest">Application ID</label>
                        <input 
                            value={config.appId} 
                            onChange={(e) => handleConfigChange('appId', e.target.value)}
                            className="w-full bg-white/10 border border-white/10 rounded-xl p-3 font-mono text-xs text-white placeholder:text-white/20 focus:bg-white/20 outline-none"
                            placeholder="uuid-app-id"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[8px] font-black text-white/40 uppercase tracking-widest">Access Key</label>
                        <input 
                            type="password"
                            value={config.accessKey} 
                            onChange={(e) => handleConfigChange('accessKey', e.target.value)}
                            className="w-full bg-white/10 border border-white/10 rounded-xl p-3 font-mono text-xs text-white placeholder:text-white/20 focus:bg-white/20 outline-none"
                            placeholder="••••••••"
                        />
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="ml-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Tablas de Datos</h3>
                <InputField label="Tabla Inventario" value={config.countsTableName} field="countsTableName" placeholder="CONTEOS" />
                <InputField label="Tabla Productos" value={config.productsTableName} field="productsTableName" placeholder="PRODUCTOS" />
                <InputField label="Tabla Recepción" value={config.receptionTableName} field="receptionTableName" placeholder="RECEPCION" />
            </div>

            <div className="bg-amber-50 border-2 border-amber-100 rounded-[2rem] p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="bg-amber-100 p-2 rounded-lg text-amber-600"><Zap className="w-5 h-5" /></div>
                    <h3 className="text-sm font-black text-amber-800 uppercase tracking-wide">Google Script (Turbo)</h3>
                </div>
                <input 
                    value={config.gasWebAppUrl || ''} 
                    onChange={(e) => handleConfigChange('gasWebAppUrl', e.target.value)}
                    className="w-full h-12 px-4 bg-white border border-amber-200 rounded-xl text-[10px] font-mono text-amber-900 focus:border-amber-500 outline-none placeholder:text-amber-200/50"
                    placeholder="https://script.google.com/macros/s/..."
                />
            </div>

            {isScanning && (
                <CameraScanner onScan={(data) => { 
                    try {
                        const p = JSON.parse(data);
                        if (p.t === 'lc_cfg' && p.cfg) {
                            updateSetting('appSheetConfig', p.cfg);
                            alert("Configuración Cargada");
                        }
                    } catch (e) {}
                    setIsScanning(false);
                }} onClose={() => setIsScanning(false)} />
            )}
        </div>
    );
};
