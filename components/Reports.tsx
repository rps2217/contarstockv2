import React, { useState, useEffect, useCallback } from 'react';
import { FileText, Sparkles, Truck, Calendar, ChevronLeft, Package, CheckCircle2, ScanLine, Layers, Plus, MoreVertical, Trash2, Minus, FileSpreadsheet, ChevronRight as ChevronRightIcon, CloudDownload, WifiOff, Cloud, Check } from 'lucide-react';
import { CountingSession, ConsolidatedItem, ViewState } from '../types';
import * as storage from '../services/storage';
import { analyzeConsolidation } from '../services/gemini';
import { exportToExcel, exportToPDF } from '../services/export';
import { processSyncQueue } from '../services/appsheet';
import { restoreFromCloud } from '../services/syncBridge';
import { aggregateScans } from '../services/aggregator';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { StartSessionModal } from './StartSessionModal';
import { SearchBar } from './SearchBar';

interface ReportsProps {
  onSessionStart: (session: CountingSession) => void;
  onNavigate: (view: ViewState) => void;
}

const PAGE_SIZE = 20;

export const Reports: React.FC<ReportsProps> = ({ onSessionStart, onNavigate }) => {
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [aiReport, setAiReport] = useState<string>('');
  const [loadingAi, setLoadingAi] = useState(false);
  const [syncingAppSheet, setSyncingAppSheet] = useState(false);
  const [restoringCloud, setRestoringCloud] = useState(false);
  const [page, setPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [isStartModalOpen, setIsStartModalOpen] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Monitor Sync Queue
  const pendingSyncCount = useLiveQuery(() => db.syncQueue.where('status').equals('pending').count(), [], 0);

  const handleSearch = useCallback((query: string) => {
      setSearchQuery(query);
      setPage(0);
  }, []);

  // --- LIVE QUERIES (OPTIMIZED) ---
  const sessions = useLiveQuery(async () => {
    if (searchQuery) {
        const cleanQuery = searchQuery.trim();
        return await db.sessions
            .where('erpOrder').startsWithIgnoreCase(cleanQuery)
            .or('logisticsLabel').startsWithIgnoreCase(cleanQuery)
            .reverse() 
            .offset(page * PAGE_SIZE)
            .limit(PAGE_SIZE)
            .toArray();
    } else {
        return await db.sessions
            .orderBy('createdAt')
            .reverse()
            .offset(page * PAGE_SIZE)
            .limit(PAGE_SIZE)
            .toArray();
    }
  }, [page, searchQuery], []);

  const totalSessionsCount = useLiveQuery(async () => {
      if (searchQuery) {
          const cleanQuery = searchQuery.trim();
          return await db.sessions
            .where('erpOrder').startsWithIgnoreCase(cleanQuery)
            .or('logisticsLabel').startsWithIgnoreCase(cleanQuery)
            .count();
      }
      return await db.sessions.count();
  }, [searchQuery], 0);

  // Detail View Consolidation (Performance Optimized & Grouped by Date)
  const consolidation = useLiveQuery(async () => {
    if (!selectedSessionId) return [];
    
    // 1. Fetch Scans for this session
    const scans = await db.scans.where('sessionId').equals(selectedSessionId).toArray();
    
    if (scans.length === 0) return [];

    // 2. Use Centralized Aggregator
    // This ensures that the report matches exactly what is sent to the cloud.
    return await aggregateScans(scans);

  }, [selectedSessionId], [] as ConsolidatedItem[]);

  const handleSelectSession = (id: string) => {
    setSelectedSessionId(id);
    setAiReport('');
  };

  const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
      e.stopPropagation();
      e.preventDefault();
      e.nativeEvent.stopImmediatePropagation();
      
      if (window.confirm('¿Estás seguro de que deseas eliminar este historial de conteo permanentemente? Esta acción no se puede deshacer.')) {
          await storage.deleteSession(sessionId);
          setActiveMenuId(null);
      }
  };

  const handleIncrementItem = async (barcode: string) => {
    if (!selectedSessionId) return;
    await storage.adjustSessionItemQuantity(selectedSessionId, barcode, 1);
  };

  const handleDecrementItem = async (barcode: string, currentQty: number) => {
    if (!selectedSessionId) return;
    if (currentQty <= 1) {
        if (window.confirm('¿Eliminar este item del registro?')) {
            await storage.deleteSessionItem(selectedSessionId, barcode);
        }
    } else {
        await storage.adjustSessionItemQuantity(selectedSessionId, barcode, -1);
    }
  };

  const handleDeleteItem = async (barcode: string) => {
    if (!selectedSessionId) return;
    if (window.confirm('¿Eliminar todo el historial de este producto en esta sesión?')) {
        await storage.deleteSessionItem(selectedSessionId, barcode);
    }
  };

  const handleGenerateAiReport = async () => {
    if (!sessions) return;
    const session = sessions.find(s => s.id === selectedSessionId);
    if (!session || !consolidation || consolidation.length === 0) return;

    setLoadingAi(true);
    const result = await analyzeConsolidation(session.erpOrder, session.logisticsLabel, consolidation);
    setAiReport(result);
    setLoadingAi(false);
  };

  const handleExportExcel = () => {
      const session = sessions?.find(s => s.id === selectedSessionId);
      if (session && consolidation) {
          exportToExcel(session, consolidation);
      }
  };

  const handleExportPDF = () => {
      const session = sessions?.find(s => s.id === selectedSessionId);
      if (session && consolidation) {
          exportToPDF(session, consolidation);
      }
  };

  const handleProcessQueue = async () => {
      if (!confirm(`Hay ${pendingSyncCount} conteos pendientes de subir. ¿Intentar sincronizar ahora?`)) return;
      setSyncingAppSheet(true);
      try {
          await processSyncQueue();
          alert('Cola procesada correctamente.');
      } catch (e: any) {
          alert('Error procesando cola. Verifique su conexión.');
      } finally {
          setSyncingAppSheet(false);
      }
  };

  const handleRestoreFromCloud = async () => {
      if (!confirm('¿Buscar conteos en AppSheet para descargar?')) return;
      
      setRestoringCloud(true);
      try {
          const result = await restoreFromCloud();
          if (result.sessions > 0) {
              alert(`Restauración completada: ${result.sessions} sesiones recuperadas.`);
              window.location.reload();
          } else {
              alert('No se encontraron nuevos conteos o hubo un error.');
          }
      } catch (e: any) {
          alert(`Error en restauración: ${e.message}`);
      } finally {
          setRestoringCloud(false);
      }
  };

  const fullSelectedSession = useLiveQuery(() => selectedSessionId ? db.sessions.get(selectedSessionId) : undefined, [selectedSessionId]);

  // VIEW: LIST
  if (!selectedSessionId) {
    const maxPage = Math.ceil((totalSessionsCount || 0) / PAGE_SIZE) - 1;

    return (
        <div className="max-w-3xl mx-auto pb-24 px-4 pt-6">
            <div className="flex items-center gap-2 mb-6">
                <button onClick={() => onNavigate('dashboard')} className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition-colors">
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <div className="text-blue-600"><CheckCircle2 className="w-6 h-6" /></div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Historial de Conteos</h1>
            </div>
            
            <div className="mb-6">
                <SearchBar onSearch={handleSearch} placeholder="Buscar por Orden ERP o Etiqueta..." />
            </div>

            <div className="grid grid-cols-2 gap-2 mb-8">
                <button onClick={handleRestoreFromCloud} disabled={restoringCloud} className="col-span-2 bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold py-2.5 rounded-xl hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50">
                    {restoringCloud ? <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" /> : <CloudDownload className="w-4 h-4" />}
                    Restaurar Nube
                </button>
                <button onClick={() => onNavigate('consolidated')} className="bg-white border border-slate-200 text-purple-700 font-bold py-2.5 rounded-xl hover:bg-purple-50 hover:border-purple-200 transition-colors flex items-center justify-center gap-2 shadow-sm">
                    <Layers className="w-4 h-4" /> Consolidados
                </button>
                <button onClick={() => setIsStartModalOpen(true)} className="bg-blue-600 text-white font-bold py-2.5 rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-md shadow-blue-200 active:scale-[0.98]">
                    <Plus className="w-5 h-5" /> Iniciar Conteo
                </button>
            </div>

            {/* SYNC QUEUE ALERT */}
            {pendingSyncCount > 0 && (
                <button onClick={handleProcessQueue} className="w-full mb-6 bg-orange-50 border border-orange-200 p-4 rounded-xl flex items-center justify-between shadow-sm animate-in slide-in-from-top-2">
                    <div className="flex items-center gap-3">
                        <WifiOff className="w-5 h-5 text-orange-500" />
                        <div className="text-left">
                            <div className="text-sm font-bold text-orange-800">Sincronización Pendiente</div>
                            <div className="text-xs text-orange-600">{pendingSyncCount} conteos esperando conexión</div>
                        </div>
                    </div>
                    <div className="bg-orange-100 text-orange-700 px-3 py-1.5 rounded-lg text-xs font-bold">
                        Reintentar
                    </div>
                </button>
            )}
            
            <div className="space-y-4">
                {!sessions || sessions.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-3xl border border-slate-100 shadow-sm">
                        <FileText className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                        <p className="text-slate-400 font-medium">No hay historial disponible.</p>
                    </div>
                ) : (
                    sessions.map(session => (
                        <div key={session.id} className={`bg-white rounded-2xl shadow-sm border transition-shadow relative z-0 ${session.lastSyncTimestamp ? 'border-green-200' : 'border-slate-200 hover:shadow-md'}`}>
                            <div className="p-5">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider">
                                        <Calendar className="w-3.5 h-3.5" />
                                        {new Date(session.createdAt).toLocaleDateString()}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {session.lastSyncTimestamp && (
                                            <div className="bg-green-100 text-green-700 p-1 rounded-full" title="Sincronizado con AppSheet">
                                                <Cloud className="w-4 h-4" />
                                            </div>
                                        )}
                                        <div className={`relative ${activeMenuId === session.id ? 'z-50' : 'z-10'}`}>
                                            <button 
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === session.id ? null : session.id); }}
                                                className="p-2 -mr-2 -mt-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
                                            >
                                                <MoreVertical className="w-5 h-5" />
                                            </button>
                                            {activeMenuId === session.id && (
                                                <>
                                                    <div className="fixed inset-0 z-40 bg-transparent" onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); }}></div>
                                                    <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden">
                                                        <button type="button" onClick={(e) => handleDeleteSession(e, session.id)} className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 font-bold flex items-center gap-2">
                                                            <Trash2 className="w-4 h-4" /> Eliminar
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 mb-4 tracking-tight">
                                    CONTEO-{new Date(session.createdAt).toISOString().slice(0,10).replace(/-/g,'')}-{new Date(session.createdAt).getHours()}{new Date(session.createdAt).getMinutes()}
                                </h3>
                                <div className="space-y-2 mb-2">
                                    <div className="flex items-center gap-3"><Truck className="w-4 h-4 text-slate-400" /><span className="text-sm text-slate-600">N° Correo: <span className="font-bold text-slate-900">{session.logisticsLabel}</span></span></div>
                                    <div className="flex items-center gap-3"><FileText className="w-4 h-4 text-slate-400" /><span className="text-sm text-slate-600">Orden Erp: <span className="font-bold text-slate-900">{session.erpOrder}</span></span></div>
                                </div>
                            </div>
                            <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex items-center justify-between rounded-b-2xl">
                                <div className="text-sm text-slate-700">Total: <span className="font-bold">{session.totalUnits || 0}</span> <span className="text-slate-500 text-xs">({session.totalSKUs || 0} artículos)</span></div>
                                <button onClick={() => handleSelectSession(session.id)} className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm">Ver Detalles</button>
                            </div>
                        </div>
                    ))
                )}
            </div>

             {/* Dynamic Pagination Controls */}
             {(totalSessionsCount > PAGE_SIZE) && (
                <div className="flex justify-center items-center gap-4 mt-6">
                    <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="p-3 bg-white border border-slate-200 rounded-lg disabled:opacity-50 hover:bg-slate-50 shadow-sm"><ChevronLeft className="w-5 h-5" /></button>
                    <span className="text-sm font-bold text-slate-600">Página {page + 1} de {maxPage + 1}</span>
                    <button onClick={() => setPage(p => Math.min(maxPage, p + 1))} disabled={page >= maxPage} className="p-3 bg-white border border-slate-200 rounded-lg disabled:opacity-50 hover:bg-slate-50 shadow-sm"><ChevronRightIcon className="w-5 h-5" /></button>
                </div>
            )}
            
            <StartSessionModal isOpen={isStartModalOpen} onClose={() => setIsStartModalOpen(false)} onSessionStart={(s) => { setIsStartModalOpen(false); onSessionStart(s); }} />
        </div>
    );
  }

  // DETAILED VIEW
  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-slate-50">
        <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 shadow-sm sticky top-0 z-20">
            <button onClick={() => setSelectedSessionId(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition-colors"><ChevronLeft className="w-5 h-5" /></button>
            <div>
                <h2 className="font-bold text-slate-900 leading-tight">Detalle de Conteo</h2>
                <div className="text-xs text-slate-500 font-mono">{fullSelectedSession?.erpOrder}</div>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24">
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <button onClick={handleExportExcel} className="bg-green-50 border border-green-200 text-green-700 hover:bg-green-100 px-4 py-3 rounded-xl shadow-sm transition-all flex flex-col items-center justify-center gap-1"><FileSpreadsheet className="w-5 h-5" /><span className="text-xs font-bold">Excel</span></button>
                    <button onClick={handleExportPDF} className="bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 px-4 py-3 rounded-xl shadow-sm transition-all flex flex-col items-center justify-center gap-1"><FileText className="w-5 h-5" /><span className="text-xs font-bold">PDF Manifiesto</span></button>
                    <button onClick={handleGenerateAiReport} disabled={loadingAi || !consolidation || consolidation.length === 0} className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 px-4 py-3 rounded-xl shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 font-bold text-sm disabled:opacity-50">
                        {loadingAi ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Sparkles className="w-4 h-4" />} Analizar IA
                    </button>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                        <span className="font-bold text-slate-800 text-sm">Detalle de Productos</span>
                        <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">Total: {fullSelectedSession?.totalUnits || 0}</span>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {consolidation?.map((item) => (
                             <div key={`${item.barcode}_${item.mm}_${item.yyyy}`} className="p-4 bg-white hover:bg-slate-50 transition-colors">
                                {/* Product Name Row */}
                                <div className="flex justify-between items-start mb-3 gap-3">
                                    <div className="font-bold text-slate-800 text-lg leading-snug break-words">{item.productName}</div>
                                    <button onClick={() => handleDeleteItem(item.barcode)} className="text-slate-300 hover:text-red-500 p-2 hover:bg-red-50 rounded-lg transition-colors shrink-0"><Trash2 className="w-5 h-5" /></button>
                                </div>
                                
                                {/* Controls Row - Mobile First Design */}
                                <div className="flex items-center justify-between">
                                    <div className="flex flex-col gap-1">
                                        <span className="font-mono text-slate-600 text-xs bg-slate-100 px-2 py-1 rounded w-fit font-bold border border-slate-200">{item.barcode}</span>
                                        <div className="flex gap-2 items-center">
                                            <span className="text-xs text-slate-400 font-medium">{item.scans} eventos</span>
                                            {item.mm && item.yyyy && (
                                                <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-bold border border-blue-100">
                                                    Vence: {item.mm}/{item.yyyy}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center bg-slate-50 shadow-inner rounded-xl p-1 border border-slate-200">
                                        <button onClick={() => handleDecrementItem(item.barcode, item.totalQuantity)} className="w-12 h-12 flex items-center justify-center bg-white hover:bg-red-50 rounded-lg text-slate-500 hover:text-red-500 transition-all active:scale-95 border border-slate-200 shadow-sm"><Minus className="w-6 h-6" /></button>
                                        <div className="min-w-[4rem] text-center font-black text-2xl text-slate-900">{item.totalQuantity}</div>
                                        <button onClick={() => handleIncrementItem(item.barcode)} className="w-12 h-12 flex items-center justify-center bg-white hover:bg-blue-50 rounded-lg text-slate-500 hover:text-blue-600 transition-all active:scale-95 border border-slate-200 shadow-sm"><Plus className="w-6 h-6" /></button>
                                    </div>
                                </div>
                             </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};