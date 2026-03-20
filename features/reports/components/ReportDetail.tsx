
import React, { useState } from 'react';
import { ChevronLeft, Trash2, Minus, Plus, Cloud, Printer, Loader2, FileSpreadsheet, FileText } from 'lucide-react';
import * as sessionService from '../../../services/sessionService';
import { useLiveQuery } from 'dexie-react-hooks';
import { exportToExcel, exportToPDF } from '../../../services/export';
import { thermalPrinter } from '../../../services/thermalPrinterService';
import { normalizeSku } from '../../../services/utils';
import { determineItemStatus, getStatusColorClasses } from '../../../services/uiLogic';
import { aggregateScans } from '../../../services/aggregator';
import { SessionRepository } from '../../../repositories/SessionRepository';
import { ScanRepository } from '../../../repositories/ScanRepository';

export const ReportDetail: React.FC<{ sessionId: string; onBack: () => void }> = ({ sessionId, onBack }) => {
 const [isPrinting, setIsPrinting] = useState(false);
 const session = useLiveQuery(() => SessionRepository.getById(sessionId), [sessionId]);

 const consolidation = useLiveQuery(async () => {
 const scans = await ScanRepository.getBySessionId(sessionId);
 const physicalItems = await aggregateScans(scans);
 
 const expectedMap = new Map(session?.expectedItems?.map(i => [normalizeSku(i.barcode), i.expectedQty]));

 const results = physicalItems.map(pi => ({
 ...pi,
 expectedQuantity: expectedMap.get(normalizeSku(pi.barcode)) || 0
 }));

 // Inyectar ítems faltantes de la guía
 if (session?.isVerifiedMode && session.expectedItems) {
 const scannedSet = new Set(physicalItems.map(pi => normalizeSku(pi.barcode)));
 session.expectedItems.forEach(exp => {
 if (!scannedSet.has(normalizeSku(exp.barcode))) {
 results.push({ barcode: exp.barcode, productName: exp.name, totalQuantity: 0, expectedQuantity: exp.expectedQty, scans: 0 });
 }
 });
 }
 return results.sort((a,b) => b.totalQuantity - a.totalQuantity);
 }, [sessionId, session]);

 const handleThermalPrint = async () => {
 if (!session || !consolidation?.length) return;
 setIsPrinting(true);
 try { await thermalPrinter.printSummaryReport(session.erpOrder, session.logisticsLabel, consolidation); } 
 finally { setIsPrinting(false); }
 };

 return (
 <div className="flex flex-col h-screen bg-slate-50">
 <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-20">
 <div className="flex items-center gap-3">
 <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full"><ChevronLeft className="w-5 h-5" /></button>
 <div><h2 className="font-black text-slate-900 leading-none uppercase">{session?.erpOrder}</h2><span className="text-[10px] text-slate-400 font-bold uppercase">{session?.logisticsLabel}</span></div>
 </div>
 <div className="flex gap-2">
 <button onClick={handleThermalPrint} disabled={isPrinting} className="p-2 bg-slate-900 text-white rounded-xl shadow-md">{isPrinting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Printer className="w-5 h-5" />}</button>
 <button onClick={() => session && consolidation && exportToExcel(session, consolidation)} className="p-2 bg-green-50 text-green-700 rounded-xl border border-green-200"><FileSpreadsheet className="w-5 h-5" /></button>
 <button onClick={() => session && consolidation && exportToPDF(session, consolidation)} className="p-2 bg-rose-50 text-rose-700 rounded-xl border border-rose-200"><FileText className="w-5 h-5" /></button>
 </div>
 </header>

 <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24">
 <div className="max-w-4xl mx-auto space-y-4">
 {session?.labelPhoto && (
 <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm overflow-hidden mb-4">
 <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Evidencia de Etiqueta</h3>
 <div className="aspect-video rounded-2xl overflow-hidden bg-black">
 <img src={session.labelPhoto} alt="Label" className="w-full h-full object-contain" />
 </div>
 </div>
 )}
 {consolidation?.map((item) => {
 const status = determineItemStatus(item.totalQuantity, item.expectedQuantity);
 return (
 <div key={item.barcode} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
 <div className="min-w-0 flex-1 pr-4">
 <h4 className="font-black text-slate-900 uppercase truncate text-sm">{item.productName}</h4>
 <div className="flex items-center gap-3 mt-1"><span className="font-mono text-blue-600 text-[10px] font-bold">{item.barcode}</span>{item.expectedQuantity > 0 && <span className="text-[8px] font-black bg-slate-100 px-2 py-0.5 rounded uppercase">Meta: {item.expectedQuantity}</span>}</div>
 </div>
 <div className="flex items-center gap-4">
 <div className={`text-2xl font-black tabular-nums ${getStatusColorClasses(status, 'text')}`}>{item.totalQuantity}</div>
 <button onClick={() => sessionService.deleteSessionItem(sessionId, item.barcode)} className="p-2 text-slate-300 hover:text-rose-600"><Trash2 className="w-5 h-5" /></button>
 </div>
 </div>
 );
 })}
 </div>
 </div>
 </div>
 );
};
