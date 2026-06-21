import React from 'react';
import {
  CheckSquare,
  Trash2,
  Printer,
  Mail,
  Search,
  Edit3
} from 'lucide-react';

// Decoupled components
import { ManagementBulkActions } from '../../../shared/components/core/ManagementBulkActions';
import { BulkEditModal } from './BulkEditModal';
import { EventSettingsDrawer } from './EventSettingsDrawer';
import { CreateEventModal } from './CreateEventModal';
import { EventEmailModal } from './EventEmailModal';

interface EventOverlaysProps {
  ui: any;
  actions: any;
  db: any;
  settings: any;
}

export const EventOverlays: React.FC<EventOverlaysProps> = ({
  ui,
  actions,
  db,
  settings
}) => {
  return (
    <>
      <ManagementBulkActions
        selectedCount={db.selectedIds?.size || 0}
        onClearSelection={() => actions.clearSelection?.()}
        theme={settings.theme}
        actions={[
          {
            label: "Seleccionar Todos",
            icon: CheckSquare,
            onClick: () => actions.handleSelectAll?.(db.processedEvents || []),
            variant: "primary"
          },
          {
            label: "Retirar Seleccionados",
            icon: Trash2,
            onClick: () => actions.handleBulkRemove?.(),
            variant: "danger"
          },
          {
            label: "Imprimir Etiquetas",
            icon: Printer,
            onClick: () => actions.handleBulkPrintLabels?.(),
            variant: "warning"
          },
          {
            label: "Imprimir Reporte",
            icon: Printer,
            onClick: () => actions.handleBulkPrintSelected?.(),
            variant: "secondary"
          },
          {
            label: "Enviar por Correo",
            icon: Mail,
            onClick: () => actions.handleBulkSendEmail?.(),
            variant: "success"
          },
          {
            label: "Edición Masiva",
            icon: Edit3,
            onClick: () => actions.handleBulkEdit?.(),
            variant: "primary"
          }
        ]}
      />

      <BulkEditModal
        isOpen={ui.isBulkEditModalOpen}
        onClose={() => actions.setIsBulkEditModalOpen?.(false)}
        onApply={actions.handleBulkEdit}
        theme={settings.theme}
        selectedCount={db.selectedIds?.size || 0}
      />

      <EventSettingsDrawer
        isOpen={ui.isSettingsDrawerOpen}
        onClose={() => actions.setIsSettingsDrawerOpen?.(false)}
        preferences={db.preferences}
        onUpdatePreferences={actions.togglePreference}
        onFullRefresh={actions.handleFullRefresh}
        onClearLocalData={actions.clearLocalData}
        onBulkImport={actions.handleBulkImport}
        onClearAllEvents={actions.handleClearAllEvents}
        theme={settings.theme}
      />

      <CreateEventModal
        isOpen={ui.isCreateModalOpen}
        onClose={() => {
          actions.setIsCreateModalOpen?.(false);
          actions.setEditingItem?.(null);
        }}
        onSubmit={actions.handleCreateOrUpdate}
        editingItem={ui.editingItem}
        theme={settings.theme}
      />

      <EventEmailModal
        isOpen={ui.isEmailModalOpen}
        onClose={() => actions.setIsEmailModalOpen?.(false)}
        selectedItems={db.processedEvents?.filter((item: any) => db.selectedIds?.has(item.id)) || []}
        theme={settings.theme}
      />
    </>
  );
};
