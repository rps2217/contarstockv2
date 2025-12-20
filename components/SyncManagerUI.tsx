import React, { useState, useEffect, useRef } from 'react';
import { Cloud, Upload, ChevronLeft, Loader2, Wifi, WifiOff, Terminal, CheckCircle2, Package, Layers, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import * as syncManager from '../services/syncManager';
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

    const addLog = (msg: any, type: 'info'|'error'|'success' = 'info') => {
        const time = new Date().toLocaleTimeString();
        // Safe string conversion to prevent React Error #31
        const safeMsg = typeof msg === 'string' ? msg : JSON.stringify(msg);
        setLogs(prev => [...prev, { time, msg: safeMsg, type }]);
    };

    const handleSyncAll = async () => {
        if (!navigator.onLine) {
            alert("Sin conexión activa a internet.");
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
                setUiGroups(prev => prev.map((g, idx) => idx === i ? { ...g, uiStatus: 'success' } : g));
                addLog(`✅ Lote [${group.erpOrder}] sincronizado correctamente.`, 'success');
            } catch (e: any) {
                setUiGroups(prev => prev.map((g, idx) => idx === i ? { ...g, uiStatus: 'error' } : g));
                addLog(`❌ Fallo en lote ${group.erpOrder}: ${e.message || 'Error desconocido'}`, 'error');
            }
            setGlobalProgress(((i + 1) / uiGroups.length) * 100);
        }

        setIsProcessing(false);
        addLog("Operación de sincronización finalizada.", 'info');
    };

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] bg-slate-50 overflow-hidden rounded-3xl border border-slate-200 shadow-sm animate-in fade-in duration-500">
            <div className="bg-white border-b border-slate-200 p-5 flex items-center justify-between shadow-sm shrink-0 gap-4">
                <div className="flex items-center gap-4 min-w-0">
                    <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 shrink-0 transition-colors">
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <div className="min-w-0">
                        <h1 className="text-xl font-black text-slate-900 truncate flex items-center gap-3 uppercase tracking-tight">
                            <Cloud className="text-blue-600 w-6 h-6" /> Gestor Nube
                        </h1>
                        <div className="flex items-center gap-2 mt-0.5">
                            {navigator.onLine ? (
                                <span className="text-[10px] font-black text-emerald-600 flex items-center gap-1.5 uppercase tracking-widest">
                                    <Wifi className="w-3 h-3" /> Red Estable
                                </span>
                            ) : (
                                <span className="text-[10px] font-black text-rose-600 flex items-center gap-1.5 uppercase tracking-widest">
                                    <WifiOff className="w-3 h-3" /> Sin Internet
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                
                <button 
                    onClick={handleSyncAll}
                    disabled={isProcessing || !navigator.onLine}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-black px-6 py-3 rounded-2xl shadow-lg shadow-blue-100 flex items-center gap-3 transition-all active:scale-95 shrink-0 text-sm uppercase tracking-widest"
                >
                    {isProcessing ? <Loader2 className="animate-spin w-5 h-5"/> : <Upload className="w-5 h-5"/>}
                    <span className="hidden xs:inline">Subir Todo</span>
                </button>
            </div>

            {isProcessing && (
                <div className="h-1.5 w-full bg-slate-100 overflow-hidden">
                    <div className="h-full bg-blue-600 transition-all duration-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" style={{ width: `${globalProgress}%` }}></div>
                </div>
            )}

            <div className="flex-1 flex flex-col md:flex-row overflow-hidden p-4 gap-4">
                <div className="flex-1 overflow-y-auto space-y-3 no-scrollbar pr-1">
                    {uiGroups.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-300 py-32 bg-white rounded-[2rem] border border-dashed border-slate-200">
                            <CheckCircle2 className="w-20 h-20 mb-6 opacity-10" />
                            <p className="font-black text-sm uppercase tracking-[0.3em]">Base de Datos Limpia</p>
                        </div>
                    ) : (
                        uiGroups.map(group => (
                            <div key={group.erpOrder} className={`p-5 rounded-2xl border-2 transition-all bg-white shadow-sm ${
                                group.uiStatus === 'success' ? 'border-emerald-100 bg-emerald-50/20' : 
                                group.uiStatus === 'error' ? 'border-rose-100 bg-rose-50/20' :
                                'border-slate-100 hover:border-slate-200'
                            }`}>
                                <div className="flex justify-between items-center">
                                    <div className="flex gap-5 min-w-0 items-center">
                                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 shrink-0 shadow-inner">
                                            {group.type === 'reception' ? <Layers className="text-amber-500 w-7 h-7"/> : <Package className="text-blue-600 w-7 h-7"/>}
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="font-black text-slate-900 truncate text-lg uppercase tracking-tight">{group.erpOrder}</h3>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                                                {group.sessionCount} Bultos • {group.totalUnits} Unidades totales
                                            </p>
                                        </div>
                                    </div>
                                    <div className="shrink-0 ml-4">
                                        {group.uiStatus === 'uploading' ? (
                                            <Loader2 className="animate-spin text-blue-600 w-8 h-8" />
                                        ) : group.uiStatus === 'success' ? (
                                            <div className="bg-emerald-100 p-2 rounded-xl text-emerald-600"><CheckCircle2 className="w-6 h-6" /></div>
                                        ) : group.uiStatus === 'error' ? (
                                            <div className="bg-rose-100 p-2 rounded-xl text-rose-600"><XCircle className="w-6 h-6" /></div>
                                        ) : (
                                            <div className="w-8 h-8 rounded-full border-4 border-slate-100"></div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="w-full md:w-96 bg-white rounded-[2rem] border border-slate-200 p-6 flex flex-col font-sans shadow-xl h-64 md:h-full shrink-0">
                    <div className="flex items-center gap-3 text-slate-400 text-xs font-black mb-6 border-b border-slate-50 pb-4 uppercase tracking-[0.2em]">
                        <Terminal className="w-4 h-4" /> Monitor de Red
                    </div>
                    <div ref={terminalRef} className="flex-1 overflow-y-auto text-[11px] space-y-3 no-scrollbar font-medium">
                        {logs.length === 0 && <span className="text-slate-300 italic flex items-center gap-2 px-2"><div className="w-1.5 h-1.5 bg-slate-200 rounded-full animate-pulse"></div> Escuchando eventos...</span>}
                        {logs.map((log, i) => (
                            <div key={i} className="flex gap-3 px-3 py-2 bg-slate-50 rounded-xl border border-slate-100 animate-in slide-in-from-right-2 duration-300">
                                <span className="text-slate-300 text-[9px] shrink-0 font-black mt-0.5">[{log.time}]</span>
                                <span className={log.type === 'error' ? 'text-rose-600 font-bold' : log.type === 'success' ? 'text-emerald-700 font-bold' : 'text-slate-600'}>
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