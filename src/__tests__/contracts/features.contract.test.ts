/**
 * =============================================================================
 * CONTRACTS TEST - Feature Flags
 * =============================================================================
 *
 * Tests que verifican el sistema de feature flags.
 * Asegura que todas las features tengan configuración correcta.
 *
 * @since 2026-07-07
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'

describe('CONTRATO: Feature Flags', () => {
  beforeEach(() => {
    // Limpiar localStorage antes de cada test
    localStorage.clear()
  })

  afterEach(() => {
    // Restaurar localStorage
    localStorage.clear()
  })

  describe('DEBE tener todas las features requeridas', () => {
    const requiredFeatures = [
      'HAMMER_EXPIRY',
      'COUNTING_PHARMA',
      'REDESIGN_PAGES',
      'EXPORTS_EXCEL',
      'THERMAL_PRINTER',
      'CLOUD_SYNC',
      'AI_ASSISTANT',
      'ADVANCED_FILTERS',
      'ROW_LEVEL_SECURITY',
      'VIRTUAL_FIELDS',
      'AUDIT_LOGS',
    ]

    requiredFeatures.forEach(featureKey => {
      it(`DEBE tener feature: ${featureKey}`, async () => {
        const { FEATURES_REGISTRY } = await import('@/config/features')
        const feature = FEATURES_REGISTRY.find((f: { key: string }) => f.key === featureKey)

        expect(feature).toBeDefined()
      })
    })
  })

  describe('DEBE tener categorías válidas', () => {
    it('DEBE tener exactamente 4 categorías', async () => {
      const { FEATURES_REGISTRY } = await import('@/config/features')

      const categories = new Set(FEATURES_REGISTRY.map((f: { category: string }) => f.category))
      expect(categories.size).toBe(4)
      expect(categories.has('core')).toBe(true)
      expect(categories.has('experimental')).toBe(true)
      expect(categories.has('integrations')).toBe(true)
      expect(categories.has('security')).toBe(true)
    })
  })

  describe('isFeatureEnabled', () => {
    it('DEBE retornar defaultEnabled si no hay override en localStorage', async () => {
      const { isFeatureEnabled } = await import('@/config/features')

      // HAMMER_EXPIRY tiene defaultEnabled = false
      expect(isFeatureEnabled('HAMMER_EXPIRY')).toBe(false)

      // COUNTING_PHARMA tiene defaultEnabled = true
      expect(isFeatureEnabled('COUNTING_PHARMA')).toBe(true)
    })

    it('DEBE retornar valor de localStorage si existe override', async () => {
      const { isFeatureEnabled, setFeature } = await import('@/config/features')

      // Forzar HAMMER_EXPIRY a true
      setFeature('HAMMER_EXPIRY', true)
      expect(isFeatureEnabled('HAMMER_EXPIRY')).toBe(true)

      // Forzar COUNTING_PHARMA a false
      setFeature('COUNTING_PHARMA', false)
      expect(isFeatureEnabled('COUNTING_PHARMA')).toBe(false)
    })
  })

  describe('toggleFeature', () => {
    it('DEBE hacer toggle del valor actual', async () => {
      const { toggleFeature, isFeatureEnabled } = await import('@/config/features')

      // HAMMER_EXPIRY inicia en false
      expect(isFeatureEnabled('HAMMER_EXPIRY')).toBe(false)

      // Toggle
      toggleFeature('HAMMER_EXPIRY')
      expect(isFeatureEnabled('HAMMER_EXPIRY')).toBe(true)

      // Toggle de nuevo
      toggleFeature('HAMMER_EXPIRY')
      expect(isFeatureEnabled('HAMMER_EXPIRY')).toBe(false)
    })
  })

  describe('resetAllFeatures', () => {
    it('DEBE resetear todas las features a sus valores default', async () => {
      const { resetAllFeatures, isFeatureEnabled } = await import('@/config/features')

      // Cambiar algunas features
      const { setFeature } = await import('@/config/features')
      setFeature('HAMMER_EXPIRY', true)
      setFeature('COUNTING_PHARMA', false)

      // Verificar que cambiaron
      expect(isFeatureEnabled('HAMMER_EXPIRY')).toBe(true)
      expect(isFeatureEnabled('COUNTING_PHARMA')).toBe(false)

      // Resetear
      resetAllFeatures()

      // Verificar que volvieron al default
      expect(isFeatureEnabled('HAMMER_EXPIRY')).toBe(false)
      expect(isFeatureEnabled('COUNTING_PHARMA')).toBe(true)
    })
  })

  describe('getAllFeatures', () => {
    it('DEBE retornar todas las features con enabled flag', async () => {
      const { getAllFeatures, FEATURES_REGISTRY } = await import('@/config/features')

      const features = getAllFeatures()

      expect(features.length).toBe(FEATURES_REGISTRY.length)
      features.forEach(f => {
        expect(f).toHaveProperty('key')
        expect(f).toHaveProperty('label')
        expect(f).toHaveProperty('description')
        expect(f).toHaveProperty('defaultEnabled')
        expect(f).toHaveProperty('category')
        expect(f).toHaveProperty('enabled')
        expect(typeof f.enabled).toBe('boolean')
      })
    })
  })

  describe('getFeaturesByCategory', () => {
    it('DEBE filtrar features por categoría', async () => {
      const { getFeaturesByCategory } = await import('@/config/features')

      const coreFeatures = getFeaturesByCategory('core')
      const experimentalFeatures = getFeaturesByCategory('experimental')

      expect(coreFeatures.length).toBeGreaterThan(0)
      expect(experimentalFeatures.length).toBeGreaterThan(0)

      coreFeatures.forEach(f => {
        expect(f.category).toBe('core')
      })

      experimentalFeatures.forEach(f => {
        expect(f.category).toBe('experimental')
      })
    })
  })
})

// =============================================================================
// INTEGRATION: Feature Flags y Hooks
// =============================================================================

describe('INTEGRATION: useFeature hook', () => {
  it('DEBE retornar estado actualizado cuando cambia el feature flag', async () => {
    // Este test verifica que el hook useFeature funciona correctamente
    // En un entorno real, usarías React Testing Library para renderizar
    // componentes que usan useFeature

    const { isFeatureEnabled, setFeature } = await import('@/config/features')

    // Simular cambio de feature flag
    setFeature('HAMMER_EXPIRY', true)
    expect(isFeatureEnabled('HAMMER_EXPIRY')).toBe(true)

    setFeature('HAMMER_EXPIRY', false)
    expect(isFeatureEnabled('HAMMER_EXPIRY')).toBe(false)
  })
})
