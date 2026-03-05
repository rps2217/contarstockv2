
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
        <div className="px-3 py-1 h-full">
            <div className="relative group h-full">
                <button 
                    onClick={() => onSelect(item.barcode)} 
                    className={`${className} w-full h-full pr-12`}
                >
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
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center active:bg-rose-500 active:text-white transition-all border border-rose-500/20"
                    title="Eliminar registros"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
});
