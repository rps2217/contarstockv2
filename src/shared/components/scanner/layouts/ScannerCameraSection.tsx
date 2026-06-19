/**
 * ScannerCameraSection - Sección de cámara para escaneo
 * 
 * Responsabilidades:
 * - Renderizar CameraScanner
 * - Overlay de targeting
 * - Feedback visual del último scan
 */

import React from 'react';
import { CameraScanner } from '../../../../components/CameraScanner';
import { ScannerTargetOverlay } from '../ScannerTargetOverlay';
import { FeedbackStatus } from '../../../../hooks/useFeedbackSystem';

interface ScannerCameraSectionProps {
  onScan: (code: string, qtyOverride?: number) => void;
  feedback: FeedbackStatus;
}

export const ScannerCameraSection: React.FC<ScannerCameraSectionProps> = ({
  onScan,
  feedback,
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
    </div>
  );
};
