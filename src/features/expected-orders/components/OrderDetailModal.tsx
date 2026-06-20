/**
 * OrderDetailModal - Vista Detalle de Orden de Pedido estilo AppSheet
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  ShoppingCart, 
  Package, 
  Truck, 
  Clock,
  Calendar,
  FileText,
  AlertCircle
} from 'lucide-react';
import { RecordDetailView } from '@/shared/components/ui/RecordDetailView';
import { useAudit } from '@/hooks/useAudit';
import { ExpectedOrder } from '@/types';

interface OrderDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: ExpectedOrder | null;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
  isOpen,
  onClose,
  order,
  onEdit,
  onDelete,
}) => {
  const { getRecordHistory } = useAudit();

  if (!order) return null;

  const formatDate = (ts?: number) => {
    if (!ts) return 'N/A';
    return format(new Date(ts), "dd MMM yyyy, HH:mm", { locale: es });
  };

  // Construir secciones
  const sections = [
    {
      id: 'info',
      title: 'Información General',
      icon: <ShoppingCart className="w-4 h-4" />,
      rows: [
        { label: 'ID Documento', value: order.id, copyable: true },
        { label: 'Tipo', value: order.metadata?.documentType || 'Picking' },
        { label: 'Orden Compra', value: order.metadata?.purchaseOrder || 'Sin O.C.', copyable: !!order.metadata?.purchaseOrder },
      ]
    },
    {
      id: 'items',
      title: 'Items',
      icon: <Package className="w-4 h-4" />,
      rows: [
        { label: 'Total SKUs', value: `${order.totalExpectedSKUs || order.items.length}` },
        { label: 'Unidades Totales', value: `${order.totalExpectedUnits || 0}` },
      ]
    },
    {
      id: 'dates',
      title: 'Fechas',
      icon: <Calendar className="w-4 h-4" />,
      rows: [
        { label: 'Fecha Documento', value: order.metadata?.date || formatDate(order.importedAt) },
        { label: 'Fecha Importación', value: formatDate(order.importedAt) },
      ]
    }
  ];

  // Metadata
  const metadata = [
    { label: 'Importado', value: formatDate(order.importedAt), icon: <Clock className="w-3 h-3" /> },
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
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-2xl md:max-h-[90vh] z-50 flex flex-col"
          >
            <RecordDetailView
              title={order.metadata?.documentType || 'Carga Teórica'}
              subtitle={`${order.id}`}
              icon={<ShoppingCart className="w-5 h-5" />}
              status="default"
              sections={sections}
              tabs={['detail', 'history']}
              recordId={order.id}
              tableName="EXPECTED_ORDERS"
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

export default OrderDetailModal;
