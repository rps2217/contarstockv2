
import React, { useState } from 'react';
import { ChevronLeft, RefreshCw, ShieldCheck, CheckCircle2, Circle, Search } from 'lucide-react';
import { CountingSession } from '../../types';

interface Props {
 sessions: CountingSession[];
 onBack: () => void;
 onSelectMultiple: (ids: string[]) => void;
 isAnalyzing: boolean;
 progress: string;
}

export const SessionPickerStep: React.FC<Props> = ({ sessions, onBack, onSelectMultiple, isAnalyzing, progress }) => {
 const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
 const [searchTerm, setSearchTerm] = useState('');

 const toggleSelection = (id: string) => {
 const next = new Set(selectedIds);
 if (next.has(id)) next.delete(id);
 else next.add(id);
 setSelectedIds(next);
 };

 const filteredSessions = sessions.filter(s => 
 s.erpOrder.toLowerCase().includes(searchTerm.toLowerCase()) || 
 s.logisticsLabel.toLowerCase().includes(searchTerm.toLowerCase())
 );

 return (
 <div className="max-w-2xl mx-auto p-4 pt-8 animate-in fade-in flex flex-col h-full">
 <div className="shrink-0">
 <button onClick={onBack} className="flex items-center gap-2 text-slate-500 mb-6 hover:text-slate-900"><ChevronLeft className="w-5 h-5"/> Volver</button>
 <h1 className="text-2xl font-bold text-slate-900 mb-2">Selección de Bultos</h1>
 <p className="text-slate-500 text-sm mb-6 font-medium">Selecciona uno o varios bultos físicos para sumar su contenido y cruzarlos con el Excel.</p>
 
 <div className="relative mb-6">
 <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
 <input 
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 placeholder="Filtrar por ERP o Etiqueta..." 
 className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-12 pr-4 shadow-sm outline-none focus:border-indigo-500 transition-all"
 />
 </div>
 </div>
 
 {isAnalyzing && (
 <div className="fixed inset-0 z-50 bg-white/80 flex flex-col items-center justify-center p-8 text-center animate-in fade-in">
 <RefreshCw className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
 <h3 className="text-xl font-bold text-slate-900">Detective Analizando...</h3>
 <p className="text-slate-500 mt-2 font-mono text-xs">{progress}</p>
 </div>
 )}

 <div className="flex-1 overflow-y-auto space-y-3 pb-32 no-scrollbar">
 {filteredSessions?.map(s => {
 const isSelected = selectedIds.has(s.id);
 return (
 <button 
 key={s.id} 
 onClick={() => toggleSelection(s.id)}
 disabled={isAnalyzing}
 className={`w-full p-5 rounded-2xl border transition-all text-left flex justify-between items-center group relative overflow-hidden ${isSelected ? 'bg-indigo-50 border-indigo-500 shadow-md ring-2 ring-indigo-200' : 'bg-white border-slate-200 hover:border-indigo-300'}`}
 >
 <div className="flex items-center gap-4">
 <div className={`shrink-0 transition-colors ${isSelected ? 'text-indigo-600' : 'text-slate-300'}`}>
 {isSelected ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
 </div>
 <div>
 <div className="font-black text-slate-900 flex items-center gap-2 text-lg">
 {s.erpOrder}
 {s.auditStatus === 'verified' && <ShieldCheck className="w-4 h-4 text-emerald-500" />}
 </div>
 <div className="text-xs text-slate-400 mt-1 font-mono uppercase tracking-tighter">{s.logisticsLabel}</div>
 </div>
 </div>
 <div className="text-right">
 <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{new Date(s.createdAt).toLocaleDateString()}</div>
 <div className="text-xs font-bold text-slate-600 mt-1">{s.totalUnits || 0} Unid.</div>
 </div>
 </button>
 );
 })}
 {sessions.length === 0 && (
 <div className="text-center py-20 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl">
 <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No hay sesiones registradas</p>
 </div>
 )}
 </div>

 {selectedIds.size > 0 && !isAnalyzing && (
 <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-md px-4 z-40">
 <button 
 onClick={() => onSelectMultiple(Array.from(selectedIds))}
 className="w-full bg-slate-900 text-white font-black py-5 rounded-2xl shadow-2xl flex items-center justify-center gap-3 animate-in slide-in-from-bottom-4 transition-all active:scale-95 hover:bg-slate-800"
 >
 ANALIZAR {selectedIds.size} BULTOS
 <span className="bg-white/20 px-2 py-0.5 rounded-lg text-xs">{selectedIds.size}</span>
 </button>
 </div>
 )}
 </div>
 );
};
