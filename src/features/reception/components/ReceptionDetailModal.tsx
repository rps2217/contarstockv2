/**
 * ReceptionDetailModal - Vista Detalle de Recepción estilo AppSheet
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Truck, Package, Calendar, Clock, CheckCircle, Image } from 'lucide-react';
import { formatDetailDate } from '@/lib/ui';
import { RecordDetailView } from '@/shared/components/ui/RecordDetailView';
import { useAudit } from '@/hooks/useAudit';

interface ReceptionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: {
    id: string | number;
    logisticsLabel?: string;
    erpOrder?: string;
    status?: string;
    photoUrl?: string;
    labelPhoto?: string;
    lastSyncTimestamp?: number;
    createdAt?: number;
    itemCount?: number;
    providerName?: string;
    observations?: string;
    barcode?: string;
  } | null;
  onShowPhoto?: (item: any) => void;
  onDelete?: () => void;
}

export const ReceptionDetailModal: React.FC<ReceptionDetailModalProps> = ({
  isOpen,
  onClose,
  item,
  onShowPhoto,
  onDelete,
}) => {
  const { getRecordHistory } = useAudit();

  if (!item) return null;


  // Determinar estado
  const isSynced = !!item.lastSyncTimestamp;
  const isDraft = item.status === 'draft';
  const status = isSynced ? 'success' : isDraft ? 'warning' : 'info';
  const statusLabel = isSynced ? 'Sincronizado' : isDraft ? 'Borrador' : 'Pendiente';

  // Construir secciones
  const sections = [
    {
      id: 'info',
      title: 'Información General',
      icon: <Truck className="w-4 h-4" />,
      rows: [
        { label: 'Etiqueta Logística', value: item.logisticsLabel || 'N/A', copyable: true },
        { label: 'Orden ERP', value: item.erpOrder || 'N/A', copyable: !!item.erpOrder },
        { label: 'Proveedor', value: item.providerName || 'N/A' },
        { label: 'Barcode', value: item.barcode || 'N/A', copyable: !!item.barcode },
      ]
    },
    {
      id: 'items',
      title: 'Items',
      icon: <Package className="w-4 h-4" />,
      rows: [
        { label: 'Cantidad Items', value: `${item.itemCount || 0}` },
        { label: 'Estado', value: statusLabel },
      ]
    },
    {
      id: 'dates',
      title: 'Fechas',
      icon: <Calendar className="w-4 h-4" />,
      rows: [
        { label: 'Fecha Creación', value: formatDetailDate(item.createdAt) },
        { label: 'Última Sync', value: formatDetailDate(item.lastSyncTimestamp) },
      ]
    }
  ];

  // Metadata
  const metadata = [
    { label: 'Sync', value: isSynced ? 'Sincronizado' : 'Pendiente', icon: <Clock className="w-3 h-3" /> },
    { label: 'Creado', value: formatDetailDate(item.createdAt), icon: <Calendar className="w-3 h-3" /> },
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
              title={item.logisticsLabel || 'Recepción'}
              subtitle={item.erpOrder || 'Sin orden'}
              icon={<Truck className="w-5 h-5" />}
              status={status}
              statusLabel={statusLabel}
              sections={sections}
              tabs={['detail', 'history']}
              recordId={String(item.id)}
              tableName="RECEPTIONS"
              metadata={metadata}
              onDelete={onDelete}
              onClose={onClose}
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ReceptionDetailModal;
