
import React, { useState, useEffect } from 'react';
import { ShieldCheck, Activity, Database, AlertCircle, CheckCircle2, ChevronLeft, Zap, Clock, HardDrive } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { checkSystemHealth, HealthReport } from '../services/maintenance';

const AuditDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [health, setHealth] = useState<HealthReport | null>(null);

    const stats = useLiveQuery(async () => {
        const allSessions = await db.sessions.toArray();
        const certified = allSessions.filter(s => s.auditStatus === 'verified').length;
        const warnings = allSessions.filter(s => s.auditStatus === 'warning' || s.auditStatus === 'failed').length;
        const totalUnits = allSessions.reduce((acc, s) => acc + (s.totalUnits || 0), 0);
        return { total: allSessions.length, certified, warnings, totalUnits };
    }, []);

    useEffect(() => {
        const loadHealth = async () => setHealth(await checkSystemHealth());
        loadHealth();
    }, []);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-black p-4 md:p-8 animate-in fade-in duration-500 pb-32">
            <header className="flex items-center gap-4 mb-10">
                <button onClick={() => navigate(-1)} className="p-3 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-white/10 rounded-2xl">
                    <ChevronLeft className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                </button>
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">Auditoría 360</h1>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Integridad y Rendimiento</p>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {/* Card: Salud de Base de Datos */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border-4 border-black dark:border-white/10 shadow-xl">
                    <div className="flex justify-between items-start mb-6">
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-2xl">
                            <Database className="w-6 h-6 text-blue-600" />
                        </div>
                        {health?.status === 'healthy' ? (
                            <span className="bg-emerald-100 text-emerald-700 text-[8px] font-black px-2 py-1 rounded-full uppercase">Óptimo</span>
                        ) : (
                            <span className="bg-amber-100 text-amber-700 text-[8px] font-black px-2 py-1 rounded-full uppercase">Mantenimiento</span>
                        )}
                    </div>
                    <div className="text-4xl font-black text-slate-900 dark:text-white mb-1">
                        {((health?.storageUsage || 0) / 1024 / 1024).toFixed(2)}<span className="text-sm ml-1 opacity-40">MB</span>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Almacenamiento Local</p>
                    <div className="mt-4 h-2 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-600" style={{ width: '15%' }}></div>
                    </div>
                </div>

                {/* Card: Certificación de Carga */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border-4 border-black dark:border-white/10 shadow-xl">
                    <div className="flex justify-between items-start mb-6">
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl">
                            <ShieldCheck className="w-6 h-6 text-emerald-600" />
                        </div>
                        <Zap className="w-5 h-5 text-yellow-500 animate-pulse" />
                    </div>
                    <div className="text-4xl font-black text-slate-900 dark:text-white mb-1">
                        {stats?.certified || 0}<span className="text-sm ml-1 opacity-40">/{stats?.total || 0}</span>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Bultos Certificados</p>
                    <div className="mt-4 flex gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className={`h-1.5 flex-1 rounded-full ${i < ((stats?.certified || 0) / (stats?.total || 1) * 5) ? 'bg-emerald-500' : 'bg-slate-100 dark:bg-white/5'}`} />
                        ))}
                    </div>
                </div>

                {/* Card: Items Proyectados */}
                <div className="bg-slate-900 dark:bg-blue-600 p-6 rounded-[2.5rem] shadow-xl text-white">
                    <div className="flex justify-between items-start mb-6">
                        <div className="p-3 bg-white/10 rounded-2xl">
                            <Activity className="w-6 h-6 text-white" />
                        </div>
                        <Clock className="w-5 h-5 text-white/40" />
                    </div>
                    <div className="text-4xl font-black mb-1 tabular-nums">
                        {stats?.totalUnits || 0}
                    </div>
                    <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Unidades Totales</p>
                    <div className="mt-4 text-[9px] font-black uppercase bg-black/20 p-2 rounded-xl border border-white/10">
                        Flujo de datos validado
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border-4 border-black dark:border-white/10 overflow-hidden shadow-2xl">
                <div className="p-8 border-b border-slate-100 dark:border-white/5">
                    <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Alertas de Calidad</h2>
                </div>
                <div className="divide-y-2 divide-slate-50 dark:divide-white/5">
                    {health?.orphanScans ? (
                        <div className="p-6 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-rose-50 dark:bg-rose-900/20 rounded-2xl"><AlertCircle className="w-6 h-6 text-rose-600" /></div>
                                <div>
                                    <div className="font-black text-slate-900 dark:text-white text-sm uppercase">Registros Huérfanos</div>
                                    <div className="text-xs text-slate-400 font-bold">{health.orphanScans} escaneos sin sesión padre activa.</div>
                                </div>
                            </div>
                            <button className="px-4 py-2 bg-slate-900 text-white text-[10px] font-black rounded-xl uppercase active:scale-95">Reparar</button>
                        </div>
                    ) : (
                        <div className="p-10 text-center text-slate-300">
                             <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
                             <p className="text-[10px] font-black uppercase tracking-widest">Sin inconsistencias detectadas</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AuditDashboard;
