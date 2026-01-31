
import React, { useState, useEffect } from 'react';
import { RefreshCw, RotateCcw, Database, Loader2, Activity, ShieldCheck, Bug, Trash2, LogOut, Sparkles } from 'lucide-react';
import { checkSystemHealth, repairSystem, HealthReport } from '../../services/maintenance';
import { runFullSystemAudit, DiagnosticResult } from '../../services/businessLogic.test';
import { SoundFX } from '../../services/audio';

export const SupportSection: React.FC = () => {
    const [health, setHealth] = useState<HealthReport | null>(null);
    const [isRepairing, setIsRepairing] = useState(false);
    const [isRunningAudit, setIsRunningAudit] = useState(false);
    const [auditResult, setAuditResult] = useState<DiagnosticResult | null>(null);

    useEffect(() => { loadHealth(); }, []);
    const loadHealth = async () => { setHealth(await checkSystemHealth()); };

    const handleLogout = () => {
        if (confirm("¿Cerrar sesión de esta terminal?")) {
            localStorage.removeItem('logicount_auth');
            window.location.href = '/';
        }
    };

    /**
     * REINICIO SUAVE: Limpia cache de interfaz sin tocar la base de datos.
     */
    const handleSoftUpdate = async () => {
        SoundFX.play('success');
        if (navigator.vibrate) navigator.vibrate(100);
        
        // 1. Limpiar flags de carga perezosa y estados temporales
        sessionStorage.clear();
        
        // 2. Intentar desregistrar service workers para forzar pull de nueva versión
        if ('serviceWorker' in navigator) {
            try {
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (let registration of registrations) {
                    await registration.unregister();
                }
            } catch (e) {
                console.warn("SW Unregister failed", e);
            }
        }
        
        // 3. Recarga forzada rompiendo cache con timestamp
        window.location.href = window.location.pathname + '?v=' + Date.now();
    };

    return (
        <div className="space-y-4">
            <div className="bg-white rounded-[2.5rem] shadow-xl border-4 border-black p-6">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-xl font-black text-black uppercase italic flex items-center gap-2">
                        <Activity className="w-6 h-6 text-blue-600" /> Diagnóstico
                    </h2>
                    <button 
                        onClick={async () => { setIsRunningAudit(true); setAuditResult(await runFullSystemAudit()); setIsRunningAudit(false); }}
                        className="bg-black text-white px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"
                    >
                        {isRunningAudit ? <Loader2 className="animate-spin w-4 h-4"/> : "Auditar"}
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-6">
                    <div className="bg-slate-50 border-2 border-slate-100 p-4 rounded-3xl text-center">
                        <div className="text-[8px] font-black text-slate-400 uppercase mb-1">Huérfanos</div>
                        <div className={`text-2xl font-black ${health?.orphanScans ? 'text-red-600' : 'text-black'}`}>{health?.orphanScans || 0}</div>
                    </div>
                    <div className="bg-slate-50 border-2 border-slate-100 p-4 rounded-3xl text-center">
                        <div className="text-[8px] font-black text-slate-400 uppercase mb-1">Uso Disco</div>
                        <div className="text-2xl font-black text-black">{((health?.storageUsage || 0) / 1024 / 1024).toFixed(1)}M</div>
                    </div>
                </div>

                {auditResult && (
                    <div className="bg-slate-900 rounded-[2rem] p-5 mb-6 animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Resumen Auditoría</span>
                            <span className="text-[10px] font-black text-white/50">{auditResult.totalLatency.toFixed(0)}ms</span>
                        </div>
                        <div className="space-y-2">
                            {auditResult.logs.slice(-3).map((l, i) => (
                                <div key={i} className="text-[9px] font-bold uppercase truncate text-slate-300 flex items-center gap-2">
                                    <div className={`w-1.5 h-1.5 rounded-full ${l.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                    {l.msg}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <button 
                    onClick={async () => { setIsRepairing(true); await repairSystem(); loadHealth(); setIsRepairing(false); }}
                    className="w-full bg-slate-100 border-4 border-slate-200 text-black font-black py-5 rounded-[2rem] flex items-center justify-center gap-3 active:translate-y-1 transition-all uppercase tracking-widest text-xs"
                >
                    {isRepairing ? <Loader2 className="animate-spin w-5 h-5"/> : <Bug className="w-5 h-5 text-amber-600" />}
                    Limpieza Profunda
                </button>
            </div>

            {/* BOTÓN DE RECARGA DE INTERFAZ (SOFT RESET) */}
            <button 
                onClick={handleSoftUpdate}
                className="w-full bg-indigo-600 text-white border-4 border-black p-6 rounded-[2.5rem] flex items-center justify-between group active:scale-95 transition-all shadow-xl"
            >
                <div className="flex items-center gap-4">
                    <div className="bg-white/20 p-3 rounded-2xl group-hover:rotate-180 transition-transform duration-500">
                        <RefreshCw className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-left">
                        <div className="text-xs font-black uppercase">Refrescar Interfaz</div>
                        <div className="text-[8px] font-bold opacity-60 uppercase tracking-widest">Forzar actualización de vista</div>
                    </div>
                </div>
                <Sparkles className="w-5 h-5 text-indigo-300" />
            </button>

            <div className="grid grid-cols-2 gap-4">
                <button onClick={handleLogout} className="bg-slate-900 text-white border-4 border-black p-6 rounded-[2.5rem] flex flex-col items-center gap-2 active:scale-95 transition-all">
                    <LogOut className="w-8 h-8 text-blue-400 stroke-[3px]" />
                    <span className="text-[10px] font-black uppercase">Salir</span>
                </button>
                <button onClick={() => { if(confirm("¿BORRAR TODO? Esta acción es irreversible.")) { localStorage.clear(); window.location.href = '/'; } }} className="bg-white border-4 border-red-600 p-6 rounded-[2.5rem] flex flex-col items-center gap-2 active:scale-95 transition-all">
                    <Trash2 className="w-8 h-8 text-red-600 stroke-[3px]" />
                    <span className="text-[10px] font-black uppercase text-red-600">Full Reset</span>
                </button>
            </div>
        </div>
    );
};
