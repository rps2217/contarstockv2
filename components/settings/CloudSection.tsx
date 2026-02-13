
import React, { useState } from 'react';
import { Link, ShieldCheck, Check, Wifi, Terminal, AlertCircle, Loader2, QrCode, Camera, Share2 } from 'lucide-react';
import { AppSettings } from '../../types';
import { useCloudConfig } from '../../hooks/useCloudConfig';
import { SettingsSection, SettingsCard, SettingsButton, SettingsInput } from './common/SettingsUI';
import { bootstrapByUrl } from '../../services/gasService';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../common/Modal';
import { CameraScanner } from '../CameraScanner';

interface Props {
    settings: AppSettings;
    updateSetting: (key: keyof AppSettings, value: any) => void;
}

export const CloudSection: React.FC<Props> = ({ settings, updateSetting }) => {
    const navigate = useNavigate();
    const { state, actions } = useCloudConfig(settings, updateSetting);
    const [scriptUrl, setScriptUrl] = useState(settings.appSheetConfig?.gasWebAppUrl || '');
    const [isConnecting, setIsConnecting] = useState(false);

    const handleAutoConfig = async () => {
        if (!scriptUrl.includes('/exec')) {
            alert("URL Inválida. Debe terminar en /exec");
            return;
        }
        setIsConnecting(true);
        try {
            const fullConfig = await bootstrapByUrl(scriptUrl);
            updateSetting('appSheetConfig', fullConfig);
            alert("¡Configuración Exitosa! La App ya está vinculada al Excel.");
        } catch (e: any) {
            alert("Error: " + e.message);
        } finally {
            setIsConnecting(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <SettingsSection title="Vínculo con Google Sheets">
                
                <SettingsCard className="bg-slate-900 border-indigo-500/30 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 bg-indigo-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                    <div className="relative z-10 space-y-5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-indigo-600 rounded-2xl">
                                    <ShieldCheck className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black uppercase italic tracking-tighter leading-none">Vínculo Seguro</h3>
                                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">Conexión por Script (GAS)</p>
                                </div>
                            </div>
                            <span className="text-[8px] bg-emerald-500 px-2 py-1 rounded-lg font-black uppercase">Recomendado</span>
                        </div>

                        <p className="text-[10px] text-slate-400 font-bold leading-tight">
                            Pegue la URL de implementación de su Script. Esto configurará automáticamente los IDs y nombres de tablas.
                        </p>

                        <SettingsInput 
                            value={scriptUrl}
                            onChange={(e: any) => setScriptUrl(e.target.value)}
                            placeholder="https://script.google.com/macros/s/.../exec"
                            className="bg-white/5 border-white/10 text-white focus:bg-white/10 placeholder:text-slate-600"
                        />
                        
                        <SettingsButton 
                            onClick={handleAutoConfig}
                            isLoading={isConnecting}
                            disabled={!scriptUrl}
                            label={isConnecting ? "Conectando..." : "Auto-Configurar App"}
                            icon={Wifi}
                            variant="primary"
                            className="bg-indigo-600 border-indigo-400"
                        />
                    </div>
                </SettingsCard>

                {/* ACCESO DIRECTO A DIAGNÓSTICO */}
                <div className="px-2">
                    <button 
                        onClick={() => navigate('/settings?tab=system')}
                        className="w-full p-5 bg-amber-50 dark:bg-amber-900/10 border-2 border-amber-200 dark:border-amber-700/30 rounded-[2rem] flex items-center justify-between group active:scale-95 transition-all"
                    >
                        <div className="flex items-center gap-4">
                            <Terminal className="w-5 h-5 text-amber-600" />
                            <div className="text-left">
                                <span className="text-[10px] font-black text-amber-800 dark:text-amber-400 uppercase tracking-widest block">¿Problemas de conexión?</span>
                                <span className="text-[8px] font-bold text-amber-600/60 uppercase">Ejecutar pruebas de estrés</span>
                            </div>
                        </div>
                        <Check className="w-4 h-4 text-amber-400" />
                    </button>
                </div>

                {/* CLONACIÓN RÁPIDA QR */}
                <SettingsCard className="bg-white dark:bg-slate-950 border-slate-100 dark:border-white/5">
                    <div className="flex items-center gap-3 mb-6">
                        <QrCode className="text-blue-500 w-6 h-6" />
                        <h3 className="text-lg font-black uppercase italic tracking-tighter dark:text-white">Clonación QR</h3>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                        <button 
                            onClick={() => state.setShowQRModal(true)}
                            className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border-2 border-transparent hover:border-blue-500 transition-all gap-2"
                        >
                            <Share2 className="w-5 h-5 text-slate-400" />
                            <span className="text-[9px] font-black uppercase text-slate-500">Enviar Config</span>
                        </button>
                        <button 
                            onClick={() => state.setIsScanningQR(true)}
                            className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border-2 border-transparent hover:border-emerald-500 transition-all gap-2"
                        >
                            <Camera className="w-5 h-5 text-slate-400" />
                            <span className="text-[9px] font-black uppercase text-slate-500">Recibir Config</span>
                        </button>
                    </div>
                </SettingsCard>

            </SettingsSection>

            {/* MODALES */}
            <Modal isOpen={state.showQRModal} onClose={() => state.setShowQRModal(false)} title="Clonar Configuración" variant="center">
                <div className="p-8 text-center flex flex-col items-center">
                    <div className="bg-white p-4 rounded-3xl shadow-inner border border-slate-100 mb-6">
                        <img src={actions.generateConfigQR()} alt="Config QR" className="w-64 h-64 mix-blend-multiply" />
                    </div>
                    <p className="text-xs text-slate-500 font-bold mb-6 max-w-xs uppercase leading-tight">Escanea este código desde otro dispositivo para copiar toda la configuración al instante.</p>
                    <SettingsButton onClick={() => state.setShowQRModal(false)} label="Cerrar" variant="dark" />
                </div>
            </Modal>

            {state.isScanningQR && (
                <CameraScanner 
                    onScan={actions.handleQRScanSuccess} 
                    onClose={() => state.setIsScanningQR(false)} 
                />
            )}
        </div>
    );
};
