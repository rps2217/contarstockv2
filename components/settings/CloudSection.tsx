
import React, { useState } from 'react';
import { Cloud, Key, Database, Table as TableIcon, QrCode, Smartphone, CheckCircle2, X, Copy, ClipboardCheck } from 'lucide-react';
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
    const [copied, setCopied] = useState(false);

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
        receptionTableName: 'RECEPCION_BULTOS'
    };

    const qrData = JSON.stringify({ t: 'lc_cfg', v: 2, cfg: config });
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrData)}`;

    const handleQRScan = (data: string) => {
        try {
            const parsed = JSON.parse(data);
            if (parsed.t === 'lc_cfg' && parsed.cfg) {
                updateSetting('appSheetConfig', parsed.cfg);
                setFeedback("Configuración vinculada correctamente");
                if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
                setTimeout(() => setFeedback(null), 4000);
            } else {
                alert("Código no reconocido.");
            }
        } catch (e) { alert("Error de lectura QR."); }
        setIsScanning(false);
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(qrData);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <section className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                <div>
                    <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                        <Cloud className="w-6 h-6 text-blue-600" /> Nube
                    </h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">AppSheet Connector</p>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setIsScanning(true)}
                        className="h-12 w-12 flex items-center justify-center bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 shadow-md shadow-indigo-100 transition-all active:scale-90"
                    >
                        <Smartphone className="w-5 h-5" />
                    </button>
                    <button 
                        onClick={() => setShowQRModal(true)}
                        className="h-12 w-12 flex items-center justify-center bg-white border-2 border-slate-100 text-slate-600 rounded-2xl hover:bg-slate-50 transition-all active:scale-90"
                    >
                        <QrCode className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {feedback && (
                <div className="bg-emerald-600 text-white px-6 py-3 text-[10px] font-black uppercase flex items-center gap-2 animate-in slide-in-from-top-2">
                    <CheckCircle2 className="w-4 h-4" /> {feedback}
                </div>
            )}
            
            <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">App ID (GCP)</label>
                        <div className="relative">
                            <Database className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                            <input 
                                type="text" value={config.appId} 
                                onChange={(e) => handleConfigChange('appId', e.target.value)}
                                className="w-full h-14 pl-12 pr-4 bg-slate-50 border-2 border-transparent rounded-2xl text-sm font-bold focus:bg-white focus:border-blue-500 outline-none transition-all placeholder:text-slate-300"
                                placeholder="ID Aplicación"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Access Key</label>
                        <div className="relative">
                            <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                            <input 
                                type="password" value={config.accessKey} 
                                onChange={(e) => handleConfigChange('accessKey', e.target.value)}
                                className="w-full h-14 pl-12 pr-4 bg-slate-50 border-2 border-transparent rounded-2xl text-sm font-bold focus:bg-white focus:border-blue-500 outline-none transition-all placeholder:text-slate-300"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>
                </div>

                <div className="pt-6 border-t border-slate-100">
                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] mb-4 text-center">Definición de Tablas</p>
                    <div className="space-y-3">
                        {['countsTableName', 'productsTableName', 'receptionTableName'].map((field) => (
                            <div key={field} className="relative">
                                <TableIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                <input 
                                    type="text" 
                                    value={(config as any)[field]} 
                                    onChange={(e) => handleConfigChange(field as any, e.target.value)}
                                    className="w-full h-12 pl-12 pr-4 bg-white border-2 border-slate-100 rounded-xl text-xs font-bold outline-none focus:border-blue-500 transition-all uppercase tracking-wide placeholder:text-slate-200"
                                    placeholder={field === 'countsTableName' ? 'TABLA CONTEOS' : (field === 'productsTableName' ? 'TABLA PRODUCTOS' : 'TABLA RECEPCIÓN')}
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[8px] font-black text-slate-300 uppercase tracking-widest pointer-events-none">
                                    {field.replace('TableName', '')}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {showQRModal && (
                <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm text-center shadow-2xl relative animate-in zoom-in-95 duration-300">
                        <button onClick={() => setShowQRModal(false)} className="absolute top-6 right-6 text-slate-300 hover:text-slate-900 transition-colors p-2 bg-slate-50 rounded-full"><X className="w-5 h-5" /></button>
                        <h3 className="text-xl font-black text-slate-900 mb-1">Exportar Config</h3>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-6">Escanee en otro dispositivo</p>
                        
                        <div className="bg-white p-4 rounded-[2rem] border-4 border-slate-50 mb-6 inline-block shadow-inner">
                            <img src={qrImageUrl} alt="Config QR" className="w-48 h-48 mx-auto mix-blend-multiply" />
                        </div>
                        
                        <div className="flex flex-col gap-3">
                            <button onClick={copyToClipboard} className={`w-full py-4 rounded-2xl font-black flex items-center justify-center gap-2 transition-all text-xs uppercase tracking-widest ${copied ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-600'}`}>
                                {copied ? <ClipboardCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                {copied ? 'Copiado' : 'Copiar JSON'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isScanning && <CameraScanner onScan={handleQRScan} onClose={() => setIsScanning(false)} />}
        </section>
    );
};
