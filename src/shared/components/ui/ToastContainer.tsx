
import React from 'react';
import { useToastStore, ToastType } from '../../../store/useToastStore';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const icons: Record<ToastType, any> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

const colors: Record<ToastType, string> = {
  success: 'bg-emerald-500 border-emerald-400 text-white',
  error: 'bg-rose-600 border-rose-500 text-white',
  info: 'bg-blue-600 border-blue-500 text-white',
  warning: 'bg-amber-500 border-amber-400 text-black',
};

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 w-full max-w-[320px] pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => {
          const Icon = icons[toast.type];
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.95 }}
              className={`
                pointer-events-auto
                flex items-center gap-4 p-4 rounded-2xl border-2 shadow-2xl
                ${colors[toast.type]}
                font-mono
              `}
            >
              <div className="shrink-0">
                <Icon className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <p className="text-[11px] font-black uppercase tracking-tight leading-tight">
                  {toast.message}
                </p>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="shrink-0 opacity-50 hover:opacity-100 transition-opacity"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

// Forced GitHub sync
