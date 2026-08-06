/**
 * KeyboardShortcuts - Muestra los atajos de teclado disponibles
 * Se puede mostrar como hint flotante o drawer
 */

import React, { memo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Keyboard, X, ChevronRight } from 'lucide-react';

interface ShortcutItem {
  key: string;
  description: string;
  category?: string;
}

interface KeyboardShortcutsProps {
  isDark?: boolean;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

const DEFAULT_SHORTCUTS: ShortcutItem[] = [
  { key: 'N', description: 'Nuevo conteo', category: 'General' },
  { key: 'R', description: 'Recibir stock', category: 'General' },
  { key: 'S', description: 'Sincronizar', category: 'General' },
  { key: 'D', description: 'Ir al dashboard', category: 'Navegación' },
  { key: '/', description: 'Buscar', category: 'Navegación' },
  { key: 'Esc', description: 'Cerrar modal', category: 'Sistema' },
  { key: '?', description: 'Mostrar ayuda', category: 'Sistema' },
];

export const KeyboardShortcuts: React.FC<KeyboardShortcutsProps> = memo(
  ({ isDark = true, position = 'bottom-right' }) => {
    const [isOpen, setIsOpen] = useState(false);

    // Agrupar shortcuts por categoría
    const groupedShortcuts = DEFAULT_SHORTCUTS.reduce(
      (acc, shortcut) => {
        const category = shortcut.category || 'Otros';
        if (!acc[category]) acc[category] = [];
        acc[category].push(shortcut);
        return acc;
      },
      {} as Record<string, ShortcutItem[]>
    );

    const positionClasses = {
      'bottom-right': 'bottom-20 right-4',
      'bottom-left': 'bottom-20 left-4',
      'top-right': 'top-20 right-4',
      'top-left': 'top-20 left-4',
    };

    return (
      <>
        {/* Botón de ayuda */}
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(true)}
          className={`
          fixed ${positionClasses[position]} z-40
          flex items-center gap-2 px-3 py-2 rounded-xl
          text-xs font-medium
          ${
            isDark
              ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-400 border border-neutral-700'
              : 'bg-white hover:bg-neutral-100 text-neutral-600 border border-neutral-200 shadow-lg'
          }
        `}
        >
          <Keyboard className="w-4 h-4" />
          <span className="hidden sm:inline">Atajos</span>
          <kbd
            className={`
          px-1.5 py-0.5 rounded text-[10px] font-mono
          ${isDark ? 'bg-neutral-700' : 'bg-neutral-100'}
        `}
          >
            ?
          </kbd>
        </motion.button>

        {/* Modal de atajos */}
        <AnimatePresence>
          {isOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsOpen(false)}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
              />

              {/* Panel */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className={`
                fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                w-full max-w-md max-h-[80vh] overflow-hidden
                rounded-2xl border shadow-2xl z-50
                ${isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200'}
              `}
              >
                {/* Header */}
                <div
                  className={`
                flex items-center justify-between px-4 py-3 border-b
                ${isDark ? 'border-neutral-800' : 'border-neutral-200'}
              `}
                >
                  <div className="flex items-center gap-2">
                    <Keyboard className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                    <h2 className={`font-semibold ${isDark ? 'text-white' : 'text-neutral-900'}`}>
                      Atajos de teclado
                    </h2>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className={`
                    p-1.5 rounded-lg transition-colors
                    ${
                      isDark
                        ? 'hover:bg-neutral-800 text-neutral-400'
                        : 'hover:bg-neutral-100 text-neutral-500'
                    }
                  `}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-4 overflow-y-auto max-h-[60vh]">
                  {Object.entries(groupedShortcuts).map(([category, shortcuts]) => (
                    <div key={category} className="mb-4 last:mb-0">
                      <h3
                        className={`
                      text-xs font-semibold uppercase tracking-wider mb-2
                      ${isDark ? 'text-neutral-500' : 'text-neutral-400'}
                    `}
                      >
                        {category}
                      </h3>
                      <div className="space-y-1">
                        {shortcuts.map(shortcut => (
                          <div
                            key={shortcut.key}
                            className={`
                            flex items-center justify-between py-2 px-3 rounded-lg
                            ${isDark ? 'hover:bg-neutral-800/50' : 'hover:bg-neutral-50'}
                          `}
                          >
                            <span
                              className={`text-sm ${isDark ? 'text-neutral-300' : 'text-neutral-600'}`}
                            >
                              {shortcut.description}
                            </span>
                            <kbd
                              className={`
                            px-2 py-1 rounded text-xs font-mono font-medium
                            ${
                              isDark
                                ? 'bg-neutral-800 text-neutral-300 border border-neutral-700'
                                : 'bg-neutral-100 text-neutral-600 border border-neutral-200'
                            }
                          `}
                            >
                              {shortcut.key}
                            </kbd>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer hint */}
                <div
                  className={`
                px-4 py-3 border-t text-center
                ${isDark ? 'border-neutral-800 bg-neutral-900/50' : 'border-neutral-200 bg-neutral-50'}
              `}
                >
                  <span className={`text-xs ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}>
                    Presiona{' '}
                    <kbd
                      className={`px-1 py-0.5 rounded text-[10px] font-mono ${isDark ? 'bg-neutral-800' : 'bg-neutral-100'}`}
                    >
                      Esc
                    </kbd>{' '}
                    para cerrar
                  </span>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </>
    );
  }
);

KeyboardShortcuts.displayName = 'KeyboardShortcuts';

export default KeyboardShortcuts;
