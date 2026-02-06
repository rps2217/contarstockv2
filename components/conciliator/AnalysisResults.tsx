import React, { useState } from 'react';
import { ChevronLeft, ShieldCheck, Ban, Check, Link, PackageMinus, PackagePlus, PackageCheck, Sparkles, Brain, ArrowRight, Fingerprint, Zap } from 'lucide-react';
import { MatchResult, AliasSuggestion } from '../../types';

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
    let verdictColor = 'bg-emerald-500', verdictText = 'Coincidencia Certificada', verdictIcon = <ShieldCheck className="w-8 h-8 text-white" />, verdictBg = 'bg-emerald-50 border-emerald-100', verdictTextColor = 'text-emerald-900';

    if (score < 50) {
        verdictColor = 'bg-red-500'; verdictText = 'Incompatible'; verdictIcon = <Ban className="w-8 h-8 text-white" />; verdictBg = 'bg-red-50 border-red-100'; verdictTextColor = 'text-red-900';
    } else if (score < 85) {
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
        <div className="bg-slate-50 min-h-screen flex flex-col font-mono">
            <div className="bg-white px-4 py-3 border-b border-slate-200 flex items-center justify-between sticky top-0 z-20 shadow-sm">
                <div className="flex items-center gap-2">
                    <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full"><ChevronLeft className="w-5 h-5"/></button>
                    <span className="font-black text-[10px] uppercase tracking-widest text-slate-400">Veredicto Detective</span>
                </div>
                <button onClick={onExportPDF} className="text-red-600 bg-red-50 px-3 py-1.5 rounded-lg text-[10px] font-black flex items-center gap-1 border border-red-100 uppercase">Exportar</button>
            </div>

            <div className="p-4 max-w-2xl mx-auto w-full flex-1 overflow-y-auto pb-24 no-scrollbar">
                
                {/* HEADER DE VEREDICTO INDUSTRIAL */}
                <div className={`rounded-[2.5rem] p-8 shadow-xl border-4 mb-6 relative overflow-hidden ${verdictBg} ${verdictColor.replace('bg-', 'border-')}/20`}>
                    <div className="flex justify-between items-center gap-6 relative z-10">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className={`p-3 rounded-2xl shadow-lg ${verdictColor}`}>{verdictIcon}</div>
                                <span className={`font-black text-4xl tracking-tighter ${verdictTextColor}`}>{score.toFixed(0)}%</span>
                            </div>
                            <h2 className={`text-xl font-black uppercase italic ${verdictTextColor}`}>{verdictText}</h2>
                            {match.semanticAffinities > 0 && (
                                <div className="mt-2 inline-flex items-center gap-2 bg-indigo-600 text-white px-3 py-1 rounded-full text-[9px] font-black uppercase shadow-lg shadow-indigo-200">
                                    <Sparkles className="w-3 h-3 animate-spin-slow" /> {match.semanticAffinities} Items Unidos por IA
                                </div>
                            )}
                        </div>
                        <button onClick={onAssign} className="bg-slate-900 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl active:scale-95 transition-all">Asignar ERP</button>
                    </div>
                    {/* Efecto de fondo IA */}
                    <div className="absolute -right-10 -bottom-10 opacity-10 rotate-12">
                        <Fingerprint className="w-48 h-48" />
                    </div>
                </div>

                {/* TABS DE RESULTADOS */}
                <div className="flex bg-slate-200 p-1 rounded-2xl mb-6 gap-1">
                    {[
                        {id: 'links', label: 'IA Links', icon: Brain, count: breakdown.links.length, color: 'text-indigo-600'},
                        {id: 'missing', label: 'Faltan', icon: PackageMinus, count: breakdown.missing.length, color: 'text-rose-600'},
                        {id: 'extra', label: 'Sobran', icon: PackagePlus, count: breakdown.extra.length, color: 'text-amber-600'},
                        {id: 'match', label: 'OK', icon: PackageCheck, count: breakdown.match.length, color: 'text-emerald-600'}
                    ].map(tab => (
                        <button 
                            key={tab.id} 
                            onClick={() => setActiveTab(tab.id as any)} 
                            className={`flex-1 py-4 rounded-xl text-[9px] font-black uppercase transition-all flex flex-col items-center justify-center gap-1.5 ${activeTab === tab.id ? 'bg-white shadow-md scale-[1.02] z-10' : 'text-slate-500 opacity-60'}`}
                        >
                            <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? tab.color : ''}`} />
                            <span>{tab.label}</span>
                            {tab.count > 0 && <span className={`text-[8px] px-1.5 rounded-full text-white ${activeTab === tab.id ? (tab.color.replace('text', 'bg')) : 'bg-slate-400'}`}>{tab.count}</span>}
                        </button>
                    ))}
                </div>

                {/* CONTENIDO DE TAB */}
                <div className="space-y-3">
                    {activeTab === 'links' && (
                        <div className="space-y-4">
                            {breakdown.links.map((link, idx) => {
                                const isLinked = linkedAliases.has(link.physicalBarcode);
                                return (
                                    <div key={idx} className={`bg-white border-4 rounded-[2.5rem] p-6 shadow-sm relative overflow-hidden transition-all ${isLinked ? 'border-emerald-100 opacity-60' : 'border-indigo-100 ring-4 ring-indigo-50/50'}`}>
                                        
                                        {/* INDICADOR VISUAL DE AFINIDAD */}
                                        <div className="absolute top-0 right-0 p-4 bg-gradient-to-br from-indigo-600 to-violet-700 text-white font-black text-[10px] rounded-bl-[1.5rem] shadow-lg flex items-center gap-2">
                                            <Zap className="w-3 h-3 fill-current animate-pulse" />
                                            AFINIDAD IA: {link.confidence.toFixed(0)}%
                                        </div>

                                        <div className="flex items-center gap-4 mt-4 mb-6">
                                            <div className="flex-1">
                                                <div className="text-[8px] font-black text-slate-400 uppercase mb-1">Dato Físico (Escaneado)</div>
                                                <div className="font-black text-slate-900 text-sm truncate uppercase">{link.physicalName}</div>
                                                <div className="font-mono text-[10px] text-indigo-600 font-bold tracking-widest">{link.physicalBarcode}</div>
                                            </div>
                                            <div className="bg-indigo-50 p-2 rounded-full"><ArrowRight className="text-indigo-400 w-5 h-5" /></div>
                                            <div className="flex-1 text-right">
                                                <div className="text-[8px] font-black text-slate-400 uppercase mb-1">Dato Guía (Deducido)</div>
                                                <div className="font-black text-slate-900 text-sm truncate uppercase">{link.expectedName}</div>
                                                <div className="font-mono text-[10px] text-slate-400 font-bold tracking-widest">{link.expectedBarcode}</div>
                                            </div>
                                        </div>

                                        <button 
                                            onClick={() => onLinkAlias(link)} 
                                            disabled={isLinked}
                                            className={`w-full py-5 rounded-2xl font-black text-[11px] uppercase transition-all flex items-center justify-center gap-3 ${isLinked ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-600 text-white shadow-xl shadow-indigo-200 active:scale-95'}`}
                                        >
                                            {isLinked ? (
                                                <><ShieldCheck className="w-4 h-4" /> Vínculo Semántico Verificado</>
                                            ) : (
                                                <><Link className="w-4 h-4" /> Confirmar Identidad IA</>
                                            )}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {activeTab !== 'links' && (
                        <div className="bg-white rounded-[2.5rem] border-4 border-slate-100 divide-y-2 divide-slate-50 overflow-hidden shadow-inner">
                            {activeList.map((item: any, idx: number) => (
                                <div key={idx} className="p-6 flex justify-between items-center group hover:bg-slate-50 transition-colors">
                                    <div className="min-w-0 flex-1 pr-4">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="font-black text-slate-900 text-xs uppercase truncate">{item.name}</h4>
                                            {item.isSemanticMatch && (
                                                <div className="bg-indigo-100 p-1 rounded-md" title="Match Semántico">
                                                    <Brain className="w-3 h-3 text-indigo-600" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="font-mono text-[9px] text-slate-400 uppercase font-bold tracking-[0.15em]">{item.barcode}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className={`text-2xl font-black tabular-nums ${item.difference === 0 ? 'text-emerald-500' : (item.difference < 0 ? 'text-rose-500' : 'text-amber-500')}`}>
                                            {item.difference > 0 ? `+${item.difference}` : item.difference}
                                        </div>
                                        <div className="text-[7px] font-black text-slate-300 uppercase tracking-[0.2em] mt-1 italic">Real: {item.physicalQty} | Teo: {item.expectedQty}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            
            <style>{`
                @keyframes spin-slow {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .animate-spin-slow {
                    animation: spin-slow 8s linear infinite;
                }
            `}</style>
        </div>
    );
};