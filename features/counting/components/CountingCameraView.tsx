import React from 'react';
import { Product, ConsolidatedItem } from '../../../types';
import { FeedbackStatus } from '../../../hooks/useFeedbackSystem';
import { IndustrialScannerLayout } from '../../../shared/components/scanner/IndustrialScannerLayout';

interface CountingCameraViewProps {
  onBack: () => void;
  onScan: (code: string, qtyOverride?: number) => void;
  onOpenTools: () => void;
  onLock?: () => void;
  location: string;
  onChangeLocation: () => void;
  activeBarcode: string | null;
  activeProduct: Product | null;
  optimisticQty: number | null;
  feedback: FeedbackStatus;
  items: ConsolidatedItem[];
  multiplier: number;
  onMultiplierChange: (m: number) => void;
  labelPhoto?: string;
}

export const CountingCameraView: React.FC<CountingCameraViewProps> = ({
  onBack,
  onScan,
  onOpenTools,
  onLock,
  location,
  onChangeLocation,
  activeBarcode,
  activeProduct,
  optimisticQty,
  feedback,
  items,
  multiplier,
  onMultiplierChange,
  labelPhoto
}) => {
  const activeItemName = activeProduct?.name || items.find(i => i.barcode === activeBarcode)?.productName;

  // Map ConsolidatedItem to ScannedItemProps
  const mappedItems = items.map(item => ({
    barcode: item.barcode,
    name: item.productName,
    totalQuantity: item.barcode === activeBarcode && optimisticQty !== null ? optimisticQty : item.totalQuantity,
    expectedQty: item.expectedQuantity && item.expectedQuantity > 0 ? item.expectedQuantity : undefined
  }));

  const bottomContent = (
    <div className="absolute bottom-0 left-0 right-0 h-16 bg-slate-900 border-t border-white/10 flex items-center px-4 justify-between z-50">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Multiplicador</span>
      </div>
      <div className="flex items-center gap-2">
        {[1, 6, 12, 24].map(m => (
          <button
            key={m}
            onClick={() => onMultiplierChange(m)}
            className={`w-10 h-10 rounded-xl font-black text-sm transition-colors ${multiplier === m ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-400 active:bg-white/10'}`}
          >
            x{m}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <IndustrialScannerLayout
      onBack={onBack}
      onScan={(code, qtyOverride) => onScan(code, qtyOverride ?? multiplier)}
      onFinalize={() => {}} // Not explicitly passed in original, but required by layout. Assuming it's handled by tools or not needed here.
      onOpenTools={onOpenTools}
      onLock={onLock}
      location={location}
      onChangeLocation={onChangeLocation}
      activeBarcode={activeBarcode}
      activeItemName={activeItemName}
      feedback={feedback}
      items={mappedItems}
      allowEditQuantity={false} // Counting uses multiplier, not edit modal
      bottomContent={bottomContent}
      labelPhoto={labelPhoto}
    />
  );
};
