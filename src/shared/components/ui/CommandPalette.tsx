'use client';
/**
 * CommandPalette - Búsqueda rápida y ejecución de acciones
 *
 * Se abre con Ctrl+K o Ctrl+P
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  LayoutDashboard,
  ScanLine,
  Database,
  CalendarClock,
  BarChart3,
  Settings,
  Plus,
  Edit3,
  Trash2,
  Download,
  RefreshCw,
  ChevronRight,
  Command,
  Keyboard,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  shortcut?: string;
  action: () => void;
  category: 'navigation' | 'action' | 'create';
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Comandos disponibles
  const commands: CommandItem[] = useMemo(
    () => [
      // Navegación
      {
        id: 'nav-dashboard',
        label: 'Ir a Dashboard',
        description: 'Panel principal',
        icon: <LayoutDashboard className="w-4 h-4" />,
        shortcut: 'Ctrl+1',
        action: () => {
          window.dispatchEvent(new CustomEvent('navigate', { detail: 'dashboard' }));
          onClose();
        },
        category: 'navigation',
      },
      {
        id: 'nav-capture',
        label: 'Ir a Captura',
        description: 'Escanear productos',
        icon: <ScanLine className="w-4 h-4" />,
        shortcut: 'Ctrl+2',
        action: () => {
          window.dispatchEvent(new CustomEvent('navigate', { detail: 'capture' }));
          onClose();
        },
        category: 'navigation',
      },
      {
        id: 'nav-expiry',
        label: 'Ir a Vencimientos',
        description: 'Control de fechas de vencimiento',
        icon: <CalendarClock className="w-4 h-4" />,
        shortcut: 'Ctrl+3',
        action: () => {
          window.dispatchEvent(new CustomEvent('navigate', { detail: 'expiry' }));
          onClose();
        },
        category: 'navigation',
      },
      {
        id: 'nav-inventory',
        label: 'Ir a Inventario',
        description: 'Gestión de productos',
        icon: <Database className="w-4 h-4" />,
        shortcut: 'Ctrl+4',
        action: () => {
          window.dispatchEvent(new CustomEvent('navigate', { detail: 'inventory' }));
          onClose();
        },
        category: 'navigation',
      },
      {
        id: 'nav-reports',
        label: 'Ir a Reportes',
        description: 'Informes y estadísticas',
        icon: <BarChart3 className="w-4 h-4" />,
        shortcut: 'Ctrl+5',
        action: () => {
          window.dispatchEvent(new CustomEvent('navigate', { detail: 'reports' }));
          onClose();
        },
        category: 'navigation',
      },
      {
        id: 'nav-settings',
        label: 'Ir a Configuración',
        description: 'Ajustes de la aplicación',
        icon: <Settings className="w-4 h-4" />,
        shortcut: 'Ctrl+,',
        action: () => {
          window.dispatchEvent(new CustomEvent('navigate', { detail: 'settings' }));
          onClose();
        },
        category: 'navigation',
      },
      // Acciones
      {
        id: 'action-new-product',
        label: 'Nuevo Producto',
        description: 'Agregar producto al inventario',
        icon: <Plus className="w-4 h-4" />,
        shortcut: 'Ctrl+N',
        action: () => {
          window.dispatchEvent(new CustomEvent('quick-add', { detail: 'product' }));
          onClose();
        },
        category: 'create',
      },
      {
        id: 'action-new-expiry',
        label: 'Nuevo Vencimiento',
        description: 'Registrar fecha de vencimiento',
        icon: <CalendarClock className="w-4 h-4" />,
        action: () => {
          window.dispatchEvent(new CustomEvent('quick-add', { detail: 'expiry' }));
          onClose();
        },
        category: 'create',
      },
      {
        id: 'action-refresh',
        label: 'Actualizar',
        description: 'Recargar datos actuales',
        icon: <RefreshCw className="w-4 h-4" />,
        shortcut: 'Ctrl+R',
        action: () => {
          window.dispatchEvent(new CustomEvent('keyboard-refresh'));
          onClose();
        },
        category: 'action',
      },
      {
        id: 'action-shortcuts',
        label: 'Ver Atajos de Teclado',
        description: 'Lista completa de shortcuts',
        icon: <Keyboard className="w-4 h-4" />,
        shortcut: '?',
        action: () => {
          window.dispatchEvent(new CustomEvent('show-shortcuts'));
          onClose();
        },
        category: 'action',
      },
    ],
    [onClose]
  );

  // Filtrar comandos por búsqueda
  const filteredCommands = useMemo(() => {
    if (!query) return commands;
    const lower = query.toLowerCase();
    return commands.filter(
      cmd =>
        cmd.label.toLowerCase().includes(lower) || cmd.description?.toLowerCase().includes(lower)
    );
  }, [commands, query]);

  // Escuchar eventos para abrir/cerrar
  useEffect(() => {
    const handleOpen = () => {
      setQuery('');
      setSelectedIndex(0);
    };

    window.addEventListener('open-command-palette', handleOpen);
    window.addEventListener('open-global-search', handleOpen);

    return () => {
      window.removeEventListener('open-command-palette', handleOpen);
      window.removeEventListener('open-global-search', handleOpen);
    };
  }, []);

  // Focus input al abrir
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Navegación con teclado
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(i => Math.min(i + 1, filteredCommands.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(i => Math.max(i - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            filteredCommands[selectedIndex].action();
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, onClose]);

  // Scroll al item seleccionado
  useEffect(() => {
    if (listRef.current) {
      const selected = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      selected?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  const categoryLabels = {
    navigation: 'Navegación',
    action: 'Acciones',
    create: 'Crear',
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
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998]"
            onClick={onClose}
            role="button"
            aria-label="Cerrar paleta de comandos"
            tabIndex={0}
            onKeyDown={e => e.key === 'Escape' && onClose()}
          />

          {/* Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.15 }}
            className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-lg z-[9999]"
            role="dialog"
            aria-modal="true"
            aria-label="Paleta de comandos"
          >
            <div className="bg-surface border border-subtle rounded-2xl shadow-2xl overflow-hidden">
              {/* Search Input */}
              <div className="flex items-center gap-3 px-4 py-4 border-b border-subtle">
                <Search className="w-5 h-5 text-muted shrink-0" aria-hidden="true" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={e => {
                    setQuery(e.target.value);
                    setSelectedIndex(0);
                  }}
                  placeholder="Escribe para buscar..."
                  className="flex-1 bg-transparent text-primary placeholder:text-muted outline-none text-base"
                  aria-label="Buscar comandos"
                  role="combobox"
                  aria-expanded="true"
                  aria-controls="command-list"
                />
                <kbd
                  className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs text-muted bg-elevated rounded border border-subtle"
                  aria-label="Atajo de teclado"
                >
                  <Command className="w-3 h-3" /> K
                </kbd>
              </div>

              {/* Results */}
              <div
                ref={listRef}
                className="max-h-80 overflow-y-auto py-2"
                id="command-list"
                role="listbox"
                aria-label="Lista de comandos"
              >
                {filteredCommands.length === 0 ? (
                  <div className="px-4 py-8 text-center text-muted" role="status">
                    No se encontraron comandos
                  </div>
                ) : (
                  Object.entries(
                    filteredCommands.reduce(
                      (acc, cmd) => {
                        if (!acc[cmd.category]) acc[cmd.category] = [];
                        acc[cmd.category].push(cmd);
                        return acc;
                      },
                      {} as Record<string, CommandItem[]>
                    )
                  ).map(([category, items]) => (
                    <div key={category}>
                      <div
                        className="px-4 py-2 text-xs font-semibold text-muted uppercase tracking-wider"
                        role="presentation"
                      >
                        {categoryLabels[category as keyof typeof categoryLabels]}
                      </div>
                      {items.map((item, idx) => {
                        const globalIdx = filteredCommands.indexOf(item);
                        return (
                          <button
                            key={item.id}
                            data-index={globalIdx}
                            onClick={item.action}
                            onMouseEnter={() => setSelectedIndex(globalIdx)}
                            className={cn(
                              'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
                              globalIdx === selectedIndex
                                ? 'bg-blue-600/20 text-blue-400'
                                : 'text-primary hover:bg-elevated'
                            )}
                            role="option"
                            aria-selected={globalIdx === selectedIndex}
                            aria-label={`${item.label}${item.description ? `: ${item.description}` : ''}`}
                          >
                            <span
                              className={cn(
                                'shrink-0',
                                globalIdx === selectedIndex ? 'text-blue-400' : 'text-muted'
                              )}
                              aria-hidden="true"
                            >
                              {item.icon}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{item.label}</div>
                              {item.description && (
                                <div className="text-xs text-muted truncate">
                                  {item.description}
                                </div>
                              )}
                            </div>
                            {item.shortcut && (
                              <kbd className="shrink-0 px-2 py-1 text-xs text-muted bg-base rounded border border-subtle">
                                {item.shortcut}
                              </kbd>
                            )}
                            <ChevronRight
                              className={cn(
                                'w-4 h-4 shrink-0 transition-opacity',
                                globalIdx === selectedIndex
                                  ? 'text-blue-400 opacity-100'
                                  : 'opacity-0'
                              )}
                            />
                          </button>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-4 py-3 border-t border-subtle bg-elevated/50">
                <div className="flex items-center gap-4 text-xs text-muted">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-base rounded border border-subtle">↑↓</kbd>
                    Navegar
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-base rounded border border-subtle">↵</kbd>
                    Seleccionar
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-base rounded border border-subtle">Esc</kbd>
                    Cerrar
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CommandPalette;
