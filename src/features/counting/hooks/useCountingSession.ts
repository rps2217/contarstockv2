/**
 * useCountingSession - Hook para gestión de sesión de conteo
 *
 * Responsabilidad:
 * - Carga de sesión desde BD
 * - Gestión de multiplicador
 * - Gestión de ubicación
 * - Detección de modo (ciego/teórico)
 *
 * Parte del plan de refactor del orquestador.
 * @see REFACTOR_ORCHESTRATOR.md
 */

import { useState, useEffect, useCallback } from 'react';
import { SessionRepository } from '@/repositories/SessionRepository';
import { db } from '@/db';
import { toast } from 'sonner';
import { parseSessionId, isBlindSession } from '../domain/sessionTypes';
import { logger } from '@/services/logger';

// ============================================================================
// TIPOS
// ============================================================================

export interface UseCountingSessionResult {
  // Estado
  session: any | null | undefined; // Session del repositorio
  isLoading: boolean;
  error: string | null;

  // Modo
  isBlindMode: boolean;
  sessionMode: 'blind' | 'theoretical';

  // Multiplicador
  multiplier: number;
  setMultiplier: (value: number) => void;
  incrementMultiplier: () => void;
  decrementMultiplier: () => void;
  resetMultiplier: () => void;

  // Ubicación
  currentLocation: string;
  setCurrentLocation: (location: string) => void;

  // Reset
  resetSession: () => Promise<void>;
}

interface SessionRow {
  id: string;
  status: string;
  sessionType?: string;
  // ... otros campos
}

// ============================================================================
// CONSTANTES
// ============================================================================

const DEFAULT_LOCATION = 'BODEGA_GRAL';
const LOCATION_STORAGE_KEY = 'last_loc';
const MAX_MULTIPLIER = 99;
const MIN_MULTIPLIER = 1;

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook para gestión de sesión de conteo
 *
 * @example
 * ```tsx
 * function CountingPage() {
 *   const {
 *     session,
 *     isBlindMode,
 *     multiplier,
 *     setMultiplier,
 *     currentLocation,
 *     setCurrentLocation,
 *     resetSession,
 *   } = useCountingSession(sessionId);
 *
 *   // ...
 * }
 * ```
 */
export function useCountingSession(sessionId: string | undefined): UseCountingSessionResult {
  // =========================================================================
  // ESTADO
  // =========================================================================

  const [session, setSession] = useState<SessionRow | null | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [multiplier, setMultiplierState] = useState(1);
  const [currentLocation, setCurrentLocationState] = useState(() => {
    return localStorage.getItem(LOCATION_STORAGE_KEY) || DEFAULT_LOCATION;
  });

  // =========================================================================
  // MODO
  // =========================================================================

  const { sessionId: parsedSessionId } = parseSessionId(sessionId);
  const isBlindMode = parsedSessionId.mode === 'blind';
  const sessionMode = parsedSessionId.mode;

  // =========================================================================
  // CARGA DE SESIÓN
  // =========================================================================

  useEffect(() => {
    if (!sessionId) {
      setSession(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const loadSession = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const loadedSession = await SessionRepository.getById(sessionId);

        if (!cancelled) {
          setSession(loadedSession || null);

          if (!loadedSession) {
            logger.warn('useCountingSession', 'Session not found', { sessionId });
          }
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Error loading session';
          setError(message);
          logger.error('useCountingSession', 'Failed to load session', {
            sessionId,
            error: message,
          });
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadSession();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  // =========================================================================
  // PERSISTENCIA DE UBICACIÓN
  // =========================================================================

  useEffect(() => {
    localStorage.setItem(LOCATION_STORAGE_KEY, currentLocation);
  }, [currentLocation]);

  // =========================================================================
  // MULTIPLICADOR
  // =========================================================================

  const setMultiplier = useCallback((value: number) => {
    const clampedValue = Math.max(MIN_MULTIPLIER, Math.min(MAX_MULTIPLIER, value));
    setMultiplierState(clampedValue);
  }, []);

  const incrementMultiplier = useCallback(() => {
    setMultiplier(multiplier + 1);
  }, [multiplier, setMultiplier]);

  const decrementMultiplier = useCallback(() => {
    setMultiplier(multiplier - 1);
  }, [multiplier, setMultiplier]);

  const resetMultiplier = useCallback(() => {
    setMultiplierState(1);
  }, [setMultiplier]);

  // =========================================================================
  // UBICACIÓN
  // =========================================================================

  const setCurrentLocation = useCallback((location: string) => {
    setCurrentLocationState(location);
  }, []);

  // =========================================================================
  // RESET DE SESIÓN
  // =========================================================================

  const resetSession = useCallback(async () => {
    if (!sessionId) return;

    try {
      // Limpiar datos de la sesión en IndexedDB
      await db.scans.where('sessionId').equals(sessionId).delete();

      // Resetear estado local
      setMultiplierState(1);

      toast.success('Sesión reseteada');
      logger.info('useCountingSession', 'Session reset', { sessionId });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error resetting session';
      toast.error('Error al resetear sesión');
      logger.error('useCountingSession', 'Failed to reset session', { sessionId, error: message });
      throw err;
    }
  }, [sessionId]);

  // =========================================================================
  // RETORNO
  // =========================================================================

  return {
    // Estado
    session,
    isLoading,
    error,

    // Modo
    isBlindMode,
    sessionMode,

    // Multiplicador
    multiplier,
    setMultiplier,
    incrementMultiplier,
    decrementMultiplier,
    resetMultiplier,

    // Ubicación
    currentLocation,
    setCurrentLocation,

    // Reset
    resetSession,
  };
}

export default useCountingSession;
