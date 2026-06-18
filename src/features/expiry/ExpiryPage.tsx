import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Download, Trash2, X, AlertTriangle, Search, CornerDownLeft, Loader2, RefreshCw, AlertCircle, Home } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { VirtualList } from '../../shared/components/ui/VirtualList';
import { useToastStore } from '../../store/useToastStore';
import { normalizeSku } from '../../services/utils';
import { useExpiryDatabase, ExpiryItem } from './hooks/useExpiryDatabase';
import { useScannerEngine } from '../../hooks/useScannerEngine';
import { differenceInDays, format } from 'date-fns';
import { useFeedbackSystem } from '../../hooks/useFeedbackSystem';
import { useAppStore } from '@/store/mainAppStore';
import { useSyncStore } from '../../store/useSyncStore';
import { SmartDock } from '../../components/SmartDock';
import { CameraScanner } from '../../components/CameraScanner';
import { ScannerTargetOverlay } from '../../shared/components/scanner/ScannerTargetOverlay';
import { ModuleHeader } from '../../shared/components/layout/ModuleHeader';
import { CaptureLayout } from '../../shared/components/layout/CaptureLayout';
import { ExpiryCaptureModal } from './components/ExpiryCaptureModal';
import { SyncDiagnosticsPanel } from '../sync/components/SyncDiagnosticsPanel';
import { ExpiryCaptureRow } from './components/ExpiryCaptureRow';
import { ExpiryDetailModal } from './components/ExpiryDetailModal';

const getDaysUntilExpiry = (mm: number, yyyy: number) => {
  const expiryDate = new Date(yyyy, mm - 1, 1);
  expiryDate.setMonth(expiryDate.getMonth() + 1);
  expiryDate.setDate(0);
  return differenceInDays(expiryDate, new Date());
};

const ExpiryListRow = React.memo(({ index, item, data }: any) => {
  const { onDelete, onRowClick } = data;
  return (
    <div className="h-full pb-6">
      <ExpiryCaptureRow item={item} onDelete={onDelete} onClick={onRowClick} />
    </div>
  );
});
ExpiryListRow.displayName = 'ExpiryListRow';

