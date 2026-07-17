/**
 * useCountingKeyboardShortcuts - Atajos de teclado para el módulo de conteo
 *
 * Shortcuts disponibles:
 * - Space/Enter: Confirmar escaneo
 * - Escape: Cancelar/cerrar modal
 * - +/-: Ajustar cantidad
 * - 1-9: Seleccionar cantidad rápida
 * - F: Toggle modo fullscreen
 * - M: Toggle mute (silenciar alertas)
 * - N: siguiente item
 * - P: anterior item
 * - Q: Terminar conteo
 * - ?: Mostrar ayuda
 */

import { useEffect, useCallback, useState } from 'react';

export interface ShortcutConfig {
  onConfirm?: () => void;
  onCancel?: () => void;
  onIncrement?: () => void;
  onDecrement?: () => void;
  onSetQuantity?: (qty: number) => void;
  onNext?: () => void;
  onPrevious?: () => void;
  onFinish?: () => void;
  onToggleFullscreen?: () => void;
  onToggleMute?: () => void;
  onShowHelp?: () => void;
  onQuickAction1?: () => void;
  onQuickAction2?: () => void;
  onQuickAction3?: () => void;
  enabled?: boolean;
}

export interface ShortcutDefinition {
  key: string;
  description: string;
  category: 'navigation' | 'actions' | 'quantity' | 'system';
}

const SHORTCUTS: ShortcutDefinition[] = [
  // Navigation
  { key: 'n', description: 'Siguiente item', category: 'navigation' },
  { key: 'p', description: 'Item anterior', category: 'navigation' },
  { key: 'Tab', description: 'Siguiente (alternativa)', category: 'navigation' },

  // Actions
  { key: 'Space', description: 'Confirmar escaneo', category: 'actions' },
  { key: 'Enter', description: 'Confirmar (alternativa)', category: 'actions' },
  { key: 'Escape', description: 'Cancelar / Cerrar', category: 'actions' },
  { key: 'q', description: 'Terminar conteo', category: 'actions' },
  { key: 'f', description: 'Pantalla completa', category: 'actions' },

  // Quantity
  { key: '+/-', description: 'Ajustar cantidad', category: 'quantity' },
  { key: '1-9', description: 'Cantidad rápida', category: 'quantity' },

  // System
  { key: 'm', description: 'Silenciar / Activar', category: 'system' },
  { key: '?', description: 'Mostrar ayuda', category: 'system' },
];

export function useCountingKeyboardShortcuts(config: ShortcutConfig) {
  const [isMuted, setIsMuted] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // Toggle mute
  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
    config.onToggleMute?.();
  }, [config]);

  // Toggle help
  const toggleHelp = useCallback(() => {
    setShowHelp(prev => !prev);
    config.onShowHelp?.();
  }, [config]);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    config.onToggleFullscreen?.();
  }, [config]);

  // Handle keydown
  useEffect(() => {
    if (config.enabled === false) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar si hay un input enfocado
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      const key = e.key.toLowerCase();

      switch (e.key) {
        case ' ':
        case 'Enter':
          e.preventDefault();
          config.onConfirm?.();
          break;

        case 'Escape':
          e.preventDefault();
          config.onCancel?.();
          break;

        case '+':
        case '=':
          e.preventDefault();
          config.onIncrement?.();
          break;

        case '-':
        case '_':
          e.preventDefault();
          config.onDecrement?.();
          break;

        case 'n':
          e.preventDefault();
          config.onNext?.();
          break;

        case 'p':
          e.preventDefault();
          config.onPrevious?.();
          break;

        case 'q':
          if (e.ctrlKey || e.metaKey) return; // No interferir con Ctrl+Q del navegador
          e.preventDefault();
          config.onFinish?.();
          break;

        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;

        case 'm':
          e.preventDefault();
          toggleMute();
          break;

        case '?':
          e.preventDefault();
          toggleHelp();
          break;

        // Cantidades rápidas 1-9
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9':
          if (!e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            config.onSetQuantity?.(parseInt(e.key, 10));
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [config, toggleFullscreen, toggleMute, toggleHelp]);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      // Restaurar fullscreen si lo activamos
      if (document.fullscreenElement) {
        document.exitFullscreen?.();
      }
    };
  }, []);

  return {
    isMuted,
    showHelp,
    shortcuts: SHORTCUTS,
    toggleMute,
    toggleHelp,
    toggleFullscreen,
  };
}

// ============================================================================
// COMPONENTE DE AYUDA
// ============================================================================

import React, { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Keyboard } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KeyboardHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  shortcuts?: ShortcutDefinition[];
}

const ShortcutRow = memo(({ shortcut }: { shortcut: ShortcutDefinition }) => (
  <div className="flex items-center justify-between py-2 border-b border-subtle last:border-0">
    <span className="text-sm">{shortcut.description}</span>
    <kbd
      className={cn(
        'px-2 py-1 rounded-lg text-xs font-mono',
        'bg-surface text-primary',
        'border border-subtle'
      )}
    >
      {shortcut.key}
    </kbd>
  </div>
));

ShortcutRow.displayName = 'ShortcutRow';

export const KeyboardHelpModal: React.FC<KeyboardHelpModalProps> = memo(
  ({ isOpen, onClose, shortcuts = SHORTCUTS }) => {
    const categories = {
      navigation: {
        label: 'Navegación',
        shortcuts: shortcuts.filter(s => s.category === 'navigation'),
      },
      actions: { label: 'Acciones', shortcuts: shortcuts.filter(s => s.category === 'actions') },
      quantity: { label: 'Cantidad', shortcuts: shortcuts.filter(s => s.category === 'quantity') },
      system: { label: 'Sistema', shortcuts: shortcuts.filter(s => s.category === 'system') },
    };

    return (
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={onClose}
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 m-auto w-full max-w-md h-fit z-50"
            >
              <div className="bg-surface rounded-2xl border border-subtle shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 bg-base border-b border-subtle">
                  <div className="flex items-center gap-3">
                    <Keyboard className="w-5 h-5 text-primary" />
                    <h2 className="font-bold">Atajos de Teclado</h2>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-lg hover:bg-surface transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-4 max-h-[60vh] overflow-y-auto">
                  {Object.entries(categories).map(
                    ([key, { label, shortcuts: catShortcuts }]) =>
                      catShortcuts.length > 0 && (
                        <div key={key} className="mb-4 last:mb-0">
                          <h3 className="text-xs text-muted uppercase tracking-wider mb-2">
                            {label}
                          </h3>
                          {catShortcuts.map((s, i) => (
                            <ShortcutRow key={`${key}-${i}`} shortcut={s} />
                          ))}
                        </div>
                      )
                  )}
                </div>

                {/* Footer */}
                <div className="p-3 bg-base border-t border-subtle text-center">
                  <span className="text-xs text-muted">
                    Presiona{' '}
                    <kbd className="px-1.5 py-0.5 rounded bg-surface border border-subtle text-[10px]">
                      ?
                    </kbd>{' '}
                    para mostrar/ocultar
                  </span>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }
);

KeyboardHelpModal.displayName = 'KeyboardHelpModal';

export default useCountingKeyboardShortcuts;
