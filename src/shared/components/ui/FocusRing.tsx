/**
 * FocusRing - Componente para estados de focus accesibles
 *
 * Proporciona:
 * - Ring de focus visible y accesible
 * - Variantes de color
 * - Tamaños ajustables
 * - Soporte para diferentes elementos
 */

import React, { forwardRef, memo } from 'react';
import { cn } from '@/lib/utils';

// =============================================================================
// TIPOS
// =============================================================================

interface FocusRingProps {
  /** Si está enfocado */
  focused?: boolean;
  /** Color del ring */
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  /** Tamaño del ring */
  size?: 'sm' | 'md' | 'lg';
  /** Offset del ring */
  offset?: number;
  /** Gap entre el elemento y el ring */
  gap?: number;
  /** Contenido */
  children: React.ReactNode;
  /** Clase adicional */
  className?: string;
}

// =============================================================================
// ESTILOS
// =============================================================================

const colorStyles = {
  primary: 'ring-primary ring-offset-base',
  secondary: 'ring-secondary ring-offset-base',
  success: 'ring-emerald-500 ring-offset-base',
  warning: 'ring-amber-500 ring-offset-base',
  error: 'ring-rose-500 ring-offset-base',
};

const sizeStyles = {
  sm: 'ring-1',
  md: 'ring-2',
  lg: 'ring-4',
};

// =============================================================================
// COMPONENTE
// =============================================================================

export const FocusRing = memo(
  forwardRef<HTMLDivElement, FocusRingProps>(
    (
      { focused = false, color = 'primary', size = 'md', offset = 2, gap = 2, children, className },
      ref
    ) => {
      return (
        <div
          ref={ref}
          className={cn(
            'relative transition-all duration-150',
            focused && [
              colorStyles[color],
              sizeStyles[size],
              `ring-offset-[${offset}px]`,
              'outline-none',
            ],
            className
          )}
          style={{
            outlineOffset: focused ? `${offset}px` : undefined,
          }}
        >
          {children}
        </div>
      );
    }
  )
);

FocusRing.displayName = 'FocusRing';

// =============================================================================
// HOOK PARA FOCUS
// =============================================================================

/**
 * Hook para manejar el estado de focus
 *
 * @example
 * ```tsx
 * const { focused, ... } = useFocusState();
 *
 * return (
 *   <FocusRing focused={focused}>
 *     <input
 *       onFocus={() => setFocused(true)}
 *       onBlur={() => setFocused(false)}
 *     />
 *   </FocusRing>
 * );
 * ```
 */
export function useFocusState() {
  const [focused, setFocused] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const onFocus = React.useCallback(() => setFocused(true), []);
  const onBlur = React.useCallback(() => setFocused(false), []);

  return {
    focused,
    inputRef,
    onFocus,
    onBlur,
    handlers: {
      onFocus,
      onBlur,
    },
  };
}

// =============================================================================
// DIRECTIVA TAILWIND PARA FOCUS
// =============================================================================

/**
 * Clases de focusring que puedes usar directamente en elementos
 */
export const focusStyles = {
  // Ring visible con offset
  ring: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-base',

  // Ring sin offset
  ringInline:
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-0',

  // Outline simple
  outline: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',

  // Subtle - para inputs
  subtle:
    'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:border-primary',

  // Sin focus ring
  none: 'focus-visible:outline-none',
};

// Componente wrapper para aplicar focus styles
interface FocusableProps {
  children: React.ReactNode;
  variant?: keyof typeof focusStyles;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
}

export const Focusable = memo(
  ({
    children,
    variant = 'ring',
    className,
    as: Component = 'div',
    ...props
  }: FocusableProps & Record<string, any>) => {
    return (
      <Component className={cn(focusStyles[variant], className)} {...props}>
        {children}
      </Component>
    );
  }
);

Focusable.displayName = 'Focusable';
