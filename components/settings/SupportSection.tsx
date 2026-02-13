
import React, { useState, useRef, useEffect } from 'react';
import { RefreshCw, Activity, Bug, LogOut, Trash2, FileJson, Upload, Download, Loader2, Database, Terminal, ShieldCheck, AlertCircle } from 'lucide-react';
import { checkSystemHealth, repairSystem, HealthReport } from '../../services/maintenance';
import { createFullBackup, restoreFullBackup } from '../../services/backupService';
import { SoundFX } from '../../services/audio';
import { getSettings, saveSettings } from '../../services/settings';
import { SettingsSection, SettingsCard, SettingsButton } from './common/SettingsUI';
import { runStockEngineTest, TestResult } from '../../services/diagnostics';

export const SupportSection: React.FC = () => {
    const [health, setHealth] = useState<HealthReport | null>(null);
    const [isRepairing, setIsRepairing] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);
    
    // Estados para Pruebas de Stock
    const [testResults, setTestResults] = useState<TestResult[]>([]);
    const [isTesting, setIsTesting] = useState(false);

    const backupInputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { loadHealth(); }, []);
    const loadHealth = async () => setHealth(await checkSystemHealth());

    const handleRunTests = async () => {
        setIsTesting(true);
        setTestResults([]);
        SoundFX.play('increment');
        const results = await runStockEngineTest();
        setTestResults(results);
        setIsTesting(false);
        const hasFail = results.some(r => r.status === 'fail');
        SoundFX.play(hasFail ? 'error' : 'success');
    };

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

    return (
        <SettingsSection title="Kernel & Diagnóstico">
            
            {/* PRUEBAS DE ESTRÉS / CLOUD DIAGNOSTIC */}
            <SettingsCard className="bg-slate-950 border-blue-900/30 text-white overflow-hidden relative">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-900/20">
                            <Terminal className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black uppercase italic italic">Diagnóstico Stock</h3>
                            <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Validador de Integridad Cloud</p>
                        </div>
                    </div>
                    <button 
                        onClick={handleRunTests}
                        disabled={isTesting}
                        className={`p-3 rounded-xl transition-all ${isTesting ? 'bg-slate-800 animate-spin' : 'bg-blue-600 hover:bg-blue-500 active:scale-90'}`}
                    >
                        <RefreshCw className="w-5 h-5 text-white" />
                    </button>
                </div>

                <div className="space-y-2 font-mono min-h-[100px]">
                    {testResults.length === 0 && !isTesting && (
                        <div className="text-center py-6 opacity-20">
                            <Activity className="w-10 h-10 mx-auto mb-2" />
                            <p className="text-[10px] font-black uppercase tracking-widest">Presione para iniciar pruebas</p>
                        </div>
                    )}
                    
                    {isTesting && (
                        <div className="flex flex-col items-center py-6 gap-3">
                            <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 animate-[loading_2s_infinite]"></div>
                            </div>
                            <span className="text-[9px] font-black text-blue-400 animate-pulse uppercase tracking-[0.3em]">Accediendo a Google Sheets...</span>
                        </div>
                    )}

                    {testResults.map((res, i) => (
                        <div key={i} className="flex gap-3 text-[10px] p-2 rounded-lg bg-white/5 animate-in slide-in-from-left-2 duration-300">
                            <div className="shrink-0 mt-0.5">
                                {res.status === 'ok' ? <ShieldCheck className="w-4 h-4 text-emerald-500" /> : 
                                 res.status === 'fail' ? <AlertCircle className="w-4 h-4 text-rose-500" /> : 
                                 <Activity className="w-4 h-4 text-amber-500" />}
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="font-black uppercase text-slate-400">[{res.step}]</span>
                                    <span className={`font-black uppercase ${res.status === 'ok' ? 'text-emerald-500' : res.status === 'fail' ? 'text-rose-500' : 'text-amber-500'}`}>{res.status}</span>
                                </div>
                                <p className="text-slate-300 leading-tight">{res.message}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </SettingsCard>

            {/* DIAGNÓSTICO DE SALUD DE BASE DE DATOS */}
            <SettingsCard className="border-4 border-slate-100 dark:border-white/5 bg-white dark:bg-slate-900">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-black uppercase italic flex items-center gap-2 text-slate-900 dark:text-white">
                        <Activity className="w-6 h-6 text-blue-600" /> Salud Local
                    </h2>
                    <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${health?.status === 'healthy' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {health?.status === 'healthy' ? 'Óptimo' : 'Mantenimiento'}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="bg-slate-50 dark:bg-black/40 p-4 rounded-2xl text-center border border-slate-100 dark:border-white/5">
                        <div className="text-[8px] font-black text-slate-400 uppercase mb-1">Registros</div>
                        <div className="text-2xl font-black text-slate-900 dark:text-white">{health?.totalRecords || 0}</div>
                    </div>
                    <div className="bg-slate-50 dark:bg-black/40 p-4 rounded-2xl text-center border border-slate-100 dark:border-white/5">
                        <div className="text-[8px] font-black text-slate-400 uppercase mb-1">Espacio</div>
                        <div className="text-2xl font-black text-slate-900 dark:text-white">{((health?.storageUsage || 0) / 1024 / 1024).toFixed(1)}M</div>
                    </div>
                </div>

                <SettingsButton 
                    onClick={handleRepair}
                    isLoading={isRepairing}
                    label="Reparación Estructural"
                    icon={Bug}
                    variant="outline"
                />
            </SettingsCard>

            {/* RESPALDO COMPLETO (BASE DE DATOS) */}
            <SettingsCard className="bg-blue-600 border-blue-800 text-white">
                <div className="flex items-center gap-3 mb-4">
                    <Database className="text-blue-200 w-6 h-6" />
                    <h3 className="text-lg font-black uppercase italic">Backup Maestro</h3>
                </div>
                <p className="text-[10px] text-blue-100 font-bold mb-6 uppercase tracking-wide leading-relaxed">
                    Extrae un archivo JSON con todos los bultos, productos y escaneos registrados.
                </p>
                <div className="grid grid-cols-2 gap-3">
                    <SettingsButton onClick={handleBackup} label="Exportar" icon={Download} variant="primary" className="bg-white text-blue-600 hover:bg-blue-50" />
                    <SettingsButton onClick={() => backupInputRef.current?.click()} isLoading={isRestoring} label="Importar" icon={Upload} variant="outline" className="bg-blue-700 border-blue-500 text-white hover:bg-blue-800" />
                </div>
                <input ref={backupInputRef} type="file" accept=".json" className="hidden" onChange={handleRestore} />
            </SettingsCard>

            {/* ZONA DE PELIGRO */}
            <SettingsButton onClick={handleSoftUpdate} label="Reiniciar Interfaz" icon={RefreshCw} variant="dark" />
            
            <div className="grid grid-cols-2 gap-3">
                <SettingsButton 
                    onClick={() => { if(confirm("¿Cerrar sesión?")) { localStorage.removeItem('logicount_auth'); window.location.href='/'; }}} 
                    label="Cerrar Sesión" icon={LogOut} variant="outline" 
                />
                <SettingsButton 
                    onClick={() => { if(confirm("¿BORRAR TODO? Acción Irreversible.")) { localStorage.clear(); window.location.href='/'; }}} 
                    label="Master Reset" icon={Trash2} variant="danger" 
                />
            </div>

            <style>{`
                @keyframes loading {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
            `}</style>
        </SettingsSection>
    );
};
