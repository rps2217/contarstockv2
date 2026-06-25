import React from 'react';
import { Product, ConsolidatedItem, MatchResult, ExpectedOrder, ExpectedItem } from '../../../types';
import { FeedbackStatus } from '../../../hooks/useFeedbackSystem';
import { ScannerContainer } from '../../../shared/components/scanner/layouts';
import { ScannerCameraSection } from '../../../shared/components/scanner/layouts';
import { Zap, X, Check, Barcode, List, Camera, CheckCircle2 } from 'lucide-react';
import { normalizeSku } from '../../../services/utils';

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
  isManualMode?: boolean;
  onToggleManualMode?: () => void;
  // Test mode props
  expectedOrder?: ExpectedOrder | null;
  scannedBarcodes?: Set<string>;
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
  onDismissMatch,
  isManualMode = false,
  onToggleManualMode,
  expectedOrder,
  scannedBarcodes
}) => {
  const activeItemName = activeProduct?.name || items.find(i => i.barcode === activeBarcode)?.productName;
  
  // Check if we're in test mode (has expected order)
  const isTestMode = !!expectedOrder;

  // Map ConsolidatedItem to ScannedItemProps
  const mappedItems = items.map(item => ({
    barcode: item.barcode,
    name: item.productName,
    totalQuantity: item.barcode === activeBarcode && optimisticQty !== null ? optimisticQty : item.totalQuantity,
    expectedQty: item.expectedQuantity && item.expectedQuantity > 0 ? item.expectedQuantity : undefined
  }));

  // Camera section content - solo mostrar si NO está en modo manual Y NO está en test mode
  const cameraSection = !isManualMode && !isTestMode ? (
    <ScannerCameraSection 
      onScan={onScan} 
      feedback={feedback}
      onCloseCamera={onToggleManualMode}
    />
  ) : null;
  
  // Expected order list for test mode
  const expectedListSection = isTestMode && expectedOrder ? (
    <div className="h-[35%] bg-slate-900 border-b border-white/10 overflow-hidden flex flex-col shrink-0">
      <div className="h-10 bg-slate-950/80 border-b border-white/5 flex items-center px-4 justify-between shrink-0">
        <div className="flex items-center gap-2">
          <List className="w-4 h-4 text-amber-400" />
          <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">CARGA TEÓRICA</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-bold text-slate-500">
            {expectedOrder.items.length} SKUs
          </span>
          {onToggleManualMode && (
            <button
              onClick={onToggleManualMode}
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full transition-colors"
            >
              {isManualMode ? (
                <>
                  <Camera className="w-3 h-3" />
                  <span className="text-[9px] font-bold">Cámara</span>
                </>
              ) : (
                <>
                  <Barcode className="w-3 h-3" />
                  <span className="text-[9px] font-bold">Manual</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {expectedOrder.items.map((item) => {
          const normBarcode = normalizeSku(item.barcode);
          const isScanned = scannedBarcodes?.has(normBarcode) || items.some(i => normalizeSku(i.barcode) === normBarcode);
          const scannedQty = items.find(i => normalizeSku(i.barcode) === normBarcode)?.totalQuantity || 0;
          
          return (
            <div 
              key={item.barcode}
              className={`flex items-center gap-3 px-4 py-2.5 border-b border-white/5 transition-colors ${
                isScanned ? 'bg-emerald-500/5' : 'hover:bg-white/5'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                isScanned ? 'bg-emerald-500/20' : 'bg-slate-800'
              }`}>
                {isScanned ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Barcode className="w-4 h-4 text-slate-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-xs font-bold truncate ${
                  isScanned ? 'text-emerald-400 line-through opacity-60' : 'text-white'
                }`}>
                  {item.name || item.barcode}
                </div>
                <div className="text-[9px] text-slate-500 font-mono">{item.barcode}</div>
              </div>
              <div className="text-right shrink-0">
                <div className={`text-sm font-black ${
                  isScanned ? 'text-emerald-400' : 'text-slate-400'
                }`}>
                  {isScanned ? `${scannedQty}/${item.expectedQty}` : item.expectedQty}
                </div>
                {!isScanned && (
                  <button
                    onClick={() => onScan(item.barcode)}
                    className="text-[9px] font-bold text-blue-400 hover:text-blue-300 uppercase"
                  >
                    + PISTEAR
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  ) : null;

  // Footer with multiplier
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
      {/* Expected order list for test mode */}
      {expectedListSection}
      
      <ScannerContainer
        location={location}
        onChangeLocation={onChangeLocation}
        onBack={onBack}
        isManualMode={isManualMode}
        onToggleManualMode={onToggleManualMode || (() => {})}
        onFinalize={onFinalize}
        onLock={onLock}
        onOpenTools={onOpenTools}
        onSync={onSync}
        isSyncing={isSyncing}
        activeBarcode={activeBarcode}
        items={mappedItems}
        feedback={feedback}
        allowEditQuantity={false}
        onScan={(code, qtyOverride) => onScan(code, qtyOverride ?? multiplier)}
        cameraSection={cameraSection}
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

