/**
 * EventDetailModal - Vista Detalle de Evento estilo AppSheet
 * 
 * Usa RecordDetailView para mostrar información completa del evento
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Package, 
  MapPin, 
  Truck, 
  FileText, 
  Clock,
  AlertCircle,
  CheckCircle2,
  Cloud,
  CloudOff,
  RefreshCw,
  Copy,
  X,
  ExternalLink,
  Trash2
} from 'lucide-react';
import { RecordDetailView } from '@/shared/components/ui/RecordDetailView';

interface EventDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: {
    id: string;
    barcode?: string;
    productName?: string;
    quantity?: number;
    event?: string;
    providerName?: string;
    providerRut?: string;
    location?: string;
    destino?: string;
    frc?: string;
    observaciones?: string;
    traspaso?: string;
    mm?: number;
    yyyy?: number;
    timestamp?: number;
    syncStatus?: 'synced' | 'pending' | 'error';
    syncError?: string;
    lastSyncTimestamp?: number;
    erp?: string;
    isAdjusted?: boolean;
  } | null;
  onEdit?: () => void;
  onDelete?: () => void;
  onMarkAdjusted?: () => void;
  onSync?: () => void;
}

export const EventDetailModal: React.FC<EventDetailModalProps> = ({
  isOpen,
  onClose,
  event,
  onEdit,
  onDelete,
  onMarkAdjusted,
  onSync,
}) => {

  if (!event) return null;

  const formatDate = (ts?: number) => {
    if (!ts) return 'N/A';
    return format(new Date(ts), "dd MMM yyyy, HH:mm", { locale: es });
  };

  // Determinar estado
  const status = event.isAdjusted ? 'success' : 
                 event.syncStatus === 'error' ? 'error' :
                 event.syncStatus === 'pending' ? 'warning' : 'default';
  const statusLabel = event.isAdjusted ? 'Ajustado' :
                      event.syncStatus === 'error' ? 'Error' :
                      event.syncStatus === 'pending' ? 'Pendiente' : undefined;

  const syncStatus = event.syncStatus === 'synced' ? 'synced' :
                     event.syncStatus === 'pending' ? 'pending' : 'error';

  // Construir secciones
  const sections = [
    {
      id: 'product',
      title: 'Producto',
      icon: <Package className="w-4 h-4" />,
      rows: [
        { label: 'Nombre', value: event.productName || 'N/A', copyable: true },
        { label: 'Barcode', value: event.barcode || 'N/A', copyable: true },
        { label: 'Cantidad', value: `${event.quantity || 0} unidades` },
      ]
    },
    {
      id: 'event-info',
      title: 'Evento',
      icon: <AlertCircle className="w-4 h-4" />,
      rows: [
        { label: 'Tipo', value: event.event || 'N/A' },
        { label: 'FRC', value: event.frc || 'Sin FRC', copyable: !!event.frc },
        { label: 'ERP', value: event.erp || 'Sin ERP', copyable: !!event.erp },
        { label: 'Traspaso', value: event.traspaso || 'No' },
      ]
    },
    {
      id: 'location',
      title: 'Ubicación y Destino',
      icon: <MapPin className="w-4 h-4" />,
      rows: [
        { label: 'Ubicación', value: event.location || 'N/A' },
        { label: 'Destino', value: event.destino || 'Sin destino' },
      ]
    },
    {
      id: 'provider',
      title: 'Proveedor',
      icon: <Truck className="w-4 h-4" />,
      rows: [
        { label: 'Nombre', value: event.providerName || 'N/A' },
        { label: 'RUT', value: event.providerRut || 'N/A', copyable: !!event.providerRut },
      ]
    },
    {
      id: 'observations',
      title: 'Observaciones',
      icon: <FileText className="w-4 h-4" />,
      collapsible: true,
      defaultOpen: false,
      rows: [
        { label: 'Notas', value: event.observaciones || 'Sin observaciones' },
      ]
    },
    {
      id: 'time',
      title: 'Tiempo',
      icon: <Clock className="w-4 h-4" />,
      rows: [
        { label: 'Mes/Año', value: `${event.mm || '?'}/${event.yyyy || '?'}` },
        { label: 'Fecha creación', value: formatDate(event.timestamp) },
        { label: 'Última sync', value: formatDate(event.lastSyncTimestamp) },
      ]
    }
  ];

  // Acciones
  const actions = [
    {
      id: 'mark-adjusted',
      label: event.isAdjusted ? 'Desmarcar como ajustado' : 'Marcar como ajustado',
      icon: event.isAdjusted ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />,
      onClick: () => onMarkAdjusted?.(),
      variant: 'primary' as const,
    },
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
    { label: 'Creado', value: formatDate(event.timestamp), icon: <Clock className="w-3 h-3" /> },
    { label: 'Sync', value: event.syncStatus === 'synced' ? 'Sincronizado' : event.syncStatus === 'pending' ? 'Pendiente' : 'Error', icon: event.syncStatus === 'synced' ? <Cloud className="w-3 h-3" /> : event.syncStatus === 'pending' ? <RefreshCw className="w-3 h-3" /> : <CloudOff className="w-3 h-3" /> },
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
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40"
            onClick={onClose}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-2xl md:max-h-[90vh] z-50 flex flex-col"
          >
            <RecordDetailView
              title={event.productName || 'Evento'}
              subtitle={`${event.quantity || 0} unidades • ${event.event || 'Evento'}`}
              icon={<Package className="w-5 h-5" />}
              status={status}
              statusLabel={statusLabel}
              sections={sections}
              tabs={['detail', 'history', 'actions']}
              recordId={event.id}
              tableName="EVENTOS"
              actions={actions}
              metadata={metadata}
              syncStatus={syncStatus}
              lastSyncTime={event.lastSyncTimestamp}
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

export default EventDetailModal;
