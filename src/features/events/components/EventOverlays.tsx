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
  uiActions: any;
  state: any;
  actions: any;
  settings: any;
}

export const EventOverlays: React.FC<EventOverlaysProps> = ({
  ui,
  uiActions,
  state,
  actions,
  settings
}) => {
  return (
    <>
      <ManagementBulkActions 
        selectedCount={state.selectedIds?.size || 0}
        onClearSelection={actions.clearSelection}
        theme={settings.theme}
        actions={[
          {
            label: "Seleccionar Todos los Visibles",
            icon: CheckSquare,
            onClick: actions.handleSelectAll,
            variant: "primary"
          },
          {
            label: "Retirar Seleccionados",
            icon: Trash2,
            onClick: uiActions.handleBulkRemove,
            variant: "danger"
          },
          {
            label: "Imprimir Etiquetas",
            icon: Printer,
            onClick: uiActions.handleBulkPrintLabels,
            variant: "warning"
          },
          {
            label: "Imprimir Reporte",
            icon: Printer,
            onClick: uiActions.handleBulkPrintSelected,
            variant: "secondary"
          },
          {
            label: "Enviar por Correo",
            icon: Mail,
            onClick: uiActions.handleBulkSendEmail,
            variant: "success"
          },
          {
            label: "Buscar Documento",
            icon: Search,
            onClick: uiActions.handleBulkSearchDocument,
            variant: "info"
          },
          {
            label: "Edición Masiva",
            icon: Edit3,
            onClick: () => uiActions.setIsBulkEditModalOpen(true),
            variant: "primary"
          }
        ]}
      />

      <BulkEditModal
        isOpen={ui.isBulkEditModalOpen}
        onClose={() => uiActions.setIsBulkEditModalOpen(false)}
        onApply={uiActions.handleBulkEdit}
        theme={settings.theme}
        selectedCount={state.selectedIds?.size || 0}
      />

      <EventSettingsDrawer 
        isOpen={ui.isSettingsDrawerOpen}
        onClose={() => uiActions.setIsSettingsDrawerOpen(false)}
        preferences={state.preferences}
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
          uiActions.setIsCreateModalOpen(false);
          uiActions.setEditingItem(null);
        }}
        onSubmit={uiActions.handleCreateOrUpdate}
        editingItem={ui.editingItem}
        theme={settings.theme}
      />

      <EventEmailModal
        isOpen={ui.isEmailModalOpen}
        onClose={() => uiActions.setIsEmailModalOpen(false)}
        selectedItems={state.processedEvents?.filter((item: any) => state.selectedIds?.has(item.id)) || []}
        theme={settings.theme}
      />
    </>
  );
};
