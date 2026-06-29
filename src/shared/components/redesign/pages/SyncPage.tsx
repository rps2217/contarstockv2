import React from 'react'
import {
  Cloud,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Database,
  Server,
  Wifi,
} from 'lucide-react'

export const RedesignSyncPage: React.FC = () => {
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
          <div className="bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 rounded-3xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative overflow-hidden">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl" />

            <div className="flex items-center gap-4 relative z-10">
              <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center shrink-0">
                <Wifi className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  Conectado a Supabase
                </h2>
                <p className="text-sm text-emerald-600/70 dark:text-emerald-500/70">
                  Última sincronización: hace 2 minutos
                </p>
              </div>
            </div>

            <button className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-white dark:text-slate-950 font-bold px-6 py-3 rounded-xl flex items-center justify-center gap-2 transition-colors relative z-10 shadow-lg shadow-emerald-500/20">
              <RefreshCw className="w-5 h-5" />
              Sincronizar Ahora
            </button>
          </div>

          {/* Pending Items Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-surface border border-subtle rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Database className="w-5 h-5 text-blue-500" />
                </div>
                <span className="text-2xl font-bold text-primary">0</span>
              </div>
              <p className="text-sm font-medium text-secondary">
                Registros locales
              </p>
              <p className="text-xs text-muted mt-1">Pendientes de subir</p>
            </div>

            <div className="bg-surface border border-subtle rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-amber-500/10 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-amber-500" />
                </div>
                <span className="text-2xl font-bold text-primary">3</span>
              </div>
              <p className="text-sm font-medium text-secondary">Conflictos</p>
              <p className="text-xs text-muted mt-1">Requieren revisión</p>
            </div>

            <div className="bg-surface border border-subtle rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Server className="w-5 h-5 text-purple-500" />
                </div>
                <span className="text-2xl font-bold text-primary">12</span>
              </div>
              <p className="text-sm font-medium text-secondary">
                Actualizaciones
              </p>
              <p className="text-xs text-muted mt-1">Listas para descargar</p>
            </div>
          </div>

          {/* Sync Log */}
          <div>
            <h3 className="text-lg font-semibold text-primary mb-4">
              Historial de Sincronización
            </h3>
            <div className="bg-surface border border-subtle rounded-2xl overflow-hidden">
              {[
                {
                  status: 'success',
                  action: 'Sincronización automática',
                  time: '10:42 AM',
                  details: 'Subidos 45 registros, descargados 12.',
                },
                {
                  status: 'success',
                  action: 'Sincronización manual',
                  time: '09:15 AM',
                  details: 'Subidos 128 registros, descargados 0.',
                },
                {
                  status: 'error',
                  action: 'Error de conexión',
                  time: 'Ayer, 18:30 PM',
                  details:
                    'Tiempo de espera agotado al conectar con el servidor.',
                },
              ].map((log, i) => (
                <div
                  key={i}
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
                      <span className="text-xs text-muted">• {log.time}</span>
                    </div>
                    <p className="text-sm text-secondary mt-1">{log.details}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
