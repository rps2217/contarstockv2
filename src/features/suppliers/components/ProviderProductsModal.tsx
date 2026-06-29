/**
 * ProviderProductsModal - Modal para mostrar productos de un proveedor
 * 
 * Muestra la lista de productos asociados a un proveedor según PRODUCTO_PROVEEDOR
 */

import React from 'react';
import { X, Package, Star, Truck, Hash, Tag } from 'lucide-react';
import { Modal } from '../../../shared/components/ui/Modal';
import { Button } from '../../../shared/components/ui';
import { useProductProviderLink, ProductWithDetails } from '../hooks/useProductProviderLink';
import { useAppStore } from '@/stores';

interface ProviderProductsModalProps {
  providerRut: string;
  providerName: string;
  isOpen: boolean;
  onClose: () => void;
}

export const ProviderProductsModal: React.FC<ProviderProductsModalProps> = ({
  providerRut,
  providerName,
  isOpen,
  onClose,
}) => {
  const { settings } = useAppStore();
  const theme = settings.theme;
  const { isLoading, products, loadProviderProducts } = useProductProviderLink();

  // Load products when modal opens
  React.useEffect(() => {
    if (isOpen && providerRut) {
      loadProviderProducts(providerRut);
    }
  }, [isOpen, providerRut, loadProviderProducts]);

  const getThemeClasses = () => {
    switch (theme) {
      case 'light':
        return 'bg-white text-slate-900';
      case 'high-contrast':
        return 'bg-black text-yellow-400';
      default:
        return 'bg-surface text-white';
    }
  };

  const primaryCount = products.filter(p => p.isPrimary).length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      variant="side-drawer"
      className="md:max-w-2xl"
      showCloseButton={true}
    >
      <div className={`h-full flex flex-col ${getThemeClasses()}`}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                <Truck className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h2 className="text-xl font-black">Productos del Proveedor</h2>
                <p className="text-sm text-muted">{providerName}</p>
                <p className="text-xs text-slate-500 font-mono">{providerRut}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Stats */}
          <div className="flex gap-4 mt-4">
            <div className="flex items-center gap-2 text-sm">
              <Package className="w-4 h-4 text-muted" />
              <span className="text-muted">Total:</span>
              <span className="font-bold">{products.length}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Star className="w-4 h-4 text-yellow-400" />
              <span className="text-muted">Principales:</span>
              <span className="font-bold text-yellow-400">{primaryCount}</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 mx-auto text-slate-600 mb-4" />
              <p className="text-muted">No hay productos asociados</p>
            </div>
          ) : (
            <div className="space-y-2">
              {products.map((product) => (
                <div
                  key={`${product.productBarcode}-${product.providerRut}`}
                  className="p-4 rounded-xl border border-white/10 hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      {/* Product Name */}
                      <div className="flex items-center gap-2 mb-1">
                        {product.isPrimary && (
                          <Star className="w-4 h-4 text-yellow-400 shrink-0" fill="currentColor" />
                        )}
                        <span className="font-semibold truncate">
                          {product.productName}
                        </span>
                      </div>

                      {/* Barcode */}
                      <div className="flex items-center gap-1 text-xs text-muted mb-2">
                        <Hash className="w-3 h-3" />
                        <code className="font-mono">{product.productBarcode}</code>
                      </div>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-2">
                        {product.mundo && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-xs">
                            <Tag className="w-3 h-3" />
                            {product.mundo}
                          </span>
                        )}
                        {product.marca && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 text-xs">
                            {product.marca}
                          </span>
                        )}
                        {product.hasExchange !== null && product.hasExchange !== undefined && (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                            product.hasExchange 
                              ? 'bg-emerald-500/20 text-emerald-400' 
                              : 'bg-rose-500/20 text-rose-400'
                          }`}>
                            {product.hasExchange ? '✓ Canje' : '✗ Sin Canje'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Policy Info */}
                    <div className="text-right shrink-0 ml-4">
                      {product.withdrawalDays !== null && product.withdrawalDays !== undefined && (
                        <div className="text-xs text-muted">
                          <span className="font-semibold text-white">{product.withdrawalDays}</span> días retiro
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 shrink-0">
          <Button
            variant="ghost"
            onClick={onClose}
            className="w-full"
          >
            Cerrar
          </Button>
        </div>
      </div>
    </Modal>
  );
};
