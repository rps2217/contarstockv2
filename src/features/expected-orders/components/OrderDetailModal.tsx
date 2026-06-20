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

interface OrderDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: {
    id: string;
    erpOrderId?: string;
    providerName?: string;
    status?: string;
    totalItems?: number;
    receivedItems?: number;
    expectedDate?: number;
    createdAt?: number;
    observaciones?: string;
    mm?: number;
    yyyy?: number;
    syncStatus?: 'synced' | 'pending' | 'error';
    lastSyncTimestamp?: number;
  } | null;
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

  // Determinar estado
  const statusConfig: Record<string, { status: 'success' | 'warning' | 'error' | 'info'; label: string }> = {
    'received': { status: 'success', label: 'Recibido' },
    'partial': { status: 'warning', label: 'Parcial' },
    'pending': { status: 'info', label: 'Pendiente' },
    'cancelled': { status: 'error', label: 'Cancelado' },
  };
  const config = statusConfig[order.status || 'pending'] || { status: 'info', label: order.status || 'N/A' };

  // Construir secciones
  const sections = [
    {
      id: 'info',
      title: 'Información General',
      icon: <ShoppingCart className="w-4 h-4" />,
      rows: [
        { label: 'Orden ERP', value: order.erpOrderId || 'Sin número', copyable: !!order.erpOrderId },
        { label: 'Estado', value: config.label },
        { label: 'Proveedor', value: order.providerName || 'Sin proveedor' },
      ]
    },
    {
      id: 'items',
      title: 'Items',
      icon: <Package className="w-4 h-4" />,
      rows: [
        { label: 'Total Items', value: `${order.totalItems || 0}` },
        { label: 'Recibidos', value: `${order.receivedItems || 0}` },
        { label: 'Pendientes', value: `${(order.totalItems || 0) - (order.receivedItems || 0)}` },
      ]
    },
    {
      id: 'time',
      title: 'Tiempo',
      icon: <Calendar className="w-4 h-4" />,
      rows: [
        { label: 'Fecha Esperada', value: formatDate(order.expectedDate) },
        { label: 'Fecha Creación', value: formatDate(order.createdAt) },
        { label: 'Período', value: `${order.mm || '?'}/${order.yyyy || '?'}` },
      ]
    }
  ];

  // Metadata
  const metadata = [
    { label: 'Creada', value: formatDate(order.createdAt), icon: <Clock className="w-3 h-3" /> },
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
              title={`Pedido ${order.erpOrderId || order.id.slice(0, 8)}`}
              subtitle={order.providerName || 'Sin proveedor'}
              icon={<ShoppingCart className="w-5 h-5" />}
              status={config.status}
              statusLabel={config.label}
              sections={sections}
              tabs={['detail', 'history']}
              recordId={order.id}
              tableName="EXPECTED_ORDERS"
              metadata={metadata}
              syncStatus={order.syncStatus === 'synced' ? 'synced' : order.syncStatus === 'pending' ? 'pending' : 'error'}
              lastSyncTime={order.lastSyncTimestamp}
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
