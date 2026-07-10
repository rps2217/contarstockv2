/**
 * =============================================================================
 * Feature Flags Panel
 * =============================================================================
 *
 * Panel de administracion para togglear features.
 * Ubicado en Settings > Experimental
 *
 * USO:
 *   <FeatureFlagsPanel />
 *
 * @since 2026-07-07
 */

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Settings, Zap, Shield, Puzzle, FlaskConical,
  Eye, EyeOff, RotateCcw, Check, X, ChevronRight,
  Package, Cpu, Database, Lock
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  useFeatureFlags,
  FeatureKey,
  FeatureFlag
} from '@/config/features'

// ============================================================================
// ICONOS POR CATEGORIA
// ============================================================================

const CATEGORY_ICONS = {
  core: Package,
  experimental: FlaskConical,
  integrations: Puzzle,
  security: Lock,
}

const CATEGORY_COLORS = {
  core: {
    icon: 'text-blue-500',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    badge: 'bg-blue-500/20 text-blue-400',
  },
  experimental: {
    icon: 'text-amber-500',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    badge: 'bg-amber-500/20 text-amber-400',
  },
  integrations: {
    icon: 'text-purple-500',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    badge: 'bg-purple-500/20 text-purple-400',
  },
  security: {
    icon: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    badge: 'bg-emerald-500/20 text-emerald-400',
  },
}

// ============================================================================
// COMPONENTE: FEATURE TOGGLE
// ============================================================================

const FeatureToggle: React.FC<{
  feature: FeatureFlag & { enabled: boolean }
  onToggle: (key: FeatureKey) => void
}> = ({ feature, onToggle }) => {
  const [isChanging, setIsChanging] = useState(false)
  const colors = CATEGORY_COLORS[feature.category]
  const Icon = CATEGORY_ICONS[feature.category]

  const handleToggle = async () => {
    setIsChanging(true)
    try {
      onToggle(feature.key)
      toast.success(
        feature.enabled ? `${feature.label} deshabilitado` : `${feature.label} habilitado`,
        { duration: 2000 }
      )
    } catch (error) {
      toast.error('Error al cambiar feature')
    } finally {
      setTimeout(() => setIsChanging(false), 300)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex items-center justify-between p-4 rounded-xl border transition-all',
        feature.enabled ? colors.bg : 'bg-surface',
        feature.enabled ? colors.border : 'border-subtle',
        isChanging && 'scale-[0.98]'
      )}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', colors.bg)}>
          <Icon className={cn('w-5 h-5', colors.icon)} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-primary truncate">{feature.label}</p>
            {feature.enabled && (
              <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded', colors.badge)}>
                ACTIVO
              </span>
            )}
          </div>
          <p className="text-xs text-muted truncate mt-0.5">{feature.description}</p>
        </div>
      </div>

      <button
        onClick={handleToggle}
        disabled={isChanging}
        className={cn(
          'w-14 h-8 rounded-full transition-all relative shrink-0 ml-4',
          feature.enabled ? 'bg-emerald-500' : 'bg-subtle',
          isChanging && 'opacity-70'
        )}
      >
        <motion.div
          animate={{ x: feature.enabled ? 28 : 4 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="w-6 h-6 rounded-full bg-white shadow-md absolute top-1"
        />
      </button>
    </motion.div>
  )
}

// ============================================================================
// COMPONENTE: CATEGORY SECTION
// ============================================================================

const CategorySection: React.FC<{
  category: 'core' | 'experimental' | 'integrations' | 'security'
  features: Array<FeatureFlag & { enabled: boolean }>
  onToggle: (key: FeatureKey) => void
  defaultOpen?: boolean
}> = ({ category, features, onToggle, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const colors = CATEGORY_COLORS[category]
  const Icon = CATEGORY_ICONS[category]
  const enabledCount = features.filter(f => f.enabled).length

  const categoryLabels = {
    core: 'Core',
    experimental: 'Experimental',
    integrations: 'Integraciones',
    security: 'Seguridad',
  }

  return (
    <div className="space-y-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full flex items-center justify-between p-3 rounded-xl border transition-all',
          colors.bg, colors.border
        )}
      >
        <div className="flex items-center gap-2">
          <Icon className={cn('w-4 h-4', colors.icon)} />
          <span className="text-sm font-medium text-primary">{categoryLabels[category]}</span>
          <span className={cn('text-xs px-2 py-0.5 rounded-full', colors.badge)}>
            {enabledCount}/{features.length}
          </span>
        </div>
        <ChevronRight className={cn('w-4 h-4 text-muted transition-transform', isOpen && 'rotate-90')} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-2 pl-2">
              {features.map(feature => (
                <FeatureToggle
                  key={feature.key}
                  feature={feature}
                  onToggle={onToggle}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export const FeatureFlagsPanel: React.FC = () => {
  const { features, toggle, reset, categories } = useFeatureFlags()
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  const handleReset = () => {
    reset()
    toast.success('Features reseteadas a valores default', { duration: 2000 })
    setShowResetConfirm(false)
  }

  const enabledTotal = features.filter(f => f.enabled).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <FlaskConical className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-primary flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Feature Flags
            </h3>
            <p className="text-xs text-muted">
              {enabledTotal} de {features.length} features activas
            </p>
          </div>
        </div>

        {/* Reset Button */}
        {showResetConfirm ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowResetConfirm(false)}
              className="px-3 py-1.5 text-xs bg-surface border border-subtle rounded-lg hover:bg-elevated transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleReset}
              className="px-3 py-1.5 text-xs bg-rose-500 text-white rounded-lg hover:bg-rose-400 transition-colors flex items-center gap-1"
            >
              <Check className="w-3 h-3" />
              Confirmar
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowResetConfirm(true)}
            className="px-3 py-1.5 text-xs bg-surface border border-subtle rounded-lg hover:bg-elevated transition-colors flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            Resetear
          </button>
        )}
      </div>

      {/* Warning Banner */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3">
        <Eye className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-amber-500">Modo Experimental</p>
          <p className="text-xs text-muted mt-1">
            Los cambios en features pueden afectar el comportamiento de la aplicacion.
            Usa el boton "Resetear" para volver a la configuracion default.
          </p>
        </div>
      </div>

      {/* Categories */}
      <div className="space-y-4">
        <CategorySection
          category="core"
          features={categories.core}
          onToggle={toggle}
          defaultOpen={true}
        />
        <CategorySection
          category="experimental"
          features={categories.experimental}
          onToggle={toggle}
          defaultOpen={false}
        />
        <CategorySection
          category="integrations"
          features={categories.integrations}
          onToggle={toggle}
          defaultOpen={false}
        />
        <CategorySection
          category="security"
          features={categories.security}
          onToggle={toggle}
          defaultOpen={false}
        />
      </div>

      {/* Footer Info */}
      <div className="text-center text-xs text-muted pt-4 border-t border-subtle">
        <p>Los cambios se guardan automaticamente en localStorage</p>
        <p className="mt-1">Referencia: <code className="bg-elevated px-1 rounded">feat_*</code></p>
      </div>
    </div>
  )
}
