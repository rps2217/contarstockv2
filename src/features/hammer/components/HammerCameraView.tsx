import React from 'react';
import { HammerItem } from '../hooks/useHammerLogic';
import { Product } from '../../../types';
import { FeedbackStatus } from '../../../hooks/useFeedbackSystem';
import { ScannerContainer, ScannerCameraSection } from '../../../shared/components/scanner/layouts';
import { Edit3 } from 'lucide-react';

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
 autoSyncEnabled = false
}) => {
 const activeItemName = activeProduct?.name || items.find(i => i.barcode === activeBarcode)?.name;

 // Map HammerItem to ScannedItemProps
 const mappedItems = items.map(item => ({
   barcode: item.barcode,
   name: item.name,
   totalQuantity: item.quantity,
 }));

 // Footer with edit mode indicator
 const bottomContent = (
   <div className="absolute bottom-0 left-0 right-0 bg-slate-900 border-t border-white/10 flex flex-col z-50">
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

 return (
   <div className="relative h-full w-full">
     <ScannerContainer
       location={location}
       onChangeLocation={onChangeLocation}
       onBack={onBack}
       isManualMode={false}
       onToggleManualMode={() => {}}
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
       cameraSection={<ScannerCameraSection onScan={onScan} feedback={feedback} />}
       bottomContent={bottomContent}
     />
   </div>
 );
};

