
import { useState, useEffect, useCallback } from 'react';
import * as syncManager from '../services/syncManager';

export const useSyncManager = () => {
    const [uiGroups, setUiGroups] = useState<any[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [logs, setLogs] = useState<{time: string, msg: string, type: 'info'|'error'|'success'}[]>([]);
    
    const refreshGroups = useCallback(async () => {
        const groups = await syncManager.getPendingUploadGroups();
        setUiGroups(groups.map(g => ({ ...g, uiStatus: 'idle' })));
    }, []);

    useEffect(() => {
        refreshGroups();
    }, [refreshGroups]);

    const addLog = (msg: any, type: 'info'|'error'|'success' = 'info') => {
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const safeMsg = typeof msg === 'string' ? msg : JSON.stringify(msg);
        setLogs(prev => [...prev, { time, msg: safeMsg, type }]);
    };

    const handleForceReset = () => {
        syncManager.resetSyncLock();
        addLog("Motor reiniciado manualmente.", 'info');
        refreshGroups();
    };

    const handleSyncAll = async () => {
        if (!navigator.onLine) {
            addLog("Error: Sin conexión.", 'error');
            return;
        }

        const pending = uiGroups.filter(g => g.uiStatus !== 'success');
        if (!pending.length) {
            addLog("Cola vacía.", 'info');
            return;
        }

        setIsProcessing(true);
        addLog("Iniciando subida...", 'info');

        for (let i = 0; i < uiGroups.length; i++) {
            const group = uiGroups[i];
            if (group.uiStatus === 'success') continue;

            setUiGroups(prev => prev.map((g, idx) => idx === i ? { ...g, uiStatus: 'uploading' } : g));
            try {
                await syncManager.performBatchUpload(group, (m) => addLog(m));
                setUiGroups(prev => prev.map((g, idx) => idx === i ? { ...g, uiStatus: 'success' } : g));
                addLog(`Éxito en ${group.erpOrder}`, 'success');
            } catch (e: any) {
                setUiGroups(prev => prev.map((g, idx) => idx === i ? { ...g, uiStatus: 'error' } : g));
                addLog(`Fallo en ${group.erpOrder}: ${e.message}`, 'error');
            }
        }
        setIsProcessing(false);
        refreshGroups();
    };

    return {
        state: { uiGroups, isProcessing, logs },
        actions: { handleSyncAll, refreshGroups, handleForceReset }
    };
};
