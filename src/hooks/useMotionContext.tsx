/**
 * MotionContext - Context para controlar animaciones globalmente
 * 
 * Proporciona configuración de animaciones a toda la app
 * para evitar re-renders y optimizar rendimiento en móviles
 */

import React, { createContext, useContext, useMemo, ReactNode, useEffect, useState } from 'react';
import { useReducedMotion } from './useReducedMotion';

interface MotionContextValue {
  shouldReduceMotion: boolean;
  isMobile: boolean;
  isTouchDevice: boolean;
  isLowEndDevice: boolean;
  animationDuration: number;
  transitionDuration: number;
  // Configuraciones de framer-motion
  motionVariants: {
    page: { 
      initial: { opacity: number; scale: number; y: number };
      animate: { opacity: number; scale: number; y: number };
      exit: { opacity: number; scale: number; y: number };
    };
  };
  reducedMotionClass: string;
}

const MotionContext = createContext<MotionContextValue | null>(null);

export function MotionProvider({ children }: { children: ReactNode }) {
  const motionConfig = useReducedMotion();
  
  const value = useMemo<MotionContextValue>(() => ({
    ...motionConfig,
    // Variantes de motion optimizadas según la configuración
    motionVariants: {
      page: motionConfig.shouldReduceMotion 
        ? {
            // Sin animación - transiciones instantáneas
            initial: { opacity: 1, scale: 1, y: 0 },
            animate: { opacity: 1, scale: 1, y: 0 },
            exit: { opacity: 1, scale: 1, y: 0 },
          }
        : {
            // Animación completa para dispositivos de gama alta
            initial: { opacity: 0, scale: 0.98, y: 10 },
            animate: { opacity: 1, scale: 1, y: 0 },
            exit: { opacity: 0, scale: 1.02, y: -10 },
          },
    },
    reducedMotionClass: motionConfig.shouldReduceMotion ? 'motion-reduced' : '',
  }), [motionConfig.shouldReduceMotion, motionConfig.animationDuration, motionConfig.isMobile, motionConfig.isLowEndDevice]);

  return (
    <MotionContext.Provider value={value}>
      {children}
    </MotionContext.Provider>
  );
}

export function useMotionContext() {
  const context = useContext(MotionContext);
  if (!context) {
    // Retornar valores por defecto si no hay provider
    return {
      shouldReduceMotion: false,
      isMobile: false,
      isTouchDevice: false,
      isLowEndDevice: false,
      animationDuration: 1,
      transitionDuration: 150,
      motionVariants: {
        page: {
          initial: { opacity: 0, scale: 0.98, y: 10 },
          animate: { opacity: 1, scale: 1, y: 0 },
          exit: { opacity: 0, scale: 1.02, y: -10 },
        },
      },
      reducedMotionClass: '',
    };
  }
  return context;
}

// Hook simple para verificar si se deben reducir animaciones
export function useShouldReduceMotion() {
  const context = useMotionContext();
  return context.shouldReduceMotion;
}
