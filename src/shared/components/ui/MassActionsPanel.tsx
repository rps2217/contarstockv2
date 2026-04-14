import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Printer, Trash2 } from 'lucide-react';

interface Action {
  label: string;
  icon: React.ElementType;
  onClick: () => void;
  variant?: 'primary' | 'danger' | 'warning' | 'info';
}

interface MassActionsPanelProps {
  selectedCount: number;
  onClear: () => void;
  actions: Action[];
  theme?: 'dark' | 'light';
}

export const MassActionsPanel: React.FC<MassActionsPanelProps> = ({
  selectedCount,
  onClear,
  actions,
  theme = 'dark'
}) => {
  if (selectedCount === 0) return null;

  const variantClasses = {
    primary: 'bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20',
    danger: 'bg-rose-500/10 text-rose-500 hover:bg-rose-500/20',
    warning: 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20',
    info: 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20'
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className={`fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-[100] p-3 rounded-2xl shadow-2xl flex items-center gap-4 border ${
          theme === 'dark' 
            ? 'bg-slate-800 border-slate-700' 
            : 'bg-white border-stone-200'
        }`}
      >
        <div className="flex items-center gap-2 px-3">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-500 text-white font-black text-xs">
            {selectedCount}
          </span>
          <span className={`font-bold text-sm uppercase tracking-wider ${
            theme === 'dark' ? 'text-white' : 'text-stone-900'
          }`}>
            Seleccionados
          </span>
        </div>
        
        <div className={`h-8 w-px ${theme === 'dark' ? 'bg-slate-700' : 'bg-stone-200'}`}></div>
        
        <div className="flex items-center gap-2">
          {actions.map((action, idx) => {
            const Icon = action.icon;
            return (
              <button 
                key={idx}
                onClick={action.onClick}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors font-bold text-sm uppercase ${
                  variantClasses[action.variant || 'primary']
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{action.label}</span>
              </button>
            );
          })}
        </div>
        
        <div className={`h-8 w-px ${theme === 'dark' ? 'bg-slate-700' : 'bg-stone-200'}`}></div>
        
        <button 
          onClick={onClear} 
          className={`p-2 rounded-xl transition-all ${
            theme === 'dark' 
              ? 'text-slate-400 hover:text-white hover:bg-white/5' 
              : 'text-stone-400 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <X className="w-5 h-5" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
};
