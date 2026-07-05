
/**
 * Modal - Componente de diálogo mejorado usando <dialog> nativo de HTML5
 */

import React, { useEffect, useRef, memo } from 'react';
import { X } from 'lucide-react';

type ModalVariant = 'center' | 'bottom-sheet' | 'fullscreen' | 'side-drawer';
type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  description?: string;
  variant?: ModalVariant;
  size?: ModalSize;
  className?: string;
  showCloseButton?: boolean;
  footer?: React.ReactNode;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  preventScroll?: boolean;
}

const sizeClasses: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-full',
};

export const Modal = memo(({
  isOpen,
  onClose,
  children,
  title,
  description,
  variant = 'bottom-sheet',
  size = 'md',
  className = '',
  showCloseButton = true,
  footer,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  preventScroll = true,
}: ModalProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Handle open/close
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
      if (preventScroll) {
        document.body.style.overflow = 'hidden';
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, preventScroll]);

  // Handle escape key
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeOnEscape) {
        // Only close if backdrop was clicked or escape pressed
        const rect = dialog.getBoundingClientRect();
        const clickedInDialog = 
          e.clientX >= rect.left &&
          e.clientX <= rect.right &&
          e.clientY >= rect.top &&
          e.clientY <= rect.bottom;
        
        if (!clickedInDialog || variant === 'bottom-sheet') {
          onClose();
        }
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, closeOnEscape, variant]);

  const handleOverlayClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (closeOnOverlayClick && e.target === dialogRef.current) {
      onClose();
    }
  };

  // Calculate variant-specific classes
  const getVariantClasses = () => {
    switch (variant) {
      case 'center':
        return 'rounded-[2.5rem] animate-in zoom-in-95 duration-200';
      case 'bottom-sheet':
        return 'rounded-t-[2.5rem] md:rounded-[2.5rem] animate-in slide-in-from-bottom-8 md:zoom-in-95 duration-300';
      case 'fullscreen':
        return 'w-full h-full rounded-none animate-in fade-in duration-200';
      case 'side-drawer':
        return 'rounded-l-[2.5rem] animate-in slide-in-from-right duration-300';
      default:
        return 'rounded-[2.5rem]';
    }
  };

  const getContainerClasses = () => {
    switch (variant) {
      case 'center':
        return 'items-center justify-center p-4';
      case 'bottom-sheet':
        return 'items-end md:items-center justify-center md:p-4';
      case 'fullscreen':
        return 'items-center justify-center';
      case 'side-drawer':
        return 'items-stretch justify-end';
      default:
        return 'items-center justify-center p-4';
    }
  };

  return (
    <dialog
      ref={dialogRef}
      onClick={handleOverlayClick}
      className={`
        backdrop:bg-brand-dark/60 backdrop:backdrop-blur-sm
        ${variant === 'bottom-sheet' ? 'inset-auto bottom-0 top-auto m-0 w-full md:top-auto' : ''}
        ${variant === 'fullscreen' ? 'inset-0 m-0 w-full h-full' : ''}
        ${variant === 'side-drawer' ? 'ml-auto mr-0 my-0' : ''}
        ${variant === 'center' ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2' : ''}
        ${sizeClasses[size]}
      `}
    >
      <div
        className={`
          relative bg-white dark:bg-brand-dark shadow-2xl
          overflow-hidden flex flex-col max-h-[90vh] md:max-h-[85vh]
          ${getVariantClasses()}
          ${className}
        `}
        style={{
          // For bottom-sheet on mobile, extend to full width
          ...(variant === 'bottom-sheet' && typeof window !== 'undefined' && window.innerWidth < 768
            ? { width: '100%', maxWidth: '100%', borderRadius: '2.5rem 2.5rem 0 0' }
            : {}),
        }}
      >
        {/* Header */}
        {(title || showCloseButton || description) && (
          <div className="flex items-start justify-between px-6 py-4 border-b border-slate-100 dark:border-white/5 shrink-0">
            <div className="flex-1 pr-4">
              {title && (
                <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none">
                  {title}
                </h2>
              )}
              {description && (
                <p className="text-sm text-slate-500 mt-1">
                  {description}
                </p>
              )}
            </div>
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-2 -mr-2 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full text-muted hover:text-slate-900 dark:hover:text-white transition-colors shrink-0"
                aria-label="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar relative px-6 py-4">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-slate-100 dark:border-white/5 shrink-0 bg-slate-50/50 dark:bg-white/5">
            {footer}
          </div>
        )}
      </div>
    </dialog>
  );
});

Modal.displayName = 'Modal';

// ConfirmDialog - Diálogo de confirmación
interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  loading?: boolean;
}

export const ConfirmDialog = memo(({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'info',
  loading = false,
}: ConfirmDialogProps) => {
  const buttonVariant = {
    danger: 'bg-rose-600 hover:bg-rose-700',
    warning: 'bg-amber-500 hover:bg-amber-600',
    info: 'bg-brand-info hover:bg-brand-info/90',
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} variant="center" size="sm">
      <div className="text-center">
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
          {message}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 text-sm font-bold text-white rounded-xl transition-colors disabled:opacity-50 ${buttonVariant[variant]}`}
          >
            {loading ? 'Procesando...' : confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
});

ConfirmDialog.displayName = 'ConfirmDialog';

