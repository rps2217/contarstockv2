import React, { useState, useRef, useEffect, memo } from 'react';
import { Product, ConsolidatedItem, MatchResult, ExpectedOrder, ExpectedItem } from '../../../types';
import { FeedbackStatus } from '../../../hooks/useFeedbackSystem';
import { ScannerCameraSection } from '../../../shared/components/scanner/layouts';
import { VirtualList } from '../../../shared/components/ui/VirtualList';
import { ScannerFeedbackOverlay } from '../../../shared/components/scanner/layouts/ScannerFeedbackOverlay';
import { ArrowLeft, MapPin, Lock, Unlock, Cloud, CloudOff, Settings, Zap, Barcode, Check, X, Camera, Edit3, List, CheckCircle2 } from 'lucide-react';
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
  expectedItems?: ExpectedItem[];
  scannedBarcodes?: Set<string>;
}

export const CountingCameraView: React.FC<CountingCameraViewProps> = memo(({
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
  potentialMatch,
  onApplyMatch,
  onDismissMatch,
  isManualMode = false,
  onToggleManualMode,
  expectedItems = [],
  scannedBarcodes
}) => {
  const [manualInput, setManualInput] = useState('');
  const manualInputRef = useRef<HTMLInputElement>(null);
  
  // Check if we're in test mode (has expected items)
  const isTestMode = expectedItems.length > 0;

  // Safe defaults
  const safePotentialMatch = potentialMatch ?? null;
  const safeOnApplyMatch = onApplyMatch ?? (() => {});
  const safeOnDismissMatch = onDismissMatch ?? (() => {});
  const safeOnLock = onLock ?? (() => {});
  const safeOnSync = onSync ?? (() => {});

  // Auto-focus manual input
  useEffect(() => {
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

  // Map ConsolidatedItem
  const mappedItems = items.map(item => ({
    barcode: item.barcode,
    name: item.productName,
    totalQuantity: item.barcode === activeBarcode && optimisticQty !== null ? optimisticQty : item.totalQuantity,
    expectedQty: item.expectedQuantity && item.expectedQuantity > 0 ? item.expectedQuantity : undefined
  }));

  // Stats
  const totalQuantity = items.reduce((acc, item) => acc + item.totalQuantity, 0);
  
  // Expected order stats
  const expectedStats = isTestMode ? {
    total: expectedItems.length,
    scanned: expectedItems.filter(item => 
      scannedBarcodes?.has(normalizeSku(item.barcode)) || 
      items.some(i => normalizeSku(i.barcode) === normalizeSku(item.barcode))
    ).length || 0,
    totalUnits: expectedItems.reduce((acc, i) => acc + i.expectedQty, 0) || 0
  } : null;

  return (
    <div className="fixed inset-0 flex flex-col bg-slate-950 font-sans overflow-hidden">
      {/* FEEDBACK OVERLAY */}
      <ScannerFeedbackOverlay feedback={feedback} />

      {/* ==================== TOP HEADER ==================== */}
      <header className="h-14 px-4 flex items-center justify-between shrink-0 bg-slate-900 border-b border-slate-800">
        {/* LEFT: Back + Title */}
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all"
          >
            <ArrowLeft className="w-5 h-5 text-slate-400" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
              isTestMode 
                ? 'bg-amber-500/10 border-amber-500/20' 
                : 'bg-blue-500/10 border-blue-500/20'
            }`}>
              {isTestMode ? (
                <List className="w-5 h-5 text-amber-400" />
              ) : (
                <Edit3 className="w-5 h-5 text-blue-400" />
              )}
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-wide uppercase">
                {isTestMode ? 'PRUEBA' : 'CONTEO'}
              </h1>
              <p className="text-[10px] text-slate-500 font-mono uppercase">
                {isTestMode ? 'Picking Mode' : 'Conteo Manual'}
              </p>
            </div>
          </div>
        </div>

        {/* CENTER: Location */}
        <button
          onClick={onChangeLocation}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition-all"
        >
          <MapPin className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-bold text-white font-mono">{location}</span>
        </button>

        {/* RIGHT: Actions */}
        <div className="flex items-center gap-2">
          {/* Sync */}
          <button
            onClick={safeOnSync}
            className={`w-10 h-10 flex items-center justify-center rounded-xl border transition-all ${
              isSyncing 
                ? 'bg-blue-500/10 border-blue-500/30' 
                : 'bg-slate-800 border-slate-700 hover:bg-slate-700'
            }`}
          >
            {isSyncing ? (
              <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Cloud className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {/* Lock */}
          <button
            onClick={safeOnLock}
            className="w-10 h-10 flex items-center justify-center bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition-all"
          >
            <Unlock className="w-4 h-4 text-slate-400" />
          </button>

          {/* Settings */}
          <button
            onClick={onOpenTools}
            className="w-10 h-10 flex items-center justify-center bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition-all"
          >
            <Settings className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </header>

      {/* ==================== STATS BAR ==================== */}
      <div className="h-12 px-4 flex items-center justify-between shrink-0 bg-slate-900/50 border-b border-slate-800">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-500/10 rounded-lg flex items-center justify-center">
              <Barcode className="w-3 h-3 text-blue-400" />
            </div>
            <span className="text-sm font-bold text-white">{items.length}</span>
            <span className="text-xs text-slate-500">items</span>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-violet-500/10 rounded-lg flex items-center justify-center">
              <Check className="w-3 h-3 text-violet-400" />
            </div>
            <span className="text-sm font-bold text-violet-400">{totalQuantity}</span>
            <span className="text-xs text-slate-500">unidades</span>
          </div>

          {isTestMode && expectedStats && (
            <>
              <div className="w-px h-5 bg-slate-700" />
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Esperados:</span>
                <span className="text-sm font-bold text-amber-400">{expectedStats.totalUnits}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">SKUs:</span>
                <span className="text-sm font-bold text-emerald-400">{expectedStats.scanned}/{expectedStats.total}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ==================== SCAN AREA (30%) ==================== */}
      <div className="h-[30%] shrink-0 flex flex-col bg-black relative">
        {/* Mode Toggle */}
        <div className="absolute top-2 right-2 z-30">
          <button
            onClick={onToggleManualMode}
            className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-sm text-white px-4 py-2 rounded-full border border-slate-700 active:scale-95 transition-all"
          >
            {isManualMode ? (
              <>
                <Camera className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-bold">Cámara</span>
              </>
            ) : (
              <>
                <Barcode className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold">Manual</span>
              </>
            )}
          </button>
        </div>

        {/* Camera or Manual Input */}
        {isManualMode ? (
          <div className="flex-1 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-lg">
              <div className="relative mb-4">
                <div className="absolute left-4 top-1/2 -translate-y-1/2">
                  <Barcode className={`w-8 h-8 ${manualInput ? 'text-blue-500' : 'text-slate-600'}`} />
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
                  className="w-full bg-black border-2 border-slate-700 rounded-2xl py-5 pl-14 pr-6 text-2xl font-black focus:outline-none focus:border-blue-500 text-white tracking-wider"
                  placeholder="INGRESAR SKU"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
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
            </div>
          </div>
        ) : (
          <div className="flex-1 relative overflow-hidden">
            <ScannerCameraSection 
              onScan={(code) => onScan(code, multiplier)}
              feedback={feedback}
              onCloseCamera={onToggleManualMode}
            />
          </div>
        )}
      </div>

      {/* ==================== SEARCH BAR ==================== */}
      <div className="px-4 py-2 bg-slate-900/50 border-b border-slate-800 shrink-0">
        <input
          type="text"
          placeholder="Buscar producto..."
          className="w-full h-10 px-4 bg-slate-800 rounded-xl border border-slate-700 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* ==================== EXPECTED ORDER LIST (ONLY IN TEST MODE) ==================== */}
      {isTestMode && expectedItems.length > 0 && (
        <div className="shrink-0 max-h-[40%] overflow-hidden flex flex-col bg-slate-900 border-b border-amber-500/20">
          <div className="h-10 px-4 flex items-center justify-between shrink-0 bg-slate-950/80 border-b border-white/5">
            <div className="flex items-center gap-2">
              <List className="w-4 h-4 text-amber-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">CARGA TEÓRICA</span>
            </div>
            <div className="flex items-center gap-4 text-[10px]">
              <span className="text-slate-500">Progreso:</span>
              <span className="font-bold text-emerald-400">{expectedStats?.scanned}/{expectedStats?.total} SKUs</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {expectedItems.map((item) => {
              const normBarcode = normalizeSku(item.barcode);
              const scannedItem = items.find(i => normalizeSku(i.barcode) === normBarcode);
              const scannedQty = scannedItem?.totalQuantity || 0;
              const isScanned = scannedQty > 0;
              
              return (
                <div 
                  key={item.barcode}
                  className={`flex items-center gap-3 px-4 py-3 border-b border-white/5 ${
                    isScanned ? 'bg-emerald-500/10' : 'hover:bg-white/5'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    isScanned ? 'bg-emerald-500/20' : 'bg-slate-800'
                  }`}>
                    {isScanned ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <Barcode className="w-5 h-5 text-slate-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-bold truncate ${isScanned ? 'text-emerald-400' : 'text-white'}`}>
                      {item.name || item.barcode}
                    </div>
                    <div className="text-[9px] text-slate-500 font-mono">{item.barcode}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`text-lg font-black ${isScanned ? 'text-emerald-400' : 'text-slate-400'}`}>
                      {scannedQty > 0 ? scannedQty : 0} / {item.expectedQty}
                    </div>
                    <div className="text-[8px] text-slate-500 uppercase">pisteado / esperado</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ==================== SCANNED ITEMS LIST (ONLY IN NON-TEST MODE) ==================== */}
      {!isTestMode && (
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="flex-1 min-h-0 overflow-y-auto">
            {mappedItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-12">
                <Barcode className="w-16 h-16 text-slate-700 mb-4" />
                <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">
                  Escanea para comenzar
                </span>
              </div>
            ) : (
              mappedItems.map((item) => (
                <div 
                  key={item.barcode}
                  className={`flex items-center gap-3 px-4 py-3 border-b border-white/5 ${
                    item.barcode === activeBarcode ? 'bg-blue-500/10' : ''
                  }`}
                >
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
                      <div className="text-[9px] text-amber-500">/ {item.expectedQty}</div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ==================== FOOTER ==================== */}
      <footer className="shrink-0 bg-slate-900 border-t border-slate-800">
        <div className="h-14 px-4 flex items-center justify-between">
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
                    : 'bg-slate-800 text-slate-400 active:bg-slate-700'
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
      </footer>

      {/* ==================== AI OVERLAY ==================== */}
      {safePotentialMatch && (
        <div className="absolute top-20 left-4 right-4 z-[120] animate-in slide-in-from-top duration-300">
          <div className="bg-indigo-600/95 backdrop-blur-md border-2 border-indigo-400 rounded-3xl p-4 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="bg-white/20 p-1.5 rounded-lg">
                  <Zap className="w-4 h-4 text-white animate-pulse" />
                </div>
                <span className="text-[10px] font-black text-white uppercase tracking-widest">Inferencia IA</span>
              </div>
              <button onClick={safeOnDismissMatch} className="text-white/60 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <h3 className="text-white font-black text-lg uppercase">
              ¿Es la Orden {safePotentialMatch.expectedOrder.internalId}?
            </h3>
            <p className="text-indigo-200 text-[10px] font-bold uppercase mt-1">
              {safePotentialMatch.matchScore.toFixed(0)}% de coincidencia
            </p>
            <button 
              onClick={safeOnApplyMatch}
              className="w-full mt-4 bg-white text-indigo-600 py-3 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-transform"
            >
              Vincular Ahora
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

CountingCameraView.displayName = 'CountingCameraView';

