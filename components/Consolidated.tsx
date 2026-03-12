
import React from 'react';
import { Layers, ChevronLeft, Package, Box, ArrowRight, Upload, Cloud } from 'lucide-react';
import { useConsolidated } from '../hooks/useConsolidated';
import { SearchBar } from './SearchBar';

export const Consolidated: React.FC = () => {
 const { state, actions } = useConsolidated();

 // VISTA DE DETALLE
 if (state.selectedErp) {
 return (
 <div className="flex flex-col h-screen bg-slate-50 animate-in fade-in duration-300">
 <div className="bg-white border-b border-slate-200 px-6 py-5 flex items-center justify-between sticky top-0 z-20 shadow-sm">
 <div className="flex items-center gap-4">
 <button onClick={() => actions.setSelectedErp(null)} className="p-2.5 bg-slate-50 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 rounded-full transition-all"><ChevronLeft className="w-5 h-5" /></button>
 <div>
 <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase leading-none">{state.selectedErp}</h2>
 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Visión Consolidada de Carga</p>
 </div>
 </div>
 </div>

 <div className="flex-1 overflow-y-auto p-4 md:p-8 no-scrollbar pb-32">
 <div className="max-w-4xl mx-auto space-y-8">
 <div className="grid grid-cols-2 gap-4">
 <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
 <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Bultos Físicos</div>
 <div className="text-4xl font-black text-slate-900">{state.details?.sessionsCount}</div>
 </div>
 <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
 <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Carga Total</div>
 <div className="text-4xl font-black text-indigo-600">{state.details?.totalUnits} <span className="text-xs text-slate-300 font-bold">U.</span></div>
 </div>
 </div>

 <div className="sticky top-2 z-10"><SearchBar onSearch={actions.setDetailSearchQuery} placeholder="Filtrar contenido..." /></div>

 <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
 <div className="px-8 py-5 border-b border-slate-100 bg-slate-50/30 flex justify-between items-center">
 <span className="font-black text-slate-900 text-[10px] uppercase tracking-widest">Matriz de Desglose</span>
 {state.details?.isFullySynced && <Cloud className="w-4 h-4 text-emerald-500" />}
 </div>
 <div className="divide-y divide-slate-50">
 {state.filteredDetailItems.map((item) => (
 <div key={`${item.barcode}_${item.mm}_${item.yyyy}`} className="p-5 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
 <div className="flex-1 min-w-0 mr-4">
 <div className="font-black text-slate-800 text-sm truncate uppercase tracking-tight">{item.productName}</div>
 <div className="flex items-center gap-2 mt-1">
 <div className="font-mono text-[10px] text-slate-400 font-bold">{item.barcode}</div>
 {(item.mm && item.yyyy) && (
 <span className="text-[8px] bg-slate-100 px-1.5 rounded text-slate-500 font-bold">EXP: {item.mm}/{item.yyyy}</span>
 )}
 </div>
 </div>
 <div className="text-right">
 <div className="text-2xl font-black text-slate-900 tabular-nums">{item.totalQuantity}</div>
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>
 </div>
 </div>
 );
 }

 // VISTA MAESTRA (LISTA DE ERPs)
 return (
 <div className="max-w-3xl mx-auto p-4 pt-6 animate-in fade-in duration-500 pb-32">
 <div className="flex items-center gap-4 mb-10">
 <div className="p-4 bg-indigo-600 text-white rounded-[1.5rem] shadow-xl shadow-indigo-200"><Layers className="w-8 h-8" /></div>
 <div>
 <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">Consolidados</h1>
 <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">Visión Corporativa (Excluye Auditorías)</p>
 </div>
 </div>

 <div className="mb-8"><SearchBar onSearch={actions.setSearchQuery} placeholder="Buscar por ERP..." /></div>

 <div className="grid grid-cols-1 gap-4">
 {state.erpGroups?.map(group => (
 <button 
 key={group.erp}
 onClick={() => actions.setSelectedErp(group.erp)}
 className="bg-white p-6 rounded-[2rem] border-2 border-slate-100 hover:border-indigo-400 hover:shadow-2xl hover:shadow-indigo-100 transition-all text-left flex justify-between items-center group active:scale-[0.98]"
 >
 <div className="flex-1">
 <div className="flex items-center gap-3 mb-3">
 <span className="bg-indigo-50 text-indigo-700 text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-indigo-100">GRUPO ERP</span>
 {group.allSynced && <Upload className="w-3 h-3 text-emerald-500" />}
 </div>
 <h3 className="text-2xl font-black text-slate-900 tracking-tight">{group.erp}</h3>
 <div className="flex items-center gap-6 text-[10px] text-slate-400 font-black uppercase tracking-widest mt-3">
 <div className="flex items-center gap-2"><Box className="w-3.5 h-3.5" /> {group.count} Bultos</div>
 <div className="flex items-center gap-2"><Package className="w-3.5 h-3.5" /> {group.totalUnits} Unidades</div>
 </div>
 </div>
 <div className="w-12 h-12 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-inner"><ArrowRight className="w-6 h-6" /></div>
 </button>
 ))}
 {state.erpGroups?.length === 0 && (
 <div className="text-center py-20 opacity-30">
 <Layers className="w-16 h-16 mx-auto mb-4" />
 <p className="font-black uppercase tracking-widest text-xs">Sin cargas estandar para consolidar</p>
 </div>
 )}
 </div>
 </div>
 );
};

export default Consolidated;
