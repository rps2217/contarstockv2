
import React, { useState, useEffect } from 'react';
import { Cloud, Upload, Download, RefreshCw, CheckCircle2, AlertTriangle, X, Wifi, WifiOff, Package, ArrowRight, Calendar, Layers, ChevronLeft, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import * as syncManager from '../services/syncManager';
import { restoreFromCloud } from '../services/syncBridge';
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
    
    // Download State
    const [downloadList, setDownloadList] = useState<syncManager.CloudItem[]>([]);
    const [dateRange, setDateRange] = useState({ 
        start: new Date().toISOString().split('T')[0], 
        end: new Date().toISOString().split('T')[0] 
    });
    const [hasSearched, setHasSearched] = useState(false);

    // Live monitor for badge
    const pendingCount = useLiveQuery(() => db.scans.where('synced').equals(0).count(), [], 0);

    // Initial Load
    useEffect(() => {
        if (activeTab === 'upload') {
            loadUploads();
        }
    }, [activeTab, pendingCount]);

    const loadUploads = async () => {
        const groups = await syncManager.getPendingUploadGroups();
        setUploadGroups(groups);
    };

    // --- UPLOAD HANDLERS ---

    const handleUploadAll = async () => {
        if (!uploadGroups.length) return;
        if (!confirm(`¿Subir ${uploadGroups.length} órdenes consolidadas a la nube?`)) return;

        setIsProcessing(true);
        setStatusMsg('Iniciando sincronización...');

        try {
            for (let i = 0; i < uploadGroups.length; i++) {
                const group = uploadGroups[i];
                setStatusMsg(`Subiendo Orden ${group.erpOrder} (${i + 1}/${uploadGroups.length})...`);
                await syncManager.performBatchUpload(group);
            }
            setStatusMsg('¡Sincronización Completada!');
            await loadUploads();
            setTimeout(() => setStatusMsg(''), 2000);
        } catch (e: any) {
            setStatusMsg('Error: ' + e.message);
        } finally {
            setIsProcessing(false);
        }
    };

    // --- DOWNLOAD HANDLERS ---

    const handleSearchCloud = async () => {
        setIsProcessing(true);
        setStatusMsg('Analizando nube...');
        setDownloadList([]);
        try {
            const results = await syncManager.analyzeCloudDifferences(dateRange.start, dateRange.end);
            setDownloadList(results);
            setHasSearched(true);
            setStatusMsg('');
        } catch (e: any) {
            setStatusMsg('Error al conectar: ' + e.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDownloadSelected = async () => {
        const newItems = downloadList.filter(i => i.status === 'new');
        if (newItems.length === 0) return;

        if (!confirm(`¿Descargar ${newItems.length} sesiones nuevas?`)) return;

        setIsProcessing(true);
        setStatusMsg('Descargando e importando...');
        try {
            // Re-use existing bridge logic but with specific range
            const res = await restoreFromCloud({ 
                dateRange: dateRange, 
                skipExisting: true // CRITICAL: rely on the logic we built previously
            });
            alert(`Se importaron ${res.sessions} bultos y ${res.items} items.`);
            handleSearchCloud(); // Refresh list
        } catch (e: any) {
            alert(e.message);
        } finally {
            setIsProcessing(false);
            setStatusMsg('');
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
                    {pendingCount > 0 && <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">{pendingCount}</span>}
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
                                                <div className="text-indigo-100 text-sm opacity-90">{uploadGroups.length} Órdenes ERP listas para subir</div>
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
                                        {uploadGroups.map(group => (
                                            <div key={group.erpOrder} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col gap-3 group">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border border-slate-200">Orden ERP</span>
                                                            <span className="font-black text-slate-900 text-lg">{group.erpOrder}</span>
                                                        </div>
                                                        <div className="text-xs text-slate-500 flex items-center gap-4 mt-2">
                                                            <span className="flex items-center gap-1.5"><Package className="w-4 h-4 text-blue-500" /> <span className="font-bold text-slate-700">{group.totalUnits}</span> unid.</span>
                                                            <span className="flex items-center gap-1.5"><Layers className="w-4 h-4 text-purple-500" /> <span className="font-bold text-slate-700">{group.sessionCount}</span> bultos</span>
                                                        </div>
                                                    </div>
                                                    <div className="bg-orange-50 text-orange-600 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                                                        <RefreshCw className="w-3 h-3" /> Pendiente
                                                    </div>
                                                </div>
                                                
                                                <div className="pt-3 border-t border-slate-100">
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Etiquetas incluidas</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {group.logisticsLabels.map(lbl => (
                                                            <span key={lbl} className="text-[10px] bg-slate-50 border border-slate-200 px-2 py-1 rounded text-slate-600 font-mono">{lbl}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
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
                                <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2"><Calendar className="w-4 h-4" /> Rango de Búsqueda</h3>
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
                                    <button 
                                        onClick={handleSearchCloud}
                                        disabled={isProcessing}
                                        className="w-full md:w-auto bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-slate-200"
                                    >
                                        <RefreshCw className={`w-4 h-4 ${isProcessing ? 'animate-spin' : ''}`} /> Buscar en Nube
                                    </button>
                                </div>
                            </div>

                            {/* Results List */}
                            {downloadList.length > 0 ? (
                                <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
                                    <div className="flex justify-between items-center px-1">
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{downloadList.length} Resultados</span>
                                        <button 
                                            onClick={handleDownloadSelected}
                                            disabled={isProcessing || downloadList.every(i => i.status !== 'new')}
                                            className="text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:bg-slate-300 shadow-sm"
                                        >
                                            Descargar Nuevos
                                        </button>
                                    </div>
                                    
                                    {downloadList.map((item, idx) => (
                                        <div key={`${item.erpOrder}_${item.label}_${idx}`} className={`p-4 rounded-xl border flex items-center justify-between transition-colors ${item.status === 'new' ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-100 border-slate-200 opacity-60'}`}>
                                            <div>
                                                <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                                                    {item.erpOrder}
                                                    {item.status === 'exists_identical' && <span className="bg-green-100 text-green-700 text-[9px] px-1.5 py-0.5 rounded border border-green-200 uppercase tracking-wide">Ya Existe</span>}
                                                    {item.status === 'new' && <span className="bg-blue-100 text-blue-700 text-[9px] px-1.5 py-0.5 rounded border border-blue-200 uppercase tracking-wide">Nuevo</span>}
                                                </div>
                                                <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                                                    <Layers className="w-3 h-3" />
                                                    <span className="font-mono font-bold">{item.label}</span> 
                                                    <span className="opacity-50">•</span>
                                                    {item.date.toLocaleDateString()}
                                                </div>
                                            </div>
                                            <div className="text-slate-400">
                                                {item.status === 'new' ? <Download className="w-5 h-5 text-indigo-500" /> : <CheckCircle2 className="w-5 h-5 text-green-500" />}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : hasSearched ? (
                                <div className="text-center py-12 opacity-50 bg-slate-100 rounded-3xl border border-slate-200 border-dashed">
                                    <p className="text-sm font-bold text-slate-500">No se encontraron registros en este rango.</p>
                                </div>
                            ) : (
                                <div className="text-center py-12 opacity-30">
                                    <Cloud className="w-16 h-16 mx-auto mb-4 text-slate-400" />
                                    <p className="text-sm font-medium">Seleccione fechas y busque para ver datos.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
