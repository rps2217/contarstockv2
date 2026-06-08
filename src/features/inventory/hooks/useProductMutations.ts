import { useCallback } from 'react';
import * as productService from '../../../services/productService';

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
