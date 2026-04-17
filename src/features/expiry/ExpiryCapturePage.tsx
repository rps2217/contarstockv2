import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Download, Trash2, X, AlertTriangle, Search, CornerDownLeft, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useToastStore } from '../../store/useToastStore';
import { db } from '../../db';
import { normalizeSku } from '../../services/utils';
import { useExpiryDatabase, ExpiryItem } from './hooks/useExpiryDatabase';
import { useCaptureSession } from '../../hooks/useCaptureSession';
import { SoundFX } from '../../services/audio';
import { differenceInDays } from 'date-fns';
import { useFeedbackSystem } from '../../hooks/useFeedbackSystem';
import { useAppStore } from '@/store/mainAppStore';
import { CameraScanner } from '../../components/CameraScanner';
import { ScannerTargetOverlay } from '../../shared/components/scanner/ScannerTargetOverlay';
import { ModuleHeader } from '../../shared/components/layout/ModuleHeader';
import { CaptureLayout } from '../../shared/components/layout/CaptureLayout';

const getDaysUntilExpiry = (mm: number, yyyy: number) => {
  const expiryDate = new Date(yyyy, mm - 1, 1);
  expiryDate.setMonth(expiryDate.getMonth() + 1);
  expiryDate.setDate(0);
  return differenceInDays(expiryDate, new Date());
};

