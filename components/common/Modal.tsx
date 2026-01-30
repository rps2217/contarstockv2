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
 * Aplica principios de 'Separation of Concerns' aislando la lógica de presentación
 * (animaciones, backdrop, scroll lock) del contenido de negocio.
 */
export const Modal: React.FC<ModalProps> = ({ 
    isOpen, 
    onClose, 
    children, 
    title, 
    variant = 'bottom-sheet', // Por defecto actúa como hoja inferior en móvil, centro en desktop
    className = '',
    showCloseButton = true
}) => {
    
    // Efecto para manejo de Scroll Lock y Tecla ESC
    useEffect(() => {
        if (!isOpen) return;

        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        // Bloquear scroll
        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', handleEsc);

        return () => {
            document.body.style.overflow = '';
            window.removeEventListener('keydown', handleEsc);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    // Clases base dinámicas según variante
    const containerClasses = {
        'center': 'flex items-center justify-center p-4',
        'bottom-sheet': 'flex items-end md:items-center justify-center md:p-4',
        'fullscreen': 'flex items-center justify-center'
    };

    const contentClasses = {
        'center': 'rounded-[2.5rem] animate-in zoom-in-95 duration-200',
        'bottom-sheet': 'w-full rounded-t-[2.5rem] md:rounded-[2.5rem] animate-in slide-in-from-bottom-8 md:zoom-in-95 duration-300',
        'fullscreen': 'w-full h-full rounded-none animate-in fade-in duration-200'
    };

    return (
        <div className={`fixed inset-0 z-[60] ${containerClasses[variant]}`}>
            {/* Backdrop con Blur y Fade */}
            <div 
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-300" 
                onClick={onClose} 
            />
            
            {/* Contenedor del Contenido */}
            <div className={`relative bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90dvh] ${contentClasses[variant]} ${className}`}>
                
                {/* Header Opcional Integrado */}
                {(title || showCloseButton) && (
                    <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 shrink-0 bg-white z-10">
                        {title && (
                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight leading-none">
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

                {/* Área de Contenido Scrollable */}
                <div className="flex-1 overflow-y-auto no-scrollbar relative">
                    {children}
                </div>
            </div>
        </div>
    );
};