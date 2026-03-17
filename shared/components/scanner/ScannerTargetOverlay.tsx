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
        <div className="h-[80%] aspect-square max-w-[90%] border-4 border-white/20 rounded-[2rem] relative shadow-[inset_0_0_50px_rgba(0,0,0,0.5)]">
          <div className="absolute top-0 left-0 w-12 h-12 border-t-8 border-l-8 border-rose-500 rounded-tl-[1.5rem] -mt-2 -ml-2 shadow-[0_0_15px_rgba(225,29,72,0.5)]"></div>
          <div className="absolute top-0 right-0 w-12 h-12 border-t-8 border-r-8 border-rose-500 rounded-tr-[1.5rem] -mt-2 -mr-2 shadow-[0_0_15px_rgba(225,29,72,0.5)]"></div>
          <div className="absolute bottom-0 left-0 w-12 h-12 border-b-8 border-l-8 border-rose-500 rounded-bl-[1.5rem] -mb-2 -ml-2 shadow-[0_0_15px_rgba(225,29,72,0.5)]"></div>
          <div className="absolute bottom-0 right-0 w-12 h-12 border-b-8 border-r-8 border-rose-500 rounded-br-[1.5rem] -mb-2 -mr-2 shadow-[0_0_15px_rgba(225,29,72,0.5)]"></div>
          
          {/* LINEA DE ESCANEO */}
          <div className="absolute top-1/2 left-4 right-4 h-[4px] bg-rose-500 shadow-[0_0_20px_rgba(225,29,72,1)] animate-pulse rounded-full"></div>
        </div>
      </div>

      {/* FEEDBACK OVERLAY */}
      {feedback === 'success' && (
        <div className="absolute inset-0 flex items-center justify-center bg-emerald-500/30 animate-in fade-in duration-100">
          <CheckCircle2 className="w-32 h-32 text-emerald-400 drop-shadow-[0_0_30px_rgba(52,211,153,0.8)]" />
        </div>
      )}
      {feedback === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center bg-rose-600/40 animate-in fade-in duration-100">
          <AlertTriangle className="w-32 h-32 text-rose-400 drop-shadow-[0_0_30px_rgba(251,113,133,0.8)]" />
        </div>
      )}
      {feedback === 'unknown' && (
        <div className="absolute inset-0 flex items-center justify-center bg-amber-500/30 animate-in fade-in duration-100">
          <AlertCircle className="w-32 h-32 text-amber-400 drop-shadow-[0_0_30px_rgba(251,191,36,0.8)]" />
        </div>
      )}
    </>
  );
};
