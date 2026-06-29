/**
 * ProductSearchInput - Componente compartido para búsqueda de productos
 * 
 * Características:
 * - Búsqueda por SKU/barcode en IndexedDB
 * - Autocompletado de nombre de producto
 * - Obtiene políticas de proveedor desde PRODUCTO_PROVEEDOR
 * - Soporte para múltiples temas
 * 
 * Usado en: Expiry, Events, Reports
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Search, Package, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { db } from '@/db';
import { logger } from '@/services/logger';

export interface ProductInfo {
  barcode: string;
  name: string;
  category?: string;
  supplierName?: string;
  supplierRut?: string;
  unitsPerBox?: number;
  // Políticas del proveedor (desde PRODUCTO_PROVEEDOR)
  providerPolicy?: {
    hasExchange: boolean;
    withdrawalDays: number;
    isPrimary: boolean;
  };
}

interface ProductSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onProductFound?: (product: ProductInfo | null) => void;
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  theme?: 'dark' | 'light' | 'high-contrast';
  className?: string;
}

export const ProductSearchInput: React.FC<ProductSearchInputProps> = ({
  value,
  onChange,
  onProductFound,
  placeholder = 'Ingrese SKU o código de barras...',
  disabled = false,
  autoFocus = false,
  theme = 'dark',
  className = '',
}) => {
  const [isSearching, setIsSearching] = useState(false);
  const [product, setProduct] = useState<ProductInfo | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Búsqueda en IndexedDB real
  const searchProduct = useCallback(async (barcode: string) => {
    if (!barcode || barcode.length < 5) {
      setProduct(null);
      return;
    }

    setIsSearching(true);
    
    try {
      // 1. Buscar el producto en la tabla products
      const foundProduct = await db.products.get(barcode);
      
      if (foundProduct) {
        // 2. Buscar políticas del proveedor en PRODUCTO_PROVEEDOR
        let providerPolicy: ProductInfo['providerPolicy'] = undefined;
        
        try {
          // Buscar por productBarcode (IndexedDB usa camelCase)
          const productProviders = await db.table('productProviders')
            .where('productBarcode')
            .equals(barcode)
            .toArray();
          
          if (productProviders && productProviders.length > 0) {
            // Obtener el proveedor primario o el primero
            const pp = productProviders.find(p => p.isPrimary) || productProviders[0];
            
            // También buscar info del proveedor
            const provider = await db.table('providers').get(pp.providerRut);
            
            providerPolicy = {
              hasExchange: pp.hasExchange ?? pp.has_exchange ?? provider?.hasExchange ?? false,
              withdrawalDays: pp.withdrawalDays ?? pp.withdrawal_days ?? provider?.withdrawalDays ?? 30,
              isPrimary: pp.isPrimary ?? false,
            };
          } else {
            // Fallback: buscar solo en providers
            const provider = foundProduct.supplierRut 
              ? await db.table('providers').get(foundProduct.supplierRut)
              : undefined;
            if (provider) {
              providerPolicy = {
                hasExchange: provider.hasExchange ?? false,
                withdrawalDays: provider.withdrawalDays ?? 30,
                isPrimary: true,
              };
            }
          }
        } catch (ppError) {
          logger.warn('ProductSearchInput', 'No se pudo obtener políticas del proveedor', String(ppError));
        }

        // 3. Mapear campos del producto al formato esperado
        const productInfo: ProductInfo = {
          barcode: foundProduct.barcode,
          name: foundProduct.name,
          category: foundProduct.category,
          supplierName: foundProduct.supplier,
          supplierRut: foundProduct.supplierRut,
          unitsPerBox: foundProduct.unitsPerBox,
          providerPolicy,
        };
        
        setProduct(productInfo);
        onProductFound?.(productInfo);
      } else {
        setProduct(null);
        onProductFound?.(null);
      }
    } catch (error) {
      logger.error('ProductSearchInput', 'Error searching product', String(error));
      setProduct(null);
      onProductFound?.(null);
    } finally {
      setIsSearching(false);
    }
  }, []); // Sin dependencias - usa refs para callbacks

  // Debounce de búsqueda
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    
    debounceRef.current = setTimeout(() => {
      searchProduct(value);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, searchProduct]);

  // Focus en autoFocus
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const isDark = theme === 'dark';
  const isHighContrast = theme === 'high-contrast';

  const borderColor = isHighContrast 
    ? 'border-yellow-400' 
    : isDark 
      ? product 
        ? 'border-emerald-500/50' 
        : 'border-white/10 focus:border-blue-500'
      : 'border-slate-300 focus:border-blue-500';

  const bgColor = isDark ? 'bg-black/40' : 'bg-white';
  const textColor = isDark ? 'text-white' : 'text-slate-900';
  const placeholderColor = isDark ? 'placeholder-slate-500' : 'placeholder-slate-400';
  const labelColor = isDark ? 'text-muted' : 'text-slate-500';

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Label */}
      <label className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${labelColor}`}>
        <Package className="w-3 h-3" />
        SKU / Código de Barras
        <span className="text-rose-500">*</span>
      </label>

      {/* Input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          disabled={disabled}
          placeholder={placeholder}
          className={`
            w-full px-4 py-3.5 pl-12 rounded-xl text-sm font-mono font-bold
            border-2 transition-all outline-none uppercase tracking-wider
            ${bgColor} ${textColor} ${borderColor} ${placeholderColor}
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            ${isHighContrast ? 'ring-2 ring-yellow-400/50' : ''}
          `}
        />
        
        {/* Icon */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2">
          {isSearching ? (
            <Loader2 className={`w-4 h-4 animate-spin ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
          ) : product ? (
            <Package className={`w-4 h-4 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
          ) : (
            <Search className={`w-4 h-4 ${isDark ? 'text-slate-500' : 'text-muted'}`} />
          )}
        </div>

        {/* Clear button */}
        {value && (
          <button
            type="button"
            onClick={() => { onChange(''); setProduct(null); onProductFound?.(null); }}
            className={`absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-colors ${
              isDark ? 'hover:bg-white/10 text-muted' : 'hover:bg-black/5 text-muted'
            }`}
          >
            ×
          </button>
        )}
      </div>

      {/* Product Info */}
      {product && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-3 rounded-xl border ${
            isDark ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200'
          }`}
        >
          <p className={`text-xs font-black truncate ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
            {product.name}
          </p>
          <div className={`mt-1 flex items-center gap-3 text-[10px] font-mono ${isDark ? 'text-muted' : 'text-slate-500'}`}>
            <span>{product.category || 'N/A'}</span>
            <span>•</span>
            <span>{product.supplierName || 'Sin proveedor'}</span>
          </div>
        </motion.div>
      )}

      {/* Nuevo producto */}
      {!isSearching && value.length >= 8 && !product && (
        <div className={`p-3 rounded-xl border ${
          isDark ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-200'
        }`}>
          <div className="flex items-center gap-2">
            <AlertCircle className={`w-4 h-4 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
            <span className={`text-xs font-bold ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
              Producto no encontrado en catálogo
            </span>
          </div>
          <p className={`mt-1 text-[10px] ${isDark ? 'text-muted' : 'text-slate-500'}`}>
            Se registrará como nuevo: <span className="font-mono">{value}</span>
          </p>
        </div>
      )}
    </div>
  );
};

// Import motion
import { motion } from 'motion/react';
