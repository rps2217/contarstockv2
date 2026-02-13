import React from 'react';
import { FileSpreadsheet, QrCode, Share2, Camera, DownloadCloud, Check, Wifi, AlertTriangle, Terminal } from 'lucide-react';
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

    return (
        <>
            <SettingsSection title="Sincronización">
                
                {/* 1. VINCULACIÓN MAESTRA */}
                <SettingsCard className="bg-indigo-600 border-indigo-800 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                    <div className="relative z-10 space-y-4">
                        <div className="flex items-center gap-3">
                            <FileSpreadsheet className="w-6 h-6 text-indigo-200" />
                            <h3 className="text-xl font-black uppercase italic tracking-tighter">Vínculo Google</h3>
                        </div>
                        
                        <SettingsInput 
                            value={state.ssIdInput}
                            onChange={(e: any) => state.setSsIdInput(e.target.value)}
                            placeholder="ID del Spreadsheet..."
                            className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:bg-white/20 focus:border-white"
                        />
                        
                        <SettingsButton 
                            onClick={actions.handleBootstrap}
                            isLoading={state.isBootstrapping}
                            disabled={!state.ssIdInput}
                            label="Descargar Configuración"
                            icon={DownloadCloud}
                            variant="primary"
                            className="bg-white text-indigo-600 hover:bg-indigo-50"
                        />
                    </div>
                </SettingsCard>

                {/* ACCESO DIRECTO A DIAGNÓSTICO */}
                <div className="px-2">
                    <button 
                        onClick={() => navigate('/settings?tab=system')}
                        className="w-full p-4 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-700/30 rounded-2xl flex items-center justify-between group active:scale-95 transition-all"
                    >
                        <div className="flex items-center gap-3">
                            <Terminal className="w-5 h-5 text-amber-600" />
                            <span className="text-[10px] font-black text-amber-800 dark:text-amber-400 uppercase tracking-widest">¿Error al abrir Excel?</span>
                        </div>
                        <span className="text-[9px] font-black bg-amber-200 dark:bg-amber-700 px-2 py-1 rounded-lg text-amber-900 dark:text-amber-100 uppercase tracking-tighter">Abrir Diagnóstico</span>
                    </button>
                </div>

                {/* 2. CLONACIÓN QR */}
                <SettingsCard className="bg-slate-900 border-black text-white">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <QrCode className="text-blue-400 w-6 h-6" />
                            <h3 className="text-lg font-black uppercase italic tracking-tighter">Clonación QR</h3>
                        </div>
                        <span className="text-[8px] bg-blue-600 px-2 py-0.5 rounded-full font-black uppercase">Offline OK</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                        <SettingsButton 
                            onClick={() => state.setShowQRModal(true)}
                            label="Mostrar QR"
                            icon={Share2}
                            variant="outline"
                            className="bg-white/10 border-white/5 text-white hover:bg-white/20 hover:border-white/20"
                        />
                        <SettingsButton 
                            onClick={() => state.setIsScanningQR(true)}
                            label="Leer QR"
                            icon={Camera}
                            variant="outline"
                            className="bg-white/10 border-white/5 text-emerald-400 hover:bg-white/20 hover:border-emerald-400/50"
                        />
                    </div>
                </SettingsCard>

                {/* 3. DIAGNÓSTICO RÁPIDO URL */}
                <SettingsCard>
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Endpoint API</h3>
                        {config.appId && <Check className="text-emerald-500 w-5 h-5" />}
                    </div>
                    
                    <div className="space-y-4">
                        <SettingsInput 
                            value={config.gasWebAppUrl || ''} 
                            onChange={(e: any) => actions.handleUrlChange(e.target.value)} 
                            placeholder="https://script.google.com/..." 
                        />
                        
                        <SettingsButton 
                            onClick={actions.handleTestConnection}
                            isLoading={state.testStatus === 'testing'}
                            label={state.testStatus === 'ok' ? '¡Conexión Exitosa!' : (state.testStatus === 'fail' ? 'Error de Conexión' : 'Probar Motor Cloud')}
                            icon={state.testStatus === 'fail' ? AlertTriangle : Wifi}
                            variant={state.testStatus === 'ok' ? 'primary' : (state.testStatus === 'fail' ? 'danger' : 'dark')}
                            className={state.testStatus === 'ok' ? 'bg-emerald-500 hover:bg-emerald-600' : ''}
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

            {/* Fix: Access isScanningQR from the state object returned by the hook */}
            {state.isScanningQR && (
                <CameraScanner isTriggered={true} onScan={actions.handleQRScanSuccess} onClose={() => state.setIsScanningQR(false)} />
            )}
        </>
    );
};