import React from 'react';
import { useAppStore } from '@/store/mainAppStore';
import { DynamicList } from '../../components/DynamicList';
import { DynamicForm } from '../../components/DynamicForm';
import { motion, AnimatePresence } from 'motion/react';
import { X, Database, Cloud, AlertCircle, CheckCircle2, Printer } from 'lucide-react';
import { dynamicSyncService } from '../../services/dynamicSync';
import { dynamicDataService } from '../../services/dynamicDataService';
import { db } from '../../db';
import { useLiveQuery } from 'dexie-react-hooks';
import { ColumnSchema } from '../../types';
import { toast } from 'sonner';
import { useParams, useNavigate } from 'react-router-dom';
import { RefreshCw, Edit3, Trash2 } from 'lucide-react';
import { ModuleHeader } from '../../shared/components/layout/ModuleHeader';
import { BarcodeLabelModal } from '../../shared/components/ui/BarcodeLabelModal';
import { thermalPrinter } from '../../services/thermalPrinterService';
import { handlePrintLabels } from '../expiry/utils/expiryUtils';
import { MassActionsPanel } from '../../shared/components/ui/MassActionsPanel';

import { dynamicDataRepository } from '../../repositories/DynamicDataRepository';

interface DynamicManagementPageProps {
  tableKey?: 'expiry' | 'products' | 'counts' | 'events';
  theme?: 'dark' | 'light';
}

