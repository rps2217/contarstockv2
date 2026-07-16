/**
 * PullToRefresh - Componente de pull-to-refresh para móvil
 *
 * Características:
 * - Detección de gesto de pull en móvil
 * - Indicador visual de carga
 * - Threshold configurable
 * - Soporte para touch y mouse
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

// =============================================================================
// TIPOS
// =============================================================================

interface PullToRefreshProps {
  /** Contenido desplazable */
  children: React.ReactNode;
  /** Callback cuando se hace pull-to-refresh */
  onRefresh: () => Promise<void>;
  /** Distancia en px para activar refresh */
  threshold?: number;
  /** Máxima distancia de pull */
  maxPull?: number;
  /** Si está deshabilitado */
  disabled?: boolean;
  /** Clases adicionales */
  className?: string;
  /** Elemento indicador (opcional) */
  indicator?: React.ReactNode;
}

// =============================================================================
// CONSTANTES
// =============================================================================

const DEFAULT_THRESHOLD = 80;
const DEFAULT_MAX_PULL = 120;
const PULL_RESISTANCE = 0.5;

// =============================================================================
// COMPONENTE
// =============================================================================

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  children,
  onRefresh,
  threshold = DEFAULT_THRESHOLD,
  maxPull = DEFAULT_MAX_PULL,
  disabled = false,
  className,
  indicator,
}) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const currentYRef = useRef(0);
  const isAtTopRef = useRef(true);

  // Verificar si estamos en la parte superior del scroll
  const checkIfAtTop = useCallback(() => {
    if (!containerRef.current) return true;
    return containerRef.current.scrollTop <= 0;
  }, []);

  // Manejar inicio del touch
  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (disabled || isRefreshing) return;
      if (!checkIfAtTop()) return;

      isAtTopRef.current = true;
      startYRef.current = e.touches[0].clientY;
      currentYRef.current = startYRef.current;
      setIsPulling(true);
    },
    [disabled, isRefreshing, checkIfAtTop]
  );

  // Manejar movimiento del touch
  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (disabled || isRefreshing || !isPulling) return;
      if (!isAtTopRef.current) return;

      currentYRef.current = e.touches[0].clientY;
      const diff = currentYRef.current - startYRef.current;

      // Solo permitir pull hacia abajo
      if (diff <= 0) {
        setPullDistance(0);
        return;
      }

      // Aplicar resistencia
      const resisted = Math.pow(diff, PULL_RESISTANCE);
      const clamped = Math.min(resisted, maxPull);
      setPullDistance(clamped);

      // Prevenir scroll nativo si estamos pullando
      if (diff > 10) {
        e.preventDefault();
      }
    },
    [disabled, isRefreshing, isPulling, maxPull]
  );

  // Manejar fin del touch
  const handleTouchEnd = useCallback(async () => {
    if (disabled || isRefreshing) return;

    setIsPulling(false);

    if (pullDistance >= threshold) {
      // Iniciar refresh
      setIsRefreshing(true);
      setPullDistance(0);

      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    } else {
      setPullDistance(0);
    }
  }, [disabled, isRefreshing, pullDistance, threshold, onRefresh]);

  // Configurar event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart as any, { passive: true });
    container.addEventListener('touchmove', handleTouchMove as any, { passive: false });
    container.addEventListener('touchend', handleTouchEnd as any, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart as any);
      container.removeEventListener('touchmove', handleTouchMove as any);
      container.removeEventListener('touchend', handleTouchEnd as any);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  // Calcular opacidad para el indicador
  const indicatorOpacity = Math.min(pullDistance / threshold, 1);
  const indicatorScale = isRefreshing ? 1 : Math.min(pullDistance / threshold, 1);

  return (
    <div
      ref={containerRef}
      className={cn(
        'overflow-y-auto overscroll-contain',
        'touch-pan-y',
        disabled && 'overflow-hidden',
        className
      )}
      style={{
        transform: pullDistance > 0 ? `translateY(${pullDistance}px)` : undefined,
        transition: isRefreshing ? 'none' : 'transform 0.2s ease-out',
      }}
    >
      {/* Indicador de Pull */}
      <div
        className={cn(
          'absolute top-0 left-0 right-0 flex items-center justify-center',
          'pointer-events-none z-50'
        )}
        style={{
          height: `${pullDistance}px`,
          opacity: indicatorOpacity,
        }}
      >
        <motion.div
          animate={{
            rotate: isRefreshing ? 360 : 0,
          }}
          transition={{
            duration: isRefreshing ? 1 : 0,
            repeat: isRefreshing ? Infinity : 0,
            ease: 'linear',
          }}
          className={cn('flex flex-col items-center gap-1', isRefreshing && 'animate-pulse')}
        >
          {indicator || (
            <RefreshCw className={cn('w-5 h-5 text-primary', indicatorScale < 1 && 'opacity-50')} />
          )}
          {pullDistance > threshold / 2 && !isRefreshing && (
            <span className="text-[10px] text-primary font-medium">Soltar para actualizar</span>
          )}
        </motion.div>
      </div>

      {/* Contenido */}
      {children}

      {/* Spacer para el espacio del indicador */}
      {isRefreshing && (
        <div className="h-20 flex items-center justify-center">
          <RefreshCw className="w-6 h-6 text-primary animate-spin" />
        </div>
      )}
    </div>
  );
};

// =============================================================================
// HOOK PARA USAR EN CUALQUIER LUGAR
// =============================================================================

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
  disabled?: boolean;
}

export function usePullToRefresh({
  onRefresh,
  threshold = DEFAULT_THRESHOLD,
  disabled = false,
}: UsePullToRefreshOptions) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    if (disabled) return;

    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  }, [disabled, onRefresh]);

  return {
    isRefreshing,
    triggerRefresh: handleRefresh,
    PullToRefreshWrapper: ({
      children,
      className,
    }: {
      children: React.ReactNode;
      className?: string;
    }) => (
      <PullToRefresh
        onRefresh={handleRefresh}
        threshold={threshold}
        disabled={disabled}
        className={className}
      >
        {children}
      </PullToRefresh>
    ),
  };
}
