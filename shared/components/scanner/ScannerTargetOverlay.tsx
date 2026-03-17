import React from 'react';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { FeedbackStatus } from '../../../hooks/useFeedbackSystem';

interface ScannerTargetOverlayProps {
  feedback: FeedbackStatus;
}

export const ScannerTargetOverlay: React.FC<ScannerTargetOverlayProps> = ({ feedback }) => {
  return (
    <>
      {/* TARGET OVERLAY PERSONALIZADO */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="h-[80%] aspect-square max-w-[90%] border-2 border-white/20 rounded-3xl relative">
          <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-blue-500 rounded-tl-xl -mt-1 -ml-1"></div>
          <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-blue-500 rounded-tr-xl -mt-1 -mr-1"></div>
          <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-blue-500 rounded-bl-xl -mb-1 -ml-1"></div>
          <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-blue-500 rounded-br-xl -mb-1 -mr-1"></div>
          
          {/* LINEA DE ESCANEO */}
          <div className="absolute top-1/2 left-2 right-2 h-[2px] bg-red-500/80 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse"></div>
        </div>
      </div>

      {/* FEEDBACK OVERLAY */}
      {feedback === 'success' && (
        <div className="absolute inset-0 flex items-center justify-center bg-emerald-500/20 -[2px] animate-in fade-in duration-200">
          <CheckCircle2 className="w-24 h-24 text-emerald-400 drop-shadow-lg" />
        </div>
      )}
      {feedback === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center bg-rose-500/20 -[2px] animate-in fade-in duration-200">
          <AlertTriangle className="w-24 h-24 text-rose-400 drop-shadow-lg" />
        </div>
      )}
    </>
  );
};
