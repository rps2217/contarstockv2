/**
 * ProductDetailModal - Vista Detalle de Producto estilo AppSheet
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Package, Barcode, Tag, Factory, Calendar, TrendingDown, RefreshCw } from 'lucide-react';
import { formatDetailDate } from '@/lib/ui';
import { RecordDetailView } from '@/shared/components/ui/RecordDetailView';
import { useAudit } from '@/hooks/useAudit';
import { Product } from '@/types';

interface ProductDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onEdit?: () => void;
  onDelete?: () => void;
  onPrint?: () => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  isOpen,
  onClose,
  product,
  onEdit,
  onDelete,
  onPrint,
}) => {
  const { getRecordHistory } = useAudit();

  if (!product) return null;


  // Determinar estado de sync
  const syncStatus = product.syncStatus === 'synced' ? 'success' 
    : product.syncStatus === 'pending' ? 'warning' 
    : product.syncStatus === 'error' ? 'error' : 'info';
  const syncLabel = product.syncStatus === 'synced' ? 'Sincronizado' 
    : product.syncStatus === 'pending' ? 'Pendiente' 
    : product.syncStatus === 'error' ? 'Error' : 'Local';

  // Construir secciones
  const sections = [
    {
      id: 'basic',
      title: 'Información',
      icon: <Package className="w-4 h-4" />,
      rows: [
        { label: 'Nombre', value: product.name, copyable: true },
        { label: 'Barcode', value: product.barcode, copyable: true },
        { label: 'SKU', value: product.sku || 'N/A', copyable: !!product.sku },
      ]
    },
    {
      id: 'category',
      title: 'Categoría',
      icon: <Tag className="w-4 h-4" />,
      rows: [
        { label: 'Categoría', value: product.category || 'Sin categoría' },
        { label: 'Tipo', value: product.productType || 'N/A' },
      ]
    },
    {
      id: 'stock',
      title: 'Stock',
      icon: <TrendingDown className="w-4 h-4" />,
      rows: [
        { label: 'Stock Mínimo', value: `${product.minStock || 0}` },
        { label: 'Stock Actual', value: `${product.stock || 0}` },
        { label: 'Días Retiro', value: `${product.withdrawalDays || 0}` },
      ]
    },
    {
      id: 'dates',
      title: 'Fechas',
      icon: <Calendar className="w-4 h-4" />,
      rows: [
        { label: 'Última Actualización', value: formatDetailDate(product.updatedAt) },
        { label: 'Fecha Creación', value: formatDetailDate(product.createdAt) },
      ]
    }
  ];

  // Metadata
  const metadata = [
    { label: 'Sync', value: syncLabel, icon: <RefreshCw className="w-3 h-3" /> },
    { label: 'Última Actualización', value: formatDetailDate(product.updatedAt), icon: <Calendar className="w-3 h-3" /> },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40"
          />
          
          {/* Modal - Full screen on mobile, centered on desktop */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-x-0 inset-y-0 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-2xl md:max-h-[90vh] md:rounded-2xl md:shadow-2xl z-[60] flex flex-col bg-base overflow-hidden"
          >
            <RecordDetailView
              title={product.name}
              subtitle={product.barcode}
              icon={<Package className="w-5 h-5" />}
              status={syncStatus}
              statusLabel={syncLabel}
              sections={sections}
              tabs={['detail', 'history']}
              recordId={product.id || product.barcode}
              tableName="INVENTORY"
              metadata={metadata}
              onEdit={onEdit}
              onDelete={onDelete}
              onClose={onClose}
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ProductDetailModal;
