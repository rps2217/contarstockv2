
import React, { useState } from 'react';
import { ChevronLeft, Trash2, Minus, Plus, Cloud, Printer, Loader2, FileSpreadsheet, FileText, Zap, Search, CheckCircle2 } from 'lucide-react';
import * as sessionService from '../../../services/sessionService';
import { useLiveQuery } from 'dexie-react-hooks';
import { exportToExcel, exportToPDF, exportDiscrepancyPDF } from '../../../services/export';
import { thermalPrinter } from '../../../services/thermalPrinterService';
import { normalizeSku } from '../../../services/utils';
import { determineItemStatus, getStatusColorClasses } from '../../../services/uiLogic';
import { aggregateScans } from '../../../services/aggregator';
import { SessionRepository } from '../../../repositories/SessionRepository';
import { ScanRepository } from '../../../repositories/ScanRepository';
import { DetectiveService } from '../../../services/detectiveService';
import { MatchResult } from '../../../types';

import { useAppStore } from '@/stores';

export const ReportDetail: React.FC<{ sessionId: string; onBack: () => void }> = ({ sessionId, onBack }) => {
  const { settings } = useAppStore();
  const theme = settings.theme;
  const [isPrinting, setIsPrinting] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [matchResults, setMatchResults] = useState<MatchResult[]>([]);
  const [showDetective, setShowDetective] = useState(false);
  const session = useLiveQuery(() => SessionRepository.getById(sessionId), [sessionId]);

 const consolidation = useLiveQuery(async () => {
 const scans = await ScanRepository.getBySession(sessionId);
 const physicalItems = await aggregateScans(scans);
 
 const expectedMap = new Map(session?.expectedItems?.map(i => [normalizeSku(i.barcode), i.expectedQty]));

  const results = physicalItems.map(pi => {
    const expected = expectedMap.get(normalizeSku(pi.barcode)) || 0;
    return {
      ...pi,
      expectedQuantity: expected,
      difference: pi.totalQuantity - expected
    };
  });

 // Inyectar ítems faltantes de la guía
 if (session?.isVerifiedMode && session.expectedItems) {
 const scannedSet = new Set(physicalItems.map(pi => normalizeSku(pi.barcode)));
 session.expectedItems.forEach(exp => {
 if (!scannedSet.has(normalizeSku(exp.barcode))) {
        results.push({ 
          barcode: exp.barcode, 
          productName: exp.name, 
          totalQuantity: 0, 
          expectedQuantity: exp.expectedQty, 
          difference: -exp.expectedQty,
          scans: 0 
        });
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

 const handleDetectiveSearch = async () => {
 if (!consolidation?.length) return;
 setIsSearching(true);
 setShowDetective(true);
 try {
 const results = await DetectiveService.findMatchingOrders(consolidation);
 setMatchResults(results);
 } catch (err) {
 console.error("Detective Error:", err);
 } finally {
 setIsSearching(false);
 }
 };

 const handleLinkOrder = async (match: MatchResult) => {
 if (!session) return;
 const confirmMsg = `¿Vincular este bulto con la Orden ${match.expectedOrder.internalId}? (${match.matchScore.toFixed(1)}% de coincidencia)`;
 if (!confirm(confirmMsg)) return;

 await SessionRepository.update(sessionId, {
 erpOrder: match.expectedOrder.internalId,
 expectedItems: match.expectedOrder.items,
 isVerifiedMode: true,
 auditStatus: match.status === 'exact' ? 'verified' : 'failed'
 });
 setShowDetective(false);
 };

 return (
 <div className={`flex flex-col h-screen ${theme === 'dark' ? 'bg-brand-background' : 'bg-slate-50'}`}>
 <header className={`border-b px-4 py-3 flex items-center justify-between sticky top-0 z-20 ${
   theme === 'dark' ? 'bg-brand-surface border-white/5' : 'bg-white border-slate-200'
 }`}>
 <div className="flex items-center gap-3">
 <button onClick={onBack} className={`p-2 rounded-full transition-colors ${theme === 'dark' ? 'hover:bg-white/5 text-slate-400' : 'hover:bg-slate-100 text-slate-600'}`}><ChevronLeft className="w-5 h-5" /></button>
 <div><h2 className={`font-black leading-none uppercase ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{session?.erpOrder}</h2><span className="text-[10px] text-slate-400 font-bold uppercase">{session?.logisticsLabel}</span></div>
 </div>
 <div className="flex gap-2">
 {session && !session.isVerifiedMode && (
 <button 
 onClick={handleDetectiveSearch}
 className="p-2 bg-indigo-600 text-white rounded-xl shadow-md hover:bg-indigo-700 transition-colors"
 title="Detective IA: Buscar Orden"
 >
 <Zap className={`w-5 h-5 ${isSearching ? 'animate-pulse' : ''}`} />
 </button>
 )}
 <button onClick={handleThermalPrint} disabled={isPrinting} className="p-2 bg-slate-900 text-white rounded-xl shadow-md">{isPrinting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Printer className="w-5 h-5" />}</button>
 <button onClick={() => session && consolidation && exportToExcel(session, consolidation)} className="p-2 bg-green-50 text-green-700 rounded-xl border border-green-200"><FileSpreadsheet className="w-5 h-5" /></button>
 <button onClick={() => session && consolidation && exportToPDF(session, consolidation)} className="p-2 bg-rose-50 text-rose-700 rounded-xl border border-rose-200"><FileText className="w-5 h-5" /></button>
 </div>
 </header>

 <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24">
 <div className="max-w-4xl mx-auto space-y-4">
 {showDetective && (
 <div className={`bg-indigo-50 border-2 border-indigo-200 rounded-[2rem] p-6 mb-6 animate-in slide-in-from-top duration-300 ${
   theme === 'dark' ? 'bg-indigo-950/30 border-indigo-500/20' : ''
 }`}>
 <div className="flex items-center justify-between mb-4">
 <div className="flex items-center gap-2">
 <Zap className="w-5 h-5 text-indigo-600" />
 <h3 className={`font-black uppercase text-xs tracking-widest ${theme === 'dark' ? 'text-indigo-300' : 'text-indigo-900'}`}>Resultados del Detective IA</h3>
 </div>
 <button onClick={() => setShowDetective(false)} className="text-[10px] font-black uppercase text-indigo-400 hover:text-indigo-600">Cerrar</button>
 </div>

 {isSearching ? (
 <div className="flex flex-col items-center py-8 gap-3">
 <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
 <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Analizando patrones semánticos...</p>
 </div>
 ) : matchResults.length > 0 ? (
 <div className="grid gap-3">
 {matchResults.map((match, idx) => (
 <div key={idx} className={`p-4 rounded-2xl border flex items-center justify-between shadow-sm ${
   theme === 'dark' ? 'bg-brand-surface border-white/5' : 'bg-white border-indigo-100'
 }`}>
 <div>
 <div className="flex items-center gap-2">
 <span className={`font-black uppercase ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{match.expectedOrder.internalId}</span>
 <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${
 match.matchScore > 90 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
 }`}>
 {match.matchScore.toFixed(0)}% Match
 </span>
 </div>
 <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">
 {match.semanticAffinities} vínculos semánticos detectados
 </p>
 </div>
 <div className="flex gap-2">
 <button 
 onClick={() => exportDiscrepancyPDF(match, session?.logisticsLabel || 'Bulto')}
 className={`p-2 text-rose-600 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-rose-50'}`}
 title="Ver Discrepancias"
 >
 <FileText className="w-4 h-4" />
 </button>
 <button 
 onClick={() => handleLinkOrder(match)}
 className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700"
 >
 Vincular
 </button>
 </div>
 </div>
 ))}
 </div>
 ) : (
 <div className="text-center py-8">
 <Search className="w-8 h-8 text-indigo-200 mx-auto mb-2" />
 <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">No se encontraron compatibles</p>
 </div>
 )}
 </div>
 )}
 {session?.labelPhoto && (
 <div className={`p-4 rounded-3xl border shadow-sm overflow-hidden mb-4 ${
   theme === 'dark' ? 'bg-brand-surface border-white/5' : 'bg-white border-slate-200'
 }`}>
 <div className="flex items-center justify-between mb-2">
 <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Evidencia de Etiqueta</h3>
 {session.photoUrl && (
 <a 
 href={session.photoUrl} 
 target="_blank" 
 rel="noopener noreferrer"
 className="text-[9px] font-black text-blue-600 uppercase tracking-widest hover:underline flex items-center gap-1"
 >
 <Cloud className="w-3 h-3" /> Ver en Drive
 </a>
 )}
 </div>
 <div className="aspect-video rounded-2xl overflow-hidden bg-black">
 <img src={session.labelPhoto} alt="Label" className="w-full h-full object-contain" />
 </div>
 </div>
 )}
 {consolidation?.map((item) => {
 const status = determineItemStatus(item.totalQuantity, item.expectedQuantity);
 return (
 <div key={item.barcode} className={`p-5 rounded-3xl border shadow-sm flex items-center justify-between ${
   theme === 'dark' ? 'bg-brand-surface border-white/5' : 'bg-white border-slate-200'
 }`}>
 <div className="min-w-0 flex-1 pr-4">
 <h4 className={`font-black uppercase truncate text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{item.productName}</h4>
  <div className="flex items-center gap-3 mt-1">
    <span className="font-mono text-blue-600 text-[10px] font-bold">{item.barcode}</span>
    {item.expectedQuantity > 0 && (
      <div className="flex items-center gap-2">
        <span className="text-[8px] font-black bg-slate-100 px-2 py-0.5 rounded uppercase">Meta: {item.expectedQuantity}</span>
        {item.difference !== 0 && (
          <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${
            item.difference > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
          }`}>
            Dif: {item.difference > 0 ? `+${item.difference}` : item.difference}
          </span>
        )}
      </div>
    )}
  </div>
 </div>
 <div className="flex items-center gap-4">
 <div className={`text-2xl font-black tabular-nums ${getStatusColorClasses(status, 'text')}`}>{item.totalQuantity}</div>
 <button onClick={() => sessionService.deleteSessionItem(sessionId, item.barcode)} className={`p-2 transition-colors ${theme === 'dark' ? 'text-slate-500 hover:text-rose-500' : 'text-slate-300 hover:text-rose-600'}`}><Trash2 className="w-5 h-5" /></button>
 </div>
 </div>
 );
 })}
 </div>
 </div>
 </div>
 );
};

