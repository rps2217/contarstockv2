
import React, { useState } from 'react';
import { FileText, WifiOff, ExternalLink, Archive, Filter } from 'lucide-react';
import * as sessionService from '../services/sessionService'; 
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { StartSessionModal } from './StartSessionModal';
import { SearchBar } from './SearchBar';
import { FixedSizeList } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { ReportDetail } from './reports/ReportDetail';
import { ReportsHeader } from './reports/ReportsHeader';
import { useNavigate } from 'react-router-dom';
import { SessionRow } from './reports/SessionRow';

export const Reports: React.FC = () => {
  const navigate = useNavigate();
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [isCleaning, setIsCleaning] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isStartModalOpen, setIsStartModalOpen] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  
  const pendingSyncCount = useLiveQuery(() => db.scans.where('synced').equals(0).count(), [], 0);

  const sessions = useLiveQuery(async () => {
    if (searchQuery) {
        return await db.sessions.where('erpOrder').startsWithIgnoreCase(searchQuery.trim()).or('logisticsLabel').startsWithIgnoreCase(searchQuery.trim()).reverse().toArray();
    }
    return await db.sessions.orderBy('createdAt').reverse().toArray();
  }, [searchQuery], []);

  const handleMenuToggle = (e: React.MouseEvent, id: string) => { 
      e.stopPropagation(); 
      setActiveMenuId(activeMenuId === id ? null : id); 
  };

  const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
      e.stopPropagation();
      if (window.confirm('¿Eliminar registro permanentemente?')) {
          await sessionService.deleteSession(sessionId); 
          setActiveMenuId(null);
      }
  };

  const handleCleanSynced = async () => {
      if (!confirm("Se purgarán los datos ya respaldados en la nube. ¿Continuar?")) return;
      setIsCleaning(true);
      try {
          const count = await sessionService.cleanSyncedSessions(); 
          if (count > 0) alert(`Purga exitosa: ${count} registros eliminados.`);
      } finally { setIsCleaning(false); }
  };

  if (selectedSessionId) return <ReportDetail sessionId={selectedSessionId} onBack={() => setSelectedSessionId(null)} />;

  return (
        <div className="flex flex-col h-[calc(100dvh-120px)] w-full animate-in fade-in duration-500">
            <ReportsHeader 
                isCleaning={isCleaning} 
                onClean={handleCleanSynced} 
                onOpenConsolidated={() => navigate('/consolidated')} 
                onStartNew={() => setIsStartModalOpen(true)} 
            />
            
            <div className="my-6">
                <SearchBar onSearch={setSearchQuery} placeholder="Filtrar por ERP o Bulto..." />
            </div>

            {pendingSyncCount > 0 && (
                <button onClick={() => navigate('/sync')} className="w-full mb-6 bg-blue-600 p-4 rounded-2xl flex items-center justify-between shadow-lg shadow-blue-200 animate-pulse group">
                    <div className="flex items-center gap-3">
                        <WifiOff className="w-5 h-5 text-white" />
                        <div className="text-left">
                            <div className="text-xs font-black text-white uppercase tracking-widest">Pendiente de Subida</div>
                            <div className="text-[10px] text-blue-100 font-bold uppercase">{pendingSyncCount} registros sin sincronizar</div>
                        </div>
                    </div>
                    <ExternalLink className="w-5 h-5 text-white opacity-50 group-hover:opacity-100 transition-opacity" />
                </button>
            )}

            <div className="flex-1 min-h-0 bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm relative">
                <div className="absolute top-0 left-0 right-0 h-12 bg-slate-50 border-b border-slate-100 flex items-center px-6 justify-between z-10">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Firma Operativa</span>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado</span>
                </div>
                
                <div className="h-full pt-12">
                    {(!sessions || sessions.length === 0) ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-300">
                            <Archive className="w-12 h-12 mb-2 opacity-20" />
                            <p className="text-[10px] font-black uppercase tracking-widest">No hay registros</p>
                        </div>
                    ) : (
                        <AutoSizer>
                            {({ height, width }) => (
                                <FixedSizeList 
                                    height={height} 
                                    width={width} 
                                    itemCount={sessions.length} 
                                    itemSize={110} 
                                    className="no-scrollbar" 
                                    itemData={{ sessions, onSelect: setSelectedSessionId, activeMenuId, onMenuToggle: handleMenuToggle, onDelete: handleDeleteSession }}
                                >
                                    {SessionRow}
                                </FixedSizeList>
                            )}
                        </AutoSizer>
                    )}
                </div>
            </div>
            
            <StartSessionModal isOpen={isStartModalOpen} onClose={() => setIsStartModalOpen(false)} onSessionStart={(s) => navigate(`/counting/${s.id}`)} />
        </div>
    );
};
