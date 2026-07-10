/**
 * Tooltip - Componente para mostrar información adicional al hover
 */

import React, { memo, useState, useRef, useEffect } from 'react';

type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';
type TooltipVariant = 'default' | 'dark' | 'light';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  position?: TooltipPosition;
  variant?: TooltipVariant;
  delay?: number;
  disabled?: boolean;
  className?: string;
}

const positionClasses: Record<TooltipPosition, string> = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
};

const variantClasses: Record<TooltipVariant, string> = {
  default: 'bg-brand-dark text-white',
  dark: 'bg-black text-white',
  light: 'bg-white text-brand-dark border border-slate-200',
};

const arrowClasses: Record<TooltipPosition, string> = {
  top: 'top-full left-1/2 -translate-x-1/2 border-t-brand-dark border-x-transparent border-b-transparent',
  bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-brand-dark border-x-transparent border-t-transparent',
  left: 'left-full top-1/2 -translate-y-1/2 border-l-brand-dark border-y-transparent border-r-transparent',
  right: 'right-full top-1/2 -translate-y-1/2 border-r-brand-dark border-y-transparent border-l-transparent',
};

export const Tooltip = memo(({
  content,
  children,
  position = 'top',
  variant = 'default',
  delay = 200,
  disabled = false,
  className = '',
}: TooltipProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const showTooltip = () => {
    if (disabled) return;
    timeoutRef.current = window.setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
    >
      {React.cloneElement(children, {
        'aria-describedby': isVisible ? 'tooltip' : undefined,
      })}
      
      {isVisible && (
        <div
          ref={tooltipRef}
          id="tooltip"
          role="tooltip"
          className={`
            absolute z-50 px-3 py-2 text-xs font-bold rounded-xl
            whitespace-nowrap shadow-xl
            animate-in fade-in zoom-in-95 duration-150
            ${positionClasses[position]}
            ${variantClasses[variant]}
            ${className}
          `}
        >
          {content}
          <span
            className={`
              absolute w-0 h-0 border-4
              ${arrowClasses[position]}
              ${variant === 'light' ? 'border-t-white dark:border-t-black' : ''}
            `}
          />
        </div>
      )}
    </div>
  );
});

Tooltip.displayName = 'Tooltip';

// TooltipProvider - Para casos donde necesitas controlar múltiples tooltips
interface TooltipProviderProps {
  children: React.ReactNode;
  delay?: number;
}

export const TooltipProvider: React.FC<TooltipProviderProps> = ({
  children,
  delay = 200,
}) => {
  // En el futuro aquí se puede agregar lógica de grupo
  return <>{children}</>;
};