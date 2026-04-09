
import React, { useRef } from 'react';
import { 
  Printer,
  FileText,
  Calendar,
  Sun,
  Moon,
  Settings2,
  AlertCircle,
  LayoutGrid,
  List,
  Cloud
} from 'lucide-react';
import { format, addMonths, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useLiveQuery } from 'dexie-react-hooks';
import { productRepository } from '../../repositories/DexieProductRepository';

// Hooks
import { ExpiryStatus } from './hooks/useExpiryDatabase';
import { useExpiryUI } from './hooks/useExpiryUI';

// Components
import { ExpiryStats } from './components/ExpiryStats';
import { ExpiryFilterDrawer } from './components/ExpiryFilterDrawer';
import { ExpirySettingsDrawer } from './components/ExpirySettingsDrawer';
import { ExpirySearchBar } from './components/ExpirySearchBar';
import { ExpiryItemCard } from './components/ExpiryItemCard';
import { ExpiryItemRow } from './components/ExpiryItemRow';
import { ExpiryBulkActions } from './components/ExpiryBulkActions';
import { ExpiryEmailModal } from './components/ExpiryEmailModal';
import { ExpirationModal } from './components/ExpirationModal';

// Utils
import { handlePrintExpirations, handleExportExpirationsCSV } from './utils/expiryUtils';
import { normalizeSku } from '../../services/utils';

