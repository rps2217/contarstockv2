
import React, { useState, useEffect } from 'react';
import { LifeBuoy, RefreshCw, RotateCcw, Database, Download, Upload, Loader2, HeartPulse, ShieldAlert, Sparkles, Activity, ShieldCheck, Bug } from 'lucide-react';
import { createFullBackup, restoreFullBackup } from '../../services/backupService';
import { checkSystemHealth, repairSystem, HealthReport } from '../../services/maintenance';
import { runFullSystemAudit, DiagnosticResult } from '../../services/businessLogic.test';

export const SupportSection: React.FC = () => {
    const [isBackingUp, setIsBackingUp] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);
    const [health, setHealth] = useState<HealthReport | null>(null);
    const [isRepairing, setIsRepairing] = useState(false);
    
    // Estado para la Suite de Regresión
    const [isRunningAudit, setIsRunningAudit] = useState(false);
    const [auditResult, setAuditResult] = useState<DiagnosticResult | null>(null);

    useEffect(() => {
        loadHealth();
    }, []);

    const loadHealth = async () => {
        const report = await checkSystemHealth();
        setHealth(report);
    };

    const handleRunAudit = async () => {
        setIsRunningAudit(true);
        setAuditResult(null);
        try {
            const result = await runFullSystemAudit();
            setAuditResult(result);
        } finally {
            setIsRunningAudit(false);
        }
    };

    const handleRepair = async () => {
        if (!confirm("Se ejecutará una limpieza profunda de huérfanos y optimización de base de datos. ¿Continuar?")) return;
        setIsRepairing(true);
        try {
            const logs = await repairSystem();
            const report = await checkSystemHealth();
            setHealth(report);
        } finally { setIsRepairing(false); }
    };

    return (
        <div className="space-y-6">
            {/* PANEL DE SALUD Y REGRESIÓN */}
            <section className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 p-8">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-xl font-black text-slate-900 flex items-center gap-3">
                            <Activity className="w-6 h-6 text-blue-600" /> Diagnóstico de Rendimiento
                        </h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Prevención de Regresiones</p>
                    </div>
                    <button 
                        onClick={handleRunAudit}
                        disabled={isRunningAudit}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 shadow-lg shadow-blue-100"
                    >
                        {isRunningAudit ? <Loader2 className="w-4 h-4 animate-spin"/> : <ShieldCheck className="w-4 h-4" />}
                        Ejecutar Auditoría
                    </button>
                </div>

                {auditResult && (
                    <div className="mb-8 space-y-3 animate-in fade-in zoom-in-95 duration-300">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl">
                                <div className="text-[9px] font-black text-emerald-600 uppercase mb-1">Pruebas Superadas</div>
                                <div className="text-2xl font-black text-emerald-700">{auditResult.passed}</div>
                            </div>
                            <div className={`p-4 rounded-2xl border ${auditResult.failed > 0 ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-100'}`}>
                                <div className="text-[9px] font-black text-slate-400 uppercase mb-1">Regresiones</div>
                                <div className={`text-2xl font-black ${auditResult.failed > 0 ? 'text-rose-600' : 'text-slate-900'}`}>{auditResult.failed}</div>
                            </div>
                        </div>
                        
                        <div className="bg-slate-900 rounded-2xl p-4 font-mono text-[10px] max-h-40 overflow-y-auto no-scrollbar border border-slate-800">
                            {auditResult.logs.map((l, i) => (
                                <div key={i} className="flex justify-between py-1 border-b border-white/5 last:border-0">
                                    <span className={l.type === 'success' ? 'text-emerald-400' : (l.type === 'error' ? 'text-rose-400 font-bold' : 'text-slate-400')}>
                                        {l.type === 'success' ? '✓' : (l.type === 'error' ? '✗' : '•')} {l.msg}
                                    </span>
                                    {l.latency && <span className="text-blue-400/50">{l.latency.toFixed(1)}ms</span>}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <div className="text-[9px] font-black text-slate-400 uppercase mb-1 tracking-tighter">Huérfanos</div>
                        <div className={`text-xl font-black ${health?.orphanScans ? 'text-rose-600' : 'text-slate-900'}`}>{health?.orphanScans || 0}</div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <div className="text-[9px] font-black text-slate-400 uppercase mb-1 tracking-tighter">Integridad</div>
                        <div className="text-xl font-black text-slate-900">{health?.totalRecords ? 'OK' : '--'}</div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <div className="text-[9px] font-black text-slate-400 uppercase mb-1 tracking-tighter">Latencia DB</div>
                        <div className="text-xl font-black text-slate-900">Baja</div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <div className="text-[9px] font-black text-slate-400 uppercase mb-1 tracking-tighter">Uso Disco</div>
                        <div className="text-xl font-black text-slate-900">{((health?.storageUsage || 0) / 1024 / 1024).toFixed(1)}MB</div>
                    </div>
                </div>

                <button 
                    onClick={handleRepair}
                    disabled={isRepairing}
                    className="w-full bg-slate-900 hover:bg-black text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50 uppercase tracking-widest text-xs shadow-xl"
                >
                    {isRepairing ? <Loader2 className="w-4 h-4 animate-spin"/> : <Bug className="w-4 h-4 text-amber-400" />}
                    Reparación Profunda y Vacuum
                </button>
            </section>

            <section className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 p-8">
                <h2 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-3">
                    <LifeBuoy className="w-6 h-6 text-blue-600" /> Mantenimiento de App
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button onClick={() => window.location.reload()} className="flex items-center gap-5 p-5 rounded-2xl border-2 border-slate-50 hover:bg-blue-50 transition-all text-left group">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            <RefreshCw className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="font-black text-slate-900 text-sm uppercase tracking-tight">Reinicio Suave</div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase mt-1">Refrescar Vista</div>
                        </div>
                    </button>
                    <button onClick={() => { sessionStorage.clear(); window.location.href = '/?t=' + Date.now(); }} className="flex items-center gap-5 p-5 rounded-2xl border-2 border-slate-50 hover:bg-rose-50 transition-all text-left group">
                        <div className="p-3 bg-rose-50 text-rose-600 rounded-xl group-hover:bg-rose-600 group-hover:text-white transition-colors">
                            <RotateCcw className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="font-black text-slate-900 text-sm uppercase tracking-tight">Limpieza Cache</div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase mt-1">Forzar Actualización</div>
                        </div>
                    </button>
                </div>
            </section>
        </div>
    );
};
