
import React from 'react';
import { FileText, WifiOff, ExternalLink, Archive } from 'lucide-react';
import { StartSessionModal } from './StartSessionModal';
import { SearchBar } from './SearchBar';
import * as ReactWindow from 'react-window';
import * as AutoSizerModule from 'react-virtualized-auto-sizer';

const FixedSizeList = (ReactWindow as any).FixedSizeList || (ReactWindow as any).default?.FixedSizeList;
const AutoSizer = (AutoSizerModule as any).default || AutoSizerModule;

import { ReportDetail } from './reports/ReportDetail';
import { ReportsHeader } from './reports/ReportsHeader';
import { useNavigate } from 'react-router-dom';
import { SessionRow } from './reports/SessionRow';
import { useReports } from '../hooks/useReports';

export const Reports: React.FC = () => {
  const navigate = useNavigate();
  const { state, actions } = useReports();

  if (state.selectedSessionId) {
      return <ReportDetail sessionId={state.selectedSessionId} onBack={() => actions.setSelectedSessionId(null)} />;
  }

  // Lógica defensiva para el renderizado
  const renderSessions = () => {
    if (!state.sessions || state.sessions.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-slate-300">
                <Archive className="w-12 h-12 mb-3 opacity-20" />
                <p className="text-[10px] font-black uppercase tracking-widest">Lista vacía</p>
            </div>
        );
    }

    // Si las librerías virtuales fallaron (Error #130 guard), usamos lista nativa
    if (!FixedSizeList || !AutoSizer) {
        return (
            <div className="h-full overflow-y-auto p-4 space-y-2">
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
        );
    }

    // Renderizado optimizado original
    return (
        <AutoSizer>
            {({ height, width }: { height: number; width: number }) => (
                <FixedSizeList 
                    height={height} 
                    width={width} 
                    itemCount={state.sessions!.length} 
                    itemSize={110} 
                    className="no-scrollbar" 
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
        <div className="flex flex-col h-[calc(100dvh-6rem)] w-full page-transition px-4 pt-6">
            <ReportsHeader 
                isCleaning={state.isCleaning} 
                onClean={actions.handleCleanSynced} 
                onOpenConsolidated={() => navigate('/consolidated')} 
                onStartNew={() => actions.setIsStartModalOpen(true)} 
            />
            
            <div className="mt-4 mb-6">
                <SearchBar onSearch={actions.setSearchQuery} placeholder="Filtrar por ERP o Bulto..." />
            </div>

            {state.pendingSyncCount > 0 && (
                <button onClick={() => navigate('/sync')} className="w-full mb-4 bg-orange-600 p-4 rounded-2xl flex items-center justify-between shadow-lg shadow-orange-900/20 animate-pulse group border-b-4 border-orange-800">
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
