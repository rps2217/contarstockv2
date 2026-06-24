/**
 * HammerIndustrialLayout - Layout principal profesional para Hammer
 * 
 * Diseño inspirado en software de warehousing profesional:
 * - Zebra MobilityHub
 * - Honeywell Swift
 * - SAP EWM Mobile
 */

import React, { memo, useState, useEffect } from 'react';
import { 
  ArrowLeft,
  MapPin,
  Lock,
  Unlock,
  Cloud,
  CloudOff,
  RotateCcw,
  Settings,
  Zap,
  Keyboard,
  Edit3,
  Barcode,
  Check,
  AlertCircle,
  X
} from 'lucide-react';
import { IndustrialScannerList } from './IndustrialScannerList';
import { IndustrialScanFeedback } from './IndustrialScanFeedback';
import { KeyboardShortcutsHint } from './KeyboardShortcutsHelp';

interface HammerIndustrialLayoutProps {
  // Data
  items: Array<{
    barcode: string;
    name: string;
    totalQuantity: number;
    expectedQty?: number;
    lastTimestamp: number;
  }>;
  activeBarcode: string | null;
  feedback: 'success' | 'error' | 'undo' | 'added' | 'removed' | null;
  
  // Location
  location: string;
  onChangeLocation: () => void;
  
  // Actions
  onBack: () => void;
  onScan: (code: string) => void;
  onSelectItem: (barcode: string) => void;
  onEditQuantity: (barcode: string) => void;
  onFinalize: () => void;
  onOpenTools: () => void;
  onSync: () => void;
  onLock: () => void;
  
  // States
  isSyncing?: boolean;
  autoSyncEnabled?: boolean;
  isLocked?: boolean;
  pendingWrites?: number;
  syncError?: string | null;
  onRetrySync?: () => void;
  
  // Stats
  stats?: {
    itemsPerMinute: number;
    totalItems: number;
    expectedItems?: number;
  };
  formattedDuration?: string;
}

