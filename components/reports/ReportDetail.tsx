
import React, { useState } from 'react';
import { ChevronLeft, FileSpreadsheet, FileText, Sparkles, Trash2, Minus, Plus } from 'lucide-react';
import { ConsolidatedItem, CountingSession } from '../../types';
import * as sessionService from '../../services/sessionService';
import { analyzeConsolidation } from '../../services/gemini';
import { exportToExcel, exportToPDF } from '../../services/export';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { aggregateScans } from '../../services/aggregator';

interface ReportDetailProps {
    sessionId: string;
    onBack: () => void;
}

export const ReportDetail: React.FC<ReportDetailProps> = ({ sessionId, onBack }) => {
    const [loadingAi, setLoadingAi] = useState(false);
    const [aiReport, setAiReport] = useState<string>('');

    const fullSelectedSession = useLiveQuery(() => db.sessions.get(sessionId), [sessionId]);

    const consolidation = useLiveQuery(async () => {
        const scans = await db.scans.where('sessionId').equals(sessionId).toArray();
        if (scans.length === 0) return [];
        return await aggregateScans(scans);
    }, [sessionId], [] as ConsolidatedItem[]);

    // --- HANDLERS ---
    const handleGenerateAiReport = async () => {
        if (!fullSelectedSession || !consolidation || consolidation.length === 0) return;
        setLoadingAi(true);
        try {
            const result = await analyzeConsolidation(fullSelectedSession.erpOrder, fullSelectedSession.logisticsLabel, consolidation);
            setAiReport(result);
        } catch (e) {
            alert("Error IA");
        } finally {
            setLoadingAi(false);
        }
    };

    const handleIncrementItem = async (barcode: string) => {
        await sessionService.adjustSessionItemQuantity(sessionId, barcode, 1);
    };

    const handleDecrementItem = async (barcode: string, currentQty: number) => {
        if (currentQty <= 1) {
            if (window.confirm('¿Eliminar este item del registro?')) {
                await sessionService.deleteSessionItem(sessionId, barcode);
            }
        } else {
            await sessionService.adjustSessionItemQuantity(sessionId, barcode, -1);
        }
    };

    const handleDeleteItem = async (barcode: string) => {
        if (window.confirm('¿Eliminar todo el historial de este producto en esta sesión?')) {
            await sessionService.deleteSessionItem(sessionId, barcode);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] bg-slate-50">
            <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 shadow-sm sticky top-0 z-20">
                <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition-colors"><ChevronLeft className="w-5 h-5" /></button>
                <div>
                    <h2 className="font-bold text-slate-900 leading-tight">Detalle de Conteo</h2>
                    <div className="text-xs text-slate-500 font-mono">{fullSelectedSession?.erpOrder}</div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24">
                <div className="max-w-4xl mx-auto space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <button onClick={() => fullSelectedSession && exportToExcel(fullSelectedSession, consolidation)} className="bg-green-50 border border-green-200 text-green-700 hover:bg-green-100 px-4 py-3 rounded-xl shadow-sm transition-all flex flex-col items-center justify-center gap-1"><FileSpreadsheet className="w-5 h-5" /><span className="text-xs font-bold">Excel</span></button>
                        <button onClick={() => fullSelectedSession && exportToPDF(fullSelectedSession, consolidation)} className="bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 px-4 py-3 rounded-xl shadow-sm transition-all flex flex-col items-center justify-center gap-1"><FileText className="w-5 h-5" /><span className="text-xs font-bold">PDF Manifiesto</span></button>
                        <button onClick={handleGenerateAiReport} disabled={loadingAi || !consolidation || consolidation.length === 0} className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 px-4 py-3 rounded-xl shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 font-bold text-sm disabled:opacity-50">
                            {loadingAi ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Sparkles className="w-4 h-4" />} Analizar IA
                        </button>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                            <span className="font-bold text-slate-800 text-sm">Detalle de Productos</span>
                            <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">Total: {fullSelectedSession?.totalUnits || 0}</span>
                        </div>
                        <div className="divide-y divide-slate-100">
                            {consolidation?.map((item) => (
                                <div key={`${item.barcode}_${item.mm}_${item.yyyy}`} className="p-4 bg-white hover:bg-slate-50 transition-colors">
                                    <div className="flex justify-between items-start mb-3 gap-3">
                                        <div className="font-bold text-slate-800 text-lg leading-snug break-words">{item.productName}</div>
                                        <button onClick={() => handleDeleteItem(item.barcode)} className="text-slate-300 hover:text-red-500 p-2 hover:bg-red-50 rounded-lg transition-colors shrink-0"><Trash2 className="w-5 h-5" /></button>
                                    </div>
                                    
                                    <div className="flex items-center justify-between">
                                        <div className="flex flex-col gap-1">
                                            <span className="font-mono text-slate-600 text-xs bg-slate-100 px-2 py-1 rounded w-fit font-bold border border-slate-200">{item.barcode}</span>
                                            <div className="flex gap-2 items-center">
                                                <span className="text-xs text-slate-400 font-medium">{item.scans} eventos</span>
                                                {item.mm && item.yyyy && (
                                                    <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-bold border border-blue-100">
                                                        Vence: {item.mm}/{item.yyyy}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center bg-slate-50 shadow-inner rounded-xl p-1 border border-slate-200">
                                            <button onClick={() => handleDecrementItem(item.barcode, item.totalQuantity)} className="w-12 h-12 flex items-center justify-center bg-white hover:bg-red-50 rounded-lg text-slate-500 hover:text-red-500 transition-all active:scale-95 border border-slate-200 shadow-sm"><Minus className="w-6 h-6" /></button>
                                            <div className="min-w-[4rem] text-center font-black text-2xl text-slate-900">{item.totalQuantity}</div>
                                            <button onClick={() => handleIncrementItem(item.barcode)} className="w-12 h-12 flex items-center justify-center bg-white hover:bg-blue-50 rounded-lg text-slate-500 hover:text-blue-600 transition-all active:scale-95 border border-slate-200 shadow-sm"><Plus className="w-6 h-6" /></button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
