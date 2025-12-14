
import React, { useState, useMemo } from 'react';
import { Upload, ChevronLeft, Search, FileSpreadsheet, CheckCircle2, AlertTriangle, XCircle, ArrowRight, Fingerprint, RefreshCw, Filter, FileText, Link, Eye, EyeOff, PackageMinus, PackagePlus, PackageCheck } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import * as matcher from '../services/matcher';
import { MatchResult } from '../types';
import { exportDiscrepancyPDF } from '../services/export';
import { aggregateScans } from '../services/aggregator';

interface ConciliatorProps {
  onBack: () => void;
}

export const Conciliator: React.FC<ConciliatorProps> = ({ onBack }) => {
  const [step, setStep] = useState<'upload' | 'select' | 'results'>('upload');
  const [isImporting, setIsImporting] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<MatchResult | null>(null);
  
  // New UI States
  const [activeTab, setActiveTab] = useState<'missing' | 'extra' | 'match'>('missing');

  // Queries
  const sessions = useLiveQuery(() => db.sessions.orderBy('createdAt').reverse().toArray(), [], []);
  const expectedOrdersCount = useLiveQuery(() => db.expectedOrders.count(), [], 0);

  // --- HANDLERS ---

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const count = await matcher.importExpectedOrders(file);
      alert(`Importación exitosa: ${count} pedidos pendientes cargados.`);
      setStep('select');
    } catch (err: any) {
      alert(`Error al importar: ${err.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  const handleRunAnalysis = async (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setIsAnalyzing(true);
    try {
      const scans = await db.scans.where('sessionId').equals(sessionId).toArray();
      const physicalItems = await aggregateScans(scans);
      const results = await matcher.findMatches(physicalItems);
      setMatches(results);
      setStep('results');
    } catch (err) {
      console.error(err);
      alert("Error en el análisis.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAssignOrder = async () => {
      if (!selectedMatch || !currentSession) return;
      const newErp = selectedMatch.expectedOrder.internalId;
      if (!confirm(`¿Vincular conteo físico a Orden ${newErp}?\n\nEl nombre de la sesión se actualizará.`)) return;

      try {
          await db.sessions.update(currentSession.id, { erpOrder: newErp });
          alert("¡Caso cerrado! Sesión actualizada.");
          onBack(); 
      } catch (e) {
          alert("Error al actualizar.");
      }
  };

  const handleExportPDF = () => {
      if (!selectedMatch || !currentSession) return;
      exportDiscrepancyPDF(selectedMatch, currentSession.logisticsLabel);
  };

  const currentSession = sessions?.find(s => s.id === selectedSessionId);

  // --- DERIVED DATA FOR RESULTS ---
  const breakdown = useMemo(() => {
      if (!selectedMatch) return { missing: [], extra: [], match: [], stats: { total: 0, percent: 0 } };
      
      const missing = selectedMatch.details.filter(d => d.difference < 0).sort((a,b) => a.difference - b.difference); // Most missing first
      const extra = selectedMatch.details.filter(d => d.difference > 0).sort((a,b) => b.difference - a.difference);   // Most extra first
      const match = selectedMatch.details.filter(d => d.difference === 0);

      // Calc exact fill rate (lines fully satisfied)
      const exactLines = match.length;
      const totalLines = selectedMatch.details.length; // Uses union of both sets
      const percent = totalLines > 0 ? (exactLines / totalLines) * 100 : 0;

      return { missing, extra, match, stats: { total: totalLines, percent } };
  }, [selectedMatch]);

  // --- VIEW: UPLOAD ---
  if (step === 'upload') {
    return (
      <div className="max-w-2xl mx-auto p-4 pt-8 animate-in fade-in">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-500 mb-6 hover:text-slate-900"><ChevronLeft className="w-5 h-5"/> Volver</button>
        
        <div className="text-center mb-10">
          <div className="bg-slate-900 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-slate-900/30">
            <Fingerprint className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Detective de Recepción</h1>
          <p className="text-slate-500 mt-2 text-sm max-w-sm mx-auto">Sube tu Excel de "Packing List" o "Pedidos Pendientes" para cruzarlo con lo que has contado físicamente.</p>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200 text-center relative overflow-hidden">
          {expectedOrdersCount > 0 && (
             <div className="mb-6 bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3 text-emerald-800 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>{expectedOrdersCount} Pedidos en memoria</span>
                </div>
                <button onClick={() => setStep('select')} className="text-xs bg-white border border-emerald-200 px-3 py-2 rounded-lg font-bold text-emerald-700 hover:bg-emerald-50 shadow-sm">
                    Saltar Importación
                </button>
             </div>
          )}

          <label className="block w-full cursor-pointer group">
            <div className="border-3 border-dashed border-slate-200 rounded-2xl p-10 group-hover:border-indigo-400 group-hover:bg-indigo-50 transition-all">
              {isImporting ? (
                <div className="animate-pulse flex flex-col items-center">
                    <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin mb-4"/>
                    <span className="font-bold text-indigo-600">Procesando Matriz...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                    <div className="bg-slate-50 p-4 rounded-full mb-4 group-hover:bg-white group-hover:scale-110 transition-transform">
                        <FileSpreadsheet className="w-8 h-8 text-slate-400 group-hover:text-indigo-500 transition-colors"/>
                    </div>
                    <span className="text-lg font-bold text-slate-700 group-hover:text-indigo-700">Subir Excel (.xlsx)</span>
                    <span className="text-xs text-slate-400 mt-2">Columnas requeridas: ID Agrupador, Código, Cantidad</span>
                </div>
              )}
            </div>
            <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} disabled={isImporting} />
          </label>
        </div>
      </div>
    );
  }

  // --- VIEW: RESULTS DASHBOARD ---
  if (step === 'results' && selectedMatch) {
      
      const activeList = activeTab === 'missing' ? breakdown.missing : (activeTab === 'extra' ? breakdown.extra : breakdown.match);

      return (
        <div className="flex flex-col h-[calc(100vh-64px)] bg-slate-50">
            {/* STICKY HEADER */}
            <div className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-20">
                <div className="px-4 py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <button onClick={() => setSelectedMatch(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition-colors"><ChevronLeft className="w-5 h-5" /></button>
                        <div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Candidato detectado</div>
                            <h2 className="font-black text-slate-900 text-lg leading-none">{selectedMatch.expectedOrder.internalId}</h2>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleExportPDF} className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg" title="PDF"><FileText className="w-5 h-5" /></button>
                        <button onClick={handleAssignOrder} className="bg-indigo-600 text-white px-3 py-2 rounded-lg text-xs font-bold shadow-md hover:bg-indigo-700 flex items-center gap-2">
                            <Link className="w-4 h-4" /> Asignar
                        </button>
                    </div>
                </div>

                {/* PROGRESS INDICATOR */}
                <div className="px-6 pb-4">
                    <div className="flex justify-between text-xs font-bold mb-1">
                        <span className="text-slate-500">Precisión de Pedido</span>
                        <span className={breakdown.stats.percent === 100 ? 'text-emerald-600' : 'text-slate-700'}>{breakdown.stats.percent.toFixed(0)}% Lineas Correctas</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
                        <div style={{ width: `${(breakdown.match.length / breakdown.stats.total) * 100}%` }} className="h-full bg-emerald-500"></div>
                        <div style={{ width: `${(breakdown.missing.length / breakdown.stats.total) * 100}%` }} className="h-full bg-red-400"></div>
                        <div style={{ width: `${(breakdown.extra.length / breakdown.stats.total) * 100}%` }} className="h-full bg-amber-400"></div>
                    </div>
                </div>

                {/* TABS */}
                <div className="flex px-4 gap-1">
                    <button 
                        onClick={() => setActiveTab('missing')}
                        className={`flex-1 py-3 text-xs font-bold border-b-2 flex items-center justify-center gap-2 transition-colors ${activeTab === 'missing' ? 'border-red-500 text-red-600 bg-red-50/50' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                    >
                        <PackageMinus className="w-4 h-4" /> Faltantes ({breakdown.missing.length})
                    </button>
                    <button 
                        onClick={() => setActiveTab('extra')}
                        className={`flex-1 py-3 text-xs font-bold border-b-2 flex items-center justify-center gap-2 transition-colors ${activeTab === 'extra' ? 'border-amber-500 text-amber-600 bg-amber-50/50' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                    >
                        <PackagePlus className="w-4 h-4" /> Sobrantes ({breakdown.extra.length})
                    </button>
                    <button 
                        onClick={() => setActiveTab('match')}
                        className={`flex-1 py-3 text-xs font-bold border-b-2 flex items-center justify-center gap-2 transition-colors ${activeTab === 'match' ? 'border-emerald-500 text-emerald-600 bg-emerald-50/50' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                    >
                        <PackageCheck className="w-4 h-4" /> OK ({breakdown.match.length})
                    </button>
                </div>
            </div>

            {/* CONTENT LIST */}
            <div className="flex-1 overflow-y-auto p-4 bg-slate-100">
                {activeList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                        <CheckCircle2 className="w-12 h-12 mb-2 opacity-50" />
                        <p className="text-sm font-bold">No hay items en esta categoría</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {activeList.map(row => (
                            <div key={row.barcode} className={`bg-white p-4 rounded-xl border shadow-sm flex items-start gap-4 ${
                                activeTab === 'missing' ? 'border-l-4 border-l-red-500' : 
                                activeTab === 'extra' ? 'border-l-4 border-l-amber-500' : 
                                'border-l-4 border-l-emerald-500'
                            }`}>
                                <div className="flex-1 min-w-0">
                                    <div className="font-bold text-slate-800 text-sm mb-1 leading-snug">{row.name}</div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-500 border border-slate-200">{row.barcode}</span>
                                    </div>
                                </div>
                                
                                <div className="text-right shrink-0">
                                    <div className={`text-2xl font-black ${
                                        row.difference < 0 ? 'text-red-500' : 
                                        row.difference > 0 ? 'text-amber-500' : 'text-emerald-500'
                                    }`}>
                                        {row.difference > 0 ? '+' : ''}{row.difference}
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-bold uppercase">
                                        {activeTab === 'missing' ? 'Faltan' : (activeTab === 'extra' ? 'Sobran' : 'Cuadra')}
                                    </div>
                                    {activeTab !== 'extra' && (
                                        <div className="text-[10px] text-slate-400 mt-1">
                                            De {row.expectedQty} esperados
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
      );
  }

  // --- VIEW: SESSION SELECT / RESULTS LIST ---
  return (
    <div className="max-w-3xl mx-auto p-4 pt-6 pb-24">
        {step === 'select' && (
            <>
                <button onClick={() => setStep('upload')} className="flex items-center gap-2 text-slate-500 mb-6 hover:text-slate-900"><ChevronLeft className="w-5 h-5"/> Cambiar archivo</button>
                <h2 className="text-xl font-bold text-slate-900 mb-4 px-2">Selecciona conteo para investigar</h2>
                <div className="grid gap-3">
                    {sessions?.map(s => (
                        <button key={s.id} onClick={() => handleRunAnalysis(s.id)} className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-indigo-400 hover:shadow-lg transition-all text-left group relative overflow-hidden">
                            <div className="flex justify-between items-center relative z-10">
                                <div>
                                    <div className="font-black text-slate-800 text-lg">{s.erpOrder}</div>
                                    <div className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded inline-block mt-1">{s.logisticsLabel}</div>
                                </div>
                                {isAnalyzing && selectedSessionId === s.id ? (
                                    <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
                                ) : (
                                    <div className="bg-slate-50 p-2 rounded-full group-hover:bg-indigo-50 transition-colors">
                                        <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-600" />
                                    </div>
                                )}
                            </div>
                        </button>
                    ))}
                </div>
            </>
        )}

        {step === 'results' && (
            <>
                <button onClick={() => setStep('select')} className="flex items-center gap-2 text-slate-500 mb-6 hover:text-slate-900"><ChevronLeft className="w-5 h-5"/> Volver</button>
                
                <div className="mb-6 bg-slate-900 text-white p-6 rounded-3xl shadow-xl shadow-slate-900/20">
                    <h2 className="text-xl font-bold mb-1">Mejores Coincidencias</h2>
                    <p className="text-slate-400 text-sm">Basado en similitud de contenido, no solo etiquetas.</p>
                </div>

                <div className="space-y-4">
                    {matches.length === 0 ? (
                        <div className="text-center py-12 text-slate-400">
                            <AlertTriangle className="w-12 h-12 mx-auto mb-2 opacity-50"/>
                            No se encontraron coincidencias razonables.
                        </div>
                    ) : (
                        matches.map(match => (
                            <button 
                                key={match.expectedOrder.id} 
                                onClick={() => setSelectedMatch(match)}
                                className="w-full bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all text-left relative overflow-hidden group"
                            >
                                <div 
                                    className={`absolute top-0 left-0 w-1.5 h-full ${
                                        match.status === 'exact' ? 'bg-emerald-500' : match.status === 'partial' ? 'bg-amber-500' : 'bg-red-500'
                                    }`} 
                                />

                                <div className="flex justify-between items-start pl-3 mb-2">
                                    <div>
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Orden Sugerida</div>
                                        <div className="text-2xl font-black text-slate-900">{match.expectedOrder.internalId}</div>
                                    </div>
                                    <div className={`text-xl font-black ${
                                        match.status === 'exact' ? 'text-emerald-600' : match.status === 'partial' ? 'text-amber-500' : 'text-red-400'
                                    }`}>
                                        {match.matchScore.toFixed(0)}%
                                    </div>
                                </div>

                                <div className="pl-3 text-sm text-slate-500 flex gap-2 mt-3">
                                    <span className="bg-slate-100 px-2 py-1 rounded-lg text-xs font-bold text-slate-600 flex items-center gap-1">
                                        <PackageMinus className="w-3 h-3" /> Faltan {match.details.filter(d => d.difference < 0).length}
                                    </span>
                                    <span className="bg-slate-100 px-2 py-1 rounded-lg text-xs font-bold text-slate-600 flex items-center gap-1">
                                        <PackagePlus className="w-3 h-3" /> Sobran {match.details.filter(d => d.difference > 0).length}
                                    </span>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </>
        )}
    </div>
  );
};
