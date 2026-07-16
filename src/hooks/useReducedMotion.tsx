/**
 * useReducedMotion - Hook para optimizar animaciones en dispositivos lentos
 * 
 * Detecta:
 * 1. Preferencia del sistema (prefers-reduced-motion)
 * 2. Si es un dispositivo táctil móvil
 * 3. Capacidad de hardware (heurística básica)
 * 
 * Útil para deshabilitar o reducir animaciones pesadas en:
 * - Móviles de gama baja
 * - Dispositivos con batería baja
 * - Usuarios que prefieren animaciones reducidas
 */

import { useState, useEffect, useMemo } from 'react';

interface ReducedMotionConfig {
  shouldReduceMotion: boolean;
  isMobile: boolean;
  isTouchDevice: boolean;
  isLowEndDevice: boolean;
  animationDuration: number; // 0 = sin animaciones, normal = duración reducida
  transitionDuration: number;
}

export function useReducedMotion(): ReducedMotionConfig {
  const [config, setConfig] = useState<ReducedMotionConfig>({
    shouldReduceMotion: false,
    isMobile: false,
    isTouchDevice: false,
    isLowEndDevice: false,
    animationDuration: 1,
    transitionDuration: 150,
  });

  useEffect(() => {
    // Usar timeout para evitar setState sincrono en effect
    const timeoutId = setTimeout(() => {
      // 1. Detectar preferencia del sistema
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      
      // 2. Detectar dispositivo móvil
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      ) || window.innerWidth < 768;
      
      // 3. Detectar dispositivo táctil
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      
      // 4. Detectar dispositivo de gama baja (heurística)
      const isLowEndDevice = (() => {
        const nav = navigator as Navigator & { deviceMemory?: number };
        const deviceMemory = nav.deviceMemory || 4;
        const cpuCores = navigator.hardwareConcurrency || 4;
        return deviceMemory <= 2 || cpuCores <= 2 || (isMobile && deviceMemory <= 3 && cpuCores <= 4);
      })();

      // 5. Calcular duración de animaciones
      let animationDuration = 1;
      let transitionDuration = 150;
      
      if (prefersReducedMotion) {
        animationDuration = 0;
        transitionDuration = 0;
      } else if (isLowEndDevice) {
        animationDuration = 0.3;
        transitionDuration = 100;
      } else if (isMobile && !isLowEndDevice) {
        animationDuration = 0.5;
        transitionDuration = 150;
      }

      setConfig({
        shouldReduceMotion: prefersReducedMotion || isLowEndDevice,
        isMobile,
        isTouchDevice,
        isLowEndDevice,
        animationDuration,
        transitionDuration,
      });

      // Escuchar cambios en la preferencia del sistema
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      const handleChange = (e: MediaQueryListEvent) => {
        setConfig(prev => ({
          ...prev,
          shouldReduceMotion: e.matches || prev.isLowEndDevice,
          animationDuration: e.matches ? 0 : prev.animationDuration,
          transitionDuration: e.matches ? 0 : prev.transitionDuration,
        }));
      };

      mediaQuery.addEventListener('change', handleChange);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
    };
  }, []);

  return config;
}

/**
 * Hook para obtener velocidad de transición optimizada
 * Usa transiciones más rápidas en dispositivos lentos
 */
export function useOptimizedTransition() {
  const { transitionDuration, shouldReduceMotion } = useReducedMotion();
  
  return useMemo(() => ({
    duration: transitionDuration,
    shouldAnimate: !shouldReduceMotion && transitionDuration > 0,
    springConfig: shouldReduceMotion 
      ? { type: 'linear' as const }
      : { type: 'spring' as const, stiffness: 300, damping: 30 },
  }), [transitionDuration, shouldReduceMotion]);
}

/**
 * Componente HOC para aplicar estilos de movimiento reducido
 */
export function withReducedMotion<P extends object>(
  Component: React.ComponentType<P>,
  reducedMotionConfig: ReducedMotionConfig
) {
  return function ReducedMotionComponent(props: P) {
    return (
      <Component 
        {...props} 
        data-reduced-motion={reducedMotionConfig.shouldReduceMotion}
        style={{
          '--animation-duration': `${reducedMotionConfig.animationDuration}s`,
          '--transition-duration': `${reducedMotionConfig.transitionDuration}ms`,
        } as React.CSSProperties}
      />
    );
  };
}
