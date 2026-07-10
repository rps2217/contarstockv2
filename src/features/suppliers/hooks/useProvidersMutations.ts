import { toast } from 'sonner';
import { Provider } from '../../../types';
import { ProviderRepository } from '../../../repositories/ProviderRepository';
import { db } from '../../../db';

export const useProvidersMutations = (
  loadProviders: () => Promise<void>
) => {
  const handleDelete = async (rut: string) => {
    if (confirm('¿Estás seguro de eliminar este proveedor? Esto afectará el cálculo de vencimientos de sus productos.')) {
      await ProviderRepository.delete(rut);
      toast.success('Proveedor eliminado');
      await loadProviders();
    }
  };

  const handleSave = async (provider: Provider) => {
    await ProviderRepository.save(provider);
    toast.success('Proveedor guardado exitosamente');
    await loadProviders();
  };

  const handleAutoFill = async () => {
    if (!confirm('¿Deseas extraer los proveedores de tu catálogo de productos actual? Se agregarán con la política por defecto (Canje: Sí, 90 días).')) return;
    
    const products = await db.products.toArray();
    const existingProviders = await ProviderRepository.getAll();
    const existingRuts = new Set(existingProviders.map(p => p.rut));
    
    const newProvidersMap = new Map<string, Provider>();
    
    products.forEach(p => {
      if (p.supplier && p.supplier.trim() !== '' && p.supplier.trim().toUpperCase() !== 'N/A') {
        const rut = p.supplierRut || `GEN-${p.supplier.substring(0, 8).toUpperCase().replace(/[^A-Z0-9]/g, '')}`;
        if (!existingRuts.has(rut) && !newProvidersMap.has(rut)) {
          newProvidersMap.set(rut, {
            rut,
            name: p.supplier.trim().toUpperCase(),
            hasExchange: true,
            withdrawalDays: 90
          });
        }
      }
    });
    
    const newProviders = Array.from(newProvidersMap.values());
    if (newProviders.length > 0) {
      await db.providers.bulkPut(newProviders);
      toast.success(`Se agregaron ${newProviders.length} proveedores desde el catálogo.`);
      await loadProviders();
    } else {
      toast.info('No se encontraron proveedores nuevos en el catálogo.');
    }
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Por favor, selecciona un archivo CSV.');
      return;
    }

    toast.loading('Importando políticas...');
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const csvText = event.target?.result as string;
        const { bulkImportProviders } = await import('../../../services/providerImporter');
        const count = await bulkImportProviders(csvText);
        toast.dismiss();
        toast.success(`¡Se importaron/actualizaron ${count} proveedores exitosamente!`);
        await loadProviders();
      } catch (err: any) {
        toast.dismiss();
        toast.error('Error en formato CSV. Asegúrate de que tenga las columnas correctas.');
      }
    };
    reader.onerror = () => {
      toast.dismiss();
      toast.error('Ocurrió un error al leer el archivo.');
    };
    reader.readAsText(file, 'UTF-8');
    
    if(e.target) e.target.value = '';
  };

  return {
    handleDelete,
    handleSave,
    handleAutoFill,
    handleImportCSV
  };
};
