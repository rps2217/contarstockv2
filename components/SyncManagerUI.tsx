import React, { useState, useEffect, useRef } from 'react';
import { Cloud, Upload, ChevronLeft, Loader2, Signal, Wifi, WifiOff, Terminal, CheckCircle2, Package, Layers, XCircle } from 'lucide-react';
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
    const [uiGroups, setUiGroups] = useState<UIUploadGroup[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [globalProgress, setGlobalProgress] = useState(0);
    const [logs, setLogs] = useState<{time: string, msg: string, type: 'info'|'error'|'success'}[]>([]);
    
    const terminalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        refreshGroups();
    }, []);

    useEffect(() => {
        if (terminalRef.current) terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }, [logs]);

    const refreshGroups = async () => {
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
        addLog("Iniciando carga masiva...", 'info');

        for (let i = 0; i < uiGroups.length; i++) {
            const group = uiGroups[i];
            if (group.uiStatus === 'success') continue;

            setUiGroups(prev => prev.map((g, idx) => idx === i ? { ...g, uiStatus: 'uploading' } : g));

            try {
                await syncManager.performBatchUpload(group, (m) => addLog(m));
                setUiGroups(prev => prev.map((g, idx) => idx === i ? { ...g, uiStatus: 'success' } : g));
                addLog(`✓ ${group.erpOrder} cargado.`, 'success');
            } catch (e: any) {
                setUiGroups(prev => prev.map((g, idx) => idx === i ? { ...g, uiStatus: 'error' } : g));
                addLog(`× Error en ${group.erpOrder}: ${e.message}`, 'error');
            }
            setGlobalProgress(((i + 1) / uiGroups.length) * 100);
        }

        setIsProcessing(false);
        addLog("Sincronización finalizada.", 'info');
    };

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] bg-slate-50 overflow-hidden">
            <div className="bg-white border-b border-slate-200 p-4 flex items-center justify-between shadow-sm shrink-0 gap-2">
                <div className="flex items-center gap-3 min-w-0">
                    <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 shrink-0">
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <div className="min-w-0">
                        <h1 className="text-lg font-bold text-slate-900 truncate flex items-center gap-2">
                            <Cloud className="text-blue-600 w-5 h-5" /> Gestor Nube
                        </h1>
                        <div className="flex items-center gap-2">
                            {navigator.onLine ? (
                                <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 uppercase">
                                    <Wifi className="w-3 h-3" /> Conectado
                                </span>
                            ) : (
                                <span className="text-[10px] font-bold text-red-600 flex items-center gap-1 uppercase">
                                    <WifiOff className="w-3 h-3" /> Sin Red
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                
                <button 
                    onClick={handleSyncAll}
                    disabled={isProcessing || !navigator.onLine}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold px-4 py-2.5 rounded-xl shadow-md flex items-center gap-2 transition-all active:scale-95 shrink-0 text-sm"
                >
                    {isProcessing ? <Loader2 className="animate-spin w-4 h-4"/> : <Upload className="w-4 h-4"/>}
                    <span className="hidden xs:inline">Subir Todo</span>
                    <span className="xs:hidden">Subir</span>
                </button>
            </div>

            {isProcessing && (
                <div className="h-1 w-full bg-slate-200">
                    <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${globalProgress}%` }}></div>
                </div>
            )}

            <div className="flex-1 flex flex-col md:flex-row overflow-hidden p-4 gap-4">
                <div className="flex-1 overflow-y-auto space-y-3 no-scrollbar">
                    {uiGroups.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 py-20">
                            <CheckCircle2 className="w-16 h-16 mb-4 opacity-20" />
                            <p className="font-bold text-sm">Sin tareas pendientes.</p>
                        </div>
                    ) : (
                        uiGroups.map(group => (
                            <div key={group.erpOrder} className={`p-4 rounded-2xl border transition-all bg-white shadow-sm ${
                                group.uiStatus === 'success' ? 'border-emerald-200 bg-emerald-50/30' : 
                                group.uiStatus === 'error' ? 'border-red-200 bg-red-50/30' :
                                'border-slate-200'
                            }`}>
                                <div className="flex justify-between items-center">
                                    <div className="flex gap-4 min-w-0 items-center">
                                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 shrink-0">
                                            {group.type === 'reception' ? <Layers className="text-orange-500 w-6 h-6"/> : <Package className="text-blue-500 w-6 h-6"/>}
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="font-bold text-slate-900 truncate text-base">{group.erpOrder}</h3>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">{group.sessionCount} bultos • {group.totalUnits} unidades</p>
                                        </div>
                                    </div>
                                    <div className="shrink-0 ml-4">
                                        {group.uiStatus === 'uploading' ? (
                                            <Loader2 className="animate-spin text-blue-600 w-6 h-6" />
                                        ) : group.uiStatus === 'success' ? (
                                            <CheckCircle2 className="text-emerald-500 w-6 h-6" />
                                        ) : group.uiStatus === 'error' ? (
                                            <XCircle className="text-red-500 w-6 h-6" />
                                        ) : (
                                            <div className="w-6 h-6 rounded-full border-2 border-slate-200"></div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="w-full md:w-80 bg-white rounded-2xl border border-slate-200 p-4 flex flex-col font-mono shadow-sm overflow-hidden h-48 md:h-full shrink-0">
                    <div className="flex items-center gap-2 text-slate-400 text-xs font-bold mb-4 border-b border-slate-100 pb-2">
                        <Terminal className="w-3 h-3" /> EVENTOS_LOG
                    </div>
                    <div ref={terminalRef} className="flex-1 overflow-y-auto text-[10px] space-y-2 no-scrollbar">
                        {logs.length === 0 && <span className="text-slate-300 italic">Esperando actividad...</span>}
                        {logs.map((log, i) => (
                            <div key={i} className="flex gap-2">
                                <span className="text-slate-400">[{log.time}]</span>
                                <span className={log.type === 'error' ? 'text-red-600 font-bold' : log.type === 'success' ? 'text-emerald-600 font-bold' : 'text-slate-600'}>
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