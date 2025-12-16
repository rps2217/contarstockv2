
import React, { useState, useMemo } from 'react';
import { Upload, ChevronLeft, Search, FileSpreadsheet, CheckCircle2, AlertTriangle, XCircle, ArrowRight, Fingerprint, RefreshCw, Filter, FileText, Link, Eye, EyeOff, PackageMinus, PackagePlus, PackageCheck, Repeat, ArrowLeftRight, Sparkles, Save, Check, ShieldCheck, Ban, ArrowDown } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import * as matcher from '../services/matcher';
import * as productService from '../services/productService';
import { MatchResult, AliasSuggestion } from '../types';
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
  
  // UI States
  const [activeTab, setActiveTab] = useState<'missing' | 'extra' | 'match' | 'links'>('links');
  const [linkedAliases, setLinkedAliases] = useState<Set<string>>(new Set());

  // Queries
  const sessions = useLiveQuery(() => db.sessions.orderBy('createdAt').reverse().toArray(), [], []);
  const expectedOrdersCount = useLiveQuery(() => db.expectedOrders.count(), [], 0);

  const currentSession = sessions?.find(s => s.id === selectedSessionId);

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
    setLinkedAliases(new Set()); // Reset linked state
    try {
      const scans = await db.scans.where('sessionId').equals(sessionId).toArray();
      const physicalItems = await aggregateScans(scans);
      
      // Run the detective matcher
      const results = await matcher.findMatches(physicalItems);
      
      if (results.length === 0) {
          alert("No se encontraron coincidencias razonables con ninguna orden cargada.");
          setIsAnalyzing(false);
          return;
      }

      setMatches(results);
      
      // Auto-select the best match
      const bestMatch = results[0];
      setSelectedMatch(bestMatch);
      setStep('results');
      
      // Smart Tab Selection: If aliases found, show them first. If exact match, show match tab.
      if (bestMatch.potentialAliases.length > 0) {
          setActiveTab('links');
      } else if (bestMatch.status === 'exact') {
          setActiveTab('match');
      } else {
          setActiveTab('missing');
      }

    } catch (err) {
      console.error(err);
      alert("Error en el análisis.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAcceptAlias = async (alias: AliasSuggestion) => {
      try {
          // This will create the product in the DB cloning details from the Expected Barcode
          await productService.createProductAlias(alias.physicalBarcode, alias.expectedBarcode, alias.expectedName);
          
          setLinkedAliases(prev => new Set(prev).add(alias.physicalBarcode));
          
          // Optional: Vibrate for feedback
          if (navigator.vibrate) navigator.vibrate(50);
      } catch (e: any) {
          alert(`Error al crear alias: ${e.message}`);
      }
  };

  const handleAssignOrder = async () => {
      if (!selectedMatch || !currentSession) return;
      const newErp = selectedMatch.expectedOrder.internalId;
      const score = selectedMatch.matchScore;

      // Determine Audit Status
      let auditStatus: 'verified' | 'warning' | 'failed' = 'failed';
      if (score > 98) auditStatus = 'verified';
      else if (score > 60) auditStatus = 'warning';
      
      let msg = `¿Confirmar validación?\n\nSe asignará la Guía "${newErp}" al conteo físico actual.`;
      
      if (score < 50) {
          msg = `⚠️ ADVERTENCIA DE BAJA COINCIDENCIA (${score.toFixed(0)}%)\n\nEl sistema detecta muchas diferencias. ¿Estás seguro de que esta es la guía correcta?\n\nAl confirmar, se sobrescribirá el número de orden actual.`;
      }

      if (!confirm(msg)) return;

      try {
          // PERSIST AUDIT DATA
          await db.sessions.update(currentSession.id, { 
              erpOrder: newErp,
              auditStatus: auditStatus,
              auditScore: parseFloat(score.toFixed(1)),
              auditTimestamp: Date.now()
          });
          
          alert("✅ Validación Completada y Guardada en Historial.");
          onBack(); 
      } catch (e) {
          alert("Error al actualizar base de datos.");
      }
  };

  const handleExportPDF = () => {
      if (!selectedMatch || !currentSession) return;
      exportDiscrepancyPDF(selectedMatch, currentSession.logisticsLabel);
  };

  // --- DERIVED DATA FOR RESULTS ---
  const breakdown = useMemo(() => {
      if (!selectedMatch) return { missing: [], extra: [], match: [], links: [], stats: { total: 0, percent: 0 } };
      
      // Filter out items that are suggested as aliases to avoid clutter in Missing/Extra tabs
      const aliasPhysicals = new Set(selectedMatch.potentialAliases.map(a => a.physicalBarcode));
      const aliasExpected = new Set(selectedMatch.potentialAliases.map(a => a.expectedBarcode));

      const missing = selectedMatch.details.filter(d => d.difference < 0 && !aliasExpected.has(d.barcode)).sort((a,b) => a.difference - b.difference); 
      const extra = selectedMatch.details.filter(d => d.difference > 0 && !aliasPhysicals.has(d.barcode)).sort((a,b) => b.difference - a.difference);   
      const match = selectedMatch.details.filter(d => d.difference === 0);
      const links = selectedMatch.potentialAliases;

      // Calc exact fill rate (lines fully satisfied)
      const exactLines = match.length;
      const totalLines = selectedMatch.details.length; // Uses union of both sets
      const percent = totalLines > 0 ? (exactLines / totalLines) * 100 : 0;

      return { missing, extra, match, links, stats: { total: totalLines, percent } };
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

  // --- VIEW: SELECT SESSION ---
  if (step === 'select') {
      return (
        <div className="max-w-2xl mx-auto p-4 pt-8 animate-in fade-in">
             <button onClick={() => setStep('upload')} className="flex items-center gap-2 text-slate-500 mb-6 hover:text-slate-900"><ChevronLeft className="w-5 h-5"/> Volver</button>
             <h1 className="text-2xl font-bold text-slate-900 mb-2">Selecciona un Conteo</h1>
             <p className="text-slate-500 text-sm mb-6">Elige el bulto físico que deseas investigar.</p>
             
             <div className="space-y-3">
                 {sessions?.map(s => (
                     <button 
                        key={s.id} 
                        onClick={() => handleRunAnalysis(s.id)}
                        disabled={isAnalyzing}
                        className="w-full bg-white p-4 rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all text-left flex justify-between items-center group relative overflow-hidden"
                    >
                         {/* Audit Badge if already checked */}
                         {s.auditStatus && (
                            <div className={`absolute top-0 right-0 w-3 h-3 rounded-bl-lg ${s.auditStatus === 'verified' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                         )}

                         <div>
                             <div className="font-bold text-slate-900 flex items-center gap-2">
                                {s.erpOrder}
                                {s.auditStatus === 'verified' && <ShieldCheck className="w-4 h-4 text-emerald-500" />}
                             </div>
                             <div className="text-xs text-slate-500 mt-1 font-mono">{s.logisticsLabel}</div>
                         </div>
                         {isAnalyzing && selectedSessionId === s.id ? (
                             <RefreshCw className="w-5 h-5 text-indigo-500 animate-spin" />
                         ) : (
                             <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-500" />
                         )}
                     </button>
                 ))}
             </div>
        </div>
      );
  }

  // --- VIEW: RESULTS DASHBOARD ---
  if (step === 'results' && selectedMatch) {
      
      // Determine Verdict Style
      const score = selectedMatch.matchScore;
      let verdictColor = 'bg-emerald-500';
      let verdictText = 'Coincidencia Certificada';
      let verdictIcon = <ShieldCheck className="w-8 h-8 text-white" />;
      let verdictBg = 'bg-emerald-50 border-emerald-100';
      let verdictTextColor = 'text-emerald-900';

      if (score < 60) {
          verdictColor = 'bg-red-500';
          verdictText = 'Riesgo de Incompatibilidad';
          verdictIcon = <Ban className="w-8 h-8 text-white" />;
          verdictBg = 'bg-red-50 border-red-100';
          verdictTextColor = 'text-red-900';
      } else if (score < 90) {
          verdictColor = 'bg-amber-500';
          verdictText = 'Probable con Desviaciones';
          verdictIcon = <AlertTriangle className="w-8 h-8 text-white" />;
          verdictBg = 'bg-amber-50 border-amber-100';
          verdictTextColor = 'text-amber-900';
      }

      const renderContent = () => {
          if (activeTab === 'links') {
              if (breakdown.links.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                        <CheckCircle2 className="w-12 h-12 mb-2 opacity-50" />
                        <p className="text-sm font-bold">No se detectaron problemas de SKU.</p>
                    </div>
                  );
              }
              return (
                  <div className="space-y-4">
                      <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-xl text-sm text-indigo-800 flex items-start gap-3">
                          <Sparkles className="w-5 h-5 shrink-0" />
                          <div>
                              <span className="font-bold block mb-1">Detección Inteligente (Espejo)</span>
                              Estos productos tienen códigos diferentes pero cantidades idénticas. Confirma el vínculo para corregir tu base de datos automáticamente.
                          </div>
                      </div>
                      {breakdown.links.map((link, idx) => {
                          const isLinked = linkedAliases.has(link.physicalBarcode);
                          return (
                            <div key={idx} className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all ${isLinked ? 'border-emerald-200 ring-2 ring-emerald-100' : 'border-indigo-100'}`}>
                                <div className="flex items-stretch">
                                    {/* Physical Side */}
                                    <div className="flex-1 p-3 bg-slate-50">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Lo que contaste</div>
                                        <div className="font-bold text-slate-900 text-sm mb-1">{link.physicalName}</div>
                                        <div className="font-mono text-xs text-slate-500 bg-white border border-slate-200 px-1 rounded w-fit">{link.physicalBarcode}</div>
                                    </div>
                                    
                                    {/* Connector */}
                                    <div className="w-20 bg-indigo-50 flex flex-col items-center justify-center border-l border-r border-indigo-100 relative z-10">
                                        <div className="text-xl font-black text-indigo-600">{link.quantity}</div>
                                        <div className="text-[9px] text-indigo-400 uppercase font-bold">Unidades</div>
                                        <ArrowLeftRight className="w-4 h-4 text-indigo-400 absolute bottom-2" />
                                    </div>

                                    {/* Expected Side */}
                                    <div className="flex-1 p-3 bg-white">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Lo que dice el Excel</div>
                                        <div className="font-bold text-slate-900 text-sm mb-1">{link.expectedName}</div>
                                        <div className="font-mono text-xs text-slate-500 bg-slate-50 border border-slate-200 px-1 rounded w-fit">{link.expectedBarcode}</div>
                                    </div>
                                </div>
                                
                                {/* Action Bar */}
                                <div className="p-2 bg-slate-50 border-t border-slate-100 flex justify-end">
                                    <button 
                                        onClick={() => handleAcceptAlias(link)}
                                        disabled={isLinked}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                                            isLinked 
                                            ? 'bg-emerald-100 text-emerald-700 cursor-default' 
                                            : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200 active:scale-95'
                                        }`}
                                    >
                                        {isLinked ? <Check className="w-4 h-4" /> : <Link className="w-4 h-4" />}
                                        {isLinked ? 'Registrado en Base de Datos' : 'Vincular y Crear Registro'}
                                    </button>
                                </div>
                            </div>
                          );
                      })}
                  </div>
              );
          }

          const activeList = activeTab === 'missing' ? breakdown.missing : (activeTab === 'extra' ? breakdown.extra : breakdown.match);
          if (activeList.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                    <CheckCircle2 className="w-12 h-12 mb-2 opacity-50" />
                    <p className="text-sm font-bold">No hay items en esta categoría</p>
                </div>
            );
          }

          return (
              <div className="space-y-2">
                  {activeList.map((item, idx) => (
                      <div key={idx} className="bg-white p-3 rounded-xl border border-slate-100 flex justify-between items-center hover:border-slate-200 transition-colors">
                          <div className="min-w-0 flex-1 pr-4">
                              <div className="font-bold text-slate-900 text-sm truncate">{item.name}</div>
                              <div className="font-mono text-xs text-slate-400">{item.barcode}</div>
                          </div>
                          <div className="text-right">
                              <div className={`font-black text-lg ${item.difference === 0 ? 'text-emerald-500' : (item.difference < 0 ? 'text-red-500' : 'text-amber-500')}`}>
                                  {item.difference > 0 ? `+${item.difference}` : item.difference}
                              </div>
                              <div className="text-[9px] text-slate-400 font-bold uppercase">
                                  Esp: {item.expectedQty} | Fís: {item.physicalQty}
                              </div>
                          </div>
                      </div>
                  ))}
              </div>
          );
      };

      return (
          <div className="bg-slate-50 min-h-screen flex flex-col">
              <div className="bg-white px-4 py-3 border-b border-slate-200 flex items-center justify-between sticky top-0 z-20 shadow-sm">
                  <div className="flex items-center gap-2">
                      <button onClick={() => setStep('select')} className="p-2 hover:bg-slate-100 rounded-full"><ChevronLeft className="w-5 h-5"/></button>
                      <span className="font-bold text-slate-900">Análisis</span>
                  </div>
                  <button onClick={handleExportPDF} className="text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1">
                      <FileText className="w-4 h-4" /> PDF
                  </button>
              </div>

              <div className="p-4 max-w-2xl mx-auto w-full flex-1 overflow-y-auto pb-20">
                  
                  {/* --- VERDICT PANEL --- */}
                  <div className={`rounded-3xl p-6 shadow-sm border mb-6 relative overflow-hidden ${verdictBg}`}>
                        <div className="flex justify-between items-start relative z-10">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <div className={`p-2 rounded-xl shadow-sm ${verdictColor}`}>
                                        {verdictIcon}
                                    </div>
                                    <span className={`font-black text-2xl ${verdictTextColor}`}>{score.toFixed(0)}%</span>
                                </div>
                                <h2 className={`text-lg font-bold ${verdictTextColor} leading-tight`}>{verdictText}</h2>
                                <p className={`text-xs opacity-80 mt-1 ${verdictTextColor}`}>
                                    Comparando <strong>{currentSession?.erpOrder}</strong> (Físico) con <strong>{selectedMatch.expectedOrder.internalId}</strong> (Excel)
                                </p>
                            </div>
                            
                            <div className="text-right">
                                <button 
                                    onClick={handleAssignOrder}
                                    className={`px-4 py-3 rounded-xl font-bold text-sm shadow-md transition-all active:scale-95 flex items-center gap-2 ${score > 60 ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-white border border-slate-200 text-slate-600'}`}
                                >
                                    {score > 90 ? <Check className="w-4 h-4" /> : <RefreshCw className="w-4 h-4" />}
                                    Validar y Asignar
                                </button>
                            </div>
                        </div>
                  </div>

                  {/* Tabs */}
                  <div className="flex bg-white p-1 rounded-2xl border border-slate-200 mb-4 shadow-sm">
                      <button onClick={() => setActiveTab('links')} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${activeTab === 'links' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}>
                          <Link className="w-3 h-3" /> Sugerencias
                          {breakdown.links.length > 0 && <span className="bg-indigo-600 text-white px-1.5 rounded-full text-[9px]">{breakdown.links.length}</span>}
                      </button>
                      <button onClick={() => setActiveTab('missing')} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${activeTab === 'missing' ? 'bg-red-100 text-red-700' : 'text-slate-500 hover:bg-slate-50'}`}>
                          <PackageMinus className="w-3 h-3" /> Faltantes
                          {breakdown.missing.length > 0 && <span className="bg-red-600 text-white px-1.5 rounded-full text-[9px]">{breakdown.missing.length}</span>}
                      </button>
                      <button onClick={() => setActiveTab('extra')} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${activeTab === 'extra' ? 'bg-amber-100 text-amber-700' : 'text-slate-500 hover:bg-slate-50'}`}>
                          <PackagePlus className="w-3 h-3" /> Sobrantes
                          {breakdown.extra.length > 0 && <span className="bg-amber-600 text-white px-1.5 rounded-full text-[9px]">{breakdown.extra.length}</span>}
                      </button>
                      <button onClick={() => setActiveTab('match')} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${activeTab === 'match' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-500 hover:bg-slate-50'}`}>
                          <PackageCheck className="w-3 h-3" /> OK
                      </button>
                  </div>

                  {/* List Content */}
                  {renderContent()}

              </div>
          </div>
      );
  }

  return null;
};