
import React from 'react';
import { MapPin, ChevronDown } from 'lucide-react';

interface LocationTriggerProps {
 location: string;
 onClick: () => void;
 variant?: 'compact' | 'full';
}

export const LocationTrigger: React.FC<LocationTriggerProps> = ({ location, onClick, variant = 'full' }) => {
 const isUnset = location === 'SIN_DEFINIR' || !location;

 if (variant === 'compact') {
 return (
 <button 
 onClick={onClick}
 className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 transition-all active:scale-90 ${
 isUnset ? 'bg-amber-500/10 border-amber-500 text-amber-500 animate-pulse' : 'bg-white/5 border-white/10 text-blue-400'
 }`}
 >
 <MapPin className="w-3.5 h-3.5" />
 <span className="text-[10px] font-black uppercase truncate max-w-[80px]">{location}</span>
 </button>
 );
 }

 return (
 <button 
 onClick={onClick}
 className={`
 w-full p-4 rounded-2xl border-2 flex items-center justify-between transition-all active:scale-[0.98]
 ${isUnset 
 ? 'bg-amber-950/20 border-amber-500/40 text-amber-500' 
 : 'bg-slate-900 border-white/5 text-white'
 }
 `}
 >
 <div className="flex items-center gap-4">
 <div className={`p-2.5 rounded-xl ${isUnset ? 'bg-amber-500 text-black' : 'bg-blue-600 text-white'}`}>
 <MapPin className="w-5 h-5" />
 </div>
 <div className="text-left">
 <div className="text-[8px] font-black uppercase tracking-[0.3em] opacity-40">Ubicación_Actual</div>
 <div className="text-sm font-black uppercase tracking-widest truncate">
 {isUnset ? 'Establecer Zona' : location}
 </div>
 </div>
 </div>
 <ChevronDown className="w-4 h-4 opacity-20" />
 </button>
 );
};
