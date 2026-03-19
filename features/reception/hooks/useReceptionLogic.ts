
import { useState, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../db';
import * as sessionService from '../../../services/sessionService';
import { sanitizeBarcode } from '../../../services/utils';
import { SoundFX } from '../../../services/audio';
import { SessionRepository } from '../../../repositories/SessionRepository';
import * as syncManager from '../../../services/syncManager';
import { useToastStore } from '../../../store/useToastStore';

export const useReceptionLogic = () => {
  const [lastAction, setLastAction] = useState<{type: 'success' | 'duplicate', label: string} | null>(null);
  const [flashActive, setFlashActive] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [currentErp, setCurrentErp] = useState('');
  const [isExpiryMode, setIsExpiryMode] = useState(false);
  const [pendingExpiryScan, setPendingExpiryScan] = useState<{code: string, erp?: string} | null>(null);

  const { addToast } = useToastStore();

  const unsyncedDrafts = useLiveQuery(() => 
    SessionRepository.getDraftSessions()
  , [], []);

  const draftCount = unsyncedDrafts?.length || 0;

  const handleScan = useCallback(async (code: string, erpToUse?: string) => {
    const cleanCode = sanitizeBarcode(code);
    if (!cleanCode || cleanCode.length < 3) return;

    // Comprobación de integridad: Evitar bultos duplicados en el mismo turno
    const alreadyExists = await sessionService.checkLabelExists(cleanCode);
    
    if (alreadyExists) {
      setLastAction({ type: 'duplicate', label: cleanCode });
      SoundFX.play('error');
      setTimeout(() => setLastAction(prev => prev?.label === cleanCode ? null : prev), 3000);
      return;
    }

    if (isExpiryMode) {
      setPendingExpiryScan({ code: cleanCode, erp: erpToUse || currentErp });
      return;
    }

    try {
      await sessionService.createDraftSession(cleanCode, erpToUse || currentErp);
      setLastAction({ type: 'success', label: cleanCode });
      setFlashActive(true);
      SoundFX.play('success');
      if (navigator.vibrate) navigator.vibrate(40);
      
      setTimeout(() => setFlashActive(false), 150);
      setTimeout(() => setLastAction(prev => prev?.label === cleanCode && prev.type === 'success' ? null : prev), 1500);
    } catch (err) { 
      SoundFX.play('error'); 
    }
  }, [currentErp, isExpiryMode]);

  const completeExpiryScan = useCallback(async (mm?: number, yyyy?: number, batch?: string) => {
    if (!pendingExpiryScan) return;
    
    try {
      await sessionService.createDraftSession(pendingExpiryScan.code, pendingExpiryScan.erp, mm, yyyy, batch);
      setLastAction({ type: 'success', label: pendingExpiryScan.code });
      setFlashActive(true);
      SoundFX.play('success');
      if (navigator.vibrate) navigator.vibrate(40);
      
      setTimeout(() => setFlashActive(false), 150);
      setTimeout(() => setLastAction(prev => prev?.label === pendingExpiryScan.code && prev.type === 'success' ? null : prev), 1500);
    } catch (err) {
      SoundFX.play('error');
    } finally {
      setPendingExpiryScan(null);
    }
  }, [pendingExpiryScan]);

  const finalizeReception = useCallback(async () => {
    if (!unsyncedDrafts?.length) return false;
    setIsFinalizing(true);
    try {
      const ids = unsyncedDrafts.map(d => d.id);
      await SessionRepository.markAsCompleted(ids);
      SoundFX.play('success');
      
      // Automatic cloud synchronization
      if (navigator.onLine) {
        addToast('Sincronizando recepción con la nube...', 'info');
        const groups = await syncManager.getPendingUploadGroups();
        const receptionGroup = groups.find(g => g.type === 'reception');
        
        if (receptionGroup) {
          try {
            await syncManager.performBatchUpload(receptionGroup);
            addToast('Recepción sincronizada correctamente', 'success');
          } catch (syncError) {
            console.error('Sync error:', syncError);
            addToast('Error al sincronizar. Se reintentará automáticamente.', 'warning');
          }
        }
      } else {
        addToast('Recepción guardada localmente. Se sincronizará al conectar.', 'info');
      }
      
      return true;
    } catch (e) {
      SoundFX.play('error');
      addToast('Error al finalizar la recepción', 'error');
      return false;
    } finally {
      setIsFinalizing(false);
    }
  }, [unsyncedDrafts, addToast]);

  const deleteDraft = async (id: string) => {
    await SessionRepository.delete(id);
    SoundFX.play('delete');
  };

  const discardAll = useCallback(async () => {
    if (confirm("¿Borrar toda la cola de recepción?")) {
      await SessionRepository.deleteDrafts();
      SoundFX.play('delete');
    }
  }, []);

  const syncToCloud = useCallback(async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const groups = await syncManager.getPendingUploadGroups();
      const receptionGroup = groups.find(g => g.type === 'reception');
      
      if (receptionGroup) {
        await syncManager.performBatchUpload(receptionGroup);
        addToast('Recepción sincronizada correctamente', 'success');
        SoundFX.play('success');
      } else {
        addToast('No hay datos pendientes de sincronizar', 'info');
      }
    } catch (err) {
      console.error('Manual sync error:', err);
      addToast('Error al sincronizar con la nube', 'error');
      SoundFX.play('error');
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, addToast]);

  return {
    state: { lastAction, flashActive, draftCount, unsyncedDrafts, isFinalizing, isSyncing, currentErp, isExpiryMode, pendingExpiryScan },
    actions: { handleScan, handleManualInput: handleScan, deleteDraft, finalizeReception, discardAll, syncToCloud, setCurrentErp, setIsExpiryMode, completeExpiryScan }
  };
};
