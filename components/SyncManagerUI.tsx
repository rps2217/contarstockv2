
import React, { useState, useEffect, useRef } from 'react';
import { Cloud, Upload, Download, RefreshCw, CheckCircle2, AlertTriangle, XCircle, ArrowUpCircle, ArrowDownCircle, Package, Layers, ChevronLeft, Terminal, Calendar, Clock, ChevronDown, ChevronUp, Play } from 'lucide-react';
import * as syncManager from '../services/syncManager';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';

interface SyncManagerUIProps {
    onBack: () => void;
}

// Extended type for UI state handling
interface UIUploadGroup extends syncManager.UploadGroup {
    uiStatus: 'idle' | 'uploading' | 'success' | 'error';
    uiMessage?: string;
}

export const SyncManagerUI: React.FC<SyncManagerUIProps> = ({ onBack }) => {
    const [activeTab, setActiveTab] = useState<'upload' | 'download'>('upload');
    
    // UI State for Uploads
    const [uiGroups, setUiGroups] = useState<UIUploadGroup[]>([]);
    const [isGlobalProcessing, setIsGlobalProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    
    // Logs & Terminal
    const [logs, setLogs] = useState<{time: string, msg: string, type: 'info'|'error'|'success'}[]>([]);
    const [showTerminal, setShowTerminal] = useState(false);
    const terminalRef = useRef<HTMLDivElement>(null);

    // Download State
    const [dateRange, setDateRange] = useState({ 
        start: new Date().toISOString().split('T')[0], 
        end: new Date().toISOString().split('T')[0] 
    });

    // Badge Counters
    const pendingScans = useLiveQuery(() => db.scans.where('synced').equals(0).count(), [], 0);
    const pendingDrafts = useLiveQuery(() => db.sessions.where('status').equals('draft').and(s => !s.lastSyncTimestamp).count(), [], 0);
    const totalPending = (pendingScans || 0) + (pendingDrafts || 0);

    // --- INITIALIZATION ---
    useEffect(() => {
        if (activeTab === 'upload') {
            loadUploads();
        }
    }, [activeTab, totalPending]);

    useEffect(() => {
        if (terminalRef.current) {
            terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
    }, [logs, showTerminal]);

    const loadUploads = async () => {
        if (isGlobalProcessing) return; // Don't reload while processing
        const groups = await syncManager.getPendingUploadGroups();
        // Map to UI state, preserving status if we are just refreshing data (though usually we reload on mount)
        setUiGroups(groups.map(g => ({
            ...g,
            uiStatus: 'idle'
        })));
    };

    const addLog = (msg: string, type: 'info'|'error'|'success' = 'info') => {
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setLogs(prev => [...prev, { time, msg, type }]);
        if (type === 'error') setShowTerminal(true); // Auto open on error
    };

    // --- UPLOAD LOGIC ---

    const handleUploadAll = async () => {
        const pending = uiGroups.filter(g => g.uiStatus !== 'success');
        if (!pending.length) return;
        
        if (!confirm(`¿Iniciar carga de ${pending.length} bloques a la nube?`)) return;

        setIsGlobalProcessing(true);
        setProgress(0);
        setLogs([]); // Clear logs for new batch
        addLog(`Iniciando secuencia de subida para ${pending.length} grupos...`, 'info');

        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < uiGroups.length; i++) {
            const group = uiGroups[i];
            
            // Skip already succeeded ones if user clicks button again (retry logic)
            if (group.uiStatus === 'success') {
                successCount++;
                setProgress(((i + 1) / uiGroups.length) * 100);
                continue;
            }

            // Update UI to 'uploading'
            setUiGroups(prev => prev.map((g, idx) => idx === i ? { ...g, uiStatus: 'uploading', uiMessage: 'Procesando...' } : g));
            
            try {
                addLog(`Subiendo [${group.erpOrder}]...`, 'info');
                await syncManager.performBatchUpload(group);
                
                // Success
                setUiGroups(prev => prev.map((g, idx) => idx === i ? { ...g, uiStatus: 'success', uiMessage: 'Sincronizado' } : g));
                addLog(`✅ [${group.erpOrder}] Completado.`, 'success');
                successCount++;

            } catch (e: any) {
                // Error
                console.error(e);
                setUiGroups(prev => prev.map((g, idx) => idx === i ? { ...g, uiStatus: 'error', uiMessage: 'Falló' } : g));
                addLog(`❌ [${group.erpOrder}] Error: ${e.message}`, 'error');
                failCount++;
            }

            // Update Progress
            setProgress(((i + 1) / uiGroups.length) * 100);
        }

        setIsGlobalProcessing(false);
        
        if (failCount === 0) {
            addLog("🚀 Sincronización total completada con éxito.", 'success');
            // Optional: refresh list after delay to remove success items
            setTimeout(loadUploads, 2000);
        } else {
            addLog(`⚠️ Proceso finalizado con ${failCount} errores. Reintente los fallidos.`, 'error');
        }
    };

    // --- DOWNLOAD LOGIC ---

    const setQuickDate = (days: number) => {
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - days);
        setDateRange({
            start: start.toISOString().split('T')[0],
            end: end.toISOString().split('T')[0]
        });
    };

    const handleDownload = async (type: 'inventory' | 'reception' | 'products') => {
        setIsGlobalProcessing(true);
        setShowTerminal(true);
        addLog(`Descargando: ${type.toUpperCase()}...`, 'info');

        try {
            const res = await syncManager.executeDownload(type, dateRange, (msg) => addLog(msg, 'info'));
            if (res.success) {
                addLog(`✅ Éxito: ${res.message}`, 'success');
            } else {
                addLog(`⚠️ ${res.message}`, 'error');
            }
        } catch (e: any) {
            addLog(`❌ Error crítico: ${e.message}`, 'error');
        } finally {
            setIsGlobalProcessing(false);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] bg-slate-50">
            
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 shadow-sm sticky top-0 z-20">
                <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition-colors">
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="flex-1">
                    <h2 className="font-bold text-slate-900 leading-tight flex items-center gap-2">
                        <Cloud className="w-5 h-5 text-indigo-600" /> Cloud Sync
                    </h2>
                    <div className="flex items-center gap-2 text-xs">
                        {navigator.onLine ? (
                            <span className="text-emerald-600 font-medium flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Online</span>
                        ) : (
                            <span className="text-red-500 font-medium flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"></div> Offline</span>
                        )}
                        <span className="text-slate-300">|</span>
                        <span className="text-slate-500">v{syncManager.SYNC_ENGINE_VERSION}</span>
                    </div>
                </div>
            </div>

            {/* Global Progress Bar */}
            {isGlobalProcessing && (
                <div className="h-1 w-full bg-slate-200 overflow-hidden">
                    <div className="h-full bg-indigo-600 transition-all duration-300 ease-out" style={{ width: `${progress}%` }}></div>
                </div>
            )}

            {/* Tabs */}
            <div className="bg-white px-4 pt-2 border-b border-slate-200 flex gap-6 overflow-x-auto no-scrollbar">
                <button 
                    onClick={() => setActiveTab('upload')}
                    className={`pb-3 text-sm font-bold flex items-center gap-2 transition-colors border-b-2 ${activeTab === 'upload' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                >
                    <ArrowUpCircle className="w-4 h-4" /> 
                    Carga
                    {totalPending > 0 && <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">{totalPending}</span>}
                </button>
                <button 
                    onClick={() => setActiveTab('download')}
                    className={`pb-3 text-sm font-bold flex items-center gap-2 transition-colors border-b-2 ${activeTab === 'download' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                >
                    <ArrowDownCircle className="w-4 h-4" /> 
                    Descarga
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-32">
                <div className="max-w-3xl mx-auto space-y-6">
                    
                    {/* --- UPLOAD TAB --- */}
                    {activeTab === 'upload' && (
                        <>
                            {uiGroups.length === 0 ? (
                                <div className="text-center py-20 flex flex-col items-center opacity-60">
                                    <div className="bg-emerald-50 p-6 rounded-full mb-4 border border-emerald-100">
                                        <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-700">Todo Sincronizado</h3>
                                    <p className="text-sm text-slate-500 mt-2 max-w-xs">Tu dispositivo está al día con la nube.</p>
                                    <button onClick={loadUploads} className="mt-6 text-indigo-600 font-bold text-sm hover:underline">Verificar Nuevamente</button>
                                </div>
                            ) : (
                                <>
                                    {/* Action Header */}
                                    <div className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-2xl p-6 shadow-lg shadow-indigo-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                                        <div className="flex items-center gap-4">
                                            <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm border border-white/10">
                                                <Upload className="w-6 h-6 text-white" />
                                            </div>
                                            <div>
                                                <div className="font-bold text-lg">Subir Pendientes</div>
                                                <div className="text-indigo-100 text-xs opacity-90">{uiGroups.length} bloques listos para procesar</div>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={handleUploadAll}
                                            disabled={isGlobalProcessing}
                                            className="w-full sm:w-auto bg-white text-indigo-600 hover:bg-indigo-50 px-6 py-3 rounded-xl text-sm font-bold shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            {isGlobalProcessing ? <RefreshCw className="w-4 h-4 animate-spin"/> : <Play className="w-4 h-4 fill-current" />}
                                            {isGlobalProcessing ? 'Procesando...' : 'Iniciar Carga'}
                                        </button>
                                    </div>

                                    {/* List */}
                                    <div className="space-y-3">
                                        {uiGroups.map(group => {
                                            const isReception = group.type === 'reception';
                                            const status = group.uiStatus;
                                            
                                            let statusIcon = <div className="w-2 h-2 rounded-full bg-slate-300"></div>;
                                            let statusClass = "border-slate-200 bg-white";
                                            let textClass = "text-slate-500";

                                            if (status === 'uploading') {
                                                statusIcon = <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
                                                statusClass = "border-blue-200 bg-blue-50";
                                                textClass = "text-blue-600";
                                            } else if (status === 'success') {
                                                statusIcon = <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
                                                statusClass = "border-emerald-200 bg-emerald-50";
                                                textClass = "text-emerald-700";
                                            } else if (status === 'error') {
                                                statusIcon = <XCircle className="w-5 h-5 text-red-500" />;
                                                statusClass = "border-red-200 bg-red-50";
                                                textClass = "text-red-700";
                                            }

                                            return (
                                                <div key={group.erpOrder} className={`p-4 rounded-2xl border flex flex-col gap-3 transition-all ${statusClass}`}>
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex items-start gap-3">
                                                            <div className={`p-2 rounded-lg ${isReception ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                                                {isReception ? <Layers className="w-5 h-5" /> : <Package className="w-5 h-5" />}
                                                            </div>
                                                            <div>
                                                                <div className="font-black text-slate-800 text-base">{group.erpOrder}</div>
                                                                <div className="text-xs text-slate-500 flex items-center gap-3 mt-1">
                                                                    <span>{group.sessionCount} Bultos</span>
                                                                    {!isReception && <span>• {group.totalUnits} Unid.</span>}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col items-end">
                                                            <div className="mb-1">{statusIcon}</div>
                                                            <div className={`text-[10px] font-bold uppercase ${textClass}`}>
                                                                {group.uiMessage || 'Pendiente'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {status === 'error' && (
                                                        <div className="text-[10px] text-red-600 bg-red-100 p-2 rounded-lg border border-red-200 font-mono">
                                                            {/* Generic retry hint */}
                                                            Intente nuevamente. Verifique conexión.
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                            )}
                        </>
                    )}

                    {/* --- DOWNLOAD TAB --- */}
                    {activeTab === 'download' && (
                        <div className="space-y-6 animate-in fade-in">
                            {/* Date Filter Card */}
                            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Calendar className="w-4 h-4" /> Rango de Fechas</h3>
                                    <div className="flex gap-2">
                                        <button onClick={() => setQuickDate(0)} className="text-[10px] font-bold bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded text-slate-600 transition-colors">Hoy</button>
                                        <button onClick={() => setQuickDate(7)} className="text-[10px] font-bold bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded text-slate-600 transition-colors">7 Días</button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="relative">
                                        <label className="text-[9px] font-bold text-slate-400 uppercase absolute -top-1.5 left-2 bg-white px-1">Desde</label>
                                        <input type="date" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} className="w-full bg-white border border-slate-300 rounded-xl px-3 py-3 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 transition-colors" />
                                    </div>
                                    <div className="relative">
                                        <label className="text-[9px] font-bold text-slate-400 uppercase absolute -top-1.5 left-2 bg-white px-1">Hasta</label>
                                        <input type="date" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} className="w-full bg-white border border-slate-300 rounded-xl px-3 py-3 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 transition-colors" />
                                    </div>
                                </div>
                            </div>

                            {/* Download Actions */}
                            <div className="grid gap-3">
                                <DownloadCard 
                                    title="Inventario (Conteos)" 
                                    desc="Historial de escaneos y sesiones." 
                                    icon={<Package className="w-5 h-5 text-purple-600" />}
                                    color="purple"
                                    onClick={() => handleDownload('inventory')}
                                    disabled={isGlobalProcessing}
                                />
                                <DownloadCard 
                                    title="Bitácora (Recepción)" 
                                    desc="Logs de check-in de bultos." 
                                    icon={<Layers className="w-5 h-5 text-orange-600" />}
                                    color="orange"
                                    onClick={() => handleDownload('reception')}
                                    disabled={isGlobalProcessing}
                                />
                                <DownloadCard 
                                    title="Maestro de Productos" 
                                    desc="Catálogo completo (Ignora fechas)." 
                                    icon={<Clock className="w-5 h-5 text-blue-600" />}
                                    color="blue"
                                    onClick={() => handleDownload('products')}
                                    disabled={isGlobalProcessing}
                                />
                            </div>
                        </div>
                    )}

                </div>
            </div>

            {/* --- TERMINAL DRAWER --- */}
            <div className={`fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 transition-transform duration-300 z-30 shadow-2xl flex flex-col ${showTerminal ? 'translate-y-0 h-48 sm:h-64' : 'translate-y-[calc(100%-40px)] h-48 sm:h-64'}`}>
                {/* Handle */}
                <div 
                    onClick={() => setShowTerminal(!showTerminal)}
                    className="h-10 bg-slate-800 hover:bg-slate-700 flex items-center justify-between px-4 cursor-pointer transition-colors border-b border-slate-700"
                >
                    <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-300">
                        <Terminal className="w-3 h-3 text-green-400" />
                        TERMINAL_LOGS
                        {logs.length > 0 && <span className="bg-slate-600 text-white px-1.5 rounded-full text-[9px]">{logs.length}</span>}
                    </div>
                    {showTerminal ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronUp className="w-4 h-4 text-slate-400" />}
                </div>

                {/* Content */}
                <div 
                    ref={terminalRef} 
                    className="flex-1 overflow-y-auto p-4 font-mono text-[10px] sm:text-xs text-slate-300 space-y-1.5 scroll-smooth"
                >
                    {logs.length === 0 && <div className="text-slate-600 italic">Esperando actividad...</div>}
                    {logs.map((log, i) => (
                        <div key={i} className={`flex gap-3 ${log.type === 'error' ? 'text-red-400' : log.type === 'success' ? 'text-green-400' : 'text-slate-300'}`}>
                            <span className="opacity-50 shrink-0">[{log.time}]</span>
                            <span className="break-all">{log.msg}</span>
                        </div>
                    ))}
                    {isGlobalProcessing && (
                        <div className="flex gap-2 text-blue-400 animate-pulse">
                            <span>_</span> Procesando solicitud...
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
};

// Sub-component for Cleaner Download Cards
const DownloadCard = ({ title, desc, icon, color, onClick, disabled }: any) => {
    // Map color prop to tailwind classes explicitly to avoid purge issues
    let bgClass = "bg-white";
    let hoverBorder = "hover:border-slate-300";
    
    if (color === 'purple') hoverBorder = "hover:border-purple-300 hover:bg-purple-50/30";
    if (color === 'orange') hoverBorder = "hover:border-orange-300 hover:bg-orange-50/30";
    if (color === 'blue') hoverBorder = "hover:border-blue-300 hover:bg-blue-50/30";

    return (
        <button 
            onClick={onClick}
            disabled={disabled}
            className={`w-full text-left p-4 rounded-2xl border border-slate-200 shadow-sm transition-all flex items-center justify-between group disabled:opacity-50 disabled:pointer-events-none ${bgClass} ${hoverBorder}`}
        >
            <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl bg-${color}-100/50 group-hover:scale-110 transition-transform`}>
                    {icon}
                </div>
                <div>
                    <h4 className="font-bold text-slate-900 text-sm">{title}</h4>
                    <p className="text-xs text-slate-500">{desc}</p>
                </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-white group-hover:text-slate-900 shadow-sm transition-colors">
                <Download className="w-4 h-4" />
            </div>
        </button>
    );
};
