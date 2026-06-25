/**
 * ScannerCameraSection - Sección de cámara para escaneo
 * 
 * Responsabilidades:
 * - Renderizar CameraScanner
 * - Overlay de targeting
 * - Feedback visual del último scan
 * - Botón para cerrar cámara y pasar a modo manual
 */

import React from 'react';
import { CameraScanner } from '../../../../components/CameraScanner';
import { ScannerTargetOverlay } from '../ScannerTargetOverlay';
import { FeedbackStatus } from '../../../../hooks/useFeedbackSystem';
import { X } from 'lucide-react';

interface ScannerCameraSectionProps {
  onScan: (code: string, qtyOverride?: number) => void;
  feedback: FeedbackStatus;
  onCloseCamera?: () => void;
}

export const ScannerCameraSection: React.FC<ScannerCameraSectionProps> = ({
  onScan,
  feedback,
  onCloseCamera,
}) => {
  return (
    <div className="h-full relative">
      <CameraScanner 
        onScan={onScan} 
        onClose={() => {}} 
        inline={true}
        isTriggered={true}
      />
      <ScannerTargetOverlay feedback={feedback} />
      
      {/* Botón para cerrar cámara y pasar a modo manual */}
      {onCloseCamera && (
        <button
          onClick={onCloseCamera}
          className="absolute bottom-4 left-4 z-50 flex items-center gap-2 bg-black/70 backdrop-blur-sm text-white px-4 py-2 rounded-full border border-white/20 active:scale-95 transition-all"
        >
          <X className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-wider">Cerrar Cámara</span>
        </button>
      )}
    </div>
  );
};
