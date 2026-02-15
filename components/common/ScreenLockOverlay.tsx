
import React, { useState, useRef, useEffect } from 'react';
import { Lock, Unlock, ShieldAlert, Zap } from 'lucide-react';

interface Props {
    isLocked: boolean;
    onUnlock: () => void;
}

/**
 * SCREEN LOCK v5.0 (PDA Rugged Edition)
 * Previene el "Pocket Dialing" de escaneos accidentales.
 */
export const ScreenLockOverlay: React.FC<Props> = ({ isLocked, onUnlock }) => {
    const [isHolding, setIsHolding] = useState(false);
    const [progress, setProgress] = useState(0);
    const intervalRef = useRef<any>(null);
    
    const UNLOCK_DURATION = 900; 
    const UPDATE_INTERVAL = 16;

    useEffect(() => {
        if (isHolding) {
            const step = 100 / (UNLOCK_DURATION / UPDATE_INTERVAL);
            intervalRef.current = setInterval(() => {
                setProgress(prev => {
                    const next = prev + step;
                    if (next >= 100) {
                        handleUnlockTrigger();
                        return 100;
                    }
                    return next;
                });
            }, UPDATE_INTERVAL);
        } else {
            if (intervalRef.current) clearInterval(intervalRef.current);
            setProgress(0);
        }
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [isHolding]);

    const handleUnlockTrigger = () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (navigator.vibrate) navigator.vibrate([40, 80, 40]);
        setIsHolding(false);
        onUnlock();
    };

    if (!isLocked) return null;

    return (
        <div 
            className="fixed inset-0 z-[1000] bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center select-none touch-none animate-in fade-in duration-300"
            onPointerDown={() => setIsHolding(true)}
            onPointerUp={() => setIsHolding(false)}
            onPointerLeave={() => setIsHolding(false)}
            onContextMenu={(e) => e.preventDefault()}
        >
            <div className="relative mb-12">
                {/* RADAR DE DESBLOQUEO */}
                <svg className="w-64 h-64 transform -rotate-90">
                    <circle cx="128" cy="128" r="115" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-white/5" />
                    <circle
                        cx="128"
                        cy="128"
                        r="115"
                        stroke="currentColor"
                        strokeWidth="10"
                        fill="transparent"
                        className="text-blue-500 transition-all duration-75"
                        strokeDasharray={722}
                        strokeDashoffset={722 - (722 * progress) / 100}
                        strokeLinecap="round"
                    />
                </svg>

                {/* ICONO CENTRAL RUGERIZADO */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className={`p-12 rounded-full transition-all duration-300 ${isHolding ? 'bg-blue-600 scale-90 shadow-[0_0_80px_rgba(59,130,246,0.6)] border-4 border-white' : 'bg-slate-900 shadow-2xl border-4 border-white/10'}`}>
                        {progress >= 100 ? (
                            <Unlock className="w-20 h-20 text-white animate-pulse" strokeWidth={3} />
                        ) : (
                            <Lock className="w-20 h-20 text-white" strokeWidth={3} />
                        )}
                    </div>
                </div>
            </div>

            <div className="text-center px-10">
                <div className="inline-flex items-center gap-3 bg-blue-500/10 border border-blue-500/30 px-5 py-2.5 rounded-2xl mb-6">
                    <ShieldAlert className="w-5 h-5 text-blue-500" />
                    <span className="text-[11px] font-black text-blue-500 uppercase tracking-[0.4em]">PDA_Secured_v4</span>
                </div>
                <h2 className="text-4xl font-black text-white uppercase tracking-tighter italic mb-4">BLOQUEADO</h2>
                <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] max-w-[250px] mx-auto leading-relaxed">
                    Mantén presionado el centro por 1 segundo para reactivar el motor de escaneo
                </p>
            </div>

            {/* DECORACIÓN TÉCNICA PDA */}
            <div className="absolute bottom-12 left-12 flex flex-col gap-2">
                <div className="flex gap-1">
                    {[1, 2, 3].map(i => <div key={i} className="w-2 h-2 bg-blue-600/40 rounded-full"></div>)}
                </div>
                <div className="text-[9px] font-black text-slate-800 font-mono tracking-widest">LOGICOUNT_OS_CORE</div>
            </div>
            
            <div className="absolute top-12 right-12 animate-pulse">
                <Zap className="w-8 h-8 text-blue-600 opacity-20" />
            </div>
        </div>
    );
};
