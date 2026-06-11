import React, { useRef } from 'react';
import { Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { VirtualList } from '../../shared/components/ui/VirtualList';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAppStore } from '../../store/mainAppStore';
import { productRepository } from '../../repositories/DexieProductRepository';

// Hooks & state
import { useExpiryUI } from './hooks/useExpiryUI';

// Lego Components
import { ExpiryItemCard } from './components/ExpiryItemCard';
import { ExpiryItemRow } from './components/ExpiryItemRow';
import { ExpiryHeader } from './components/ExpiryHeader';
import { ExpiryOverlays } from './components/ExpiryOverlays';

// Utils
import { normalizeSku } from '../../services/utils';

const ExpiryManagementRow = React.memo(({ index, item, data }: any) => {
  const { ui, state, actions, dbActions, settings } = data;
  return (
    <div className="h-full pb-3">
      {ui.viewMode === 'table' ? (
        <ExpiryItemRow 
          item={item}
          isSelected={state.selectedIds.has(item.id)}
          onToggleSelect={actions.handleToggleSelect}
          onRemove={actions.confirmRemoveItem}
          onOpenDetail={actions.handleOpenDetail}
          onEdit={actions.handleEdit}
          theme={settings.theme}
        />
      ) : (
        <ExpiryItemCard 
          item={item}
          isSelected={state.selectedIds.has(item.id)}
          onToggleSelect={actions.handleToggleSelect}
          onRemove={actions.confirmRemoveItem}
          onOpenDetail={actions.handleOpenDetail}
          onEdit={actions.handleEdit}
          onFilterProvider={(provider: string) => dbActions.setSearchQuery(provider)}
          onFilterEstado={(estado: string) => dbActions.setSearchQuery(estado)}
          onFilterFrc={(frc: string) => dbActions.setSearchQuery(frc)}
          theme={settings.theme}
          isCompact={state.preferences.compactView}
        />
      )}
    </div>
  );
});
ExpiryManagementRow.displayName = 'ExpiryManagementRow';

const ExpiryManagementPage: React.FC = () => {
  const { ui, actions, db } = useExpiryUI();
  const { state, actions: dbActions } = db;
  const { settings } = useAppStore();
  const navigate = useNavigate();
  
  // Total identification engine
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
  
  const rowData = React.useMemo(() => ({ ui, state, actions, dbActions, settings }), [ui.viewMode, state.selectedIds, state.preferences.compactView, actions, dbActions, settings.theme]);
  const itemHeight = ui.viewMode === 'table' ? 60 : (state.preferences.compactView ? 92 : 132);

  return (
    <div className={`h-full flex flex-col overflow-hidden font-sans selection:bg-brand-warning/30 transition-colors duration-500 ${
      settings.theme === 'dark' ? 'bg-brand-dark text-white' : 'bg-stone-200/50 text-stone-900'
    }`}>
      {/* Decoupled Lego Header */}
      <ExpiryHeader
        ui={ui}
        state={state}
        actions={actions}
        dbActions={dbActions}
        settings={settings}
        navigate={navigate}
      />

      {/* Main Virtuallist Container */}
      <div ref={parentRef} className={`flex-1 min-h-0 p-4 md:p-6 no-scrollbar pb-32 transition-colors ${
        settings.theme === 'dark' ? 'bg-slate-950/60' : 'bg-stone-100/80'
      }`}>
        <VirtualList
          items={allItems}
          itemHeight={itemHeight}
          renderRow={ExpiryManagementRow}
          rowData={rowData}
          emptyState={
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 border transition-colors ${
                settings.theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-slate-100 border-slate-200'
              }`}>
                <Calendar className={`w-10 h-10 ${settings.theme === 'dark' ? 'text-slate-700' : 'text-slate-300'}`} />
              </div>
              <h3 className={`text-lg font-black uppercase tracking-tighter italic ${settings.theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Sin registros</h3>
              <p className={`text-[10px] font-bold uppercase tracking-widest max-w-[200px] mt-2 ${settings.theme === 'dark' ? 'text-slate-600' : 'text-slate-400'}`}>
                No se encontraron productos con fecha de vencimiento registrada.
              </p>
            </div>
          }
        />
      </div>

      {/* Footer Info bar */}
      <div className={`p-4 backdrop-blur-xl border-t flex justify-between items-center shrink-0 transition-colors ${
        settings.theme === 'dark' ? 'bg-brand-surface/80 border-white/5' : 'bg-white/90 border-slate-200 shadow-[0_-2px_10px_rgba(0,0,0,0.02)]'
      }`}>
        <div className="flex flex-col">
          <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Total Monitoreado</span>
          <span className={`text-sm font-black ${settings.theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{state.stats.total} SKUs</span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Última Sincronización</span>
          <span className={`text-sm font-black uppercase italic tracking-tighter ${settings.theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{format(new Date(), 'HH:mm:ss')}</span>
        </div>
      </div>

      {/* Decoupled Lego Overlays */}
      <ExpiryOverlays
        ui={ui}
        actions={actions}
        dbActions={dbActions}
        state={state}
        settings={settings}
        productMap={productMap}
      />
    </div>
  );
};

export default ExpiryManagementPage;
