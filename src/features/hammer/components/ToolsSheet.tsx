import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Settings, MapPin, FileSpreadsheet, Download, Printer,
  Play, Cloud, Zap, Volume2, VolumeX, RotateCcw, Calendar
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { ToolItem } from './ToolItem'

interface ToolsSheetProps {
  isOpen: boolean
  onClose: () => void
  location: string
  onChangeLocation: () => void
  onImport: () => void
  onSync: () => void
  onExport: () => void
  onPrint: () => void
  onReset: () => void
  onStartTestCounting: () => void
  isSyncing: boolean
  autoSyncEnabled: boolean
  onToggleAutoSync: () => void
  isVoiceEnabled: boolean
  onToggleVoice: () => void
  hasManifestItems: boolean
  registerExpiry: boolean
  onToggleRegisterExpiry: () => void
}

export const ToolsSheet: React.FC<ToolsSheetProps> = ({
  isOpen,
  onClose,
  location,
  onChangeLocation,
  onImport,
  onSync,
  onExport,
  onPrint,
  onReset,
  onStartTestCounting,
  isSyncing,
  autoSyncEnabled,
  onToggleAutoSync,
  isVoiceEnabled,
  onToggleVoice,
  hasManifestItems,
  registerExpiry,
  onToggleRegisterExpiry
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-base rounded-t-3xl border-t border-subtle p-6 max-h-[70vh] overflow-y-auto"
          >
            <div className="w-12 h-1 bg-subtle rounded-full mx-auto mb-6" />

            <h3 className="text-lg font-bold text-primary mb-6 flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Herramientas
            </h3>

            <div className="space-y-3">
              <ToolItem
                icon={MapPin}
                iconColor="text-blue-500"
                iconBg="bg-blue-500/10"
                title="Ubicacion"
                description={location}
                onClick={onChangeLocation}
                badge="Cambiar"
              />

              <ToolItem
                icon={FileSpreadsheet}
                iconColor="text-amber-500"
                iconBg="bg-amber-500/10"
                title="Importar Carga Teorica"
                description="Stock general, orden de nube o local"
                onClick={() => { onImport(); onClose(); }}
              />

              <ToolItem
                icon={Download}
                iconColor="text-emerald-500"
                iconBg="bg-emerald-500/10"
                title="Exportar a Excel"
                description="Descarga resumen en archivo .xlsx"
                onClick={() => { onExport(); onClose(); toast.success('Exportando...'); }}
              />

              <ToolItem
                icon={Printer}
                iconColor="text-purple-500"
                iconBg="bg-purple-500/10"
                title="Imprimir Ticket"
                description="Imprime ticket con TEORICO vs REAL"
                onClick={() => { onPrint(); onClose(); }}
              />

              {hasManifestItems && (
                <ToolItem
                  icon={Play}
                  iconColor="text-purple-500"
                  iconBg="bg-purple-500/10"
                  title="Iniciar Conteo de Prueba"
                  description="Crear sesion de conteo con items cargados"
                  onClick={() => { onStartTestCounting(); onClose(); }}
                />
              )}

              <ToolItem
                icon={Cloud}
                iconColor={isSyncing ? 'text-blue-500' : autoSyncEnabled ? 'text-emerald-500' : 'text-muted'}
                iconBg={autoSyncEnabled ? 'bg-emerald-500/10' : 'bg-subtle'}
                title={isSyncing ? 'Sincronizando...' : 'Sincronizar ahora'}
                description="Subir datos a la nube"
                onClick={() => { onSync(); onClose(); }}
              />

              <div className="flex items-center justify-between p-4 bg-surface rounded-xl">
                <div className="flex items-center gap-3">
                  <Zap className="w-5 h-5 text-amber-500" />
                  <div>
                    <p className="font-medium text-primary">Auto-Sync</p>
                    <p className="text-xs text-muted">Sincronizar en segundo plano</p>
                  </div>
                </div>
                <button
                  onClick={onToggleAutoSync}
                  className={cn(
                    'w-12 h-7 rounded-full transition-colors relative',
                    autoSyncEnabled ? 'bg-blue-500' : 'bg-subtle'
                  )}
                >
                  <div className={cn(
                    'w-5 h-5 rounded-full bg-white transition-transform absolute top-1',
                    autoSyncEnabled ? 'translate-x-6' : 'translate-x-1'
                  )} />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-surface rounded-xl">
                <div className="flex items-center gap-3">
                  {isVoiceEnabled ? <Volume2 className="w-5 h-5 text-blue-500" /> : <VolumeX className="w-5 h-5 text-muted" />}
                  <div>
                    <p className="font-medium text-primary">Voz</p>
                    <p className="text-xs text-muted">Confirmacion por voz</p>
                  </div>
                </div>
                <button
                  onClick={onToggleVoice}
                  className={cn(
                    'w-12 h-7 rounded-full transition-colors relative',
                    isVoiceEnabled ? 'bg-blue-500' : 'bg-subtle'
                  )}
                >
                  <div className={cn(
                    'w-5 h-5 rounded-full bg-white transition-transform absolute top-1',
                    isVoiceEnabled ? 'translate-x-6' : 'translate-x-1'
                  )} />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-surface rounded-xl">
                <div className="flex items-center gap-3">
                  <Calendar className={cn('w-5 h-5', registerExpiry ? 'text-amber-500' : 'text-muted')} />
                  <div>
                    <p className="font-medium text-primary">Registrar Vencimiento</p>
                    <p className="text-xs text-muted">Solicitar fecha de caducidad</p>
                  </div>
                </div>
                <button
                  onClick={onToggleRegisterExpiry}
                  className={cn(
                    'w-12 h-7 rounded-full transition-colors relative',
                    registerExpiry ? 'bg-amber-500' : 'bg-subtle'
                  )}
                >
                  <div className={cn(
                    'w-5 h-5 rounded-full bg-white transition-transform absolute top-1',
                    registerExpiry ? 'translate-x-6' : 'translate-x-1'
                  )} />
                </button>
              </div>

              <ToolItem
                icon={RotateCcw}
                iconColor="text-rose-500"
                iconBg="bg-rose-500/20"
                title="Reiniciar Sesion"
                description="Eliminar todos los escaneos"
                onClick={() => {
                  if (confirm('Eliminar todos los escaneos de esta sesion?')) {
                    onReset()
                    onClose()
                  }
                }}
                variant="danger"
              />
            </div>

            <button
              onClick={onClose}
              className="w-full mt-6 py-3 bg-surface rounded-xl text-muted font-medium"
            >
              Cerrar
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
