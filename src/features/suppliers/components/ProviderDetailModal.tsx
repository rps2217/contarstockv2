/**
 * ProviderDetailModal - Vista Detalle de Proveedor estilo AppSheet
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Truck, Building2, Phone, Mail, MapPin, Calendar, Package, FileText } from 'lucide-react';
import { RecordDetailView } from '@/shared/components/ui/RecordDetailView';
import { useAudit } from '@/hooks/useAudit';
import { Provider } from '@/types';
import { formatDetailDate } from '@/lib/ui';

interface ProviderDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  provider: Provider | null;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const ProviderDetailModal: React.FC<ProviderDetailModalProps> = ({
  isOpen,
  onClose,
  provider,
  onEdit,
  onDelete,
}) => {
  const { getRecordHistory } = useAudit();

  if (!provider) return null;

  // Construir secciones
  const sections = [
    {
      id: 'basic',
      title: 'Información',
      icon: <Building2 className="w-4 h-4" />,
      rows: [
        { label: 'Nombre', value: provider.name, copyable: true },
        { label: 'RUT', value: provider.rut || 'N/A', copyable: !!provider.rut },
        { label: 'Razón Social', value: provider.businessName || 'N/A' },
      ]
    },
    {
      id: 'contact',
      title: 'Contacto',
      icon: <Phone className="w-4 h-4" />,
      rows: [
        { label: 'Teléfono', value: provider.phone || 'N/A', copyable: !!provider.phone },
        { label: 'Email', value: provider.email || 'N/A', copyable: !!provider.email },
        { label: 'Dirección', value: provider.address || 'N/A' },
      ]
    },
    {
      id: 'logistics',
      title: 'Logística',
      icon: <Package className="w-4 h-4" />,
      rows: [
        { label: 'Tiempos Entrega', value: provider.deliveryTime ? `${provider.deliveryTime} días` : 'N/A' },
        { label: 'Canje', value: provider.exchangePolicy || 'N/A' },
      ]
    },
    {
      id: 'dates',
      title: 'Fechas',
      icon: <Calendar className="w-4 h-4" />,
      rows: [
        { label: 'Fecha Creación', value: formatDetailDate(provider.createdAt) },
        { label: 'Última Actualización', value: formatDetailDate(provider.updatedAt) },
      ]
    }
  ];

  // Metadata
  const metadata = [
    { label: 'Creado', value: formatDetailDate(provider.createdAt), icon: <Calendar className="w-3 h-3" /> },
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
              title={provider.name}
              subtitle={provider.rut || 'Sin RUT'}
              icon={<Truck className="w-5 h-5" />}
              status="default"
              sections={sections}
              tabs={['detail', 'history']}
              recordId={provider.id}
              tableName="PROVIDERS"
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

export default ProviderDetailModal;
