
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
    
    // Duración requerida para desbloquear (ms) - Ajustado a 800ms para mayor velocidad
    const UNLOCK_DURATION = 800; 
    const UPDATE_INTERVAL = 20;

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
        if (navigator.vibrate) navigator.vibrate([50, 100, 50]);
        setIsHolding(false);
        onUnlock();
    };

    const startHold = (e: React.PointerEvent | React.TouchEvent) => {
        // Prevenir scroll o zoom accidental
        e.preventDefault(); 
        if (navigator.vibrate) navigator.vibrate(20);
        setIsHolding(true);
    };

    const stopHold = () => {
        setIsHolding(false);
    };

    if (!isLocked) return null;

    return (
        <div 
            className="fixed inset-0 z-[150] bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-end pb-32 select-none touch-none animate-in fade-in duration-300"
            onClick={(e) => e.stopPropagation()} // Capturar todos los clicks
        >
            <div 
                className="relative"
                onPointerDown={startHold}
                onPointerUp={stopHold}
                onPointerLeave={stopHold}
                onTouchStart={startHold}
                onTouchEnd={stopHold}
            >
                {/* Anillo de Progreso SVG */}
                <svg className="w-40 h-40 transform -rotate-90 pointer-events-none">
                    <circle
                        cx="80"
                        cy="80"
                        r="74"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="transparent"
                        className="text-slate-800"
                    />
                    <circle
                        cx="80"
                        cy="80"
                        r="74"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="transparent"
                        className={`text-blue-500 transition-all duration-75 ${progress > 0 ? 'opacity-100' : 'opacity-0'}`}
                        strokeDasharray={465}
                        strokeDashoffset={465 - (465 * progress) / 100}
                        strokeLinecap="round"
                    />
                </svg>

                {/* Icono Central */}
                <div className={`absolute inset-0 flex items-center justify-center transition-transform duration-200 ${isHolding ? 'scale-90' : 'scale-100'}`}>
                    <div className={`p-6 rounded-full bg-slate-900 border-4 border-slate-800 shadow-2xl transition-colors ${progress > 90 ? 'text-blue-400 border-blue-500' : 'text-white'}`}>
                        {progress >= 100 ? <Unlock className="w-12 h-12" /> : <Lock className="w-12 h-12" />}
                    </div>
                </div>
            </div>

            <div className="mt-8 text-center space-y-1 pointer-events-none">
                <h2 className="text-xl font-black text-white uppercase tracking-tight">Pantalla Bloqueada</h2>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] animate-pulse">
                    Mantenga presionado para desbloquear
                </p>
            </div>

            {/* Indicador de estado "Seguro" - Movido al borde inferior */}
            <div className="absolute bottom-12 flex items-center gap-2 text-emerald-500/30 pointer-events-none">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></div>
                <span className="text-[8px] font-black uppercase tracking-[0.4em]">Engine_Safe_Lock</span>
            </div>
        </div>
    );
};
