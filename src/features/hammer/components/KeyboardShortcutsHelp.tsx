/**
 * KeyboardShortcutsHelp - Atajos de teclado documentados para Hammer
 */

import React from 'react';
import { Keyboard, Zap, TrendingUp, X } from 'lucide-react';

interface KeyboardShortcut {
  keys: string[];
  description: string;
  icon?: React.ReactNode;
}

const SHORTCUTS: KeyboardShortcut[] = [
  { 
    keys: ['Alt', 'P'], 
    description: 'Mostrar/Ocultar productividad',
    icon: <TrendingUp className="w-4 h-4 text-emerald-400" />
  },
  { 
    keys: ['Alt', 'Shift', 'T'], 
    description: 'Activar/Desactivar Turbo',
    icon: <Zap className="w-4 h-4 text-amber-400" />
  },
  { 
    keys: ['Esc'], 
    description: 'Cerrar modal' 
  },
];

interface KeyboardShortcutsHelpProps {
  isVisible?: boolean;
  onClose?: () => void;
}

export const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({
  isVisible = true,
  onClose
}) => {
  if (!isVisible) return null;

  return (
    <div className="fixed bottom-20 right-4 bg-surface/95 border border-white/10 rounded-2xl p-4 shadow-2xl z-50 min-w-[280px] animate-in slide-in-from-bottom-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Keyboard className="w-4 h-4 text-muted" />
          <span className="text-xs font-bold uppercase tracking-wider text-muted">
            Atajos
          </span>
        </div>
        {onClose && (
          <button 
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        )}
      </div>

      {/* Lista de atajos */}
      <div className="space-y-2">
        {SHORTCUTS.map((shortcut, index) => (
          <div key={index} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              {shortcut.icon}
              <span className="text-xs text-secondary">
                {shortcut.description}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {shortcut.keys.map((key, keyIndex) => (
                <React.Fragment key={'-'}>
                  {keyIndex > 0 && (
                    <span className="text-slate-600 text-xs">+</span>
                  )}
                  <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[10px] font-mono text-secondary border border-white/10">
                    {key}
                  </kbd>
                </React.Fragment>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Mini hint que aparece en la UI
export const KeyboardShortcutsHint: React.FC = () => (
  <div className="fixed bottom-4 right-4 flex items-center gap-1.5 text-[10px] text-slate-500 z-40">
    <Keyboard className="w-3 h-3" />
    <span>Alt+P productividad • Alt+Shift+T turbo</span>
  </div>
);
