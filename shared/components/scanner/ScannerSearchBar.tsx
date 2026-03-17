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
    <div className="h-16 bg-slate-900 border-b border-white/10 flex items-center px-4 shrink-0">
      {isSearchActive ? (
        <div className="flex-1 flex items-center bg-black rounded-xl border-2 border-white/20 px-3 h-12">
          <Search className="w-5 h-5 text-slate-400 mr-3 shrink-0" />
          <input 
            ref={searchInputRef}
            autoFocus
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar SKU o nombre..."
            className="flex-1 bg-transparent text-white text-base outline-none min-w-0"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="p-2 text-slate-400 hover:text-white shrink-0 active:scale-90 transition-all">
              <X className="w-5 h-5" />
            </button>
          )}
          <button 
            onClick={() => { setIsSearchActive(false); setSearchQuery(''); }} 
            className="ml-2 pl-3 border-l-2 border-white/20 text-slate-400 hover:text-white shrink-0 active:scale-90 transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center">
              <Box className="w-5 h-5 text-rose-500" />
            </div>
            <span className="text-xs font-black uppercase tracking-widest text-slate-400">Registros: {totalItems}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-lg font-black text-rose-500 tracking-wider">
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
              className="w-12 h-12 rounded-xl flex items-center justify-center bg-white/5 text-white/70 active:bg-white/10 active:scale-95 transition-all"
            >
              <Search className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
