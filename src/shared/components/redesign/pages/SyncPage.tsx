import React from 'react'
import {
  Cloud,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Database,
  Server,
  Wifi,
  WifiOff,
  Loader2,
} from 'lucide-react'
import { useSyncStore } from '@/stores'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import { formatTimeAgo } from '@/lib/date'
import { cn } from '@/lib/utils'

export const RedesignSyncPage: React.FC = () => {
  const { 
    isSupabaseConnected, 
    pendingItems, 
    lastSyncTime, 
    isSyncing,
    conflicts
  } = useSyncStore()

  // Obtener logs de sync desde IndexedDB
  const syncLogs = useLiveQuery(async () => {
    try {
      const logs = await db.sync_logs.orderBy('createdAt').reverse().limit(20).toArray()
      return logs.map((log: any) => ({
        id: log.id,
        status: log.status || 'success',
        action: log.action || 'Sincronización',
        time: log.createdAt || Date.now(),
        details: log.details || '',
        error: log.error
      }))
    } catch {
      return []
    }
  }, [])

  // Conteo de registros pendientes
  const pendingCount = useLiveQuery(async () => {
    try {
      return await db.syncQueue.count()
    } catch {
      return 0
    }
  }, [], 0)

  // Último timestamp de sincronización
  const lastSyncDisplay = lastSyncTime ? formatTimeAgo(lastSyncTime) : 'Nunca'

  const handleSync = () => {
    // Por ahora no hacemos nada - se puede agregar triggerSync después
  }

  const getStatusBanner = () => {
    if (isSyncing) {
      return {
        bg: 'from-blue-500/10 to-blue-500/5',
        border: 'border-blue-500/20',
        icon: Wifi,
        iconBg: 'bg-blue-500/20',
        iconColor: 'text-blue-500',
        title: 'Sincronizando...',
        subtitle: 'Por favor espera',
        buttonBg: 'bg-blue-500/50',
        buttonText: 'text-white'
      }
    }
    if (isSupabaseConnected) {
      return {
        bg: 'from-emerald-500/10 to-emerald-500/5',
        border: 'border-emerald-500/20',
        icon: Wifi,
        iconBg: 'bg-emerald-500/20',
        iconColor: 'text-emerald-500',
        title: 'Conectado a Supabase',
        subtitle: `Última sincronización: ${lastSyncDisplay}`,
        buttonBg: 'bg-emerald-500 hover:bg-emerald-400',
        buttonText: 'text-white dark:text-slate-950'
      }
    }
    return {
      bg: 'from-rose-500/10 to-rose-500/5',
      border: 'border-rose-500/20',
      icon: WifiOff,
      iconBg: 'bg-rose-500/20',
      iconColor: 'text-rose-500',
      title: 'Sin conexión',
      subtitle: 'Verifica tu conexión a internet',
      buttonBg: 'bg-rose-500 hover:bg-rose-400',
      buttonText: 'text-white'
    }
  }

  const status = getStatusBanner()
  const StatusIcon = status.icon

  return (
    <div className="h-full flex flex-col bg-base">
      {/* Header */}
      <div className="pt-8 px-4 sm:px-6 lg:px-8 shrink-0 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-primary tracking-tight flex items-center gap-3">
          <Cloud className="w-8 h-8 text-blue-500" />
          Sincronización
        </h1>
        <p className="text-secondary text-sm mt-2">
          Gestiona la conexión con la base de datos en la nube.
        </p>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:px-6 lg:px-8 pb-24 md:pb-8">
        <div className="max-w-3xl mx-auto flex flex-col gap-6">
          {/* Status Banner */}
          <div className={cn(
            'bg-gradient-to-r border rounded-3xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative overflow-hidden',
            status.bg,
            status.border
          )}>
            <div className={cn('absolute -right-10 -top-10 w-40 h-40 rounded-full blur-3xl', status.iconBg)} />

            <div className="flex items-center gap-4 relative z-10">
              <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center shrink-0', status.iconBg)}>
                <StatusIcon className={cn('w-6 h-6', status.iconColor)} />
              </div>
              <div>
                <h2 className={cn('text-lg font-bold', status.iconColor.replace('text-', 'text-'))}>
                  {status.title}
                </h2>
                <p className="text-sm text-secondary">
                  {status.subtitle}
                </p>
              </div>
            </div>

            <button 
              onClick={handleSync}
              disabled={isSyncing}
              className={cn(
                'w-full sm:w-auto font-bold px-6 py-3 rounded-xl flex items-center justify-center gap-2 transition-colors relative z-10 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed',
                status.buttonBg,
                status.buttonText
              )}
            >
              {isSyncing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <RefreshCw className="w-5 h-5" />
              )}
              {isSyncing ? 'Sincronizando...' : 'Sincronizar Ahora'}
            </button>
          </div>

          {/* Pending Items Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-surface border border-subtle rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Database className="w-5 h-5 text-blue-500" />
                </div>
                <span className="text-2xl font-bold text-primary">{pendingItems}</span>
              </div>
              <p className="text-sm font-medium text-secondary">
                Registros pendientes
              </p>
              <p className="text-xs text-muted mt-1">Pendientes de subir</p>
            </div>

            <div className="bg-surface border border-subtle rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-amber-500/10 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-amber-500" />
                </div>
                <span className="text-2xl font-bold text-primary">{pendingCount}</span>
              </div>
              <p className="text-sm font-medium text-secondary">Cola de sync</p>
              <p className="text-xs text-muted mt-1">En espera de procesar</p>
            </div>

            <div className="bg-surface border border-subtle rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Server className="w-5 h-5 text-purple-500" />
                </div>
                <span className="text-2xl font-bold text-primary">
                  {isSupabaseConnected ? 'Online' : 'Offline'}
                </span>
              </div>
              <p className="text-sm font-medium text-secondary">
                Estado de conexión
              </p>
              <p className="text-xs text-muted mt-1">Supabase</p>
            </div>
          </div>

          {/* Sync Log */}
          <div>
            <h3 className="text-lg font-semibold text-primary mb-4">
              Historial de Sincronización
            </h3>
            <div className="bg-surface border border-subtle rounded-2xl overflow-hidden">
              {(!syncLogs || syncLogs.length === 0) ? (
                <div className="p-8 text-center text-muted text-sm">
                  No hay historial de sincronización
                </div>
              ) : (
                syncLogs.map((log: any) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-4 p-4 border-b border-subtle last:border-0"
                  >
                    <div className="mt-1">
                      {log.status === 'success' ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-rose-500" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-primary">
                          {log.action}
                        </p>
                        <span className="text-xs text-muted">• {formatTimeAgo(log.time)}</span>
                      </div>
                      <p className="text-sm text-secondary mt-1">
                        {log.details || (log.error ? `Error: ${log.error}` : 'Completado')}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
