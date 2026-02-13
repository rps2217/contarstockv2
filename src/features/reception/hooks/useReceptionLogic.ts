
import { useState, useCallback, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../db';
import * as sessionService from '../../../services/sessionService';
import { sanitizeBarcode } from '../../../services/utils';
import { useScannerEngine } from '../../../shared/hooks/useScannerEngine';
import { SoundFX } from '../../../services/audio';

export const useReceptionLogic = () => {
    const engine = useScannerEngine(1);
    const [isFinalizing, setIsFinalizing] = useState(false);
    const lastActionRef = useRef<{type: 'success'|'duplicate', label: string} | null>(null);

    const unsyncedDrafts = useLiveQuery(() => 
        db.sessions.where('status').equals('draft').reverse().toArray()
    , [], []);

    const handleScan = useCallback(async (code: string) => {
        const cleanCode = sanitizeBarcode(code);
        if (!cleanCode || cleanCode.length < 3) return;

        // Comprobación de integridad: Evitar bultos duplicados en el mismo turno
        const alreadyExists = await sessionService.checkLabelExists(cleanCode);
        
        if (alreadyExists) {
            engine.actions.triggerFeedback('error');
            lastActionRef.current = { type: 'duplicate', label: cleanCode };
            return;
        }

        try {
            await sessionService.createDraftSession(cleanCode);
            engine.actions.updateActiveItem(cleanCode, null, (unsyncedDrafts?.length || 0), 1);
            lastActionRef.current = { type: 'success', label: cleanCode };
        } catch (err) { 
            engine.actions.triggerFeedback('error');
        }
    }, [engine, unsyncedDrafts]);

    const finalizeReception = useCallback(async () => {
        if (!unsyncedDrafts?.length) return false;
        setIsFinalizing(true);
        try {
            const ids = unsyncedDrafts.map(d => d.id);
            await db.sessions.where('id').anyOf(ids).modify({ status: 'completed' });
            SoundFX.play('success');
            engine.actions.resetActive();
            return true;
        } catch (e) {
            SoundFX.play('error');
            return false;
        } finally {
            setIsFinalizing(false);
        }
    }, [unsyncedDrafts, engine]);

    const deleteDraft = async (id: string) => {
        const session = await db.sessions.get(id);
        await db.sessions.delete(id);
        if (engine.activeBarcode === session?.logisticsLabel) {
            engine.actions.resetActive();
        }
        engine.actions.triggerFeedback('undo');
    };

    const discardAll = useCallback(async () => {
        if (confirm("¿Borrar toda la cola de recepción?")) {
            await db.sessions.where('status').equals('draft').delete();
            engine.actions.resetActive();
            SoundFX.play('delete');
        }
    }, [engine]);

    return {
        state: { 
            activeBarcode: engine.activeBarcode,
            optimisticQty: engine.optimisticQty,
            feedback: engine.feedback,
            draftCount: unsyncedDrafts?.length || 0, 
            unsyncedDrafts, 
            isFinalizing 
        },
        actions: { 
            handleScan, 
            handleManualInput: handleScan, 
            deleteDraft, 
            finalizeReception, 
            discardAll,
            selectItem: (label: string) => engine.actions.updateActiveItem(label, null, (unsyncedDrafts?.length || 0), 0)
        }
    };
};
