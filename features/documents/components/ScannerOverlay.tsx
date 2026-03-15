import React from 'react';

interface ScannerOverlayProps {
  countdown: number | null;
}

export const ScannerOverlay: React.FC<ScannerOverlayProps> = ({ countdown }) => {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Darkened edges */}
      <div className="absolute inset-0 border-[40px] border-black/40" />
      
      {/* Scanner Corners */}
      <div className="absolute top-10 left-10 w-12 h-12 border-t-4 border-l-4 border-blue-500 rounded-tl-lg" />
      <div className="absolute top-10 right-10 w-12 h-12 border-t-4 border-r-4 border-blue-500 rounded-tr-lg" />
      <div className="absolute bottom-10 left-10 w-12 h-12 border-b-4 border-l-4 border-blue-500 rounded-bl-lg" />
      <div className="absolute bottom-10 right-10 w-12 h-12 border-b-4 border-r-4 border-blue-500 rounded-br-lg" />
      
      {/* Scan Line Animation */}
      <div className="absolute top-1/2 left-10 right-10 h-0.5 bg-blue-400/50 shadow-[0_0_15px_rgba(59,130,246,0.8)] animate-scan-line" />
      
      <div className="absolute bottom-16 left-0 right-0 text-center flex flex-col items-center gap-3">
        {countdown !== null && (
          <div className="bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center text-xl font-black shadow-2xl animate-bounce">
            {countdown}
          </div>
        )}
        <span className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 border border-blue-500/30">
          {countdown !== null ? 'Mantenga estable para auto-disparo' : 'Alinee el documento con el marco'}
        </span>
      </div>
    </div>
  );
};
