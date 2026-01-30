import React, { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import { Archive, WifiOff, Zap, Package, ChevronLeft } from 'lucide-react';
import { StartSessionModal } from './StartSessionModal';
import { SearchBar } from './SearchBar';
import { ReportDetail } from './reports/ReportDetail';
import { ReportsHeader } from './reports/ReportsHeader';
import { useNavigate } from 'react-router-dom';
import { SessionRow } from './reports/SessionRow';
import { useReports } from '../hooks/useReports';

// --- VIRTUALIZADOR INTERNO ESTABLE ---
const SmartWindow = ({ items, itemHeight, renderRow: RenderRow, data, onItemsRendered }: any) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [scrollTop, setScrollTop] = useState(0);
    const [containerHeight, setContainerHeight] = useState(0);

    useEffect(() => {
        const updateHeight = () => { if (containerRef.current) setContainerHeight(containerRef.current.offsetHeight); };
        updateHeight();
        window.addEventListener('resize', updateHeight);
        return () => window.removeEventListener('resize', updateHeight);
    }, []);

    const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const top = e.currentTarget.scrollTop;
        setScrollTop(top);
        if (onItemsRendered) {
            const visibleStopIndex = Math.ceil((top + containerHeight) / itemHeight);
            onItemsRendered({ visibleStopIndex });
        }
    };

    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - 2);
    const endIndex = Math.min(items.length, Math.ceil((scrollTop + containerHeight) / itemHeight) + 2);
    const visibleItems = items.slice(startIndex, endIndex);
    const totalHeight = items.length * itemHeight;

    return (
        <div ref={containerRef} onScroll={onScroll} className="h-full w-full overflow-y-auto no-scrollbar relative">
            <div style={{ height: totalHeight, width: '100%', pointerEvents: 'none' }} />
            <div className="absolute top-0 left-0 w-full" style={{ transform: `translateY(${startIndex * itemHeight}px)` }}>
                {visibleItems.map((item: any, idx: number) => (
                    <div key={item.id} style={{ height: itemHeight }}>
                        {/* FIX: Renderizado correcto mediante tag JSX */}
                        <RenderRow index={startIndex + idx} data={data} />
                    </div>
                ))}
            </div>
        </div>
    );
};

export const Reports: React.FC = () => {
  const navigate = useNavigate();
  const { state, actions } = useReports();
  const isHammerArchive = state.filterType === 'hammer';

  const onItemsRendered = useCallback(({ visibleStopIndex }: any) => {
      if (state.hasMore && visibleStopIndex >= (state.sessions?.length || 0) - 5) {
          actions.loadMore();
      }
  }, [state.hasMore, state.sessions?.length, actions]);

  // OPTIMIZACIÓN: Memoizar 'data' para evitar re-renderizados innecesarios en SmartWindow/SessionRow
  const listData = useMemo(() => ({
      sessions: state.sessions, 
      onSelect: actions.setSelectedSessionId, 
      activeMenuId: state.activeMenuId, 
      onMenuToggle: actions.handleMenuToggle, 
      onDelete: actions.handleDeleteSession 
  }), [state.sessions, state.activeMenuId, actions.setSelectedSessionId, actions.handleMenuToggle, actions.handleDeleteSession]);

  if (state.selectedSessionId) {
      return <ReportDetail sessionId={state.selectedSessionId} onBack={() => actions.setSelectedSessionId(null)} />;
  }

  return (
        <div className="flex flex-col h-full w-full page-transition px-4 pt-6 pb-24 md:pb-6">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    {isHammerArchive ? <Zap className="w-6 h-6 text-blue-500" /> : <Package className="w-6 h-6 text-indigo-500" />}
                    <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic">
                        {isHammerArchive ? 'Archivo Martillo' : 'Historial de Carga'}
                    </h1>
                </div>
                {isHammerArchive && (
                    <button onClick={() => navigate('/reports')} className="text-[10px] font-black bg-slate-100 text-slate-500 px-3 py-1.5 rounded-lg uppercase">Ver Cargas</button>
                )}
            </div>

            <ReportsHeader 
                isCleaning={state.isCleaning} 
                onClean={actions.handleCleanSynced} 
                onOpenConsolidated={() => navigate('/consolidated')} 
                onStartNew={() => actions.setIsStartModalOpen(true)} 
            />
            
            <div className="mt-4 mb-6 shrink-0">
                <SearchBar onSearch={actions.setSearchQuery} placeholder="Filtrar por ERP o Bulto..." />
            </div>

            {state.pendingSyncCount > 0 && (
                <button onClick={() => navigate('/sync')} className="w-full mb-4 bg-orange-600 p-4 rounded-2xl flex items-center justify-between shadow-lg shadow-orange-900/20 animate-pulse group border-b-4 border-orange-800 shrink-0">
                    <div className="flex items-center gap-3">
                        <WifiOff className="w-5 h-5 text-white" />
                        <div className="text-left">
                            <div className="text-[10px] font-black text-white uppercase tracking-widest">Sincronización Pendiente</div>
                            <div className="text-[9px] text-orange-100 font-bold uppercase">{state.pendingSyncCount} registros en cola</div>
                        </div>
                    </div>
                </button>
            )}

            <div className="flex-1 min-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-[2rem] overflow-hidden shadow-sm relative">
                <div className="absolute top-0 left-0 right-0 h-10 bg-slate-50 dark:bg-black/50 border-b border-slate-100 dark:border-white/5 flex items-center px-6 justify-between z-10">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Firma Operativa</span>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Estado</span>
                </div>
                
                <div className="h-full pt-10">
                    {(!state.sessions || state.sessions.length === 0) ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-300">
                            <Archive className="w-12 h-12 mb-3 opacity-20" />
                            <p className="text-[10px] font-black uppercase tracking-widest">Lista vacía</p>
                        </div>
                    ) : (
                        <SmartWindow 
                            items={state.sessions}
                            itemHeight={110}
                            onItemsRendered={onItemsRendered}
                            renderRow={SessionRow}
                            data={listData} 
                        />
                    )}
                </div>
            </div>
            
            <StartSessionModal 
                isOpen={state.isStartModalOpen} 
                onClose={() => actions.setIsStartModalOpen(false)} 
                onSessionStart={(s) => navigate(`/counting/${s.id}`)} 
            />
        </div>
    );
};

export default Reports;