import React from 'react';
import { TableSchema } from '../types';
import { DynamicCard } from './DynamicCard';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Filter, Plus, Database, ArrowLeft, RefreshCw } from 'lucide-react';

interface DynamicListProps {
  items: any[];
  schema: TableSchema;
  onRemove?: (item: any) => void;
  onClick?: (item: any) => void;
  onAdd?: () => void;
  onBack?: () => void;
  onPullSync?: () => void;
  isPulling?: boolean;
  title?: string;
  theme?: 'dark' | 'light';
  isLoading?: boolean;
}

export const DynamicList: React.FC<DynamicListProps> = ({
  items,
  schema,
  onRemove,
  onClick,
  onAdd,
  onBack,
  onPullSync,
  isPulling = false,
  title,
  theme = 'dark',
  isLoading = false
}) => {
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<'all' | 'pending' | 'synced' | 'error'>('all');

  const filteredItems = React.useMemo(() => {
    let result = items;
    
    if (statusFilter !== 'all') {
      result = result.filter(item => item._syncStatus === statusFilter);
    }

    if (!search) return result;
    const s = search.toLowerCase();
    return result.filter(item => 
      Object.values(item).some(val => 
        String(val).toLowerCase().includes(s)
      )
    );
  }, [items, search, statusFilter]);

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {onBack && (
            <button
              onClick={onBack}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all border ${
                theme === 'dark' 
                  ? 'bg-white/5 border-white/10 text-stone-400 hover:text-white hover:bg-white/10' 
                  : 'bg-stone-100 border-stone-200 text-stone-500 hover:text-stone-900 hover:bg-stone-200'
              }`}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="flex flex-col">
            <h2 className={`text-xl font-black uppercase tracking-tighter italic ${
              theme === 'dark' ? 'text-white' : 'text-stone-900'
            }`}>
              {title || schema.tableName}
            </h2>
            <span className="text-[10px] font-black text-stone-500 uppercase tracking-widest">
              {items.length} Registros {statusFilter !== 'all' && `(${filteredItems.length} filtrados)`}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {onPullSync && (
            <button
              onClick={onPullSync}
              disabled={isPulling}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all border ${
                isPulling ? 'animate-pulse' : ''
              } ${
                theme === 'dark' 
                  ? 'bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20' 
                  : 'bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100'
              }`}
              title="Sincronizar desde la nube"
            >
              <RefreshCw className={`w-5 h-5 ${isPulling ? 'animate-spin' : ''}`} />
            </button>
          )}
          {onAdd && (
            <button
              onClick={onAdd}
              className="w-10 h-10 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl flex items-center justify-center transition-all shadow-lg shadow-indigo-500/20"
            >
              <Plus className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
          <input
            type="text"
            placeholder={`Buscar en ${schema.tableName}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`w-full pl-10 pr-4 py-3 rounded-xl text-sm font-bold border transition-all outline-none ${
              theme === 'dark' 
                ? 'bg-white/5 border-white/5 text-white focus:bg-white/10 focus:border-indigo-500/50' 
                : 'bg-stone-50 border-stone-200 text-stone-900 focus:bg-white focus:border-indigo-500'
            }`}
          />
        </div>

        <div className="flex gap-1 p-1 bg-white/5 rounded-xl border border-white/5 shrink-0">
          {(['all', 'pending', 'synced', 'error'] as const).map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                statusFilter === status
                  ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                  : 'text-stone-500 hover:text-stone-300'
              }`}
            >
              {status === 'all' ? 'Todos' : 
               status === 'pending' ? 'Pend.' :
               status === 'synced' ? 'Sinc.' : 'Error'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-40 gap-4">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-black text-stone-500 uppercase tracking-widest animate-pulse">
              Cargando Datos...
            </span>
          </div>
        ) : filteredItems.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-10">
            <AnimatePresence mode="popLayout">
              {filteredItems.map((item, idx) => (
                <DynamicCard
                  key={item.id || idx}
                  item={item}
                  schema={schema}
                  onRemove={onRemove}
                  onClick={onClick}
                  theme={theme}
                />
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-60 gap-4 opacity-50">
            <Database className="w-12 h-12 text-stone-500" />
            <div className="flex flex-col items-center">
              <span className="text-sm font-black text-stone-500 uppercase tracking-widest">
                No hay registros
              </span>
              <span className="text-[10px] font-bold text-stone-600 uppercase tracking-widest">
                {search ? 'Intenta con otra búsqueda' : 'Comienza agregando datos'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
