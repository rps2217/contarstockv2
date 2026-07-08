/**
 * Modal - Componente de diálogo mejorado usando <dialog> nativo de HTML5
 */

import React, { useEffect, useRef, memo } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

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
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, closeOnEscape]);

  const handleOverlayClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (closeOnOverlayClick && e.target === dialogRef.current) {
      onClose();
    }
  };

  // Calculate variant-specific classes
  const getVariantClasses = () => {
    switch (variant) {
      case 'fullscreen':
        return 'w-screen h-screen max-w-full max-h-full rounded-none';
      case 'side-drawer':
        return 'h-full rounded-none ml-auto';
      case 'bottom-sheet':
        return 'rounded-t-2xl rounded-b-none md:rounded-2xl md:rounded-b-2xl';
      default:
        return 'rounded-2xl';
    }
  };

  const variantClasses = getVariantClasses();
  const sizeClass = sizeClasses[size];

  return (
    <dialog
      ref={dialogRef}
      onClick={handleOverlayClick}
      className={cn(
        'fixed inset-0 z-50 bg-transparent backdrop:bg-black/50 backdrop:backdrop-blur-sm',
        'flex items-end md:items-center justify-center m-0 p-0 max-w-full max-h-[100vh]',
        variant === 'center' && 'md:items-center',
        variant === 'bottom-sheet' && 'items-end',
        variant === 'fullscreen' && 'w-full h-full',
        className
      )}
    >
      <div
        className={cn(
          'bg-surface border border-subtle shadow-2xl',
          'flex flex-col max-h-[90vh] md:max-h-[85vh]',
          'w-full md:w-auto md:mx-4',
          variantClasses,
          sizeClass
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-subtle">
            <div>
              {title && (
                <h2 className="text-lg font-semibold text-primary">{title}</h2>
              )}
              {description && (
                <p className="text-sm text-secondary mt-1">{description}</p>
              )}
            </div>
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-elevated rounded-lg transition-colors text-secondary hover:text-primary"
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-subtle">
            {footer}
          </div>
        )}
      </div>
    </dialog>
  );
});

Modal.displayName = 'Modal';

export default Modal;
