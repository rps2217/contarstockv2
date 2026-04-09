import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  Search, 
  Calendar, 
  Download, 
  Filter, 
  Box, 
  Clock, 
  Cloud, 
  Trash2,
  MoreVertical,
  History
} from 'lucide-react';
import { useReceptionHistory } from './hooks/useReceptionHistory';
import { VirtualList } from '../../shared/components/ui/VirtualList';
import { useAppStore } from '../../store/mainAppStore';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { deleteSession } from '../../services/sessionService';

const ReceptionHistoryRow = React.memo(({ index, style, data }: any) => {
  const session = data.items[index];
  if (!session) return null;
  
  const { theme, onDelete } = data;
  const isSynced = !!session.lastSyncTimestamp;

  return (
    <div style={style} className="px-4 py-2">
      <div className={`border-4 rounded-[2.5rem] h-full flex items-center px-6 gap-5 transition-all active:scale-[0.98] shadow-sm relative ${
        theme === 'dark' ? 'bg-brand-surface border-white/5' : 'bg-white border-slate-100'
      }`}>
        <div className={`absolute left-0 top-0 bottom-0 w-2.5 rounded-l-[2.5rem] ${isSynced ? 'bg-emerald-500' : 'bg-brand-info'}`} />
        
        <div className="flex-1 min-w-0 py-4">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] font-black uppercase tracking-widest ${isSynced ? 'text-emerald-500' : 'text-brand-info'}`}>
              {isSynced ? 'Sincronizado' : 'Local'}
            </span>
            {isSynced && <Cloud className="w-3 h-3 text-emerald-500" />}
          </div>
          
          <h3 className={`text-xl font-black uppercase truncate tracking-tighter leading-none mb-1 ${
            theme === 'dark' ? 'text-white' : 'text-slate-900'
          }`}>
            {session.logisticsLabel}
          </h3>
          
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            <Clock className="w-3.5 h-3.5" />
            <span>{format(session.createdAt, 'dd MMM yyyy HH:mm', { locale: es })}</span>
          </div>
          
          {session.erpOrder && session.erpOrder !== 'RECEPCION_BORRADOR' && (
            <div className="mt-1 text-[9px] font-black text-emerald-500 uppercase tracking-tighter">
              ERP: {session.erpOrder}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => onDelete(session.id)}
            className={`w-10 h-10 flex items-center justify-center rounded-xl transition-colors ${
              theme === 'dark' ? 'bg-brand-dark/50 hover:bg-rose-900/20 text-slate-500 hover:text-rose-500' : 'bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600'
            }`}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
});

export const ReceptionHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { settings } = useAppStore();
  const theme = settings.theme;
  const { state, actions } = useReceptionHistory();

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Eliminar este registro de recepción?')) {
      await deleteSession(id);
    }
  };

  return (
    <div className={`flex flex-col h-screen w-full page-transition ${
      theme === 'dark' ? 'bg-brand-dark text-white' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Header */}
      <header className={`h-20 px-6 flex items-center justify-between shrink-0 border-b ${
        theme === 'dark' ? 'bg-brand-surface border-white/5' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all active:scale-90 ${
              theme === 'dark' ? 'bg-white/5 hover:bg-white/10' : 'bg-slate-100 hover:bg-slate-200'
            }`}
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-xl font-black tracking-tighter uppercase italic leading-none">Gestión de Recepción</h1>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-1">Historial de Bultos Cerrados</p>
          </div>
        </div>
        
        <button 
          onClick={actions.exportToCSV}
          disabled={state.isExporting || !state.sessions?.length}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 disabled:opacity-30 ${
            theme === 'dark' ? 'bg-brand-info text-black' : 'bg-indigo-600 text-white'
          }`}
        >
          <Download className="w-4 h-4" />
          {state.isExporting ? 'Exportando...' : 'Exportar CSV'}
        </button>
      </header>

      {/* Filters */}
      <div className="p-6 space-y-4 shrink-0">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input 
            type="text"
            placeholder="Buscar por etiqueta o ERP..."
            value={state.searchQuery}
            onChange={(e) => actions.setSearchQuery(e.target.value)}
            className={`w-full h-14 pl-12 pr-6 rounded-2xl font-bold text-sm transition-all outline-none border-2 ${
              theme === 'dark' 
                ? 'bg-brand-surface border-white/5 focus:border-brand-info/50 text-white' 
                : 'bg-white border-slate-200 focus:border-indigo-500 text-slate-900'
            }`}
          />
        </div>

        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="date"
              value={state.startDate}
              onChange={(e) => actions.setStartDate(e.target.value)}
              className={`w-full h-12 pl-12 pr-4 rounded-xl font-bold text-xs outline-none border-2 ${
                theme === 'dark' ? 'bg-brand-surface border-white/5 focus:border-brand-info/50' : 'bg-white border-slate-200 focus:border-indigo-500'
              }`}
            />
          </div>
          <div className="flex-1 relative">
            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="date"
              value={state.endDate}
              onChange={(e) => actions.setEndDate(e.target.value)}
              className={`w-full h-12 pl-12 pr-4 rounded-xl font-bold text-xs outline-none border-2 ${
                theme === 'dark' ? 'bg-brand-surface border-white/5 focus:border-brand-info/50' : 'bg-white border-slate-200 focus:border-indigo-500'
              }`}
            />
          </div>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 min-h-0 px-2">
        {state.sessions === undefined ? (
          <div className="h-full flex items-center justify-center">
            <History className="w-12 h-12 text-slate-500 animate-pulse" />
          </div>
        ) : state.sessions.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-30">
            <Box className="w-16 h-16 mb-4" />
            <p className="font-black uppercase tracking-widest text-sm">No se encontraron registros</p>
          </div>
        ) : (
          <VirtualList 
            items={state.sessions}
            itemHeight={100}
            renderRow={ReceptionHistoryRow}
            rowData={{ theme, onDelete: handleDelete }}
            onEndReached={actions.loadMore}
          />
        )}
      </div>
    </div>
  );
};

export default ReceptionHistoryPage;
