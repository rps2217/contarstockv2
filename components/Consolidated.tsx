
import React, { useState, useMemo } from 'react';
import { Layers, ChevronLeft, Package, Box, FileSpreadsheet, FileText, ArrowRight, CloudUpload, Loader2 } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { ConsolidatedItem, CountingSession } from '../types';
import { exportToExcel, exportToPDF } from '../services/export';
import { syncToAppSheet } from '../services/syncBridge';
import * as storage from '../services/storage';
import { aggregateScans } from '../services/aggregator';
import { SearchBar } from './SearchBar';

interface ConsolidatedProps {
    onBack: () => void;
}

export const Consolidated: React.FC<ConsolidatedProps> = ({ onBack }) => {
    const [selectedErp, setSelectedErp] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [detailSearchQuery, setDetailSearchQuery] = useState('');
    const [isSyncing, setIsSyncing] = useState(false);

    const handleSearch = (query: string) => {
        setSearchQuery(query);
    };

    const handleDetailSearch = (query: string) => {
        setDetailSearchQuery(query);
    };

    const handleBackToMain = () => {
        setSelectedErp(null);
        setDetailSearchQuery('');
    };

    // 1. OPTIMIZED LIST QUERY
    const erpGroups = useLiveQuery(async () => {
        let sessions: CountingSession[];

        if (searchQuery) {
            sessions = await db.sessions
                .where('erpOrder').startsWithIgnoreCase(searchQuery)
                .toArray();
        } else {
            sessions = await db.sessions
                .orderBy('createdAt')
                .reverse()
                .limit(100)
                .toArray();
        }

        const groups: Record<string, { count: number, lastDate: number, totalUnits: number, sessionIds: string[], allSynced: boolean }> = {};

        for (const s of sessions) {
            if (!groups[s.erpOrder]) {
                groups[s.erpOrder] = { count: 0, lastDate: 0, totalUnits: 0, sessionIds: [], allSynced: true };
            }
            groups[s.erpOrder].count++;
            groups[s.erpOrder].lastDate = Math.max(groups[s.erpOrder].lastDate, s.createdAt);
            groups[s.erpOrder].sessionIds.push(s.id);
            groups[s.erpOrder].totalUnits += (s.totalUnits || 0);
            
            if (!s.lastSyncTimestamp) {
                groups[s.erpOrder].allSynced = false;
            }
        }

        return Object.entries(groups)
            .map(([erp, data]) => ({ erp, ...data }))
            .sort((a, b) => b.lastDate - a.lastDate);

    }, [searchQuery], []);

    // 2. OPTIMIZED DETAIL QUERY using Central Aggregator
    const details = useLiveQuery(async () => {
        if (!selectedErp) return null;

        const sessions = await db.sessions.where('erpOrder').equals(selectedErp).toArray();
        const sessionIds = sessions.map(s => s.id);
        
        const scans = await db.scans.where('sessionId').anyOf(sessionIds).toArray();
        const items = await aggregateScans(scans);

        const logisticsLabels = sessions.map(s => s.logisticsLabel).join(', ');
        const isFullySynced = sessions.every(s => !!s.lastSyncTimestamp);

        return {
            items,
            sessionsCount: sessions.length,
            logisticsLabels,
            lastDate: Math.max(...sessions.map(s => s.createdAt)),
            isFullySynced
        };

    }, [selectedErp]);

    const filteredItems = useMemo(() => {
        if (!details) return [];
        if (!detailSearchQuery) return details.items;
        const q = detailSearchQuery.toLowerCase();
        return details.items.filter(item => 
            item.barcode.toLowerCase().includes(q) || 
            item.productName.toLowerCase().includes(q)
        );
    }, [details, detailSearchQuery]);

    // ... (Export Handlers) ...
    const handleExportExcel = () => {
        if (!selectedErp || !details) return;
        const virtualSession: CountingSession = {
            id: 'CONSOLIDATED',
            erpOrder: selectedErp,
            logisticsLabel: `(Consolidado de ${details.sessionsCount} bultos)`,
            createdAt: details.lastDate,
            status: 'completed'
        };
        exportToExcel(virtualSession, details.items);
    };

    const handleExportPDF = () => {
        if (!selectedErp || !details) return;
        const virtualSession: CountingSession = {
            id: 'CONSOLIDATED',
            erpOrder: selectedErp,
            logisticsLabel: `MULTIPLE (${details.sessionsCount})`,
            createdAt: details.lastDate,
            status: 'completed'
        };
        exportToPDF(virtualSession, details.items);
    };

    const handleSync = async () => {
        if (!selectedErp || !details) return;
        if (!confirm(`¿Subir consolidado de Orden ${selectedErp} a AppSheet?`)) return;

        setIsSyncing(true);
        try {
            const virtualSession: CountingSession = {
                id: 'CONSOLIDATED_SYNC',
                erpOrder: selectedErp,
                logisticsLabel: details.logisticsLabels,
                createdAt: details.lastDate,
                status: 'completed'
            };
            await syncToAppSheet(virtualSession, details.items);
            await storage.markErpSessionsAsSynced(selectedErp);
            alert('¡Sincronización de consolidado exitosa!');
        } catch (err: any) {
            alert(`Error: ${err.message}`);
        } finally {
            setIsSyncing(false);
        }
    };

    if (selectedErp) {
        return (
            <div className="flex flex-col h-[calc(100vh-64px)] bg-slate-50">
                <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 shadow-sm sticky top-0 z-20">
                    <button onClick={handleBackToMain} className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition-colors"><ChevronLeft className="w-5 h-5" /></button>
                    <div className="flex-1">
                        <h2 className="font-bold text-slate-900 leading-tight flex items-center gap-2"><Layers className="w-4 h-4 text-purple-600" /> Consolidado ERP</h2>
                        <div className="text-xs text-slate-500 font-mono font-bold">{selectedErp}</div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24">
                    <div className="max-w-4xl mx-auto space-y-6">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                                <div>
                                    <div className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Orden ERP Total</div>
                                    <div className="text-3xl font-black text-slate-900 flex items-center gap-2">
                                        {selectedErp}
                                        {details?.isFullySynced && <span className="text-sm font-bold bg-green-100 text-green-700 px-2 py-1 rounded-md border border-green-200 flex items-center gap-1"><CloudUpload className="w-3 h-3" /> Sincronizado</span>}
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <button onClick={handleSync} disabled={isSyncing} className="bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition-colors shadow-md shadow-indigo-200 disabled:opacity-50">
                                        {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CloudUpload className="w-4 h-4" />} Subir Manual
                                    </button>
                                    <button onClick={handleExportExcel} className="bg-green-50 text-green-700 hover:bg-green-100 px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition-colors border border-green-200"><FileSpreadsheet className="w-4 h-4" /> Excel</button>
                                    <button onClick={handleExportPDF} className="bg-red-50 text-red-700 hover:bg-red-100 px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition-colors border border-red-200"><FileText className="w-4 h-4" /> PDF</button>
                                </div>
                             </div>
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100"><div className="text-xs text-slate-500 font-bold uppercase">Bultos/Sesiones</div><div className="text-xl font-bold text-slate-800 flex items-center gap-2"><Box className="w-5 h-5 text-purple-500" /> {details?.sessionsCount}</div></div>
                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100"><div className="text-xs text-slate-500 font-bold uppercase">Total Unidades</div><div className="text-xl font-bold text-slate-800 flex items-center gap-2"><Package className="w-5 h-5 text-blue-500" /> {details?.items.reduce((acc, i) => acc + i.totalQuantity, 0)}</div></div>
                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100"><div className="text-xs text-slate-500 font-bold uppercase">Etiquetas Logísticas</div><div className="text-xs font-mono text-slate-600 truncate mt-1" title={details?.logisticsLabels}>{details?.logisticsLabels}</div></div>
                             </div>
                        </div>
                        <div className="sticky top-0 bg-slate-50 pt-2 pb-2 z-10">
                            <SearchBar onSearch={handleDetailSearch} placeholder="Buscar producto por código o nombre..." />
                        </div>
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                                <span className="font-bold text-slate-800 text-sm">Desglose de Productos</span>
                                <span className="text-xs font-bold text-slate-400 uppercase">{filteredItems.length} items encontrados</span>
                            </div>
                            <div className="divide-y divide-slate-100">
                                {filteredItems.map((item) => (
                                     <div key={`${item.barcode}_${item.mm}_${item.yyyy}`} className="p-4 bg-white hover:bg-slate-50 transition-colors flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="font-bold text-slate-900 text-lg leading-snug mb-2">{item.productName}</div>
                                            <div className="flex flex-col gap-1">
                                                <div className="inline-flex items-center gap-2"><span className="font-mono text-slate-500 text-xs bg-slate-100 px-2 py-1 rounded border border-slate-200 font-bold">{item.barcode}</span></div>
                                                {item.mm && item.yyyy && (<div className="inline-block"><span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-bold border border-blue-100">Vence: {item.mm}/{item.yyyy}</span></div>)}
                                            </div>
                                        </div>
                                        <div className="text-right flex flex-col items-end"><div className="font-black text-3xl text-blue-600 leading-none">{item.totalQuantity}</div><div className="text-[10px] text-slate-400 font-bold uppercase mt-1">Unidades</div></div>
                                     </div>
                                ))}
                                {filteredItems.length === 0 && <div className="p-12 text-center text-slate-400 text-sm italic">{detailSearchQuery ? 'No se encontraron productos con ese criterio.' : 'No hay items en este consolidado.'}</div>}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto pb-24 px-4 pt-6">
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition-colors">
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Consolidados ERP</h1>
                        <p className="text-slate-500 text-sm">Agrupación de conteos por Orden de Compra.</p>
                    </div>
                </div>
            </div>

            <div className="mb-6">
                <SearchBar onSearch={handleSearch} placeholder="Filtrar por número de Orden ERP..." />
            </div>

            <div className="grid grid-cols-1 gap-4">
                {!erpGroups || erpGroups.length === 0 ? (
                     <div className="text-center py-12 bg-white rounded-3xl border border-slate-100 shadow-sm">
                        <Layers className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                        <p className="text-slate-400 font-medium">
                            {searchQuery ? 'No se encontraron órdenes.' : 'No hay conteos registrados recientemente.'}
                        </p>
                    </div>
                ) : (
                    erpGroups.map(group => (
                        <button 
                            key={group.erp}
                            onClick={() => setSelectedErp(group.erp)}
                            className={`bg-white p-6 rounded-2xl shadow-sm border hover:shadow-md transition-all text-left group w-full relative overflow-hidden ${group.allSynced ? 'border-green-200 hover:border-green-300' : 'border-slate-200 hover:border-purple-200'}`}
                        >
                            <div className="absolute right-0 top-0 p-16 bg-purple-50 rounded-full -mr-8 -mt-8 opacity-0 group-hover:opacity-10 transition-opacity duration-500"></div>

                            <div className="relative z-10 flex justify-between items-center">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                         <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">
                                            Orden ERP
                                         </span>
                                         {group.allSynced && <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider flex items-center gap-1"><CloudUpload className="w-3 h-3" /> Subida</span>}
                                         <span className="text-slate-400 text-xs">{new Date(group.lastDate).toLocaleDateString()}</span>
                                    </div>
                                    <h3 className="text-xl font-black text-slate-900 mb-1">{group.erp}</h3>
                                    <div className="flex items-center gap-4 text-sm text-slate-600 mt-2">
                                        <div className="flex items-center gap-1"><Box className="w-4 h-4 text-slate-400" /> <span className="font-bold text-slate-900">{group.count}</span> Bultos</div>
                                        <div className="flex items-center gap-1"><Package className="w-4 h-4 text-slate-400" /> <span className="font-bold text-slate-900">{group.totalUnits}</span> Unidades</div>
                                    </div>
                                </div>
                                <div className="bg-slate-50 p-3 rounded-full group-hover:bg-purple-600 group-hover:text-white transition-colors text-slate-400">
                                    <ArrowRight className="w-5 h-5" />
                                </div>
                            </div>
                        </button>
                    ))
                )}
            </div>
        </div>
    );
};
