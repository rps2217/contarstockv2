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
    // Búsqueda global
    {
      key: 'k',
      modifiers: ['ctrl'],
      description: 'Abrir búsqueda global',
      action: () => {
        const event = new CustomEvent('open-global-search');
        window.dispatchEvent(event);
      },
    },
    // Nuevo conteo
    {
      key: 'n',
      modifiers: ['ctrl'],
      description: 'Nuevo conteo',
      action: () => setStartSessionModalOpen(true),
    },
    // Escape - cerrar modales
    {
      key: 'Escape',
      description: 'Cerrar modal/abrir command menu',
      action: () => {
        const event = new CustomEvent('close-modal');
        window.dispatchEvent(event);
      },
      ignoreInputs: false,
    },
    // Guardar (Ctrl+S)
    {
      key: 's',
      modifiers: ['ctrl'],
      description: 'Guardar',
      action: () => {
        const event = new CustomEvent('keyboard-save');
        window.dispatchEvent(event);
      },
    },
    // Actualizar (Ctrl+R)
    {
      key: 'r',
      modifiers: ['ctrl'],
      description: 'Actualizar',
      action: () => {
        const event = new CustomEvent('keyboard-refresh');
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
