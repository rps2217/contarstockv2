/**
 * EventsPage - Módulo de Gestión de Eventos
 * 
 * Diseño estilo AppSheet: Header + Lista + Vista Detalle integrada
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore } from '@/stores';
import { 
  RefreshCw, 
  Plus,
  Edit2,
  Trash2,
  Eye,
  Package,
  MapPin,
  FileText,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

import { useEvents, EventRecord } from './hooks/useEvents';
import { CreateEventModal } from './components/CreateEventModal';
import {
  AppSheetHeader,
  AppSheetSearchBar,
  AppSheetListItem,
  AppSheetDetailView,
  AppSheetEmptyState,
  AppSheetFilterChips
} from '@/shared/components/ui/AppSheetView';

// ============================================================================
// COMPONENTE PRINCIPAL: EventsPage
// ============================================================================
export const EventsPage: React.FC = () => {
  const settings = useAppStore(state => state.settings);
  const theme = (settings.theme as 'dark' | 'light' | 'high-contrast') || 'dark';

  const {
    filteredEvents,
    filters,
    isLoading,
    isSyncing,
    isCreateModalOpen,
    isEditModalOpen,
    selectedEvent,
    actions
  } = useEvents();

  const [detailEvent, setDetailEvent] = useState<EventRecord | null>(null);

  const handleViewDetail = useCallback((event: EventRecord) => {
    setDetailEvent(event);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setDetailEvent(null);
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    if (window.confirm('¿Eliminar este evento?')) {
      try {
        await actions.deleteEvent(id);
        if (detailEvent?.id === id) {
          setDetailEvent(null);
        }
      } catch {
        toast.error('Error al eliminar');
      }
    }
  }, [actions, detailEvent]);

  const handleEdit = useCallback((event: EventRecord) => {
    actions.setSelectedEvent(event);
    actions.setIsEditModalOpen(true);
  }, [actions]);

  const getStatus = (event: EventRecord) => {
    if (event.isAdjusted) return { label: 'Ajustado', variant: 'success' as const };
    if (event.destino) return { label: 'Destinado', variant: 'warning' as const };
    return { label: 'Pendiente', variant: 'info' as const };
  };

  const formatDate = (ts: number) => format(new Date(ts), 'dd MMM yyyy, HH:mm');

  return (
    <div className="h-full flex flex-col bg-[var(--appsheet-bg-base)] appsheet-dark">
      {/* Header estilo AppSheet */}
      <AppSheetHeader
        title="Eventos"
        subtitle={`${filteredEvents.length} registros`}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => actions.syncEvents()}
              disabled={isSyncing}
              className="p-2 rounded-lg hover:bg-[var(--appsheet-bg-hover)] transition-colors disabled:opacity-50"
              title="Sincronizar"
            >
              <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => actions.setIsCreateModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--appsheet-accent-primary)] text-white font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4" />
              Nuevo
            </button>
          </div>
        }
      />

      {/* Search estilo AppSheet */}
      <AppSheetSearchBar
        value={filters.searchQuery}
        onChange={actions.setSearchQuery}
        placeholder="Buscar por producto, barcode, FRC..."
      />

      {/* Filter chips */}
      <AppSheetFilterChips
        filters={[
          { label: 'Todos', key: [] },
          { label: 'Pendientes', key: ['pending'] },
          { label: 'Destinados', key: ['destined'] },
          { label: 'Ajustados', key: ['adjusted'] },
        ]}
        selectedKey={filters.selectedEvents}
        onChange={actions.setSelectedEvents}
      />

      {/* Lista estilo AppSheet */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-[var(--appsheet-text-tertiary)]" />
          </div>
        ) : filteredEvents.length === 0 ? (
          <AppSheetEmptyState
            icon={<Package className="w-12 h-12" />}
            title="No hay eventos"
            description="Crea un nuevo evento para comenzar"
            action={{
              label: '+ Crear Evento',
              onClick: () => actions.setIsCreateModalOpen(true)
            }}
          />
        ) : (
          filteredEvents.map(event => (
            <AppSheetListItem
              key={event.id}
              title={event.productName || 'Sin producto'}
              subtitle={event.barcode}
              status={getStatus(event)}
              metadata={[
                { label: 'FRC', value: event.frc || 'N/A' },
                { label: 'Destino', value: event.destino || 'N/A' },
                { label: 'Fecha', value: formatDate(event.timestamp) }
              ]}
              onClick={() => handleViewDetail(event)}
              actions={[
                { label: 'Ver detalle', icon: <Eye className="w-4 h-4" />, onClick: () => handleViewDetail(event) },
                { label: 'Editar', icon: <Edit2 className="w-4 h-4" />, onClick: () => handleEdit(event) },
                { label: 'Eliminar', icon: <Trash2 className="w-4 h-4" />, onClick: () => handleDelete(event.id), variant: 'danger' }
              ]}
            />
          ))
        )}
      </div>

      {/* Vista de Detalle integrada estilo AppSheet */}
      <AnimatePresence>
        {detailEvent && (
          <AppSheetDetailView
            title={detailEvent.productName || 'Evento'}
            subtitle={detailEvent.barcode}
            icon={<Package className="w-5 h-5" />}
            status={getStatus(detailEvent)}
            sections={[
              {
                title: 'Producto',
                icon: <Package className="w-4 h-4" />,
                rows: [
                  { label: 'Nombre', value: detailEvent.productName || 'N/A' },
                  { label: 'Barcode', value: detailEvent.barcode },
                  { label: 'Cantidad', value: '1 unidad' }
                ]
              },
              {
                title: 'Documento',
                icon: <FileText className="w-4 h-4" />,
                rows: [
                  { label: 'FRC', value: detailEvent.frc || 'Sin FRC' },
                  { label: 'Traspaso', value: detailEvent.traspaso || 'N/A' }
                ]
              },
              {
                title: 'Ubicación',
                icon: <MapPin className="w-4 h-4" />,
                rows: [
                  { label: 'Destino', value: detailEvent.destino || 'Sin destino' }
                ]
              },
              {
                title: 'Tiempo',
                icon: <Clock className="w-4 h-4" />,
                rows: [
                  { label: 'Creado', value: formatDate(detailEvent.timestamp) }
                ]
              },
              ...(detailEvent.observaciones ? [{
                title: 'Notas',
                icon: <FileText className="w-4 h-4" />,
                rows: [{ label: 'Observaciones', value: detailEvent.observaciones }]
              }] : [])
            ]}
            onClose={handleCloseDetail}
            actions={[
              { label: 'Editar', onClick: () => { handleCloseDetail(); handleEdit(detailEvent); }, variant: 'primary' },
              { label: 'Eliminar', onClick: () => { handleCloseDetail(); handleDelete(detailEvent.id); }, variant: 'danger' }
            ]}
          />
        )}
      </AnimatePresence>

      {/* Modales */}
      <CreateEventModal
        isOpen={isCreateModalOpen}
        onClose={() => actions.setIsCreateModalOpen(false)}
        onSubmit={async (data) => {
          for (const item of data) {
            await actions.createEvent({
              barcode: item.barcode,
              productName: item.productName,
              destino: item.destino,
              traspaso: item.traspaso,
              observaciones: item.observaciones,
              frc: item.frc,
              isAdjusted: false,
              timestamp: Date.now()
            });
          }
          actions.setIsCreateModalOpen(false);
        }}
        theme={theme}
      />

      <CreateEventModal
        isOpen={isEditModalOpen}
        onClose={() => actions.setIsEditModalOpen(false)}
        onSubmit={async (data) => {
          if (selectedEvent && data.length > 0) {
            const item = data[0];
            await actions.updateEvent(selectedEvent.id, {
              barcode: item.barcode,
              productName: item.productName,
              destino: item.destino,
              traspaso: item.traspaso,
              observaciones: item.observaciones,
              frc: item.frc,
            });
          }
          actions.setIsEditModalOpen(false);
        }}
        theme={theme}
        editingItem={selectedEvent ? {
          barcode: selectedEvent.barcode,
          productName: selectedEvent.productName,
          providerName: undefined,
          event: 'AJUSTE',
          quantity: 1,
          frc: selectedEvent.frc,
          nguia: '',
          destino: selectedEvent.destino,
          traspaso: selectedEvent.traspaso,
          observaciones: selectedEvent.observaciones,
        } : null}
      />
    </div>
  );
};

export default EventsPage;
