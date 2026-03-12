
import { useState, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import * as sessionService from '../services/sessionService';
import { sanitizeBarcode } from '../services/utils';
import { SoundFX } from '../services/audio';
import { useHIDScanner } from './useHIDScanner';

export const useReception = () => {
 // UI States
 const [isCameraOpen, setIsCameraOpen] = useState(false);
 const [showManualInput, setShowManualInput] = useState(false);
 const [isEcoMode, setIsEcoMode] = useState(false);
 const [isFinalizing, setIsFinalizing] = useState(false);
 
 // Feedback States
 const [lastAction, setLastAction] = useState<{type: 'success' | 'duplicate', label: string} | null>(null);
 const [flashActive, setFlashActive] = useState(false);

 // Data
 const draftCount = useLiveQuery(() => db.sessions.where('status').equals('draft').count(), [], 0);
 const unsyncedDrafts = useLiveQuery(() => db.sessions.where('status').equals('draft').reverse().toArray(), [], []);

 // Core Logic: Registro de Bulto
 const handleScan = useCallback(async (code: string) => {
 const cleanCode = sanitizeBarcode(code);
 if (!cleanCode || cleanCode.length < 3) return;

 // 1. Verificar duplicados en la sesión actual de borrador
 const alreadyExists = await sessionService.checkLabelExists(cleanCode);
 
 if (alreadyExists) {
 setLastAction({ type: 'duplicate', label: cleanCode });
 SoundFX.play('error');
 if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
 
 // AUTO-UNLOCK: Tras 2.5 segundos permitimos que el HUD vuelva a estado "Listo"
 setTimeout(() => {
 setLastAction(prev => prev?.label === cleanCode ? null : prev);
 }, 2500);
 return;
 }

 // 2. Registro de Borrador (Bulto recibido)
 try {
 await sessionService.createDraftSession(cleanCode);
 setLastAction({ type: 'success', label: cleanCode });
 setFlashActive(true);
 SoundFX.play('success');
 if (navigator.vibrate) navigator.vibrate(40);
 
 setTimeout(() => setFlashActive(false), 200);
 // Limpieza automática del éxito para dejar paso al siguiente scan
 setTimeout(() => {
 setLastAction(prev => prev?.label === cleanCode && prev.type === 'success' ? null : prev);
 }, 1500);
 } catch (err: any) { 
 SoundFX.play('error'); 
 }
 }, []);

 // Acción para Guardar/Finalizar el trabajo
 const finalizeReception = useCallback(async () => {
 if (draftCount === 0) return;
 setIsFinalizing(true);
 try {
 // Pasamos todos los borradores a 'completed' para que el SyncManager los vea
 const drafts = await db.sessions.where('status').equals('draft').toArray();
 const ids = drafts.map(d => d.id);
 await db.sessions.where('id').anyOf(ids).modify({ status: 'completed' });
 
 SoundFX.play('success');
 if (navigator.vibrate) navigator.vibrate([50, 100, 50]);
 setLastAction(null);
 return true;
 } catch (e) {
 SoundFX.play('error');
 return false;
 } finally {
 setIsFinalizing(false);
 }
 }, [draftCount]);

 // Integración de Escáner de Hardware
 useHIDScanner({
 onScan: handleScan,
 minChars: 3,
 isEnabled: !showManualInput && !isFinalizing,
 maxLatency: 60
 });

 const handleManualSubmit = (val: string) => {
 handleScan(val);
 setShowManualInput(false);
 };

 const deleteDraft = async (id: string) => {
 await db.sessions.delete(id);
 SoundFX.play('delete');
 };

 return {
 state: {
 isCameraOpen, setIsCameraOpen,
 showManualInput, setShowManualInput,
 isEcoMode, setIsEcoMode,
 lastAction,
 flashActive,
 draftCount,
 unsyncedDrafts,
 isFinalizing
 },
 actions: {
 handleScan,
 handleManualSubmit,
 deleteDraft,
 finalizeReception
 }
 };
};
