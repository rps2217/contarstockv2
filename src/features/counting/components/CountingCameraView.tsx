import React, { useState, useRef } from 'react';
import { Product, ConsolidatedItem, MatchResult, ExpectedOrder } from '../../../types';
import { FeedbackStatus } from '../../../hooks/useFeedbackSystem';
import { ScannerCameraSection } from '../../../shared/components/scanner/layouts';
import { ManualEntryForm } from '../../../shared/components/scanner/ManualEntryForm';
import { ScannerHeader } from '../../../shared/components/scanner/ScannerHeader';
import { VirtualList } from '../../../shared/components/ui/VirtualList';
import { ScannerFeedbackOverlay } from '../../../shared/components/scanner/layouts/ScannerFeedbackOverlay';
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
  isManualMode,
  onToggleManualMode,
  expectedOrder,
  scannedBarcodes
}) => {
  const [manualInput, setManualInput] = useState('');
  const manualInputRef = useRef<HTMLInputElement>(null);
  
  // Check if we're in test mode (has expected order)
  const isTestMode = !!expectedOrder;

  // Auto-focus manual input
  React.useEffect(() => {
    if (isManualMode) {
      const timer = setTimeout(() => manualInputRef.current?.focus(), 150);
      return () => clearTimeout(timer);
    }
  }, [isManualMode]);

  // Handle manual scan submit
  const handleManualSubmit = (code: string) => {
    if (code.trim()) {
      onScan(code.trim(), multiplier);
      setManualInput('');
    }
  };

  // Map ConsolidatedItem to ScannedItemProps
  const mappedItems = items.map(item => ({
    barcode: item.barcode,
    name: item.productName,
    totalQuantity: item.barcode === activeBarcode && optimisticQty !== null ? optimisticQty : item.totalQuantity,
    expectedQty: item.expectedQuantity && item.expectedQuantity > 0 ? item.expectedQuantity : undefined
  }));

  // Calculate stats
  const totalQuantity = items.reduce((acc, item) => acc + item.totalQuantity, 0);
  const expectedTotalQuantity = items.some(i => i.expectedQuantity) 
    ? items.reduce((acc, item) => acc + (item.expectedQuantity || 0), 0)
    : undefined;

  // Totals for expected order
  const expectedStats = isTestMode ? {
    total: expectedOrder?.items.length || 0,
    scanned: expectedOrder?.items.filter(item => 
      scannedBarcodes?.has(normalizeSku(item.barcode)) || 
      items.some(i => normalizeSku(i.barcode) === normalizeSku(item.barcode))
    ).length || 0,
    totalUnits: expectedOrder?.items.reduce((acc, i) => acc + i.expectedQty, 0) || 0
  } : null;

  return (
    <div className="relative h-full w-full flex flex-col bg-black">
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
      />

      {/* UNIFIED SCAN AREA (40% height) */}
      <div className="h-[40%] shrink-0 bg-slate-950 border-b border-white/10 flex flex-col relative">
        {/* Mode toggle */}
        <div className="absolute top-2 right-2 z-30">
          <button
            onClick={onToggleManualMode}
            className="flex items-center gap-2 bg-black/70 backdrop-blur-sm text-white px-4 py-2 rounded-full border border-white/20 active:scale-95 transition-all"
          >
            {isManualMode ? (
              <>
                <Camera className="w-4 h-4" />
                <span className="text-xs font-bold">Cámara</span>
              </>
            ) : (
              <>
                <Barcode className="w-4 h-4" />
                <span className="text-xs font-bold">Manual</span>
              </>
            )}
          </button>
        </div>

        {/* Camera or Manual Input */}
        {isManualMode ? (
          // Manual Input Mode
          <div className="flex-1 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md">
              <div className="relative mb-4">
                <div className="absolute left-4 top-1/2 -translate-y-1/2">
                  <Barcode className={`w-8 h-8 transition-colors ${manualInput ? 'text-blue-500' : 'text-slate-700'}`} />
                </div>
                <input
                  ref={manualInputRef}
                  type="text"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && manualInput.trim()) {
                      handleManualSubmit(manualInput);
                    }
                  }}
                  className="w-full bg-black border-2 border-white/20 rounded-2xl py-5 pl-16 pr-6 text-2xl font-black focus:outline-none focus:border-blue-500 text-white tracking-wider"
                  placeholder="ESCANEAR / INGRESAR SKU"
                  autoComplete="off"
                />
              </div>
              <button
                onClick={() => handleManualSubmit(manualInput)}
                disabled={!manualInput.trim()}
                className={`w-full py-4 rounded-2xl font-black text-lg uppercase tracking-wider transition-all flex items-center justify-center gap-3 ${
                  manualInput.trim()
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-[0.98]'
                    : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                }`}
              >
                <Check className="w-5 h-5" />
                REGISTRAR
              </button>
              <p className="text-center text-[9px] text-slate-600 mt-2 uppercase tracking-widest">
                Presiona ENTER o toca REGISTRAR
              </p>
            </div>
          </div>
        ) : (
          // Camera Mode
          <div className="flex-1 relative">
            <ScannerCameraSection 
              onScan={onScan}
              feedback={feedback}
              onCloseCamera={onToggleManualMode}
            />
          </div>
        )}
      </div>

      {/* TEST MODE: Expected Order List (scrollable) */}
      {isTestMode && expectedOrder && (
        <div className="shrink-0 bg-slate-900 border-b border-amber-500/20 max-h-[25%] overflow-hidden flex flex-col">
          {/* Header with stats */}
          <div className="h-12 bg-slate-950/80 border-b border-white/5 flex items-center px-4 justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <List className="w-4 h-4 text-amber-400" />
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">CARGA TEÓRICA</span>
              </div>
              <div className="flex items-center gap-2 text-[9px]">
                <span className="text-slate-500">SKU:</span>
                <span className="font-bold text-emerald-400">{expectedStats?.scanned}/{expectedStats?.total}</span>
                <span className="text-slate-600">|</span>
                <span className="text-slate-500">Uds:</span>
                <span className="font-bold text-white">{totalQuantity}/{expectedStats?.totalUnits}</span>
              </div>
            </div>
            {/* Progress bar */}
            <div className="w-20 h-2 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-500 transition-all"
                style={{ width: `${expectedStats && expectedStats.total > 0 ? (expectedStats.scanned / expectedStats.total) * 100 : 0}%` }}
              />
            </div>
          </div>
          {/* Scrollable list */}
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
                      isScanned ? 'text-emerald-400' : 'text-white'
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
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SCANNED ITEMS LIST */}
      <div className="flex-1 min-h-0 bg-slate-950 flex flex-col relative z-10">
        {/* Stats bar */}
        <div className="h-10 bg-slate-900/50 border-b border-white/5 flex items-center px-4 justify-between shrink-0">
          <div className="flex items-center gap-4 text-[10px]">
            <span className="text-slate-500">Items: <span className="font-bold text-white">{items.length}</span></span>
            <span className="text-slate-500">Total: <span className="font-bold text-white">{totalQuantity}</span></span>
            {expectedTotalQuantity && (
              <span className="text-amber-500">Meta: <span className="font-bold">{expectedTotalQuantity}</span></span>
            )}
          </div>
        </div>
        
        {/* Virtual list */}
        <div className="flex-1 min-h-0">
          <VirtualList
            items={mappedItems}
            itemHeight={80}
            renderRow={({ item }) => (
              <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 bg-slate-950">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  item.barcode === activeBarcode ? 'bg-blue-500/20' : 'bg-slate-800'
                }`}>
                  <Barcode className={`w-5 h-5 ${item.barcode === activeBarcode ? 'text-blue-400' : 'text-slate-500'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-white truncate">{item.name || item.barcode}</div>
                  <div className="text-[10px] text-slate-500 font-mono">{item.barcode}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-lg font-black text-white">{item.totalQuantity}</div>
                  {item.expectedQty && (
                    <div className="text-[9px] text-slate-500">
                      / {item.expectedQty} esperado
                    </div>
                  )}
                </div>
              </div>
            )}
            emptyState={
              <div className="flex flex-col items-center justify-center h-full py-12">
                <Barcode className="w-16 h-16 text-slate-600 mb-4" />
                <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">
                  {isTestMode ? 'Pistea productos de la lista' : 'Escanea para comenzar'}
                </span>
              </div>
            }
          />
        </div>
      </div>

      {/* FOOTER */}
      <div className="shrink-0 bg-slate-900 border-t border-white/10">
        <div className="h-14 flex items-center px-4 justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Multiplicador</span>
          </div>
          <div className="flex items-center gap-2">
            {[1, 6, 12, 24].map(m => (
              <button
                key={m}
                onClick={() => onMultiplierChange(m)}
                className={`w-12 h-10 rounded-xl font-black text-sm transition-all ${
                  multiplier === m 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' 
                    : 'bg-white/5 text-slate-400 active:bg-white/10'
                }`}
              >
                x{m}
              </button>
            ))}
          </div>
        </div>
        <div className="p-3">
          <button 
            onClick={onFinalize}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-lg shadow-emerald-900/20"
          >
            <Check className="w-5 h-5" />
            Finalizar y Enviar
          </button>
        </div>
      </div>

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

