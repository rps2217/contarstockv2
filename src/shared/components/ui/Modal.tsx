
import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
 isOpen: boolean;
 onClose: () => void;
 children: React.ReactNode;
 title?: string;
 variant?: 'center' | 'bottom-sheet' | 'fullscreen' | 'side-drawer';
 className?: string;
 showCloseButton?: boolean;
}

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
 'fullscreen': 'flex items-center justify-center',
 'side-drawer': 'flex justify-end'
 };

 const contentClasses = {
 'center': 'rounded-[2.5rem] animate-in zoom-in-95 duration-200',
 'bottom-sheet': 'w-full max-w-full rounded-t-[2.5rem] md:rounded-[2.5rem] animate-in slide-in-from-bottom-8 md:zoom-in-95 duration-300',
 'fullscreen': 'w-full h-full rounded-none animate-in fade-in duration-200',
 'side-drawer': 'w-full sm:w-[450px] h-full max-h-screen rounded-none animate-in slide-in-from-right duration-300 border-l border-slate-100 dark:border-white/5'
 };

 return (
 // Z-Index 200: Modales estándar (debajo del teclado que es 2000)
 <div className={`fixed inset-0 z-[200] ${containerClasses[variant]}`}>
 <div 
 className="absolute inset-0 bg-brand-dark/40 transition-opacity animate-in fade-in duration-300 z-0" 
 onClick={onClose} 
 />
 
 <div className={`relative z-10 bg-white dark:bg-brand-dark shadow-2xl overflow-hidden flex flex-col ${contentClasses[variant]} ${className}`}>
 
 {(title || showCloseButton) && (
 <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/5 shrink-0 z-10">
 {title && (
 <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none">
 {title}
 </h2>
 )}
 {showCloseButton && (
 <button 
 onClick={onClose} 
 className="p-2 -mr-2 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 rounded-full text-muted hover:text-slate-900 transition-colors"
 >
 <X className="w-5 h-5" />
 </button>
 )}
 </div>
 )}

 <div className="flex-1 overflow-y-auto no-scrollbar relative">
 {children}
 </div>
 </div>
 </div>
 );
};