const ExpiryItemRow = React.memo(({ 
  item, 
  onDelete 
}: { 
  item: ExpiryItem; 
  onDelete: (id: string) => void;
}) => {
  const days = getDaysUntilExpiry(Number(item.mm) || 0, Number(item.yyyy) || 0);
  const isWarning = days <= 90;
  const isExpired = days <= 0;
  const formattedDate = `31/${(item.mm || 0).toString().padStart(2, '0')}/${item.yyyy}`;

  return (
    <div
      className={`flex items-center gap-4 p-4 rounded-2xl bg-slate-900/50 border ${
        isExpired ? 'border-rose-500/30' : isWarning ? 'border-amber-500/20' : 'border-indigo-500/20'
      }`}
    >
      <div className="flex flex-col items-center shrink-0">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center relative border ${
          isExpired ? 'bg-rose-500/10 border-rose-500/30' : isWarning ? 'bg-amber-500/5 border-amber-500/30' : 'bg-indigo-500/5 border-indigo-500/30'
        }`}>
          {isExpired ? (
            <AlertTriangle className="w-6 h-6 text-rose-500" />
          ) : isWarning ? (
            <ShieldAlert className="w-6 h-6 text-amber-500" />
          ) : (
            <Download className="w-6 h-6 text-indigo-500" />
          )}
          <div className={`absolute -top-2 -right-2 text-[10px] font-black px-1.5 py-0.5 rounded-full ${
            isExpired ? 'bg-rose-500 text-white' : isWarning ? 'bg-amber-500 text-black' : 'bg-indigo-500 text-white'
          }`}>
            {days > 0 ? days : 0}
          </div>
        </div>
        <div className={`mt-2 text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-full border ${
          item.syncStatus === 'synced' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
          item.syncStatus === 'error' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
          'bg-amber-500/10 text-amber-500 border-amber-500/20'
        }`}>
          {item.syncStatus === 'synced' ? 'NUBE' : item.syncStatus === 'error' ? 'ERROR' : 'COLA'}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-black text-white uppercase truncate">
          {item.productName}
        </h3>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="bg-slate-800 text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded">
            {item.barcode}
          </span>
          <span className="text-slate-500 text-[10px] font-bold uppercase truncate">
            {item.providerName || 'SIN PROVEEDOR'}
          </span>
        </div>
      </div>

      <div className="flex flex-col items-end shrink-0">
        <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">
          Vencimiento
        </span>
        <span className={`text-sm font-black mt-0.5 ${isExpired ? 'text-rose-500' : 'text-white'}`}>
          {formattedDate}
        </span>
        <button
          onClick={() => onDelete(item.id)}
          className="mt-2 w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 active:bg-red-500/20 transition-colors"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
});

export const ExpiryCapturePage: React.FC = () => {
  const navigate = useNavigate();
  const { addToast } = useToastStore.getState();
  const { state, actions } = useExpiryDatabase();
  const { feedback, trigger } = useFeedbackSystem(400);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [productName, setProductName] = useState('');
  const [providerName, setProviderName] = useState('');
  const [selectedMm, setSelectedMm] = useState<number | null>(null);
  const [selectedYyyy, setSelectedYyyy] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [filterVencido, setFilterVencido] = useState(false);
  const [filterCritico, setFilterCritico] = useState(false);

  const handleScan = useCallback(async (code: string) => {
    if (!code) return;
    
    if (isSearchActive) {
      setSearchQuery(code);
      return;
    }

    if (isModalOpen) return;

    trigger('success');
    const normalizedCode = normalizeSku(code);
    setScannedBarcode(normalizedCode);
    
    const product = await db.products.get(normalizedCode);
    setProductName(product?.name || 'Producto Desconocido');
    setProviderName(product?.supplier || 'N/A');
    
    setSelectedMm(null);
    setSelectedYyyy(null);
    setIsModalOpen(true);
  }, [isModalOpen, trigger, isSearchActive]);

  const {
    inputValue,
    setInputValue,
    isCameraActive,
    setIsCameraActive,
    inputRef,
    handleManualSubmit
  } = useCaptureSession({
    onScan: handleScan,
    isEnabled: !isModalOpen
  });

  const handleSimpleSubmit = async () => {
    if (!scannedBarcode || !selectedMm || !selectedYyyy || isSubmitting) return;
    
    try {
      setIsSubmitting(true);
      await actions.handleAddItem({
        barcode: scannedBarcode,
        productName: productName,
        providerName: providerName,
        mm: selectedMm,
        yyyy: selectedYyyy,
        quantity: 1
      });
      
      SoundFX.play('success');
      addToast(navigator.onLine ? 'Vencimiento registrado' : 'Guardado en cola', navigator.onLine ? 'success' : 'info');
      setIsModalOpen(false);
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

    if (searchQuery || inputValue) {
      const q = (searchQuery || inputValue).toLowerCase();
      items = items.filter(item => 
        item.barcode.toLowerCase().includes(q) || 
        (item.productName && item.productName.toLowerCase().includes(q))
      );
    }

    return items
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
      .slice(0, 50);
  }, [state.allItems, filterVencido, filterCritico, searchQuery, inputValue]);

  const header = (
    <ModuleHeader 
      title="Captura Rápida"
      subtitle="Control de Vencimientos"
      onBack={() => navigate('/')}
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSearchActive(!isSearchActive)}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
              isSearchActive ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-400 active:bg-white/10'
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

  return (
    <>
      <CaptureLayout
        header={header}
        inputValue={isSearchActive ? searchQuery : inputValue}
        onInputChange={isSearchActive ? setSearchQuery : setInputValue}
        onInputSubmit={handleManualSubmit}
        onCameraToggle={() => setIsCameraActive(!isCameraActive)}
        inputPlaceholder={isSearchActive ? "Buscar..." : "Escanear o digitar..."}
        inputRef={inputRef}
        readOnly={isModalOpen}
        list={
          <div className="space-y-4 pb-32">
            {sortedItems.map((item) => (
              <ExpiryItemRow 
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
              No hay registros que coincidan
            </div>
          )
        }
      />

      {/* PERSISTENT CAMERA SCANNER */}
      <AnimatePresence>
        {isCameraActive && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 200, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="fixed top-[80px] left-0 right-0 z-[100] bg-black overflow-hidden border-b-2 border-blue-500/50 shadow-[0_10px_40px_rgba(0,0,0,0.8)]"
          >
            <CameraScanner 
              onScan={(code) => { handleScan(code); }} 
              onClose={() => setIsCameraActive(false)} 
              inline={true}
              isTriggered={true}
            />
            <ScannerTargetOverlay feedback={feedback} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* DYNAMIC FORM MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[2000] flex items-end justify-center bg-black/20 backdrop-blur-[1px] pointer-events-none"
          >
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              className="w-full max-w-md bg-slate-900 border-t-4 border-blue-600 rounded-t-[2.5rem] shadow-[0_-20px_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col max-h-[60vh] pointer-events-auto pb-safe"
            >
              <div className="p-4 border-b border-white/10 flex items-center justify-between bg-slate-800">
                <div>
                  <h2 className="text-sm font-black uppercase tracking-widest text-white">Registro de Vencimiento</h2>
                  <p className="text-[10px] text-slate-400 mt-1 truncate max-w-[250px]">{productName}</p>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400 active:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-8">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-2">1. MES</label>
                  <div className="grid grid-cols-4 gap-2">
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                      <button
                        key={m}
                        onClick={() => { setSelectedMm(m); SoundFX.play('increment'); }}
                        className={`h-12 rounded-xl font-black text-lg transition-all border-2 ${
                          selectedMm === m 
                            ? 'bg-blue-600 border-blue-400 text-white shadow-lg' 
                            : 'bg-white/5 border-white/5 text-slate-600 hover:bg-white/10'
                        }`}
                      >
                        {String(m).padStart(2, '0')}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-2">2. AÑO</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[2026, 2027, 2028, 2029].map(y => (
                      <button
                        key={y}
                        onClick={() => { setSelectedYyyy(y); SoundFX.play('increment'); }}
                        className={`h-16 rounded-2xl font-black text-2xl transition-all border-2 flex items-center justify-center italic tracking-tighter ${
                          selectedYyyy === y 
                            ? 'bg-emerald-600 border-emerald-400 text-white shadow-lg' 
                            : 'bg-white/5 border-white/5 text-slate-600 hover:bg-white/10'
                        }`}
                      >
                        {y}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  disabled={!scannedBarcode || !selectedMm || !selectedYyyy || isSubmitting}
                  onClick={handleSimpleSubmit}
                  className={`w-full py-6 rounded-2xl font-black text-xl uppercase tracking-[0.2em] flex items-center justify-center gap-4 transition-all ${
                    isSubmitting 
                      ? 'bg-slate-800 text-slate-500 cursor-wait'
                      : scannedBarcode && selectedMm && selectedYyyy
                        ? 'bg-white text-black hover:bg-blue-50 shadow-xl'
                        : 'bg-white/5 text-white/10 border border-white/5 cursor-not-allowed'
                  }`}
                >
                  {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : <><CornerDownLeft className="w-6 h-6" /> REGISTRAR</>}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ExpiryCapturePage;

// Forced GitHub sync
