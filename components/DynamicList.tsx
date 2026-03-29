import React from 'react';
import { TableSchema } from '../types';
import { DynamicCard } from './DynamicCard';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Filter, Plus, Database, ArrowLeft, RefreshCw, CheckSquare, Square, Printer, Sun, Settings, FileText, Moon } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useNavigate } from 'react-router-dom';

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
  selectedIds?: Set<string>;
  onSelect?: (id: string) => void;
  onSelectAll?: () => void;
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
  isLoading = false,
  selectedIds = new Set(),
  onSelect,
  onSelectAll
}) => {
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<'all' | 'pending' | 'synced' | 'error'>('all');
  const navigate = useNavigate();
  const { updateSetting } = useAppStore();

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

  const handleExportCSV = () => {
    if (filteredItems.length === 0) return;
    
    const headers = Object.keys(schema.columns);
    const rows = filteredItems.map(item => 
      headers.map(header => `"${String(item[header] || '').replace(/"/g, '""')}"`)
    );
    
    const csvContent = [
      headers.map(h => schema.columns[h].label).join(','), 
      ...rows.map(r => r.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${schema.tableName}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
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
        
        <div className="flex flex-wrap items-center gap-2">
          {onPullSync && (
            <button
              onClick={onPullSync}
              disabled={isPulling}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all border ${
                isPulling ? 'animate-pulse' : ''
              } ${
                theme === 'dark' 
                  ? 'bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20' 
                  : 'bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100'
              }`}
              title="Sincronizar desde la nube"
            >
              <RefreshCw className={`w-4 h-4 ${isPulling ? 'animate-spin' : ''}`} />
              <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Sincronizar</span>
            </button>
          )}
          <button onClick={() => window.print()} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all border ${theme === 'dark' ? 'bg-white/5 border-white/10 text-stone-300 hover:bg-white/10' : 'bg-stone-100 border-stone-200 text-stone-600 hover:bg-stone-200'}`}>
            <Printer className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Imprimir</span>
          </button>
          <button onClick={() => updateSetting('theme', theme === 'dark' ? 'light' : 'dark')} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all border ${theme === 'dark' ? 'bg-white/5 border-white/10 text-stone-300 hover:bg-white/10' : 'bg-stone-100 border-stone-200 text-stone-600 hover:bg-stone-200'}`}>
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button onClick={() => navigate('/settings')} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all border ${theme === 'dark' ? 'bg-white/5 border-white/10 text-stone-300 hover:bg-white/10' : 'bg-stone-100 border-stone-200 text-stone-600 hover:bg-stone-200'}`}>
            <Settings className="w-4 h-4" />
          </button>
          <button onClick={handleExportCSV} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all border ${theme === 'dark' ? 'bg-white/5 border-white/10 text-stone-300 hover:bg-white/10' : 'bg-stone-100 border-stone-200 text-stone-600 hover:bg-stone-200'}`}>
            <FileText className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Exportar CSV</span>
          </button>
          {onAdd && (
            <button
              onClick={onAdd}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl transition-all shadow-lg shadow-indigo-500/20"
            >
              <Plus className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Nuevo</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1 flex items-center gap-2">
          {onSelectAll && (
            <button 
              onClick={onSelectAll}
              className={`w-12 h-12 shrink-0 rounded-xl flex items-center justify-center transition-all border ${
                selectedIds.size === filteredItems.length && filteredItems.length > 0
                  ? (theme === 'dark' ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-500' : 'bg-indigo-50 border-indigo-300 text-indigo-600')
                  : (theme === 'dark' ? 'bg-white/5 border-white/10 text-stone-400 hover:text-white' : 'bg-stone-50 border-stone-200 text-stone-500 hover:text-stone-900')
              }`}
              title="Seleccionar Todos"
            >
              {selectedIds.size === filteredItems.length && filteredItems.length > 0 ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
            </button>
          )}
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
                  isSelected={selectedIds.has(item.id)}
                  onSelect={onSelect}
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
