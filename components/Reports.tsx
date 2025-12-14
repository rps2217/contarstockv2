
import React, { useState, useCallback } from 'react';
import { FileText, Calendar, ChevronLeft, CheckCircle2, Layers, Plus, MoreVertical, Trash2, Truck, WifiOff, Cloud, Eraser } from 'lucide-react';
import { CountingSession, ViewState } from '../types';
import * as sessionService from '../services/sessionService'; 
import { processSyncQueue } from '../services/appsheet';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { StartSessionModal } from './StartSessionModal';
import { SearchBar } from './SearchBar';
import { FixedSizeList } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { ReportDetail } from './reports/ReportDetail';

interface ReportsProps {
  onSessionStart: (session: CountingSession) => void;
  onNavigate: (view: ViewState) => void;
}

// --- VIRTUALIZED ROW COMPONENT ---
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
  const [syncingAppSheet, setSyncingAppSheet] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isStartModalOpen, setIsStartModalOpen] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  
  const pendingSyncCount = useLiveQuery(() => db.syncQueue.where('status').equals('pending').count(), [], 0);

  const handleSearch = useCallback((query: string) => {
      setSearchQuery(query);
  }, []);

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

  const handleSelectSession = (id: string) => {
    setSelectedSessionId(id);
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

  // --- ROUTING: DETAIL VIEW ---
  if (selectedSessionId) {
      return <ReportDetail sessionId={selectedSessionId} onBack={() => setSelectedSessionId(null)} />;
  }

  // --- ROUTING: LIST VIEW ---
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
};
