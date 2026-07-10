import { useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { productRepository } from '@/repositories/DexieProductRepository';
import { BulkAction, BulkEditConfig } from '@/hooks/useBulkActions';
import { Trash2, Download } from 'lucide-react';

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

// Timeout para undo (5 segundos)
const UNDO_TIMEOUT = 5000;

export const useProductMutations = (showFeedback: (type: 'success' | 'error', msg: string) => void) => {
  const pendingDeletes = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const handleDelete = useCallback(async (barcode: string) => {
    // Soft delete - guardar backup
    const backup = await productRepository.softDelete(barcode);
    if (!backup) {
      toast.error('Producto no encontrado');
      return;
    }

    // Toast con undo
    toast.success('Producto eliminado', {
      duration: UNDO_TIMEOUT,
      action: {
        label: 'Deshacer',
        onClick: async () => {
          // Cancelar timeout si existe
          const timeout = pendingDeletes.current.get(barcode);
          if (timeout) {
            clearTimeout(timeout);
            pendingDeletes.current.delete(barcode);
          }
          // Restaurar
          await productRepository.restore(barcode);
          toast.info('Eliminación cancelada');
        },
      },
    });

    // Programar eliminación permanente
    const timeout = setTimeout(async () => {
      await productRepository.permanentDelete(barcode);
      pendingDeletes.current.delete(barcode);
      showFeedback('success', 'Producto eliminado permanentemente');
    }, UNDO_TIMEOUT);

    pendingDeletes.current.set(barcode, timeout);
  }, [showFeedback]);

  const handleDeleteAll = useCallback(async () => {
    if (prompt('Escribe BORRAR para confirmar:') === 'BORRAR') {
      // Eliminar todos sin undo (operación peligrosa)
      const products = await productRepository.getAll();
      for (const product of products) {
        await productRepository.permanentDelete(product.barcode);
      }
      showFeedback('success', 'Base de datos vaciada');
    }
  }, [showFeedback]);

  return {
    handleDelete,
    handleDeleteAll
  };
};
