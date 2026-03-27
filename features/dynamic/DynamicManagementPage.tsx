import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { DynamicList } from '../../components/DynamicList';
import { DynamicForm } from '../../components/DynamicForm';
import { motion, AnimatePresence } from 'motion/react';
import { X, Database, Cloud, AlertCircle, CheckCircle2 } from 'lucide-react';
import { dynamicSyncService } from '../../services/dynamicSync';
import { dynamicDataService } from '../../services/dynamicDataService';
import { db, DynamicRecord } from '../../db';
import { useLiveQuery } from 'dexie-react-hooks';
import { TableSchema } from '../../types';
import { toast } from 'sonner';
import { useParams, useNavigate } from 'react-router-dom';
import { RefreshCw, Edit3, ArrowLeft } from 'lucide-react';

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
  const schema = settings.schema?.[tableKey];
  const [isAdding, setIsAdding] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [selectedItem, setSelectedItem] = React.useState<any>(null);
  const [isRetrying, setIsRetrying] = React.useState(false);
  const [isPulling, setIsPulling] = React.useState(false);
  const [pullProgress, setPullProgress] = React.useState<string | null>(null);

  // Fetch data from dynamic_data table for this specific tableName
  const records = useLiveQuery(
    () => db.dynamic_data
      .where('tableName')
      .equals(schema?.tableName || '')
      .reverse()
      .sortBy('timestamp'),
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
        await db.dynamic_data.update(selectedItem.id, {
          data: values,
          syncStatus: 'pending',
          syncError: undefined
        });
        toast.success('Registro actualizado y marcado para re-sincronización');
      } else {
        await dynamicDataService.saveRecord(schema.tableName, values);
        toast.success('Registro guardado correctamente');
      }
      setIsAdding(false);
      setIsEditing(false);
      setSelectedItem(null);
    } catch (error) {
      toast.error('Error al guardar el registro');
    }
  };

  const handleRemove = async (item: any) => {
    if (confirm('¿Estás seguro de eliminar este registro?')) {
      await db.dynamic_data.delete(item.id);
      toast.success('Registro eliminado');
    }
  };

  const handleRetrySync = async (item: any) => {
    setIsRetrying(true);
    const toastId = toast.loading(`Reintentando sincronización de ${schema.tableName}...`);
    try {
      // Marcar como pendiente primero
      await db.dynamic_data.update(item.id, { syncStatus: 'pending', syncError: undefined });
      
      // Ejecutar sincronización solo para esta tabla
      const result = await dynamicSyncService.syncAllPending(undefined, schema.tableName);
      
      if (result.success > 0) {
        toast.success('Sincronización exitosa', { id: toastId });
      } else if (result.failed > 0) {
        toast.error('La sincronización volvió a fallar', { id: toastId });
      } else {
        toast.info('No se encontraron registros pendientes', { id: toastId });
      }
    } catch (error: any) {
      toast.error(`Error: ${error.message}`, { id: toastId });
    } finally {
      setIsRetrying(false);
    }
  };

  const handlePullSync = async () => {
    setIsPulling(true);
    const toastId = toast.loading(`Descargando datos de ${schema.tableName}...`);
    try {
      const result = await dynamicSyncService.pullSync(schema.tableName, (msg) => {
        setPullProgress(msg);
        toast.loading(msg, { id: toastId });
      });
      
      toast.success(`Sincronización finalizada: ${result.added} nuevos, ${result.updated} actualizados`, { id: toastId });
    } catch (error: any) {
      toast.error(`Error en descarga: ${error.message}`, { id: toastId });
    } finally {
      setIsPulling(false);
      setPullProgress(null);
    }
  };

  return (
    <div className="h-full flex flex-col p-4 md:p-6 gap-6 overflow-hidden">
      <div className="flex-1 overflow-hidden">
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
        />
      </div>

      <AnimatePresence>
        {(isAdding || isEditing || selectedItem) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border shadow-2xl relative ${
                theme === 'dark' ? 'bg-slate-900 border-white/10' : 'bg-white border-stone-200'
              }`}
            >
              <div className="sticky top-0 z-10 p-6 flex items-center justify-between border-b border-white/5 bg-inherit">
                <div className="flex flex-col">
                  <h3 className="text-xl font-black uppercase tracking-tighter italic text-white">
                    {isAdding ? `Nuevo Registro: ${schema.tableName}` : isEditing ? `Editar Registro: ${schema.tableName}` : 'Detalles del Registro'}
                  </h3>
                  <span className="text-[10px] font-black text-stone-500 uppercase tracking-widest">
                    {isAdding || isEditing ? 'Completa los campos requeridos' : `ID: ${selectedItem?.id}`}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setIsAdding(false);
                    setIsEditing(false);
                    setSelectedItem(null);
                  }}
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
                      if (isEditing) setSelectedItem(selectedItem); // Volver a ver detalles
                    }}
                    theme={theme}
                  />
                ) : (
                  <div className="flex flex-col gap-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(schema.columns).map(([key, col]) => (
                        <div key={key} className="flex flex-col gap-1 p-3 rounded-xl bg-white/5 border border-white/5">
                          <span className="text-[10px] font-black text-stone-500 uppercase tracking-widest">
                            {col.label}
                          </span>
                          <span className="text-sm font-bold text-white">
                            {String(selectedItem?.[key] || 'N/A')}
                          </span>
                        </div>
                      ))}
                    </div>
                    
                    <div className={`flex flex-col gap-3 p-4 rounded-2xl border ${
                      selectedItem?._syncStatus === 'synced' ? 'bg-emerald-500/10 border-emerald-500/20' :
                      selectedItem?._syncStatus === 'error' ? 'bg-rose-500/10 border-rose-500/20' :
                      'bg-amber-500/10 border-amber-500/20'
                    }`}>
                      <div className="flex items-center gap-2">
                        {selectedItem?._syncStatus === 'synced' ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        ) : selectedItem?._syncStatus === 'error' ? (
                          <AlertCircle className="w-5 h-5 text-rose-500" />
                        ) : (
                          <Cloud className="w-5 h-5 text-amber-500" />
                        )}
                        <div className="flex flex-col">
                          <span className={`text-[10px] font-black uppercase tracking-widest ${
                            selectedItem?._syncStatus === 'synced' ? 'text-emerald-400' :
                            selectedItem?._syncStatus === 'error' ? 'text-rose-400' :
                            'text-amber-400'
                          }`}>Estado de Sincronización</span>
                          <span className="text-xs font-bold text-white uppercase tracking-widest">
                            {selectedItem?._syncStatus === 'synced' ? 'Sincronizado con la Nube' : 
                             selectedItem?._syncStatus === 'error' ? 'Error de Sincronización' :
                             'Pendiente de Sincronización'}
                          </span>
                        </div>
                      </div>

                      {selectedItem?._syncStatus === 'error' && (
                        <div className="mt-2 p-3 bg-black/40 rounded-xl border border-rose-500/30">
                          <span className="text-[9px] font-black text-rose-400 uppercase tracking-widest block mb-1">Mensaje de Error</span>
                          <p className="text-xs font-mono text-rose-200 break-words">
                            {selectedItem?._syncError || 'Error desconocido'}
                          </p>
                        </div>
                      )}

                      {selectedItem?._syncStatus === 'error' && (
                        <div className="flex gap-2 mt-2">
                          <button
                            disabled={isRetrying}
                            onClick={() => handleRetrySync(selectedItem)}
                            className="flex-1 flex items-center justify-center gap-2 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-800 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
                          >
                            {isRetrying ? <RefreshCw className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                            Reintentar
                          </button>
                          <button
                            onClick={() => setIsEditing(true)}
                            className="flex-1 flex items-center justify-center gap-2 py-2 bg-white/10 hover:bg-white/20 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border border-white/10"
                          >
                            <Edit3 className="w-3 h-3" />
                            Editar y Reintentar
                          </button>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => setSelectedItem(null)}
                      className="w-full py-4 bg-white/5 hover:bg-white/10 text-white font-black uppercase tracking-widest rounded-2xl transition-all border border-white/10"
                    >
                      Cerrar
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
