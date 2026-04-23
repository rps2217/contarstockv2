
import React, { useState } from 'react';
import { RefreshCw, Trash2, Layout, Database, ArrowUpCircle } from 'lucide-react';
import { SettingsCard, SettingsCardHeader, SettingsButton } from '../common/SettingsElements';
import { resetFirestore } from '../../../../lib/firebase';
import { InitializationService } from '../../../../services/initializationService';
import { firebaseSyncService } from '../../../../services/firebaseSyncService';
import { migrateCatalogsFromFirebase } from '../../../../services/syncManager';
import { exportToCSV } from '../../../../services/export';
import { toast } from 'sonner';

export const KernelSystemCard: React.FC = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);

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

  const handleMigrateCatalogs = async () => {
    setIsMigrating(true);
    try {
      toast.info('Iniciando migración directa de Catálogos (Firebase → Supabase)...');
      const counts = await migrateCatalogsFromFirebase((msg) => console.log(`[Migration] ${msg}`));
      toast.success(`Migración completada: ${counts.products} productos y ${counts.providers} proveedores respaldados en Supabase.`);
    } catch (error: any) {
      toast.error(`Error en migración: ${error.message}`);
    } finally {
      setIsMigrating(false);
    }
  };

  const handleRepairConnection = async () => {
    if (confirm("⚠️ REPARACIÓN DE BASE DE DATOS ⚠️\n\nEsto cerrará la conexión y limpiará la caché de Firestore para solucionar errores internos de renderizado.\n\nLa aplicación se recargará automáticamente.\n\n¿Deseas continuar?")) {
      await resetFirestore();
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
      const result = await firebaseSyncService.pullBatch(type);
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

        <SettingsButton 
          onClick={handleMigrateCatalogs}
          isLoading={isMigrating}
          label="Migrar Catálogos (Firebase → Supabase)"
          icon={ArrowUpCircle}
          variant="primary"
        />

        <div className="grid grid-cols-2 gap-3">
          <SettingsButton 
            onClick={handleRepairConnection}
            label="Reparar Conexión"
            icon={RefreshCw}
            variant="outline"
          />
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
