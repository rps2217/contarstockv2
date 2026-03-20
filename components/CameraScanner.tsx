
import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Target, Zap, Activity, X, Camera } from 'lucide-react';
import { useOpticalEngine } from '../hooks/useOpticalEngine';

interface CameraScannerProps {
  onScan: (code: string) => void;
  onClose: () => void;
  inline?: boolean;
  isTriggered?: boolean;
  mode?: 'scan' | 'photo';
  onCapture?: (photo: string) => void;
}

export const CameraScanner: React.FC<CameraScannerProps> = ({ 
  onScan, 
  onClose, 
  inline = true, 
  isTriggered = false,
  mode = 'scan',
  onCapture
}) => {
  const [feedbackStatus, setFeedbackStatus] = useState<'success' | null>(null);
  
  const effectiveTrigger = inline ? isTriggered : true;
  const SCANNER_DOM_ID = "v8-core-optical-engine";

  const handleScan = (code: string) => {
    if (mode !== 'scan') return;
    setFeedbackStatus('success');
    onScan(code);
    setTimeout(() => setFeedbackStatus(null), 250);
  };

  const { videoRef, error, engineType } = useOpticalEngine({
    onScan: handleScan,
    isTriggered: effectiveTrigger,
    scannerDomId: SCANNER_DOM_ID
  });

  const handleCapture = () => {
    if (!videoRef.current || !onCapture) return;
    
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      onCapture(dataUrl);
    }
  };

  return (
    <div className={`${inline ? 'w-full h-full relative' : 'fixed inset-0 z-[100]'} bg-black overflow-hidden`}>
      {mode === 'scan' && (
        <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center">
          <div className={`w-64 h-64 border-2 transition-all duration-150 rounded-3xl flex items-center justify-center ${effectiveTrigger ? 'border-blue-500/40 scale-100' : 'border-white/10 scale-90 opacity-20'}`}>
            <Target className={`w-12 h-12 transition-all duration-300 ${effectiveTrigger ? 'text-blue-500 opacity-30 animate-pulse' : 'text-white'}`} />
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-xl"></div>
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-xl"></div>
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-xl"></div>
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-xl"></div>
          </div>
          {effectiveTrigger && !feedbackStatus && <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-red-500 shadow-[0_0_10px_red] animate-[radar-pulse_1s_infinite] opacity-50"></div>}
        </div>
      )}
      
      <div className="absolute top-4 left-4 z-50 pointer-events-auto">
        <button onClick={onClose} className="bg-black/60 text-white/60 p-3 rounded-2xl active:bg-white active:text-black transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="absolute top-4 right-4 z-50 pointer-events-none">
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${engineType === 'native' ? 'bg-blue-900/40 border-blue-500/30 text-blue-400' : 'bg-orange-900/40 border-orange-500/30 text-orange-400'}`}>
          {engineType === 'native' ? <Zap className="w-3 h-3 fill-current" /> : <Activity className="w-3 h-3" />}
          <span className="text-[9px] font-black uppercase tracking-widest">{engineType === 'native' ? 'GPU_NATIVE' : 'CPU_LEGACY'}</span>
        </div>
      </div>

      <div className="flex-1 relative bg-black flex flex-col justify-center h-full">
        {feedbackStatus === 'success' && <div className="absolute inset-0 z-[60] bg-emerald-600/40 flex items-center justify-center animate-in fade-in duration-75"><CheckCircle2 className="w-20 h-20 text-white" /></div>}
        {error && <div className="absolute inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center p-6 text-center"><AlertTriangle className="w-12 h-12 text-rose-500 mb-4" /><h3 className="text-white font-black uppercase text-[10px] tracking-widest">{error}</h3><button onClick={onClose} className="mt-8 bg-white text-black px-10 py-4 font-black uppercase text-[10px] border-b-8 border-slate-300">Volver</button></div>}
        <video ref={videoRef} className={`w-full h-full object-cover transition-all duration-150 ${engineType === 'native' ? 'block' : 'hidden'} ${effectiveTrigger ? 'opacity-100 scale-100' : 'opacity-10 scale-110 grayscale blur-sm'}`} playsInline muted />
        <div id={SCANNER_DOM_ID} className={`w-full h-full transition-all duration-150 ${engineType === 'wasm' ? 'block' : 'hidden'} ${effectiveTrigger ? 'opacity-100 scale-100' : 'opacity-10 scale-110 grayscale blur-sm'}`}></div>
      </div>

      {mode === 'photo' && (
        <div className="absolute bottom-12 left-0 right-0 z-50 flex justify-center">
          <button 
            onClick={handleCapture}
            className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center active:scale-90 transition-transform"
          >
            <div className="w-16 h-16 rounded-full bg-white"></div>
          </button>
        </div>
      )}

      <style>{`
        #${SCANNER_DOM_ID} video { width: 100% !important; height: 100% !important; object-fit: cover !important; }
        @keyframes radar-pulse { 0% { transform: translateY(-30px); opacity: 0; } 50% { opacity: 0.8; } 100% { transform: translateY(30px); opacity: 0; } }
      `}</style>
    </div>
  );
};
