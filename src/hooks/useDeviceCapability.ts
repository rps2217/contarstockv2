/**
 * useDeviceCapability - Hook para detectar capacidad del dispositivo
 * 
 * Útil para lazy loading selectivo en móviles:
 * - Detecta si es móvil
 * - Detecta si tiene baja memoria
 * - Proporciona nivel de rendimiento
 */

import { useState, useEffect, useMemo } from 'react';

export type DeviceTier = 'high' | 'medium' | 'low';

interface DeviceCapability {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isLowEnd: boolean;
  deviceTier: DeviceTier;
  shouldLoadHeavyComponents: boolean;
  prefersSimpleUI: boolean;
  screenWidth: number;
  screenHeight: number;
  deviceMemory: number;
  cpuCores: number;
}

// Cache para evitar múltiples detecciones
let cachedCapability: DeviceCapability | null = null;

function detectDeviceCapability(): DeviceCapability {
  if (cachedCapability) return cachedCapability;

  const isMobile = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  ) || window.innerWidth < 768;

  const isTablet = /iPad|Android/i.test(navigator.userAgent) && window.innerWidth >= 768 && window.innerWidth < 1024;
  
  const isDesktop = !isMobile && !isTablet;

  // Detectar memoria y CPU
  const nav = navigator as Navigator & { deviceMemory?: number };
  const deviceMemory = nav.deviceMemory || (isMobile ? 2 : 4);
  const cpuCores = navigator.hardwareConcurrency || (isMobile ? 2 : 4);

  // Determinar tier
  let deviceTier: DeviceTier = 'high';
  if (isMobile) {
    if (deviceMemory <= 2 || cpuCores <= 2) {
      deviceTier = 'low';
    } else if (deviceMemory <= 3 || cpuCores <= 4) {
      deviceTier = 'medium';
    }
  } else if (isTablet) {
    if (deviceMemory <= 3) {
      deviceTier = 'medium';
    }
  }

  // ¿Debería cargar componentes pesados?
  const shouldLoadHeavyComponents = !isMobile || deviceTier === 'high' || deviceTier === 'medium';

  // ¿Prefiere UI simple?
  const prefersSimpleUI = isMobile && deviceTier !== 'high';

  cachedCapability = {
    isMobile,
    isTablet,
    isDesktop,
    isLowEnd: deviceTier === 'low',
    deviceTier,
    shouldLoadHeavyComponents,
    prefersSimpleUI,
    screenWidth: window.innerWidth,
    screenHeight: window.innerHeight,
    deviceMemory,
    cpuCores,
  };

  return cachedCapability;
}

export function useDeviceCapability(): DeviceCapability {
  const [capability, setCapability] = useState<DeviceCapability>(() => detectDeviceCapability());

  useEffect(() => {
    // Recalcular en resize (debounce)
    let timeout: NodeJS.Timeout;
    
    const handleResize = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        cachedCapability = null; // Invalidar cache
        setCapability(detectDeviceCapability());
      }, 250);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeout);
    };
  }, []);

  return capability;
}

/**
 * Hook simple para saber si debe usar UI simplificada
 */
export function useSimpleUI(): boolean {
  const { prefersSimpleUI, isMobile } = useDeviceCapability();
  return prefersSimpleUI || isMobile;
}

/**
 * Hook para determinar qué nivel de lazy loading usar
 */
export function useLazyLevel(): 'full' | 'medium' | 'minimal' {
  const { deviceTier, isMobile } = useDeviceCapability();
  
  if (!isMobile) return 'full';
  if (deviceTier === 'low') return 'minimal';
  if (deviceTier === 'medium') return 'medium';
  return 'full';
}

/**
 * Configuración de lazy loading por tier
 */
export const LAZY_CONFIG = {
  high: {
    loadChartsImmediately: true,
    loadAnimations: true,
    loadHeavyComponents: true,
    maxItemsInList: 100,
    debounceMs: 150,
  },
  medium: {
    loadChartsImmediately: false,
    loadAnimations: true,
    loadHeavyComponents: false,
    maxItemsInList: 50,
    debounceMs: 250,
  },
  low: {
    loadChartsImmediately: false,
    loadAnimations: false,
    loadHeavyComponents: false,
    maxItemsInList: 25,
    debounceMs: 500,
  },
  minimal: {
    loadChartsImmediately: false,
    loadAnimations: false,
    loadHeavyComponents: false,
    maxItemsInList: 10,
    debounceMs: 750,
  },
} as const;

export function useLazyConfig() {
  const tier = useDeviceCapability().deviceTier;
  return LAZY_CONFIG[tier];
}
