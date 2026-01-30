import { useState, useCallback, useRef, useEffect } from 'react';
import { SoundFX } from '../services/audio';

export type FeedbackStatus = 'idle' | 'success' | 'error' | 'warning' | 'info' | 'undo' | 'incident' | 'unknown';

interface FeedbackOptions {
    sound?: 'success' | 'error' | 'delete' | 'increment';
    vibration?: number | number[];
    duration?: number;
}

/**
 * SISTEMA DE FEEDBACK UNIFICADO
 * Gestiona el ciclo de vida de la respuesta sensorial:
 * 1. Estado Visual (Flash/Color)
 * 2. Estímulo Auditivo (SoundFX)
 * 3. Estímulo Hápitico (Vibración)
 * 4. Limpieza automática (Timeout)
 */
export const useFeedbackSystem = (defaultDuration = 300) => {
    const [feedback, setFeedback] = useState<FeedbackStatus>('idle');
    const timeoutRef = useRef<any>(null);

    // Limpieza al desmontar
    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    const trigger = useCallback((status: FeedbackStatus, options?: FeedbackOptions) => {
        // 1. Actualizar UI
        setFeedback(status);

        // 2. Audio (Mapeo inteligente si no se especifica)
        const soundToPlay = options?.sound || mapStatusToSound(status);
        if (soundToPlay) {
            SoundFX.play(soundToPlay);
        }

        // 3. Haptics (Mapeo inteligente si no se especifica)
        const vibPattern = options?.vibration || mapStatusToVibration(status);
        if (navigator.vibrate && vibPattern) {
            navigator.vibrate(vibPattern);
        }

        // 4. Auto-limpieza
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
            setFeedback('idle');
        }, options?.duration || defaultDuration);

    }, [defaultDuration]);

    return { feedback, trigger };
};

// --- Helpers de Mapeo Predeterminado ---

const mapStatusToSound = (status: FeedbackStatus) => {
    switch (status) {
        case 'success': return 'success';
        case 'unknown': return 'increment'; // Sonido distinto para nuevos
        case 'error': return 'error';
        case 'undo': return 'delete';
        case 'incident': return 'error';
        default: return undefined;
    }
};

const mapStatusToVibration = (status: FeedbackStatus) => {
    switch (status) {
        case 'success': return 40;
        case 'error': return [100, 50, 100];
        case 'undo': return 30;
        case 'incident': return [50, 50, 50];
        default: return 10;
    }
};