/**
 * useKeyboardAware - Hook para detectar el teclado virtual en móviles
 *
 * Útil para:
 * - Evitar que campos de formulario queden ocultos por el teclado
 * - Ajustar el layout cuando aparece el teclado
 * - Scroll automático al campo enfocado
 */

import { useState, useEffect, useCallback, useRef } from 'react';

interface UseKeyboardAwareOptions {
  /** Offset adicional (px) para asegurar visibilidad */
  offset?: number;
  /** Selector del contenedor con scroll */
  scrollContainer?: string;
}

interface UseKeyboardAwareReturn {
  /** Altura actual del teclado virtual (0 si no hay) */
  keyboardHeight: number;
  /** Si el teclado virtual está abierto */
  isKeyboardOpen: boolean;
  /** Callback para enfocar un campo con scroll */
  focusWithScroll: (element: HTMLElement) => void;
  /** Ref del contenedor principal */
  containerRef: React.RefObject<HTMLDivElement>;
  /** Padding bottom dinámico para evitar que el contenido quede oculto */
  bottomPadding: number;
}

/**
 * Hook para detectar teclado virtual en móviles
 *
 * @example
 * ```tsx
 * const { isKeyboardOpen, bottomPadding } = useKeyboardAware({
 *   offset: 16,
 * });
 *
 * return (
 *   <div style={{ paddingBottom: bottomPadding }}>
 *     <form>
 *       <input />
 *     </form>
 *   </div>
 * );
 * ```
 */
export function useKeyboardAware(options: UseKeyboardAwareOptions = {}): UseKeyboardAwareReturn {
  const { offset = 16, scrollContainer } = options;

  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Solo funciona en navegadores móviles
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (!isMobile) return;

    // Método 1: Escuchar visualViewport (más preciso en iOS)
    const handleVisualViewport = () => {
      if (!window.visualViewport) return;

      const visualViewport = window.visualViewport;
      const windowHeight = window.innerHeight;
      const viewportHeight = visualViewport.height;
      const viewportOffset = visualViewport.offsetTop;

      // El teclado está abierto si la diferencia es significativa (> 100px)
      const diff = windowHeight - viewportHeight - viewportOffset;

      if (diff > 100) {
        setKeyboardHeight(diff);
        setIsKeyboardOpen(true);
      } else {
        setKeyboardHeight(0);
        setIsKeyboardOpen(false);
      }
    };

    // Método 2: Escuchar resize (fallback)
    let lastHeight = window.innerHeight;
    const handleResize = () => {
      const currentHeight = window.innerHeight;
      const diff = lastHeight - currentHeight;

      // Solo considerar cambios significativos
      if (Math.abs(diff) > 100) {
        if (diff > 0) {
          // Teclado abriéndose
          setKeyboardHeight(diff);
          setIsKeyboardOpen(true);
        } else {
          // Teclado cerrándose
          setKeyboardHeight(0);
          setIsKeyboardOpen(false);
        }
      }
      lastHeight = currentHeight;
    };

    // Método 3: Escuchar focus/blur en inputs (último fallback)
    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        // Pequeño delay para dejar que el teclado aparezca
        setTimeout(() => {
          setIsKeyboardOpen(true);
        }, 100);
      }
    };

    const handleBlur = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        setTimeout(() => {
          // Solo cerrar si no hay otro elemento enfocado
          setIsKeyboardOpen(false);
        }, 100);
      }
    };

    // Agregar event listeners
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleVisualViewport);
      window.visualViewport.addEventListener('scroll', handleVisualViewport);
    }

    window.addEventListener('resize', handleResize);
    document.addEventListener('focusin', handleFocus);
    document.addEventListener('focusout', handleBlur);

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleVisualViewport);
        window.visualViewport.removeEventListener('scroll', handleVisualViewport);
      }
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('focusin', handleFocus);
      document.removeEventListener('focusout', handleBlur);
    };
  }, []);

  // Scroll automático al elemento enfocado
  const focusWithScroll = useCallback((element: HTMLElement) => {
    element.focus();

    // Esperar a que el teclado aparezca
    setTimeout(() => {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest',
      });
    }, 100);
  }, []);

  // Padding bottom dinámico
  const bottomPadding = isKeyboardOpen ? keyboardHeight + offset : 0;

  return {
    keyboardHeight,
    isKeyboardOpen,
    focusWithScroll,
    containerRef: containerRef as React.RefObject<HTMLDivElement>,
    bottomPadding,
  };
}

// =============================================================================
// COMPONENTE HELPER
// =============================================================================

import React from 'react';
import { cn } from '@/lib/utils';

interface KeyboardAwareContainerProps {
  children: React.ReactNode;
  className?: string;
  offset?: number;
}

/**
 * Contenedor que ajusta automáticamente el padding cuando aparece el teclado
 *
 * @example
 * ```tsx
 * <KeyboardAwareContainer offset={16}>
 *   <form>
 *     <input placeholder="Nombre" />
 *     <input placeholder="Email" />
 *     <button>Enviar</button>
 *   </form>
 * </KeyboardAwareContainer>
 * ```
 */
export const KeyboardAwareContainer: React.FC<KeyboardAwareContainerProps> = ({
  children,
  className,
  offset = 16,
}) => {
  const { isKeyboardOpen, keyboardHeight } = useKeyboardAware({ offset });

  return (
    <div
      className={cn('transition-all duration-200', className)}
      style={{
        paddingBottom: isKeyboardOpen ? `${keyboardHeight + offset}px` : 0,
      }}
    >
      {children}
    </div>
  );
};
