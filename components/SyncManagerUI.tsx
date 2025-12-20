import React, { useState, useEffect, useRef } from 'react';
import { Cloud, Upload, Download, RefreshCw, CheckCircle2, AlertTriangle, XCircle, ArrowUpCircle, ArrowDownCircle, Package, Layers, ChevronLeft, Terminal, Play, Loader2, Signal, Wifi, WifiOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import * as syncManager from '../services/syncManager';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';

interface UIUploadGroup extends syncManager.UploadGroup {
    uiStatus: 'idle' | 'uploading' | 'success' | 'error';
    uiMessage?: string;
}

export const SyncManagerUI: React.FC = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'upload' | 'download'>('upload');
    const [uiGroups, setUiGroups] = useState<UIUploadGroup[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [globalProgress, setGlobalProgress] = useState(0);
    const [logs, setLogs] = useState<{time: string, msg: string, type: 'info'|'error'|'success'}[]>([]);
    
    const terminalRef = useRef<HTMLDivElement>(null);

    // Métricas
    const pendingScans = useLiveQuery(() => db.scans.where('synced').equals(0).count(), [], 0);
    const pendingDrafts = useLiveQuery(() => db.sessions.where('status').equals('draft').and(s => !s.lastSyncTimestamp).count(), [], 0);

    useEffect(() => {
        if (activeTab === 'upload') refreshGroups();
    }, [activeTab, pendingScans, pendingDrafts]);

    useEffect(() => {
        if (terminalRef.current) terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }, [logs]);

    const refreshGroups = async () => {
        if (isProcessing) return;
        const groups = await syncManager.getPendingUploadGroups();
        setUiGroups(groups.map(g => ({ ...g, uiStatus: 'idle' })));
    };

    const addLog = (msg: string, type: 'info'|'error'|'success' = 'info') => {
        const time = new Date().toLocaleTimeString();
        setLogs(prev => [...prev, { time, msg, type }]);
    };

    const handleSyncAll = async () => {
        if (!navigator.onLine) {
            alert("No hay conexión a internet.");
            return;
        }

        const pending = uiGroups.filter(g => g.uiStatus !== 'success');
        if (!pending.length) return;

        setIsProcessing(true);
        setGlobalProgress(0);
        addLog("Iniciando despacho masivo a la nube...", 'info');

        for (let i = 0; i < uiGroups.length; i++) {
            const group = uiGroups[i];
            if (group.uiStatus === 'success') continue;

            setUiGroups(prev => prev.map((g, idx) => idx === i ? { ...g, uiStatus: 'uploading' } : g));

            try {
                await syncManager.performBatchUpload(group, (m) => addLog(m));
                setUiGroups(prev => prev.map((g, idx) => idx === i ? { ...g, uiStatus: 'success', uiMessage: 'Ok' } : g));
                addLog(`✅ Grupo [${group.erpOrder}] subido correctamente.`, 'success');
            } catch (e: any) {
                setUiGroups(prev => prev.map((g, idx) => idx === i ? { ...g, uiStatus: 'error', uiMessage: 'Error' } : g));
                addLog(`❌ Error en [${group.erpOrder}]: ${e.message}`, 'error');
            }
            setGlobalProgress(((i + 1) / uiGroups.length) * 100);
        }

        setIsProcessing(false);
        addLog("Proceso de sincronización finalizado.", 'info');
    };

    return (
        <div className="flex flex-col h-screen bg-slate-900 text-slate-100 overflow-hidden">
            {/* Header Pro - Optimized for Mobile */}
            <div className="bg-slate-800 border-b border-slate-700 p-3 sm:p-4 flex items-center justify-between shadow-xl relative z-10 gap-2">
                <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                    <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-slate-700 rounded-full text-slate-400 shrink-0">
                        <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>
                    <div className="min-w-0">
                        <h1 className="text-sm sm:text-xl font-black flex items-center gap-1 sm:gap-2 truncate">
                            <Cloud className="text-blue-400 w-4 h-4 sm:w-6 sm:h-6 shrink-0" /> <span className="truncate uppercase sm:normal-case">Gestor Nube</span>
                        </h1>
                        <div className="flex items-center gap-2 mt-0.5">
                            {navigator.onLine ? (
                                <span className="text-[8px] sm:text-[10px] font-bold text-emerald-400 flex items-center gap-1 uppercase tracking-widest whitespace-nowrap">
                                    <Wifi className="w-2 h-2 sm:w-3 sm:h-3" /> Conectado
                                </span>
                            ) : (
                                <span className="text-[8px] sm:text-[10px] font-bold text-red-400 flex items-center gap-1 uppercase tracking-widest whitespace-nowrap">
                                    <WifiOff className="w-2 h-2 sm:w-3 sm:h-3" /> Sin Red
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                
                <button 
                    onClick={handleSyncAll}
                    disabled={isProcessing || !navigator.onLine}
                    className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black px-3 py-2.5 sm:px-6 sm:py-3 rounded-xl shadow-lg flex items-center gap-2 transition-all active:scale-95 shrink-0 text-[10px] sm:text-sm"
                >
                    {isProcessing ? <Loader2 className="animate-spin w-4 h-4 sm:w-5 sm:h-5"/> : <Upload className="w-4 h-4 sm:w-5 sm:h-5"/>}
                    <span className="hidden xs:inline uppercase tracking-tighter">Sincronizar Todo</span>
                    <span className="xs:hidden uppercase tracking-tighter">Subir</span>
                </button>
            </div>

            {/* Progress Bar */}
            {isProcessing && (
                <div className="h-1 w-full bg-slate-800">
                    <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${globalProgress}%` }}></div>
                </div>
            )}

            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                {/* Pending List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
                    {uiGroups.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-50">
                            <CheckCircle2 className="w-16 h-16 sm:w-20 sm:h-20 mb-4" />
                            <p className="font-bold text-sm sm:text-base">Base de datos sincronizada.</p>
                        </div>
                    ) : (
                        uiGroups.map(group => (
                            <div key={group.erpOrder} className={`p-4 rounded-2xl border transition-all ${
                                group.uiStatus === 'success' ? 'bg-emerald-950/20 border-emerald-800/50' : 
                                group.uiStatus === 'error' ? 'bg-red-950/20 border-red-800/50' :
                                'bg-slate-800 border-slate-700'
                            }`}>
                                <div className="flex justify-between items-start">
                                    <div className="flex gap-3 sm:gap-4 min-w-0">
                                        <div className="bg-slate-900 p-2.5 sm:p-3 rounded-xl shrink-0">
                                            {group.type === 'reception' ? <Layers className="text-orange-400 w-5 h-5 sm:w-6 sm:h-6"/> : <Package className="text-blue-400 w-5 h-5 sm:w-6 sm:h-6"/>}
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="font-black text-sm sm:text-lg truncate uppercase">{group.erpOrder}</h3>
                                            <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1">{group.sessionCount} bultos • {group.totalUnits} unidades</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1 sm:gap-2 shrink-0">
                                        {group.uiStatus === 'uploading' ? (
                                            <Loader2 className="animate-spin text-blue-400 w-5 h-5 sm:w-6 sm:h-6" />
                                        ) : group.uiStatus === 'success' ? (
                                            <CheckCircle2 className="text-emerald-500 w-5 h-5 sm:w-6 sm:h-6" />
                                        ) : group.uiStatus === 'error' ? (
                                            <XCircle className="text-red-500 w-5 h-5 sm:w-6 sm:h-6" />
                                        ) : (
                                            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 border-slate-700"></div>
                                        )}
                                        <span className="text-[8px] sm:text-[10px] font-black uppercase text-slate-600">{group.uiStatus}</span>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Real-time Console */}
                <div className="w-full md:w-96 bg-black p-4 flex flex-col font-mono border-t md:border-t-0 md:border-l border-slate-800 h-1/3 md:h-full">
                    <div className="flex items-center gap-2 text-green-500 text-[10px] sm:text-xs font-bold mb-4 border-b border-green-900/30 pb-2 shrink-0">
                        <Terminal className="w-3 h-3 sm:w-4 h-4" /> MONITOR_LOGS
                    </div>
                    <div ref={terminalRef} className="flex-1 overflow-y-auto text-[9px] sm:text-[10px] space-y-1.5 no-scrollbar">
                        {logs.length === 0 && <span className="text-slate-700 italic">Esperando actividad de red...</span>}
                        {logs.map((log, i) => (
                            <div key={i} className="flex gap-2">
                                <span className="text-slate-600 shrink-0">[{log.time}]</span>
                                <span className={log.type === 'error' ? 'text-red-400' : log.type === 'success' ? 'text-green-400' : 'text-slate-300'}>
                                    {log.msg}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};