import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  Trash2, 
  X, 
  CornerDownLeft, 
  Package, 
  Hash, 
  Truck,
  Plus,
  Minus,
  CheckCircle2,
  AlertCircle,
  Home,
  Search,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useToastStore } from '../../store/useToastStore';
import { db } from '../../db';
import { normalizeSku } from '../../services/utils';
import { useEventDatabase } from './hooks/useEventDatabase';
import { useScannerEngine } from '../../hooks/useScannerEngine';
import { SoundFX } from '../../services/audio';
import { useSyncStore } from '../../store/useSyncStore';
import { SmartDock } from '../../components/SmartDock';
import { CameraScanner } from '../../components/CameraScanner';
import { ScannerTargetOverlay } from '../../shared/components/scanner/ScannerTargetOverlay';
import { ModuleHeader } from '../../shared/components/layout/ModuleHeader';
import { CaptureLayout } from '../../shared/components/layout/CaptureLayout';
import { SyncDiagnosticsPanel } from '../sync/components/SyncDiagnosticsPanel';

const EVENT_TYPES = [
  'DIF. PED.',
  'DET. PED.',
  'VENCE CERC.',
  'DET. CALIDAD INT.',
  'DET. CALIDAD EXT.',
  'CANJES',
  'MERMAS'
];