const ExpiryManagementPage: React.FC = () => {
  const { ui, actions, db } = useExpiryUI();
  const { state, actions: dbActions } = db;
  const navigate = useNavigate();
  
  // MOTOR DE IDENTIFICACIÓN TOTAL
  const productMap = useLiveQuery(async () => {
    const allProducts = await productRepository.getAll();
    const map: Record<string, any> = {};
    allProducts.forEach(p => {
      const sku = normalizeSku(p.barcode);
      if (sku) map[sku] = p;
    });
    return map;
  }, []);

  const parentRef = useRef<HTMLDivElement>(null);
  const allItems = state.processedScans;
  
  const rowVirtualizer = useVirtualizer({
    count: allItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ui.viewMode === 'table' ? 48 : (state.preferences.compactView ? 80 : 120),
    overscan: 5,
  });

  return (
    <div className={`h-full flex flex-col overflow-hidden font-sans selection:bg-brand-warning/30 transition-colors duration-500 ${
      ui.theme === 'dark' ? 'bg-brand-dark text-white' : 'bg-stone-200/50 text-stone-900'
    }`}>
      {/* HEADER */}
      <div className={`p-4 md:p-6 pb-4 backdrop-blur-xl border-b shrink-0 transition-colors ${
        ui.theme === 'dark' ? 'bg-slate-950/40 border-white/5' : 'bg-stone-50/80 border-stone-200 shadow-sm'
      }`}>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-lg transition-colors shrink-0 ${
              ui.theme === 'dark' ? 'bg-amber-500/10 border-amber-500/20 shadow-amber-500/5' : 'bg-amber-50 border-amber-200 shadow-amber-500/10'
            }`}>
              <Calendar className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tighter italic leading-none">Control de Vencimientos</h1>
              <p className={`text-[10px] font-bold uppercase tracking-widest mt-1.5 flex items-center gap-2 ${
                ui.theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
              }`}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                Monitoreo de Vida Útil y Retiros
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 no-scrollbar">
            <button 
              onClick={() => navigate('/events')}
              className={`border px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${
                ui.theme === 'dark' 
                  ? 'bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/20 text-blue-500' 
                  : 'bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-600 shadow-sm'
              }`}
              title="Ir a Control de Eventos (Alt+E)"
            >
              <AlertCircle className="w-3.5 h-3.5" />
              Eventos
            </button>

            <button 
              onClick={() => handlePrintExpirations(state.processedScans)}
              className={`border px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${
                ui.theme === 'dark' ? 'bg-white/5 hover:bg-white/10 border-white/10' : 'bg-slate-100 hover:bg-slate-200 border-slate-200'
              }`}
            >
              <Printer className="w-3.5 h-3.5 text-slate-400" />
              Imprimir
            </button>
            
            <button 
              onClick={actions.toggleTheme}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all border ${
                ui.theme === 'dark' 
                  ? 'bg-white/5 border-white/10 text-amber-400 hover:bg-white/10' 
                  : 'bg-slate-100 border-slate-200 text-amber-600 hover:bg-slate-200 shadow-sm'
              }`}
              title={ui.theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            >
              {ui.theme === 'dark' ? (
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
              onClick={() => ui.setIsSettingsDrawerOpen(true)}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all border ${
                ui.theme === 'dark' 
                  ? 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10' 
                  : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200 shadow-sm'
              }`}
              title="Preferencias de Vista"
            >
              <Settings2 className="w-5 h-5" />
            </button>

            <div className={`flex items-center p-1 rounded-xl border ${
              ui.theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-slate-100 border-slate-200'
            }`}>
              <button
                onClick={() => ui.setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-all ${
                  ui.viewMode === 'grid' 
                    ? 'bg-amber-500 text-black shadow-sm' 
                    : 'text-slate-500 hover:text-slate-300'
                }`}
                title="Vista Cuadrícula"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => ui.setViewMode('table')}
                className={`p-1.5 rounded-lg transition-all ${
                  ui.viewMode === 'table' 
                    ? 'bg-amber-500 text-black shadow-sm' 
                    : 'text-slate-500 hover:text-slate-300'
                }`}
                title="Vista Tabla"
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            <div className={`border px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${
              state.isSyncing 
                ? ui.theme === 'dark' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-600'
                : ui.theme === 'dark' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-emerald-50 border-emerald-200 text-emerald-600 shadow-sm'
            }`}>
              <Cloud className={`w-3.5 h-3.5 ${state.isSyncing ? 'animate-bounce' : ''}`} />
              {state.isSyncing ? 'Sincronizando...' : 'Nube Sincronizada'}
            </div>

            <button 
              onClick={() => handleExportExpirationsCSV(state.processedScans)}
              className={`border px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${
                ui.theme === 'dark' ? 'bg-white/5 hover:bg-white/10 border-white/10' : 'bg-slate-100 hover:bg-slate-200 border-slate-200'
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
            dbActions.setSelectedStatuses(newStatuses);
          }}
          theme={ui.theme}
        />
        
        <ExpirySearchBar 
          searchQuery={state.searchQuery}
          setSearchQuery={dbActions.setSearchQuery}
          onOpenFilters={() => ui.setIsFilterDrawerOpen(true)}
          onOpenAdd={actions.handleOpenAdd}
          onClearFilters={actions.handleClearFilters}
          activeFiltersCount={ui.activeFiltersCount}
          theme={ui.theme}
        />

        {/* QUICK FILTER PILLS */}
        <div className="flex items-center gap-2 mt-4 overflow-x-auto no-scrollbar pb-2">
          {Array.from({ length: 4 }).map((_, i) => {
            const date = addMonths(new Date(), i);
            const monthName = format(date, 'MMMM', { locale: es });
            
            return (
              <button
                key={i}
                onClick={() => {
                  actions.handleClearFilters();
                  dbActions.setActionPeriod('custom');
                  dbActions.setCustomDateRange({ start: startOfMonth(date), end: endOfMonth(date) });
                }}
                className={`px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${
                  state.actionPeriod === 'custom' && 
                  state.customDateRange.start?.getMonth() === date.getMonth() &&
                  state.customDateRange.start?.getFullYear() === date.getFullYear()
                    ? 'bg-amber-500 border-amber-400 text-black shadow-md shadow-amber-500/20'
                    : ui.theme === 'dark'
                      ? 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {monthName}
              </button>
            );
          })}
        </div>
      </div>

      {/* MAIN LIST */}
      <div ref={parentRef} className={`flex-1 overflow-y-auto p-4 md:p-6 no-scrollbar pb-32 transition-colors ${
        ui.theme === 'dark' ? 'bg-slate-950/60' : 'bg-stone-100/80'
      }`}>
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const item = allItems[virtualRow.index];
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
                {ui.viewMode === 'table' ? (
                  <ExpiryItemRow 
                    item={item}
                    isSelected={state.selectedIds.has(item.id)}
                    onToggleSelect={actions.handleToggleSelect}
                    onRemove={actions.confirmRemoveItem}
                    theme={ui.theme}
                  />
                ) : (
                  <ExpiryItemCard 
                    item={item}
                    isSelected={state.selectedIds.has(item.id)}
                    onToggleSelect={actions.handleToggleSelect}
                    onRemove={actions.confirmRemoveItem}
                    onFilterProvider={(provider) => dbActions.setSearchQuery(provider)}
                    onFilterEstado={(estado) => dbActions.setSearchQuery(estado)}
                    onFilterFrc={(frc) => dbActions.setSearchQuery(frc)}
                    theme={ui.theme}
                    isCompact={state.preferences.compactView}
                  />
                )}
              </div>
            );
          })}
        </div>

        {state.processedScans.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 border transition-colors ${
              ui.theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-slate-100 border-slate-200'
            }`}>
              <Calendar className={`w-10 h-10 ${ui.theme === 'dark' ? 'text-slate-700' : 'text-slate-300'}`} />
            </div>
            <h3 className={`text-lg font-black uppercase tracking-tighter italic ${ui.theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Sin registros</h3>
            <p className={`text-[10px] font-bold uppercase tracking-widest max-w-[200px] mt-2 ${ui.theme === 'dark' ? 'text-slate-600' : 'text-slate-400'}`}>
              No se encontraron productos con fecha de vencimiento registrada.
            </p>
          </div>
        )}
      </div>

      {/* FOOTER INFO */}
      <div className={`p-4 backdrop-blur-xl border-t flex justify-between items-center shrink-0 transition-colors ${
        ui.theme === 'dark' ? 'bg-brand-surface/80 border-white/5' : 'bg-white/90 border-slate-200 shadow-[0_-2px_10px_rgba(0,0,0,0.02)]'
      }`}>
        <div className="flex flex-col">
          <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Total Monitoreado</span>
          <span className={`text-sm font-black ${ui.theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{state.stats.total} SKUs</span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Última Sincronización</span>
          <span className={`text-sm font-black uppercase italic tracking-tighter ${ui.theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{format(new Date(), 'HH:mm:ss')}</span>
        </div>
      </div>

      {/* OVERLAYS */}
      <ExpiryFilterDrawer 
        isOpen={ui.isFilterDrawerOpen}
        onClose={() => ui.setIsFilterDrawerOpen(false)}
        selectedStatuses={state.selectedStatuses}
        setSelectedStatuses={dbActions.setSelectedStatuses}
        selectedCanje={state.selectedCanje}
        setSelectedCanje={dbActions.setSelectedCanje}
        categories={state.categories}
        selectedCategories={state.selectedCategories}
        setSelectedCategories={dbActions.setSelectedCategories}
        actionPeriod={state.actionPeriod}
        setActionPeriod={dbActions.setActionPeriod}
        customDateRange={state.customDateRange}
        setCustomDateRange={dbActions.setCustomDateRange}
        creationDateRange={state.creationDateRange}
        setCreationDateRange={dbActions.setCreationDateRange}
        theme={ui.theme}
      />

      <ExpiryBulkActions 
        selectedCount={state.selectedIds.size}
        onClearSelection={() => dbActions.setSelectedIds(new Set())}
        onBulkRemove={actions.confirmBulkRemove}
        onPrintSelected={actions.handlePrintSelected}
        onPrintLabels={actions.handlePrintLabelsBulk}
        onSendEmail={actions.handleSendEmailBulk}
        onSelectAllVisible={actions.handleSelectAllVisible}
        theme={ui.theme}
      />

      <ExpirySettingsDrawer 
        isOpen={ui.isSettingsDrawerOpen}
        onClose={() => ui.setIsSettingsDrawerOpen(false)}
        preferences={state.preferences}
        onUpdatePreferences={dbActions.handleUpdatePreferences}
        onClearLocalData={dbActions.clearLocalData}
        theme={ui.theme}
      />

      <ExpiryEmailModal
        isOpen={ui.isEmailModalOpen}
        onClose={() => ui.setIsEmailModalOpen(false)}
        selectedItems={state.allItems.filter(item => state.selectedIds.has(item.id))}
        theme={ui.theme}
      />

      <AnimatePresence>
        {ui.isDesktopAddModalOpen && (
          <ExpirationModal 
            productMap={productMap}
            initialBarcode={ui.initialBarcode}
            onCancel={() => {
              ui.setIsDesktopAddModalOpen(false);
              ui.setInitialBarcode('');
            }}
            onComplete={(data) => {
              // CIERRE INMEDIATO PARA UI OPTIMISTA
              ui.setIsDesktopAddModalOpen(false);
              
              dbActions.handleAddItem({
                barcode: data.barcode,
                productName: data.productName,
                mm: data.mm,
                yyyy: data.yyyy,
                quantity: 1, // Default to 1 as requested
                fechaCC: `${String(data.mm).padStart(2, '0')}/${data.yyyy}`
              });
              
              toast.success('Registrando vencimiento...');
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default ExpiryManagementPage;

// Forced GitHub sync
