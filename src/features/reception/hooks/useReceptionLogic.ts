
import React, { useState, useCallback, useMemo } from 'react';
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

  const { addToast } = useToastStore();

  const unsyncedDrafts = useLiveQuery(() => 
    db.sessions
      .where('erpOrder').equals('RECEPCION_BORRADOR')
      .reverse()
      .limit(50)
      .toArray()
  , [], []);

  const draftCount = unsyncedDrafts?.filter(s => s.status === 'draft').length || 0;

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
  }, [currentErp]);

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
      await SessionRepository.deleteDraftReceptionSessions();
      SoundFX.play('delete');
    }
  }, []);

  const syncToCloud = useCallback(async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      // Primero, intentar finalizar cualquier borrador pendiente
      if (unsyncedDrafts && unsyncedDrafts.length > 0) {
        const ids = unsyncedDrafts.map(d => d.id);
        await SessionRepository.markAsCompleted(ids);
      }

      const groups = await syncManager.getPendingUploadGroups();
      const receptionGroup = groups.find(g => g.type === 'reception');
      
      if (receptionGroup) {
        await syncManager.performBatchUpload(receptionGroup);
      }

      // RECONCILIACIÓN: Limpiar registros borrados en otros dispositivos
      const reconcileResult = await syncManager.reconcileReception();
      
      if (receptionGroup || reconcileResult.deleted > 0) {
        let msg = 'Recepción sincronizada correctamente';
        if (reconcileResult.deleted > 0) msg += `. Se limpiaron ${reconcileResult.deleted} registros obsoletos.`;
        addToast(msg, 'success');
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
  }, [isSyncing, unsyncedDrafts, addToast]);

  const actions = React.useMemo(() => ({
    handleScan, 
    handleManualInput: handleScan, 
    deleteDraft, 
    finalizeReception, 
    discardAll, 
    syncToCloud, 
    setCurrentErp
  }), [handleScan, deleteDraft, finalizeReception, discardAll, syncToCloud, setCurrentErp]);

  return {
    state: { lastAction, flashActive, draftCount, unsyncedDrafts, isFinalizing, isSyncing, currentErp },
    actions
  };
};

// Forced GitHub sync
