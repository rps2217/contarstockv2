
import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    title?: string;
    variant?: 'center' | 'bottom-sheet' | 'fullscreen';
    className?: string;
    showCloseButton?: boolean;
}

/**
 * SISTEMA MODAL UNIFICADO
 * Z-index elevado a 200 para solapar la navegación global.
 */
export const Modal: React.FC<ModalProps> = ({ 
    isOpen, 
    onClose, 
    children, 
    title, 
    variant = 'bottom-sheet',
    className = '',
    showCloseButton = true
}) => {
    
    useEffect(() => {
        if (!isOpen) return;

        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', handleEsc);

        return () => {
            document.body.style.overflow = '';
            window.removeEventListener('keydown', handleEsc);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const containerClasses = {
        'center': 'flex items-center justify-center p-4',
        'bottom-sheet': 'flex items-end md:items-center justify-center md:p-4',
        'fullscreen': 'flex items-center justify-center'
    };

    const contentClasses = {
        'center': 'rounded-[2.5rem] animate-in zoom-in-95 duration-200 will-change-transform',
        'bottom-sheet': 'w-full rounded-t-[2.5rem] md:rounded-[2.5rem] animate-in slide-in-from-bottom-8 md:zoom-in-95 duration-300 will-change-transform',
        'fullscreen': 'w-full h-full rounded-none animate-in fade-in duration-200'
    };

    return (
        <div className={`fixed inset-0 z-[200] ${containerClasses[variant]}`}>
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-slate-900/80 backdrop-blur-md transition-opacity animate-in fade-in duration-300" 
                onClick={onClose} 
            />
            
            {/* Contenedor del Contenido */}
            <div className={`relative bg-white shadow-2xl overflow-hidden flex flex-col max-h-[95dvh] ${contentClasses[variant]} ${className}`}>
                
                {/* Header Opcional */}
                {(title || showCloseButton) && (
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0 bg-white z-10">
                        {title && (
                            <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight leading-none">
                                {title}
                            </h2>
                        )}
                        {showCloseButton && (
                            <button 
                                onClick={onClose} 
                                className="p-2 -mr-2 bg-slate-50 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-900 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                )}

                <div className="flex-1 overflow-y-auto no-scrollbar relative transform-gpu">
                    {children}
                </div>
            </div>
        </div>
    );
};
