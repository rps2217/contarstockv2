/**
 * ExpiryDetailModal - Vista Detalle de Vencimiento estilo AppSheet
 * 
 * Usa RecordDetailView para mostrar información completa del vencimiento
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarDays, Package, Factory, Clock, AlertTriangle, Copy } from 'lucide-react';
import { RecordDetailView } from '@/shared/components/ui/RecordDetailView';
import { useAudit } from '@/hooks/useAudit';
import { ExpiryItem } from './hooks/useExpiryDatabase';

interface ExpiryDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: ExpiryItem | null;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const ExpiryDetailModal: React.FC<ExpiryDetailModalProps> = ({
  isOpen,
  onClose,
  item,
  onEdit,
  onDelete,
}) => {
  const { getRecordHistory } = useAudit();

  if (!item) return null;

  const isWarning = item.daysLeft <= 90;
  const isExpired = item.daysLeft <= 0;
  const formatDate = (ts?: number) => {
    if (!ts) return 'N/A';
    return format(new Date(ts), "dd MMM yyyy, HH:mm", { locale: es });
  };

  // Determinar estado para badge
  const status = isExpired ? 'error' : isWarning ? 'warning' : 'success';
  const statusLabel = isExpired ? 'VENCIDO' : isWarning ? `${item.daysLeft} días` : 'Óptimo';

  // Construir secciones
  const sections = [
    {
      id: 'product',
      title: 'Producto',
      icon: <Package className="w-4 h-4" />,
      rows: [
        { label: 'Nombre', value: item.productName, copyable: true },
        { label: 'Barcode', value: item.barcode, copyable: true },
        { label: 'Categoría', value: item.category || 'Sin categoría' },
      ]
    },
    {
      id: 'expiry',
      title: 'Vencimiento',
      icon: <CalendarDays className="w-4 h-4" />,
      rows: [
        { label: 'Fecha Vencimiento', value: item.expiryDateObj ? format(item.expiryDateObj, 'MMMM yyyy', { locale: es }) : `${item.mm}/${item.yyyy}` },
        { label: 'Días Restantes', value: item.daysLeft > 0 ? `${item.daysLeft} días` : 'VENCIDO' },
        { label: 'Fecha Retiro Sugerida', value: item.withdrawalDate ? format(item.withdrawalDate, 'dd/MM/yyyy') : 'N/A' },
      ]
    },
    {
      id: 'provider',
      title: 'Proveedor',
      icon: <Factory className="w-4 h-4" />,
      rows: [
        { label: 'Nombre', value: item.providerName || 'Sin proveedor' },
        { label: 'RUT', value: item.providerRut || 'N/A', copyable: !!item.providerRut },
      ]
    },
    {
      id: 'capture',
      title: 'Captura',
      icon: <Clock className="w-4 h-4" />,
      rows: [
        { label: 'Fecha Captura', value: formatDate(item.timestamp) },
        { label: 'Ubicación', value: item.location || 'N/A' },
      ]
    }
  ];

  // Metadata
  const metadata = [
    { label: 'Creado', value: formatDate(item.timestamp), icon: <Clock className="w-3 h-3" /> },
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
              title={item.productName}
              subtitle={item.barcode}
              icon={<CalendarDays className="w-5 h-5" />}
              status={status}
              statusLabel={statusLabel}
              sections={sections}
              tabs={['detail', 'history']}
              recordId={item.id}
              tableName="VENCIMIENTOS"
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

export default ExpiryDetailModal;
