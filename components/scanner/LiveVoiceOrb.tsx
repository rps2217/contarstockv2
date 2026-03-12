
import React from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';

interface Props {
 status: 'idle' | 'listening' | 'thinking';
 onClick: () => void;
}

export const LiveVoiceOrb: React.FC<Props> = ({ status, onClick }) => {
 return (
 <button 
 onClick={onClick}
 className={`relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-500 shadow-2xl ${
 status === 'listening' ? 'bg-indigo-600 scale-110' : (status === 'thinking' ? 'bg-amber-500' : 'bg-slate-800')
 }`}
 >
 {status === 'listening' && (
 <>
 <div className="absolute inset-0 rounded-full bg-indigo-400 animate-ping opacity-20"></div>
 <div className="absolute -inset-2 rounded-full border-2 border-indigo-500/30 animate-pulse"></div>
 </>
 )}
 
 {status === 'thinking' ? (
 <Loader2 className="w-8 h-8 text-white animate-spin" />
 ) : status === 'listening' ? (
 <Mic className="w-8 h-8 text-white" />
 ) : (
 <MicOff className="w-8 h-8 text-slate-400" />
 )}

 <div className="absolute -top-12 right-0 bg-black/80 text-[8px] font-black text-white px-2 py-1 rounded-lg uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
 Voz IA
 </div>
 </button>
 );
};
