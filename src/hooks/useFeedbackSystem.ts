
import { useState, useCallback, useRef, useEffect } from 'react';
import { SoundFX } from '../services/audio';

export type FeedbackStatus = 'idle' | 'success' | 'error' | 'warning' | 'info' | 'undo' | 'incident' | 'unknown';

interface FeedbackOptions {
 sound?: 'success' | 'error' | 'delete' | 'increment';
 vibration?: number | number[];
 duration?: number;
}

export const useFeedbackSystem = (defaultDuration = 300) => {
 const [feedback, setFeedback] = useState<FeedbackStatus>('idle');
 const timeoutRef = useRef<any>(null);

 useEffect(() => {
 return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
 }, []);

 const trigger = useCallback((status: FeedbackStatus, options?: FeedbackOptions) => {
 setFeedback(status);
 const soundToPlay = options?.sound || mapStatusToSound(status);
 if (soundToPlay) SoundFX.play(soundToPlay);
 if (navigator.vibrate) navigator.vibrate(options?.vibration || mapStatusToVibration(status));

 if (timeoutRef.current) clearTimeout(timeoutRef.current);
 timeoutRef.current = setTimeout(() => setFeedback('idle'), options?.duration || defaultDuration);
 }, [defaultDuration]);

 return { feedback, trigger };
};

const mapStatusToSound = (status: FeedbackStatus) => {
 switch (status) {
 case 'success': return 'success';
 case 'unknown': return 'increment';
 case 'error': return 'error';
 case 'undo': return 'delete';
 default: return undefined;
 }
};

const mapStatusToVibration = (status: FeedbackStatus) => {
 switch (status) {
 case 'success': return [50, 30, 50]; // Double tap for success
 case 'error': return [100, 50, 100, 50, 200]; // Long aggressive buzz for error
 case 'undo': return [30, 100, 30]; // Reverse pattern
 case 'warning': return [150, 50, 150];
 case 'unknown': return [60, 40, 60];
 default: return 20;
 }
};

// Forced GitHub sync
