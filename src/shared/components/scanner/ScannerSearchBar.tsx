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
    <div className="h-12 bg-surface border-b border-white/10 flex items-center px-4 shrink-0">
      {isSearchActive ? (
        <div className="flex-1 flex items-center bg-black rounded-lg border border-white/20 px-3 h-9">
          <Search className="w-4 h-4 text-muted mr-2 shrink-0" />
          <input 
            ref={searchInputRef}
            autoFocus
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar SKU..."
            className="flex-1 bg-transparent text-white text-sm outline-none min-w-0"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="p-1 text-muted hover:text-white shrink-0 active:scale-90 transition-all">
              <X className="w-4 h-4" />
            </button>
          )}
          <button 
            onClick={() => { setIsSearchActive(false); setSearchQuery(''); }} 
            className="ml-2 pl-2 border-l border-white/20 text-muted hover:text-white shrink-0 active:scale-90 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-rose-500/20 flex items-center justify-center">
              <Box className="w-4 h-4 text-rose-500" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-muted">SKUs: {totalItems}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-black text-rose-500 tracking-wider">
              {expectedTotalQuantity !== undefined 
                ? `${totalQuantity} / ${expectedTotalQuantity}`
                : `Total: ${totalQuantity}`
              }
            </span>
            <button 
              onClick={() => {
                setIsSearchActive(true);
                setTimeout(() => searchInputRef.current?.focus(), 100);
              }}
              className="w-9 h-9 rounded-lg flex items-center justify-center bg-white/5 text-white/70 active:bg-white/10 active:scale-95 transition-all"
            >
              <Search className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

