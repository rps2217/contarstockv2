import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';
import { FeedbackStatus } from '../../../hooks/useFeedbackSystem';

interface ScannerTargetOverlayProps {
  feedback: FeedbackStatus;
}

export const ScannerTargetOverlay: React.FC<ScannerTargetOverlayProps> = ({ feedback }) => {
  return (
    <>
      {/* TARGET OVERLAY PERSONALIZADO */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="h-[70%] aspect-square max-w-[80%] border-2 border-white/10 rounded-[1.5rem] relative shadow-[inset_0_0_30px_rgba(0,0,0,0.5)]">
          <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-rose-500 rounded-tl-[1rem] -mt-1 -ml-1 shadow-[0_0_10px_rgba(225,29,72,0.5)]"></div>
          <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-rose-500 rounded-tr-[1rem] -mt-1 -mr-1 shadow-[0_0_10px_rgba(225,29,72,0.5)]"></div>
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-rose-500 rounded-bl-[1rem] -mb-1 -ml-1 shadow-[0_0_10px_rgba(225,29,72,0.5)]"></div>
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-rose-500 rounded-br-[1rem] -mb-1 -mr-1 shadow-[0_0_10px_rgba(225,29,72,0.5)]"></div>
          
          {/* LINEA DE ESCANEO */}
          <div className="absolute top-1/2 left-4 right-4 h-[2px] bg-rose-500 shadow-[0_0_15px_rgba(225,29,72,1)] animate-pulse rounded-full"></div>
        </div>
      </div>

      {/* FEEDBACK OVERLAY */}
      {feedback === 'success' && (
        <div className="absolute inset-0 flex items-center justify-center bg-emerald-500/20 animate-in fade-in duration-100">
          <CheckCircle2 className="w-20 h-20 text-emerald-400 drop-shadow-[0_0_20px_rgba(52,211,153,0.6)]" />
        </div>
      )}
      {feedback === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center bg-rose-600/30 animate-in fade-in duration-100">
          <AlertTriangle className="w-20 h-20 text-rose-400 drop-shadow-[0_0_20px_rgba(251,113,133,0.6)]" />
        </div>
      )}
      {feedback === 'unknown' && (
        <div className="absolute inset-0 flex items-center justify-center bg-amber-500/20 animate-in fade-in duration-100">
          <AlertCircle className="w-20 h-20 text-amber-400 drop-shadow-[0_0_20px_rgba(251,191,36,0.6)]" />
        </div>
      )}
    </>
  );
};

// Forced GitHub sync
