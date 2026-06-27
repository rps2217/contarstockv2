import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, BookOpen, Layers, Sparkles, FileSpreadsheet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/stores';
import { useExpectedOrders } from './hooks/useExpectedOrders';
import { OrderImporter } from './components/OrderImporter';
import { OrderPreviewList } from './components/OrderPreviewList';
import { SavedOrdersList } from './components/SavedOrdersList';
import { OrderDetailModal } from './components/OrderDetailModal';
import { ExpectedOrder } from '@/types';

export function ExpectedOrdersPage() {
  const navigate = useNavigate();
  const { settings } = useAppStore();
  const isDark = settings?.theme !== 'light';
  const theme = settings?.theme || 'dark';
  
  const { state, actions } = useExpectedOrders();

  // State for detail modal
  const [selectedOrder, setSelectedOrder] = useState<ExpectedOrder | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Handler para ver detalle de orden
  const handleViewOrderDetail = (order: ExpectedOrder) => {
    setSelectedOrder(order);
    setIsDetailModalOpen(true);
  };

  return (
    <div className={`h-full w-full ${isDark ? "bg-neutral-950 selection:bg-blue-500/30" : "bg-neutral-50 selection:bg-blue-500/20"} overflow-y-auto no-scrollbar pb-32 font-sans relative`}>
      {/* BACKGROUND DECORATIVE GRADIENTS */}
      <div className={`absolute top-0 right-0 w-[500px] h-[500px] ${isDark ? "bg-blue-600/5" : "bg-blue-500/2"} rounded-full blur-[120px] pointer-events-none`} />

      {/* HEADER SECTION */}
      <header className={`px-4 md:px-6 pt-10 md:pt-16 pb-8 md:pb-12 ${isDark ? "bg-neutral-900 border-neutral-800" : "bg-white border-neutral-200/80 shadow-sm"} border-b relative overflow-hidden shrink-0`}>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              {/* Back Button */}
              <button
                onClick={() => {
                  if (state.activeStep === 'import') {
                    actions.setActiveStep('list');
                    actions.resetImporter();
                  } else {
                    navigate('/dashboard');
                  }
                }}
                className={`p-3 rounded-xl md:rounded-2xl flex items-center justify-center transition-all active:scale-95 border ${
                  isDark 
                    ? "bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white hover:bg-neutral-800" 
                    : "bg-neutral-100 hover:bg-neutral-200 text-slate-600 hover:text-slate-900 border-neutral-200"
                }`}
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              <div>
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <FileSpreadsheet className="w-4 h-4 text-blue-500" />
                  <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}>Auditorías & Picking</span>
                </div>
                <h1 className={`text-2xl md:text-3.5xl font-black tracking-tight leading-none uppercase ${isDark ? 'text-white' : 'text-slate-800'}`}>
                  CARGAS <span className="text-gradient-blue">TEÓRICAS</span>
                </h1>
              </div>
            </div>

            {/* Quick Context Tip */}
            <div className={`hidden lg:flex items-center gap-3 p-4 rounded-2xl border max-w-sm ${
              isDark ? 'bg-neutral-950/40 border-neutral-800 text-neutral-400' : 'bg-neutral-50 border-slate-100 text-neutral-500'
            }`}>
              <BookOpen className="w-6 h-6 text-blue-500 shrink-0" />
              <p className="text-[10px] font-semibold leading-normal">
                Vincula manifiestos, facturas o planillas antes del conteo para auditar bultos contra picking teórico con tolerancia cero.
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-10 relative z-10">
        <AnimatePresence mode="wait">
          {state.activeStep === 'list' ? (
            <motion.div
              key="list-stage"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
            >
              <SavedOrdersList 
                state={state} 
                actions={actions} 
                isDark={isDark} 
                theme={theme as 'dark' | 'light' | 'high-contrast'}
                onViewDetail={handleViewOrderDetail}
              />
            </motion.div>
          ) : (
            <motion.div
              key="import-stage"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="space-y-8"
            >
              {/* Stepper Wizard / Header of import section */}
              <div className={`p-6 rounded-[2rem] border flex items-center justify-between gap-4 flex-wrap ${
                isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200/80 shadow-sm'
              }`}>
                <div className="space-y-1">
                  <h3 className={`text-base font-black ${isDark ? 'text-white' : 'text-slate-800'}`}>Asistente de Importación</h3>
                  <p className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}>Paso 1 de 2: Carga y Mapeo de Columnas</p>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      actions.setActiveStep('list');
                      actions.resetImporter();
                    }}
                    className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl border transition-all ${
                      isDark 
                        ? 'border-neutral-800 text-neutral-400 hover:bg-white/5 hover:text-white' 
                        : 'border-neutral-200 text-slate-600 hover:bg-neutral-100'
                    }`}
                  >
                    Salir
                  </button>
                </div>
              </div>

              {/* Upload or paste forms */}
              <OrderImporter state={state} actions={actions} isDark={isDark} />

              {/* Instant parsed items preview */}
              {state.previewItems.length > 0 && (
                <div className="space-y-4 pt-4 border-t border-neutral-800 animate-in fade-in zoom-in-95 duration-250">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-gradient-blue animate-pulse" />
                    <h3 className={`text-[11px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                      Previsualización de Carga a Almacenar
                    </h3>
                  </div>

                  <OrderPreviewList state={state} actions={actions} isDark={isDark} />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ORDER DETAIL MODAL */}
      <OrderDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        order={selectedOrder}
        onEdit={() => {
          // TODO: Implementar edición de orden
          setIsDetailModalOpen(false);
        }}
        onDelete={() => {
          if (selectedOrder) {
            if (confirm(`¿Eliminar la carga teórica "${selectedOrder.id}"?`)) {
              actions.deleteOrder(selectedOrder.id);
              setIsDetailModalOpen(false);
            }
          }
        }}
      />
    </div>
  );
}
