
import React, { useCallback } from 'react';
import { Archive, ExternalLink, WifiOff, ChevronDown, AlertCircle } from 'lucide-react';
import { StartSessionModal } from './StartSessionModal';
import { SearchBar } from './SearchBar';
import * as ReactWindow from 'react-window';
import * as AutoSizerModule from 'react-virtualized-auto-sizer';

// Fix: Safe extraction for Virtual List components
const FixedSizeList = (ReactWindow as any).FixedSizeList || (ReactWindow as any).default?.FixedSizeList;
const AutoSizer = (AutoSizerModule as any).default || (AutoSizerModule as any).AutoSizer || AutoSizerModule;

import { ReportDetail } from './reports/ReportDetail';
import { ReportsHeader } from './reports/ReportsHeader';
import { useNavigate } from 'react-router-dom';
import { SessionRow } from './reports/SessionRow';
import { useReports } from '../hooks/useReports';

export const Reports: React.FC = () => {
  const navigate = useNavigate();
  const { state, actions } = useReports();

  const onItemsRendered = useCallback(({ visibleStopIndex }: any) => {
      if (state.hasMore && visibleStopIndex >= (state.sessions?.length || 0) - 5) {
          actions.loadMore();
      }
  }, [state.hasMore, state.sessions?.length, actions]);

  if (state.selectedSessionId) {
      return <ReportDetail sessionId={state.selectedSessionId} onBack={() => actions.setSelectedSessionId(null)} />;
  }

  const renderSessions = () => {
    if (!state.sessions || state.sessions.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-slate-300">
                <Archive className="w-12 h-12 mb-3 opacity-20" />
                <p className="text-[10px] font-black uppercase tracking-widest">Lista vacía</p>
            </div>
        );
    }

    // Safety fallback for Virtual List failure
    if (!FixedSizeList || !AutoSizer) {
        return (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center opacity-60">
                <AlertCircle className="w-8 h-8 mb-2 text-slate-400" />
                <p className="text-xs text-slate-500 font-bold uppercase">Modo Simple (Error Gráfico)</p>
                <div className="w-full mt-4 overflow-y-auto max-h-full space-y-2">
                    {state.sessions.map((session, idx) => (
                        <SessionRow 
                            key={session.id} 
                            index={idx} 
                            style={{}} 
                            data={{ 
                                sessions: state.sessions!, 
                                onSelect: actions.setSelectedSessionId, 
                                activeMenuId: state.activeMenuId, 
                                onMenuToggle: actions.handleMenuToggle, 
                                onDelete: actions.handleDeleteSession 
                            }} 
                        />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <AutoSizer>
            {({ height, width }: { height: number; width: number }) => (
                <FixedSizeList 
                    height={height} 
                    width={width} 
                    itemCount={state.sessions!.length} 
                    itemSize={110} 
                    className="no-scrollbar" 
                    onItemsRendered={onItemsRendered}
                    itemData={{ 
                        sessions: state.sessions, 
                        onSelect: actions.setSelectedSessionId, 
                        activeMenuId: state.activeMenuId, 
                        onMenuToggle: actions.handleMenuToggle, 
                        onDelete: actions.handleDeleteSession 
                    }}
                >
                    {SessionRow}
                </FixedSizeList>
            )}
        </AutoSizer>
    );
  };

  return (
        <div className="flex flex-col h-full w-full page-transition px-4 pt-6 pb-24 md:pb-6">
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
                            <div className="text-[10px] font-black text-white uppercase tracking-widest">En cola de subida</div>
                            <div className="text-[9px] text-orange-100 font-bold uppercase">{state.pendingSyncCount} registros sin respaldo</div>
                        </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-white opacity-60" />
                </button>
            )}

            <div className="flex-1 min-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-[2rem] overflow-hidden shadow-sm relative">
                <div className="absolute top-0 left-0 right-0 h-10 bg-slate-50 dark:bg-black/50 border-b border-slate-100 dark:border-white/5 flex items-center px-6 justify-between z-10">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Firma Operativa</span>
                    {state.hasMore && <span className="animate-bounce"><ChevronDown className="w-3 h-3 text-blue-500" /></span>}
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Estado</span>
                </div>
                
                <div className="h-full pt-10">
                    {renderSessions()}
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
