
import { useState, useEffect, useRef } from 'react';
import * as syncManager from '../services/syncManager';

export const useSyncManager = () => {
    const [uiGroups, setUiGroups] = useState<any[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [logs, setLogs] = useState<{time: string, msg: string, type: 'info'|'error'|'success'}[]>([]);
    
    useEffect(() => {
        refreshGroups();
    }, []);

    const refreshGroups = async () => {
        const groups = await syncManager.getPendingUploadGroups();
        setUiGroups(groups.map(g => ({ ...g, uiStatus: 'idle' })));
    };

    const addLog = (msg: any, type: 'info'|'error'|'success' = 'info') => {
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const safeMsg = typeof msg === 'string' ? msg : JSON.stringify(msg);
        setLogs(prev => [...prev, { time, msg: safeMsg, type }]);
    };

    const handleSyncAll = async () => {
        if (!navigator.onLine) {
            addLog("Error: No hay conexión a internet.", 'error');
            return;
        }

        const pending = uiGroups.filter(g => g.uiStatus !== 'success');
        if (!pending.length) {
            addLog("Nada pendiente para sincronizar.", 'info');
            return;
        }

        setIsProcessing(true);
        addLog("--- INICIANDO SINCRONIZACIÓN ---", 'info');

        for (let i = 0; i < uiGroups.length; i++) {
            const group = uiGroups[i];
            setUiGroups(prev => prev.map((g, idx) => idx === i ? { ...g, uiStatus: 'uploading' } : g));
            try {
                await syncManager.performBatchUpload(group, (m) => addLog(m));
                setUiGroups(prev => prev.map((g, idx) => idx === i ? { ...g, uiStatus: 'success' } : g));
                addLog(`✓ Lote ${group.erpOrder} completado.`, 'success');
            } catch (e: any) {
                setUiGroups(prev => prev.map((g, idx) => idx === i ? { ...g, uiStatus: 'error' } : g));
                addLog(`Error en ${group.erpOrder}: ${e.message}`, 'error');
            }
        }
        setIsProcessing(false);
        addLog("--- PROCESO FINALIZADO ---", 'info');
    };

    return {
        state: { uiGroups, isProcessing, logs },
        actions: { handleSyncAll }
    };
};
