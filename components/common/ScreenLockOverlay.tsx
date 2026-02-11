
import React, { useState, useRef, useEffect } from 'react';
import { Lock, Unlock, ShieldAlert } from 'lucide-react';

interface Props {
    isLocked: boolean;
    onUnlock: () => void;
}

export const ScreenLockOverlay: React.FC<Props> = ({ isLocked, onUnlock }) => {
    const [isHolding, setIsHolding] = useState(false);
    const [progress, setProgress] = useState(0);
    const intervalRef = useRef<any>(null);
    
    const UNLOCK_DURATION = 800; // ms de presión
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
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [isHolding]);

    const handleUnlockTrigger = () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (navigator.vibrate) navigator.vibrate([40, 80]);
        setIsHolding(false);
        onUnlock();
    };

    if (!isLocked) return null;

    return (
        <div 
            className="fixed inset-0 z-[1000] bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center select-none touch-none animate-in fade-in duration-300"
            onPointerDown={() => setIsHolding(true)}
            onPointerUp={() => setIsHolding(false)}
            onPointerLeave={() => setIsHolding(false)}
        >
            <div className="relative mb-12">
                {/* Anillo de Progreso */}
                <svg className="w-56 h-56 transform -rotate-90">
                    <circle cx="112" cy="112" r="100" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-900" />
                    <circle
                        cx="112"
                        cy="112"
                        r="100"
                        stroke="currentColor"
                        strokeWidth="12"
                        fill="transparent"
                        className="text-blue-500 transition-all duration-75"
                        strokeDasharray={628}
                        strokeDashoffset={628 - (628 * progress) / 100}
                        strokeLinecap="round"
                    />
                </svg>

                {/* Icono Central */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className={`p-10 rounded-full transition-all duration-300 ${isHolding ? 'bg-blue-600 scale-90 shadow-[0_0_50px_rgba(59,130,246,0.5)]' : 'bg-slate-900 shadow-2xl'}`}>
                        {progress >= 100 ? <Unlock className="w-16 h-16 text-white" /> : <Lock className="w-16 h-16 text-white" />}
                    </div>
                </div>
            </div>

            <div className="text-center px-8">
                <div className="inline-flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 px-4 py-2 rounded-full mb-4">
                    <ShieldAlert className="w-4 h-4 text-rose-500" />
                    <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Seguridad_Activa</span>
                </div>
                <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic mb-2">Terminal Bloqueado</h2>
                <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] max-w-[200px] mx-auto leading-relaxed">
                    Mantenga presionado el centro para reactivar el motor de escaneo
                </p>
            </div>

            {/* Decoración Industrial */}
            <div className="absolute bottom-10 left-10 text-[10px] font-mono text-slate-800 font-black vertical-text">SECURED_OS_V4.5</div>
            <div className="absolute top-10 right-10 flex gap-1">
                {[1, 2, 3].map(i => <div key={i} className="w-1.5 h-6 bg-slate-900 rounded-full"></div>)}
            </div>
        </div>
    );
};
