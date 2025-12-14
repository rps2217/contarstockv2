
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FileText, Sparkles, Truck, Calendar, ChevronLeft, Package, CheckCircle2, ScanLine, Layers, Plus, MoreVertical, Trash2, Minus, FileSpreadsheet, ChevronRight as ChevronRightIcon, CloudDownload, WifiOff, Cloud, Check, Clock, CalendarDays, CalendarRange, X, Database, Eraser } from 'lucide-react';
import { CountingSession, ConsolidatedItem, ViewState } from '../types';
import * as sessionService from '../services/sessionService'; 
import { analyzeConsolidation } from '../services/gemini';
import { exportToExcel, exportToPDF } from '../services/export';
import { processSyncQueue } from '../services/appsheet';
import { aggregateScans } from '../services/aggregator';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { StartSessionModal } from './StartSessionModal';
import { SearchBar } from './SearchBar';
import { FixedSizeList } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

interface ReportsProps {
  onSessionStart: (session: CountingSession) => void;
  onNavigate: (view: ViewState) => void;
}

// --- VIRTUALIZED ROW COMPONENT ---
// Memoized component for rendering individual sessions in the list
const SessionRow = ({ index, style, data }: { index: number; style: React.CSSProperties; data: { sessions: CountingSession[]; onSelect: (id: string) => void; activeMenuId: string | null; onMenuToggle: (e: any, id: string) => void; onDelete: (e: any, id: string) => void } }) => {
    const session = data.sessions[index];
    const { onSelect, activeMenuId, onMenuToggle, onDelete } = data;

    return (
        <div style={style} className="px-1 py-2">
            <div className={`bg-white rounded-2xl shadow-sm border transition-shadow relative z-0 h-full flex flex-col ${session.lastSyncTimestamp ? 'border-green-200' : 'border-slate-200 hover:shadow-md'}`}>
                <div className="p-4 flex-1">
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                            <Calendar className="w-3 h-3" />
                            {new Date(session.createdAt).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-1">
                            {session.lastSyncTimestamp && (
                                <div className="bg-green-100 text-green-700 p-1 rounded-full" title="Sincronizado con AppSheet">
                                    <Cloud className="w-3 h-3" />
                                </div>
                            )}
                            <div className="relative">
                                <button 
                                    type="button"
                                    onClick={(e) => onMenuToggle(e, session.id)}
                                    className="p-1.5 -mr-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
                                >
                                    <MoreVertical className="w-4 h-4" />
                                </button>
                                {activeMenuId === session.id && (
                                    <>
                                        <div className="fixed inset-0 z-40 bg-transparent" onClick={(e) => onMenuToggle(e, '')}></div>
                                        <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden">
                                            <button type="button" onClick={(e) => onDelete(e, session.id)} className="w-full text-left px-4 py-3 text-xs text-red-600 hover:bg-red-50 font-bold flex items-center gap-2">
                                                <Trash2 className="w-3 h-3" /> Eliminar
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mb-2 tracking-tight line-clamp-1">
                        {session.erpOrder}
                    </h3>
                    <div className="flex items-center gap-2 mb-1">
                        <Truck className="w-3 h-3 text-slate-400" />
                        <span className="text-xs text-slate-600 truncate max-w-[200px]">
                            {session.logisticsLabel}
                        </span>
                    </div>
                </div>
                <div className="bg-slate-50 px-4 py-2 border-t border-slate-100 flex items-center justify-between rounded-b-2xl">
                    <div className="text-xs text-slate-700">Total: <span className="font-bold">{session.totalUnits || 0}</span></div>
                    <button onClick={() => onSelect(session.id)} className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-sm">
                        Ver
                    </button>
                </div>
            </div>
        </div>
    );
};

export const Reports: React.FC<ReportsProps> = ({ onSessionStart, onNavigate }) => {
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [aiReport, setAiReport] = useState<string>('');
  const [loadingAi, setLoadingAi] = useState(false);
  const [syncingAppSheet, setSyncingAppSheet] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isStartModalOpen, setIsStartModalOpen] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  
  // Monitor Sync Queue
  const pendingSyncCount = useLiveQuery(() => db.syncQueue.where('status').equals('pending').count(), [], 0);

  const handleSearch = useCallback((query: string) => {
      setSearchQuery(query);
  }, []);

  // --- LIVE QUERIES (FULL LIST FOR VIRTUALIZATION) ---
  // Note: We remove limit() because virtualization handles the DOM load.
  // We just need efficient DB querying.
  const sessions = useLiveQuery(async () => {
    if (searchQuery) {
        const cleanQuery = searchQuery.trim();
        return await db.sessions
            .where('erpOrder').startsWithIgnoreCase(cleanQuery)
            .or('logisticsLabel').startsWithIgnoreCase(cleanQuery)
            .reverse()
            .toArray();
    } else {
        return await db.sessions
            .orderBy('createdAt')
            .reverse()
            .toArray();
    }
  }, [searchQuery], []);

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

  const handleMenuToggle = (e: React.MouseEvent, id: string) => {
      e.stopPropagation(); 
      setActiveMenuId(activeMenuId === id ? null : id);
  };

  const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
      e.stopPropagation();
      e.preventDefault();
      
      if (window.confirm('¿Estás seguro de que deseas eliminar este historial de conteo permanentemente? Esta acción no se puede deshacer.')) {
          await sessionService.deleteSession(sessionId); 
          setActiveMenuId(null);
      }
  };

  const handleIncrementItem = async (barcode: string) => {
    if (!selectedSessionId) return;
    await sessionService.adjustSessionItemQuantity(selectedSessionId, barcode, 1); 
  };

  const handleDecrementItem = async (barcode: string, currentQty: number) => {
    if (!selectedSessionId) return;
    if (currentQty <= 1) {
        if (window.confirm('¿Eliminar este item del registro?')) {
            await sessionService.deleteSessionItem(selectedSessionId, barcode); 
        }
    } else {
        await sessionService.adjustSessionItemQuantity(selectedSessionId, barcode, -1); 
    }
  };

  const handleDeleteItem = async (barcode: string) => {
    if (!selectedSessionId) return;
    if (window.confirm('¿Eliminar todo el historial de este producto en esta sesión?')) {
        await sessionService.deleteSessionItem(selectedSessionId, barcode); 
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

  const handleCleanSynced = async () => {
      if (!confirm("¿Desea eliminar del dispositivo los conteos que YA están respaldados en la nube?\n\nEsta acción liberará espacio pero mantendrá los datos pendientes de subida.")) return;
      
      setIsCleaning(true);
      try {
          const count = await sessionService.cleanSyncedSessions(); 
          if (count > 0) {
              alert(`Limpieza completada.\nSe eliminaron ${count} sesiones locales respaldadas.`);
          } else {
              alert("No hay sesiones sincronizadas para limpiar.");
          }
      } catch (err: any) {
          alert(`Error durante la limpieza: ${err.message}`);
      } finally {
          setIsCleaning(false);
      }
  };

  const fullSelectedSession = useLiveQuery(() => selectedSessionId ? db.sessions.get(selectedSessionId) : undefined, [selectedSessionId]);

  // VIEW: LIST (VIRTUALIZED)
  if (!selectedSessionId) {
    return (
        <div className="flex flex-col h-[calc(100vh-64px)] max-w-3xl mx-auto w-full px-4 pt-4">
            <div className="flex-none">
                <div className="flex items-center gap-2 mb-4">
                    <button onClick={() => onNavigate('dashboard')} className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition-colors">
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <div className="text-blue-600"><CheckCircle2 className="w-6 h-6" /></div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Historial</h1>
                </div>
                
                <div className="mb-4">
                    <SearchBar onSearch={handleSearch} placeholder="Buscar por Orden ERP o Etiqueta..." />
                </div>

                {/* ACTION BUTTONS */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                    <button 
                        onClick={handleCleanSynced} 
                        disabled={isCleaning} 
                        className="col-span-2 bg-slate-50 border border-slate-200 text-slate-600 font-bold py-2.5 rounded-xl hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 active:scale-95"
                    >
                        {isCleaning ? <div className="w-4 h-4 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" /> : <Eraser className="w-4 h-4" />}
                        Limpiar Sincronizados
                    </button>
                    <button onClick={() => onNavigate('consolidated')} className="bg-white border border-slate-200 text-purple-700 font-bold py-2.5 rounded-xl hover:bg-purple-50 hover:border-purple-200 transition-colors flex items-center justify-center gap-2 shadow-sm active:scale-95">
                        <Layers className="w-4 h-4" /> Consolidados
                    </button>
                    <button onClick={() => setIsStartModalOpen(true)} className="bg-blue-600 text-white font-bold py-2.5 rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-md shadow-blue-200 active:scale-95">
                        <Plus className="w-5 h-5" /> Iniciar Conteo
                    </button>
                </div>

                {/* SYNC QUEUE ALERT */}
                {pendingSyncCount > 0 && (
                    <button onClick={handleProcessQueue} className="w-full mb-4 bg-orange-50 border border-orange-200 p-4 rounded-xl flex items-center justify-between shadow-sm animate-in slide-in-from-top-2">
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
            </div>
            
            {/* VIRTUALIZED LIST CONTAINER */}
            <div className="flex-1 min-h-0 pb-20">
                {!sessions || sessions.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-3xl border border-slate-100 shadow-sm h-full flex flex-col justify-center items-center">
                        <FileText className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                        <p className="text-slate-400 font-medium">No hay historial disponible.</p>
                    </div>
                ) : (
                    <AutoSizer>
                        {({ height, width }) => (
                            <FixedSizeList
                                height={height}
                                width={width}
                                itemCount={sessions.length}
                                itemSize={160} // Fixed height for session card
                                className="no-scrollbar"
                                itemData={{
                                    sessions,
                                    onSelect: handleSelectSession,
                                    activeMenuId,
                                    onMenuToggle: handleMenuToggle,
                                    onDelete: handleDeleteSession
                                }}
                            >
                                {SessionRow}
                            </FixedSizeList>
                        )}
                    </AutoSizer>
                )}
            </div>
            
            <StartSessionModal isOpen={isStartModalOpen} onClose={() => setIsStartModalOpen(false)} onSessionStart={(s) => { setIsStartModalOpen(false); onSessionStart(s); }} />
        </div>
    );
  }

  // DETAILED VIEW (No changes needed here)
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
    );
};
