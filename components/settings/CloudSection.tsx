
import React, { useState } from 'react';
import { Smartphone, Zap, QrCode, Share2, Copy, Check, X, MonitorSmartphone, DownloadCloud, Loader2, Info, Link2, FileSpreadsheet, AlertCircle, ShieldAlert, Camera } from 'lucide-react';
import { AppSettings, AppSheetConfig } from '../../types';
import { bootstrapConfigById, fetchSystemConfig, callGas } from '../../services/gasService';
import { SoundFX } from '../../services/audio';
import { CameraScanner } from '../CameraScanner';
import { Modal } from '../common/Modal';

interface Props {
    settings: AppSettings;
    updateSetting: (key: keyof AppSettings, value: any) => void;
}

export const CloudSection: React.FC<Props> = ({ settings, updateSetting }) => {
    const [ssIdInput, setSsIdInput] = useState('');
    const [isBootstrapping, setIsBootstrapping] = useState(false);
    const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle');
    const [showQRModal, setShowQRModal] = useState(false);
    const [isScanningQR, setIsScanningQR] = useState(false);

    const config = settings.appSheetConfig || {
        appId: '',
        accessKey: '',
        countsTableName: 'CONTEOS',
        consolidatedTableName: 'CONSOLIDADO',
        productsTableName: 'PRODUCTOS',
        receptionTableName: 'RECEPCION_BULTOS',
        gasWebAppUrl: ''
    };

    // --- LÓGICA QR (TRANSFERENCIA PDA-TO-PDA) ---

    const generateConfigQR = () => {
        const payload = {
            v: "1.0",
            type: "logicount_config",
            data: config
        };
        // Codificamos en Base64 para evitar problemas con caracteres especiales en el lector
        const encoded = btoa(JSON.stringify(payload));
        return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(encoded)}`;
    };

    const handleQRScanSuccess = (rawCode: string) => {
        try {
            const decoded = atob(rawCode);
            const payload = JSON.parse(decoded);
            
            if (payload.type === 'logicount_config' && payload.data) {
                updateSetting('appSheetConfig', payload.data);
                SoundFX.play('success');
                setIsScanningQR(false);
                alert("✅ Configuración clonada exitosamente vía QR.");
            } else {
                throw new Error("Formato QR no reconocido.");
            }
        } catch (e) {
            SoundFX.play('error');
            alert("❌ El QR escaneado no contiene una configuración válida de LogiCount.");
        }
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
            alert(`Error de vinculación: ${err.message}\n\nREQUISITOS:\n1. Pestaña 'CONFIG_SISTEMA' presente.\n2. Acceso 'Cualquier persona con el enlace'.`);
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
        <div className="space-y-6 animate-in slide-in-from-bottom-2 pb-10">
            
            {/* 1. SECCIÓN PDA-TO-PDA (QR OFFLINE) */}
            <div className="bg-slate-900 p-6 rounded-[2.5rem] shadow-xl text-white border-4 border-black">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <QrCode className="text-blue-400 w-6 h-6" />
                        <h3 className="text-lg font-black uppercase italic tracking-tighter">Clonación QR</h3>
                    </div>
                    <span className="text-[8px] bg-blue-600 px-2 py-0.5 rounded-full font-black uppercase">Offline OK</span>
                </div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-6 leading-relaxed">
                    Traspasa la configuración de esta PDA a otra escaneando un código.
                </p>
                
                <div className="grid grid-cols-2 gap-3">
                    <button 
                        onClick={() => setShowQRModal(true)}
                        className="bg-white/10 hover:bg-white/20 p-4 rounded-2xl flex flex-col items-center gap-2 border border-white/5 transition-all"
                    >
                        <Share2 className="w-5 h-5 text-blue-400" />
                        <span className="text-[9px] font-black uppercase">Mostrar QR</span>
                    </button>
                    <button 
                        onClick={() => setIsScanningQR(true)}
                        className="bg-white/10 hover:bg-white/20 p-4 rounded-2xl flex flex-col items-center gap-2 border border-white/5 transition-all"
                    >
                        <Camera className="w-5 h-5 text-emerald-400" />
                        <span className="text-[9px] font-black uppercase">Escanear QR</span>
                    </button>
                </div>
            </div>

            {/* 2. VINCULACIÓN MAESTRA (EXCEL ID) */}
            <div className="bg-indigo-600 p-6 rounded-[2.5rem] shadow-xl text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                        <FileSpreadsheet className="w-6 h-6 text-indigo-200" />
                        <h3 className="text-xl font-black uppercase italic tracking-tighter">Vínculo Nube</h3>
                    </div>
                    
                    <form onSubmit={handleBootstrap} className="space-y-3">
                        <input 
                            value={ssIdInput}
                            onChange={(e) => setSsIdInput(e.target.value)}
                            placeholder="ID del Spreadsheet (Google)..."
                            className="w-full h-14 bg-white/10 border-2 border-white/20 rounded-2xl px-4 text-sm font-bold placeholder:text-white/40 outline-none focus:bg-white/20 focus:border-white transition-all"
                        />
                        <button 
                            disabled={isBootstrapping || !ssIdInput}
                            className="w-full h-14 bg-white text-indigo-600 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isBootstrapping ? <Loader2 className="w-5 h-5 animate-spin" /> : <DownloadCloud className="w-4 h-4 fill-current" />}
                            Descargar Respaldo
                        </button>
                    </form>
                </div>
            </div>

            {/* 3. PARÁMETROS MANUALES Y TEST */}
            <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border-2 border-slate-100">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Endpoint Configurado</h3>
                    {config.appId && <Check className="text-emerald-500 w-5 h-5" />}
                </div>
                
                <div className="space-y-4">
                    <input 
                        value={config.gasWebAppUrl || ''} 
                        onChange={(e) => handleConfigChange('gasWebAppUrl', e.target.value)} 
                        className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-[9px] font-mono text-blue-600" 
                        placeholder="https://script.google.com/..." 
                    />
                    
                    <button 
                        onClick={handleTestConnection}
                        className={`w-full py-5 rounded-2xl border-4 font-black text-xs uppercase tracking-widest transition-all ${testStatus === 'ok' ? 'bg-emerald-500 border-emerald-600 text-white' : (testStatus === 'fail' ? 'bg-rose-500 border-rose-600 text-white' : 'bg-slate-900 border-black text-white shadow-lg')}`}
                    >
                        {testStatus === 'testing' ? <Loader2 className="animate-spin mx-auto w-5 h-5" /> : (testStatus === 'ok' ? '¡CONEXIÓN EXITOSA!' : (testStatus === 'fail' ? 'ERROR DE VÍNCULO' : 'PROBAR MOTOR CLOUD'))}
                    </button>
                </div>
            </div>

            {/* MODALES DE QR */}
            <Modal isOpen={showQRModal} onClose={() => setShowQRModal(false)} title="Configuración de este dispositivo" variant="center">
                <div className="p-8 text-center flex flex-col items-center">
                    <div className="bg-white p-4 rounded-3xl shadow-inner border border-slate-100 mb-6">
                        <img src={generateConfigQR()} alt="Config QR" className="w-64 h-64" />
                    </div>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-tight mb-8">
                        Escanea este código con otra PDA para copiar los IDs de AppSheet y el Script de Google.
                    </p>
                    <button onClick={() => setShowQRModal(false)} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest">Cerrar</button>
                </div>
            </Modal>

            {isScanningQR && (
                <CameraScanner 
                    isTriggered={true}
                    onScan={handleQRScanSuccess} 
                    onClose={() => setIsScanningQR(false)} 
                />
            )}
        </div>
    );
};
