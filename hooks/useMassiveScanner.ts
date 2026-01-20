
import { useState, useEffect, useRef, useCallback } from 'react';
import { massiveDb } from '../db.massive';
import { SoundFX } from '../services/audio';
import { sanitizeBarcode } from '../services/utils';

export const useMassiveScanner = (batchId: string) => {
    const [count, setCount] = useState(0);
    const [lastSku, setLastSku] = useState<string | null>(null);
    const [isFlash, setIsFlash] = useState(false);
    
    const buffer = useRef('');
    const lastKeyTime = useRef(0);

    // Carga inicial del conteo del batch
    useEffect(() => {
        massiveDb.blindScans.where('batchId').equals(batchId).count().then(setCount);
    }, [batchId]);

    const registerScan = useCallback(async (code: string) => {
        const clean = sanitizeBarcode(code);
        if (!clean || clean.length < 3) return;

        try {
            await massiveDb.blindScans.add({
                batchId,
                barcode: clean,
                timestamp: Date.now()
            });

            setCount(prev => prev + 1);
            setLastSku(clean);
            setIsFlash(true);
            SoundFX.play('increment'); // Sonido corto tipo "clic"
            
            setTimeout(() => setIsFlash(false), 80);
        } catch (e) {
            SoundFX.play('error');
        }
    }, [batchId]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const now = Date.now();
            if (now - lastKeyTime.current > 40) buffer.current = '';
            lastKeyTime.current = now;

            if (e.key === 'Enter') {
                if (buffer.current.length >= 3) registerScan(buffer.current);
                buffer.current = '';
            } else if (e.key.length === 1) {
                buffer.current += e.key;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [registerScan]);

    return { count, lastSku, isFlash, registerScan };
};
