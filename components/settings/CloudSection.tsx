
import React, { useState } from 'react';
import { Wifi, AlertCircle, Info, Link, ShieldAlert, Database, QrCode } from 'lucide-react';
import { AppSettings } from '../../types';
import { SettingsSection, SettingsCard, SettingsButton, SettingsInput } from './common/SettingsUI';
import { bootstrapByUrl } from '../../services/gasService';
import { SoundFX } from '../../services/audio';

interface Props {
    settings: AppSettings;
    updateSetting: (key: keyof AppSettings, value: any) => void;
}

export const CloudSection: React.FC<Props> = ({ settings, updateSetting }) => {
    const [urlInput, setUrlInput] = useState(settings.appSheetConfig?.gasWebAppUrl || '');
    const [ssIdInput, setSsIdInput] = useState(settings.appSheetConfig?.spreadsheetId || '');
    const [isConnecting, setIsConnecting] = useState(false);
    const [errorMode, setErrorMode] = useState<null | 'OAUTH_STALL' | 'GENERAL'>(null);
    const [errorMessage, setErrorMessage] = useState('');

    const handleAutoConfig = async () => {
        if (!urlInput.includes('/exec')) {
            setErrorMessage("La URL debe terminar en /exec");
            setErrorMode('GENERAL');
            SoundFX.play('error');
            return;
        }

        setErrorMode(null);
        setIsConnecting(true);
        try {
            // Intentamos vincular usando la URL y el ID manual si existe
            const fullConfig = await bootstrapByUrl(urlInput, ssIdInput);
            updateSetting('appSheetConfig', fullConfig);
            SoundFX.play('success');
            alert(`¡CONEXIÓN EXITOSA!\nSistema vinculado al Excel: ${fullConfig.spreadsheetId}`);
        } catch (e: any) {
            if (e.message.includes('GOOGLE_OAUTH_STALL') || e.message.includes('ACCESO_DENEGADO')) {
                setErrorMode('OAUTH_STALL');
            } else {
                setErrorMessage(e.message);
                setErrorMode('GENERAL');
            }
            SoundFX.play('error');
        } finally {
            setIsConnecting(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <SettingsSection title="Vínculo con Google Sheets">
                
                <SettingsCard className="bg-slate-900 border-indigo-500/30 text-white">
                    <div className="space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="p-4 bg-indigo-600 rounded-[1.5rem] shadow-lg shadow-indigo-900/40">
                                <Link className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black uppercase italic tracking-tighter leading-none">Vínculo Maestro</h3>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2">Configuración Cloud V12</p>
                            </div>
                        </div>

                        <div className="space-y-5">
                            {/* CAMPO 1: URL DEL SCRIPT */}
                            <div className="space-y-1.5">
                                <div className="flex justify-between items-center px-1">
                                    <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">URL de Implementación (GAS)</label>
                                    <span className="text-[8px] font-bold text-slate-500 uppercase">Obligatorio</span>
                                </div>
                                <SettingsInput 
                                    value={urlInput}
                                    onChange={(e: any) => setUrlInput(e.target.value)}
                                    placeholder="https://script.google.com/macros/s/.../exec"
                                    className="bg-black/40 border-white/5 text-blue-400 font-mono text-xs"
                                />
                            </div>

                            {/* CAMPO 2: ID DEL SPREADSHEET (EL QUE FALTABA) */}
                            <div className="space-y-1.5">
                                <div className="flex justify-between items-center px-1">
                                    <label className="text-[10px] font-black text-amber-400 uppercase tracking-widest">ID del Spreadsheet (Excel)</label>
                                    <span className="text-[8px] font-bold text-slate-500 uppercase">Manual / Anti-Error</span>
                                </div>
                                <SettingsInput 
                                    value={ssIdInput}
                                    onChange={(e: any) => setSsIdInput(e.target.value)}
                                    placeholder="Pegue aquí el ID largo de la URL de su Excel"
                                    className="bg-black/40 border-amber-500/20 text-amber-400 font-mono text-xs"
                                />
                                <p className="text-[8px] text-slate-500 px-1 italic">
                                    Si su script es independiente, pegue el ID para evitar el error "AUTO_DETECTED".
                                </p>
                            </div>
                        </div>

                        {errorMode === 'OAUTH_STALL' && (
                            <div className="bg-amber-500/10 border-2 border-amber-500/40 p-5 rounded-[2rem] space-y-3 animate-in shake duration-500">
                                <div className="flex items-center gap-3">
                                    <ShieldAlert className="w-6 h-6 text-amber-500 shrink-0" />
                                    <p className="text-[11px] text-amber-100 font-black uppercase">Acción Requerida en Google</p>
                                </div>
                                <p className="text-[10px] text-amber-200/70 leading-relaxed font-bold uppercase">
                                    Google bloqueó el acceso. 
                                    1. Abra su Script en Google.
                                    2. Seleccione la función "TRIGGER_PERMISSIONS".
                                    3. Presione "Ejecutar" y acepte los permisos.
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
                            label={isConnecting ? "Sincronizando..." : "Auto-Configurar App"}
                            icon={Wifi}
                            variant="primary"
                            className="bg-indigo-600 border-indigo-400 h-20 text-sm"
                        />
                    </div>
                </SettingsCard>

                <div className="bg-blue-900/10 border-2 border-blue-500/20 p-6 rounded-[2.5rem] flex gap-5">
                    <Info className="w-8 h-8 text-blue-400 shrink-0" />
                    <div className="space-y-2">
                        <p className="text-[10px] text-blue-200 font-bold uppercase tracking-wider">¿Dónde obtengo el ID del Excel?</p>
                        <p className="text-[9px] text-blue-400/80 leading-relaxed font-medium uppercase">
                            Está en la URL de tu navegador cuando tienes el Excel abierto:<br/>
                            docs.google.com/spreadsheets/d/<span className="text-white bg-blue-600 px-1 font-black">ESTE_ES_EL_ID</span>/edit
                        </p>
                    </div>
                </div>

            </SettingsSection>
        </div>
    );
};
