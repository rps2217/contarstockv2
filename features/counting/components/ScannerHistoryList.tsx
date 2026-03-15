
import React, { memo } from 'react';
import { History } from 'lucide-react';
import { VirtualList } from '../../../shared/components/ui/VirtualList';
import { normalizeSku } from '../../../services/utils';
import { getRowStyles } from '../../../services/uiLogic';

const HistoryRow = memo(({ index, data }: any) => {
 const item = data.items[index];
 if (!item) return null;
 const { onSelect, activeBarcode, optimisticQty } = data;
 const isActive = activeBarcode === normalizeSku(item.barcode);
 const displayQty = isActive ? optimisticQty : item.totalQuantity;
 
 return (
 <div className="px-2 py-1 h-full">
 <button onClick={() => onSelect(item.barcode)} className={getRowStyles(displayQty, item.expectedQuantity, isActive)}>
 <div className="flex-1 min-w-0 pr-4">
 <span className="text-[8px] font-black font-mono tracking-widest opacity-40 uppercase block mb-0.5">{item.barcode}</span>
 <h3 className="font-black text-[12px] uppercase truncate leading-none text-white/90">{item.productName}</h3>
 </div>
 <div className="text-right">
 <div className="text-2xl font-black tabular-nums leading-none">
 {displayQty}
 {item.expectedQuantity > 0 && <span className="text-[10px] opacity-40 ml-1">/ {item.expectedQuantity}</span>}
 </div>
 </div>
 </button>
 </div>
 );
});

interface Props {
 items: any[];
 activeBarcode: string | null;
 optimisticQty: number;
 onSelect: (barcode: string) => void;
}

export const ScannerHistoryList: React.FC<Props> = memo(({ items, activeBarcode, optimisticQty, onSelect }) => {
 const rowData = React.useMemo(() => ({ 
 onSelect, 
 activeBarcode, 
 optimisticQty 
 }), [onSelect, activeBarcode, optimisticQty]);

 return (
 <div className="flex-1 min-h-0 bg-black">
 <VirtualList 
 items={items} 
 itemHeight={70} 
 renderRow={HistoryRow} 
 rowData={rowData} 
 emptyState={
 <div className="flex flex-col items-center opacity-10 mt-12">
 <History className="w-12 h-12 mb-3" />
 <p className="text-[8px] font-black uppercase tracking-[0.4em]">Sin movimientos</p>
 </div>
 } 
 />
 </div>
 );
});
