
import React, { useState } from 'react';
import { ChevronLeft, FileText, ShieldCheck, Ban, AlertTriangle, Check, Link, PackageMinus, PackagePlus, PackageCheck, Sparkles, ArrowLeftRight } from 'lucide-react';
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

    if (score < 60) {
        verdictColor = 'bg-red-500'; verdictText = 'Riesgo de Incompatibilidad'; verdictIcon = <Ban className="w-8 h-8 text-white" />; verdictBg = 'bg-red-50 border-red-100'; verdictTextColor = 'text-red-900';
    } else if (score < 90) {
        verdictColor = 'bg-amber-500'; verdictText = 'Probable con Desviaciones'; verdictIcon = <AlertTriangle className="w-8 h-8 text-white" />; verdictBg = 'bg-amber-50 border-amber-100'; verdictTextColor = 'text-amber-900';
    }

    const aliasPhysicals = new Set(match.potentialAliases.map(a => a.physicalBarcode));
    const aliasExpected = new Set(match.potentialAliases.map(a => a.expectedBarcode));

    const breakdown = {
        missing: match.details.filter(d => d.difference < 0 && !aliasExpected.has(d.barcode)).sort((a,b) => a.difference - b.difference),
        extra: match.details.filter(d => d.difference > 0 && !aliasPhysicals.has(d.barcode)).sort((a,b) => b.difference - a.difference),
        match: match.details.filter(d => d.difference === 0),
        links: match.potentialAliases
    };

    const activeList = activeTab === 'links' ? [] : (activeTab === 'missing' ? breakdown.missing : (activeTab === 'extra' ? breakdown.extra : breakdown.match));

    return (
        <div className="bg-slate-50 min-h-screen flex flex-col">
            <div className="bg-white px-4 py-3 border-b border-slate-200 flex items-center justify-between sticky top-0 z-20 shadow-sm">
                <div className="flex items-center gap-2">
                    <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full"><ChevronLeft className="w-5 h-5"/></button>
                    <span className="font-bold text-slate-900">Resultado del Análisis</span>
                </div>
                <button onClick={onExportPDF} className="text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 border border-red-100">
                    <FileText className="w-4 h-4" /> PDF
                </button>
            </div>

            <div className="p-4 max-w-2xl mx-auto w-full flex-1 overflow-y-auto pb-20">
                <div className={`rounded-3xl p-6 shadow-sm border mb-6 relative overflow-hidden ${verdictBg}`}>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <div className={`p-2 rounded-xl shadow-sm ${verdictColor}`}>{verdictIcon}</div>
                                <span className={`font-black text-3xl ${verdictTextColor}`}>{score.toFixed(0)}%</span>
                            </div>
                            <h2 className={`text-lg font-bold ${verdictTextColor} leading-tight`}>{verdictText}</h2>
                            <p className={`text-[10px] uppercase font-bold tracking-widest opacity-60 mt-1 ${verdictTextColor}`}>
                                GUÍA {match.expectedOrder.internalId} VS BULTO {sessionLabel}
                            </p>
                        </div>
                        <button onClick={onAssign} className={`w-full md:w-auto px-6 py-4 rounded-2xl font-black text-sm shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 ${score > 60 ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-white border border-slate-200 text-slate-600'}`}>
                            {score > 90 ? <Check className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />} Validar y Asignar
                        </button>
                    </div>
                </div>

                <div className="flex bg-white p-1 rounded-2xl border border-slate-200 mb-4 shadow-sm">
                    {[
                        {id: 'links', label: 'IA', icon: Link, count: breakdown.links.length, color: 'text-indigo-700', bg: 'bg-indigo-50'},
                        {id: 'missing', label: 'Faltan', icon: PackageMinus, count: breakdown.missing.length, color: 'text-red-700', bg: 'bg-red-50'},
                        {id: 'extra', label: 'Sobran', icon: PackagePlus, count: breakdown.extra.length, color: 'text-amber-700', bg: 'bg-amber-50'},
                        {id: 'match', label: 'OK', icon: PackageCheck, count: breakdown.match.length, color: 'text-emerald-700', bg: 'bg-emerald-50'}
                    ].map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all flex flex-col items-center justify-center gap-1 ${activeTab === tab.id ? `${tab.bg} ${tab.color}` : 'text-slate-400 hover:bg-slate-50'}`}>
                            <tab.icon className="w-4 h-4" />
                            <span>{tab.label}</span>
                            {tab.count > 0 && <span className={`absolute top-1 ml-6 px-1.5 rounded-full text-[8px] text-white ${tab.id === 'links' ? 'bg-indigo-600' : (tab.id === 'missing' ? 'bg-red-600' : 'bg-amber-600')}`}>{tab.count}</span>}
                        </button>
                    ))}
                </div>

                {activeTab === 'links' ? (
                    breakdown.links.length === 0 ? <div className="text-center py-20 text-slate-400 text-xs font-bold uppercase">Sin sugerencias</div> : (
                        <div className="space-y-4">
                            <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl text-xs text-indigo-800 flex items-start gap-3">
                                <Sparkles className="w-4 h-4 shrink-0 text-indigo-500" />
                                <div className="font-medium">Hemos detectado productos con códigos distintos pero cantidades idénticas que podrían ser el mismo ítem.</div>
                            </div>
                            {breakdown.links.map((link, idx) => (
                                <div key={idx} className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${linkedAliases.has(link.physicalBarcode) ? 'border-emerald-200 opacity-60' : 'border-indigo-100'}`}>
                                    <div className="flex items-stretch border-b border-slate-50">
                                        <div className="flex-1 p-4 bg-slate-50/50">
                                            <div className="text-[9px] font-black text-slate-400 uppercase mb-1">En el Bulto</div>
                                            <div className="font-bold text-slate-900 text-xs truncate">{link.physicalName}</div>
                                            <div className="font-mono text-[10px] text-indigo-600 font-bold">{link.physicalBarcode}</div>
                                        </div>
                                        <div className="w-16 bg-indigo-50 flex flex-col items-center justify-center border-l border-r border-indigo-100">
                                            <div className="text-lg font-black text-indigo-600">{link.quantity}</div>
                                            <ArrowLeftRight className="w-3 h-3 text-indigo-300" />
                                        </div>
                                        <div className="flex-1 p-4">
                                            <div className="text-[9px] font-black text-slate-400 uppercase mb-1">En el Excel</div>
                                            <div className="font-bold text-slate-900 text-xs truncate">{link.expectedName}</div>
                                            <div className="font-mono text-[10px] text-indigo-600 font-bold">{link.expectedBarcode}</div>
                                        </div>
                                    </div>
                                    <div className="p-3 bg-white flex justify-end">
                                        <button onClick={() => onLinkAlias(link)} disabled={linkedAliases.has(link.physicalBarcode)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${linkedAliases.has(link.physicalBarcode) ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md'}`}>
                                            {linkedAliases.has(link.physicalBarcode) ? 'Vinculado' : 'Vincular SKU'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                ) : (
                    <div className="space-y-2">
                        {activeList.map((item, idx) => (
                            <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-100 flex justify-between items-center group hover:border-slate-300 transition-all">
                                <div className="min-w-0 flex-1 pr-4">
                                    <div className="font-bold text-slate-900 text-xs truncate">{item.name}</div>
                                    <div className="font-mono text-[10px] text-slate-400 mt-1 uppercase">{item.barcode}</div>
                                </div>
                                <div className="text-right">
                                    <div className={`font-black text-xl leading-none ${item.difference === 0 ? 'text-emerald-500' : (item.difference < 0 ? 'text-red-500' : 'text-amber-500')}`}>
                                        {item.difference > 0 ? `+${item.difference}` : item.difference}
                                    </div>
                                    <div className="text-[8px] text-slate-400 font-black uppercase mt-1">E: {item.expectedQty} | F: {item.physicalQty}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
