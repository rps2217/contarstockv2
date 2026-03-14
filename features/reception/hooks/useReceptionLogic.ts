
import { useState, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../db';
import * as sessionService from '../../../services/sessionService';
import { sanitizeBarcode } from '../../../services/utils';
import { SoundFX } from '../../../services/audio';

export const useReceptionLogic = () => {
 const [lastAction, setLastAction] = useState<{type: 'success' | 'duplicate', label: string} | null>(null);
 const [flashActive, setFlashActive] = useState(false);
 const [isFinalizing, setIsFinalizing] = useState(false);
 const [currentErp, setCurrentErp] = useState('');

 const unsyncedDrafts = useLiveQuery(() => 
 db.sessions.where('status').equals('draft').reverse().toArray()
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
 await db.sessions.where('id').anyOf(ids).modify({ status: 'completed' });
 SoundFX.play('success');
 return true;
 } catch (e) {
 SoundFX.play('error');
 return false;
 } finally {
 setIsFinalizing(false);
 }
 }, [unsyncedDrafts]);

 const deleteDraft = async (id: string) => {
 await db.sessions.delete(id);
 SoundFX.play('delete');
 };

 // Fix: Added discardAll action to clear the entire reception queue as requested by ReceptionPage
 const discardAll = useCallback(async () => {
 if (confirm("¿Borrar toda la cola de recepción?")) {
 await db.sessions.where('status').equals('draft').delete();
 SoundFX.play('delete');
 }
 }, []);

 return {
 state: { lastAction, flashActive, draftCount, unsyncedDrafts, isFinalizing, currentErp },
 actions: { handleScan, handleManualInput: handleScan, deleteDraft, finalizeReception, discardAll, setCurrentErp }
 };
};
