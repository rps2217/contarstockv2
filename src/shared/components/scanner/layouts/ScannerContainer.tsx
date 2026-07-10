/**
 * ScannerContainer - Wrapper principal para layouts de escaneo
 * 
 * Responsabilidades:
 * - Manejar estado global del scanner (manual/cámara)
 * - Feedback visual overlay
 * - Renderizar children en slots correctos
 */

import React, { useState, useRef, useEffect } from 'react';
import { Box } from 'lucide-react';
import { FeedbackStatus } from '../../../../hooks/useFeedbackSystem';
import { ScannerHeader } from '../ScannerHeader';
import { VirtualList } from '../../ui/VirtualList';
import { ScannerSearchBar } from '../ScannerSearchBar';
import { ManualEntryForm } from '../ManualEntryForm';
import { ScannedItemRow, ScannedItemProps } from '../ScannedItemRow';
import { EditQuantityModal } from '../EditQuantityModal';
import { ScannerFeedbackOverlay } from './ScannerFeedbackOverlay';
import { LabelPreviewModal } from './LabelPreviewModal';

interface ScannerContainerProps {
  // Header
  location: string;
  onChangeLocation: () => void;
  onBack: () => void;
  isManualMode: boolean;
  onToggleManualMode: () => void;
  onFinalize: () => void;
  onLock?: () => void;
  onOpenTools: () => void;
  onSync?: () => void;
  isSyncing?: boolean;
  autoSyncEnabled?: boolean;
  
  // Content
  activeBarcode: string | null;
  items: ScannedItemProps[];
  feedback: FeedbackStatus;
  allowEditQuantity?: boolean;
  onScan: (code: string, qtyOverride?: number) => void;
  
  // Optional sections
  cameraSection?: React.ReactNode;
  bottomContent?: React.ReactNode;
  labelPhoto?: string;
}

// Componente memoizado para filas
const ScannedItemRowWrapper = React.memo(
  ({ item, data }: { item: ScannedItemProps; data: any }) => {
    if (!item) return null;
    const { activeBarcode, allowEditQuantity, setEditingItem, setEditQty } = data;

    return (
      <ScannedItemRow 
        item={item}
        isActive={item.barcode === activeBarcode}
        onScan={() => {}}
        onEditQty={allowEditQuantity ? () => {
          setEditingItem(item);
          setEditQty(item.totalQuantity);
        } : undefined}
      />
    );
  },
  (prev, next) => {
    if (prev.item !== next.item) return false;
    const wasActive = prev.item.barcode === prev.data.activeBarcode;
    const isActive = next.item.barcode === next.data.activeBarcode;
    if (wasActive !== isActive) return false;
    return true;
  }
);

export const ScannerContainer: React.FC<ScannerContainerProps> = ({
  location,
  onChangeLocation,
  onBack,
  isManualMode,
  onToggleManualMode,
  onFinalize,
  onLock,
  onOpenTools,
  onSync,
  isSyncing,
  autoSyncEnabled,
  activeBarcode,
  items,
  feedback,
  allowEditQuantity = false,
  onScan,
  cameraSection,
  bottomContent,
  labelPhoto,
}) => {
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Edit state
  const [editingItem, setEditingItem] = useState<ScannedItemProps | null>(null);
  const [editQty, setEditQty] = useState(0);
  
  // Manual mode state
  const [manualInput, setManualInput] = useState('');
  const manualInputRef = useRef<HTMLInputElement>(null);
  
  // Label preview
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Auto-focus manual input
  useEffect(() => {
    if (!isManualMode) return;
    const timer = setTimeout(() => manualInputRef.current?.focus(), 150);
    return () => clearTimeout(timer);
  }, [isManualMode]);

  // Filtered items
  const filteredItems = React.useMemo(() => items.filter(item => 
    item.barcode.includes(searchQuery) || 
    item.name?.toLowerCase().includes(searchQuery.toLowerCase())
  ), [items, searchQuery]);

  // Totals
  const totalQuantity = React.useMemo(() => 
    items.reduce((acc, item) => acc + item.totalQuantity, 0), [items]);
  const expectedTotalQuantity = React.useMemo(() => 
    items.some(i => i.expectedQty !== undefined) 
      ? items.reduce((acc, item) => acc + (item.expectedQty || 0), 0)
      : undefined
  , [items]);

  // Handlers
  const handleEditQtySave = () => {
    if (editingItem) {
      const delta = editQty - editingItem.totalQuantity;
      if (delta !== 0) onScan(editingItem.barcode, delta);
      setEditingItem(null);
    }
  };

  const rowData = React.useMemo(() => ({
    activeBarcode,
    allowEditQuantity,
    setEditingItem,
    setEditQty
  }), [activeBarcode, allowEditQuantity]);

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-black relative z-10">
      {/* FEEDBACK OVERLAY */}
      <ScannerFeedbackOverlay feedback={feedback} />

      {/* HEADER */}
      <ScannerHeader 
        onBack={onBack}
        location={location}
        onChangeLocation={onChangeLocation}
        isManualMode={isManualMode}
        onToggleManualMode={onToggleManualMode}
        onFinalize={onFinalize}
        onLock={onLock}
        onOpenTools={onOpenTools}
        onSync={onSync}
        isSyncing={isSyncing}
        autoSyncEnabled={autoSyncEnabled}
      />

      {/* CAMERA SECTION */}
      {cameraSection && (
        <div className="h-[20%] relative bg-black shrink-0">
          {cameraSection}
          {labelPhoto && (
            <button 
              onClick={() => setIsPreviewOpen(true)}
              className="absolute bottom-2 right-2 z-40 w-10 h-10 bg-black/60 border border-white/20 rounded-xl flex items-center justify-center text-white active:scale-95 transition-all"
            >
              <Box className="w-5 h-5" />
            </button>
          )}
        </div>
      )}

      {/* LABEL PREVIEW */}
      <LabelPreviewModal labelPhoto={labelPhoto} onClose={() => setIsPreviewOpen(false)} />

      {/* LIST SECTION */}
      <div className="flex-1 min-h-0 bg-base flex flex-col relative z-10 border-t border-rose-500/30">
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

        <div className={`flex-1 min-h-0 bg-base ${bottomContent ? 'pb-36' : 'pb-20'}`}>
          <VirtualList
            items={filteredItems}
            itemHeight={86}
            renderRow={ScannedItemRowWrapper}
            rowData={rowData}
            emptyState={
              <>
                <Box className="w-16 h-16 mb-4 text-slate-500" />
                <span className="text-sm font-black uppercase tracking-widest text-muted">
                  {searchQuery ? 'No hay resultados' : 'Escanea para comenzar'}
                </span>
              </>
            }
          />
        </div>
      </div>

      {bottomContent}

      {allowEditQuantity && editingItem && (
        <EditQuantityModal 
          editingItem={editingItem}
          editQty={editQty}
          setEditQty={setEditQty}
          onClose={() => setEditingItem(null)}
          onSave={handleEditQtySave}
        />
      )}

      <style>{`.no-scrollbar::-webkit-scrollbar { display: none; } .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}</style>
    </div>
  );
};
