import React from 'react';
import { Product, ConsolidatedItem, MatchResult } from '../../../types';
import { FeedbackStatus } from '../../../hooks/useFeedbackSystem';
import { IndustrialScannerLayout } from '../../../shared/components/scanner/IndustrialScannerLayout';
import { Zap, X, Check } from 'lucide-react';

interface CountingCameraViewProps {
  onBack: () => void;
  onScan: (code: string, qtyOverride?: number) => void;
  onFinalize: () => void;
  onOpenTools: () => void;
  onLock?: () => void;
  onSync?: () => void;
  isSyncing?: boolean;
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
  potentialMatch?: MatchResult | null;
  onApplyMatch?: () => void;
  onDismissMatch?: () => void;
}

export const CountingCameraView: React.FC<CountingCameraViewProps> = ({
  onBack,
  onScan,
  onFinalize,
  onOpenTools,
  onLock,
  onSync,
  isSyncing,
  location,
  onChangeLocation,
  activeBarcode,
  activeProduct,
  optimisticQty,
  feedback,
  items,
  multiplier,
  onMultiplierChange,
  labelPhoto,
  potentialMatch,
  onApplyMatch,
  onDismissMatch
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
    <div className="absolute bottom-0 left-0 right-0 bg-slate-900 border-t border-white/10 flex flex-col z-50">
      <div className="h-14 flex items-center px-4 justify-between border-b border-white/5">
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
      <div className="p-4">
        <button 
          onClick={onFinalize}
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-lg shadow-emerald-900/20"
        >
          <Check className="w-5 h-5" />
          Finalizar y Enviar
        </button>
      </div>
    </div>
  );

  return (
    <div className="relative h-full w-full">
      <IndustrialScannerLayout
        onBack={onBack}
        onScan={(code, qtyOverride) => onScan(code, qtyOverride ?? multiplier)}
        onFinalize={onFinalize}
        onOpenTools={onOpenTools}
        onLock={onLock}
        onSync={onSync}
        isSyncing={isSyncing}
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

      {/* OVERLAY DE INTELIGENCIA PREDICTIVA */}
      {potentialMatch && (
        <div className="absolute top-24 left-4 right-4 z-[120] animate-in slide-in-from-top duration-500">
          <div className="bg-indigo-600/90 backdrop-blur-md border-2 border-indigo-400 rounded-3xl p-4 shadow-2xl shadow-indigo-900/50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="bg-white/20 p-1.5 rounded-lg">
                  <Zap className="w-4 h-4 text-white animate-pulse" />
                </div>
                <span className="text-[10px] font-black text-indigo-100 uppercase tracking-widest">Inferencia IA</span>
              </div>
              <button onClick={onDismissMatch} className="text-white/60 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="mb-4">
              <h3 className="text-white font-black text-lg leading-tight uppercase tracking-tighter">
                ¿Es la Orden {potentialMatch.expectedOrder.internalId}?
              </h3>
              <p className="text-indigo-200 text-[10px] font-bold uppercase mt-1">
                {potentialMatch.matchScore.toFixed(0)}% de coincidencia detectada
              </p>
            </div>

            <div className="flex gap-2">
              <button 
                onClick={onApplyMatch}
                className="flex-1 bg-white text-indigo-600 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                <Check className="w-4 h-4" /> Vincular Ahora
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

