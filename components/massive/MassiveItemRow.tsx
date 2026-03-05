
import React, { memo } from 'react';
import { Trash2 } from 'lucide-react';
import { getRowStyles } from '../../services/uiLogic';

interface MassiveItemRowProps {
    index: number;
    data: {
        items: any[];
        onSelect: (barcode: string) => void;
        onRemove: (barcode: string) => void;
        activeBarcode: string | null;
    };
}

export const MassiveItemRow = memo(({ index, data }: MassiveItemRowProps) => {
    const item = data.items[index];
    if (!item) return null;
    const { onSelect, onRemove, activeBarcode } = data;
    const isActive = activeBarcode === item.barcode;
    const className = getRowStyles(item.totalQuantity, item.expectedQty, isActive);

    return (
        <div className="px-3 py-1 h-full flex gap-2">
            <button onClick={() => onSelect(item.barcode)} className={`${className} flex-1`}>
                <div className="flex-1 min-w-0 pr-4">
                    <span className="text-[9px] font-black font-mono tracking-widest block mb-1 opacity-50">
                        {item.barcode}
                    </span>
                    <h3 className="font-black text-[13px] uppercase truncate leading-none">
                        {item.name}
                    </h3>
                    {item.loc && (
                        <div className="text-[7px] font-bold text-white/30 uppercase mt-1">LOC: {item.loc}</div>
                    )}
                </div>
                <div className="text-right">
                    <div className="text-3xl font-black tabular-nums leading-none">{item.totalQuantity}</div>
                    {item.expectedQty !== undefined && (
                        <div className="text-[8px] font-black uppercase opacity-60 mt-1">META: {item.expectedQty}</div>
                    )}
                </div>
            </button>
            
            <button 
                onClick={(e) => { e.stopPropagation(); onRemove(item.barcode); }}
                className="w-12 h-full bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-center text-rose-500 active:bg-rose-500 active:text-white transition-all"
            >
                <Trash2 className="w-5 h-5" />
            </button>
        </div>
    );
});
