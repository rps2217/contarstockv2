
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
            {/* Header Pro */}
            <div className="bg-slate-800 border-b border-slate-700 p-4 flex items-center justify-between shadow-xl relative z-10">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-slate-700 rounded-full text-slate-400"><ChevronLeft/></button>
                    <div>
                        <h1 className="text-xl font-black flex items-center gap-2">
                            <Cloud className="text-blue-400 w-6 h-6" /> GESTOR NUBE
                        </h1>
                        <div className="flex items-center gap-2 mt-1">
                            {navigator.onLine ? (
                                <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1 uppercase tracking-widest">
                                    <Wifi className="w-3 h-3" /> Conectado
                                </span>
                            ) : (
                                <span className="text-[10px] font-bold text-red-400 flex items-center gap-1 uppercase tracking-widest">
                                    <WifiOff className="w-3 h-3" /> Sin Red
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                
                <button 
                    onClick={handleSyncAll}
                    disabled={isProcessing || !navigator.onLine}
                    className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black px-6 py-3 rounded-xl shadow-lg flex items-center gap-2 transition-all active:scale-95"
                >
                    {isProcessing ? <RefreshCw className="animate-spin w-5 h-5"/> : <Play className="w-5 h-5 fill-current"/>}
                    SINCRONIZAR TODO
                </button>
            </div>

            {/* Progress Bar */}
            {isProcessing && (
                <div className="h-1.5 w-full bg-slate-800">
                    <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${globalProgress}%` }}></div>
                </div>
            )}

            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                {/* Pending List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
                    {uiGroups.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-50">
                            <CheckCircle2 className="w-20 h-20 mb-4" />
                            <p className="font-bold">Base de datos sincronizada.</p>
                        </div>
                    ) : (
                        uiGroups.map(group => (
                            <div key={group.erpOrder} className={`p-4 rounded-2xl border transition-all ${
                                group.uiStatus === 'success' ? 'bg-emerald-950/20 border-emerald-800/50' : 
                                group.uiStatus === 'error' ? 'bg-red-950/20 border-red-800/50' :
                                'bg-slate-800 border-slate-700'
                            }`}>
                                <div className="flex justify-between items-start">
                                    <div className="flex gap-4">
                                        <div className="bg-slate-900 p-3 rounded-xl">
                                            {group.type === 'reception' ? <Layers className="text-orange-400"/> : <Package className="text-blue-400"/>}
                                        </div>
                                        <div>
                                            <h3 className="font-black text-lg">{group.erpOrder}</h3>
                                            <p className="text-xs text-slate-500 mt-1">{group.sessionCount} bultos • {group.totalUnits} unidades totales</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        {group.uiStatus === 'uploading' ? (
                                            <Loader2 className="animate-spin text-blue-400 w-6 h-6" />
                                        ) : group.uiStatus === 'success' ? (
                                            <CheckCircle2 className="text-emerald-500 w-6 h-6" />
                                        ) : group.uiStatus === 'error' ? (
                                            <XCircle className="text-red-500 w-6 h-6" />
                                        ) : (
                                            <div className="w-6 h-6 rounded-full border-2 border-slate-700"></div>
                                        )}
                                        <span className="text-[10px] font-black uppercase text-slate-600">{group.uiStatus}</span>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Real-time Console */}
                <div className="w-full md:w-96 bg-black p-4 flex flex-col font-mono border-t md:border-t-0 md:border-l border-slate-800">
                    <div className="flex items-center gap-2 text-green-500 text-xs font-bold mb-4 border-b border-green-900/30 pb-2">
                        <Terminal className="w-4 h-4" /> MONITOR_LOGS
                    </div>
                    <div ref={terminalRef} className="flex-1 overflow-y-auto text-[10px] space-y-1.5 no-scrollbar">
                        {logs.length === 0 && <span className="text-slate-700 italic">Esperando actividad de red...</span>}
                        {logs.map((log, i) => (
                            <div key={i} className="flex gap-2">
                                <span className="text-slate-600">[{log.time}]</span>
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
