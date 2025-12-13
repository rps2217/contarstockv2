
import React, { useState } from 'react';
import { Upload, ChevronLeft, Search, FileSpreadsheet, CheckCircle2, AlertTriangle, XCircle, ArrowRight, Fingerprint, RefreshCw, Filter, FileText, Link, Eye, EyeOff } from 'lucide-react';
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
  const [viewMode, setViewMode] = useState<'all' | 'diff'>('diff');

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
      // 1. Get physical items for this session
      const scans = await db.scans.where('sessionId').equals(sessionId).toArray();
      
      // ARCHITECTURE FIX: Use centralized Aggregator logic
      const physicalItems = await aggregateScans(scans);

      // 2. Run Algorithm
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
      if (!confirm(`¿Estás seguro de vincular este conteo físico a la Orden ${newErp}?\n\nEsto actualizará el nombre de la sesión.`)) return;

      try {
          await db.sessions.update(currentSession.id, { erpOrder: newErp });
          alert("¡Vinculación exitosa! Caso cerrado.");
          onBack(); // Go back to dashboard/menu
      } catch (e) {
          alert("Error al actualizar la sesión.");
      }
  };

  const handleExportPDF = () => {
      if (!selectedMatch || !currentSession) return;
      exportDiscrepancyPDF(selectedMatch, currentSession.logisticsLabel);
  };

  const currentSession = sessions?.find(s => s.id === selectedSessionId);

  // --- VIEW: UPLOAD ---
  if (step === 'upload') {
    return (
      <div className="max-w-2xl mx-auto p-4 pt-8">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-500 mb-6 hover:text-slate-900"><ChevronLeft className="w-5 h-5"/> Volver</button>
        
        <div className="text-center mb-10">
          <div className="bg-indigo-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-indigo-600">
            <Fingerprint className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Detective de Recepción</h1>
          <p className="text-slate-500 mt-2">Sube tu Excel de "Pendientes de Recepción" para encontrar a qué pedido corresponde tu conteo físico.</p>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200 text-center">
          {expectedOrdersCount > 0 && (
             <div className="mb-6 bg-green-50 p-4 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3 text-green-700 font-bold">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>{expectedOrdersCount} Pedidos en memoria</span>
                </div>
                <button onClick={() => setStep('select')} className="text-xs bg-white border border-green-200 px-3 py-1 rounded-lg font-bold text-green-700 hover:bg-green-50">
                    Saltar Importación
                </button>
             </div>
          )}

          <label className="block w-full cursor-pointer group">
            <div className="border-3 border-dashed border-slate-200 rounded-2xl p-10 group-hover:border-indigo-400 group-hover:bg-indigo-50 transition-all">
              {isImporting ? (
                <div className="animate-pulse flex flex-col items-center">
                    <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin mb-4"/>
                    <span className="font-bold text-indigo-600">Analizando Excel...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                    <FileSpreadsheet className="w-12 h-12 text-slate-300 group-hover:text-indigo-500 mb-4 transition-colors"/>
                    <span className="text-lg font-bold text-slate-700 group-hover:text-indigo-700">Subir Archivo Excel (.xlsx)</span>
                    <span className="text-sm text-slate-400 mt-2">La primera columna debe ser el ID de Agrupación</span>
                </div>
              )}
            </div>
            <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} disabled={isImporting} />
          </label>
        </div>
      </div>
    );
  }

  // --- VIEW: RESULTS / DETAIL ---
  if (step === 'results' && selectedMatch) {
      
      const displayedDetails = viewMode === 'diff' 
        ? selectedMatch.details.filter(d => d.difference !== 0) 
        : selectedMatch.details;

      return (
        <div className="flex flex-col h-[calc(100vh-64px)] bg-slate-50">
            <div className="bg-white border-b border-slate-200 px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm sticky top-0 z-20">
                <div className="flex items-center gap-3">
                    <button onClick={() => setSelectedMatch(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition-colors"><ChevronLeft className="w-5 h-5" /></button>
                    <div>
                        <h2 className="font-bold text-slate-900 leading-tight">Comparativa de Pedido</h2>
                        <div className="text-xs text-slate-500">Físico ({currentSession?.erpOrder}) vs Esperado ({selectedMatch.expectedOrder.internalId})</div>
                    </div>
                </div>
                
                <div className="flex gap-2">
                    <button 
                        onClick={handleExportPDF}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors"
                    >
                        <FileText className="w-4 h-4" /> Informe Quiebres
                    </button>
                    <button 
                        onClick={handleAssignOrder}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-colors"
                    >
                        <Link className="w-4 h-4" /> Asignar Orden
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
                <div className="max-w-4xl mx-auto">
                    {/* SCORE CARD */}
                    <div className={`p-6 rounded-2xl text-white mb-6 shadow-lg flex items-center justify-between ${
                        selectedMatch.status === 'exact' ? 'bg-gradient-to-r from-green-500 to-emerald-600' :
                        selectedMatch.status === 'partial' ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                        'bg-gradient-to-r from-red-500 to-pink-600'
                    }`}>
                        <div>
                            <div className="text-sm font-bold opacity-80 uppercase tracking-wider">Probabilidad de Coincidencia</div>
                            <div className="text-4xl font-black">{selectedMatch.matchScore.toFixed(1)}%</div>
                        </div>
                        <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                            <Fingerprint className="w-8 h-8" />
                        </div>
                    </div>

                    {/* FILTER TABS */}
                    <div className="flex gap-2 mb-4">
                        <button 
                            onClick={() => setViewMode('diff')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${viewMode === 'diff' ? 'bg-slate-800 text-white shadow-lg' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}
                        >
                            <AlertTriangle className="w-4 h-4" /> Solo Diferencias
                        </button>
                        <button 
                            onClick={() => setViewMode('all')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${viewMode === 'all' ? 'bg-slate-800 text-white shadow-lg' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}
                        >
                            <Eye className="w-4 h-4" /> Ver Todo
                        </button>
                    </div>

                    {/* COMPARISON TABLE */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        {displayedDetails.length === 0 ? (
                            <div className="p-12 text-center text-slate-400">
                                <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-green-500" />
                                <p className="font-bold text-slate-600">¡Todo Perfecto!</p>
                                <p className="text-sm">No hay diferencias entre lo físico y lo esperado.</p>
                            </div>
                        ) : (
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-4 py-3 font-bold text-slate-500">Producto</th>
                                        <th className="px-4 py-3 font-bold text-slate-500 text-center">Físico</th>
                                        <th className="px-4 py-3 font-bold text-slate-500 text-center">Esperado</th>
                                        <th className="px-4 py-3 font-bold text-slate-500 text-right">Diferencia</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {displayedDetails.map(row => (
                                        <tr key={row.barcode} className={`
                                            ${row.difference === 0 ? 'bg-white' : row.difference < 0 ? 'bg-red-50/50' : 'bg-blue-50/50'}
                                        `}>
                                            <td className="px-4 py-3">
                                                <div className="font-bold text-slate-800">{row.name}</div>
                                                <div className="text-xs text-slate-400 font-mono">{row.barcode}</div>
                                            </td>
                                            <td className="px-4 py-3 text-center font-bold">{row.physicalQty}</td>
                                            <td className="px-4 py-3 text-center text-slate-500">{row.expectedQty}</td>
                                            <td className="px-4 py-3 text-right">
                                                {row.difference === 0 ? (
                                                    <span className="text-green-600 font-bold flex items-center justify-end gap-1"><CheckCircle2 className="w-4 h-4"/> OK</span>
                                                ) : (
                                                    <span className={`font-bold px-2 py-1 rounded text-xs ${row.difference < 0 ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                                                        {row.difference > 0 ? '+' : ''}{row.difference}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        </div>
      );
  }

  // --- VIEW: SESSION SELECT / RESULTS LIST ---
  return (
    <div className="max-w-3xl mx-auto p-4 pt-6 pb-24">
        {step === 'select' && (
            <>
                <button onClick={() => setStep('upload')} className="flex items-center gap-2 text-slate-500 mb-6 hover:text-slate-900"><ChevronLeft className="w-5 h-5"/> Subir otro archivo</button>
                <h2 className="text-xl font-bold text-slate-900 mb-4">Selecciona un Conteo Físico</h2>
                <div className="grid gap-3">
                    {sessions?.map(s => (
                        <button key={s.id} onClick={() => handleRunAnalysis(s.id)} className="bg-white p-4 rounded-xl border border-slate-200 hover:border-indigo-400 hover:shadow-md transition-all text-left group">
                            <div className="flex justify-between items-center">
                                <div>
                                    <div className="font-bold text-slate-900 text-lg">{s.erpOrder}</div>
                                    <div className="text-sm text-slate-500">Etiqueta: {s.logisticsLabel}</div>
                                </div>
                                {isAnalyzing && selectedSessionId === s.id ? (
                                    <RefreshCw className="w-5 h-5 animate-spin text-indigo-600" />
                                ) : (
                                    <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-600" />
                                )}
                            </div>
                        </button>
                    ))}
                </div>
            </>
        )}

        {step === 'results' && (
            <>
                <button onClick={() => setStep('select')} className="flex items-center gap-2 text-slate-500 mb-6 hover:text-slate-900"><ChevronLeft className="w-5 h-5"/> Volver a selección</button>
                
                <div className="mb-6 bg-slate-900 text-white p-6 rounded-2xl shadow-lg">
                    <h2 className="text-xl font-bold mb-1">Resultados de Investigación</h2>
                    <p className="text-slate-400 text-sm">Candidatos más probables para el conteo <strong>{currentSession?.erpOrder}</strong></p>
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
                                className="w-full bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-lg transition-all text-left relative overflow-hidden group"
                            >
                                {/* Progress Bar Background */}
                                <div 
                                    className={`absolute bottom-0 left-0 h-1.5 transition-all duration-1000 ${
                                        match.status === 'exact' ? 'bg-green-500' : match.status === 'partial' ? 'bg-yellow-500' : 'bg-red-500'
                                    }`} 
                                    style={{ width: `${match.matchScore}%` }} 
                                />

                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <div className="text-xs font-bold text-slate-400 uppercase">Pedido Interno</div>
                                        <div className="text-xl font-black text-slate-900">{match.expectedOrder.internalId}</div>
                                    </div>
                                    <div className={`text-lg font-black ${
                                        match.status === 'exact' ? 'text-green-600' : match.status === 'partial' ? 'text-yellow-600' : 'text-red-400'
                                    }`}>
                                        {match.matchScore.toFixed(0)}%
                                    </div>
                                </div>

                                <div className="text-sm text-slate-600 flex gap-4 mt-2">
                                    <span className="bg-slate-100 px-2 py-1 rounded text-slate-700 text-xs font-bold">Esperado: {match.expectedOrder.totalExpectedUnits} u.</span>
                                    <span className="bg-slate-100 px-2 py-1 rounded text-slate-700 text-xs font-bold">Matches: {match.details.filter(d => d.physicalQty > 0 && d.expectedQty > 0).length} SKUs</span>
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
