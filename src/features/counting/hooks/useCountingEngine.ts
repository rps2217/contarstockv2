/**
 * useCountingEngine - Hook centralizado para el módulo de conteo unificado
 * 
 * Este hook proporciona una API unificada para iniciar y gestionar conteos
 * tanto en modo ciego (Hammer) como con carga teórica (Counting).
 * 
 * Maneja:
 * - Creación de sesiones (blind vs theoretical)
 * - Gestión de batch IDs para modo ciego
 * - Importación de cargas teóricas
 * - Registro de vencimiento
 * - Sincronización con la nube
 */

import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useLiveQuery } from 'dexie-react-hooks';

import type { StartCountingConfig } from '../components/StartCountingModal';
import { SessionRepository } from '@/repositories/SessionRepository';
import { HammerDbRepository } from '@/repositories/HammerDbRepository';
import { ExpectedOrderRepository } from '@/repositories/ExpectedOrderRepository';
import { erpService } from '@/services/erpService';
import { 
  importManifestFromCloud, 
  importExpectedOrderFromCloud, 
  importLocalExpectedOrderToHammer,
  migrateMassiveToMaster 
} from '@/services/hammerSync';
import { generateUUID } from '@/services/utils';
import * as sessionService from '@/services/sessionService';
import { logger } from '@/services/logger';

// ============================================================================
// TIPOS
// ============================================================================

export type CountingMode = 'blind' | 'theoretical';

export interface CountingSessionInfo {
  id: string;
  mode: CountingMode;
  batchId?: string;
  sessionId?: string;
  theoreticalOrderId?: string;
  theoreticalOrderName?: string;
  registerExpiry: boolean;
  createdAt: number;
}

export interface UseCountingEngineReturn {
  // Estado
  isStarting: boolean;
  currentSession: CountingSessionInfo | null;
  
  // Acciones
  startCounting: (config: StartCountingConfig) => Promise<void>;
  resumeSession: (sessionId: string) => Promise<void>;
  clearSession: () => void;
  
  // Utilidades
  generateBatchId: () => string;
  isBlindMode: (sessionId: string) => boolean;
}

// ============================================================================
// HOOK PRINCIPAL
// ============================================================================

