
import React, { useState } from 'react';
import { Smartphone, Zap, QrCode, Share2, Copy, Check, X, MonitorSmartphone, DownloadCloud, Loader2, Info, Link2 } from 'lucide-react';
import { AppSettings, AppSheetConfig } from '../../types';
import { CameraScanner } from '../CameraScanner';
import { fetchSystemConfig, callGas } from '../../services/gasService';
import { SoundFX } from '../../services/audio';

interface Props {
    settings: AppSettings;
    updateSetting: (key: keyof AppSettings, value: any) => void;
}

export const CloudSection: React.FC<Props> = ({ settings, updateSetting }) => {
    const [isScanning, setIsScanning] = useState(false);
    const [showExportQR, setShowExportQR] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);
    const [isUpdatingConfig, setIsUpdatingConfig] = useState(false);
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

    const handleDownloadMasterConfig = async () => {
        setIsUpdatingConfig(true);
        try {
            const newConfig = await fetchSystemConfig();
            updateSetting('appSheetConfig', newConfig);
            SoundFX.play('success');
            alert("✅ Configuración actualizada.");
        } catch (err: any) {
            SoundFX.play('error');
            alert(`Error: ${err.message}`);
        } finally {
            setIsUpdatingConfig(false);
        }
    };

    return (
        <div className="space-y-8 animate-in slide-in-from-bottom-2 pb-10">
            <div className="bg-black text-white p-6 rounded-[2.5rem] shadow-xl relative overflow-hidden">
                <h3 className="text-xl font-black uppercase italic">AppSheet API</h3>
                <div className="space-y-4 mt-6">
                    <div className="space-y-1">
                        <label className="text-[8px] font-black text-white/40 uppercase">Application ID</label>
                        <input value={config.appId} onChange={(e) => handleConfigChange('appId', e.target.value)} className="w-full bg-white/10 border border-white/10 rounded-xl p-3 font-mono text-xs text-white" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[8px] font-black text-white/40 uppercase">Access Key</label>
                        <input type="password" value={config.accessKey} onChange={(e) => handleConfigChange('accessKey', e.target.value)} className="w-full bg-white/10 border border-white/10 rounded-xl p-3 font-mono text-xs text-white" />
                    </div>
                </div>
            </div>

            <div className="px-1 space-y-3">
                <button 
                    onClick={handleDownloadMasterConfig}
                    disabled={isUpdatingConfig}
                    className={`w-full p-6 rounded-[2rem] border-4 flex items-center justify-between transition-all ${isUpdatingConfig ? 'bg-slate-100 border-slate-200' : 'bg-indigo-600 border-indigo-700 text-white shadow-lg'}`}
                >
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/20 rounded-2xl">
                            {isUpdatingConfig ? <Loader2 className="animate-spin" /> : <DownloadCloud />}
                        </div>
                        <div className="text-left">
                            <div className="font-black uppercase text-xs">Sincronizar Terminal</div>
                            <div className="text-[10px] font-bold opacity-80 uppercase">Leer CONFIG_SISTEMA</div>
                        </div>
                    </div>
                    <Zap className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                </button>

                <button 
                    onClick={handleTestConnection}
                    className={`w-full py-4 rounded-2xl border-2 font-black text-xs uppercase tracking-widest transition-all ${testStatus === 'ok' ? 'bg-emerald-500 border-emerald-600 text-white' : (testStatus === 'fail' ? 'bg-rose-500 border-rose-600 text-white' : 'bg-white border-slate-200 text-slate-600')}`}
                >
                    {testStatus === 'testing' ? <Loader2 className="animate-spin mx-auto" /> : (testStatus === 'ok' ? '¡CONEXIÓN EXITOSA!' : (testStatus === 'fail' ? 'ERROR DE VÍNCULO' : 'PROBAR CONEXIÓN'))}
                </button>
            </div>

            <div className="space-y-4">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] px-2">Mapeo de Tablas</h3>
                <input value={config.countsTableName} onChange={(e) => handleConfigChange('countsTableName', e.target.value)} className="w-full h-14 px-4 bg-slate-100 border-2 border-slate-200 rounded-xl font-bold" placeholder="Tabla Logs" />
                <input value={config.consolidatedTableName} onChange={(e) => handleConfigChange('consolidatedTableName', e.target.value)} className="w-full h-14 px-4 bg-slate-100 border-2 border-slate-200 rounded-xl font-bold" placeholder="Tabla Resumen" />
            </div>

            <div className="bg-amber-50 border-2 border-amber-100 rounded-[2rem] p-6">
                <div className="flex items-center gap-3 mb-4">
                    <Link2 className="text-amber-600" />
                    <h3 className="text-sm font-black text-amber-800 uppercase">Google Script URL</h3>
                </div>
                <input value={config.gasWebAppUrl || ''} onChange={(e) => handleConfigChange('gasWebAppUrl', e.target.value)} className="w-full h-12 px-4 bg-white border border-amber-200 rounded-xl text-[10px] font-mono" placeholder="https://script.google.com/..." />
            </div>
        </div>
    );
};
