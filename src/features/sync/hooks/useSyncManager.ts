
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { syncOrchestrator, getPendingGroups, uploadBatch, resetSyncLock } from '@/services/sync';
import { erpService } from '@/services/erpService';
import { ExpectedOrderRepository } from '@/repositories/ExpectedOrderRepository';
import { supabaseSyncService } from '@/services/supabaseSyncService';
import { getSettings } from '@/services/settings';
import { ScanRepository } from '@/repositories/ScanRepository';
import { configSyncService } from '@/services/configSyncService';
import type { UploadGroup } from '@/services/sync/UploadGroupBuilder';

// Tipo para entradas de log
export interface LogEntry {
  time: string;
  msg: string;
  type: 'info' | 'error' | 'success';
}

// UI Group con estado de la UI extendido
export interface SyncUIGroup extends UploadGroup {
  uiStatus: 'idle' | 'uploading' | 'syncing' | 'error' | 'success';
  progress?: string | number;
  tableName?: string;
}

export const useSyncManager = () => {
  const [uiGroups, setUiGroups] = useState<SyncUIGroup[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  
  const addLog = useCallback((msg: string | object, type: 'info' | 'error' | 'success' = 'info') => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const safeStringify = (obj: object) => {
      const cache = new Set();
      return JSON.stringify(obj, (key, value) => {
        if (typeof value === 'object' && value !== null) {
          if (cache.has(value)) {
            return '[Circular]';
          }
          cache.add(value);
        }
        return value;
      });
    };
    const safeMsg = typeof msg === 'string' ? msg : safeStringify(msg);
    setLogs(prev => [...prev, { time, msg: safeMsg, type }]);
  }, []);

  const handlePushConfig = async () => {
    if (!navigator.onLine) {
      addLog("Error: Sin conexión para respaldar configuración.", 'error');
      return;
    }
    setIsProcessing(true);
    addLog(">>> RESPALDANDO CONFIGURACIÓN Y PLANTILLAS...", 'info');
    try {
      await configSyncService.pushSettings();
      addLog("✓ Configuración y esquemas respaldados con éxito.", 'success');
      toast.success("Configuración respaldada");
    } catch (error: any) {
      addLog(`✗ Error al respaldar configuración: ${error.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePullConfig = async () => {
    if (!navigator.onLine) {
      addLog("Error: Sin conexión para restaurar configuración.", 'error');
      return;
    }
    setIsProcessing(true);
    addLog(">>> RESTAURANDO CONFIGURACIÓN DESDE LA NUBE...", 'info');
    try {
      const success = await configSyncService.pullSettings();
      if (success) {
        addLog("✓ Configuración restaurada. Reiniciando aplicación...", 'success');
        toast.success("Configuración restaurada");
        setTimeout(() => window.location.reload(), 1500);
      } else {
        addLog("No se encontró configuración previa en la nube.", 'info');
      }
    } catch (error: any) {
      addLog(`✗ Error al restaurar configuración: ${error.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const refreshGroups = useCallback(async () => {
    const groups = await getPendingGroups();
    setUiGroups(groups.map(g => ({ ...g, uiStatus: 'idle', progress: undefined })));
    
    if (logs.length === 0) {
      addLog(">>> Diagnóstico de Motor Sync v7.0 (SyncOrchestrator)", 'info');
      if (groups.length > 0) {
        addLog(`Se detectaron ${groups.length} grupos pendientes de subida.`, 'info');
        addLog("Presione 'Sincronizar Cola Ahora' para iniciar.", 'info');
      } else {
        addLog("No hay datos pendientes. Sistema al día.", 'success');
      }
    }
  }, [logs.length, addLog]);

  useEffect(() => {
    refreshGroups();
  }, [refreshGroups]);

  const handleForceReset = () => {
    resetSyncLock();
    addLog("Motor reiniciado manualmente por el usuario.", 'info');
    refreshGroups();
  };

  const handleDownloadOrders = async () => {
    if (!navigator.onLine) {
      addLog("Error: Sin conexión a Internet detectada.", 'error');
      return;
    }

    setIsProcessing(true);
    addLog(">>> INICIANDO DESCARGA DE ÓRDENES...", 'info');

    try {
      const manifests = await erpService.downloadAllPendingManifests();
      if (manifests.length > 0) {
        let newOrdersCount = 0;
        for (const manifest of manifests) {
          const existing = await ExpectedOrderRepository.getById(manifest.id);
          if (!existing) {
            const items = manifest.items?.map((p: any) => ({
              barcode: p.barcode,
              name: p.name,
              expectedQty: p.qty
            })) || [];

            await ExpectedOrderRepository.save({
              id: manifest.id,
              internalId: manifest.id,
              items,
              totalExpectedUnits: items.reduce((acc, i) => acc + i.expectedQty, 0),
              totalExpectedSKUs: items.length,
              importedAt: Date.now()
            });
            newOrdersCount++;
          }
        }
        addLog(`✓ Se descargaron ${newOrdersCount} nuevas órdenes para el Detective IA`, 'success');
      } else {
        addLog("No se encontraron órdenes pendientes en la nube.", 'info');
      }
    } catch (error: any) {
      addLog(`✗ Error al descargar órdenes: ${error.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSyncAll = async () => {
    if (!navigator.onLine) {
      addLog("Error: Sin conexión a Internet detectada.", 'error');
      return;
    }

    const pending = uiGroups.filter(g => g.uiStatus !== 'success');
    if (!pending.length) {
      addLog("No hay datos pendientes para subir.", 'info');
      handleDownloadOrders();
      return;
    }

    setIsProcessing(true);
    addLog(">>> INICIANDO PROCESO DE CARGA...", 'info');

    for (let i = 0; i < uiGroups.length; i++) {
      const group = uiGroups[i];
      if (group.uiStatus === 'success') continue;

      setUiGroups(prev => prev.map((g, idx) => idx === i ? { ...g, uiStatus: 'uploading', progress: 'Iniciando...' } : g));
      
      try {
        await uploadBatch(group, (m) => {
          addLog(m, 'info');
          setUiGroups(prev => prev.map((g, idx) => idx === i ? { ...g, progress: m } : g));
        });
        setUiGroups(prev => prev.map((g, idx) => idx === i ? { ...g, uiStatus: 'success', progress: undefined } : g));
        addLog(`✓ Completado: ${group.erpOrder}`, 'success');
      } catch (e: any) {
        setUiGroups(prev => prev.map((g, idx) => idx === i ? { ...g, uiStatus: 'error', progress: e.message } : g));
        addLog(`✗ Error en ${group.erpOrder}: ${e.message}`, 'error');
      }
    }
    
    setIsProcessing(false);
    addLog(">>> Operación finalizada.", 'info');
    refreshGroups();
    handleDownloadOrders();
  };

  const handleVerifyIntegrity = async () => {
    if (!navigator.onLine) {
      toast.error("Sin conexión para verificar integridad");
      return;
    }

    setIsProcessing(true);
    addLog(">>> INICIANDO VERIFICACIÓN DE INTEGRIDAD...", 'info');

    try {
      const config = getSettings().cloudConfig;
      const tableName = config?.countsTableName || 'CONTEOS';
      
      const allScans = await ScanRepository.getAll();
      const erpGroups = Array.from(new Set(allScans.map(s => String(s.logisticsLabel || 'SIN_ERP'))));

      for (const erp of erpGroups) {
        if (!erp || erp === 'SIN_ERP') continue;
        
        addLog(`Verificando ERP: ${erp}...`, 'info');
        
        const localTotal = allScans
          .filter(s => String(s.logisticsLabel) === erp)
          .reduce((acc, s) => acc + (s.quantity || 0), 0);

        const summaryResponse = await supabaseSyncService.query(tableName, 'ERP', erp as string);
        
        if (summaryResponse.success) {
          const cloudTotal = (summaryResponse.rows as any[]).reduce((acc: number, row: any) => acc + Number(row.quantity || row.CANTIDAD || 0), 0);
          const diff = localTotal - cloudTotal;
          
          if (diff === 0) {
            addLog(`✓ Integridad OK para ${erp}: ${localTotal} unidades.`, 'success');
          } else if (diff > 0) {
            addLog(`⚠️ Discrepancia en ${erp}: Local(${localTotal}) > Nube(${cloudTotal}). Faltan ${diff} unidades por subir.`, 'error');
          } else {
            addLog(`⚠️ Discrepancia en ${erp}: Local(${localTotal}) < Nube(${cloudTotal}). Hay ${Math.abs(diff)} unidades extra en la nube.`, 'info');
          }
        } else {
          addLog(`✗ Fallo al obtener resumen de nube para ${erp}: ${summaryResponse.error}`, 'error');
        }
      }
      
      addLog(">>> Verificación finalizada.", 'info');
    } catch (error: any) {
      addLog(`✗ Error crítico en verificación: ${error.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    state: { uiGroups, isProcessing, logs },
    actions: { handleSyncAll, refreshGroups, handleForceReset, handleDownloadOrders, handleVerifyIntegrity, handlePushConfig, handlePullConfig }
  };
};