export const useCountingEngine = (): UseCountingEngineReturn => {
  const navigate = useNavigate();
  
  const [isStarting, setIsStarting] = useState(false);
  const [currentSession, setCurrentSession] = useState<CountingSessionInfo | null>(null);

  // Generar batchId único para modo ciego
  const generateBatchId = useCallback((): string => {
    const uuid = generateUUID();
    return `HM-${uuid.substring(0, 8).toUpperCase()}`;
  }, []);

  // Verificar si es modo ciego
  const isBlindMode = useCallback((sessionId: string): boolean => {
    return sessionId.startsWith('HM-');
  }, []);

  // ============================================================================
  // INICIAR CONTEO
  // ============================================================================

  const startCounting = useCallback(async (config: StartCountingConfig): Promise<void> => {
    setIsStarting(true);

    try {
      if (config.mode === 'blind') {
        // Modo Ciego - Usar HammerDbRepository
        const batchId = generateBatchId();
        
        setCurrentSession({
          id: batchId,
          mode: 'blind',
          batchId,
          registerExpiry: config.registerExpiry,
          createdAt: Date.now(),
        });

        // Navegar al modo ciego con flag para omitir modal de inicio
        navigate(`/massive/${batchId}?expiry=${config.registerExpiry ? '1' : '0'}&skipModal=true`);
        
        toast.success('Conteo ciego iniciado', {
          description: config.registerExpiry 
            ? 'Modo ráfaga con registro de vencimiento' 
            : 'Modo ráfaga rápido',
        });

      } else {
        // Modo Teórico - Usar sessionService.createSession
        
        // Crear sesión usando el servicio
        const session = await sessionService.createSession(
          config.theoreticalOrderName || config.theoreticalOrderId || 'COUNTING',
          `LOC-${Date.now()}`,
          'standard'
        );

        setCurrentSession({
          id: session.id,
          mode: 'theoretical',
          sessionId: session.id,
          theoreticalOrderId: config.theoreticalOrderId,
          theoreticalOrderName: config.theoreticalOrderName,
          registerExpiry: true, // Siempre requiere vencimiento con teórico
          createdAt: Date.now(),
        });

        // Importar la carga teórica según la fuente
        if (config.theoreticalOrderId) {
          try {
            switch (config.theoreticalSource) {
              case 'local':
                await importLocalExpectedOrderToHammer(session.id, config.theoreticalOrderId);
                break;
              case 'cloud':
                await importExpectedOrderFromCloud(session.id, config.theoreticalOrderId);
                break;
              case 'stock':
                await importManifestFromCloud(session.id);
                break;
            }
            
            // Migrar datos de blindManifests a session_items
            await migrateMassiveToMaster(session.id);
            
          } catch (importError) {
            logger.error('CountingEngine', 'Error importing theoretical load', { 
              error: importError instanceof Error ? importError.message : String(importError) 
            });
            toast.error('Error al importar carga teórica', {
              description: 'El conteo se inició pero sin la carga teórica',
            });
          }
        }

        // Navegar al modo conteo
        navigate(`/counting/${session.id}`);
        
        toast.success('Conteo con carga teórica iniciado', {
          description: `Usando: ${config.theoreticalOrderName || config.theoreticalOrderId}`,
        });
      }

    } catch (error) {
      logger.error('CountingEngine', 'Error starting counting', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      toast.error('Error al iniciar conteo');
      throw error;
    } finally {
      setIsStarting(false);
    }
  }, [navigate, generateBatchId]);

  // ============================================================================
  // REANUDAR SESIÓN EXISTENTE
  // ============================================================================

  const resumeSession = useCallback(async (sessionId: string): Promise<void> => {
    setIsStarting(true);

    try {
      if (isBlindMode(sessionId)) {
        // Sesión de modo ciego
        navigate(`/massive/${sessionId}`);
      } else {
        // Sesión de modo teórico
        navigate(`/counting/${sessionId}`);
      }
    } catch (error) {
      logger.error('CountingEngine', 'Error resuming session', { 
        error: error instanceof Error ? error.message : String(error),
        sessionId 
      });
      toast.error('Error al reanudar la sesión');
    } finally {
      setIsStarting(false);
    }
  }, [navigate, isBlindMode]);

  // ============================================================================
  // LIMPIAR SESIÓN
  // ============================================================================

  const clearSession = useCallback(() => {
    setCurrentSession(null);
  }, []);

  return {
    isStarting,
    currentSession,
    startCounting,
    resumeSession,
    clearSession,
    generateBatchId,
    isBlindMode,
  };
};

// ============================================================================
// HOOK PARA CONSULTAR SESIONES ACTIVAS
// ============================================================================

export interface SessionSummary {
  id: string;
  mode: CountingMode;
  itemCount: number;
  lastActivity: number;
  hasTheoretical: boolean;
}

export const useActiveSessions = (): {
  blindSessions: { batchId: string; scanCount: number; manifestCount: number; lastActivity: number }[];
  theoreticalSessions: { id: string; name: string; itemCount: number; lastActivity: number }[];
  isLoading: boolean;
} => {
  // Consultar sesiones ciegas activas
  const blindSessionsData = useLiveQuery(async () => {
    try {
      // Obtener batch IDs únicos
      const db = (await import('@/db')).db;
      const scans = await db.blindScans.toArray();
      const manifests = await db.blindManifests.toArray();
      
      const batchMap = new Map<string, {
        batchId: string;
        scanCount: number;
        manifestCount: number;
        lastActivity: number;
      }>();

      // Agregar escaneos por batch
      scans.forEach(scan => {
        const existing = batchMap.get(scan.batchId) || { 
          batchId: scan.batchId, 
          scanCount: 0, 
          manifestCount: 0, 
          lastActivity: scan.timestamp 
        };
        existing.scanCount++;
        existing.lastActivity = Math.max(existing.lastActivity, scan.timestamp);
        batchMap.set(scan.batchId, existing);
      });

      // Agregar manifests por batch
      manifests.forEach(manifest => {
        const existing = batchMap.get(manifest.batchId) || { 
          batchId: manifest.batchId, 
          scanCount: 0, 
          manifestCount: 0, 
          lastActivity: 0 
        };
        existing.manifestCount++;
        batchMap.set(manifest.batchId, existing);
      });

      return Array.from(batchMap.values());
    } catch (error) {
      logger.error('CountingEngine', 'Error fetching blind sessions', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      return [];
    }
  }, []);

  // Consultar sesiones teóricas activas
  const theoreticalSessionsData = useLiveQuery(async () => {
    try {
      const sessions = await SessionRepository.getByStatus('active');
      return sessions.map(session => ({
        id: session.id,
        name: session.erpOrder || `Sesión ${session.id.slice(0, 8)}`,
        itemCount: session.totalSKUs || 0,
        lastActivity: session.createdAt,
      }));
    } catch (error) {
      logger.error('CountingEngine', 'Error fetching theoretical sessions', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      return [];
    }
  }, []);

  return {
    blindSessions: blindSessionsData || [],
    theoreticalSessions: theoreticalSessionsData || [],
    isLoading: blindSessionsData === undefined || theoreticalSessionsData === undefined,
  };
};

// ============================================================================
// HOOK PARA OBTENER INFO DE SESIÓN
// ============================================================================

export const useSessionInfo = (sessionId: string | undefined) => {
  return useLiveQuery(async () => {
    if (!sessionId) return null;

    if (sessionId.startsWith('HM-')) {
      // Modo ciego
      const counts = await HammerDbRepository.getBatchCounts(sessionId);
      return {
        mode: 'blind' as CountingMode,
        batchId: sessionId,
        scanCount: counts.scans,
        manifestCount: counts.manifests,
        lastActivity: 0,
      };
    } else {
      // Modo teórico
      const session = await SessionRepository.getById(sessionId);
      return {
        mode: 'theoretical' as CountingMode,
        sessionId,
        scanCount: session?.totalSKUs || 0,
        hasTheoretical: !!session?.expectedItems?.length,
        lastActivity: session?.createdAt || 0,
      };
    }
  }, [sessionId]);
};

export default useCountingEngine;
