/**
 * SessionDetailModal - Vista Detalle de Sesión estilo AppSheet
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  ClipboardList, 
  Package, 
  Truck, 
  Clock,
  Cloud,
  CheckCircle2,
  AlertCircle,
  User,
  Calendar
} from 'lucide-react';
import { RecordDetailView } from '@/shared/components/ui/RecordDetailView';
import { useAudit } from '@/hooks/useAudit';

interface SessionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: {
    id: string;
    status?: string;
    createdAt?: number;
    erpOrder?: string;
    logisticsLabel?: string;
    photoUrl?: string;
    scannedCount?: number;
    incidentCount?: number;
    userId?: string;
    mm?: number;
    yyyy?: number;
    batch?: string;
    lastSync?: number;
  } | null;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const SessionDetailModal: React.FC<SessionDetailModalProps> = ({
  isOpen,
  onClose,
  session,
  onEdit,
  onDelete,
}) => {
  const { getRecordHistory } = useAudit();

  if (!session) return null;

  const formatDate = (ts?: number) => {
    if (!ts) return 'N/A';
    return format(new Date(ts), "dd MMM yyyy, HH:mm", { locale: es });
  };

  // Determinar estado
  const statusConfig: Record<string, { status: 'success' | 'warning' | 'error' | 'info'; label: string }> = {
    'completed': { status: 'success', label: 'Completada' },
    'in_progress': { status: 'info', label: 'En Progreso' },
    'pending': { status: 'warning', label: 'Pendiente' },
    'error': { status: 'error', label: 'Error' },
  };
  const config = statusConfig[session.status || 'pending'] || { status: 'info', label: session.status || 'N/A' };

  // Construir secciones
  const sections = [
    {
      id: 'info',
      title: 'Información General',
      icon: <ClipboardList className="w-4 h-4" />,
      rows: [
        { label: 'Estado', value: config.label },
        { label: 'Orden ERP', value: session.erpOrder || 'Sin orden', copyable: !!session.erpOrder },
        { label: 'Logística', value: session.logisticsLabel || 'Sin etiqueta' },
      ]
    },
    {
      id: 'stats',
      title: 'Estadísticas',
      icon: <Package className="w-4 h-4" />,
      rows: [
        { label: 'Escaneados', value: `${session.scannedCount || 0} productos` },
        { label: 'Incidentes', value: `${session.incidentCount || 0} incidencias` },
      ]
    },
    {
      id: 'time',
      title: 'Tiempo',
      icon: <Clock className="w-4 h-4" />,
      rows: [
        { label: 'Fecha Creación', value: formatDate(session.createdAt) },
        { label: 'Período', value: `${session.mm || '?'}/${session.yyyy || '?'}` },
        { label: 'Batch', value: session.batch || 'N/A' },
      ]
    }
  ];

  // Metadata
  const metadata = [
    { label: 'Creada', value: formatDate(session.createdAt), icon: <Calendar className="w-3 h-3" /> },
    { label: 'Sync', value: session.lastSync ? formatDate(session.lastSync) : 'Nunca', icon: <Cloud className="w-3 h-3" /> },
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
              title={`Sesión ${session.id.slice(0, 8)}`}
              subtitle={config.label}
              icon={<ClipboardList className="w-5 h-5" />}
              status={config.status}
              statusLabel={config.label}
              sections={sections}
              tabs={['detail', 'history']}
              recordId={session.id}
              tableName="SESSIONS"
              metadata={metadata}
              syncStatus={session.lastSync ? 'synced' : 'pending'}
              lastSyncTime={session.lastSync}
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

export default SessionDetailModal;
