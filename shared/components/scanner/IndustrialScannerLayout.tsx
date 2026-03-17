import React, { useState, useRef, useEffect } from 'react';
import { Box } from 'lucide-react';
import { CameraScanner } from '../../../components/CameraScanner';
import { FeedbackStatus } from '../../../hooks/useFeedbackSystem';
import { ScannerHeader } from './ScannerHeader';
import { ScannerTargetOverlay } from './ScannerTargetOverlay';
import { ScannerSearchBar } from './ScannerSearchBar';
import { ManualEntryForm } from './ManualEntryForm';
import { ScannedItemRow, ScannedItemProps } from './ScannedItemRow';
import { EditQuantityModal } from './EditQuantityModal';

interface IndustrialScannerLayoutProps {
  onBack: () => void;
  onScan: (code: string, qtyOverride?: number) => void;
  onRemove?: (barcode: string) => void;
  onFinalize: () => void;
  onOpenTools: () => void;
  onLock?: () => void;
  location: string;
  onChangeLocation: () => void;
  activeBarcode: string | null;
  activeItemName?: string;
  feedback: FeedbackStatus;
  items: ScannedItemProps[];
  isVoiceEnabled?: boolean;
  allowEditQuantity?: boolean;
  bottomContent?: React.ReactNode; // For multiplier or other specific footers
}

export const IndustrialScannerLayout: React.FC<IndustrialScannerLayoutProps> = ({
  onBack,
  onScan,
  onRemove,
  onFinalize,
  onOpenTools,
  onLock,
  location,
  onChangeLocation,
  activeBarcode,
  activeItemName,
  feedback,
  items,
  isVoiceEnabled = false,
  allowEditQuantity = false,
  bottomContent
}) => {
  const [isManualMode, setIsManualMode] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const manualInputRef = useRef<HTMLInputElement>(null);
  const lastSpokenRef = useRef<string>('');
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Edit quantity state
  const [editingItem, setEditingItem] = useState<ScannedItemProps | null>(null);
  const [editQty, setEditQty] = useState<number>(0);

  // Active item info
  const activeItem = items.find(i => i.barcode === activeBarcode);
  const displayQty = activeItem?.totalQuantity ?? 0;
  const displayName = activeItemName || activeItem?.name || 'ESCANEA UN PRODUCTO';

  // Filter items
  const filteredItems = items.filter(item => 
    item.barcode.includes(searchQuery) || 
    item.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Voice logic
  useEffect(() => {
    if (!isVoiceEnabled || !activeBarcode) return;
    
    const textToSpeak = `${displayName}. ${displayQty} unidades.`;
    if (lastSpokenRef.current === textToSpeak) return;
    
    lastSpokenRef.current = textToSpeak;
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = 'es-ES';
    utterance.rate = 1.1;
    window.speechSynthesis.speak(utterance);
  }, [activeBarcode, displayQty, displayName, isVoiceEnabled]);

  const handleToggleManualMode = () => {
    setIsManualMode(!isManualMode);
    if (!isManualMode) {
      setTimeout(() => manualInputRef.current?.focus(), 100);
    }
  };

  const handleEditQtySave = () => {
    if (editingItem) {
      const delta = editQty - editingItem.totalQuantity;
      if (delta !== 0) {
        onScan(editingItem.barcode, delta);
      }
      setEditingItem(null);
    }
  };

  const totalQuantity = items.reduce((acc, item) => acc + item.totalQuantity, 0);
  const expectedTotalQuantity = items.some(i => i.expectedQty !== undefined) 
    ? items.reduce((acc, item) => acc + (item.expectedQty || 0), 0)
    : undefined;

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-black relative z-10">
      {/* FULL SCREEN FLASH OVERLAY (TACTICAL EVOLUTION) */}
      {feedback === 'success' && <div className="fixed inset-0 bg-emerald-500/40 z-[200] pointer-events-none animate-in fade-in duration-100" />}
      {feedback === 'error' && <div className="fixed inset-0 bg-rose-600/60 z-[200] pointer-events-none animate-in fade-in duration-100" />}
      {feedback === 'unknown' && <div className="fixed inset-0 bg-amber-500/40 z-[200] pointer-events-none animate-in fade-in duration-100" />}
      {feedback === 'undo' && <div className="fixed inset-0 bg-blue-500/40 z-[200] pointer-events-none animate-in fade-in duration-100" />}

      <ScannerHeader 
        onBack={onBack}
        location={location}
        onChangeLocation={onChangeLocation}
        isManualMode={isManualMode}
        onToggleManualMode={handleToggleManualMode}
        onFinalize={onFinalize}
        onLock={onLock}
        onOpenTools={onOpenTools}
      />

      {/* VISOR DE CÁMARA (25% Alto) */}
      <div className={`${isManualMode ? 'hidden' : 'h-[25%]'} relative bg-black shrink-0`}>
        <CameraScanner 
          onScan={onScan} 
          onClose={() => {}} 
          inline={true}
          isTriggered={true}
        />
        <ScannerTargetOverlay feedback={feedback} />
      </div>

      {/* PANEL DE LISTA (Resto del espacio) */}
      <div className="flex-1 min-h-0 bg-slate-950 flex flex-col relative z-10 border-t-2 border-rose-500/50">
        <ScannerSearchBar 
          isSearchActive={isSearchActive}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          setIsSearchActive={setIsSearchActive}
          searchInputRef={searchInputRef}
          totalItems={items.length}
          totalQuantity={totalQuantity}
          expectedTotalQuantity={expectedTotalQuantity}
        />

        {isManualMode && (
          <ManualEntryForm 
            manualInput={manualInput}
            setManualInput={setManualInput}
            onSubmit={onScan}
            inputRef={manualInputRef}
          />
        )}

        {/* LISTA DE ITEMS */}
        <div className={`flex-1 min-h-0 overflow-y-auto no-scrollbar bg-slate-950 ${bottomContent ? 'pb-24' : 'pb-20'}`}>
          {filteredItems.length > 0 ? (
            filteredItems.map((item, index) => (
              <ScannedItemRow 
                key={item.barcode}
                item={item}
                index={index}
                isActive={item.barcode === activeBarcode}
                onScan={onScan}
                onEditQty={allowEditQuantity ? (i) => {
                  setEditingItem(i);
                  setEditQty(i.totalQuantity);
                } : undefined}
              />
            ))
          ) : (
            <div className="h-full flex flex-col items-center justify-center opacity-30">
              <Box className="w-16 h-16 mb-4 text-slate-500" />
              <span className="text-sm font-black uppercase tracking-widest text-slate-400">
                {searchQuery ? 'No hay resultados' : 'Escanea para comenzar'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* FOOTER ADICIONAL (ej. Multiplicador) */}
      {bottomContent}

      {/* MODAL DE EDICIÓN DE CANTIDAD */}
      {allowEditQuantity && (
        <EditQuantityModal 
          editingItem={editingItem}
          editQty={editQty}
          setEditQty={setEditQty}
          onClose={() => setEditingItem(null)}
          onSave={handleEditQtySave}
        />
      )}

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};
