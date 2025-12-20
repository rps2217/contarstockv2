
import React, { useState, useEffect, useRef } from 'react';
import { Cloud, ChevronLeft, Loader2, Wifi, WifiOff, Terminal, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import * as syncManager from '../services/syncManager';

export const SyncManagerUI: React.FC = () => {
    const navigate = useNavigate();
    const [uiGroups, setUiGroups] = useState<any[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [logs, setLogs] = useState<{time: string, msg: string, type: 'info'|'error'|'success'}[]>([]);
    
    const terminalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        refreshGroups();
    }, []);

    const refreshGroups = async () => {
        const groups = await syncManager.getPendingUploadGroups();
        setUiGroups(groups.map(g => ({ ...g, uiStatus: 'idle' })));
    };

    const addLog = (msg: any, type: 'info'|'error'|'success' = 'info') => {
        const time = new Date().toLocaleTimeString();
        const safeMsg = typeof msg === 'string' ? msg : JSON.stringify(msg);
        setLogs(prev => [...prev, { time, msg: safeMsg, type }]);
    };

    const handleSyncAll = async () => {
        if (!navigator.onLine) {
            alert("Sin conexión activa.");
            return;
        }

        const pending = uiGroups.filter(g => g.uiStatus !== 'success');
        if (!pending.length) return;

        setIsProcessing(true);
        addLog("Iniciando despacho masivo...", 'info');

        for (let i = 0; i < uiGroups.length; i++) {
            const group = uiGroups[i];
            setUiGroups(prev => prev.map((g, idx) => idx === i ? { ...g, uiStatus: 'uploading' } : g));
            try {
                await syncManager.performBatchUpload(group, (m) => addLog(m));
                setUiGroups(prev => prev.map((g, idx) => idx === i ? { ...g, uiStatus: 'success' } : g));
            } catch (e: any) {
                setUiGroups(prev => prev.map((g, idx) => idx === i ? { ...g, uiStatus: 'error' } : g));
                addLog(`Error en ${group.erpOrder}: ${e.message}`, 'error');
            }
        }
        setIsProcessing(false);
    };

    return (
        <div className="flex flex-col h-screen bg-[#111827] text-white overflow-hidden">
            <div className="bg-[#1a1f2c] border-b border-white/5 p-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-white/5 rounded-full text-white/60"><ChevronLeft className="w-6 h-6" /></button>
                    <div>
                        <div className="flex items-center gap-2">
                           <Cloud className="text-blue-400 w-5 h-5" />
                           <h1 className="text-lg font-black uppercase tracking-tight">Gestor Nube</h1>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            {navigator.onLine ? (
                                <span className="text-[10px] font-black text-emerald-400 flex items-center gap-1 uppercase tracking-widest"><Wifi className="w-3 h-3" /> Conectado</span>
                            ) : (
                                <span className="text-[10px] font-black text-rose-400 flex items-center gap-1 uppercase tracking-widest"><WifiOff className="w-3 h-3" /> Sin Red</span>
                            )}
                        </div>
                    </div>
                </div>
                
                <button 
                    onClick={handleSyncAll}
                    disabled={isProcessing}
                    className="bg-[#2563EB] hover:bg-blue-700 disabled:opacity-50 text-white font-black px-6 py-3 rounded-xl shadow-lg flex items-center gap-3 transition-all active:scale-95 text-xs uppercase tracking-[0.1em]"
                >
                    {isProcessing ? <Loader2 className="animate-spin w-4 h-4"/> : <div className="w-0 h-0 border-t-[6px] border-t-transparent border-l-[10px] border-l-white border-b-[6px] border-b-transparent"></div>}
                    Sincronizar Todo
                </button>
            </div>

            <div className="flex-1 flex flex-col justify-center items-center p-10 opacity-30">
                {uiGroups.length === 0 ? (
                    <div className="text-center">
                        <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/20">
                            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                        </div>
                        <p className="font-black text-sm uppercase tracking-[0.2em]">Base de datos sincronizada.</p>
                    </div>
                ) : (
                    <div className="w-full max-w-md space-y-4">
                        {uiGroups.map(g => (
                            <div key={g.erpOrder} className="bg-white/5 p-4 rounded-2xl border border-white/5 flex justify-between items-center">
                                <div><div className="font-bold">{g.erpOrder}</div><div className="text-xs text-white/40">{g.sessionCount} Bultos</div></div>
                                {g.uiStatus === 'uploading' && <Loader2 className="animate-spin text-blue-400" />}
                                {g.uiStatus === 'success' && <CheckCircle2 className="text-emerald-400" />}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="bg-black/60 border-t border-white/5 p-4 max-h-48 flex flex-col font-mono text-[11px]">
                <div className="flex items-center gap-2 text-emerald-400/80 mb-2 uppercase tracking-widest font-black">
                    <Terminal className="w-3 h-3" /> Monitor_Logs
                </div>
                <div ref={terminalRef} className="flex-1 overflow-y-auto space-y-1 pr-2 no-scrollbar">
                    {logs.map((log, i) => (
                        <div key={i} className="flex gap-2 text-white/60">
                            <span className="text-white/20">[{log.time}]</span>
                            <span className={log.type === 'error' ? 'text-rose-500' : log.type === 'success' ? 'text-emerald-500' : ''}>{log.msg}</span>
                        </div>
                    ))}
                    {logs.length === 0 && <div className="text-white/10 animate-pulse italic">Iniciando monitor...</div>}
                </div>
            </div>
        </div>
    );
};
