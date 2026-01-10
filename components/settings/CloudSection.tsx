
import React, { useState } from 'react';
import { Cloud, Key, Database, Table as TableIcon, QrCode, Smartphone, CheckCircle2, X, Copy, ClipboardCheck, Zap } from 'lucide-react';
import { AppSettings, AppSheetConfig } from '../../types';
import { CameraScanner } from '../CameraScanner';

interface Props {
    settings: AppSettings;
    updateSetting: (key: keyof AppSettings, value: any) => void;
}

export const CloudSection: React.FC<Props> = ({ settings, updateSetting }) => {
    const [showQRModal, setShowQRModal] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [feedback, setFeedback] = useState<string | null>(null);

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

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-[2.5rem] shadow-xl border-4 border-black p-8">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-2xl font-black text-black uppercase italic">Configuración Cloud</h2>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Sincronización Avanzada</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setIsScanning(true)} className="p-4 bg-black text-white rounded-2xl active:scale-90"><Smartphone className="w-6 h-6" /></button>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-black uppercase tracking-[0.2em] ml-2">ID de Aplicación</label>
                        <input 
                            type="text" value={config.appId} 
                            inputMode="text"
                            onChange={(e) => handleConfigChange('appId', e.target.value)}
                            className="w-full h-16 px-6 bg-slate-50 border-4 border-slate-100 rounded-3xl text-lg font-black text-black focus:border-blue-600 outline-none transition-all placeholder:text-slate-300"
                            placeholder="ID AppSheet"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-black uppercase tracking-[0.2em] ml-2">Clave de Acceso</label>
                        <input 
                            type="password" value={config.accessKey} 
                            onChange={(e) => handleConfigChange('accessKey', e.target.value)}
                            className="w-full h-16 px-6 bg-slate-50 border-4 border-slate-100 rounded-3xl text-lg font-black text-black focus:border-blue-600 outline-none transition-all placeholder:text-slate-300"
                            placeholder="••••••••"
                        />
                    </div>

                    {/* NUEVO: Campo GAS Turbo-Sync */}
                    <div className="space-y-2 pt-4 border-t-2 border-slate-50">
                        <div className="flex items-center gap-2 mb-2 ml-2">
                            <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                            <label className="text-[10px] font-black text-amber-600 uppercase tracking-[0.2em]">Turbo-Sync Web App (GAS)</label>
                        </div>
                        <input 
                            type="text" value={config.gasWebAppUrl || ''} 
                            onChange={(e) => handleConfigChange('gasWebAppUrl', e.target.value)}
                            className="w-full h-14 px-6 bg-amber-50 border-2 border-amber-100 rounded-2xl text-xs font-bold text-slate-700 focus:border-amber-500 outline-none transition-all placeholder:text-amber-200"
                            placeholder="https://script.google.com/macros/s/.../exec"
                        />
                        <p className="text-[8px] text-slate-400 italic px-2">Escritura masiva instantánea. Recomendado para bultos grandes.</p>
                    </div>
                </div>

                <div className="mt-10 pt-8 border-t-4 border-slate-50">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.4em] mb-6 text-center">Nombres de Tablas</h3>
                    <div className="space-y-4">
                        {[
                            {k: 'countsTableName', l: 'Tabla Conteos'},
                            {k: 'productsTableName', l: 'Tabla Productos'},
                            {k: 'receptionTableName', l: 'Tabla Recepción'}
                        ].map((field) => (
                            <div key={field.k} className="relative">
                                <input 
                                    type="text" 
                                    value={(config as any)[field.k]} 
                                    onChange={(e) => handleConfigChange(field.k as any, e.target.value)}
                                    className="w-full h-14 pl-6 pr-24 bg-white border-2 border-slate-200 rounded-2xl text-sm font-black text-black focus:border-blue-600 outline-none transition-all uppercase"
                                    placeholder={field.l}
                                />
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[8px] font-black text-slate-400 uppercase tracking-widest">{field.l.split(' ')[1]}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {isScanning && (
                <CameraScanner onScan={(data) => { 
                    try {
                        const p = JSON.parse(data);
                        if (p.t === 'lc_cfg' && p.cfg) {
                            updateSetting('appSheetConfig', p.cfg);
                            alert("✅ Configuración Importada");
                        }
                    } catch (e) {}
                    setIsScanning(false);
                }} onClose={() => setIsScanning(false)} />
            )}
        </div>
    );
};
