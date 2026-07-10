/**
 * =============================================================================
 * Feature Flags - Sistema de toggles para features
 * =============================================================================
 *
 * Permite activar/desactivar features sin redeploy.
 * Los cambios persisten en localStorage del navegador.
 *
 * USO:
 *   import { isFeatureEnabled, toggleFeature } from '@/config/features'
 *
 *   if (isFeatureEnabled('HAMMER_EXPIRY')) {
 *     // Mostrar feature
 *   }
 *
 * @since 2026-07-07
 */

// ============================================================================
// TIPOS
// ============================================================================

export type FeatureKey =
  | 'HAMMER_EXPIRY'          // Registro de vencimiento en modo Hammer
  | 'COUNTING_PHARMA'        // Modal de vencimiento en modo Counting
  | 'REDESIGN_PAGES'         // Páginas redesignadas
  | 'EXPORTS_EXCEL'          // Exportación a Excel
  | 'THERMAL_PRINTER'        // Impresión térmica
  | 'CLOUD_SYNC'             // Sincronización con la nube
  | 'AI_ASSISTANT'           // Asistente AI
  | 'ADVANCED_FILTERS'       // Filtros avanzados
  | 'ROW_LEVEL_SECURITY'     // Seguridad a nivel de fila
  | 'VIRTUAL_FIELDS'         // Campos virtuales
  | 'AUDIT_LOGS'             // Logs de auditoría

export interface FeatureFlag {
  key: FeatureKey
  label: string
  description: string
  defaultEnabled: boolean
  category: 'core' | 'experimental' | 'integrations' | 'security'
}

// ============================================================================
// REGISTRO DE FEATURES
// ============================================================================

const FEATURES_REGISTRY: FeatureFlag[] = [
  {
    key: 'HAMMER_EXPIRY',
    label: 'Registro de Vencimiento en Hammer',
    description: 'Permite registrar fechas de vencimiento al escanear en modo Hammer',
    defaultEnabled: false,
    category: 'core'
  },
  {
    key: 'COUNTING_PHARMA',
    label: 'Vencimiento en Modo Conteo',
    description: 'Solicita fecha de vencimiento al contar productos',
    defaultEnabled: true,
    category: 'core'
  },
  {
    key: 'REDESIGN_PAGES',
    label: 'Paginas Redesignadas',
    description: 'Usa la nueva interfaz rediseñada',
    defaultEnabled: true,
    category: 'core'
  },
  {
    key: 'EXPORTS_EXCEL',
    label: 'Exportacion a Excel',
    description: 'Permite exportar datos a archivos Excel',
    defaultEnabled: true,
    category: 'integrations'
  },
  {
    key: 'THERMAL_PRINTER',
    label: 'Impresion Termica',
    description: 'Soporte para impresoras termicas',
    defaultEnabled: true,
    category: 'integrations'
  },
  {
    key: 'CLOUD_SYNC',
    label: 'Sincronizacion en la Nube',
    description: 'Sincroniza datos con el servidor remoto',
    defaultEnabled: true,
    category: 'integrations'
  },
  {
    key: 'AI_ASSISTANT',
    label: 'Asistente AI',
    description: 'Sugerencias inteligentes durante el conteo',
    defaultEnabled: false,
    category: 'experimental'
  },
  {
    key: 'ADVANCED_FILTERS',
    label: 'Filtros Avanzados',
    description: 'Filtros por proveedor, ubicacion, etc.',
    defaultEnabled: true,
    category: 'core'
  },
  {
    key: 'ROW_LEVEL_SECURITY',
    label: 'Seguridad a Nivel de Fila',
    description: 'Filtra datos por almacen/ubicacion segun rol',
    defaultEnabled: false,
    category: 'security'
  },
  {
    key: 'VIRTUAL_FIELDS',
    label: 'Campos Virtuales',
    description: 'Campos calculados en tiempo real',
    defaultEnabled: false,
    category: 'experimental'
  },
  {
    key: 'AUDIT_LOGS',
    label: 'Logs de Auditoria',
    description: 'Registra todas las acciones del usuario',
    defaultEnabled: true,
    category: 'security'
  },
]

