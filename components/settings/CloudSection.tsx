
import React, { useState } from 'react';
import { Wifi, AlertCircle, Info, Link, ExternalLink, ShieldAlert } from 'lucide-react';
import { AppSettings } from '../../types';
import { SettingsSection, SettingsCard, SettingsButton, SettingsInput } from './common/SettingsUI';
import { bootstrapByUrl } from '../../services/gasService';

interface Props {
    settings: AppSettings;
    updateSetting: (key: keyof AppSettings, value: any) => void;
}

export const CloudSection: React.FC<Props> = ({ settings, updateSetting }) => {
    const [urlInput, setUrlInput] = useState(settings.appSheetConfig?.gasWebAppUrl || '');
    const [ssIdInput, setSsIdInput] = useState(settings.appSheetConfig?.spreadsheetId || '');
    const [isConnecting, setIsConnecting] = useState(false);
    const [errorMode, setErrorMode] = useState<null | 'ID_REQUIRED' | 'OAUTH_STALL' | 'GENERAL'>(null);
    const [errorMessage, setErrorMessage] = useState('');

    const handleAutoConfig = async () => {
        if (!urlInput.includes('/exec')) {
            setErrorMessage("La URL debe terminar en /exec");
            setErrorMode('GENERAL');
            return;
        }

        setErrorMode(null);
        setIsConnecting(true);
        try {
            const fullConfig = await bootstrapByUrl(urlInput, ssIdInput);
            updateSetting('appSheetConfig', fullConfig);
            alert(`¡Conexión Exitosa!\nSistema vinculado a: ${fullConfig.spreadsheetId}`);
        } catch (e: any) {
            if (e.message === 'EXCEL_ID_REQUIRED') {
                setErrorMode('ID_REQUIRED');
            } else if (e.message.includes('GOOGLE_OAUTH_STALL')) {
                setErrorMode('OAUTH_STALL');
            } else {
                setErrorMessage(e.message);
                setErrorMode('GENERAL');
            }
        } finally {
            setIsConnecting(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <SettingsSection title="Conexión Inteligente">
                
                <SettingsCard className="bg-slate-900 border-indigo-500/30 text-white">
                    <div className="space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="p-4 bg-indigo-600 rounded-[1.5rem] shadow-lg shadow-indigo-900/40">
                                <Link className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black uppercase italic tracking-tighter leading-none">Vínculo Maestro</h3>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2">Sincronización con Google Cloud</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">URL de Despliegue (Web App)</label>
                                <SettingsInput 
                                    value={urlInput}
                                    onChange={(e: any) => setUrlInput(e.target.value)}
                                    placeholder="https://script.google.com/macros/s/.../exec"
                                    className="bg-white/5 border-white/10 text-white placeholder:text-slate-600"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-amber-400 uppercase tracking-widest ml-1">ID del Spreadsheet (Opcional si es vinculado)</label>
                                <SettingsInput 
                                    value={ssIdInput}
                                    onChange={(e: any) => setSsIdInput(e.target.value)}
                                    placeholder="ID de la URL de tu Excel"
                                    className="bg-white/5 border-amber-500/30 text-white placeholder:text-slate-600"
                                />
                            </div>
                        </div>

                        {errorMode === 'OAUTH_STALL' && (
                            <div className="bg-amber-500/10 border-2 border-amber-500/40 p-5 rounded-[2rem] space-y-3">
                                <div className="flex items-center gap-3">
                                    <ShieldAlert className="w-6 h-6 text-amber-500 shrink-0" />
                                    <p className="text-[11px] text-amber-100 font-black uppercase">Acción Requerida en Google</p>
                                </div>
                                <p className="text-[10px] text-amber-200/70 leading-relaxed font-bold uppercase">
                                    Google requiere que autorices el script manualmente.
                                    1. Ve al editor de Google Apps Script.
                                    2. Selecciona la función "TRIGGER_PERMISSIONS" arriba.
                                    3. Presiona "Ejecutar" y acepta los permisos.
                                </p>
                            </div>
                        )}

                        {errorMode === 'GENERAL' && (
                            <div className="bg-rose-500/10 border-2 border-rose-500/30 p-4 rounded-2xl flex items-center gap-3">
                                <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
                                <p className="text-[10px] text-rose-100 font-bold uppercase leading-tight">{errorMessage}</p>
                            </div>
                        )}

                        <SettingsButton 
                            onClick={handleAutoConfig}
                            isLoading={isConnecting}
                            disabled={!urlInput}
                            label={isConnecting ? "Validando..." : "Sincronizar Vínculo"}
                            icon={Wifi}
                            variant="primary"
                            className="bg-indigo-600 border-indigo-400"
                        />
                    </div>
                </SettingsCard>

                <div className="bg-blue-900/10 border-2 border-blue-500/20 p-6 rounded-[2.5rem] flex gap-5">
                    <Info className="w-8 h-8 text-blue-400 shrink-0" />
                    <div className="space-y-2">
                        <p className="text-[10px] text-blue-200 font-bold uppercase tracking-wider">¿Fallo de ID inesperado?</p>
                        <p className="text-[9px] text-blue-400/80 leading-relaxed font-medium uppercase">
                            Si ves errores de "openById" en consola, asegúrate de haber dado permisos al Script. 
                            Ve a tu Excel -> Extensiones -> Apps Script -> Botón Ejecutar (Función TRIGGER_PERMISSIONS).
                        </p>
                    </div>
                </div>

            </SettingsSection>
        </div>
    );
};