export const ExpiryPage: React.FC = () => {
  const navigate = useNavigate();
  const { addToast } = useToastStore.getState();
  const { state, actions } = useExpiryDatabase();
  const syncStore = useSyncStore();
  const engine = useScannerEngine();
  
  const parentRef = useRef<HTMLDivElement>(null);
  
  const [selectedMm, setSelectedMm] = useState<number | null>(null);
  const [selectedYyyy, setSelectedYyyy] = useState<number | null>(new Date().getFullYear() + 1); 
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [filterVencido, setFilterVencido] = useState(false);
  const [filterCritico, setFilterCritico] = useState(false);

  const [selectedDetailItem, setSelectedDetailItem] = useState<ExpiryItem | null>(null);

  // Atajos de teclado para ultra-productividad en almacén/captura rápida de vencimientos
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Si el modal de ingreso de fecha está abierto, no interferir con su propio teclado numérico
      if (engine.isModalOpen) return;

      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      // Escape: Quitar foco del input de escaneo y/o limpiar entrada de texto
      if (e.key === 'Escape') {
         if (isInput) {
            target.blur();
         }
         if (engine.capture.inputValue) {
           engine.capture.setInputValue('');
         }
         return;
      }

      // Alt + C: Activar o desactivar visualizador de cámara
      if (e.altKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        engine.capture.setIsCameraActive(prev => !prev);
        
        return;
      }

      // Alt + K: Alternar filtro de vencimientos críticos (<= 90 días)
      if (e.altKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setFilterCritico(prev => !prev);
        if (filterVencido) setFilterVencido(false);
        
        return;
      }

      // Alt + V: Alternar filtro de vencidos
      if (e.altKey && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        setFilterVencido(prev => !prev);
        if (filterCritico) setFilterCritico(false);
        
        return;
      }

      // Tecla "/" para enfocar rápidamente el buscador o campo de escaneo manual
      if (e.key === '/' && !isInput) {
        e.preventDefault();
        engine.capture.inputRef.current?.focus();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [engine.isModalOpen, engine.capture, filterCritico, filterVencido]);

  const handleSimpleSubmit = async () => {
    if (!engine.scannedBarcode || !selectedMm || !selectedYyyy || isSubmitting) return;
    
    try {
      setIsSubmitting(true);
      
      await actions.handleAddItem({
        barcode: engine.scannedBarcode,
        productName: engine.product?.name || 'Producto Desconocido',
        providerName: engine.product?.supplier || 'N/A',
        providerRut: engine.product?.supplierRut || undefined,
        mm: selectedMm,
        yyyy: selectedYyyy,
        quantity: 1
      });
      
      
      addToast(navigator.onLine ? 'Vencimiento registrado' : 'Guardado en cola', navigator.onLine ? 'success' : 'info');
      engine.resetScanner();
      setSelectedMm(null);
    } catch (error) {
      
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
        
      }
    }
  }, [state.allItems, actions]);

  const sortedItems = useMemo(() => {
    let items = [...state.allItems];

    if (filterVencido || filterCritico) {
      items = items.filter(item => {
        const days = getDaysUntilExpiry(Number(item.mm) || 0, Number(item.yyyy) || 0);
        const isVencido = days <= 0;
        const isCritico = days > 0 && days <= 90;
        if (filterVencido && filterCritico) return isVencido || isCritico;
        if (filterVencido) return isVencido;
        if (filterCritico) return isCritico;
        return true;
      });
    }

    const q = (engine.isSearchActive ? engine.searchQuery : engine.capture.inputValue).toLowerCase();
    if (q) {
      items = items.filter(item => 
        item.barcode.toLowerCase().includes(q) || 
        (item.productName && item.productName.toLowerCase().includes(q))
      );
    }

    return items.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
  }, [state.allItems, filterVencido, filterCritico, engine.isSearchActive, engine.searchQuery, engine.capture.inputValue]);

  const rowData = useMemo(() => ({ 
    onDelete: handleDelete, 
    onRowClick: (item: ExpiryItem) => setSelectedDetailItem(item) 
  }), [handleDelete]);

  const header = (
    <ModuleHeader 
      title="Captura Rápida"
      subtitle="Control de Vencimientos"
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
                : syncStore.conflicts > 0 
                  ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/20' 
                  : 'bg-white/5 text-slate-500 hover:text-slate-400 active:scale-90'
            }`}
          >
            {syncStore.incidents.length > 0 ? (
              <AlertCircle className="w-5 h-5" />
            ) : (
              <RefreshCw className={`w-4 h-4 ${syncStore.isSyncing ? 'animate-spin' : ''}`} />
            )}
          </button>

          <button
            onClick={() => engine.setIsSearchActive(!engine.isSearchActive)}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
              engine.isSearchActive ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-400 active:bg-white/10'
            }`}
          >
            <Search className="w-5 h-5" />
          </button>
          <button
            onClick={() => setFilterCritico(!filterCritico)}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
              filterCritico ? 'bg-amber-500 text-black' : 'bg-white/5 text-slate-400 active:bg-white/10'
            }`}
          >
            <ShieldAlert className="w-5 h-5" />
          </button>
          <button
            onClick={() => setFilterVencido(!filterVencido)}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
              filterVencido ? 'bg-rose-500 text-white' : 'bg-white/5 text-slate-400 active:bg-white/10'
            }`}
          >
            <AlertTriangle className="w-5 h-5" />
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
      id: 'critico',
      icon: ShieldAlert,
      onClick: () => {
        setFilterCritico(!filterCritico);
        if (filterVencido) setFilterVencido(false);
      },
      isActive: filterCritico,
      activeColor: 'text-amber-500',
      activeBg: 'bg-amber-500/20'
    },
    {
      id: 'vencido',
      icon: AlertTriangle,
      onClick: () => {
        setFilterVencido(!filterVencido);
        if (filterCritico) setFilterCritico(false);
      },
      isActive: filterVencido,
      activeColor: 'text-rose-500',
      activeBg: 'bg-rose-500/20'
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
            onScan={(code) => { engine.handleScan(code); }} 
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
    <>
      <button
        onClick={async () => {
          if (window.confirm("¿Seguro que deseas limpiar y recargar todos los registros desde la nube?")) {
            await actions.handleFullRefresh();
            addToast("Base de datos sincronizada", "success");
          }
        }}
        disabled={syncStore.isSyncing}
        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border flex items-center gap-2 shrink-0 ${
          syncStore.isSyncing 
            ? 'bg-indigo-500/50 text-white border-indigo-400 opacity-50 cursor-not-allowed' 
            : 'bg-indigo-500 text-white border-indigo-400 active:bg-indigo-600'
        }`}
        title="Importar desde la nube / Limpiar y recargar"
      >
        <Download className={`w-3.5 h-3.5 ${syncStore.isSyncing ? 'animate-bounce' : ''}`} />
        Limpiar Nube
      </button>
      <button
        onClick={() => setFilterCritico(!filterCritico)}
        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border flex items-center gap-2 shrink-0 ${
          filterCritico 
            ? 'bg-amber-500 text-black border-amber-400' 
            : 'bg-white/5 text-slate-500 border-white/5 active:bg-white/10'
        }`}
      >
        <ShieldAlert className="w-3.5 h-3.5" />
        Crítico
      </button>
      <button
        onClick={() => setFilterVencido(!filterVencido)}
        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border flex items-center gap-2 shrink-0 ${
          filterVencido 
            ? 'bg-rose-500 text-white border-rose-400' 
            : 'bg-white/5 text-slate-500 border-white/5 active:bg-white/10'
        }`}
      >
        <AlertTriangle className="w-3.5 h-3.5" />
        Vencido
      </button>
    </>
  );

  const modalForm = (
    <ExpiryCaptureModal
      isOpen={engine.isModalOpen}
      onClose={() => engine.setIsModalOpen(false)}
      scannedBarcode={engine.scannedBarcode}
      productName={engine.product?.name}
      providerPolicy={engine.providerPolicy}
      selectedMm={selectedMm}
      setSelectedMm={setSelectedMm}
      selectedYyyy={selectedYyyy}
      setSelectedYyyy={setSelectedYyyy}
      onSubmit={handleSimpleSubmit}
      isSubmitting={isSubmitting}
    />
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
        scrollRef={parentRef}
        readOnly={engine.isModalOpen}
        list={
          <VirtualList
            items={sortedItems}
            itemHeight={154} // 130 + 24 spacing
            renderRow={ExpiryListRow}
            rowData={rowData}
          />
        }
        emptyState={
          sortedItems.length === 0 && (
            <div className="text-center py-12 text-slate-500 font-bold text-sm uppercase tracking-widest">
              No hay registros que coincidan
            </div>
          )
        }
      />

      <SyncDiagnosticsPanel 
        isOpen={engine.isSyncModalOpen} 
        onClose={() => engine.setIsSyncModalOpen(false)} 
      />

      <ExpiryDetailModal 
        isOpen={!!selectedDetailItem}
        onClose={() => setSelectedDetailItem(null)}
        item={selectedDetailItem}
      />
    </>
  );
};

export default ExpiryPage;

