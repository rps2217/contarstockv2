/**
 * CommandMenu - Búsqueda global estilo Spotlight/Notion
 * 
 * Accesible via Cmd+K (Mac) o Ctrl+K (Windows/Linux)
 * Busca en: productos, vencimientos, eventos, proveedores
 */

import React, { useState, useEffect, useRef, createContext, useContext, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Package, FileText, Truck, Users, Clock, ArrowRight, X, Command, CalendarClock, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';

interface SearchResult {
  id: string;
  type: 'product' | 'event' | 'guide' | 'provider' | 'reception' | 'expiry';
  title: string;
  subtitle: string;
  icon: React.ElementType;
  url: string;
}

interface CommandMenuProps {
  isOpen: boolean;
  onClose: () => void;
  theme?: 'dark' | 'light';
}

const COLORS: Record<string, string> = {
  product: 'text-blue-400 bg-blue-500/20',
  event: 'text-amber-400 bg-amber-500/20',
  guide: 'text-purple-400 bg-purple-500/20',
  provider: 'text-green-400 bg-green-500/20',
  reception: 'text-rose-400 bg-rose-500/20',
  expiry: 'text-red-400 bg-red-500/20',
};

const ICONS: Record<string, React.ElementType> = {
  product: Package,
  event: FileText,
  guide: FileText,
  provider: Users,
  reception: Truck,
  expiry: CalendarClock,
};

const TYPE_LABELS: Record<string, string> = {
  product: 'Producto',
  event: 'Evento',
  guide: 'Guía',
  provider: 'Proveedor',
  reception: 'Recepción',
  expiry: 'Vencimiento',
};

export const CommandMenu: React.FC<CommandMenuProps> = ({ isOpen, onClose, theme = 'dark' }) => {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Consultas a la base de datos
  const products = useLiveQuery(() => db.products.toArray());
  const sessions = useLiveQuery(() => db.sessions.toArray());
  const providers = useLiveQuery(() => db.providers.toArray());
  const expirations = useLiveQuery(() => db.table('expirations').toArray() as any);

  // Focus input cuando se abre
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Búsqueda en tiempo real
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const q = query.toLowerCase();
    const results: SearchResult[] = [];

    // Productos
    products?.forEach(product => {
      if (product.barcode?.toLowerCase().includes(q) ||
          product.name?.toLowerCase().includes(q) ||
          (product as any).sku?.toLowerCase().includes(q)) {
        results.push({
          id: `product-${product.id}`,
          type: 'product',
          title: product.name || product.barcode || 'Sin nombre',
          subtitle: `${product.barcode || ''} • Stock: ${product.stock || 0}`,
          icon: Package,
          url: `/data/products/${product.id}`
        });
      }
    });

    // Vencimientos
    (expirations as any[])?.forEach((expiry: any) => {
      if (expiry.barcode?.toLowerCase().includes(q) ||
          (expiry as any).productName?.toLowerCase().includes(q) ||
          String(expiry.mm).padStart(2, '0').includes(q) ||
          String(expiry.yyyy).includes(q)) {
        const daysLeft = expiry.daysLeft ?? 0;
        results.push({
          id: `expiry-${expiry.id}`,
          type: 'expiry',
          title: (expiry as any).productName || expiry.barcode || 'Sin nombre',
          subtitle: `${String(expiry.mm).padStart(2, '0')}/${expiry.yyyy} • ${daysLeft < 0 ? `Venció hace ${Math.abs(daysLeft)} días` : `Faltan ${daysLeft} días`}`,
          icon: CalendarClock,
          url: '/expiry'
        });
      }
    });

    // Sesiones de conteo
    sessions?.forEach(session => {
      if (session.id?.toLowerCase().includes(q) ||
          (session as any).erpOrder?.toLowerCase().includes(q) ||
          (session as any).location?.toLowerCase().includes(q)) {
        results.push({
          id: `session-${session.id}`,
          type: 'event',
          title: `Conteo: ${(session as any).erpOrder || session.id}`,
          subtitle: `${(session as any).location || 'Sin ubicación'} • ${(session as any).totalSKUs || 0} SKUs`,
          icon: FileText,
          url: `/reports/${session.id}`
        });
      }
    });

    // Proveedores
    providers?.forEach(provider => {
      if ((provider as any).name?.toLowerCase().includes(q) ||
          (provider as any).rut?.toLowerCase().includes(q)) {
        results.push({
          id: `provider-${provider.id}`,
          type: 'provider',
          title: (provider as any).name || 'Sin nombre',
          subtitle: `RUT: ${(provider as any).rut || 'N/A'}`,
          icon: Users,
          url: '/providers'
        });
      }
    });

    setResults(results.slice(0, 15));
  }, [query, products, sessions, providers, expirations]);

  // Navegación con teclado
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && results[selectedIndex]) {
        e.preventDefault();
        navigate(results[selectedIndex].url);
        onClose();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, navigate, onClose]);

  // Atajo global
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        document.dispatchEvent(new CustomEvent('open-command-menu'));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const isDark = theme !== 'light';
  const bgClass = isDark ? 'bg-surface' : 'bg-white';
  const borderClass = isDark ? 'border-subtle' : 'border-slate-200';
  const textClass = isDark ? 'text-white' : 'text-slate-900';
  const mutedClass = isDark ? 'text-muted' : 'text-slate-500';
  const inputBgClass = isDark ? 'bg-elevated' : 'bg-slate-100';
  const hoverClass = isDark ? 'hover:bg-elevated' : 'hover:bg-slate-100';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="fixed top-[15%] left-1/2 -translate-x-1/2 z-[201] w-full max-w-xl"
          >
            <div className={`${bgClass} rounded-2xl shadow-2xl border ${borderClass} overflow-hidden`}>
              {/* Input */}
              <div className={`flex items-center gap-3 px-4 py-4 border-b ${borderClass}`}>
                <Search className={`w-5 h-5 ${mutedClass}`} />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar productos, vencimientos, eventos, proveedores..."
                  className={`flex-1 bg-transparent border-none outline-none ${textClass} placeholder:text-muted text-base`}
                />
                <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${inputBgClass}`}>
                  <Command className="w-3 h-3" />
                  <span className="text-xs font-bold">K</span>
                </div>
              </div>
	
              {/* Results */}
              <div className="max-h-80 overflow-y-auto">
                {results.length > 0 ? (
                  <div className="p-2">
                    {results.map((result, index) => {
                      const Icon = ICONS[result.type] || Package;
                      const colorClass = COLORS[result.type];
                      return (
                        <button
                          key={result.id}
                          onClick={() => { navigate(result.url); onClose(); }}
                          onMouseEnter={() => setSelectedIndex(index)}
                          className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-colors text-left ${
                            index === selectedIndex ? (isDark ? 'bg-elevated' : 'bg-slate-100') : ''
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorClass}`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={`font-semibold text-sm truncate ${textClass}`}>{result.title}</div>
                            <div className={`text-xs truncate ${mutedClass}`}>{result.subtitle}</div>
                          </div>
                          <div className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${colorClass}`}>
                            {TYPE_LABELS[result.type]}
                          </div>
                          {index === selectedIndex && <ArrowRight className={`w-4 h-4 ${mutedClass}`} />}
                        </button>
                      );
                    })}
                  </div>
                ) : query ? (
                  <div className={`p-8 text-center ${mutedClass}`}>
                    <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm font-semibold">No se encontraron resultados</p>
                    <p className="text-xs mt-1">Intenta con otros términos de búsqueda</p>
                  </div>
                ) : (
                  <div className={`p-8 text-center ${mutedClass}`}>
                    <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm font-semibold">Comienza a escribir para buscar</p>
                    <p className="text-xs mt-1">Productos, vencimientos, eventos y más</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className={`flex items-center justify-between px-4 py-3 border-t ${borderClass}`}>
                <div className="flex items-center gap-4 text-[10px]">
                  <span className={`px-1.5 py-0.5 rounded ${inputBgClass} ${mutedClass}`}>↑↓</span>
                  <span className={mutedClass}>Navegar</span>
                  <span className={`px-1.5 py-0.5 rounded ${inputBgClass} ${mutedClass}`}>↵</span>
                  <span className={mutedClass}>Seleccionar</span>
                  <span className={`px-1.5 py-0.5 rounded ${inputBgClass} ${mutedClass}`}>Esc</span>
                  <span className={mutedClass}>Cerrar</span>
                </div>
                <button onClick={onClose} className={`p-1.5 rounded-lg ${hoverClass}`}>
                  <X className={`w-4 h-4 ${mutedClass}`} />
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// ============================================================
// Provider
// ============================================================

interface CommandMenuContextType {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

const CommandMenuContext = createContext<CommandMenuContextType>({
  isOpen: false,
  open: () => {},
  close: () => {},
});

export function CommandMenuProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handler = () => setIsOpen(true);
    // Escuchar múltiples eventos para abrir el command menu
    document.addEventListener('open-command-menu', handler);
    document.addEventListener('open-global-search', handler);
    // Keyboard shortcut Ctrl+K / Cmd+K
    const keyHandler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };
    document.addEventListener('keydown', keyHandler);
    return () => {
      document.removeEventListener('open-command-menu', handler);
      document.removeEventListener('open-global-search', handler);
      document.removeEventListener('keydown', keyHandler);
    };
  }, []);

  return (
    <CommandMenuContext.Provider value={{
      isOpen,
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
    }}>
      {children}
      <CommandMenu isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </CommandMenuContext.Provider>
  );
}

export function useCommandMenu() {
  return useContext(CommandMenuContext);
}
