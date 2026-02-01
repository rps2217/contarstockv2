
import React, { useState, useRef, useEffect } from 'react';
import { RefreshCw, Activity, Bug, LogOut, Trash2, FileJson, Upload, Download, Loader2, Database } from 'lucide-react';
import { checkSystemHealth, repairSystem, HealthReport } from '../../services/maintenance';
import { createFullBackup, restoreFullBackup } from '../../services/backupService';
import { SoundFX } from '../../services/audio';
import { getSettings, saveSettings } from '../../services/settings';
import { SettingsSection, SettingsCard, SettingsButton } from './common/SettingsUI';

export const SupportSection: React.FC = () => {
    const [health, setHealth] = useState<HealthReport | null>(null);
    const [isRepairing, setIsRepairing] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const backupInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { loadHealth(); }, []);
    const loadHealth = async () => setHealth(await checkSystemHealth());

    const handleSoftUpdate = () => {
        SoundFX.play('success');
        sessionStorage.clear();
        window.location.href = '/?v=' + Date.now();
    };

    const handleRepair = async () => {
        setIsRepairing(true);
        await repairSystem();
        await loadHealth();
        setIsRepairing(false);
    };

    const handleBackup = async () => {
        try {
            await createFullBackup();
            SoundFX.play('success');
        } catch (e) {
            alert("Error al crear respaldo");
        }
    };

    const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        if (!confirm("⚠️ ADVERTENCIA ⚠️\n\nEsta acción SOBREESCRIBIRÁ todos los datos actuales con los del archivo de respaldo.\n\n¿Estás seguro de continuar?")) {
            return;
        }

        setIsRestoring(true);
        restoreFullBackup(file)
            .then((count) => {
                SoundFX.play('success');
                alert(`✅ Restauración completa. ${count} registros recuperados.\nLa aplicación se reiniciará.`);
                window.location.reload();
            })
            .catch((err) => {
                SoundFX.play('error');
                alert(`Error crítico: ${err.message}`);
            })
            .finally(() => setIsRestoring(false));
    };

    const exportConfig = () => {
        const blob = new Blob([JSON.stringify(getSettings(), null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `LogiCount_Config_${new Date().toISOString().slice(0,10)}.json`;
        a.click();
        SoundFX.play('success');
    };

    const importConfig = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (ev) => {
            try {
                const config = JSON.parse(ev.target?.result as string);
                if (!config.appSheetConfig) throw new Error("Config inválida");
                await saveSettings(config);
                SoundFX.play('success');
                alert("✅ Cargado. Reiniciando...");
                window.location.reload();
            } catch (err) { alert("Archivo corrupto."); }
        };
        reader.readAsText(file);
    };

    return (
        <SettingsSection title="Mantenimiento">
            
            {/* 1. DIAGNÓSTICO */}
            <SettingsCard className="border-4 border-black">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-black uppercase italic flex items-center gap-2">
                        <Activity className="w-6 h-6 text-blue-600" /> Estado Sistema
                    </h2>
                    <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${health?.status === 'healthy' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {health?.status === 'healthy' ? 'Óptimo' : 'Atención'}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="bg-slate-50 p-4 rounded-2xl text-center">
                        <div className="text-[8px] font-black text-slate-400 uppercase">Huérfanos</div>
                        <div className="text-2xl font-black">{health?.orphanScans || 0}</div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl text-center">
                        <div className="text-[8px] font-black text-slate-400 uppercase">Espacio</div>
                        <div className="text-2xl font-black">{((health?.storageUsage || 0) / 1024 / 1024).toFixed(1)}M</div>
                    </div>
                </div>

                <SettingsButton 
                    onClick={handleRepair}
                    isLoading={isRepairing}
                    label="Limpieza Profunda"
                    icon={Bug}
                    variant="outline"
                />
            </SettingsCard>

            {/* 2. RESPALDO COMPLETO (BASE DE DATOS) */}
            <SettingsCard className="bg-blue-600 border-blue-800 text-white">
                <div className="flex items-center gap-3 mb-4">
                    <Database className="text-blue-200 w-6 h-6" />
                    <h3 className="text-lg font-black uppercase italic">Respaldo Total</h3>
                </div>
                <p className="text-[10px] text-blue-100 font-bold mb-6 uppercase tracking-wide">
                    Guarda una copia de seguridad de todo el inventario local por si falla el dispositivo.
                </p>
                <div className="grid grid-cols-2 gap-3">
                    <SettingsButton onClick={handleBackup} label="Guardar Backup" icon={Download} variant="primary" className="bg-white text-blue-600 hover:bg-blue-50" />
                    <SettingsButton onClick={() => backupInputRef.current?.click()} isLoading={isRestoring} label="Restaurar" icon={Upload} variant="outline" className="bg-blue-700 border-blue-500 text-white hover:bg-blue-800" />
                </div>
                <input ref={backupInputRef} type="file" accept=".json" className="hidden" onChange={handleRestore} />
            </SettingsCard>

            {/* 3. PORTABILIDAD (CONFIGURACIÓN) */}
            <SettingsCard className="bg-slate-900 text-white border-black">
                <div className="flex items-center gap-3 mb-4">
                    <FileJson className="text-slate-400 w-6 h-6" />
                    <h3 className="text-lg font-black uppercase italic">Solo Configuración</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <SettingsButton onClick={exportConfig} label="Exportar Conf." icon={Download} variant="outline" className="bg-white/10 border-white/10 text-white hover:bg-white/20" />
                    <SettingsButton onClick={() => fileInputRef.current?.click()} label="Importar Conf." icon={Upload} variant="outline" className="bg-white/10 border-white/10 text-emerald-400 hover:bg-white/20" />
                </div>
                <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={importConfig} />
            </SettingsCard>

            {/* 4. ZONA DE PELIGRO */}
            <SettingsButton onClick={handleSoftUpdate} label="Refrescar Interfaz" icon={RefreshCw} variant="primary" className="bg-indigo-600 hover:bg-indigo-700" />
            
            <div className="grid grid-cols-2 gap-3">
                <SettingsButton 
                    onClick={() => { if(confirm("¿Cerrar sesión?")) { localStorage.removeItem('logicount_auth'); window.location.href='/'; }}} 
                    label="Salir" icon={LogOut} variant="dark" 
                />
                <SettingsButton 
                    onClick={() => { if(confirm("¿BORRAR TODO? Irreversible.")) { localStorage.clear(); window.location.href='/'; }}} 
                    label="Full Reset" icon={Trash2} variant="danger" 
                />
            </div>
        </SettingsSection>
    );
};
