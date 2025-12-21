
import React, { useState, useMemo } from 'react';
import { Layers, ChevronLeft, Package, Box, FileSpreadsheet, FileText, ArrowRight, Upload, ShieldCheck, AlertTriangle } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { CountingSession } from '../types';
import { exportToExcel, exportToPDF } from '../services/export';
import { aggregateScans } from '../services/aggregator';
import { SearchBar } from './SearchBar';
import { useNavigate } from 'react-router-dom';

export const Consolidated: React.FC = () => {
    const navigate = useNavigate();
    const [selectedErp, setSelectedErp] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [detailSearchQuery, setDetailSearchQuery] = useState('');

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
                .limit(200)
                .toArray();
        } else {
            sessions = await db.sessions
                .orderBy('createdAt')
                .reverse()
                .limit(200) 
                .toArray();
        }

        const groups: Record<string, { count: number, lastDate: number, totalUnits: number, sessionIds: string[], allSynced: boolean, verifiedCount: number, alertCount: number }> = {};

        for (const s of sessions) {
            if (!groups[s.erpOrder]) {
                groups[s.erpOrder] = { count: 0, lastDate: 0, totalUnits: 0, sessionIds: [], allSynced: true, verifiedCount: 0, alertCount: 0 };
            }
            groups[s.erpOrder].count++;
            groups[s.erpOrder].lastDate = Math.max(groups[s.erpOrder].lastDate, s.createdAt);
            groups[s.erpOrder].sessionIds.push(s.id);
            groups[s.erpOrder].totalUnits += (s.totalUnits || 0);
            
            if (!s.lastSyncTimestamp) {
                groups[s.erpOrder].allSynced = false;
            }

            if (s.auditStatus === 'verified') groups[s.erpOrder].verifiedCount++;
            else if (s.auditStatus === 'warning' || s.auditStatus === 'failed') groups[s.erpOrder].alertCount++;
        }

        return Object.entries(groups)
            .map(([erp, data]) => ({ erp, ...data }))
            .sort((a, b) => b.lastDate - a.lastDate);

    }, [searchQuery], []);

    // 2. OPTIMIZED DETAIL QUERY
    const details = useLiveQuery(async () => {
        if (!selectedErp) return null;

        const sessions = await db.sessions.where('erpOrder').equals(selectedErp).toArray();
        const sessionIds = sessions.map(s => s.id);
        
        const scans = await db.scans.where('sessionId').anyOf(sessionIds).toArray();
        const items = await aggregateScans(scans);

        const logisticsLabels = sessions.map(s => s.logisticsLabel).join(', ');
        const isFullySynced = sessions.every(s => !!s.lastSyncTimestamp);

        const verifiedCount = sessions.filter(s => s.auditStatus === 'verified').length;
        const totalCount = sessions.length;

        return {
            items,
            sessionsCount: totalCount,
            logisticsLabels,
            lastDate: Math.max(...sessions.map(s => s.createdAt)),
            isFullySynced,
            verifiedCount
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

    if (selectedErp) {
        return (
            <div className="flex flex-col h-[calc(100vh-64px)] bg-slate-50">
                <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 shadow-sm sticky top-0 z-20">
                    <button onClick={handleBackToMain} className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition-colors"><ChevronLeft className="w-5 h-5" /></button>
                    <div className="flex-1">
                        <h2 className="font-black text-slate-900 leading-tight uppercase tracking-tight text-sm">Consolidado ERP</h2>
                        <div className="text-xs text-slate-500 font-mono font-bold">{selectedErp}</div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24">
                    <div className="max-w-4xl mx-auto space-y-6">
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                                <div>
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Orden ERP Total</div>
                                    <div className="text-3xl font-black text-slate-900 flex items-center gap-2 tracking-tight">
                                        {selectedErp}
                                        {details?.isFullySynced && <span className="bg-green-100 text-green-700 p-1 rounded-full"><Upload className="w-4 h-4" /></span>}
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <button onClick={handleExportExcel} className="bg-white border border-green-200 text-green-700 hover:bg-green-50 px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-colors active:scale-95"><FileSpreadsheet className="w-4 h-4" /> Excel</button>
                                    <button onClick={handleExportPDF} className="bg-white border border-red-200 text-red-700 hover:bg-red-50 px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-colors active:scale-95"><FileText className="w-4 h-4" /> PDF</button>
                                </div>
                             </div>
                             <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100"><div className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1">Bultos</div><div className="text-2xl font-black text-slate-900">{details?.sessionsCount}</div></div>
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100"><div className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1">Total Unidades</div><div className="text-2xl font-black text-blue-600">{details?.items.reduce((acc, i) => acc + i.totalQuantity, 0)}</div></div>
                             </div>
                        </div>
                        
                        <div className="sticky top-0 bg-slate-50 pt-2 pb-2 z-10">
                            <SearchBar onSearch={handleDetailSearch} placeholder="Buscar producto..." />
                        </div>

                        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                                <span className="font-bold text-slate-800 text-xs uppercase tracking-wider">Desglose</span>
                                <span className="text-[10px] font-black text-slate-400 uppercase">{filteredItems.length} SKUs</span>
                            </div>
                            <div className="divide-y divide-slate-100">
                                {filteredItems.map((item) => (
                                     <div key={`${item.barcode}_${item.mm}_${item.yyyy}`} className="p-4 bg-white hover:bg-slate-50 transition-colors flex items-center justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="font-bold text-slate-900 text-sm leading-tight mb-1 truncate">{item.productName}</div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded font-bold">{item.barcode}</span>
                                                {item.mm && item.yyyy && <span className="text-[9px] font-bold text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded">EXP {item.mm}/{item.yyyy}</span>}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-black text-xl text-slate-900 tabular-nums">{item.totalQuantity}</div>
                                        </div>
                                     </div>
                                ))}
                                {filteredItems.length === 0 && <div className="p-12 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">Sin resultados</div>}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto pb-24 px-4 pt-6 animate-in fade-in">
             <div className="flex items-center gap-3 mb-8">
                <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition-colors">
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Consolidados</h1>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Agrupación por Orden de Compra</p>
                </div>
            </div>

            <div className="mb-6">
                <SearchBar onSearch={handleSearch} placeholder="Filtrar por ERP..." />
            </div>

            <div className="space-y-3">
                {!erpGroups || erpGroups.length === 0 ? (
                     <div className="text-center py-20 bg-white rounded-[2.5rem] border border-slate-200 shadow-sm border-dashed">
                        <Layers className="w-16 h-16 mx-auto text-slate-200 mb-4" />
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">
                            {searchQuery ? 'Sin coincidencias' : 'No hay datos'}
                        </p>
                    </div>
                ) : (
                    erpGroups.map(group => (
                        <button 
                            key={group.erp}
                            onClick={() => setSelectedErp(group.erp)}
                            className="w-full bg-white p-5 rounded-2xl shadow-sm border border-slate-200 hover:border-blue-300 transition-all text-left group relative overflow-hidden active:scale-[0.98]"
                        >
                            <div className="flex justify-between items-center">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                         <span className="bg-purple-50 text-purple-700 text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider border border-purple-100">
                                            ERP
                                         </span>
                                         {group.allSynced && <span className="bg-green-50 text-green-700 text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1 border border-green-100"><Upload className="w-3 h-3" /> Subida</span>}
                                    </div>
                                    <h3 className="text-lg font-black text-slate-900">{group.erp}</h3>
                                    <div className="flex items-center gap-4 text-xs text-slate-500 mt-2 font-medium">
                                        <div className="flex items-center gap-1"><Box className="w-3 h-3 text-slate-400" /> <span className="font-bold text-slate-700">{group.count}</span> Bultos</div>
                                        <div className="flex items-center gap-1"><Package className="w-3 h-3 text-slate-400" /> <span className="font-bold text-slate-700">{group.totalUnits}</span> Unidades</div>
                                    </div>
                                </div>
                                <div className="p-2 bg-slate-50 rounded-full text-slate-300 group-hover:bg-blue-600 group-hover:text-white transition-colors">
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
