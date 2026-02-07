
import React, { useState, useRef, useEffect } from 'react';
import { Lock, Unlock } from 'lucide-react';

interface Props {
    isLocked: boolean;
    onUnlock: () => void;
}

export const ScreenLockOverlay: React.FC<Props> = ({ isLocked, onUnlock }) => {
    const [isHolding, setIsHolding] = useState(false);
    const [progress, setProgress] = useState(0);
    const intervalRef = useRef<any>(null);
    
    // TIEMPO ACEITADO: 500ms para un desbloqueo ultra-rápido pero seguro
    const UNLOCK_DURATION = 500; 
    const UPDATE_INTERVAL = 16; // 60fps para fluidez total

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

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [isHolding]);

    const handleUnlockTrigger = () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (navigator.vibrate) navigator.vibrate([30, 50]);
        setIsHolding(false);
        onUnlock();
    };

    const startHold = (e: React.PointerEvent | React.TouchEvent) => {
        e.preventDefault(); 
        if (navigator.vibrate) navigator.vibrate(15);
        setIsHolding(true);
    };

    const stopHold = () => {
        setIsHolding(false);
    };

    if (!isLocked) return null;

    return (
        <div 
            className="fixed inset-0 z-[150] bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-end pb-32 select-none touch-none animate-in fade-in duration-300"
            onPointerDown={startHold}
            onPointerUp={stopHold}
            onPointerLeave={stopHold}
        >
            <div className="relative">
                {/* Anillo de Progreso */}
                <svg className="w-44 h-44 transform -rotate-90 pointer-events-none">
                    <circle
                        cx="88" cy="88" r="80"
                        stroke="currentColor" strokeWidth="6"
                        fill="transparent" className="text-white/5"
                    />
                    <circle
                        cx="88" cy="88" r="80"
                        stroke="currentColor" strokeWidth="8"
                        fill="transparent"
                        className={`text-blue-500 transition-opacity duration-75 ${progress > 0 ? 'opacity-100' : 'opacity-0'}`}
                        strokeDasharray={502}
                        strokeDashoffset={502 - (502 * progress) / 100}
                        strokeLinecap="round"
                    />
                </svg>

                {/* Icono Central */}
                <div className={`absolute inset-0 flex items-center justify-center transition-all duration-200 ${isHolding ? 'scale-90' : 'scale-100'}`}>
                    <div className={`p-8 rounded-full bg-slate-900 border-4 shadow-2xl transition-colors ${progress > 90 ? 'text-blue-400 border-blue-500' : 'text-white border-white/10'}`}>
                        {progress >= 100 ? <Unlock className="w-14 h-14" /> : <Lock className="w-14 h-14" />}
                    </div>
                </div>
            </div>

            <div className="mt-10 text-center space-y-2 pointer-events-none px-8">
                <h2 className="text-2xl font-black text-white uppercase tracking-tighter italic">Terminal Seguro</h2>
                <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px] animate-pulse">
                    Manten presionado para operar
                </p>
            </div>

            <div className="absolute bottom-12 flex items-center gap-2 text-blue-500/20 pointer-events-none">
                <div className="w-1 h-1 rounded-full bg-blue-500 animate-ping"></div>
                <span className="text-[7px] font-black uppercase tracking-[0.5em]">LOGICOUNT_SHIELD_V2</span>
            </div>
        </div>
    );
};
