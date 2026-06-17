import React from 'react';
import { TableSchema } from '../types';
import { DynamicCard } from './DynamicCard';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Filter, Plus, Database, ArrowLeft, RefreshCw, CheckSquare, Square, Printer, Sun, Settings, FileText, Moon } from 'lucide-react';
import { useAppStore } from '@/store/mainAppStore';
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
  theme?: 'dark' | 'light' | 'high-contrast';
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
  const [isPanelOpen, setIsPanelOpen] = React.useState(false);

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

  const stats = React.useMemo(() => {
    const total = items.length;
    const pending = items.filter(item => item._syncStatus === 'pending').length;
    const synced = items.filter(item => item._syncStatus === 'synced').length;
    const error = items.filter(item => item._syncStatus === 'error').length;
    return { total, pending, synced, error };
  }, [items]);

  const applyPreset = (preset: 'all' | 'pending' | 'synced' | 'error') => {
    setStatusFilter(preset);
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Search Input Hero Section - Absolute Protagonist */}
      <div className="flex items-center gap-2 md:gap-3 w-full">
        {/* Prominent Search bar with elegant interactive iconography */}
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-400" />
          <input
            type="text"
            placeholder={`Buscar en ${schema.tableName}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`w-full pl-12 pr-12 py-3.5 rounded-2xl text-base font-bold border transition-all outline-none shadow-md ${
              theme === 'dark' 
                ? 'bg-slate-900/60 border-white/5 text-white placeholder-stone-500 focus:bg-slate-900/90 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20' 
                : 'bg-stone-50 border-stone-200 text-stone-900 placeholder-stone-400 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/10'
            }`}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-500 hover:text-indigo-400 transition-colors text-xs font-black uppercase tracking-widest"
              title="Limpiar búsqueda"
            >
              Borrar
            </button>
          )}
        </div>

        {/* Filters and Actions Collapsible Toggle */}
        <button
          onClick={() => setIsPanelOpen(!isPanelOpen)}
          className={`flex items-center justify-center gap-2 h-[52px] px-4 md:px-5 rounded-2xl text-xs font-black uppercase tracking-wider border transition-all shrink-0 ${
            isPanelOpen
              ? 'bg-indigo-500 border-indigo-500 text-white shadow-lg shadow-indigo-500/20'
              : (theme === 'dark'
                ? 'bg-slate-900/60 border-white/5 text-stone-300 hover:bg-slate-900/90 hover:text-indigo-400'
                : 'bg-stone-100 border-stone-200 text-stone-600 hover:bg-stone-200 hover:text-stone-950')
          }`}
          title="Ver filtros y opciones avanzadas"
        >
          <Filter className="w-5 h-5" />
          <span className="hidden sm:inline">Ajustes</span>
          {statusFilter !== 'all' && (
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-slate-900 animate-pulse" />
          )}
        </button>

        {onAdd && (
          <button
            onClick={onAdd}
            className="flex items-center justify-center gap-2 h-[52px] px-4 md:px-5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-2xl transition-all shadow-lg shadow-indigo-500/20 text-xs font-bold uppercase tracking-wider shrink-0"
            title="Crear un nuevo registro"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden md:inline">Nuevo</span>
          </button>
        )}
      </div>

      {/* Advanced Collapsible Control Panel */}
      <AnimatePresence>
        {isPanelOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -6 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -6 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className={`overflow-hidden rounded-2xl border ${
              theme === 'dark'
                ? 'bg-slate-900/70 border-white/5 shadow-2xl backdrop-blur-md'
                : 'bg-stone-50 border-stone-200 shadow-md'
            }`}
          >
            <div className="p-4 md:p-6 flex flex-col gap-6">
              {/* Interactive Dashboard Metric Grid - Filter by State */}
              <div className="flex flex-col gap-2.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
                  Panel de Estadísticas y Filtro de Transmisión
                </span>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                  <button
                    onClick={() => applyPreset('all')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      statusFilter === 'all'
                        ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-400 ring-1 ring-indigo-500/20'
                        : 'bg-white/5 border-white/5 text-stone-400 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <div className="text-[10px] uppercase font-black tracking-wider text-stone-400">Todo el Universo</div>
                    <div className="text-xl font-black mt-1 italic leading-none">{stats.total}</div>
                  </button>

                  <button
                    onClick={() => applyPreset('synced')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      statusFilter === 'synced'
                        ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400 ring-1 ring-emerald-500/20'
                        : 'bg-white/5 border-white/5 text-stone-400 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <div className="text-[10px] uppercase font-black tracking-wider text-stone-400">✓ Sincronizados</div>
                    <div className="text-xl font-black mt-1 italic leading-none">{stats.synced}</div>
                  </button>

                  <button
                    onClick={() => applyPreset('pending')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      statusFilter === 'pending'
                        ? 'bg-amber-500/10 border-amber-500/50 text-amber-400 ring-1 ring-amber-500/20'
                        : 'bg-white/5 border-white/5 text-stone-400 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <div className="text-[10px] uppercase font-black tracking-wider text-stone-400">⏳ Cola Pendiente</div>
                    <div className="text-xl font-black mt-1 italic leading-none">{stats.pending}</div>
                  </button>

                  <button
                    onClick={() => applyPreset('error')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      statusFilter === 'error'
                        ? 'bg-rose-500/10 border-rose-500/50 text-rose-400 ring-1 ring-rose-500/20'
                        : 'bg-white/5 border-white/5 text-stone-400 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <div className="text-[10px] uppercase font-black tracking-wider text-stone-400">🚨 Con Fallas</div>
                    <div className="text-xl font-black mt-1 italic leading-none text-rose-500">{stats.error}</div>
                  </button>
                </div>
              </div>

              {/* Selection and Mass actions helper */}
              {onSelectAll && (
                <div className="flex flex-col gap-2.5 border-t border-white/5 pt-4">
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
                    Operaciones Masivas y Bloqueo
                  </span>
                  <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
                    <button 
                      onClick={onSelectAll}
                      className={`py-3 px-4 rounded-xl flex items-center justify-between transition-all border shrink-0 ${
                        selectedIds.size === filteredItems.length && filteredItems.length > 0
                          ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-400 font-bold'
                          : (theme === 'dark' ? 'bg-white/5 border-white/10 text-stone-400 hover:text-white' : 'bg-stone-50 border-stone-200 text-stone-500 hover:text-stone-900')
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {selectedIds.size === filteredItems.length && filteredItems.length > 0 ? (
                          <CheckSquare className="w-4.5 h-4.5 text-indigo-400" />
                        ) : (
                          <Square className="w-4.5 h-4.5 text-stone-500" />
                        )}
                        <span className="text-[10px] font-black uppercase tracking-widest">
                          {selectedIds.size === filteredItems.length && filteredItems.length > 0 ? 'Deseleccionar Todo' : 'Seleccionar Todo'}
                        </span>
                      </div>
                      <span className="text-[10px] font-black bg-indigo-500/20 px-2 py-0.5 rounded ml-2 text-indigo-400">
                        {selectedIds.size}
                      </span>
                    </button>
                    <span className="text-[9px] font-bold text-stone-500 uppercase tracking-widest italic leading-normal">
                      {selectedIds.size > 0 
                        ? `${selectedIds.size} elementos seleccionados. Usa el panel superior para borrar, sincronizar o imprimir en lote.`
                        : 'Sugerencia: Selecciona elementos individuales para activar el panel superior de operaciones rápidas masivas.'}
                    </span>
                  </div>
                </div>
              )}

              {/* Administrative Actions bottom row */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-t border-white/5 pt-4">
                <span className="text-[10px] font-black text-stone-500 uppercase tracking-widest">
                  Acciones Globales & Terminal
                </span>

                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  {onPullSync && (
                    <button
                      onClick={onPullSync}
                      disabled={isPulling}
                      className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl transition-all border text-xs font-bold uppercase tracking-wider ${
                        isPulling ? 'animate-pulse' : ''
                      } ${
                        theme === 'dark' 
                          ? 'bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20' 
                          : 'bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100'
                      }`}
                      title="Sincronizar desde el servidor central"
                    >
                      <RefreshCw className={`w-4 h-4 ${isPulling ? 'animate-spin' : ''}`} />
                      <span>Sincronizar Cloud</span>
                    </button>
                  )}

                  <button 
                    onClick={() => window.print()} 
                    className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl transition-all border text-xs font-bold uppercase tracking-wider ${
                      theme === 'dark' ? 'bg-white/5 border-white/10 text-stone-300 hover:bg-white/10' : 'bg-stone-100 border-stone-200 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    <Printer className="w-4 h-4" />
                    <span>Imprimir</span>
                  </button>

                  <button 
                    onClick={handleExportCSV} 
                    className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl transition-all border text-xs font-bold uppercase tracking-wider ${
                      theme === 'dark' ? 'bg-white/5 border-white/10 text-stone-300 hover:bg-white/10' : 'bg-stone-100 border-stone-200 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span>CSV</span>
                  </button>

                  <button 
                    onClick={() => navigate('/settings')} 
                    className={`flex items-center justify-center w-[42px] h-[40px] rounded-xl transition-all border ${
                      theme === 'dark' ? 'bg-white/5 border-white/10 text-stone-300 hover:bg-white/10' : 'bg-stone-100 border-stone-200 text-stone-600 hover:bg-stone-200'
                    }`}
                    title="Configuración General"
                  >
                    <Settings className="w-4.5 h-4.5" />
                  </button>
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Filter Chips */}
      {statusFilter !== 'all' && (
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border bg-indigo-500/10 border-indigo-500/20 text-indigo-400 shadow-sm animate-fade-in">
            <span>Filtro: {statusFilter === 'pending' ? 'Pendiente' : statusFilter === 'synced' ? 'Sincronizado' : 'Con Error'}</span>
            <button 
              onClick={() => setStatusFilter('all')}
              className="text-[10px] hover:text-white hover:bg-indigo-500/20 px-1.5 py-0.5 rounded transition-colors font-bold ml-1"
            >
              ✕
            </button>
          </span>
        </div>
      )}

      {/* Main card viewport */}
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

