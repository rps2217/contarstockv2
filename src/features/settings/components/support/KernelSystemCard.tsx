
import React, { useState } from 'react';
import { RefreshCw, Trash2, Layout, Database, ArrowUpCircle } from 'lucide-react';
import { SettingsCard, SettingsCardHeader, SettingsButton } from '../common/SettingsElements';
import { InitializationService } from '../../../../services/initializationService';
import { supabaseSyncService } from '../../../../services/supabaseSyncService';
import { exportToCSV } from '../../../../services/export';
import { toast } from 'sonner';

export const KernelSystemCard: React.FC = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleSyncConfig = async () => {
    setIsSyncing(true);
    try {
      await InitializationService.syncConfig();
      toast.success('Configuración sincronizada');
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      toast.error('Error al conocer configuración');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClearLocalData = async () => {
    if (confirm("⚠️ ADVERTENCIA ⚠️\n\nEsto eliminará todos los registros locales (Vencimientos y Eventos). Se volverán a descargar desde la nube en la próxima sincronización.\n\n¿Estás seguro de continuar?")) {
      localStorage.removeItem('logicount_expiry_data');
      localStorage.removeItem('logicount_event_data');
      toast.success('Datos locales eliminados');
      setTimeout(() => window.location.reload(), 1000);
    }
  };

  const handleExportAll = async (type: 'VENCIMIENTOS' | 'EVENTOS') => {
    setIsExporting(true);
    try {
      const result = await supabaseSyncService.pullBatch(type);
      if (result.success) {
        await exportToCSV(result.rows, `${type}_Full_Export`);
        toast.success(`Exportación de ${type} completada`);
      } else {
        toast.error('Error al obtener datos de la nube');
      }
    } catch (error) {
      toast.error('Error en la exportación');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <SettingsCard className="border-4 border-slate-100 dark:border-white/5 bg-white dark:bg-slate-900">
      <SettingsCardHeader 
        icon={Database} 
        title="Gestión de Datos & Kernel" 
        subtitle="Operaciones críticas de sincronización"
        color="bg-indigo-500"
      />

      <div className="space-y-3">
        <SettingsButton 
          onClick={handleSyncConfig}
          isLoading={isSyncing}
          label="Actualizar desde Nube"
          icon={RefreshCw}
          variant="primary"
        />

        <div className="grid grid-cols-1 gap-3">
          <SettingsButton 
            onClick={() => window.location.reload()}
            label="Reiniciar Kernel"
            icon={RefreshCw}
            variant="outline"
          />
        </div>

        <SettingsButton 
          onClick={handleClearLocalData}
          label="Limpiar Datos Locales"
          icon={Trash2}
          variant="danger"
        />

        <div className="pt-4 border-t border-slate-100 dark:border-white/5">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Exportación Maestra</p>
          <div className="grid grid-cols-2 gap-3">
            <SettingsButton 
              onClick={() => handleExportAll('VENCIMIENTOS')}
              isLoading={isExporting}
              label="Exportar Vencimientos"
              icon={Layout}
              variant="outline"
            />
            <SettingsButton 
              onClick={() => handleExportAll('EVENTOS')}
              isLoading={isExporting}
              label="Exportar Eventos"
              icon={Layout}
              variant="outline"
            />
          </div>
        </div>
      </div>
    </SettingsCard>
  );
};
