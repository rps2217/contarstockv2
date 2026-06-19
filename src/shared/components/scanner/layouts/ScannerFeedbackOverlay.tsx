/**
 * ScannerFeedbackOverlay - Overlay de feedback visual
 * 
 * Muestra flashes de color según el estado del scan:
 * - success: verde
 * - error: rojo
 * - unknown: amarillo
 * - undo: azul
 */

import React from 'react';
import { FeedbackStatus } from '../../../../hooks/useFeedbackSystem';

interface ScannerFeedbackOverlayProps {
  feedback: FeedbackStatus;
}

export const ScannerFeedbackOverlay: React.FC<ScannerFeedbackOverlayProps> = ({ feedback }) => {
  const bgClass = feedback === 'success' 
    ? 'bg-emerald-500/40' 
    : feedback === 'error' 
      ? 'bg-rose-600/60' 
      : feedback === 'unknown' 
        ? 'bg-amber-500/40' 
        : feedback === 'undo' 
          ? 'bg-blue-500/40' 
          : '';

  if (!bgClass) return null;

  return (
    <div className={`fixed inset-0 z-[200] pointer-events-none animate-in fade-in duration-100 ${bgClass}`} />
  );
};
