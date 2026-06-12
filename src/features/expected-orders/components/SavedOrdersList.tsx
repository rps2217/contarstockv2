import React, { useState, useMemo } from 'react';
import { FileText, Calendar, Trash2, Search, ArrowRight, Expand, ChevronDown, ChevronUp, Package, Layers, Info, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ExpectedOrder, ExpectedItem } from '../../../types';
import { VirtualList } from '../../../shared/components/ui/VirtualList';

interface SavedOrdersListProps {
  state: any;
  actions: any;
  isDark: boolean;
}

// Sub-row component for list expansion
const ExpandedItemRow: React.FC<{ index: number; item: ExpectedItem; data: any; style?: React.CSSProperties }> = React.memo(({ index, item, data, style }) => {
  const isDark = data.isDark;
  return (
    <div 
      style={style}
      className={`px-4 py-2.5 flex items-center justify-between border-b text-[11px] font-bold ${
        isDark ? 'border-white/5 hover:bg-white/2' : 'border-slate-100 hover:bg-slate-50'
      }`}
    >
      <div className="flex items-center gap-3 truncate min-w-0">
        <span className={`text-[9px] font-mono leading-none border px-1.5 py-0.5 rounded ${
          isDark ? 'border-white/10 text-slate-500 bg-slate-900' : 'border-slate-200 text-slate-400 bg-slate-50'
        }`}>
          {index + 1}
        </span>
        <div className="truncate min-w-0">
          <p className={`truncate ${isDark ? 'text-white' : 'text-slate-800'}`}>{item.name}</p>
          <span className={`text-[9px] font-mono tracking-wider block leading-none opacity-60 mt-0.5`}>{item.barcode}</span>
        </div>
      </div>
      <div className="text-right shrink-0">
        <span className={`text-xs font-black ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>{item.expectedQty}</span>
        <span className="opacity-40 block text-[8px] uppercase tracking-wider font-extrabold mt-0.5">Esperado</span>
      </div>
    </div>
  );
});

ExpandedItemRow.displayName = 'SavedOrderExpandedItemRow';

export const SavedOrdersList: React.FC<SavedOrdersListProps> = ({ state, actions, isDark }) => {
  const { savedOrders } = state;
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [itemQuery, setItemQuery] = useState('');

  // Filter orders by ID or metadata
  const filteredOrders = useMemo(() => {
    if (!searchTerm.trim()) return savedOrders;
    const term = searchTerm.toLowerCase();
    return savedOrders.filter((order: ExpectedOrder) => 
      order.id.toLowerCase().includes(term) ||
      order.metadata?.purchaseOrder?.toLowerCase().includes(term) ||
      order.metadata?.orderNote?.toLowerCase().includes(term)
    );
  }, [savedOrders, searchTerm]);

  // Handle row expansion
  const toggleRow = (orderId: string) => {
    if (expandedOrderId === orderId) {
      setExpandedOrderId(null);
    } else {
      setExpandedOrderId(orderId);
      setItemQuery('');
    }
  };

  // Get active expanded order items filtered by barcode or name
  const expandedOrder = useMemo(() => {
    return savedOrders.find((o: ExpectedOrder) => o.id === expandedOrderId) || null;
  }, [expandedOrderId, savedOrders]);

  const filteredExpandedItems = useMemo(() => {
    if (!expandedOrder) return [];
    if (!itemQuery.trim()) return expandedOrder.items;
    const term = itemQuery.toLowerCase();
    return expandedOrder.items.filter((item: ExpectedItem) =>
      item.barcode.includes(term) || item.name.toLowerCase().includes(term)
    );
  }, [expandedOrder, itemQuery]);

  return (
    <div className="space-y-6">
      {/* SEARCH AND CAPTURE ACTIONS PANEL */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Buscar por ID de Documento, Folio u O. Compra..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-10 pr-4 py-3 rounded-2xl text-xs font-bold transition-all border ${
              isDark 
                ? 'bg-slate-900 border-white/5 text-white focus:border-blue-500' 
                : 'bg-white border-slate-200 text-slate-800 shadow-sm focus:border-blue-600'
            }`}
          />
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
        </div>

        {/* Action Button */}
        <button
          onClick={() => actions.setActiveStep('import')}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-blue-500/10 active:scale-95 transition-all"
        >
          <span>Nueva Carga Teórica</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* ORDERS LISTGRID */}
      {filteredOrders.length === 0 ? (
        <div className={`p-12 md:p-16 rounded-[2.5rem] border text-center ${
          isDark ? 'bg-slate-900/50 border-white/5' : 'bg-white border-slate-200/80 shadow-sm'
        }`}>
          <FileText className="w-10 h-10 text-slate-600 mx-auto mb-3 opacity-40" />
          <h4 className={`text-sm font-black ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>No hay cargas teóricas guardadas</h4>
          <p className={`text-[11px] font-semibold max-w-sm mx-auto leading-normal mt-1 block ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
            {searchTerm ? 'No se encontraron resultados para tu criterio de búsqueda.' : 'Importa remisiones o facturas de productos para que sirvan de control cruzado en tus auditorías.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order: ExpectedOrder) => {
            const isExpanded = expandedOrderId === order.id;

            return (
              <div 
                key={order.id}
                className={`rounded-[2rem] border overflow-hidden transition-all duration-300 ${
                  isExpanded
                    ? (isDark ? 'bg-slate-900 border-blue-500/30 shadow-2xl shadow-blue-900/10' : 'bg-white border-blue-400 shadow-md')
                    : (isDark ? 'bg-slate-900/80 border-white/5 hover:bg-slate-900 hover:border-white/10' : 'bg-white border-slate-200 hover:border-slate-350 shadow-sm hover:shadow-md')
                }`}
              >
                {/* Header Information */}
                <div 
                  onClick={() => toggleRow(order.id)}
                  className="p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                      isExpanded 
                        ? (isDark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-100 text-blue-600')
                        : (isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500')
                    }`}>
                      <FileText className="w-6 h-6" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className={`text-sm font-black truncate uppercase ${isDark ? 'text-white' : 'text-slate-800'}`}>
                          {order.id}
                        </h4>
                        <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                          isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {order.metadata?.documentType || 'Picking'}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-3 mt-1 text-[10px] font-semibold text-slate-400 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          Importado: {order.metadata?.date || new Date(order.importedAt).toLocaleDateString()}
                        </span>
                        {order.metadata?.purchaseOrder && (
                          <span className={`px-1.5 py-0.2 rounded ${isDark ? 'bg-white/5' : 'bg-slate-100 text-slate-600'}`}>
                            O.C: {order.metadata.purchaseOrder}
                          </span>
                        )}
                        {order.metadata?.orderNote && (
                          <span className="truncate max-w-xs italic text-slate-500">
                            "{order.metadata.orderNote}"
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-6 shrink-0 border-t md:border-t-0 pt-4 md:pt-0 border-white/5">
                    <div className="flex items-center gap-6">
                      <div className="text-left md:text-right">
                        <span className={`text-[9px] font-black uppercase tracking-wider block ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>SKUs Únicos</span>
                        <span className={`text-base font-black ${isDark ? 'text-white' : 'text-slate-800'}`}>{order.totalExpectedSKUs}</span>
                      </div>
                      <div className="text-left md:text-right">
                        <span className={`text-[9px] font-black uppercase tracking-wider block ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Unidades Totales</span>
                        <span className={`text-base font-black ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>{order.totalExpectedUnits}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`¿Estás seguro/a de eliminar la carga teórica "${order.id}"? Esta acción no se puede deshacer.`)) {
                            actions.deleteOrder(order.id);
                          }
                        }}
                        className={`p-3 rounded-xl border transition-all hover:scale-105 active:scale-95 ${
                          isDark 
                            ? 'border-white/5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/5' 
                            : 'border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                        }`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <div className={`p-2 rounded-xl border ${
                        isDark ? 'border-white/5 text-slate-500' : 'border-slate-200 text-slate-400'
                      }`}>
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5 animate-pulse" />}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Detailed Item View */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                    >
                      <div className={`px-6 md:px-8 pb-8 pt-2 border-t flex flex-col ${
                        isDark ? 'bg-slate-950/40 border-white/5' : 'bg-slate-50/50 border-slate-100'
                      }`}>
                        {/* Subheader Search */}
                        <div className="flex items-center justify-between pb-4 border-b flex-wrap gap-2 pt-2 mb-4">
                          <span className={`text-[10px] font-black uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            Desglose de SKUs en Documento
                          </span>
                          <div className="relative max-w-xs w-full">
                            <input
                              type="text"
                              placeholder="Filtro rápido..."
                              value={itemQuery}
                              onChange={(e) => setItemQuery(e.target.value)}
                              className={`w-full pl-8 pr-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${
                                isDark 
                                  ? 'bg-slate-900 border-white/5 text-white' 
                                  : 'bg-white border-slate-200 text-slate-700 shadow-sm'
                              }`}
                            />
                            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
                          </div>
                        </div>

                        {/* SKUs List */}
                        <div className={`rounded-2xl overflow-hidden border h-64 relative ${
                          isDark ? 'bg-slate-900/50 border-white/5' : 'bg-white border-slate-200 shadow-sm'
                        }`}>
                          <VirtualList
                            items={filteredExpandedItems}
                            itemHeight={48}
                            renderRow={ExpandedItemRow}
                            rowData={{ isDark }}
                            emptyState={
                              <div className="h-full w-full flex flex-col items-center justify-center p-8 text-center">
                                <Package className="w-6 h-6 text-slate-500 mb-2 opacity-50" />
                                <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider">No se encontraron artículos</span>
                              </div>
                            }
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
