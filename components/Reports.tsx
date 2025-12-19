
import React, { useState, useCallback } from 'react';
import { FileText, WifiOff, ExternalLink } from 'lucide-react';
import { CountingSession } from '../types';
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
import { SessionRow } from './reports/SessionRow'; // Extraído a un archivo nuevo para estabilidad

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
        const cleanQuery = searchQuery.trim();
        return await db.sessions.where('erpOrder').startsWithIgnoreCase(cleanQuery).or('logisticsLabel').startsWithIgnoreCase(cleanQuery).reverse().toArray();
    } else {
        return await db.sessions.orderBy('createdAt').reverse().toArray();
    }
  }, [searchQuery], []);

  const handleMenuToggle = (e: React.MouseEvent, id: string) => { e.stopPropagation(); setActiveMenuId(activeMenuId === id ? null : id); };

  const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
      e.stopPropagation();
      if (window.confirm('¿Eliminar permanentemente?')) {
          await sessionService.deleteSession(sessionId); 
          setActiveMenuId(null);
      }
  };

  const handleCleanSynced = async () => {
      if (!confirm("¿Eliminar del dispositivo bultos YA respaldados?")) return;
      setIsCleaning(true);
      try {
          const count = await sessionService.cleanSyncedSessions(); 
          alert(count > 0 ? `Limpieza exitosa: ${count} bultos.` : "Nada para limpiar.");
      } finally { setIsCleaning(false); }
  };

  if (selectedSessionId) return <ReportDetail sessionId={selectedSessionId} onBack={() => setSelectedSessionId(null)} />;

  return (
        <div className="flex flex-col h-[calc(100vh-64px)] max-w-3xl mx-auto w-full px-4 pt-4">
            <ReportsHeader 
                isCleaning={isCleaning} 
                onClean={handleCleanSynced} 
                onOpenConsolidated={() => navigate('/consolidated')} 
                onStartNew={() => setIsStartModalOpen(true)} 
            />
            
            <div className="mb-4">
                <SearchBar onSearch={setSearchQuery} placeholder="Buscar por ERP o Etiqueta..." />
            </div>

            {pendingSyncCount > 0 && (
                <button onClick={() => navigate('/sync')} className="w-full mb-4 bg-orange-50 border border-orange-200 p-4 rounded-xl flex items-center justify-between shadow-sm group hover:bg-orange-100 transition-colors">
                    <div className="flex items-center gap-3">
                        <WifiOff className="w-5 h-5 text-orange-500" />
                        <div className="text-left"><div className="text-sm font-bold text-orange-800">Sync Pendiente</div><div className="text-xs text-orange-600">{pendingSyncCount} registros</div></div>
                    </div>
                    <div className="bg-white text-orange-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1">Subir <ExternalLink className="w-3 h-3" /></div>
                </button>
            )}

            <div className="flex-1 min-h-0 pb-20">
                {(!sessions || sessions.length === 0) ? (
                    <div className="text-center py-12 bg-white rounded-3xl border border-slate-100 h-full flex flex-col justify-center items-center">
                        <FileText className="w-12 h-12 mx-auto text-slate-300 mb-3" /><p className="text-slate-400 font-medium">Vacío</p>
                    </div>
                ) : (
                    <AutoSizer>
                        {({ height, width }) => (
                            <FixedSizeList height={height} width={width} itemCount={sessions.length} itemSize={160} className="no-scrollbar" itemData={{ sessions, onSelect: setSelectedSessionId, activeMenuId, onMenuToggle: handleMenuToggle, onDelete: handleDeleteSession }}>
                                {SessionRow}
                            </FixedSizeList>
                        )}
                    </AutoSizer>
                )}
            </div>
            
            <StartSessionModal isOpen={isStartModalOpen} onClose={() => setIsStartModalOpen(false)} onSessionStart={(s) => navigate(`/counting/${s.id}`)} />
        </div>
    );
};