// ============================================================================
// STORAGE KEYS
// ============================================================================

const STORAGE_PREFIX = 'feat_'
const getStorageKey = (key: FeatureKey) => `${STORAGE_PREFIX}${key}`

// ============================================================================
// FUNCIONES DE LECTURA
// ============================================================================

/**
 * Verifica si una feature esta habilitada
 */
export function isFeatureEnabled(key: FeatureKey): boolean {
  const stored = localStorage.getItem(getStorageKey(key))
  if (stored !== null) {
    return stored === 'true'
  }

  const feature = FEATURES_REGISTRY.find(f => f.key === key)
  return feature?.defaultEnabled ?? false
}

/**
 * Obtiene todas las features con su estado actual
 */
export function getAllFeatures(): Array<FeatureFlag & { enabled: boolean }> {
  return FEATURES_REGISTRY.map(feature => ({
    ...feature,
    enabled: isFeatureEnabled(feature.key)
  }))
}

/**
 * Obtiene features por categoria
 */
export function getFeaturesByCategory(category: FeatureFlag['category']) {
  return getAllFeatures().filter(f => f.category === category)
}

/**
 * Obtiene una feature especifica
 */
export function getFeature(key: FeatureKey): (FeatureFlag & { enabled: boolean }) | undefined {
  return getAllFeatures().find(f => f.key === key)
}

// ============================================================================
// FUNCIONES DE ESCRITURA
// ============================================================================

/**
 * Toggle una feature on/off
 */
export function toggleFeature(key: FeatureKey): boolean {
  const current = isFeatureEnabled(key)
  const newValue = !current
  localStorage.setItem(getStorageKey(key), String(newValue))
  return newValue
}

/**
 * Establece el estado de una feature
 */
export function setFeature(key: FeatureKey, enabled: boolean): void {
  localStorage.setItem(getStorageKey(key), String(enabled))
}

/**
 * Resetea todas las features a sus valores default
 */
export function resetAllFeatures(): void {
  FEATURES_REGISTRY.forEach(feature => {
    localStorage.removeItem(getStorageKey(feature.key))
  })
}

/**
 * Habilita una feature
 */
export function enableFeature(key: FeatureKey): void {
  setFeature(key, true)
}

/**
 * Deshabilita una feature
 */
export function disableFeature(key: FeatureKey): void {
  setFeature(key, false)
}

// ============================================================================
// HOOKS PARA REACT
// ============================================================================

import { useState, useEffect, useCallback } from 'react'

/**
 * Hook para usar una feature en un componente React
 */
export function useFeature(key: FeatureKey): boolean {
  const [enabled, setEnabled] = useState(() => isFeatureEnabled(key))

  useEffect(() => {
    const interval = setInterval(() => {
      const current = isFeatureEnabled(key)
      setEnabled(prev => {
        if (prev !== current) return current
        return prev
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [key])

  const toggle = useCallback(() => {
    const newValue = toggleFeature(key)
    setEnabled(newValue)
  }, [key])

  return enabled
}

/**
 * Hook para el panel de configuracion de features
 */
export function useFeatureFlags() {
  const [features, setFeatures] = useState<Array<FeatureFlag & { enabled: boolean }>>([])

  useEffect(() => {
    setFeatures(getAllFeatures())
  }, [])

  const toggle = useCallback((key: FeatureKey) => {
    toggleFeature(key)
    setFeatures(getAllFeatures())
  }, [])

  const reset = useCallback(() => {
    resetAllFeatures()
    setFeatures(getAllFeatures())
  }, [])

  return {
    features,
    toggle,
    reset,
    categories: {
      core: features.filter(f => f.category === 'core'),
      experimental: features.filter(f => f.category === 'experimental'),
      integrations: features.filter(f => f.category === 'integrations'),
      security: features.filter(f => f.category === 'security'),
    }
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export { FEATURES_REGISTRY }
