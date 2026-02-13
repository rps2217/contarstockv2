
import React, { useState } from 'react';
import { ChevronLeft, ShieldCheck, Ban, Check, Link, PackageMinus, PackagePlus, PackageCheck, Sparkles, Brain, ArrowRight, Fingerprint, Zap, Printer } from 'lucide-react';
import { MatchResult, AliasSuggestion } from '../../types';
import { determineItemStatus, getStatusColorClasses } from '../../services/uiLogic';

interface Props {
    match: MatchResult;
    onBack: () => void;
    onExportPDF: () => void;
    onAssign: () => void;
    onLinkAlias: (alias: AliasSuggestion) => void;
    linkedAliases: Set<string>;
    sessionLabel: string;
}

export const AnalysisResults: React.FC<Props> = ({ match, onBack, onExportPDF, onAssign, onLinkAlias, linkedAliases, sessionLabel }) => {
    const [activeTab, setActiveTab] = useState<'missing' | 'extra' | 'match' | 'links'>(match.potentialAliases.length > 0 ? 'links' : 'missing');

    const score = match.matchScore;
    let verdictColor = 'bg-emerald-500', verdictText = 'Identidad Certificada', verdictIcon = <ShieldCheck className="w-8 h-8 text-white" />, verdictBg = 'bg-emerald-50 border-emerald-100', verdictTextColor = 'text-emerald-900';

    if (score < 50) {
        verdictColor = 'bg-rose-600'; verdictText = 'Inconsistencia Crítica'; verdictIcon = <Ban className="w-8 h-8 text-white" />; verdictBg = 'bg-rose-50 border-rose-100'; verdictTextColor = 'text-rose-900';
    } else if (score < 88) {
        verdictColor = 'bg-indigo-600'; verdictText = 'Deducción Semántica'; verdictIcon = <Brain className="w-8 h-8 text-white animate-pulse" />; verdictBg = 'bg-indigo-50 border-indigo-100'; verdictTextColor = 'text-indigo-900';
    }

    const aliasPhysicals = new Set(match.potentialAliases.map(a => a.physicalBarcode));
    const aliasExpected = new Set(match.potentialAliases.map(a => a.expectedBarcode));

    const breakdown = {
        missing: match.details.filter(d => d.difference < 0 && !aliasExpected.has(d.barcode)),
        extra: match.details.filter(d => d.difference > 0 && !aliasPhysicals.has(d.barcode)),
        match: match.details.filter(d => d.difference === 0 || d.isSemanticMatch),
        links: match.potentialAliases
    };

    const activeList = activeTab === 'links' ? [] : (breakdown[activeTab] || []);

    return (
        <div className="bg-slate-50 min-h-screen flex flex-col font-mono select-none">
            <div className="bg-white px-4 py-3 border-b border-slate-200 flex items-center justify-between sticky top-0 z-20 shadow-sm">
                <div className="flex items-center gap-2">
                    <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><ChevronLeft className="w-5 h-5"/></button>
                    <span className="font-black text-[10px] uppercase tracking-widest text-slate-400 italic">Módulo_Detective_v6</span>
                </div>
                <div className="flex gap-2">
                    <button onClick={onExportPDF} className="text-rose-600 bg-rose-50 px-3 py-1.5 rounded-xl text-[10px] font-black flex items-center gap-2 border border-rose-100 uppercase active:scale-95 transition-all">
                        <Printer className="w-4 h-4" /> PDF
                    </button>
                </div>
            </div>

            <div className="p-4 max-w-2xl mx-auto w-full flex-1 overflow-y-auto pb-24 no-scrollbar">
                
                {/* HUD DE VEREDICTO INDUSTRIAL */}
                <div className={`rounded-[2.5rem] p-8 shadow-xl border-4 mb-6 relative overflow-hidden animate-in zoom-in-95 duration-500 ${verdictBg} ${verdictColor.replace('bg-', 'border-')}/20`}>
                    <div className="flex justify-between items-center gap-6 relative z-10">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className={`p-3 rounded-2xl shadow-lg ${verdictColor}`}>{verdictIcon}</div>
                                <span className={`font-black text-5xl tracking-tighter tabular-nums ${verdictTextColor}`}>{score.toFixed(0)}%</span>
                            </div>
                            <h2 className={`text-xl font-black uppercase italic ${verdictTextColor}`}>{verdictText}</h2>
                            {match.semanticAffinities > 0 && (
                                <div className="mt-3 inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase shadow-lg shadow-indigo-200 animate-bounce">
                                    <Sparkles className="w-3.5 h-3.5" /> {match.semanticAffinities} DEDUCCIONES IA
                                </div>
                            )}
                        </div>
                        <button 
                            onClick={onAssign} 
                            className="bg-slate-900 hover:bg-black text-white px-8 py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl active:scale-95 transition-all border-b-4 border-black"
                        >
                            Asignar ERP
                        </button>
                    </div>
                    {/* Marca de agua IA */}
                    <div className="absolute -right-12 -bottom-12 opacity-[0.03] rotate-12 scale-150">
                        <Fingerprint className="w-64 h-64" />
                    </div>
                </div>

                {/* SELECTOR DE VISTA (TABS) */}
                <div className="flex bg-slate-200/50 p-1.5 rounded-[2rem] mb-6 gap-1 border border-slate-200 shadow-inner">
                    {[
                        {id: 'links', label: 'IA-LINKS', icon: Brain, count: breakdown.links.length, color: 'text-indigo-600'},
                        {id: 'missing', label: 'FALTANTES', icon: PackageMinus, count: breakdown.missing.length, color: 'text-rose-600'},
                        {id: 'extra', label: 'EXCEDENTES', icon: PackagePlus, count: breakdown.extra.length, color: 'text-amber-600'},
                        {id: 'match', label: 'INTEGROS', icon: PackageCheck, count: breakdown.match.length, color: 'text-emerald-600'}
                    ].map(tab => (
                        <button 
                            key={tab.id} 
                            onClick={() => { if(navigator.vibrate) navigator.vibrate(5); setActiveTab(tab.id as any); }} 
                            className={`flex-1 py-4 rounded-[1.5rem] text-[9px] font-black uppercase transition-all flex flex-col items-center justify-center gap-1.5 relative ${activeTab === tab.id ? 'bg-white shadow-lg scale-105 z-10 border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? tab.color : ''}`} />
                            <span className="tracking-tighter">{tab.label}</span>
                            {tab.count > 0 && <span className={`absolute -top-1 -right-1 text-[8px] min-w-[1.2rem] h-5 px-1 flex items-center justify-center rounded-full text-white font-black shadow-md ${activeTab === tab.id ? (tab.color.replace('text', 'bg')) : 'bg-slate-400'}`}>{tab.count}</span>}
                        </button>
                    ))}
                </div>

                {/* LISTA DINÁMICA DE RESULTADOS */}
                <div className="space-y-3">
                    {activeTab === 'links' && breakdown.links.length > 0 && (
                        <div className="space-y-4">
                            {breakdown.links.map((link, idx) => {
                                const isLinked = linkedAliases.has(link.physicalBarcode);
                                return (
                                    <div key={idx} className={`bg-white border-4 rounded-[2.5rem] p-6 shadow-md relative overflow-hidden transition-all animate-in slide-in-from-right-4 ${isLinked ? 'border-emerald-100 opacity-60' : 'border-indigo-100 ring-4 ring-indigo-50/50'}`}>
                                        
                                        <div className="absolute top-0 right-0 p-4 bg-gradient-to-br from-indigo-600 to-violet-700 text-white font-black text-[10px] rounded-bl-[1.5rem] shadow-lg flex items-center gap-2">
                                            <Zap className="w-3 h-3 fill-current animate-pulse" />
                                            CONFIANZA IA: {link.confidence.toFixed(0)}%
                                        </div>

                                        <div className="flex items-center gap-4 mt-4 mb-6">
                                            <div className="flex-1 min-w-0">
                                                <div className="text-[8px] font-black text-slate-400 uppercase mb-1">REAL (BOD)</div>
                                                <div className="font-black text-slate-900 text-sm truncate uppercase leading-none">{link.physicalName}</div>
                                                <div className="font-mono text-[10px] text-indigo-600 font-bold tracking-widest mt-1">{link.physicalBarcode}</div>
                                            </div>
                                            <div className="bg-indigo-50 p-2.5 rounded-full shrink-0"><ArrowRight className="text-indigo-400 w-5 h-5" /></div>
                                            <div className="flex-1 text-right min-w-0">
                                                <div className="text-[8px] font-black text-slate-400 uppercase mb-1">TEO (GUÍA)</div>
                                                <div className="font-black text-slate-900 text-sm truncate uppercase leading-none">{link.expectedName}</div>
                                                <div className="font-mono text-[10px] text-slate-400 font-bold tracking-widest mt-1">{link.expectedBarcode}</div>
                                            </div>
                                        </div>

                                        <button 
                                            onClick={() => onLinkAlias(link)} 
                                            disabled={isLinked}
                                            className={`w-full py-5 rounded-2xl font-black text-[11px] uppercase transition-all flex items-center justify-center gap-3 ${isLinked ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-200 active:scale-95'}`}
                                        >
                                            {isLinked ? (
                                                <><ShieldCheck className="w-4 h-4" /> VÍNCULO_ESTABLECIDO</>
                                            ) : (
                                                <><Link className="w-4 h-4" /> CONFIRMAR_DEDUCCIÓN</>
                                            )}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {activeTab !== 'links' && (
                        <div className="bg-white rounded-[2.5rem] border-4 border-slate-100 divide-y-2 divide-slate-50 overflow-hidden shadow-inner animate-in fade-in duration-300">
                            {activeList.map((item: any, idx: number) => (
                                <div key={idx} className="p-6 flex justify-between items-center group hover:bg-slate-50/50 transition-colors">
                                    <div className="min-w-0 flex-1 pr-4">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <h4 className="font-black text-slate-900 text-xs uppercase truncate italic">{item.name}</h4>
                                            {item.isSemanticMatch && (
                                                <div className="bg-indigo-100 p-1 rounded-md animate-pulse">
                                                    <Brain className="w-3 h-3 text-indigo-600" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="font-mono text-[10px] text-slate-400 uppercase font-black tracking-widest">{item.barcode}</div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <div className={`text-3xl font-black tabular-nums leading-none ${item.difference === 0 ? 'text-emerald-500' : (item.difference < 0 ? 'text-rose-500' : 'text-amber-500')}`}>
                                            {item.difference > 0 ? `+${item.difference}` : item.difference}
                                        </div>
                                        <div className="text-[8px] font-black text-slate-300 uppercase tracking-widest mt-2 bg-slate-50 px-2 py-0.5 rounded italic">
                                            F: {item.physicalQty} | T: {item.expectedQty}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {activeList.length === 0 && (
                                <div className="p-20 text-center opacity-20">
                                    <PackageCheck className="w-12 h-12 mx-auto mb-3" />
                                    <p className="text-[10px] font-black uppercase tracking-widest">Nada que reportar aquí</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
