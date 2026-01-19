
import React from 'react';
import { ChevronLeft, Trash2, Minus, Plus, Cloud, CloudOff } from 'lucide-react';
import * as sessionService from '../../services/sessionService';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';

interface ReportDetailProps {
    sessionId: string;
    onBack: () => void;
}

export const ReportDetail: React.FC<ReportDetailProps> = ({ sessionId, onBack }) => {
    const fullSelectedSession = useLiveQuery(() => db.sessions.get(sessionId), [sessionId]);

    const consolidation = useLiveQuery(async () => {
        const scans = await db.scans.where('sessionId').equals(sessionId).toArray();
        if (scans.length === 0) return [];
        
        const products = await db.products.toArray();
        const productMap: Record<string, string> = {};
        products.forEach(p => productMap[p.barcode] = p.name);

        const aggregation: Record<string, any> = {};
        for (const scan of scans) {
            const key = `${scan.barcode}_${scan.mm || 0}_${scan.yyyy || 0}`;
            if (!aggregation[key]) {
                aggregation[key] = {
                    barcode: scan.barcode,
                    productName: productMap[scan.barcode] || 'Cargando...',
                    totalQuantity: 0,
                    scans: 0,
                    mm: scan.mm,
                    yyyy: scan.yyyy,
                    isSynced: true
                };
            }
            aggregation[key].totalQuantity += scan.quantity;
            aggregation[key].scans += 1;
            if (!scan.synced) aggregation[key].isSynced = false;
        }
        return Object.values(aggregation);
    }, [sessionId], [] as any[]);

    const handleIncrementItem = async (barcode: string) => {
        await sessionService.adjustSessionItemQuantity(sessionId, barcode, 1);
    };

    const handleDecrementItem = async (barcode: string, currentQty: number) => {
        if (currentQty <= 1) {
            if (window.confirm('¿Eliminar registro?')) await sessionService.deleteSessionItem(sessionId, barcode);
        } else {
            await sessionService.adjustSessionItemQuantity(sessionId, barcode, -1);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] bg-slate-50">
            <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 shadow-sm sticky top-0 z-20">
                <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-600"><ChevronLeft className="w-5 h-5" /></button>
                <div className="flex-1">
                    <h2 className="font-black text-slate-900 leading-tight uppercase tracking-tight">{fullSelectedSession?.erpOrder}</h2>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{fullSelectedSession?.logisticsLabel}</span>
                        {fullSelectedSession?.lastSyncTimestamp && <Cloud className="w-3.5 h-3.5 text-blue-500" />}
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 no-scrollbar">
                <div className="max-w-4xl mx-auto space-y-6">
                    <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
                        <div className="px-8 py-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                            <span className="font-black text-slate-900 text-[10px] uppercase tracking-widest">Matriz de Productos</span>
                            <span className="bg-slate-900 text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">{fullSelectedSession?.totalUnits || 0} U.</span>
                        </div>
                        <div className="divide-y divide-slate-100">
                            {consolidation?.map((item) => (
                                <div key={`${item.barcode}_${item.mm}_${item.yyyy}`} className="p-6 bg-white hover:bg-slate-50 transition-colors relative">
                                    <div className="absolute top-6 right-6">
                                        {item.isSynced ? <Cloud className="w-4 h-4 text-emerald-400" /> : <CloudOff className="w-4 h-4 text-orange-300" />}
                                    </div>
                                    
                                    <div className="pr-10 mb-4">
                                        <div className="font-black text-slate-900 text-sm uppercase leading-tight mb-1">{item.productName}</div>
                                        <div className="flex items-center gap-3">
                                            <span className="font-mono text-blue-600 text-[10px] font-bold">{item.barcode}</span>
                                            {item.mm && <span className="text-[8px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-black uppercase">Exp: {item.mm}/{item.yyyy}</span>}
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex items-center bg-slate-50 rounded-2xl p-1 border border-slate-200 flex-1 h-14">
                                            <button onClick={() => handleDecrementItem(item.barcode, item.totalQuantity)} className="w-12 h-full flex items-center justify-center bg-white hover:bg-rose-50 rounded-xl text-slate-400 hover:text-rose-600 transition-all border border-slate-100 shadow-sm"><Minus className="w-5 h-5" /></button>
                                            <div className="flex-1 text-center font-black text-2xl text-slate-900">{item.totalQuantity}</div>
                                            <button onClick={() => handleIncrementItem(item.barcode)} className="w-12 h-full flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all shadow-lg shadow-blue-100"><Plus className="w-5 h-5" /></button>
                                        </div>
                                        <button onClick={() => sessionService.deleteSessionItem(sessionId, item.barcode)} className="p-4 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all"><Trash2 className="w-5 h-5" /></button>
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
