import React, { useState } from 'react';
import { FileSpreadsheet, QrCode, Share2, Camera, DownloadCloud, Check, Wifi, AlertTriangle, Terminal, Link, ShieldCheck, Globe } from 'lucide-react';
import { AppSettings } from '../../types';
import { useCloudConfig } from '../../hooks/useCloudConfig';
import { SettingsSection, SettingsCard, SettingsButton, SettingsInput } from './common/SettingsUI';
import { CameraScanner } from '../CameraScanner';
import { Modal } from '../common/Modal';
import { useNavigate } from 'react-router-dom';

interface Props {
    settings: AppSettings;
    updateSetting: (key: keyof AppSettings, value: any) => void;
}

export const CloudSection: React.FC<Props> = ({ settings, updateSetting }) => {
    const navigate = useNavigate();
    const { state, actions } = useCloudConfig(settings, updateSetting);
    const { config } = state;
    const [connectMode, setConnectMode] = useState<'id' | 'url'>('id');

    return (
        <>
            <SettingsSection title="Sincronización">
                
                {/* 1. MODO DE VINCULACIÓN */}
                <div className="flex bg-slate-200 dark:bg-white/5 p-1 rounded-2xl mb-4">
                    <button 
                        onClick={() => setConnectMode('id')}
                        className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2 ${connectMode === 'id' ? 'bg-white dark:bg-blue-600 shadow-md text-blue-600 dark:text-white' : 'text-slate-500'}`}
                    >
                        <FileSpreadsheet className="w-3.5 h-3.5" /> ID de Excel
                    </button>
                    <button 
                        onClick={() => setConnectMode('url')}
                        className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2 ${connectMode === 'url' ? 'bg-white dark:bg-blue-600 shadow-md text-blue-600 dark:text-white' : 'text-slate-500'}`}
                    >
                        <Link className="w-3.5 h-3.5" /> URL del Script
                    </button>
                </div>

                {connectMode === 'id' ? (
                    <SettingsCard className="bg-indigo-600 border-indigo-800 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                        <div className="relative z-10 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Globe className="w-6 h-6 text-indigo-200" />
                                    <h3 className="text-xl font-black uppercase italic tracking-tighter">Vínculo Público</h3>
                                </div>
                                <span className="text-[8px] bg-white/20 px-2 py-1 rounded-lg font-black uppercase">Fácil</span>
                            </div>
                            
                            <p className="text-[10px] text-indigo-100 font-bold leading-tight">Requiere que el Excel esté compartido como <span className="underline italic">"Cualquier persona con el enlace"</span>.</p>

                            <SettingsInput 
                                value={state.ssIdInput}
                                onChange={(e: any) => state.setSsIdInput(e.target.value)}
                                placeholder="Pegar ID del Excel..."
                                className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:bg-white/20 focus:border-white"
                            />
                            
                            <SettingsButton 
                                onClick={actions.handleBootstrap}
                                isLoading={state.isBootstrapping}
                                disabled={!state.ssIdInput}
                                label="Sincronizar por ID"
                                icon={DownloadCloud}
                                variant="primary"
                                className="bg-white text-indigo-600 hover:bg-indigo-50"
                            />
                        </div>
                    </SettingsCard>
                ) : (
                    <SettingsCard className="bg-slate-900 border-black text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 bg-emerald-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                        <div className="relative z-10 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <ShieldCheck className="w-6 h-6 text-emerald-400" />
                                    <h3 className="text-xl font-black uppercase italic tracking-tighter">Vínculo Privado</h3>
                                </div>
                                <span className="text-[8px] bg-emerald-600 px-2 py-1 rounded-lg font-black uppercase">Seguro</span>
                            </div>

                            <p className="text-[10px] text-slate-400 font-bold leading-tight">Use este método si su Excel es <span className="text-emerald-400 italic">PRIVADO</span>. Pegue la URL de despliegue del Script GAS.</p>

                            <SettingsInput 
                                value={config.gasWebAppUrl || ''} 
                                onChange={(e: any) => actions.handleUrlChange(e.target.value)} 
                                placeholder="https://script.google.com/..."
                                className="bg-white/5 border-white/10 text-white focus:bg-white/10"
                            />
                            
                            <SettingsButton 
                                onClick={actions.handleTestConnection}
                                isLoading={state.testStatus === 'testing'}
                                label={state.testStatus === 'ok' ? '¡Conexión Exitosa!' : 'Probar URL de Script'}
                                icon={state.testStatus === 'ok' ? Check : Wifi}
                                variant={state.testStatus === 'ok' ? 'primary' : (state.testStatus === 'fail' ? 'danger' : 'dark')}
                                className={state.testStatus === 'ok' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-slate-800 border-white/5'}
                            />
                        </div>
                    </SettingsCard>
                )}

                {/* ACCESO DIRECTO A DIAGNÓSTICO */}
                <div className="px-2">
                    <button 
                        onClick={() => navigate('/settings?tab=system')}
                        className="w-full p-4 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-700/30 rounded-2xl flex items-center justify-between group active:scale-95 transition-all"
                    >
                        <div className="flex items-center gap-3">
                            <Terminal className="w-5 h-5 text-amber-600" />
                            <span className="text-[10px] font-black text-amber-800 dark:text-amber-400 uppercase tracking-widest">¿Sigue fallando la conexión?</span>
                        </div>
                        <span className="text-[9px] font-black bg-amber-200 dark:bg-amber-700 px-2 py-1 rounded-lg text-amber-900 dark:text-amber-100 uppercase tracking-tighter">Correr Diagnóstico</span>
                    </button>
                </div>

                {/* 2. CLONACIÓN QR */}
                <SettingsCard className="bg-slate-950 border-white/5 text-white">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <QrCode className="text-blue-400 w-6 h-6" />
                            <h3 className="text-lg font-black uppercase italic tracking-tighter">Clonación QR</h3>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                        <SettingsButton 
                            onClick={() => state.setShowQRModal(true)}
                            label="Mostrar QR"
                            icon={Share2}
                            variant="outline"
                            className="bg-white/10 border-white/5 text-white hover:bg-white/20"
                        />
                        <SettingsButton 
                            onClick={() => state.setIsScanningQR(true)}
                            label="Leer QR"
                            icon={Camera}
                            variant="outline"
                            className="bg-white/10 border-white/5 text-emerald-400 hover:bg-white/20"
                        />
                    </div>
                </SettingsCard>

            </SettingsSection>

            {/* MODALES */}
            <Modal isOpen={state.showQRModal} onClose={() => state.setShowQRModal(false)} title="Clonar Configuración" variant="center">
                <div className="p-8 text-center flex flex-col items-center">
                    <div className="bg-white p-4 rounded-3xl shadow-inner border border-slate-100 mb-6">
                        <img src={actions.generateConfigQR()} alt="Config QR" className="w-64 h-64 mix-blend-multiply" />
                    </div>
                    <p className="text-xs text-slate-500 font-bold mb-6 max-w-xs">Escanea esto con otro dispositivo LogiCount para copiar las llaves de acceso instantáneamente.</p>
                    <SettingsButton onClick={() => state.setShowQRModal(false)} label="Cerrar" variant="dark" />
                </div>
            </Modal>

            {/* FIX: Uso de state.isScanningQR para evitar error de variable no definida */}
            {state.isScanningQR && (
                <CameraScanner isTriggered={true} onScan={actions.handleQRScanSuccess} onClose={() => state.setIsScanningQR(false)} />
            )}
        </>
    );
};