export const HammerIndustrialLayout: React.FC<HammerIndustrialLayoutProps> = memo(({
  items,
  activeBarcode,
  feedback,
  location,
  onChangeLocation,
  onBack,
  onScan,
  onSelectItem,
  onEditQuantity,
  onFinalize,
  onOpenTools,
  onSync,
  onLock,
  isSyncing = false,
  autoSyncEnabled = false,
  isLocked = false,
  pendingWrites = 0,
  syncError = null,
  onRetrySync,
  stats,
  formattedDuration
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showShortcuts, setShowShortcuts] = useState(false);
  
  // Mostrar atajos brevemente al inicio
  useEffect(() => {
    const timer = setTimeout(() => setShowShortcuts(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  const totalQuantity = items.reduce((acc, i) => acc + i.totalQuantity, 0);
  const hasSyncIssue = pendingWrites > 0 || syncError !== null;

  return (
    <div className="fixed inset-0 flex flex-col bg-slate-950 font-sans overflow-hidden">
      
      {/* ==================== TOP HEADER ==================== */}
      <header className="h-14 px-4 flex items-center justify-between shrink-0 bg-slate-900 border-b border-slate-800">
        
        {/* LEFT: Logo + Title */}
        <div className="flex items-center gap-4">
          {/* Back button */}
          <button
            onClick={onBack}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all"
          >
            <ArrowLeft className="w-5 h-5 text-slate-400" />
          </button>
          
          {/* Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center border border-blue-500/20">
              <Zap className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-wide">HAMMER</h1>
              <p className="text-[10px] text-slate-500 font-mono uppercase">Conteo Masivo</p>
            </div>
          </div>
        </div>

        {/* CENTER: Location */}
        <button
          onClick={onChangeLocation}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 hover:border-slate-600 transition-all"
        >
          <MapPin className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-bold text-white font-mono tracking-wider">{location}</span>
        </button>

        {/* RIGHT: Actions */}
        <div className="flex items-center gap-2">
          {/* Sync Status */}
          <div className={`
            flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all
            ${syncError 
              ? 'bg-red-500/10 border-red-500/30' 
              : isSyncing 
                ? 'bg-blue-500/10 border-blue-500/30' 
                : autoSyncEnabled 
                  ? 'bg-emerald-500/10 border-emerald-500/30' 
                  : 'bg-slate-800 border-slate-700'
            }
          `}>
            {isSyncing ? (
              <>
                <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-[10px] font-bold text-blue-400">SYNC</span>
              </>
            ) : syncError ? (
              <>
                <AlertCircle className="w-4 h-4 text-red-400" />
                <span className="text-[10px] font-bold text-red-400">ERROR</span>
                {onRetrySync && (
                  <button onClick={onRetrySync} className="text-[10px] text-red-400 hover:text-red-300 underline">
                    Retry
                  </button>
                )}
              </>
            ) : autoSyncEnabled ? (
              <>
                <Cloud className="w-4 h-4 text-emerald-400" />
                <span className="text-[10px] font-bold text-emerald-400">CLOUD</span>
              </>
            ) : (
              <>
                <CloudOff className="w-4 h-4 text-slate-500" />
                <span className="text-[10px] font-bold text-slate-500">LOCAL</span>
              </>
            )}
          </div>

          {/* Undo */}
          <button className="w-10 h-10 flex items-center justify-center bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition-all">
            <RotateCcw className="w-4 h-4 text-slate-400" />
          </button>

          {/* Lock */}
          <button
            onClick={onLock}
            className={`
              w-10 h-10 flex items-center justify-center rounded-xl border transition-all
              ${isLocked 
                ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' 
                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-400'
              }
            `}
          >
            {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
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
          {/* Items/min */}
          {stats && (
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                <Zap className="w-3 h-3 text-emerald-400" />
              </div>
              <span className="text-sm font-bold text-emerald-400">{stats.itemsPerMinute.toFixed(1)}</span>
              <span className="text-xs text-slate-500">/min</span>
            </div>
          )}
          
          {/* Total items */}
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-500/10 rounded-lg flex items-center justify-center">
              <Barcode className="w-3 h-3 text-blue-400" />
            </div>
            <span className="text-sm font-bold text-white">{items.length}</span>
            <span className="text-xs text-slate-500">items</span>
          </div>
          
          {/* Total quantity */}
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-violet-500/10 rounded-lg flex items-center justify-center">
              <Check className="w-3 h-3 text-violet-400" />
            </div>
            <span className="text-sm font-bold text-violet-400">{totalQuantity}</span>
            <span className="text-xs text-slate-500">unidades</span>
          </div>

          {/* Expected */}
          {stats?.expectedItems !== undefined && (
            <>
              <div className="w-px h-5 bg-slate-700" />
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Esperados:</span>
                <span className="text-sm font-bold text-amber-400">{stats.expectedItems}</span>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* Time */}
          {formattedDuration && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Duración:</span>
              <span className="text-sm font-bold text-slate-300 font-mono">{formattedDuration}</span>
            </div>
          )}
          
          {/* Pending writes indicator */}
          {pendingWrites > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-500/10 rounded-lg border border-amber-500/20">
              <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-bold text-amber-400">Guardando {pendingWrites}...</span>
            </div>
          )}
        </div>
      </div>

      {/* ==================== MAIN CONTENT ==================== */}
      <div className="flex-1 min-h-0 flex">
        
        {/* SEARCH + LIST */}
        <div className="flex-1 flex flex-col min-w-0">
          
          {/* Search bar */}
          <div className="px-4 py-3 bg-slate-900/30">
            <div className="relative">
              <Barcode className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por código o nombre..."
                className="w-full h-11 pl-11 pr-4 bg-slate-800 rounded-xl border border-slate-700 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-slate-500" />
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <IndustrialScannerList
            items={items}
            activeBarcode={activeBarcode}
            onSelectItem={onSelectItem}
            onEditQuantity={onEditQuantity}
            searchQuery={searchQuery}
          />
        </div>
      </div>

      {/* ==================== FOOTER ==================== */}
      <footer className="h-20 px-4 py-3 flex items-center justify-between shrink-0 bg-slate-900 border-t border-slate-800">
        
        {/* Mode indicator */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center border border-blue-500/20">
            <Edit3 className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <p className="text-xs font-bold text-white uppercase tracking-wider">Modo Edición</p>
            <p className="text-[10px] text-slate-500">Toca un item para editar cantidad</p>
          </div>
        </div>

        {/* Finalize button */}
        <button
          onClick={onFinalize}
          disabled={items.length === 0}
          className={`
            px-8 py-3 rounded-xl font-bold text-sm uppercase tracking-wider transition-all
            ${items.length === 0 
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
              : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg shadow-emerald-500/20 active:scale-[0.98]'
            }
          `}
        >
          Finalizar Conteo
        </button>
      </footer>

      {/* ==================== FEEDBACK OVERLAY ==================== */}
      <IndustrialScanFeedback
        feedback={feedback}
        lastBarcode={activeBarcode || undefined}
      />

      {/* ==================== KEYBOARD HINTS ==================== */}
      {showShortcuts && <KeyboardShortcutsHint />}
    </div>
  );
});

HammerIndustrialLayout.displayName = 'HammerIndustrialLayout';
