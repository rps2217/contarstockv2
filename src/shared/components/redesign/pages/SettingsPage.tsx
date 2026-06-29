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
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from '../ThemeContext'

const SettingsGroup = ({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) => (
  <div className="mb-8">
    <h2 className="text-xs font-bold text-muted uppercase tracking-wider mb-3 px-2">
      {title}
    </h2>
    <div className="bg-surface border border-subtle rounded-2xl overflow-hidden">
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
      'flex items-center justify-between p-4 border-b border-subtle last:border-0 transition-colors',
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
    onClick={onToggle}
    className={cn(
      'w-12 h-6 rounded-full relative transition-colors duration-300 focus:outline-none',
      enabled ? 'bg-blue-500' : 'bg-subtle',
    )}
  >
    <motion.div
      layout
      className="w-5 h-5 bg-white rounded-full absolute top-0.5 left-0.5 shadow-sm"
      animate={{
        x: enabled ? 24 : 0,
      }}
      transition={{
        type: 'spring',
        stiffness: 500,
        damping: 30,
      }}
    />
  </button>
)

const ThemeSelector = () => {
  const { theme, setTheme } = useTheme()
  return (
    <div className="flex bg-elevated p-1 rounded-xl border border-subtle">
      {(['light', 'gray', 'dark'] as const).map((t) => (
        <button
          key={t}
          onClick={() => setTheme(t)}
          className={cn(
            'px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize',
            theme === t
              ? 'bg-surface text-primary shadow-sm border border-subtle'
              : 'text-muted hover:text-secondary',
          )}
        >
          {t === 'light' ? 'Claro' : t === 'gray' ? 'Gris' : 'Oscuro'}
        </button>
      ))}
    </div>
  )
}

export const RedesignSettingsPage: React.FC = () => {
  const [notifications, setNotifications] = useState(true)
  const [autoSync, setAutoSync] = useState(true)

  return (
    <div className="h-full flex flex-col bg-base">
      {/* Header */}
      <div className="pt-8 px-4 sm:px-6 lg:px-8 shrink-0 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-primary tracking-tight flex items-center gap-3">
          <SettingsIcon className="w-8 h-8 text-blue-500" />
          Ajustes
        </h1>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:px-6 lg:px-8 pb-24 md:pb-8">
        <div className="max-w-2xl mx-auto">
          {/* Profile Card */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-3xl p-6 flex items-center gap-5 mb-8 shadow-lg shadow-blue-900/20">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center border-2 border-white/30 backdrop-blur-sm">
              <User className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-white">Usuario Admin</h2>
              <p className="text-blue-200 text-sm">Administrador de Almacén</p>
            </div>
            <button className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors backdrop-blur-sm">
              Editar
            </button>
          </div>

          <SettingsGroup title="Preferencias">
            <SettingsItem
              icon={Palette}
              label="Tema de la interfaz"
              description="Elige el aspecto visual"
              rightElement={<ThemeSelector />}
            />
            <SettingsItem
              icon={Globe}
              label="Idioma"
              description="Español (Latinoamérica)"
              onClick={() => {}}
            />
            <SettingsItem
              icon={Bell}
              label="Notificaciones"
              description="Alertas de stock y vencimientos"
              rightElement={
                <Toggle
                  enabled={notifications}
                  onToggle={() => setNotifications(!notifications)}
                />
              }
            />
          </SettingsGroup>

          <SettingsGroup title="Sistema y Nube">
            <SettingsItem
              icon={RefreshCw}
              label="Sincronización Automática"
              description="Subir cambios en segundo plano"
              rightElement={
                <Toggle
                  enabled={autoSync}
                  onToggle={() => setAutoSync(!autoSync)}
                />
              }
            />
            <SettingsItem
              icon={Smartphone}
              label="Dispositivos Conectados"
              description="Gestionar escáneres y terminales"
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

          <div className="text-center mt-8 mb-4">
            <p className="text-xs text-muted">ContarStock v2.0.0</p>
            <p className="text-xs text-muted mt-1">© 2024 LogiCount Pro</p>
          </div>
        </div>
      </div>
    </div>
  )
}
