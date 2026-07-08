"use client";
/**
 * useAutoSave - Hook para auto-guardado de formularios
 * 
 * Funcionalidades:
 * - Guardado automático con debounce
 * - Persistencia en localStorage
 * - Recuperación de drafts
 * - Indicador de estado (guardando/guardado/error)
 * - Limpieza automática al guardar exitosamente
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'restored';

interface AutoSaveOptions<T> {
  /** Clave única para identificar el formulario */
  key: string;
  /** Tiempo de debounce en ms (default: 2000) */
  debounceMs?: number;
  /** Tiempo máximo que se guarda el draft (default: 7 días) */
  maxAgeMs?: number;
  /** Callback cuando se restaura un draft */
  onRestore?: (data: T) => void;
  /** Habilitar/deshabilitar auto-guardado */
  enabled?: boolean;
}

interface AutoSaveReturn<T> {
  /** Estado actual del auto-guardado */
  status: AutoSaveStatus;
  /** Guardar manualmente (limpia el draft) */
  save: (data: T) => void;
  /** Eliminar draft guardado */
  clear: () => void;
  /** Verificar si hay un draft disponible */
  hasDraft: boolean;
  /** Última vez que se guardó */
  lastSavedAt: Date | null;
  /** Datos del draft actual (si existe) */
  draftData: T | null;
}

const DEFAULT_DEBOUNCE_MS = 2000;
const DEFAULT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 días

export function useAutoSave<T>(options: AutoSaveOptions<T>): AutoSaveReturn<T> {
  const {
    key,
    debounceMs = DEFAULT_DEBOUNCE_MS,
    maxAgeMs = DEFAULT_MAX_AGE_MS,
    onRestore,
    enabled = true,
  } = options;

  const [status, setStatus] = useState<AutoSaveStatus>('idle');
  const [hasDraft, setHasDraft] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [draftData, setDraftData] = useState<T | null>(null);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitializedRef = useRef(false);

  const storageKey = `autosave_${key}`;

  // Verificar si hay un draft válido al iniciar
  useEffect(() => {
    if (!enabled || isInitializedRef.current) return;
    isInitializedRef.current = true;

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const { data, timestamp } = JSON.parse(stored);
        const age = Date.now() - timestamp;

        if (age < maxAgeMs) {
          setDraftData(data);
          setHasDraft(true);
          setStatus('restored');
          
          if (onRestore) {
            onRestore(data);
          }
        } else {
          // Draft expirado, eliminarlo
          localStorage.removeItem(storageKey);
        }
      }
    } catch (e) {
      console.warn('Error checking auto-save draft:', e);
      localStorage.removeItem(storageKey);
    }
  }, [enabled, key, storageKey, maxAgeMs, onRestore]);

  // Guardar datos (con debounce)
  const save = useCallback((data: T) => {
    if (!enabled) return;

    // Limpiar timeout anterior
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setStatus('saving');

    timeoutRef.current = setTimeout(() => {
      try {
        const payload = {
          data,
          timestamp: Date.now(),
        };
        localStorage.setItem(storageKey, JSON.stringify(payload));
        
        setDraftData(data);
        setHasDraft(false); // Ya no hay draft pendiente (se acaba de guardar)
        setLastSavedAt(new Date());
        setStatus('saved');

        // Volver a idle después de 2 segundos
        setTimeout(() => setStatus('idle'), 2000);
      } catch (e) {
        console.error('Error saving draft:', e);
        setStatus('error');
      }
    }, debounceMs);
  }, [enabled, debounceMs, storageKey]);

  // Guardar inmediatamente y marcar como limpio
  const saveImmediate = useCallback((data: T) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    try {
      const payload = {
        data,
        timestamp: Date.now(),
      };
      localStorage.setItem(storageKey, JSON.stringify(payload));
      setLastSavedAt(new Date());
    } catch (e) {
      console.error('Error saving immediate:', e);
    }
  }, [storageKey]);

  // Eliminar draft
  const clear = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    localStorage.removeItem(storageKey);
    setDraftData(null);
    setHasDraft(false);
    setStatus('idle');
  }, [storageKey]);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    status,
    save,
    clear,
    hasDraft,
    lastSavedAt,
    draftData,
  };
}

// Componente indicador de estado
import React from 'react';
import { Loader2, Check, AlertCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AutoSaveIndicatorProps {
  status: AutoSaveStatus;
  lastSavedAt?: Date | null;
  className?: string;
  showLabel?: boolean;
}

export const AutoSaveIndicator: React.FC<AutoSaveIndicatorProps> = ({
  status,
  lastSavedAt,
  className,
  showLabel = true,
}) => {
  const getIcon = () => {
    switch (status) {
      case 'saving':
        return <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />;
      case 'saved':
        return <Check className="w-3.5 h-3.5 text-emerald-500" />;
      case 'error':
        return <AlertCircle className="w-3.5 h-3.5 text-rose-500" />;
      case 'restored':
        return <Clock className="w-3.5 h-3.5 text-amber-500" />;
      default:
        return null;
    }
  };

  const getLabel = () => {
    switch (status) {
      case 'saving':
        return 'Guardando...';
      case 'saved':
        return 'Guardado';
      case 'error':
        return 'Error';
      case 'restored':
        return 'Draft restaurado';
      default:
        if (lastSavedAt) {
          return `Guardado ${formatRelativeTime(lastSavedAt)}`;
        }
        return null;
    }
  };

  const formatRelativeTime = (date: Date) => {
    const diff = Date.now() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return 'recientemente';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `hace ${minutes}m`;
    const hours = Math.floor(minutes / 60);
    return `hace ${hours}h`;
  };

  const label = getLabel();
  
  if (!label && !showLabel) return null;

  return (
    <div className={cn(
      'flex items-center gap-1.5 text-xs transition-opacity',
      status === 'error' ? 'text-rose-500' : 'text-muted',
      className
    )}>
      {getIcon()}
      {showLabel && label}
    </div>
  );
};

// Componente banner para recuperación de draft
interface DraftRecoveryBannerProps {
  hasDraft: boolean;
  onRestore: () => void;
  onDismiss: () => void;
  formName?: string;
}

export const DraftRecoveryBanner: React.FC<DraftRecoveryBannerProps> = ({
  hasDraft,
  onRestore,
  onDismiss,
  formName = 'formulario',
}) => {
  if (!hasDraft) return null;

  return (
    <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-4 flex items-center gap-4">
      <div className="flex-1">
        <p className="text-sm font-medium text-amber-500">
          ¿Recuperar {formName}?
        </p>
        <p className="text-xs text-secondary mt-1">
          Encontramos un borrador guardado anteriormente.
        </p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onDismiss}
          className="px-3 py-1.5 text-xs font-medium text-muted hover:text-primary transition-colors"
        >
          Descartar
        </button>
        <button
          onClick={onRestore}
          className="px-3 py-1.5 text-xs font-medium bg-amber-500 text-white rounded-lg hover:bg-amber-400 transition-colors"
        >
          Restaurar
        </button>
      </div>
    </div>
  );
};

export default useAutoSave;