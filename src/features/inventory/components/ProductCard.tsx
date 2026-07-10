/**
 * ProductCard.tsx - Card de producto optimizado para móvil
 * 
 * Versión ligera para uso en listas del módulo Inventory
 * - Touch targets grandes (min 44px)
 * - Indicador visual claro de "toca para ver detalle"
 */

import React, { memo } from 'react';
import { Product } from '@/types';
import { 
  Package, 
  ChevronRight,
  Barcode,
  MapPin,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react';
import { evaluateProductPolicy, evaluateStockStatus, ProductPolicyStatus } from '../domain/productsDomain';
import { VirtualBadge } from '@/shared/components/ui/VirtualBadge';

interface ProductCardProps {
  product: Product;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onPrint?: () => void;
  isSelected?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = memo(({
  product,
  onClick,
  isSelected = false
}) => {
  const policyStatus = evaluateProductPolicy(product);
  const stockStatus = evaluateStockStatus(product);
  
  // Policy config
  const policyConfig: Record<ProductPolicyStatus, { icon: React.ReactNode; color: string; bg: string }> = {
    [ProductPolicyStatus.ALL]: { icon: <Package className="w-4 h-4" />, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    [ProductPolicyStatus.EXCHANGE]: {
      icon: <ArrowUpRight className="w-4 h-4" />,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10'
    },
    [ProductPolicyStatus.LOSS]: {
      icon: <ArrowDownRight className="w-4 h-4" />,
      color: 'text-rose-400',
      bg: 'bg-rose-500/10'
    },
    [ProductPolicyStatus.NO_INFO]: {
      icon: <Minus className="w-4 h-4" />,
      color: 'text-muted',
      bg: 'bg-slate-500/10'
    }
  };

  const policy = policyConfig[policyStatus];

  return (
    <div
      onClick={onClick}
      className={`
        border-b border-[var(--appsheet-border-subtle)] cursor-pointer transition-colors duration-150 active:scale-[0.99]
        ${isSelected 
          ? 'bg-[var(--appsheet-primary-subtle)] border-l-4 border-l-[var(--appsheet-primary)]' 
          : 'bg-[var(--appsheet-bg-surface)] hover:bg-[var(--appsheet-bg-elevated)]'
        }
      `}
    >
      <div className="flex items-center min-h-[72px] px-4 py-3">
        {/* Policy indicator */}
        <div className={`w-10 h-10 rounded-xl ${policy.bg} flex items-center justify-center mr-3 shrink-0`}>
          <span className={policy.color}>{policy.icon}</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={`
              text-base font-semibold truncate
              ${isSelected ? 'text-[var(--appsheet-primary)]' : 'text-[var(--appsheet-text-primary)]'}
            `}>
              {product.name || 'Sin nombre'}
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
            <span className="flex items-center gap-1 text-sm text-[var(--appsheet-text-tertiary)]">
              <Barcode className="w-3.5 h-3.5" />
              <span className="font-mono text-xs">{product.barcode}</span>
            </span>
            
            {product.category && (
              <span className="text-sm text-[var(--appsheet-text-tertiary)] truncate max-w-[120px]">
                {product.category}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
            {product.location && (
              <span className="flex items-center gap-1 text-xs text-[var(--appsheet-text-disabled)]">
                <MapPin className="w-3 h-3" />
                {product.location}
              </span>
            )}
            
            {product.stock !== undefined && (
              <span className={`
                text-xs font-semibold px-2.5 py-1 rounded-full
                ${stockStatus === 'NORMAL' ? 'bg-emerald-500/15 text-emerald-400' :
                  stockStatus === 'LOW' ? 'bg-amber-500/15 text-amber-400' :
                  stockStatus === 'CRITICAL' ? 'bg-rose-500/15 text-rose-400' :
                  'bg-slate-500/10 text-muted'}
              `}>
                Stock: {product.stock}
              </span>
            )}
            {product.stock !== undefined && product.minStock !== undefined && product.minStock > 0 && (
              <VirtualBadge
                value={stockStatus === 'NORMAL' ? 'ok' : stockStatus === 'LOW' ? 'warning' : 'critical'}
                style={stockStatus === 'NORMAL' ? 'success' : stockStatus === 'LOW' ? 'warning' : 'error'}
                size="sm"
                showIcon={false}
              />
            )}
          </div>
        </div>

        {/* Touch indicator - Clear visual cue for mobile */}
        <ChevronRight className="w-5 h-5 text-[var(--appsheet-text-disabled)] shrink-0 ml-2" />
      </div>
    </div>
  );
});

ProductCard.displayName = 'ProductCard';
