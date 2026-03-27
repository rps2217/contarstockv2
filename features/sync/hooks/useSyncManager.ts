
import { useState, useEffect, useCallback } from 'react';
import * as syncManager from '../../../services/syncManager';
import { erpService } from '../../../services/erpService';
import { ExpectedOrderRepository } from '../../../repositories/ExpectedOrderRepository';

export const useSyncManager = () => {
 const [uiGroups, setUiGroups] = useState<any[]>([]);
 const [isProcessing, setIsProcessing] = useState(false);
 const [logs, setLogs] = useState<{time: string, msg: string, type: 'info'|'error'|'success'}[]>([]);
 
 const addLog = useCallback((msg: any, type: 'info'|'error'|'success' = 'info') => {
 const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
 const safeMsg = typeof msg === 'string' ? msg : JSON.stringify(msg);
 setLogs(prev => [...prev, { time, msg: safeMsg, type }]);
 }, []);

 const refreshGroups = useCallback(async () => {
 const groups = await syncManager.getPendingUploadGroups();
 setUiGroups(groups.map(g => ({ ...g, uiStatus: 'idle', progress: undefined })));
 
 if (logs.length === 0) {
 addLog(">>> Diagnóstico de Motor Cloud v6.3", 'info');
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
 syncManager.resetSyncLock();
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
     if (error.message === 'URL_NOT_CONFIGURED') {
       addLog("⚠️ URL de AppSheet no configurada. Configure la URL en Ajustes.", 'error');
     } else {
       addLog(`✗ Error al descargar órdenes: ${error.message}`, 'error');
     }
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
 handleDownloadOrders(); // Si no hay subidas, intentamos descargar órdenes
 return;
 }

 setIsProcessing(true);
 addLog(">>> INICIANDO PROCESO DE CARGA...", 'info');

 for (let i = 0; i < uiGroups.length; i++) {
 const group = uiGroups[i];
 if (group.uiStatus === 'success') continue;

 setUiGroups(prev => prev.map((g, idx) => idx === i ? { ...g, uiStatus: 'uploading', progress: 'Iniciando...' } : g));
 
 try {
 await syncManager.performBatchUpload(group, (m) => {
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
 
 // Después de subir, intentamos descargar órdenes
 handleDownloadOrders();
 };

 return {
 state: { uiGroups, isProcessing, logs },
 actions: { handleSyncAll, refreshGroups, handleForceReset, handleDownloadOrders }
 };
};
