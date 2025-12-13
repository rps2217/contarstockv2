import React, { useState, useEffect } from 'react';
import { Cloud, Upload, Download, RefreshCw, CheckCircle2, AlertTriangle, X, Wifi, WifiOff, Package, ArrowRight, Calendar, Layers } from 'lucide-react';
import * as syncManager from '../services/syncManager';
import { restoreFromCloud } from '../services/syncBridge';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';

interface SyncManagerUIProps {
    isOpen: boolean;
    onClose: () => void;
}

export const SyncManagerUI: React.FC<SyncManagerUIProps> = ({ isOpen, onClose }) => {
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
        if (isOpen && activeTab === 'upload') {
            loadUploads();
        }
    }, [isOpen, activeTab, pendingCount]);

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

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="bg-slate-50 border-b border-slate-200 p-4 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-100 p-2 rounded-xl text-indigo-600">
                            <RefreshCw className={`w-6 h-6 ${isProcessing ? 'animate-spin' : ''}`} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">Gestor de Sincronización</h2>
                            <p className="text-xs text-slate-500 font-medium">
                                {isProcessing ? statusMsg : navigator.onLine ? 'Conectado a AppSheet' : 'Sin conexión a Internet'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-200 shrink-0">
                    <button 
                        onClick={() => setActiveTab('upload')}
                        className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors relative ${activeTab === 'upload' ? 'text-indigo-600 bg-white' : 'text-slate-500 bg-slate-50 hover:bg-slate-100'}`}
                    >
                        <Upload className="w-4 h-4" /> 
                        Subir Pendientes
                        {pendingCount > 0 && <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">{pendingCount}</span>}
                        {activeTab === 'upload' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-t-full mx-8"></div>}
                    </button>
                    <button 
                        onClick={() => setActiveTab('download')}
                        className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors relative ${activeTab === 'download' ? 'text-indigo-600 bg-white' : 'text-slate-500 bg-slate-50 hover:bg-slate-100'}`}
                    >
                        <Download className="w-4 h-4" /> 
                        Descargar de Nube
                        {activeTab === 'download' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-t-full mx-8"></div>}
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto bg-slate-50 p-6 min-h-0 relative">
                    
                    {/* --- UPLOAD TAB --- */}
                    {activeTab === 'upload' && (
                        <div className="space-y-4">
                            {uploadGroups.length === 0 ? (
                                <div className="text-center py-12 flex flex-col items-center opacity-50">
                                    <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
                                    <h3 className="text-xl font-bold text-slate-700">Todo Sincronizado</h3>
                                    <p className="text-sm text-slate-500">No hay datos pendientes de subida en tu dispositivo.</p>
                                </div>
                            ) : (
                                <>
                                    <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-3">
                                            <Cloud className="w-5 h-5 text-indigo-600" />
                                            <div>
                                                <div className="font-bold text-indigo-900 text-sm">Resumen de Subida</div>
                                                <div className="text-xs text-indigo-700">{uploadGroups.length} Órdenes ERP consolidadas</div>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={handleUploadAll}
                                            disabled={isProcessing}
                                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                                        >
                                            <Upload className="w-4 h-4" /> Subir Todo
                                        </button>
                                    </div>

                                    <div className="grid gap-3">
                                        {uploadGroups.map(group => (
                                            <div key={group.erpOrder} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border border-slate-200">Orden ERP</span>
                                                        <span className="font-black text-slate-900">{group.erpOrder}</span>
                                                    </div>
                                                    <div className="text-xs text-slate-500 flex items-center gap-3">
                                                        <span className="flex items-center gap-1"><Package className="w-3 h-3" /> {group.totalUnits} unid.</span>
                                                        <span className="flex items-center gap-1"><Layers className="w-3 h-3" /> {group.sessionCount} bultos</span>
                                                    </div>
                                                </div>
                                                
                                                <div className="flex items-center gap-2 overflow-x-auto max-w-[200px] no-scrollbar">
                                                    {group.logisticsLabels.map(lbl => (
                                                        <span key={lbl} className="text-[10px] bg-slate-50 border border-slate-100 px-2 py-1 rounded text-slate-500 whitespace-nowrap">{lbl}</span>
                                                    ))}
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
                        <div className="space-y-4">
                            {/* Date Filter */}
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-end md:items-center justify-between">
                                <div className="flex gap-4 w-full md:w-auto">
                                    <div className="flex-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Desde</label>
                                        <input type="date" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500" />
                                    </div>
                                    <div className="flex-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Hasta</label>
                                        <input type="date" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500" />
                                    </div>
                                </div>
                                <button 
                                    onClick={handleSearchCloud}
                                    disabled={isProcessing}
                                    className="w-full md:w-auto bg-slate-800 hover:bg-slate-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    <RefreshCw className="w-4 h-4" /> Buscar en Nube
                                </button>
                            </div>

                            {/* Results List */}
                            {downloadList.length > 0 ? (
                                <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
                                    <div className="flex justify-between items-center px-1">
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{downloadList.length} Resultados</span>
                                        <button 
                                            onClick={handleDownloadSelected}
                                            disabled={isProcessing || downloadList.every(i => i.status !== 'new')}
                                            className="text-xs font-bold text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 disabled:text-slate-400"
                                        >
                                            Descargar Nuevos
                                        </button>
                                    </div>
                                    
                                    {downloadList.map((item, idx) => (
                                        <div key={`${item.erpOrder}_${item.label}_${idx}`} className={`p-4 rounded-xl border flex items-center justify-between transition-colors ${item.status === 'new' ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-100 border-slate-200 opacity-70'}`}>
                                            <div>
                                                <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                                                    {item.erpOrder}
                                                    {item.status === 'exists_identical' && <span className="bg-green-100 text-green-700 text-[9px] px-1.5 py-0.5 rounded border border-green-200">YA EXISTE</span>}
                                                    {item.status === 'new' && <span className="bg-blue-100 text-blue-700 text-[9px] px-1.5 py-0.5 rounded border border-blue-200">NUEVO</span>}
                                                </div>
                                                <div className="text-xs text-slate-500 mt-0.5">
                                                    Bulto: <span className="font-mono font-bold">{item.label}</span> • {item.date.toLocaleDateString()}
                                                </div>
                                            </div>
                                            <div className="text-slate-400">
                                                {item.status === 'new' ? <Download className="w-5 h-5 text-indigo-500" /> : <CheckCircle2 className="w-5 h-5 text-green-500" />}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : hasSearched ? (
                                <div className="text-center py-12 opacity-50">
                                    <p className="text-sm font-bold text-slate-500">No se encontraron registros en este rango de fechas.</p>
                                </div>
                            ) : (
                                <div className="text-center py-12 opacity-30">
                                    <Cloud className="w-12 h-12 mx-auto mb-2" />
                                    <p className="text-xs">Seleccione fechas y busque para ver datos.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};