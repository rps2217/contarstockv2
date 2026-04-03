
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
  Plus,
  ChevronDown,
  ChevronUp,
  Zap,
  AlertCircle,
  X
} from 'lucide-react';
import { format } from 'date-fns';
import { useToastStore } from '../../store/useToastStore';
import { motion, AnimatePresence } from 'motion/react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { toast as sonnerToast } from 'sonner';
import { useLiveQuery } from 'dexie-react-hooks';
import { productRepository } from '../../repositories/DexieProductRepository';
import { DynamicForm } from '../../components/DynamicForm';
import { useAppStore } from '../../store/useAppStore';

// Hooks
import { useExpiryDatabase, ExpiryStatus } from './hooks/useExpiryDatabase';

// Components
import { ExpiryStats } from './components/ExpiryStats';
import { ExpiryFilterDrawer } from './components/ExpiryFilterDrawer';
import { ExpirySettingsDrawer } from './components/ExpirySettingsDrawer';
import { ExpirySearchBar } from './components/ExpirySearchBar';
import { ExpiryItemCard } from './components/ExpiryItemCard';
import { ExpiryBulkActions } from './components/ExpiryBulkActions';
import { ExpiryEmailModal } from './components/ExpiryEmailModal';
import { ExpiryPriorityPanel } from './components/ExpiryPriorityPanel';
import { ExpirationModal } from './components/ExpirationModal';
import { useProductDatabase } from '../inventory/hooks/useProductDatabase';

// Utils
import { handlePrintExpirations, handlePrintLabels, handleExportExpirationsCSV } from './utils/expiryUtils';
import { normalizeSku } from '../../services/utils';

