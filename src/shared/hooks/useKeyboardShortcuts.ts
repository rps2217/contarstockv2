/**
 * useKeyboardShortcuts - Hook para atajos de teclado globales
 * 
 * Permite definir atajos de teclado que funcionan en toda la aplicación.
 * Los atajos se pueden disablear cuando hay inputs focuseados.
 */

import { useEffect, useCallback, useMemo } from 'react';
import { useAppStore } from '@/stores';

export interface ShortcutDefinition {
  key: string;
  modifiers?: ('ctrl' | 'alt' | 'shift' | 'meta')[];
  description?: string;
  action: () => void;
  enabled?: boolean;
  ignoreInputs?: boolean;
}

export interface ShortcutGroup {
  name: string;
  shortcuts: ShortcutDefinition[];
}

const DEFAULT_IGNORE_TAGS = ['INPUT', 'TEXTAREA', 'SELECT'];

export const useKeyboardShortcuts = (shortcuts: ShortcutDefinition[], enabled = true) => {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled) return;
    
    // Verificar si el target es un input
    const target = e.target as HTMLElement;
    const isInput = DEFAULT_IGNORE_TAGS.includes(target.tagName) || 
                    target.isContentEditable;

    for (const shortcut of shortcuts) {
      if (shortcut.enabled === false) continue;
      
      // Ignorar atajos si hay un input focuseado (a menos que se indique lo contrario)
      if (isInput && (shortcut.ignoreInputs ?? true)) continue;

      // Verificar modificadores
      const modifiersMatch = shortcut.modifiers?.every(mod => {
        switch (mod) {
          case 'ctrl': return e.ctrlKey || e.metaKey;
          case 'alt': return e.altKey;
          case 'shift': return e.shiftKey;
          case 'meta': return e.metaKey;
          default: return true;
        }
      }) ?? true;

      // Verificar tecla (case insensitive)
      const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();

      if (keyMatch && modifiersMatch) {
        e.preventDefault();
        e.stopPropagation();
        shortcut.action();
        return;
      }
    }
  }, [shortcuts, enabled]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
};

// Shortcuts predefinidos para la aplicación
export const useAppShortcuts = () => {
  const { setStartSessionModalOpen } = useAppStore();
  
  const shortcuts = useMemo<ShortcutDefinition[]>(() => [
    // ============ BÚSQUEDA Y NAVEGACIÓN ============
    // Ctrl+K - Búsqueda global
    {
      key: 'k',
      modifiers: ['ctrl'],
      description: 'Abrir búsqueda global',
      action: () => {
        const event = new CustomEvent('open-global-search');
        window.dispatchEvent(event);
      },
    },
    // Ctrl+P - Command Palette
    {
      key: 'p',
      modifiers: ['ctrl'],
      description: 'Abrir command palette',
      action: () => {
        const event = new CustomEvent('open-command-palette');
        window.dispatchEvent(event);
      },
    },
    
    // ============ ACCIONES RÁPIDAS ============
    // Ctrl+N - Nuevo registro
    {
      key: 'n',
      modifiers: ['ctrl'],
      description: 'Nuevo registro rápido',
      action: () => {
        const event = new CustomEvent('quick-add');
        window.dispatchEvent(event);
      },
    },
    // Ctrl+Shift+N - Nuevo conteo
    {
      key: 'n',
      modifiers: ['ctrl', 'shift'],
      description: 'Nuevo conteo',
      action: () => setStartSessionModalOpen(true),
    },
    
    // ============ NAVEGACIÓN POR MÓDULOS ============
    // Ctrl+1 - Dashboard
    {
      key: '1',
      modifiers: ['ctrl'],
      description: 'Ir a Dashboard',
      action: () => {
        const event = new CustomEvent('navigate', { detail: 'dashboard' });
        window.dispatchEvent(event);
      },
    },
    // Ctrl+2 - Captura
    {
      key: '2',
      modifiers: ['ctrl'],
      description: 'Ir a Captura',
      action: () => {
        const event = new CustomEvent('navigate', { detail: 'capture' });
        window.dispatchEvent(event);
      },
    },
    // Ctrl+3 - Vencimientos
    {
      key: '3',
      modifiers: ['ctrl'],
      description: 'Ir a Vencimientos',
      action: () => {
        const event = new CustomEvent('navigate', { detail: 'expiry' });
        window.dispatchEvent(event);
      },
    },
    // Ctrl+4 - Inventario
    {
      key: '4',
      modifiers: ['ctrl'],
      description: 'Ir a Inventario',
      action: () => {
        const event = new CustomEvent('navigate', { detail: 'inventory' });
        window.dispatchEvent(event);
      },
    },
    // Ctrl+5 - Reportes
    {
      key: '5',
      modifiers: ['ctrl'],
      description: 'Ir a Reportes',
      action: () => {
        const event = new CustomEvent('navigate', { detail: 'reports' });
        window.dispatchEvent(event);
      },
    },
    // Ctrl+, - Configuración
    {
      key: ',',
      modifiers: ['ctrl'],
      description: 'Ir a Configuración',
      action: () => {
        const event = new CustomEvent('navigate', { detail: 'settings' });
        window.dispatchEvent(event);
      },
    },
    
    // ============ ACCIONES GENERALES ============
    // Escape - Cerrar modal
    {
      key: 'Escape',
      description: 'Cerrar modal/cancelar',
      action: () => {
        const event = new CustomEvent('close-modal');
        window.dispatchEvent(event);
      },
      ignoreInputs: false,
    },
    // Ctrl+S - Guardar
    {
      key: 's',
      modifiers: ['ctrl'],
      description: 'Guardar',
      action: () => {
        const event = new CustomEvent('keyboard-save');
        window.dispatchEvent(event);
      },
    },
    // Ctrl+R - Actualizar
    {
      key: 'r',
      modifiers: ['ctrl'],
      description: 'Actualizar',
      action: () => {
        const event = new CustomEvent('keyboard-refresh');
        window.dispatchEvent(event);
      },
    },
    // Ctrl+E - Editar
    {
      key: 'e',
      modifiers: ['ctrl'],
      description: 'Editar seleccionado',
      action: () => {
        const event = new CustomEvent('edit-selected');
        window.dispatchEvent(event);
      },
    },
    // ? - Mostrar atajos
    {
      key: '?',
      description: 'Mostrar atajos de teclado',
      action: () => {
        const event = new CustomEvent('show-shortcuts');
        window.dispatchEvent(event);
      },
    },
  ], [setStartSessionModalOpen]);

  useKeyboardShortcuts(shortcuts);
};

// Hook para detectar combinación de teclas específica
export const useHotkey = (
  key: string,
  callback: () => void,
  modifiers?: ('ctrl' | 'alt' | 'shift' | 'meta')[]
) => {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== key.toLowerCase()) return;
      
      const modifiersMatch = modifiers?.every(mod => {
        switch (mod) {
          case 'ctrl': return e.ctrlKey || e.metaKey;
          case 'alt': return e.altKey;
          case 'shift': return e.shiftKey;
          case 'meta': return e.metaKey;
          default: return true;
        }
      }) ?? true;

      if (modifiersMatch) {
        e.preventDefault();
        callback();
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [key, callback, modifiers]);
};
