import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Settings as SettingsIcon,
  User,
  Bell,
  Shield,
  Smartphone,
  Palette,
  Globe,
  ChevronRight,
  LogOut,
  RefreshCw,
  Printer,
  Sun,
  Moon,
  Contrast,
  Check,
  Zap,
  Navigation,
  Database,
  Cloud,
  Info,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSettingsStore } from '@/stores'
import { ThemeName } from '@/types'

// ============================================================================
// Componentes base
// ============================================================================
const SettingsGroup = ({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) => (
  <div className="mb-6">
    <h2 className="text-xs font-bold text-muted uppercase tracking-wider mb-3 px-1">
      {title}
    </h2>
    <div className="bg-surface border border-subtle rounded-2xl overflow-hidden divide-y divide-subtle">
      {children}
    </div>
  </div>
)

const SettingsItem = ({
  icon: Icon,
  label,
  description,
  rightElement,
  onClick,
}: {
  icon: React.ElementType
  label: string
  description?: string
  rightElement?: React.ReactNode
  onClick?: () => void
}) => (
  <div
    onClick={onClick}
    className={cn(
      'flex items-center justify-between p-4 transition-colors',
      onClick && 'cursor-pointer hover:bg-elevated',
    )}
  >
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl bg-elevated flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-secondary" />
      </div>
      <div>
        <p className="text-sm font-medium text-primary">{label}</p>
        {description && (
          <p className="text-xs text-muted mt-0.5">{description}</p>
        )}
      </div>
    </div>
    <div className="flex items-center gap-3">
      {rightElement}
      {onClick && <ChevronRight className="w-5 h-5 text-muted" />}
    </div>
  </div>
)

const Toggle = ({
  enabled,
  onToggle,
}: {
  enabled: boolean
  onToggle: () => void
}) => (
  <button
    onClick={(e) => { e.stopPropagation(); onToggle(); }}
    className={cn(
      'w-12 h-6 rounded-full relative transition-colors duration-300 focus:outline-none',
      enabled ? 'bg-blue-500' : 'bg-subtle',
    )}
  >
    <motion.div
      layout
      className="w-5 h-5 bg-white rounded-full absolute top-0.5 left-0.5 shadow-sm"
      animate={{ x: enabled ? 24 : 0 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
    />
  </button>
)

// ============================================================================
// Selector Visual de Tema (Día, Noche, Alto Contraste)
// ============================================================================
interface ThemeOption {
  id: ThemeName
  label: string
  bg: string
  accent: string
  text: string
  icon: React.ElementType
}

const ThemeVisualSelector = ({ 
  value, 
  onChange 
}: { 
  value: ThemeName
  onChange: (theme: ThemeName) => void 
}) => {
  const themes: ThemeOption[] = [
    { 
      id: 'light', 
      label: 'Día', 
      bg: 'bg-white', 
      accent: 'bg-amber-400', 
      text: 'text-slate-900',
      icon: Sun 
    },
    { 
      id: 'dark', 
      label: 'Noche', 
      bg: 'bg-[#0f1423]', 
      accent: 'bg-blue-500', 
      text: 'text-white',
      icon: Moon 
    },
    { 
      id: 'high-contrast', 
      label: 'Alto Contraste', 
      bg: 'bg-black', 
      accent: 'bg-yellow-400', 
      text: 'text-yellow-400',
      icon: Contrast 
    },
  ]

  return (
    <div className="grid grid-cols-3 gap-2">
      {themes.map((t) => {
        const isSelected = value === t.id
        const Icon = t.icon
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={cn(
              'relative p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition-all',
              isSelected 
                ? `${t.bg} border-blue-500 shadow-lg` 
                : `${t.bg} border-subtle opacity-70 hover:opacity-100`,
            )}
          >
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', t.accent)}>
              <Icon className="w-4 h-4 text-white" />
            </div>
            <span className={cn('text-[10px] font-medium', t.text)}>{t.label}</span>
            {isSelected && (
              <div className="absolute top-1 right-1">
                <Check className="w-3 h-3 text-blue-500" />
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}

// ============================================================================
// Componente Principal
// ============================================================================
export const RedesignSettingsPage: React.FC = () => {
  const { settings, updateSetting } = useSettingsStore()
  
  // Estados locales para toggles (usando propiedades reales del store)
  const [soundEnabled, setSoundEnabled] = useState(settings.soundEnabled ?? true)
  const [hapticsEnabled, setHapticsEnabled] = useState(settings.hapticsEnabled ?? true)
  const [ttsEnabled, setTtsEnabled] = useState(settings.ttsEnabled ?? false)
  const [batchTracking, setBatchTracking] = useState(settings.batchTrackingEnabled ?? false)
  const [lowEndMode, setLowEndMode] = useState(settings.lowEndMode ?? false)

  // Handler para cambiar tema
  const handleThemeChange = (themeId: ThemeName) => {
    if (navigator.vibrate) navigator.vibrate(10)
    updateSetting('theme', themeId)
  }

  // Handler para toggles con persistencia
  const handleToggle = (key: 'soundEnabled' | 'hapticsEnabled' | 'ttsEnabled' | 'batchTrackingEnabled' | 'lowEndMode', value: boolean, setter: (v: boolean) => void) => {
    updateSetting(key, value)
    setter(value)
  }

  return (
    <div className="h-full flex flex-col bg-base">
      {/* Header */}
      <div className="pt-8 px-4 sm:px-6 lg:px-8 shrink-0 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-primary tracking-tight flex items-center gap-3">
          <SettingsIcon className="w-8 h-8 text-blue-500" />
          Ajustes
        </h1>
        <p className="text-secondary text-sm mt-2">Configura tu experiencia en ContarStock</p>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:px-6 lg:px-8 pb-24 md:pb-8">
        <div className="max-w-2xl mx-auto">
          
          {/* Perfil Card */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-3xl p-6 flex items-center gap-5 mb-8 shadow-lg shadow-blue-900/20">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center border-2 border-white/30 backdrop-blur-sm">
              <User className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-white">{settings.pharmacyName || 'Usuario Admin'}</h2>
              <p className="text-blue-200 text-sm">ID: {settings.operatorId || 'Sin identificar'}</p>
            </div>
            <button className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors backdrop-blur-sm">
              Editar
            </button>
          </div>

          {/* ===== SECCIÓN: INTERFAZ ===== */}
          <SettingsGroup title="Interfaz">
            {/* Selector Visual de Tema */}
            <div className="p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <Palette className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-primary">Tema de la App</h3>
                  <p className="text-xs text-muted">Selecciona como se ve ContarStock</p>
                </div>
              </div>
              <ThemeVisualSelector 
                value={settings.theme || 'dark'} 
                onChange={handleThemeChange} 
              />
            </div>
            
            <SettingsItem
              icon={Zap}
              label="Efectos de sonido"
              description="Sonidos al escanear y alertas"
              rightElement={
                <Toggle
                  enabled={soundEnabled}
                  onToggle={() => handleToggle('soundEnabled', !soundEnabled, setSoundEnabled)}
                />
              }
            />
            <SettingsItem
              icon={Smartphone}
              label="Vibración háptica"
              description="Vibración en acciones principales"
              rightElement={
                <Toggle
                  enabled={hapticsEnabled}
                  onToggle={() => handleToggle('hapticsEnabled', !hapticsEnabled, setHapticsEnabled)}
                />
              }
            />
          </SettingsGroup>

          {/* ===== SECCIÓN: OPERATIVO ===== */}
          <SettingsGroup title="Operativo">
            <SettingsItem
              icon={Zap}
              label="Voz (TTS)"
              description="Anunciar productos al escanear"
              rightElement={
                <Toggle
                  enabled={ttsEnabled}
                  onToggle={() => handleToggle('ttsEnabled', !ttsEnabled, setTtsEnabled)}
                />
              }
            />
            <SettingsItem
              icon={Database}
              label="Seguimiento por lote"
              description="Registrar lotes y vencimientos"
              rightElement={
                <Toggle
                  enabled={batchTracking}
                  onToggle={() => handleToggle('batchTrackingEnabled', !batchTracking, setBatchTracking)}
                />
              }
            />
            <SettingsItem
              icon={Navigation}
              label="Modo bajo consumo"
              description="Optimizar para dispositivos lentos"
              rightElement={
                <Toggle
                  enabled={lowEndMode}
                  onToggle={() => handleToggle('lowEndMode', !lowEndMode, setLowEndMode)}
                />
              }
            />
          </SettingsGroup>

          {/* ===== SECCIÓN: NUBE Y SYNC ===== */}
          <SettingsGroup title="Nube y Sincronización">
            <SettingsItem
              icon={RefreshCw}
              label="Sincronización Automática"
              description="Subir cambios en segundo plano"
              rightElement={
                <Toggle
                  enabled={true}
                  onToggle={() => {}}
                />
              }
            />
            <SettingsItem
              icon={Cloud}
              label="Configuración de Nube"
              description="Supabase y credenciales"
              onClick={() => {}}
            />
          </SettingsGroup>

          {/* ===== SECCIÓN: NAVEGACIÓN ===== */}
          <SettingsGroup title="Navegación">
            <SettingsItem
              icon={Printer}
              label="Configuración de Impresora"
              description="Tickets, etiquetas y reportes"
              onClick={() => {}}
            />
          </SettingsGroup>

          {/* ===== SECCIÓN: SISTEMA ===== */}
          <SettingsGroup title="Sistema">
            <SettingsItem
              icon={Info}
              label="Acerca de"
              description="Versión y licencias"
              onClick={() => {}}
            />
            <SettingsItem
              icon={Shield}
              label="Privacidad y Seguridad"
              description="Contraseñas y permisos"
              onClick={() => {}}
            />
          </SettingsGroup>

          {/* Logout Button */}
          <button className="w-full bg-surface hover:bg-rose-500/10 border border-subtle hover:border-rose-500/30 text-rose-500 font-medium p-4 rounded-2xl flex items-center justify-center gap-2 transition-colors mt-8">
            <LogOut className="w-5 h-5" />
            Cerrar Sesión
          </button>

          {/* Footer */}
          <div className="text-center mt-8 mb-4">
            <p className="text-xs text-muted">ContarStock v2.0.0</p>
            <p className="text-xs text-muted mt-1">© 2024 LogiCount Pro</p>
          </div>
        </div>
      </div>
    </div>
  )
}
