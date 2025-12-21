
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

    // Generar string para el QR (JSON compacto para configuración rápida)
    const qrData = JSON.stringify({
        t: 'lc_cfg',
        v: 2,
        cfg: config
    });
    
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
                alert("Código no reconocido como configuración de LogiCount.");
            }
        } catch (e) {
            alert("Error al leer el código QR.");
        }
        setIsScanning(false);
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(qrData);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <section className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
                <div>
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Cloud className="w-5 h-5 text-blue-600" /> Sincronización Nube
                    </h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">AppSheet API Connector</p>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setIsScanning(true)}
                        className="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-md shadow-indigo-100 transition-all active:scale-90"
                        title="Escanear Configuración de otro móvil"
                    >
                        <Smartphone className="w-5 h-5" />
                    </button>
                    <button 
                        onClick={() => setShowQRModal(true)}
                        className="p-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-all active:scale-90"
                        title="Compartir mi configuración vía QR"
                    >
                        <QrCode className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {feedback && (
                <div className="bg-emerald-600 text-white px-6 py-2.5 text-[10px] font-black uppercase flex items-center gap-2 animate-in slide-in-from-top-2">
                    <CheckCircle2 className="w-4 h-4" /> {feedback}
                </div>
            )}
            
            <div className="p-6 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">App ID (GCP Project)</label>
                        <div className="relative">
                            <Database className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                            <input 
                                type="text" value={config.appId} 
                                onChange={(e) => handleConfigChange('appId', e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-4 focus:ring-blue-500/5 outline-none transition-all"
                                placeholder="ID de la aplicación"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Access Key</label>
                        <div className="relative">
                            <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                            <input 
                                type="password" value={config.accessKey} 
                                onChange={(e) => handleConfigChange('accessKey', e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-4 focus:ring-blue-500/5 outline-none transition-all"
                                placeholder="••••••••••••••••"
                            />
                        </div>
                    </div>
                </div>

                <div className="pt-4 border-t border-slate-50">
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-4">Mapeo de Tablas</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider ml-1">Conteos</label>
                            <div className="relative">
                                <TableIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
                                <input 
                                    type="text" value={config.countsTableName} 
                                    onChange={(e) => handleConfigChange('countsTableName', e.target.value)}
                                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-blue-500"
                                    placeholder="Nombre Tabla"
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider ml-1">Productos</label>
                            <div className="relative">
                                <TableIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
                                <input 
                                    type="text" value={config.productsTableName} 
                                    onChange={(e) => handleConfigChange('productsTableName', e.target.value)}
                                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-blue-500"
                                    placeholder="Maestro SKUs"
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider ml-1">Recepción</label>
                            <div className="relative">
                                <TableIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
                                <input 
                                    type="text" value={config.receptionTableName} 
                                    onChange={(e) => handleConfigChange('receptionTableName', e.target.value)}
                                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-blue-500"
                                    placeholder="Bitácora Bultos"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* MODAL EXPORTAR QR */}
            {showQRModal && (
                <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm text-center shadow-2xl relative animate-in zoom-in-95 duration-300">
                        <button onClick={() => setShowQRModal(false)} className="absolute top-6 right-6 text-slate-300 hover:text-slate-900 transition-colors p-2"><X className="w-6 h-6" /></button>
                        <div className="mb-6">
                            <h3 className="text-xl font-black text-slate-900 mb-1">Configuración Rápida</h3>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider px-4">Escanee este código desde el otro dispositivo para vincular la nube al instante</p>
                        </div>
                        <div className="bg-white p-6 rounded-[2rem] border-4 border-slate-50 mb-6 inline-block shadow-inner">
                            <img src={qrImageUrl} alt="Config QR" className="w-48 h-48 mx-auto mix-blend-multiply" />
                        </div>
                        
                        <div className="flex flex-col gap-3">
                            <button 
                                onClick={copyToClipboard}
                                className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all text-xs uppercase tracking-widest ${copied ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                            >
                                {copied ? <ClipboardCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                {copied ? 'Copiado al Portapapeles' : 'Copiar Texto de Config.'}
                            </button>
                            <button 
                                onClick={() => setShowQRModal(false)}
                                className="w-full bg-slate-900 text-white font-black py-5 rounded-2xl shadow-xl active:scale-95 transition-all text-xs uppercase tracking-widest"
                            >
                                Finalizar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ESCANER PARA IMPORTAR */}
            {isScanning && (
                <div className="contents">
                    <CameraScanner onScan={handleQRScan} onClose={() => setIsScanning(false)} />
                </div>
            )}
        </section>
    );
};
