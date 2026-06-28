/**
 * ExpiryDetailModal - Vista Detalle de Vencimiento estilo AppSheet
 * 
 * Usa RecordDetailView para mostrar información completa del vencimiento
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  CalendarDays, 
  Package, 
  Factory, 
  Clock, 
  MapPin, 
  RefreshCw,
  Cloud,
  CloudOff,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Pencil
} from 'lucide-react';
import { formatDetailDate } from '@/lib/ui';
import { RecordDetailView } from '@/shared/components/ui/RecordDetailView';
import type { ExpiryRecord } from '../hooks/useExpiry';
import { getStatusLabel } from '../hooks/useExpiry';

interface ExpiryDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: ExpiryRecord | null;
  onEdit?: () => void;
  onDelete?: () => void;
  onSync?: () => void;
}

export const ExpiryDetailModal: React.FC<ExpiryDetailModalProps> = ({
  isOpen,
  onClose,
  record,
  onEdit,
  onDelete,
  onSync,
}) => {
  if (!record) return null;

  const isWarning = record.daysLeft <= 90;
  const isExpired = record.daysLeft <= 0;
  

  const formatMonth = (mm: number, yyyy: number) => {
    const date = new Date(yyyy, mm - 1, 1);
    return format(date, 'MMMM yyyy', { locale: es });
  };

  // Determinar estado para badge
  const status = isExpired ? 'error' : isWarning ? 'warning' : 'success';
  const statusLabel = isExpired ? 'VENCIDO' : getStatusLabel(record.status);

  // Sync status
  const syncStatus = record.syncStatus === 'synced' ? 'synced' :
                     record.syncStatus === 'pending' ? 'pending' : 'error';

  // Construir secciones
  const sections = [
    {
      id: 'product',
      title: 'Producto',
      icon: <Package className="w-4 h-4" />,
      rows: [
        { label: 'Nombre', value: record.productName, copyable: true },
        { label: 'Barcode', value: record.barcode, copyable: true },
        { label: 'Categoría', value: record.category || 'Sin categoría' },
      ]
    },
    {
      id: 'expiry',
      title: 'Vencimiento',
      icon: <CalendarDays className="w-4 h-4" />,
      rows: [
        { label: 'Fecha Vencimiento', value: formatMonth(record.mm, record.yyyy) },
        { label: 'Días Restantes', value: record.daysLeft > 0 ? `${record.daysLeft} días` : 'VENCIDO' },
        { label: 'Fecha Retiro Sugerida', value: record.withdrawalDate ? format(record.withdrawalDate, 'dd/MM/yyyy') : 'N/A' },
        { label: 'Política', value: record.hasCanje ? 'CANJE' : 'MERMA' },
      ]
    },
    {
      id: 'provider',
      title: 'Proveedor',
      icon: <Factory className="w-4 h-4" />,
      rows: [
        { label: 'Nombre', value: record.providerName || 'Sin proveedor' },
        { label: 'RUT', value: record.providerRut || 'N/A', copyable: !!record.providerRut },
        { label: 'Días Retiro', value: `${record.withdrawalDays} días` },
      ]
    },
    {
      id: 'capture',
      title: 'Captura',
      icon: <Clock className="w-4 h-4" />,
      rows: [
        { label: 'Fecha Captura', value: formatDetailDate(record.timestamp) },
        { label: 'Ubicación', value: record.location || 'N/A' },
        { label: 'Cantidad', value: `${record.quantity} unidades` },
        { label: 'Observaciones', value: record.observaciones || 'Sin observaciones' },
      ]
    }
  ];

  // Acciones
  const actions = [
    {
      id: 'sync',
      label: 'Sincronizar',
      icon: <RefreshCw className="w-4 h-4" />,
      onClick: () => onSync?.(),
      variant: 'secondary' as const,
    },
    {
      id: 'delete',
      label: 'Eliminar',
      icon: <Trash2 className="w-4 h-4" />,
      onClick: () => onDelete?.(),
      variant: 'danger' as const,
    }
  ];

  // Metadata
  const metadata = [
    { label: 'Creado', value: formatDetailDate(record.timestamp), icon: <Clock className="w-3 h-3" /> },
    { 
      label: 'Sync', 
      value: record.syncStatus === 'synced' ? 'Sincronizado' : record.syncStatus === 'pending' ? 'Pendiente' : 'Error', 
      icon: record.syncStatus === 'synced' ? <Cloud className="w-3 h-3" /> : record.syncStatus === 'pending' ? <RefreshCw className="w-3 h-3" /> : <CloudOff className="w-3 h-3" /> 
    },
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
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-2xl md:max-h-[90vh] z-50 flex flex-col"
          >
            <RecordDetailView
              title={record.productName}
              subtitle={`${record.barcode} • ${record.quantity} unidades`}
              icon={<CalendarDays className="w-5 h-5" />}
              status={status}
              statusLabel={statusLabel}
              sections={sections}
              tabs={['detail', 'history', 'actions']}
              recordId={record.id}
              tableName="VENCIMIENTOS"
              actions={actions}
              metadata={metadata}
              syncStatus={syncStatus}
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

export default ExpiryDetailModal;