const ExpiryManagementPage: React.FC = () => {
  const { addToast } = useToastStore.getState();
  const { state, actions } = useExpiryDatabase();
  const { state: { products: visibleProducts } } = useProductDatabase();
  
  // MOTOR DE IDENTIFICACIÓN TOTAL: Obtiene el catálogo completo sin límites de 200
  const productMap = useLiveQuery(async () => {
    const allProducts = await productRepository.getAll();
    const map: Record<string, any> = {};
    allProducts.forEach(p => {
      const sku = normalizeSku(p.barcode);
      if (sku) map[sku] = p;
    });
    return map;
  }, []);

  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [isSettingsDrawerOpen, setIsSettingsDrawerOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isPriorityPanelOpen, setIsPriorityPanelOpen] = useState(false);
  const [isDesktopAddModalOpen, setIsDesktopAddModalOpen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const navigate = useNavigate();
  const location = useLocation();
  const expirySchema = useAppStore(s => s.settings.appSheetConfig?.schema?.expiry || s.settings.schema?.expiry);

  const handleOpenAdd = () => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
    if (isMobile) {
      navigate('/expiry/capture');
    } else {
      setIsDesktopAddModalOpen(true);
    }
  };

  // Detect mobile device and redirect to capture view automatically
  useEffect(() => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
    const preventRedirect = (location.state as any)?.preventAutoRedirect;
    
    if (isMobile && !preventRedirect) {
      navigate('/expiry/capture', { replace: true });
    }
  }, [navigate, location]);

  // Atajo de teclado Alt+E para ir a Eventos
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        navigate('/events');
        sonnerToast.info('Navegando a Control de Eventos');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  const activeFiltersCount = 
    state.selectedStatuses.length + 
    state.selectedCategories.length + 
    (state.selectedCanje !== 'all' ? 1 : 0) +
    (state.actionPeriod !== 'all' ? 1 : 0) +
    (state.customDateRange.start || state.customDateRange.end ? 1 : 0);

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

  const handleSelectItemFromPriority = (id: string) => {
    actions.setSearchQuery('');
    handleClearFilters();
    // Small delay to allow filters to clear
    setTimeout(() => {
      const element = document.getElementById(`expiry-item-${id}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('ring-2', 'ring-amber-500', 'ring-offset-2', 'ring-offset-slate-900');
        setTimeout(() => {
          element.classList.remove('ring-2', 'ring-amber-500', 'ring-offset-2', 'ring-offset-slate-900');
        }, 3000);
      }
    }, 100);
  };

  const handleClearFilters = () => {
    actions.setSearchQuery('');
    actions.setSelectedStatuses([]);
    actions.setSelectedCategories([]);
    actions.setSelectedCanje('all');
    actions.setActionPeriod('all');
    actions.setCustomDateRange({ start: null, end: null });
    addToast('Filtros restablecidos', 'info');
  };

  const handleActionClick = (type: string) => {
    handleClearFilters();
    if (type === 'merma') {
      actions.setSelectedCanje('markdown');
      actions.setSelectedStatuses(['critical', 'expired']);
      addToast('Filtrando por Merma (Crítico/Vencido)', 'info');
    } else if (type === 'canje') {
      actions.setSelectedCanje('canje');
      actions.setSelectedStatuses(['critical', 'expired']);
      addToast('Filtrando por Canje (Crítico/Vencido)', 'info');
    } else if (type === 'drenaje') {
      actions.setSelectedCanje('markdown');
      actions.setSelectedStatuses(['next_expiry']);
      addToast('Plan de Drenaje: Próximos 4 meses sin canje', 'info');
    } else if (type === 'impulso') {
      actions.setSelectedCanje('canje');
      actions.setSelectedStatuses(['next_expiry']);
      addToast('Impulso de Ventas: Próximos 4 meses con canje', 'info');
    } else if (type === 'monitor') {
      actions.setSelectedStatuses(['next_expiry']);
      addToast('Filtrando por Próximos a Vencer', 'info');
    }
    
    // Scroll to list
    setTimeout(() => {
      parentRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const confirmBulkRemove = () => {
    const confirm = window.confirm(`¿ESTÁS SEGURO DE RETIRAR ${state.selectedIds.size} ÍTEMS SELECCIONADOS? ESTA ACCIÓN NO SE PUEDE DESHACER.`);
    if (confirm) {
      actions.handleBulkRemove(state.selectedIds);
    }
  };

  const handlePrintSelected = () => {
    const selectedItems = state.allItems.filter(item => state.selectedIds.has(item.id));
    if (selectedItems.length > 0) {
      handlePrintExpirations(selectedItems);
    } else {
      addToast('No hay ítems seleccionados para imprimir', 'error');
    }
  };

  const handlePrintLabelsBulk = () => {
    const selectedItems = state.allItems.filter(item => state.selectedIds.has(item.id));
    if (selectedItems.length > 0) {
      handlePrintLabels(selectedItems);
    } else {
      addToast('No hay ítems seleccionados para imprimir etiquetas', 'error');
    }
  };

  const handleSendEmailBulk = () => {
    const selectedItems = state.allItems.filter(item => state.selectedIds.has(item.id));
    if (selectedItems.length > 0) {
      setIsEmailModalOpen(true);
    } else {
      addToast('No hay ítems seleccionados para enviar por correo', 'error');
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
    addToast(`Modo ${theme === 'dark' ? 'Claro' : 'Oscuro'} activado`, 'info');
  };

  const parentRef = useRef<HTMLDivElement>(null);
  const allItems = state.processedScans;
  
  const rowVirtualizer = useVirtualizer({
    count: allItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => state.preferences.compactView ? 80 : 120,
    overscan: 5,
  });

  const handleSelectAllVisible = () => {
    const newSelected = new Set(state.selectedIds);
    allItems.forEach(item => newSelected.add(item.id));
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
            <button 
              onClick={() => navigate('/events')}
              className={`border px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${
                theme === 'dark' 
                  ? 'bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/20 text-blue-500' 
                  : 'bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-600 shadow-sm'
              }`}
              title="Ir a Control de Eventos (Alt+E)"
            >
              <AlertCircle className="w-3.5 h-3.5" />
              Eventos
            </button>

            <button 
              onClick={actions.handleSyncExpirations}
              disabled={state.isSyncing}
              className={`border px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all disabled:opacity-50 ${
                state.isSyncing
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)] animate-pulse'
                  : theme === 'dark' ? 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-400' 
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${ state.isSyncing ? 'animate-spin text-amber-500' : 'text-slate-500' }`} />
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

        {/* PRIORITY ASSISTANT (BENTO PANEL) - HIDDEN BEHIND TOGGLE */}
        {state.preferences.showPriorityAssistant && (
          <div className="mt-6 mb-6">
            <button
              onClick={() => setIsPriorityPanelOpen(!isPriorityPanelOpen)}
              className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${
                theme === 'dark' 
                  ? 'bg-slate-900/50 border-white/10 hover:bg-white/5' 
                  : 'bg-white border-slate-200 shadow-sm hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  theme === 'dark' ? 'bg-amber-500/10 text-amber-500' : 'bg-amber-100 text-amber-600'
                }`}>
                  <Zap className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <h3 className={`text-sm font-black uppercase tracking-tighter italic leading-none ${
                    theme === 'dark' ? 'text-white' : 'text-slate-900'
                  }`}>
                    Asistente de Priorización
                  </h3>
                  <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${
                    theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                  }`}>
                    Análisis de riesgo y alertas de volumen
                  </p>
                </div>
              </div>
              {isPriorityPanelOpen ? (
                <ChevronUp className={`w-5 h-5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`} />
              ) : (
                <ChevronDown className={`w-5 h-5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`} />
              )}
            </button>

            <AnimatePresence>
              {isPriorityPanelOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="pt-4">
                    <ExpiryPriorityPanel 
                      stats={state.stats} 
                      theme={theme} 
                      onSelectItem={handleSelectItemFromPriority}
                      onActionClick={handleActionClick}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
        
        <ExpirySearchBar 
          searchQuery={state.searchQuery}
          setSearchQuery={actions.setSearchQuery}
          onOpenFilters={() => setIsFilterDrawerOpen(true)}
          onOpenAdd={handleOpenAdd}
          onClearFilters={handleClearFilters}
          activeFiltersCount={activeFiltersCount}
          theme={theme}
        />

        {/* QUICK FILTER PILLS */}
        <div className="flex items-center gap-2 mt-4 overflow-x-auto no-scrollbar pb-2">
          <button
            onClick={() => handleActionClick('monitor')}
            className={`px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${
              state.selectedStatuses.includes('next_expiry') && state.selectedStatuses.length === 1 && state.selectedCanje === 'all'
                ? 'bg-blue-500 border-blue-400 text-white shadow-md shadow-blue-500/20'
                : theme === 'dark'
                  ? 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            Próximos a Vencer
          </button>
          <button
            onClick={() => handleActionClick('merma')}
            className={`px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${
              state.selectedCanje === 'markdown' && state.selectedStatuses.includes('critical')
                ? 'bg-rose-500 border-rose-400 text-white shadow-md shadow-rose-500/20'
                : theme === 'dark'
                  ? 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            Merma Crítica
          </button>
          <button
            onClick={() => handleActionClick('canje')}
            className={`px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${
              state.selectedCanje === 'canje' && state.selectedStatuses.includes('critical')
                ? 'bg-amber-500 border-amber-400 text-black shadow-md shadow-amber-500/20'
                : theme === 'dark'
                  ? 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            Canjes Urgentes
          </button>
          <button
            onClick={() => {
              handleClearFilters();
              actions.setActionPeriod('this_month');
            }}
            className={`px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${
              state.actionPeriod === 'this_month'
                ? 'bg-emerald-500 border-emerald-400 text-white shadow-md shadow-emerald-500/20'
                : theme === 'dark'
                  ? 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            Retiros Este Mes
          </button>
        </div>
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
                <ExpiryItemCard 
                  item={item}
                  isSelected={state.selectedIds.has(item.id)}
                  isVerified={state.verifiedIds.has(item.id)}
                  onToggleSelect={handleToggleSelect}
                  onToggleVerified={handleToggleVerified}
                  onRemove={confirmRemoveItem}
                  onFilterProvider={(provider) => actions.setSearchQuery(provider)}
                  onFilterEstado={(estado) => actions.setSearchQuery(estado)}
                  onFilterFrc={(frc) => actions.setSearchQuery(frc)}
                  theme={theme}
                  isCompact={state.preferences.compactView}
                />
              </div>
            );
          })}
        </div>

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
        actionPeriod={state.actionPeriod}
        setActionPeriod={actions.setActionPeriod}
        customDateRange={state.customDateRange}
        setCustomDateRange={actions.setCustomDateRange}
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
        onClearLocalData={actions.clearLocalData}
        theme={theme}
      />

      <ExpiryEmailModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        selectedItems={state.allItems.filter(item => state.selectedIds.has(item.id))}
        theme={theme}
      />

      <AnimatePresence>
        {isDesktopAddModalOpen && (
          <ExpirationModal 
            productMap={productMap}
            onCancel={() => setIsDesktopAddModalOpen(false)}
            onComplete={(data) => {
              // CIERRE INMEDIATO PARA UI OPTIMISTA
              setIsDesktopAddModalOpen(false);
              
              actions.handleAddItem({
                barcode: data.barcode,
                productName: data.productName,
                mm: data.mm,
                yyyy: data.yyyy,
                quantity: 1, // Default to 1 as requested
                fechaCC: `${String(data.mm).padStart(2, '0')}/${data.yyyy}`
              });
              
              sonnerToast.success('Registrando vencimiento...');
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default ExpiryManagementPage;
