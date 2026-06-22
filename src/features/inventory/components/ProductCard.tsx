/**
 * ProductCard.tsx - Card de producto simplificado
 * 
 * Versión ligera para uso en listas del módulo Inventory
 */

import React, { memo } from 'react';
import { Product } from '@/types';
import { 
  Package, 
  MoreVertical,
  Barcode,
  MapPin,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react';
import { evaluateProductPolicy, evaluateStockStatus, ProductPolicyStatus } from '../domain/productsDomain';

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
  const policyConfig = {
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
      color: 'text-slate-400',
      bg: 'bg-slate-500/10'
    }
  };

  const policy = policyConfig[policyStatus];

  return (
    <div
      onClick={onClick}
      className={`
        border-b border-[var(--appsheet-border-subtle)] cursor-pointer transition-colors duration-150
        ${isSelected 
          ? 'bg-[var(--appsheet-primary-subtle)] border-l-4 border-l-[var(--appsheet-primary)]' 
          : 'bg-[var(--appsheet-bg-surface)] hover:bg-[var(--appsheet-bg-elevated)]'
        }
      `}
    >
      <div className="flex items-center min-h-[72px] px-4 py-3">
        {/* Policy indicator */}
        <div className={`w-8 h-8 rounded-lg ${policy.bg} flex items-center justify-center mr-3 shrink-0`}>
          <span className={policy.color}>{policy.icon}</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={`
              text-base font-medium truncate
              ${isSelected ? 'text-[var(--appsheet-primary)]' : 'text-[var(--appsheet-text-primary)]'}
            `}>
              {product.name || 'Sin nombre'}
            </p>
          </div>
          
          <div className="flex items-center gap-3 mt-1">
            <span className="flex items-center gap-1 text-sm text-[var(--appsheet-text-tertiary)]">
              <Barcode className="w-3.5 h-3.5" />
              <span className="font-mono">{product.barcode}</span>
            </span>
            
            {product.category && (
              <span className="text-sm text-[var(--appsheet-text-tertiary)] truncate">
                {product.category}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 mt-1.5">
            {product.location && (
              <span className="flex items-center gap-1 text-xs text-[var(--appsheet-text-disabled)]">
                <MapPin className="w-3 h-3" />
                {product.location}
              </span>
            )}
            
            {product.stock !== undefined && (
              <span className={`
                text-xs font-medium px-2 py-0.5 rounded-full
                ${stockStatus === 'NORMAL' ? 'bg-emerald-500/10 text-emerald-400' :
                  stockStatus === 'LOW' ? 'bg-amber-500/10 text-amber-400' :
                  stockStatus === 'CRITICAL' ? 'bg-rose-500/10 text-rose-400' :
                  'bg-slate-500/10 text-slate-400'}
              `}>
                Stock: {product.stock}
              </span>
            )}
          </div>
        </div>

        {/* Actions indicator */}
        <button
          onClick={(e) => { e.stopPropagation(); }}
          className="p-2 rounded-full hover:bg-[var(--appsheet-bg-hover)] shrink-0"
        >
          <MoreVertical className="w-5 h-5 text-[var(--appsheet-text-secondary)]" />
        </button>
      </div>
    </div>
  );
});

ProductCard.displayName = 'ProductCard';
