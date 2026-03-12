
import { useState, useEffect, useCallback } from 'react';
import * as syncManager from '../services/syncManager';

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
 setUiGroups(groups.map(g => ({ ...g, uiStatus: 'idle' })));
 
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

 const handleSyncAll = async () => {
 if (!navigator.onLine) {
 addLog("Error: Sin conexión a Internet detectada.", 'error');
 return;
 }

 const pending = uiGroups.filter(g => g.uiStatus !== 'success');
 if (!pending.length) {
 addLog("No hay datos pendientes para subir.", 'info');
 return;
 }

 setIsProcessing(true);
 addLog(">>> INICIANDO PROCESO DE CARGA...", 'info');

 for (let i = 0; i < uiGroups.length; i++) {
 const group = uiGroups[i];
 if (group.uiStatus === 'success') continue;

 setUiGroups(prev => prev.map((g, idx) => idx === i ? { ...g, uiStatus: 'uploading' } : g));
 
 try {
 await syncManager.performBatchUpload(group, (m) => addLog(m, 'info'));
 setUiGroups(prev => prev.map((g, idx) => idx === i ? { ...g, uiStatus: 'success' } : g));
 addLog(`✓ Completado: ${group.erpOrder}`, 'success');
 } catch (e: any) {
 setUiGroups(prev => prev.map((g, idx) => idx === i ? { ...g, uiStatus: 'error' } : g));
 addLog(`✗ Error en ${group.erpOrder}: ${e.message}`, 'error');
 }
 }
 
 setIsProcessing(false);
 addLog(">>> Operación finalizada.", 'info');
 refreshGroups();
 };

 return {
 state: { uiGroups, isProcessing, logs },
 actions: { handleSyncAll, refreshGroups, handleForceReset }
 };
};
