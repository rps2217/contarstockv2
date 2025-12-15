
import React, { useState, useEffect, useRef } from 'react';
import { Cloud, Upload, Download, RefreshCw, CheckCircle2, AlertTriangle, X, Wifi, WifiOff, Package, ArrowRight, Calendar, Layers, ChevronLeft, ArrowUpCircle, ArrowDownCircle, Truck, Container, Database, Terminal } from 'lucide-react';
import * as syncManager from '../services/syncManager';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';

interface SyncManagerUIProps {
    onBack: () => void;
}

export const SyncManagerUI: React.FC<SyncManagerUIProps> = ({ onBack }) => {
    const [activeTab, setActiveTab] = useState<'upload' | 'download'>('upload');
    const [uploadGroups, setUploadGroups] = useState<syncManager.UploadGroup[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [statusMsg, setStatusMsg] = useState('');
    const [logs, setLogs] = useState<string[]>([]);
    
    // Download State
    const [dateRange, setDateRange] = useState({ 
        start: new Date().toISOString().split('T')[0], 
        end: new Date().toISOString().split('T')[0] 
    });

    const terminalRef = useRef<HTMLDivElement>(null);

    // Live monitor for badge (Scans + Pending Drafts)
    const pendingScans = useLiveQuery(() => db.scans.where('synced').equals(0).count(), [], 0);
    const pendingDrafts = useLiveQuery(() => db.sessions.where('status').equals('draft').and(s => !s.lastSyncTimestamp).count(), [], 0);
    
    const totalPending = (pendingScans || 0) + (pendingDrafts || 0);

    // Initial Load
    useEffect(() => {
        if (activeTab === 'upload') {
            loadUploads();
        }
    }, [activeTab, totalPending]);

    // Auto-scroll logs
    useEffect(() => {
        if (terminalRef.current) {
            terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
    }, [logs]);

    const addLog = (msg: string) => {
        const time = new Date().toLocaleTimeString();
        setLogs(prev => [...prev, `[${time}] ${msg}`]);
    };

    const loadUploads = async () => {
        const groups = await syncManager.getPendingUploadGroups();
        setUploadGroups(groups);
    };

    // --- UPLOAD HANDLERS ---

    const handleUploadAll = async () => {
        if (!uploadGroups.length) return;
        if (!confirm(`¿Subir ${uploadGroups.length} grupos de datos a la nube?`)) return;

        setIsProcessing(true);
        setStatusMsg('Iniciando carga...');
        setLogs([]); // Clear logs for new operation
        addLog("Iniciando secuencia de subida...");

        try {
            for (let i = 0; i < uploadGroups.length; i++) {
                const group = uploadGroups[i];
                const label = group.type === 'reception' ? 'Bitácora' : 'Inventario';
                setStatusMsg(`Subiendo: ${group.erpOrder}...`);
                addLog(`Subiendo ${label} -> ${group.erpOrder}`);
                
                await syncManager.performBatchUpload(group);
                addLog(`✅ OK: ${group.erpOrder}`);
            }
            setStatusMsg('¡Sincronización Completada!');
            addLog("Todos los grupos procesados correctamente.");
            await loadUploads();
            setTimeout(() => setStatusMsg(''), 2000);
        } catch (e: any) {
            console.error(e);
            setStatusMsg('Error: ' + e.message);
            addLog(`❌ ERROR CRÍTICO: ${e.message}`);
        } finally {
            setIsProcessing(false);
        }
    };

    // --- DOWNLOAD HANDLERS ---

    const handleDownload = async (type: 'inventory' | 'reception' | 'products') => {
        if (!confirm("¿Iniciar descarga de datos desde la nube?")) return;

        setIsProcessing(true);
        setLogs([]);
        addLog(`Iniciando descarga: ${type.toUpperCase()}`);
        setStatusMsg("Conectando con AppSheet...");

        try {
            const res = await syncManager.executeDownload(type, dateRange, (msg) => addLog(msg));
            if (res.success) {
                addLog(`✅ PROCESO COMPLETADO: ${res.message}`);
                alert(res.message);
            }
        } catch (e: any) {
            addLog(`❌ ERROR DE DESCARGA: ${e.message}`);
            alert("Falló la descarga. Revise el log para más detalles.");
        } finally {
            setIsProcessing(false);
            setStatusMsg("");
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
                        <Cloud className="w-5 h-5 text-indigo-600" /> Gestor de Nube
                    </h2>
                    <p className="text-xs text-slate-500 font-medium truncate">
                        {isProcessing ? statusMsg : navigator.onLine ? 'Conectado a AppSheet' : 'Sin conexión a Internet'}
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white px-4 pt-2 border-b border-slate-200 flex gap-6 overflow-x-auto">
                <button 
                    onClick={() => setActiveTab('upload')}
                    className={`pb-3 text-sm font-bold flex items-center gap-2 transition-colors border-b-2 ${activeTab === 'upload' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                >
                    <ArrowUpCircle className="w-4 h-4" /> 
                    Subir Pendientes
                    {totalPending > 0 && <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">{totalPending}</span>}
                </button>
                <button 
                    onClick={() => setActiveTab('download')}
                    className={`pb-3 text-sm font-bold flex items-center gap-2 transition-colors border-b-2 ${activeTab === 'download' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                >
                    <ArrowDownCircle className="w-4 h-4" /> 
                    Descargar / Restaurar
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24">
                <div className="max-w-3xl mx-auto">
                    
                    {/* --- UPLOAD TAB --- */}
                    {activeTab === 'upload' && (
                        <div className="space-y-6">
                            {uploadGroups.length === 0 ? (
                                <div className="text-center py-24 flex flex-col items-center opacity-50">
                                    <div className="bg-green-100 p-6 rounded-full mb-4">
                                        <CheckCircle2 className="w-12 h-12 text-green-600" />
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-700">Todo Sincronizado</h3>
                                    <p className="text-sm text-slate-500 mt-2 max-w-xs mx-auto">No hay datos pendientes de subida en tu dispositivo. Puedes trabajar tranquilo.</p>
                                </div>
                            ) : (
                                <>
                                    <div className="bg-indigo-600 text-white rounded-2xl p-6 shadow-lg shadow-indigo-200 flex flex-col md:flex-row items-center justify-between gap-4">
                                        <div className="flex items-center gap-4">
                                            <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                                                <Upload className="w-6 h-6 text-white" />
                                            </div>
                                            <div>
                                                <div className="font-bold text-lg">Resumen de Carga</div>
                                                <div className="text-indigo-100 text-sm opacity-90">{uploadGroups.length} bloques listos para subir</div>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={handleUploadAll}
                                            disabled={isProcessing}
                                            className="w-full md:w-auto bg-white text-indigo-600 hover:bg-indigo-50 px-6 py-3 rounded-xl text-sm font-bold shadow-sm transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin"/> : <Cloud className="w-4 h-4" />}
                                            Subir Todo Ahora
                                        </button>
                                    </div>

                                    <div className="grid gap-3">
                                        {uploadGroups.map(group => {
                                            const isReception = group.type === 'reception';
                                            return (
                                                <div key={group.erpOrder} className={`p-5 rounded-2xl border shadow-sm hover:shadow-md transition-all flex flex-col gap-3 group ${isReception ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${isReception ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                                                    {isReception ? 'Bitácora' : 'Orden ERP'}
                                                                </span>
                                                                <span className={`font-black text-lg ${isReception ? 'text-white' : 'text-slate-900'}`}>{group.erpOrder}</span>
                                                            </div>
                                                            <div className={`text-xs flex items-center gap-4 mt-2 ${isReception ? 'text-slate-400' : 'text-slate-500'}`}>
                                                                {!isReception && <span className="flex items-center gap-1.5"><Package className="w-4 h-4 text-blue-500" /> <span className={`font-bold ${isReception ? 'text-slate-200' : 'text-slate-700'}`}>{group.totalUnits}</span> unid.</span>}
                                                                <span className="flex items-center gap-1.5">
                                                                    {isReception ? <Container className="w-4 h-4 text-orange-400" /> : <Layers className="w-4 h-4 text-purple-500" />} 
                                                                    <span className={`font-bold ${isReception ? 'text-slate-200' : 'text-slate-700'}`}>{group.sessionCount}</span> bultos
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${isReception ? 'bg-indigo-900/50 text-indigo-300' : 'bg-orange-50 text-orange-600'}`}>
                                                            <RefreshCw className="w-3 h-3" /> Pendiente
                                                        </div>
                                                    </div>
                                                    
                                                    <div className={`pt-3 border-t ${isReception ? 'border-slate-700' : 'border-slate-100'}`}>
                                                        <p className={`text-[10px] font-bold uppercase mb-2 ${isReception ? 'text-slate-500' : 'text-slate-400'}`}>Etiquetas incluidas</p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {group.logisticsLabels.slice(0, 10).map((lbl, i) => (
                                                                <span key={i} className={`text-[10px] px-2 py-1 rounded font-mono ${isReception ? 'bg-slate-900 border-slate-700 text-slate-300 border' : 'bg-slate-50 border border-slate-200 text-slate-600'}`}>
                                                                    {lbl}
                                                                </span>
                                                            ))}
                                                            {group.logisticsLabels.length > 10 && (
                                                                <span className="text-[10px] text-slate-400 self-center">... y {group.logisticsLabels.length - 10} más</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* --- DOWNLOAD TAB --- */}
                    {activeTab === 'download' && (
                        <div className="space-y-6">
                            {/* Date Filter Card */}
                            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                                <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2"><Calendar className="w-4 h-4" /> Filtro de Fecha</h3>
                                <div className="flex flex-col md:flex-row gap-4 items-end">
                                    <div className="flex-1 w-full grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Desde</label>
                                            <input type="date" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Hasta</label>
                                            <input type="date" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Download Action Cards */}
                            <div className="grid gap-4">
                                {/* 1. Inventory */}
                                <button 
                                    onClick={() => handleDownload('inventory')}
                                    disabled={isProcessing}
                                    className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-purple-300 hover:shadow-md transition-all text-left flex items-center justify-between group disabled:opacity-50"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="bg-purple-100 p-3 rounded-xl text-purple-600 group-hover:scale-110 transition-transform">
                                            <Layers className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-900">Inventario (Conteos)</h3>
                                            <p className="text-xs text-slate-500 mt-1">Descargar historial de escaneos según rango de fecha.</p>
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 p-2 rounded-full text-slate-400 group-hover:text-purple-600 transition-colors">
                                        <Download className="w-5 h-5" />
                                    </div>
                                </button>

                                {/* 2. Reception */}
                                <button 
                                    onClick={() => handleDownload('reception')}
                                    disabled={isProcessing}
                                    className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-orange-300 hover:shadow-md transition-all text-left flex items-center justify-between group disabled:opacity-50"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="bg-orange-100 p-3 rounded-xl text-orange-600 group-hover:scale-110 transition-transform">
                                            <Truck className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-900">Bitácora (Recepción)</h3>
                                            <p className="text-xs text-slate-500 mt-1">Descargar logs de check-in según rango de fecha.</p>
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 p-2 rounded-full text-slate-400 group-hover:text-orange-600 transition-colors">
                                        <Download className="w-5 h-5" />
                                    </div>
                                </button>

                                {/* 3. Products */}
                                <button 
                                    onClick={() => handleDownload('products')}
                                    disabled={isProcessing}
                                    className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all text-left flex items-center justify-between group disabled:opacity-50"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="bg-blue-100 p-3 rounded-xl text-blue-600 group-hover:scale-110 transition-transform">
                                            <Database className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-900">Maestro de Productos</h3>
                                            <p className="text-xs text-slate-500 mt-1">Actualizar catálogo completo (ignora filtro de fecha).</p>
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 p-2 rounded-full text-slate-400 group-hover:text-blue-600 transition-colors">
                                        <Download className="w-5 h-5" />
                                    </div>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* --- CONSOLE LOG (ALWAYS VISIBLE IF ACTIVE) --- */}
                    {(isProcessing || logs.length > 0) && (
                        <div className="mt-8 bg-slate-900 rounded-xl p-4 shadow-lg border border-slate-700 animate-in slide-in-from-bottom-4">
                            <div className="flex items-center gap-2 mb-3 border-b border-slate-700 pb-2">
                                <Terminal className="w-4 h-4 text-green-400" />
                                <span className="text-xs font-mono font-bold text-slate-300 uppercase">Consola de Actividad</span>
                            </div>
                            <div 
                                ref={terminalRef} 
                                className="h-32 overflow-y-auto font-mono text-[10px] space-y-1 text-slate-400 scroll-smooth"
                            >
                                {logs.map((log, i) => (
                                    <div key={i} className="break-all border-l-2 border-slate-700 pl-2">
                                        {log}
                                    </div>
                                ))}
                                {isProcessing && (
                                    <div className="animate-pulse text-blue-400 font-bold">_ Procesando solicitud...</div>
                                )}
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};
