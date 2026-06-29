import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { useToastStore, type ToastType } from '@/store/useToastStore'
import { cn } from '@/lib/utils'

const toastConfig: Record<ToastType, {
  icon: React.ElementType
  bg: string
  border: string
  iconColor: string
}> = {
  success: { icon: CheckCircle2, bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', iconColor: 'text-emerald-500' },
  error: { icon: AlertCircle, bg: 'bg-rose-500/10', border: 'border-rose-500/30', iconColor: 'text-rose-500' },
  info: { icon: Info, bg: 'bg-blue-500/10', border: 'border-blue-500/30', iconColor: 'text-blue-500' },
  warning: { icon: AlertTriangle, bg: 'bg-amber-500/10', border: 'border-amber-500/30', iconColor: 'text-amber-500' },
}

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToastStore()

  return (
    <div className="fixed bottom-24 md:bottom-8 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => {
          const config = toastConfig[toast.type]
          const Icon = config.icon
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className={cn(
                'pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border backdrop-blur-xl shadow-xl',
                config.bg, config.border
              )}
            >
              <Icon className={cn('w-5 h-5 shrink-0 mt-0.5', config.iconColor)} />
              <p className="text-sm text-primary flex-1">{toast.message}</p>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-muted hover:text-primary transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
