
import { useState, useRef, useCallback, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import * as sessionService from '../services/sessionService';
import { sanitizeBarcode } from '../services/utils';
import { SoundFX } from '../services/audio';
import { useHIDScanner } from './useHIDScanner';

export const useReception = () => {
    // UI States
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [showQueueModal, setShowQueueModal] = useState(false);
    const [showManualInput, setShowManualInput] = useState(false);
    const [isEcoMode, setIsEcoMode] = useState(false);
    
    // Feedback States
    const [lastAction, setLastAction] = useState<{type: 'success' | 'duplicate', label: string} | null>(null);
    const [flashActive, setFlashActive] = useState(false);

    // Data
    const draftCount = useLiveQuery(() => db.sessions.where('status').equals('draft').count(), [], 0);
    const unsyncedDrafts = useLiveQuery(() => db.sessions.where('status').equals('draft').and(s => !s.lastSyncTimestamp).reverse().toArray(), [], []);

    // Core Logic
    const handleScan = useCallback(async (code: string) => {
        const cleanCode = sanitizeBarcode(code);
        if (!cleanCode || cleanCode.length < 3) return;

        // 1. Integridad: Verificar duplicados
        const alreadyExists = await sessionService.checkLabelExists(cleanCode);
        
        if (alreadyExists) {
            setLastAction({ type: 'duplicate', label: cleanCode });
            SoundFX.play('error');
            if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
            
            // AUTO-UNLOCK: Limpiar advertencia tras 3 segundos para no bloquear el flujo
            setTimeout(() => {
                setLastAction(prev => prev?.label === cleanCode && prev.type === 'duplicate' ? null : prev);
            }, 3000);
            return;
        }

        // 2. Registro Rápido
        try {
            await sessionService.createDraftSession(cleanCode);
            setLastAction({ type: 'success', label: cleanCode });
            setFlashActive(true);
            SoundFX.play('success');
            if (navigator.vibrate) navigator.vibrate(40);
            
            // Feedback visual temporal
            setTimeout(() => setFlashActive(false), 300);
            
            // Limpieza automática del éxito
            setTimeout(() => {
                setLastAction(prev => prev?.label === cleanCode && prev.type === 'success' ? null : prev);
            }, 2000);
        } catch (err: any) { 
            SoundFX.play('error'); 
        }
    }, []);

    // HID Scanner Hook Integration
    useHIDScanner({
        onScan: handleScan,
        minChars: 3,
        // Permitimos el escaneo siempre, la lógica de duplicados se maneja internamente
        isEnabled: !showManualInput,
        maxLatency: 60
    });

    const handleManualSubmit = (val: string) => {
        handleScan(val);
        setShowManualInput(false);
    };

    const clearError = () => setLastAction(null);

    const deleteDraft = async (id: string) => {
        await db.sessions.delete(id);
        SoundFX.play('delete');
    };

    const discardAllDrafts = async () => {
        if (confirm("¿Vaciar toda la cola de recepción?")) {
            await db.sessions.where('status').equals('draft').delete();
            setShowQueueModal(false);
        }
    };

    return {
        state: {
            isCameraOpen, setIsCameraOpen,
            showQueueModal, setShowQueueModal,
            showManualInput, setShowManualInput,
            isEcoMode, setIsEcoMode,
            lastAction,
            flashActive,
            draftCount,
            unsyncedDrafts
        },
        actions: {
            handleScan,
            handleManualSubmit,
            clearError,
            deleteDraft,
            discardAllDrafts
        }
    };
};