export const DynamicManagementPage: React.FC<DynamicManagementPageProps> = ({
  tableKey: propTableKey,
  theme = 'dark'
}) => {
  const navigate = useNavigate();
  const { tableKey: paramsTableKey } = useParams<{ tableKey: string }>();
  const tableKey = (propTableKey || paramsTableKey) as 'expiry' | 'products' | 'counts' | 'events';
  
  const { settings } = useAppStore();
  const schema = settings.schema?.[tableKey] || settings.cloudConfig?.schema?.[tableKey];
  const [isAdding, setIsAdding] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [selectedItem, setSelectedItem] = React.useState<any>(null);
  const [isRetrying, setIsRetrying] = React.useState(false);
  const [isPulling, setIsPulling] = React.useState(false);
  const [isLabelModalOpen, setIsLabelModalOpen] = React.useState(false);
  const [isPrinting, setIsPrinting] = React.useState(false);
  
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());

  // Helper to find barcode/name/qty in dynamic items
  const findBarcode = (item: any) => item?.barcode || item?.code || item?.sku || item?.ean || item?.id;
  const findName = (item: any) => item?.name || item?.description || item?.productName || item?.title || 'SIN_NOMBRE';
  const findQty = (item: any) => Number(item?.quantity || item?.qty || item?.stock || item?.totalQuantity || 0);

  // Fetch data from dynamic_data table for this specific tableName
  const records = useLiveQuery(
    () => dynamicDataRepository.getAllByTableName(schema?.tableName || ''),
    [schema?.tableName]
  );

  const items = React.useMemo(() => 
    records?.map(r => ({ ...r.data, id: r.id, _syncStatus: r.syncStatus, _syncError: r.syncError })) || [], 
    [records]
  );

  if (!schema) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-10 text-center">
        <AlertCircle className="w-12 h-12 text-rose-500" />
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-black uppercase tracking-tighter italic text-white">
            Esquema no encontrado
          </h2>
          <p className="text-sm font-bold text-stone-500 uppercase tracking-widest max-w-xs">
            No se ha definido una configuración para la tabla "{tableKey}".
          </p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (values: any) => {
    try {
      if (isEditing && selectedItem) {
        await dynamicDataRepository.save({
          ...selectedItem,
          data: values,
          syncStatus: 'pending',
          syncError: undefined
        });
        toast.success('Registro actualizado');
      } else {
        await dynamicDataService.saveRecord(schema.tableName, values);
        toast.success('Registro guardado');
      }
      setIsAdding(false);
      setIsEditing(false);
      setSelectedItem(null);
    } catch (error) {
      toast.error('Error al guardar');
    }
  };

  const handleRemove = async (item: any) => {
    if (confirm('¿Estás seguro de eliminar este registro?')) {
      await dynamicDataRepository.delete(item.id);
      toast.success('Registro eliminado');
      
      if (selectedIds.has(item.id)) {
        const newSelected = new Set(selectedIds);
        newSelected.delete(item.id);
        setSelectedIds(newSelected);
      }
    }
  };

  const handleRetrySync = async (item: any) => {
    setIsRetrying(true);
    const toastId = toast.loading(`Sincronizando...`);
    try {
      await dynamicDataRepository.retryPending(item.id);
      const result = await dynamicSyncService.syncAllPending(undefined, schema.tableName);
      if (result.success > 0) toast.success('Sincronización exitosa', { id: toastId });
      else toast.error('La sincronización falló', { id: toastId });
    } catch (error: any) {
      toast.error(`Error: ${error.message}`, { id: toastId });
    } finally {
      setIsRetrying(false);
    }
  };

  const handlePullSync = async () => {
    setIsPulling(true);
    const toastId = toast.loading(`Descargando datos...`);
    try {
      const result = await dynamicSyncService.pullSync(schema.tableName, (msg) => {
        toast.loading(msg, { id: toastId });
      });
      toast.success(`Sincronización: ${result.added} nuevos, ${result.updated} actualizados`, { id: toastId });
    } catch (error: any) {
      toast.error(`Error: ${error.message}`, { id: toastId });
    } finally {
      setIsPulling(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.size === items.length && items.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map(i => i.id)));
    }
  };

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedIds(newSelected);
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleMassDelete = async () => {
    if (!window.confirm(`¿Eliminar ${selectedIds.size} registros?`)) return;
    try {
      await dynamicDataRepository.deleteMany(Array.from(selectedIds));
      toast.success('Registros eliminados');
      clearSelection();
    } catch (error) {
      toast.error('Error al eliminar');
    }
  };

  const handleMassSync = async () => {
    const toastId = toast.loading(`Sincronizando ${selectedIds.size} registros...`);
    try {
      await Promise.all(Array.from(selectedIds).map(id => 
        dynamicDataRepository.retryPending(id)
      ));
      await dynamicSyncService.syncAllPending(undefined, schema.tableName);
      toast.success(`Sincronización completada`, { id: toastId });
      clearSelection();
    } catch (error: any) {
      toast.error(`Error: ${error.message}`, { id: toastId });
    }
  };

  const handleMassPrint = () => {
    if (selectedIds.size === 0) return;
    const selectedItems = items.filter(i => selectedIds.has(i.id));
    
    // Adapt items for handlePrintLabels (expects { barcode, productName })
    const printItems = selectedItems.map(i => ({
      barcode: findBarcode(i),
      productName: findName(i)
    }));

    handlePrintLabels(printItems);
    toast.success(`Generando ${printItems.length} etiquetas`);
    clearSelection();
  };

  const handlePrintThermal = async () => {
    if (!selectedItem) return;
    setIsPrinting(true);
    try {
      const barcode = findBarcode(selectedItem);
      const name = findName(selectedItem);
      const qty = findQty(selectedItem);
      
      if (!thermalPrinter.isConnected()) {
        toast.error('Impresora no conectada. Conéctala en Configuración.');
        return;
      }

      await thermalPrinter.printLabel(barcode, name, qty);
      toast.success('Etiqueta enviada a impresora');
    } catch (error: any) {
      toast.error(`Error de impresión: ${error.message}`);
    } finally {
      setIsPrinting(false);
    }
  };

  const handlePrintPDF = () => {
    if (!selectedItem) return;
    const barcode = findBarcode(selectedItem);
    const name = findName(selectedItem);
    handlePrintLabels([{ barcode, productName: name }]);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden relative bg-[#050505]">
      <ModuleHeader 
        title={schema.tableName}
        subtitle={`Gestión de ${schema.tableName}`}
        onBack={() => navigate(-1)}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handlePullSync}
              disabled={isPulling}
              className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl text-slate-400 active:bg-white/10 transition-colors"
            >
              <RefreshCw className={`w-5 h-5 ${isPulling ? 'animate-spin' : ''}`} />
            </button>
          </div>
        }
      />

      <MassActionsPanel 
        selectedCount={selectedIds.size}
        onClear={clearSelection}
        actions={[
          { label: 'Imprimir', icon: Printer, onClick: handleMassPrint, variant: 'warning' },
          { label: 'Sync', icon: Cloud, onClick: handleMassSync, variant: 'info' },
          { label: 'Borrar', icon: Trash2, onClick: handleMassDelete, variant: 'danger' }
        ]}
        theme={settings.theme}
      />

      <div className="flex-1 overflow-hidden p-4">
        <DynamicList
          items={items}
          schema={schema}
          onAdd={() => {
            setIsAdding(true);
            setIsEditing(false);
            setSelectedItem(null);
          }}
          onRemove={handleRemove}
          onClick={setSelectedItem}
          onBack={() => navigate(-1)}
          theme={theme}
          title={schema.tableName}
          onPullSync={handlePullSync}
          isPulling={isPulling}
          selectedIds={selectedIds}
          onSelect={toggleSelection}
          onSelectAll={handleSelectAll}
        />
      </div>

      <AnimatePresence>
        {(isAdding || isEditing || selectedItem) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border shadow-2xl relative bg-slate-900 border-white/10"
            >
              <div className="sticky top-0 z-10 p-6 flex items-center justify-between border-b border-white/5 bg-slate-900">
                <div className="flex flex-col">
                  <h3 className="text-xl font-black uppercase tracking-tighter italic text-white">
                    {isAdding ? `Nuevo: ${schema.tableName}` : isEditing ? `Editar: ${schema.tableName}` : 'Detalles'}
                  </h3>
                  <span className="text-[10px] font-black text-stone-500 uppercase tracking-widest">
                    {isAdding || isEditing ? 'Completa los campos' : `ID: ${selectedItem?.id}`}
                  </span>
                </div>
                <button
                  onClick={() => { setIsAdding(false); setIsEditing(false); setSelectedItem(null); }}
                  className="p-2 hover:bg-white/5 rounded-xl transition-colors"
                >
                  <X className="w-6 h-6 text-stone-500" />
                </button>
              </div>

              <div className="p-6">
                {isAdding || isEditing ? (
                  <DynamicForm
                    schema={schema}
                    initialValues={isEditing ? selectedItem : undefined}
                    onSubmit={handleSubmit}
                    onCancel={() => {
                      setIsAdding(false);
                      setIsEditing(false);
                      if (isEditing) setSelectedItem(selectedItem);
                    }}
                    theme={theme}
                  />
                ) : (
                  <div className="flex flex-col gap-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(schema.columns).map(([key, col]) => {
                        const column = col as ColumnSchema;
                        return (
                          <div key={key} className="flex flex-col gap-1 p-3 rounded-xl bg-white/5 border border-white/5">
                            <span className="text-[10px] font-black text-stone-500 uppercase tracking-widest">{column.label}</span>
                            <span className="text-sm font-bold text-white">{String(selectedItem?.[key] || 'N/A')}</span>
                          </div>
                        );
                      })}
                    </div>
                    
                    <div className={`flex flex-col gap-3 p-4 rounded-2xl border ${
                      selectedItem?._syncStatus === 'synced' ? 'bg-emerald-500/10 border-emerald-500/20' :
                      selectedItem?._syncStatus === 'error' ? 'bg-rose-500/10 border-rose-500/20' :
                      'bg-amber-500/10 border-amber-500/20'
                    }`}>
                      <div className="flex items-center gap-2">
                        {selectedItem?._syncStatus === 'synced' ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : 
                         selectedItem?._syncStatus === 'error' ? <AlertCircle className="w-5 h-5 text-rose-500" /> : 
                         <Cloud className="w-5 h-5 text-amber-500" />}
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black uppercase tracking-widest text-white/50">Sincronización</span>
                          <span className="text-xs font-bold text-white uppercase">
                            {selectedItem?._syncStatus === 'synced' ? 'Sincronizado' : 
                             selectedItem?._syncStatus === 'error' ? 'Error' : 'Pendiente'}
                          </span>
                        </div>
                      </div>

                      {selectedItem?._syncStatus === 'error' && (
                        <div className="mt-2 p-3 bg-black/40 rounded-xl border border-rose-500/30">
                          <p className="text-xs font-mono text-rose-200 break-words">{selectedItem?._syncError || 'Error desconocido'}</p>
                        </div>
                      )}

                      {selectedItem?._syncStatus === 'error' && (
                        <div className="flex gap-2 mt-2">
                          <button onClick={() => handleRetrySync(selectedItem)} className="flex-1 flex items-center justify-center gap-2 py-2 bg-rose-600 text-white text-[10px] font-black uppercase rounded-xl">
                            <RefreshCw className={`w-3 h-3 ${isRetrying ? 'animate-spin' : ''}`} /> Reintentar
                          </button>
                          <button onClick={() => setIsEditing(true)} className="flex-1 flex items-center justify-center gap-2 py-2 bg-white/10 text-white text-[10px] font-black uppercase rounded-xl border border-white/10">
                            <Edit3 className="w-3 h-3" /> Editar
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <button 
                        onClick={() => setIsLabelModalOpen(true)}
                        className="flex items-center justify-center gap-2 py-4 bg-amber-500 text-black font-black uppercase tracking-widest rounded-2xl border border-amber-600 shadow-lg shadow-amber-500/20"
                      >
                        <Printer className="w-5 h-5" /> Imprimir Etiqueta
                      </button>
                      <button onClick={() => setSelectedItem(null)} className="py-4 bg-white/5 text-white font-black uppercase tracking-widest rounded-2xl border border-white/10">
                        Cerrar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {selectedItem && (
        <BarcodeLabelModal 
          isOpen={isLabelModalOpen}
          onClose={() => setIsLabelModalOpen(false)}
          barcode={findBarcode(selectedItem)}
          productName={findName(selectedItem)}
          quantity={findQty(selectedItem)}
          isPrinting={isPrinting}
          onPrintThermal={handlePrintThermal}
          onPrintPDF={handlePrintPDF}
        />
      )}
    </div>
  );
};

