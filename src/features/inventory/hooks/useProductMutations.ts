import { useCallback } from 'react';
import * as productService from '../../../services/productService';
import { BulkAction, BulkEditConfig } from '@/hooks/useBulkActions';
import { Trash2, Download, Edit3 } from 'lucide-react';

// Configuración de acciones masivas para Inventory
export const INVENTORY_BULK_ACTIONS = (
  onDelete: (items: any[]) => Promise<void>,
  onExport: (items: any[]) => Promise<void>
): BulkAction[] => [
  {
    id: 'export',
    label: 'Exportar',
    icon: Download,
    variant: 'default',
    onClick: onExport
  },
  {
    id: 'delete',
    label: 'Eliminar',
    icon: Trash2,
    variant: 'danger',
    requiresConfirmation: true,
    confirmMessage: '¿Eliminar los productos seleccionados? Esta acción es irreversible.',
    onClick: onDelete
  }
];

// Configuración de edición masiva para Inventory
export const INVENTORY_BULK_EDIT_CONFIG: BulkEditConfig = {
  title: 'Actualizar Productos',
  description: 'Modificar información de los productos seleccionados.',
  fields: [
    {
      key: 'location',
      label: 'Ubicación',
      type: 'text'
    },
    {
      key: 'category',
      label: 'Categoría',
      type: 'text'
    }
  ],
  onApply: async () => {}
};

export const useProductMutations = (showFeedback: (type: 'success' | 'error', msg: string) => void) => {
  const handleDelete = useCallback(async (barcode: string) => {
    if (confirm('¿Eliminar producto?')) {
      await productService.deleteProduct(barcode);
      showFeedback('success', 'Producto eliminado');
    }
  }, [showFeedback]);

  const handleDeleteAll = useCallback(async () => {
    if (prompt('Escribe BORRAR para confirmar:') === 'BORRAR') {
      await productService.deleteAllProducts();
      showFeedback('success', 'Base de datos vaciada');
    }
  }, [showFeedback]);

  return {
    handleDelete,
    handleDeleteAll
  };
};
