
import React, { useState } from 'react';
import { Smartphone, Zap, QrCode, Share2, Copy, Check, X, MonitorSmartphone } from 'lucide-react';
import { AppSettings, AppSheetConfig } from '../../types';
import { CameraScanner } from '../CameraScanner';

interface Props {
    settings: AppSettings;
    updateSetting: (key: keyof AppSettings, value: any) => void;
}

export const CloudSection: React.FC<Props> = ({ settings, updateSetting }) => {
    const [isScanning, setIsScanning] = useState(false);
    const [showExportQR, setShowExportQR] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);

    const config = settings.appSheetConfig || {
        appId: '',
        accessKey: '',
        countsTableName: '',
        productsTableName: '',
        receptionTableName: 'RECEPCION_BULTOS',
        gasWebAppUrl: ''
    };

    const configPayload = JSON.stringify({
        t: 'lc_cfg',
        cfg: config
    });

    const handleConfigChange = (key: keyof AppSheetConfig, value: string) => {
        updateSetting('appSheetConfig', {
            ...config,
            [key]: value
        });
    };

    const handleCopyConfig = async () => {
        try {
            await navigator.clipboard.writeText(configPayload);
            setCopySuccess(true);
            if (navigator.vibrate) navigator.vibrate(20);
            setTimeout(() => setCopySuccess(false), 2000);
        } catch (err) {
            alert("No se pudo copiar al portapapeles.");
        }
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

    // URL para generar el QR dinámicamente usando un servicio ligero y seguro
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(configPayload)}`;

    return (
        <div className="space-y-8 animate-in slide-in-from-bottom-2 pb-10">
            
            <div className="bg-black text-white p-6 rounded-[2.5rem] shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                
                <div className="flex justify-between items-start mb-6 relative z-10">
                    <div>
                        <h3 className="text-xl font-black uppercase italic leading-tight">AppSheet API</h3>
                        <p className="text-[10px] text-white/50 font-bold uppercase tracking-widest mt-1">Conectividad Cloud</p>
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setShowExportQR(true)}
                            className="bg-white/10 hover:bg-white/20 p-3 rounded-xl border border-white/10 transition-all active:scale-95"
                            title="Mostrar QR de Exportación"
                        >
                            <QrCode className="w-5 h-5 text-white" />
                        </button>
                        <button 
                            onClick={() => setIsScanning(true)} 
                            className="bg-blue-600 hover:bg-blue-500 p-3 rounded-xl shadow-lg active:scale-95 transition-all"
                            title="Importar desde otro QR"
                        >
                            <MonitorSmartphone className="w-5 h-5 text-white" />
                        </button>
                    </div>
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
                <div className="flex items-center justify-between px-2">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Mapeo de Tablas</h3>
                    <button onClick={handleCopyConfig} className="text-[8px] font-black text-blue-600 uppercase flex items-center gap-1">
                        {copySuccess ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {copySuccess ? 'Copiado' : 'Copiar JSON'}
                    </button>
                </div>
                <InputField label="Tabla Inventario" value={config.countsTableName} field="countsTableName" placeholder="CONTEOS" />
                <InputField label="Tabla Productos" value={config.productsTableName} field="productsTableName" placeholder="PRODUCTOS" />
                <InputField label="Tabla Recepción" value={config.receptionTableName} field="receptionTableName" placeholder="RECEPCION" />
            </div>

            <div className="bg-amber-50 border-2 border-amber-100 rounded-[2rem] p-6 relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 opacity-5">
                    <Zap className="w-24 h-24 text-amber-900" />
                </div>
                <div className="flex items-center gap-3 mb-4">
                    <div className="bg-amber-100 p-2 rounded-lg text-amber-600"><Zap className="w-5 h-5" /></div>
                    <h3 className="text-sm font-black text-amber-800 uppercase tracking-wide">Google Script Turbo</h3>
                </div>
                <input 
                    value={config.gasWebAppUrl || ''} 
                    onChange={(e) => handleConfigChange('gasWebAppUrl', e.target.value)}
                    className="w-full h-12 px-4 bg-white border border-amber-200 rounded-xl text-[10px] font-mono text-amber-900 focus:border-amber-500 outline-none"
                    placeholder="https://script.google.com/..."
                />
            </div>

            {/* MODAL DE EXPORTACIÓN QR */}
            {showExportQR && (
                <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-sm rounded-[3rem] p-8 text-center shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-2 bg-blue-600"></div>
                        <button onClick={() => setShowExportQR(false)} className="absolute top-6 right-6 p-2 bg-slate-100 rounded-full text-slate-400 active:bg-rose-100 active:text-rose-600 transition-all">
                            <X className="w-6 h-6" />
                        </button>
                        
                        <div className="mb-8 mt-4">
                            <h2 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Clonar Terminal</h2>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Escanee con otro dispositivo</p>
                        </div>

                        <div className="bg-white p-4 border-4 border-slate-900 rounded-3xl inline-block shadow-inner mb-8">
                            <img 
                                src={qrUrl} 
                                alt="Config QR" 
                                className="w-64 h-64"
                                onLoad={() => { if (navigator.vibrate) navigator.vibrate(50); }}
                            />
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-center gap-2 text-emerald-600">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                <span className="text-[10px] font-black uppercase tracking-widest">Paquete lc_cfg Generado</span>
                            </div>
                            <button 
                                onClick={() => setShowExportQR(false)}
                                className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs active:scale-95 transition-all shadow-xl"
                            >
                                Finalizar Exportación
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isScanning && (
                <CameraScanner 
                    isTriggered={true}
                    onScan={(data) => { 
                        try {
                            const p = JSON.parse(data);
                            if (p.t === 'lc_cfg' && p.cfg) {
                                updateSetting('appSheetConfig', p.cfg);
                                alert("Configuración cargada con éxito. Terminal vinculada.");
                            } else {
                                alert("Código QR no reconocido como configuración de LogiCount Pro.");
                            }
                        } catch (e) {
                            alert("Error al leer el código. Asegúrese de que sea un QR de LogiCount.");
                        }
                        setIsScanning(false);
                    }} onClose={() => setIsScanning(false)} />
            )}
        </div>
    );
};