// Memoized Item Component
const EventItemRow = React.memo(({ 
  item, 
  onDelete 
}: { 
  item: any; 
  onDelete: (id: string) => void;
}) => {
  return (
    <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#0a0a0a] border border-white/5">
      <div className="flex flex-col items-center shrink-0">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-blue-500/10 border border-blue-500/20">
          <Package className="w-6 h-6 text-blue-500" />
        </div>
        <div className={`mt-2 text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-full border ${
          item.isAdjusted ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
        }`}>
          {item.isAdjusted ? 'AJUSTADO' : 'PENDIENTE'}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-black text-white uppercase truncate">
          {item.productName}
        </h3>
        <div className="flex flex-wrap items-center gap-2 mt-1.5">
          <span className="bg-slate-800 text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded">
            {item.barcode}
          </span>
          <span className="text-blue-400 text-[10px] font-black uppercase">
            {item.event}
          </span>
          <span className="text-slate-500 text-[10px] font-bold uppercase truncate">
            {item.quantity} UNID
          </span>
        </div>
      </div>

      <div className="flex flex-col items-end shrink-0">
        <button
          onClick={() => onDelete(item.id)}
          className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 active:bg-red-500/20 transition-colors"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
});

export const EventCapturePage: React.FC = () => {
  const navigate = useNavigate();
  const { addToast } = useToastStore.getState();
  const { state, actions } = useEventDatabase();
  const syncStore = useSyncStore();
  const engine = useScannerEngine();
  
  // Form State
  const [selectedEvent, setSelectedEvent] = useState('DIF. PED.');
  const [quantity, setQuantity] = useState(1);
  const [frc, setFrc] = useState(() => localStorage.getItem('last_frc') || '');
  const [nguia, setNguia] = useState(() => localStorage.getItem('last_nguia') || '');
  const [traspaso, setTraspaso] = useState('');
  const [destino, setDestino] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!engine.scannedBarcode || !selectedEvent || !quantity || !frc || !nguia || isSubmitting) {
      addToast('Completa todos los campos obligatorios', 'error');
      return;
    }

    if (traspaso.trim() && !destino.trim()) {
      addToast('El destino es obligatorio cuando hay un número de traspaso', 'error');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Save FRC and Guía for next time
      localStorage.setItem('last_frc', frc);
      localStorage.setItem('last_nguia', nguia);

      await actions.handleAddItem({
        barcode: engine.scannedBarcode,
        productName: engine.product?.name || 'Producto Desconocido',
        providerName: engine.product?.supplier || 'N/A',
        event: selectedEvent,
        quantity,
        frc,
        nguia,
        traspaso,
        destino,
        timestamp: new Date().toISOString()
      });
      
      SoundFX.play('success');
      addToast('Evento registrado correctamente', 'success');
      
      engine.resetScanner();
      
      // Reset some fields but keep FRC/Guía
      setQuantity(1);
      setTraspaso('');
      setDestino('');
    } catch (error) {
      SoundFX.play('error');
      addToast('Error al guardar', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = useCallback(async (id: string) => {
    if (window.confirm('¿Eliminar este registro?')) {
      const itemToDelete = state.allItems.find(i => i.id === id);
      if (itemToDelete) {
        await actions.handleRemoveItem(itemToDelete);
        SoundFX.play('delete');
      }
    }
  }, [state.allItems, actions]);

  const sortedItems = useMemo(() => {
    return [...state.allItems]
      .sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
  }, [state.allItems]);

  const header = (
    <ModuleHeader 
      title="Captura Eventos"
      subtitle="Gestión de Diferencias"
      hideTitleOnMobile={true}
      hideBackButtonOnMobile={true}
      onBack={() => navigate('/')}
      actions={
        <div className="hidden md:flex items-center gap-2">
          {/* SYNC STATUS INDICATOR - Desktop */}
          <button
            onClick={() => engine.setIsSyncModalOpen(true)}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              syncStore.incidents.length > 0 
                ? 'bg-rose-500 text-white animate-pulse shadow-[0_0_15px_rgba(244,63,94,0.4)]' 
                : 'bg-white/5 text-slate-400 hover:bg-white/10'
            }`}
            title="Sincronización"
          >
             <RefreshCw className={`w-5 h-5 ${syncStore.isSyncing ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => engine.setIsSearchActive(!engine.isSearchActive)}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
              engine.isSearchActive ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-400 active:bg-white/10'
            }`}
          >
            <Search className="w-5 h-5" />
          </button>
        </div>
      }
    />
  );

  const dockItems = [
    {
      id: 'home',
      icon: Home,
      onClick: () => navigate('/'),
    },
    {
      id: 'search',
      icon: Search,
      onClick: () => engine.setIsSearchActive(!engine.isSearchActive),
      isActive: engine.isSearchActive,
      activeColor: 'text-blue-400',
      activeBg: 'bg-blue-500/20'
    },
    {
      id: 'sync',
      icon: RefreshCw,
      onClick: () => engine.setIsSyncModalOpen(true),
      isActive: syncStore.incidents.length > 0 || syncStore.isSyncing,
      activeColor: syncStore.incidents.length > 0 ? 'text-rose-500' : 'text-blue-400',
      activeBg: syncStore.incidents.length > 0 ? 'bg-rose-500/20' : 'bg-blue-500/20'
    }
  ];

  const mobileDock = <SmartDock items={dockItems} variant="contextual" />;

  const cameraArea = (
    <AnimatePresence>
      {engine.capture.isCameraActive && (
        <motion.div 
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 260, opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="bg-black overflow-hidden border-b-2 border-blue-500/50 shadow-inner relative"
        >
          <CameraScanner 
            onScan={engine.handleScan} 
            onClose={() => engine.capture.setIsCameraActive(false)} 
            inline={true}
            isTriggered={true}
          />
          <ScannerTargetOverlay feedback={engine.feedback} />
        </motion.div>
      )}
    </AnimatePresence>
  );

  const filters = (
    <div className="flex gap-2">
      <div className="px-4 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
        Eventos Recientes
      </div>
    </div>
  );

  const modalForm = (
    <AnimatePresence>
      {engine.isModalOpen && (
        <div className="fixed inset-0 z-[2000] flex items-end justify-center pointer-events-none">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => engine.setIsModalOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto"
          />
          
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-full max-w-2xl bg-slate-950 border-t border-white/10 rounded-t-[2.5rem] shadow-[0_-20px_60px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[90vh] pointer-events-auto"
          >
            <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mt-3 mb-1 shrink-0" />

            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-slate-900/50">
              <div className="flex-1 min-w-0 pr-4">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500">Evento</span>
                <p className="text-base font-black text-white truncate leading-tight mt-1 uppercase italic tracking-tighter tabular-nums">
                  {engine.scannedBarcode}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5 truncate uppercase font-bold">{engine.product?.name}</p>
              </div>
              <button 
                onClick={() => engine.setIsModalOpen(false)}
                className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-slate-400 active:bg-white/10 active:scale-95 transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar pb-10">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1 flex items-center gap-1">
                    <Hash className="w-3 h-3" /> FRC
                  </label>
                  <input
                    type="text"
                    value={frc}
                    onChange={(e) => setFrc(e.target.value.toUpperCase())}
                    className="w-full px-5 py-4 bg-white/5 border-2 border-white/5 rounded-2xl text-lg font-black text-white focus:border-blue-500 outline-none"
                    placeholder="Obligatorio"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1 flex items-center gap-1">
                    <Truck className="w-3 h-3" /> Guía
                  </label>
                  <input
                    type="text"
                    value={nguia}
                    onChange={(e) => setNguia(e.target.value.toUpperCase())}
                    className="w-full px-5 py-4 bg-white/5 border-2 border-white/5 rounded-2xl text-lg font-black text-white focus:border-blue-500 outline-none"
                    placeholder="Obligatorio"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1 flex items-center gap-1">
                    <Hash className="w-3 h-3" /> Traspaso
                  </label>
                  <input
                    type="text"
                    value={traspaso}
                    onChange={(e) => setTraspaso(e.target.value.toUpperCase())}
                    className="w-full px-5 py-4 bg-white/5 border-2 border-white/5 rounded-2xl text-lg font-black text-white focus:border-blue-500 outline-none"
                    placeholder="Opcional"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1 flex items-center gap-1">
                    <Truck className="w-3 h-3" /> Destino {traspaso.trim() && <span className="text-rose-500">*</span>}
                  </label>
                  <select
                    value={destino}
                    onChange={(e) => setDestino(e.target.value)}
                    className="w-full px-5 py-4 bg-white/5 border-2 border-white/5 rounded-2xl text-lg font-black text-white focus:border-blue-500 outline-none appearance-none"
                  >
                    <option value="">Seleccionar...</option>
                    <option value="BOD. 37">BOD. 37</option>
                    <option value="BOD. 80">BOD. 80</option>
                    <option value="BOD. 95">BOD. 95</option>
                    <option value="BOD. 98">BOD. 98</option>
                    <option value="BOD. 106">BOD. 106</option>
                    <option value="BOD. 121">BOD. 121</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Tipo de Evento</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {EVENT_TYPES.map(type => (
                    <button
                      key={type}
                      onClick={() => {
                        setSelectedEvent(type);
                        SoundFX.play('increment');
                      }}
                      className={`py-3 px-3 rounded-xl text-[10px] font-black transition-all border-2 ${
                        selectedEvent === type 
                          ? 'bg-blue-600 border-blue-400 text-white shadow-lg' 
                          : 'bg-white/5 border-white/5 text-slate-500 hover:bg-white/10'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Cantidad</label>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-16 h-16 rounded-2xl bg-white/5 border-2 border-white/5 flex items-center justify-center active:scale-90 transition-transform"
                  >
                    <Minus className="w-8 h-8 text-white" />
                  </button>
                  <div className="flex-1 h-16 bg-white/5 border-2 border-white/5 rounded-2xl flex items-center justify-center">
                    <span className="text-3xl font-black text-white">{quantity}</span>
                  </div>
                  <button 
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-16 h-16 rounded-2xl bg-white/5 border-2 border-white/5 flex items-center justify-center active:scale-90 transition-transform"
                  >
                    <Plus className="w-8 h-8 text-white" />
                  </button>
                </div>
              </div>

              <button
                disabled={isSubmitting || !frc || !nguia}
                onClick={handleSubmit}
                className={`w-full py-6 rounded-[1.5rem] font-black text-xl uppercase tracking-widest flex items-center justify-center gap-3 transition-all active:scale-95 shadow-2xl ${
                  isSubmitting || !frc || !nguia
                    ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                    : 'bg-white text-black hover:bg-blue-50'
                }`}
              >
                {isSubmitting ? <RefreshCw className="w-6 h-6 animate-spin" /> : 'REGISTRAR EVENTO'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <CaptureLayout
        header={header}
        footer={mobileDock}
        extra={cameraArea}
        filters={filters}
        modalForm={modalForm}
        inputValue={engine.isSearchActive ? engine.searchQuery : engine.capture.inputValue}
        onInputChange={engine.isSearchActive ? engine.setSearchQuery : engine.capture.setInputValue}
        onInputSubmit={engine.capture.handleManualSubmit}
        onCameraToggle={() => engine.capture.setIsCameraActive(!engine.capture.isCameraActive)}
        inputPlaceholder={engine.isSearchActive ? "Buscar..." : "Escanear o digitar..."}
        inputRef={engine.capture.inputRef}
        readOnly={engine.isModalOpen}
        list={
          <div className="space-y-4">
            {sortedItems.map((item) => (
              <EventItemRow 
                key={item.id} 
                item={item} 
                onDelete={handleDelete} 
              />
            ))}
          </div>
        }
        emptyState={
          sortedItems.length === 0 && (
            <div className="text-center py-12 text-slate-500 font-bold text-sm uppercase tracking-widest">
              No hay eventos recientes
            </div>
          )
        }
      />

      <SyncDiagnosticsPanel 
        isOpen={engine.isSyncModalOpen} 
        onClose={() => engine.setIsSyncModalOpen(false)} 
      />
    </>
  );
};

export default EventCapturePage;

