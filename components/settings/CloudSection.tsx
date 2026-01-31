
import React, { useState } from 'react';
import { Smartphone, Zap, QrCode, Share2, Copy, Check, X, MonitorSmartphone, DownloadCloud, Loader2, Info, Link2, FileSpreadsheet } from 'lucide-react';
import { AppSettings, AppSheetConfig } from '../../types';
import { bootstrapConfigById, fetchSystemConfig, callGas } from '../../services/gasService';
import { SoundFX } from '../../services/audio';

interface Props {
    settings: AppSettings;
    updateSetting: (key: keyof AppSettings, value: any) => void;
}

export const CloudSection: React.FC<Props> = ({ settings, updateSetting }) => {
    const [ssIdInput, setSsIdInput] = useState('');
    const [isBootstrapping, setIsBootstrapping] = useState(false);
    const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle');

    const config = settings.appSheetConfig || {
        appId: '',
        accessKey: '',
        countsTableName: 'CONTEOS',
        consolidatedTableName: 'CONSOLIDADO',
        productsTableName: 'PRODUCTOS',
        receptionTableName: 'RECEPCION_BULTOS',
        gasWebAppUrl: ''
    };

    const handleBootstrap = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!ssIdInput) return;
        
        setIsBootstrapping(true);
        try {
            const newConfig = await bootstrapConfigById(ssIdInput);
            updateSetting('appSheetConfig', newConfig);
            SoundFX.play('success');
            setSsIdInput('');
            alert("✅ ¡Vínculo Maestro Exitoso! Todos los parámetros han sido cargados.");
        } catch (err: any) {
            SoundFX.play('error');
            alert(`Error de vinculación: ${err.message}`);
        } finally {
            setIsBootstrapping(false);
        }
    };

    const handleTestConnection = async () => {
        setTestStatus('testing');
        try {
            const res = await callGas('ping', {});
            if (res.success) {
                setTestStatus('ok');
                SoundFX.play('success');
            } else throw new Error();
        } catch (e) {
            setTestStatus('fail');
            SoundFX.play('error');
        }
        setTimeout(() => setTestStatus('idle'), 3000);
    };

    const handleConfigChange = (key: keyof AppSheetConfig, value: string) => {
        updateSetting('appSheetConfig', { ...config, [key]: value });
    };

    return (
        <div className="space-y-8 animate-in slide-in-from-bottom-2 pb-10">
            {/* NUEVO PANEL: ASISTENTE DE VINCULACIÓN POR ID */}
            <div className="bg-indigo-600 p-6 rounded-[2.5rem] shadow-xl text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                        <FileSpreadsheet className="w-6 h-6 text-indigo-200" />
                        <h3 className="text-xl font-black uppercase italic tracking-tighter">Vinculación Maestra</h3>
                    </div>
                    <p className="text-[10px] font-bold text-indigo-100 uppercase tracking-widest mb-6 leading-relaxed">
                        Pega el ID o URL de tu Excel para traer la configuración de respaldo automáticamente.
                    </p>
                    
                    <form onSubmit={handleBootstrap} className="space-y-3">
                        <input 
                            value={ssIdInput}
                            onChange={(e) => setSsIdInput(e.target.value)}
                            placeholder="ID del Spreadsheet..."
                            className="w-full h-14 bg-white/10 border-2 border-white/20 rounded-2xl px-4 text-sm font-bold placeholder:text-white/40 outline-none focus:bg-white/20 focus:border-white transition-all"
                        />
                        <button 
                            disabled={isBootstrapping || !ssIdInput}
                            className="w-full h-14 bg-white text-indigo-600 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isBootstrapping ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-4 h-4 fill-current" />}
                            Vincular Nube
                        </button>
                    </form>
                </div>
            </div>

            {/* PANEL TRADICIONAL DE MANUAL API */}
            <div className="bg-black text-white p-6 rounded-[2.5rem] shadow-xl">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-sm font-black uppercase tracking-widest text-white/50">AppSheet API (Manual)</h3>
                    {config.appId && <Check className="text-emerald-500 w-5 h-5" />}
                </div>
                <div className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-[8px] font-black text-white/40 uppercase ml-2">Application ID</label>
                        <input value={config.appId} onChange={(e) => handleConfigChange('appId', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 font-mono text-[10px] text-white" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[8px] font-black text-white/40 uppercase ml-2">Access Key</label>
                        <input type="password" value={config.accessKey} onChange={(e) => handleConfigChange('accessKey', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 font-mono text-[10px] text-white" />
                    </div>
                </div>
            </div>

            <div className="px-1 space-y-3">
                <button 
                    onClick={handleTestConnection}
                    className={`w-full py-5 rounded-2xl border-4 font-black text-xs uppercase tracking-widest transition-all ${testStatus === 'ok' ? 'bg-emerald-500 border-emerald-600 text-white' : (testStatus === 'fail' ? 'bg-rose-500 border-rose-600 text-white' : 'bg-white border-slate-200 text-slate-600 shadow-sm')}`}
                >
                    {testStatus === 'testing' ? <Loader2 className="animate-spin mx-auto w-5 h-5" /> : (testStatus === 'ok' ? '¡CONEXIÓN EXITOSA!' : (testStatus === 'fail' ? 'ERROR DE VÍNCULO' : 'PROBAR MOTOR CLOUD'))}
                </button>
            </div>

            <div className="space-y-4">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] px-2">Mapeo de Tablas</h3>
                <div className="grid grid-cols-1 gap-2">
                    <input value={config.countsTableName} onChange={(e) => handleConfigChange('countsTableName', e.target.value)} className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs" placeholder="Tabla Logs" />
                    <input value={config.consolidatedTableName} onChange={(e) => handleConfigChange('consolidatedTableName', e.target.value)} className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs" placeholder="Tabla Resumen" />
                </div>
            </div>

            <div className="bg-slate-900 border-2 border-slate-800 rounded-[2rem] p-6 text-white">
                <div className="flex items-center gap-3 mb-4">
                    <Link2 className="text-blue-400 w-5 h-5" />
                    <h3 className="text-xs font-black uppercase tracking-widest">Google Script Endpoint</h3>
                </div>
                <input value={config.gasWebAppUrl || ''} onChange={(e) => handleConfigChange('gasWebAppUrl', e.target.value)} className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-xl text-[9px] font-mono text-blue-300" placeholder="https://script.google.com/..." />
            </div>
        </div>
    );
};
