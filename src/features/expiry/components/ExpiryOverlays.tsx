import React from 'react';
import { AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { CheckSquare, Printer, Mail, Trash2 } from 'lucide-react';

// Overlays components
import { ManagementBulkActions } from '../../../shared/components/core/ManagementBulkActions';
import { ExpirySettingsDrawer } from './ExpirySettingsDrawer';
import { ExpiryDetailDrawer } from './ExpiryDetailDrawer';
import { ExpiryEmailModal } from './ExpiryEmailModal';
import { ExpirationModal } from './ExpirationModal';

interface ExpiryOverlaysProps {
  ui: any;
  actions: any;
  dbActions: any;
  state: any;
  settings: any;
  productMap: any;
}

export const ExpiryOverlays: React.FC<ExpiryOverlaysProps> = ({
  ui,
  actions,
  dbActions,
  state,
  settings,
  productMap
}) => {
  return (
    <>
      <ManagementBulkActions 
        selectedCount={state.selectedIds.size}
        onClearSelection={() => dbActions.setSelectedIds(new Set())}
        theme={settings.theme}
        actions={[
          {
            label: "Seleccionar Todos los Visibles",
            icon: CheckSquare,
            onClick: actions.handleSelectAllVisible,
            variant: "primary"
          },
          {
            label: "Imprimir Seleccionados",
            icon: Printer,
            onClick: actions.handlePrintSelected,
            variant: "secondary"
          },
          {
            label: "Imprimir Etiquetas",
            icon: Printer,
            onClick: actions.handlePrintLabelsBulk,
            variant: "warning"
          },
          {
            label: "Enviar por Correo",
            icon: Mail,
            onClick: actions.handleSendEmailBulk,
            variant: "success"
          },
          {
            label: "Retirar Seleccionados",
            icon: Trash2,
            onClick: actions.confirmBulkRemove,
            variant: "danger"
          }
        ]}
      />

      <ExpirySettingsDrawer 
        isOpen={ui.isSettingsDrawerOpen}
        onClose={() => actions.setIsSettingsDrawerOpen(false)}
        preferences={state.preferences}
        onUpdatePreferences={dbActions.handleUpdatePreferences}
        onFullRefresh={dbActions.handleFullRefresh}
        onClearLocalData={dbActions.clearLocalData}
        theme={settings.theme}
      />

      <ExpiryDetailDrawer
        isOpen={!!ui.detailItem}
        onClose={() => actions.setDetailItem(null)}
        item={ui.detailItem}
        theme={settings.theme}
        onEdit={(item) => {
          actions.setDetailItem(null);
          actions.handleEdit(item);
        }}
        onDelete={(item) => {
          actions.setDetailItem(null);
          actions.confirmRemoveItem(item);
        }}
        onPrintCode={(item) => {
          toast('Etiqueta impresa (simulado)');
        }}
      />

      <ExpiryEmailModal
        isOpen={ui.isEmailModalOpen}
        onClose={() => actions.setIsEmailModalOpen(false)}
        selectedItems={state.allItems.filter((item: any) => state.selectedIds.has(item.id))}
        theme={settings.theme}
      />

      <AnimatePresence>
        {ui.isDesktopAddModalOpen && (
          <ExpirationModal 
            productMap={productMap}
            initialBarcode={ui.initialBarcode}
            onCancel={() => {
              actions.setIsDesktopAddModalOpen(false);
              actions.setInitialBarcode('');
            }}
            onComplete={(data) => {
              actions.setIsDesktopAddModalOpen(false);
              
              dbActions.handleAddItem({
                barcode: data.barcode,
                productName: data.productName,
                mm: data.mm,
                yyyy: data.yyyy,
                quantity: 1,
                observaciones: data.observaciones,
                fechaCC: `${String(data.mm).padStart(2, '0')}/${data.yyyy}`
              });
              
              toast.success('Registrando vencimiento...');
            }}
          />
        )}

        {ui.editingItem && (
          <ExpirationModal 
            productMap={productMap}
            title="EDITAR REGISTRO"
            initialBarcode={ui.editingItem.barcode}
            initialData={{
              mm: ui.editingItem.mm,
              yyyy: ui.editingItem.yyyy,
              productName: ui.editingItem.productName,
              observaciones: ui.editingItem.observaciones
            }}
            onCancel={() => actions.setEditingItem(null)}
            onComplete={(data) => {
              actions.setEditingItem(null);
              dbActions.handleUpdateItem(ui.editingItem.id, {
                mm: data.mm,
                yyyy: data.yyyy,
                productName: data.productName,
                observaciones: data.observaciones
              });
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
};
