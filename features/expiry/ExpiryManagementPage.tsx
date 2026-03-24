
import React, { useState, useRef } from 'react';
import { 
  ChevronRight, 
  Printer,
  FileText,
  Calendar,
  RefreshCw,
  Sun,
  Moon,
  Settings2,
  Plus
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import { useVirtualizer } from '@tanstack/react-virtual';

// Hooks
import { useExpiryDatabase, ExpiryStatus } from './hooks/useExpiryDatabase';

// Components
import { ExpiryStats } from './components/ExpiryStats';
import { ExpiryFilterDrawer } from './components/ExpiryFilterDrawer';
import { ExpirySettingsDrawer } from './components/ExpirySettingsDrawer';
import { ExpiryAddModal } from './components/ExpiryAddModal';
import { ExpirySearchBar } from './components/ExpirySearchBar';
import { ExpiryItemCard } from './components/ExpiryItemCard';
import { ExpiryBulkActions } from './components/ExpiryBulkActions';

// Utils
import { handlePrintExpirations, handlePrintLabels, handleExportExpirationsCSV, handleSendEmail } from './utils/expiryUtils';

const ExpiryManagementPage: React.FC = () => {
  const { state, actions } = useExpiryDatabase();
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [isSettingsDrawerOpen, setIsSettingsDrawerOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  const activeFiltersCount = 
    state.selectedStatuses.length + 
    state.selectedCategories.length + 
    (state.selectedCanje !== 'all' ? 1 : 0) +
    (state.selectedEstado ? 1 : 0) +
    (state.dateRange.start || state.dateRange.end ? 1 : 0) +
    (state.withdrawalDateRange.start || state.withdrawalDateRange.end ? 1 : 0);

  const handleToggleSelect = (id: string) => {
    const newSelected = new Set(state.selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    actions.setSelectedIds(newSelected);
  };

  const handleToggleVerified = (id: string) => {
    const newVerified = new Set(state.verifiedIds);
    if (newVerified.has(id)) {
      newVerified.delete(id);
    } else {
      newVerified.add(id);
    }
    actions.setVerifiedIds(newVerified);
  };

  const handleClearFilters = () => {
    actions.setSearchQuery('');
    actions.setSelectedStatuses([]);
    actions.setSelectedCategories([]);
    actions.setSelectedCanje('all');
    actions.setSelectedEstado(null);
    actions.setDateRange({ start: null, end: null });
    actions.setWithdrawalDateRange({ start: null, end: null });
    toast.info('Filtros restablecidos');
  };

  const confirmBulkRemove = () => {
    const confirm = window.confirm(`¿ESTÁS SEGURO DE RETIRAR ${state.selectedIds.size} ÍTEMS SELECCIONADOS? ESTA ACCIÓN NO SE PUEDE DESHACER.`);
    if (confirm) {
      actions.handleBulkRemove(state.selectedIds);
    }
  };

  const handlePrintSelected = () => {
    const selectedItems = state.processedScans.filter(item => state.selectedIds.has(item.id));
    if (selectedItems.length > 0) {
      handlePrintExpirations(selectedItems);
    } else {
      toast.error('No hay ítems seleccionados para imprimir');
    }
  };

  const handlePrintLabelsBulk = () => {
    const selectedItems = state.processedScans.filter(item => state.selectedIds.has(item.id));
    if (selectedItems.length > 0) {
      handlePrintLabels(selectedItems);
    } else {
      toast.error('No hay ítems seleccionados para imprimir etiquetas');
    }
  };

  const handleSendEmailBulk = () => {
    const selectedItems = state.processedScans.filter(item => state.selectedIds.has(item.id));
    if (selectedItems.length > 0) {
      handleSendEmail(selectedItems);
    } else {
      toast.error('No hay ítems seleccionados para enviar por correo');
    }
  };

  const confirmRemoveItem = (item: any) => {
    const confirm = window.confirm(`¿RETIRAR ${item.productName}? ESTA ACCIÓN ES IRREVERSIBLE.`);
    if (confirm) {
      actions.handleRemoveItem(item);
    }
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    toast.info(`Modo ${theme === 'dark' ? 'Claro' : 'Oscuro'} activado`);
  };

  const parentRef = useRef<HTMLDivElement>(null);
  const visibleItems = state.processedScans.slice(0, state.displayLimit);
  
  const rowVirtualizer = useVirtualizer({
    count: visibleItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => state.preferences.compactView ? 80 : 120,
    overscan: 5,
  });

  const handleSelectAllVisible = () => {
    const newSelected = new Set(state.selectedIds);
    visibleItems.forEach(item => newSelected.add(item.id));
    actions.setSelectedIds(newSelected);
  };

  return (
    <div className={`h-full flex flex-col overflow-hidden font-sans selection:bg-amber-500/30 transition-colors duration-500 ${
      theme === 'dark' ? 'bg-black text-white' : 'bg-stone-50 text-stone-900'
    }`}>
      {/* HEADER */}
      <div className={`p-4 md:p-6 pb-4 backdrop-blur-xl border-b shrink-0 transition-colors ${
        theme === 'dark' ? 'bg-slate-900/50 border-white/5' : 'bg-stone-50/80 border-stone-200 shadow-sm'
      }`}>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-lg transition-colors shrink-0 ${
              theme === 'dark' ? 'bg-amber-500/10 border-amber-500/20 shadow-amber-500/5' : 'bg-amber-50 border-amber-200 shadow-amber-500/10'
            }`}>
              <Calendar className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tighter italic leading-none">Control de Vencimientos</h1>
              <p className={`text-[10px] font-bold uppercase tracking-widest mt-1.5 flex items-center gap-2 ${
                theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
              }`}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                Monitoreo de Vida Útil y Retiros
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 no-scrollbar">
            {state.pendingOperations > 0 && (
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest animate-pulse ${
                theme === 'dark' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' : 'bg-amber-50 border-amber-200 text-amber-600'
              }`}>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Guardando ({state.pendingOperations})
              </div>
            )}
            <button 
              onClick={actions.handleSyncExpirations}
              disabled={state.isSyncing}
              className={`border px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all disabled:opacity-50 ${
                theme === 'dark' ? 'bg-white/5 hover:bg-white/10 border-white/10' : 'bg-slate-100 hover:bg-slate-200 border-slate-200'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 text-amber-500 ${state.isSyncing ? 'animate-spin' : ''}`} />
              {state.isSyncing ? 'Sincronizando...' : 'Sincronizar Nube'}
            </button>
            <button 
              onClick={() => handlePrintExpirations(state.processedScans)}
              className={`border px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${
                theme === 'dark' ? 'bg-white/5 hover:bg-white/10 border-white/10' : 'bg-slate-100 hover:bg-slate-200 border-slate-200'
              }`}
            >
              <Printer className="w-3.5 h-3.5 text-slate-400" />
              Imprimir
            </button>
            
            <button 
              onClick={toggleTheme}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all border ${
                theme === 'dark' 
                  ? 'bg-white/5 border-white/10 text-amber-400 hover:bg-white/10' 
                  : 'bg-slate-100 border-slate-200 text-amber-600 hover:bg-slate-200 shadow-sm'
              }`}
              title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            >
              {theme === 'dark' ? (
                <motion.div initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }}>
                  <Sun className="w-5 h-5" />
                </motion.div>
              ) : (
                <motion.div initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }}>
                  <Moon className="w-5 h-5" />
                </motion.div>
              )}
            </button>

            <button 
              onClick={() => setIsSettingsDrawerOpen(true)}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all border ${
                theme === 'dark' 
                  ? 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10' 
                  : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200 shadow-sm'
              }`}
              title="Preferencias de Vista"
            >
              <Settings2 className="w-5 h-5" />
            </button>

            <button 
              onClick={() => handleExportExpirationsCSV(state.processedScans)}
              className={`border px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${
                theme === 'dark' ? 'bg-white/5 hover:bg-white/10 border-white/10' : 'bg-slate-100 hover:bg-slate-200 border-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              Exportar CSV
            </button>
          </div>
        </div>

        <ExpiryStats 
          stats={state.stats} 
          selectedStatuses={state.selectedStatuses} 
          onStatusClick={(status) => {
            const expiryStatus = status as ExpiryStatus;
            const newStatuses = state.selectedStatuses.includes(expiryStatus)
              ? state.selectedStatuses.filter(s => s !== expiryStatus)
              : [...state.selectedStatuses, expiryStatus];
            actions.setSelectedStatuses(newStatuses);
          }}
          theme={theme}
        />
        
        <ExpirySearchBar 
          searchQuery={state.searchQuery}
          setSearchQuery={actions.setSearchQuery}
          onOpenFilters={() => setIsFilterDrawerOpen(true)}
          onOpenAdd={() => setIsAddModalOpen(true)}
          onClearFilters={handleClearFilters}
          activeFiltersCount={activeFiltersCount}
          theme={theme}
        />
      </div>

      {/* MAIN LIST */}
      <div ref={parentRef} className="flex-1 overflow-y-auto p-4 md:p-6 no-scrollbar pb-32">
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const item = visibleItems[virtualRow.index];
            return (
              <div
                key={item.id}
                ref={rowVirtualizer.measureElement}
                data-index={virtualRow.index}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start}px)`,
                  paddingBottom: '12px', // space-y-3 equivalent
                }}
              >
                <ExpiryItemCard 
                  item={item}
                  isSelected={state.selectedIds.has(item.id)}
                  isVerified={state.verifiedIds.has(item.id)}
                  onToggleSelect={handleToggleSelect}
                  onToggleVerified={handleToggleVerified}
                  onRemove={confirmRemoveItem}
                  onFilterProvider={(provider) => actions.setSearchQuery(provider)}
                  onFilterEstado={(estado) => actions.setSelectedEstado(estado)}
                  theme={theme}
                  isCompact={state.preferences.compactView}
                />
              </div>
            );
          })}
        </div>

        {state.processedScans.length > state.displayLimit && (
          <div className="flex justify-center py-8">
            <button
              onClick={() => actions.setDisplayLimit(prev => prev + 50)}
              className={`border px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3 group ${
                theme === 'dark' ? 'bg-white/5 hover:bg-white/10 border-white/10' : 'bg-white hover:bg-slate-50 border-slate-200 shadow-sm'
              }`}
            >
              <ChevronRight className="w-4 h-4 text-amber-500 group-hover:translate-x-1 transition-transform rotate-90" />
              Cargar más productos
              <span className="text-slate-500">({state.processedScans.length - state.displayLimit} restantes)</span>
            </button>
          </div>
        )}

        {state.processedScans.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 border transition-colors ${
              theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-slate-100 border-slate-200'
            }`}>
              <Calendar className={`w-10 h-10 ${theme === 'dark' ? 'text-slate-700' : 'text-slate-300'}`} />
            </div>
            <h3 className={`text-lg font-black uppercase tracking-tighter italic ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Sin registros</h3>
            <p className={`text-[10px] font-bold uppercase tracking-widest max-w-[200px] mt-2 ${theme === 'dark' ? 'text-slate-600' : 'text-slate-400'}`}>
              No se encontraron productos con fecha de vencimiento registrada.
            </p>
          </div>
        )}
      </div>

      {/* FOOTER INFO */}
      <div className={`p-4 backdrop-blur-xl border-t flex justify-between items-center shrink-0 transition-colors ${
        theme === 'dark' ? 'bg-slate-900/80 border-white/5' : 'bg-white/90 border-slate-200 shadow-[0_-2px_10px_rgba(0,0,0,0.02)]'
      }`}>
        <div className="flex flex-col">
          <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Total Monitoreado</span>
          <span className={`text-sm font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{state.stats.total} SKUs</span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Última Sincronización</span>
          <span className={`text-sm font-black uppercase italic tracking-tighter ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{format(new Date(), 'HH:mm:ss')}</span>
        </div>
      </div>

      {/* OVERLAYS */}
      <ExpiryFilterDrawer 
        isOpen={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        selectedStatuses={state.selectedStatuses}
        setSelectedStatuses={actions.setSelectedStatuses}
        selectedCanje={state.selectedCanje}
        setSelectedCanje={actions.setSelectedCanje}
        categories={state.categories}
        selectedCategories={state.selectedCategories}
        setSelectedCategories={actions.setSelectedCategories}
        dateRange={state.dateRange}
        setDateRange={actions.setDateRange}
        withdrawalDateRange={state.withdrawalDateRange}
        setWithdrawalDateRange={actions.setWithdrawalDateRange}
        theme={theme}
      />

      <ExpiryBulkActions 
        selectedCount={state.selectedIds.size}
        onClearSelection={() => actions.setSelectedIds(new Set())}
        onBulkRemove={confirmBulkRemove}
        onPrintSelected={handlePrintSelected}
        onPrintLabels={handlePrintLabelsBulk}
        onSendEmail={handleSendEmailBulk}
        onSelectAllVisible={handleSelectAllVisible}
        theme={theme}
      />

      <ExpirySettingsDrawer 
        isOpen={isSettingsDrawerOpen}
        onClose={() => setIsSettingsDrawerOpen(false)}
        preferences={state.preferences}
        onUpdatePreferences={actions.handleUpdatePreferences}
        theme={theme}
      />

      <ExpiryAddModal 
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={actions.handleAddItem}
        theme={theme}
      />
    </div>
  );
};

export default ExpiryManagementPage;
