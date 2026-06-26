import React from 'react';
import { HammerItem } from '../hooks/useHammerLogic';
import { Product } from '../../../types';
import { FeedbackStatus } from '../../../hooks/useFeedbackSystem';
import { ScannerContainer, ScannerCameraSection } from '../../../shared/components/scanner/layouts';
import { Edit3, Zap, Clock, Target, TrendingUp } from 'lucide-react';

interface ProductivityStats {
 itemsPerMinute: number;
 totalItems: number;
 lastScanTime: number | null;
 expectedItems?: number;
}

interface HammerCameraViewProps {
 onBack: () => void;
 onScan: (code: string, qtyOverride?: number) => void;
 onRemove: (barcode: string) => void;
 onFinalize: () => void;
 onOpenTools: () => void;
 onLock?: () => void;
 location: string;
 onChangeLocation: () => void;
 activeBarcode: string | null;
 activeProduct: Product | null;
 feedback: FeedbackStatus;
 items: HammerItem[];
 isVoiceEnabled?: boolean;
 onSync?: () => void;
 isSyncing?: boolean;
 autoSyncEnabled?: boolean;
 pendingWrites?: number;
 syncError?: string | null;
 onRetrySync?: () => void;
 // Productivity stats
 stats?: ProductivityStats;
 formattedDuration?: string;
 // Manual mode
 isManualMode?: boolean;
 onToggleManualMode?: () => void;
}

export const HammerCameraView: React.FC<HammerCameraViewProps> = ({
 onBack,
 onScan,
 onRemove,
 onFinalize,
 onOpenTools,
 onLock,
 location,
 onChangeLocation,
 activeBarcode,
 activeProduct,
 feedback,
 items,
 isVoiceEnabled = false,
 onSync,
 isSyncing = false,
 autoSyncEnabled = false,
 pendingWrites = 0,
 syncError = null,
 onRetrySync,
 stats,
 formattedDuration,
 isManualMode = false,
 onToggleManualMode
}) => {
 const activeItemName = activeProduct?.name || items.find(i => i.barcode === activeBarcode)?.name;
 const hasSyncError = !!syncError;
 
 // Mini productivity bar
 const productivityBar = stats ? (
   <div className="h-12 bg-slate-900/90 border-b border-white/10 flex items-center px-4 gap-4">
     <div className="flex items-center gap-1.5">
       <Zap className="w-3.5 h-3.5 text-emerald-400" />
       <span className="text-xs font-bold text-emerald-400">{stats.itemsPerMinute.toFixed(1)}</span>
       <span className="text-[10px] text-slate-500">/min</span>
     </div>
     <div className="w-px h-6 bg-white/10" />
     <div className="flex items-center gap-1.5">
       <Target className="w-3.5 h-3.5 text-blue-400" />
       <span className="text-xs font-bold text-blue-400">{stats.totalItems}</span>
       <span className="text-[10px] text-slate-500">items</span>
     </div>
     <div className="w-px h-6 bg-white/10" />
     <div className="flex items-center gap-1.5">
       <Clock className="w-3.5 h-3.5 text-slate-400" />
       <span className="text-xs font-bold text-slate-300">{formattedDuration || '00:00'}</span>
     </div>
     {stats.expectedItems !== undefined && (
       <>
         <div className="w-px h-6 bg-white/10" />
         <div className="flex items-center gap-1.5">
           <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
           <span className="text-xs font-bold text-amber-400">{stats.expectedItems}</span>
           <span className="text-[10px] text-slate-500">esperados</span>
         </div>
       </>
     )}
   </div>
 ) : null;

 // Map HammerItem to ScannedItemProps
 const mappedItems = items.map(item => ({
   barcode: item.barcode,
   name: item.name,
   totalQuantity: item.totalQuantity,
   expectedQty: item.expectedQty,
 }));

 // Footer with edit mode indicator + sync status
 const bottomContent = (
   <div className="absolute bottom-0 left-0 right-0 bg-slate-900 border-t border-white/10 flex flex-col z-50">
     {/* Sync Status Bar */}
     {(pendingWrites > 0 || hasSyncError) && (
       <div className={`h-10 flex items-center px-4 justify-between ${hasSyncError ? 'bg-red-900/30 border-b border-red-500/30' : 'border-b border-white/5'}`}>
         <div className="flex items-center gap-2">
           {hasSyncError ? (
             <>
               <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
               <span className="text-xs text-red-400">Error de sincronización</span>
             </>
           ) : pendingWrites > 0 ? (
             <>
               <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
               <span className="text-xs text-amber-400">Guardando {pendingWrites} cambios...</span>
             </>
           ) : null}
         </div>
         {hasSyncError && onRetrySync && (
           <button 
             onClick={onRetrySync}
             className="text-xs text-red-400 hover:text-red-300 font-bold underline"
           >
             Reintentar
           </button>
         )}
       </div>
     )}
     
     <div className="h-14 flex items-center px-4 justify-between border-b border-white/5">
       <div className="flex items-center gap-2">
         <Edit3 className="w-4 h-4 text-blue-400" />
         <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Modo Edición</span>
       </div>
       <span className="text-xs text-slate-500">Toca item para editar</span>
     </div>
     <div className="p-4">
       <button 
         onClick={onFinalize}
         className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-lg shadow-emerald-900/20"
       >
         Finalizar y Cerrar
       </button>
     </div>
   </div>
 );

 // Camera section - solo mostrar si NO está en modo manual
 const cameraSection = !isManualMode ? (
   <ScannerCameraSection 
     onScan={onScan} 
     feedback={feedback}
     onCloseCamera={onToggleManualMode}
   />
 ) : null;

 return (
   <div className="relative h-full w-full">
     {productivityBar}
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
       autoSyncEnabled={autoSyncEnabled}
       activeBarcode={activeBarcode}
       items={mappedItems}
       feedback={feedback}
       allowEditQuantity={true}
       onScan={onScan}
       cameraSection={cameraSection}
       bottomContent={bottomContent}
     />
   </div>
 );
};

