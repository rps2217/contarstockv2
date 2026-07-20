import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckSquare, X, LucideIcon } from 'lucide-react';

export interface BulkAction {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'info' | 'ghost';
}

interface ManagementBulkActionsProps {
  selectedCount: number;
  onClearSelection: () => void;
  actions: BulkAction[];
  theme?: 'dark' | 'light' | 'gray' | 'high-contrast' | 'appsheet-dark' | 'night';
  title?: string;
}

export const ManagementBulkActions: React.FC<ManagementBulkActionsProps> = ({
  selectedCount,
  onClearSelection,
  actions,
  theme = 'dark',
  title = 'Acciones',
}) => {
  const variantClasses = {
    primary: {
      dark: 'bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-500 border-indigo-500/20',
      light: 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200 shadow-sm',
      icon: 'text-indigo-500',
    },
    secondary: {
      dark: 'bg-brand-dark hover:bg-brand-dark/80 text-white border-white/5',
      light: 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-sm',
      icon: 'text-muted',
    },
    danger: {
      dark: 'bg-rose-500 hover:bg-rose-400 text-white border-rose-500/20 shadow-lg shadow-rose-500/20',
      light:
        'bg-rose-500 hover:bg-rose-600 text-white border-rose-600 shadow-sm shadow-rose-500/20',
      icon: 'text-white',
    },
    success: {
      dark: 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border-emerald-500/20',
      light: 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200 shadow-sm',
      icon: 'text-emerald-500',
    },
    warning: {
      dark: 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border-amber-500/20',
      light: 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200 shadow-sm',
      icon: 'text-amber-500',
    },
    info: {
      dark: 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 border-blue-500/20',
      light: 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 shadow-sm',
      icon: 'text-blue-500',
    },
    ghost: {
      dark: 'bg-white/5 border-white/10 text-muted hover:text-white hover:bg-white/10',
      light: 'bg-slate-100 border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-200',
      icon: 'text-muted',
    },
  };

  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className={`fixed top-0 right-0 h-full w-80 z-[70] shadow-2xl border-l flex flex-col pointer-events-auto ${
            (theme as unknown) === 'dark' ||
            (theme as unknown) === 'night' ||
            (theme as unknown) === 'high-contrast' ||
            (theme as unknown) === 'appsheet-dark' ||
            (theme as unknown) === 'gray'
              ? 'bg-brand-surface border-white/10'
              : 'bg-white border-slate-200'
          }`}
          role="dialog"
          aria-modal="true"
          aria-label={`${title}: ${selectedCount} elementos seleccionados`}
        >
          <div className="p-6 flex items-center justify-between border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/40">
                <CheckSquare className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <h4
                  className={`text-sm font-black uppercase tracking-tighter italic leading-none ${
                    (theme as unknown) === 'dark' ||
                    (theme as unknown) === 'night' ||
                    (theme as unknown) === 'high-contrast' ||
                    (theme as unknown) === 'appsheet-dark' ||
                    (theme as unknown) === 'gray'
                      ? 'text-white'
                      : 'text-slate-900'
                  }`}
                >
                  {title}
                </h4>
                <p
                  className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest mt-1"
                  aria-live="polite"
                >
                  {selectedCount} Seleccionados
                </p>
              </div>
            </div>
            <button
              onClick={onClearSelection}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                (theme as unknown) === 'dark' ||
                (theme as unknown) === 'night' ||
                (theme as unknown) === 'high-contrast' ||
                (theme as unknown) === 'appsheet-dark' ||
                (theme as unknown) === 'gray'
                  ? 'hover:bg-white/10 text-muted'
                  : 'hover:bg-slate-100 text-slate-500'
              }`}
              aria-label="Cerrar panel de acciones"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          <div className="flex-1 p-6 space-y-4 overflow-y-auto no-scrollbar">
            <div
              className={`p-4 rounded-2xl border ${
                (theme as unknown) === 'dark' ||
                (theme as unknown) === 'night' ||
                (theme as unknown) === 'high-contrast' ||
                (theme as unknown) === 'appsheet-dark' ||
                (theme as unknown) === 'gray'
                  ? 'bg-brand-dark border-white/5'
                  : 'bg-slate-50 border-slate-100'
              }`}
            >
              <p
                className={`text-[10px] font-bold uppercase tracking-widest mb-4 ${
                  (theme as unknown) === 'dark' ||
                  (theme as unknown) === 'night' ||
                  (theme as unknown) === 'high-contrast' ||
                  (theme as unknown) === 'appsheet-dark' ||
                  (theme as unknown) === 'gray'
                    ? 'text-slate-500'
                    : 'text-muted'
                }`}
              >
                Operaciones Disponibles
              </p>

              <div className="space-y-2" role="group" aria-label="Acciones disponibles">
                {actions.map((action, index) => {
                  const variant = action.variant || 'secondary';
                  const classes = (variantClasses[variant] as any)[theme];
                  const iconClass = variantClasses[variant].icon;
                  const Icon = action.icon;

                  return (
                    <button
                      key={index}
                      onClick={action.onClick}
                      className={`w-full px-4 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-all border ${classes}`}
                      aria-label={action.label}
                    >
                      <Icon className={`w-4 h-4 ${iconClass}`} aria-hidden="true" />
                      {action.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div
              className={`p-4 rounded-2xl border border-dashed ${
                (theme as unknown) === 'dark' ||
                (theme as unknown) === 'night' ||
                (theme as unknown) === 'high-contrast' ||
                (theme as unknown) === 'appsheet-dark' ||
                (theme as unknown) === 'gray'
                  ? 'border-white/10'
                  : 'border-slate-200'
              }`}
            >
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest text-center italic">
                Próximamente más acciones masivas aquí...
              </p>
            </div>
          </div>

          <div className="p-6 border-t border-white/5">
            <button
              onClick={onClearSelection}
              className={`w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${(variantClasses.ghost as any)[theme]}`}
              aria-label="Cancelar selección"
            >
              Cancelar Selección
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
