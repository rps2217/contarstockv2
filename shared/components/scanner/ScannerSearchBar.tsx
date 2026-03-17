import React from 'react';
import { Search, X, Box } from 'lucide-react';

interface ScannerSearchBarProps {
  isSearchActive: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  setIsSearchActive: (active: boolean) => void;
  searchInputRef: React.RefObject<HTMLInputElement>;
  totalItems: number;
  totalQuantity: number;
  expectedTotalQuantity?: number;
}

export const ScannerSearchBar: React.FC<ScannerSearchBarProps> = ({
  isSearchActive,
  searchQuery,
  setSearchQuery,
  setIsSearchActive,
  searchInputRef,
  totalItems,
  totalQuantity,
  expectedTotalQuantity
}) => {
  return (
    <div className="h-12 bg-slate-900 border-b border-white/10 flex items-center px-3 shrink-0">
      {isSearchActive ? (
        <div className="flex-1 flex items-center bg-black rounded-lg border border-white/20 px-2 h-8">
          <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
          <input 
            ref={searchInputRef}
            autoFocus
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar SKU o nombre..."
            className="flex-1 bg-transparent text-white text-xs outline-none min-w-0"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="p-1 text-slate-400 hover:text-white shrink-0">
              <X className="w-3 h-3" />
            </button>
          )}
          <button 
            onClick={() => { setIsSearchActive(false); setSearchQuery(''); }} 
            className="ml-2 pl-2 border-l border-white/20 text-slate-400 hover:text-white shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-rose-500/20 flex items-center justify-center">
              <Box className="w-3 h-3 text-rose-500" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Registros: {totalItems}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-rose-500 mr-2">
              {expectedTotalQuantity !== undefined 
                ? `Total: ${totalQuantity} / ${expectedTotalQuantity}`
                : `Total: ${totalQuantity}`
              }
            </span>
            <button 
              onClick={() => {
                setIsSearchActive(true);
                setTimeout(() => searchInputRef.current?.focus(), 100);
              }}
              className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 text-white/70 active:bg-white/10 transition-colors"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
