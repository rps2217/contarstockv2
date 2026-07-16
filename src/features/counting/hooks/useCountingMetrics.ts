/**
 * useCountingMetrics - Hook para métricas de productividad en tiempo real
 *
 * Proporciona:
 * - SKUs escaneados / esperados (%)
 * - Velocidad promedio (SKUs/minuto)
 * - Tendencia (subiendo/bajando/estable)
 * - Tiempo transcurrido
 * - Proyección de finalización
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { logger } from '@/services/logger';

export interface CountingMetrics {
  // Conteo
  skusScanned: number;
  expectedSkus: number;
  progressPercent: number;

  // Velocidad
  scanRate: number; // SKUs por minuto
  averageRate: number; // Promedio total
  trend: 'up' | 'down' | 'stable';

  // Tiempo
  elapsedSeconds: number;
  estimatedRemainingSeconds: number;
  projectedFinishTime: Date | null;

  // Calidad
  errorCount: number;
  duplicateCount: number;
  errorRate: number;
}

interface UseCountingMetricsOptions {
  expectedSkus?: number;
  updateIntervalMs?: number;
  trendWindowSize?: number; // Cantidad de muestreos para calcular tendencia
}

interface ScanEvent {
  timestamp: number;
  count: number;
}

export function useCountingMetrics(options: UseCountingMetricsOptions = {}) {
  const { expectedSkus = 0, updateIntervalMs = 1000, trendWindowSize = 5 } = options;

  // Estado
  const [metrics, setMetrics] = useState<CountingMetrics>({
    skusScanned: 0,
    expectedSkus,
    progressPercent: 0,
    scanRate: 0,
    averageRate: 0,
    trend: 'stable',
    elapsedSeconds: 0,
    estimatedRemainingSeconds: 0,
    projectedFinishTime: null,
    errorCount: 0,
    duplicateCount: 0,
    errorRate: 0,
  });

  const [scanEvents, setScanEvents] = useState<ScanEvent[]>([]);
  const [startTime] = useState(() => Date.now());

  // Refs
  const lastUpdateRef = useRef(Date.now());
  const totalScansRef = useRef(0);

  // Registrar un nuevo escaneo
  const recordScan = useCallback(
    (count: number = 1) => {
      setScanEvents(prev => {
        const newEvents = [...prev, { timestamp: Date.now(), count }];
        // Mantener solo los últimos N eventos para calcular tendencia
        const trimmed = newEvents.slice(-trendWindowSize * 10);
        return trimmed;
      });
      totalScansRef.current += count;
    },
    [trendWindowSize]
  );

  // Registrar error
  const recordError = useCallback(() => {
    setMetrics(prev => ({
      ...prev,
      errorCount: prev.errorCount + 1,
      errorRate: ((prev.errorCount + 1) / Math.max(1, totalScansRef.current)) * 100,
    }));
  }, []);

  // Registrar duplicado
  const recordDuplicate = useCallback(() => {
    setMetrics(prev => ({
      ...prev,
      duplicateCount: prev.duplicateCount + 1,
    }));
  }, []);

  // Actualizar métricas cada intervalo
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const elapsedSeconds = Math.floor((now - startTime) / 1000);

      // Calcular eventos en el último minuto
      const oneMinuteAgo = now - 60000;
      const recentEvents = scanEvents.filter(e => e.timestamp >= oneMinuteAgo);
      const recentScans = recentEvents.reduce((sum, e) => sum + e.count, 0);
      const scanRate = recentScans; // SKUs por minuto

      // Calcular tasa promedio
      const averageRate = elapsedSeconds > 0 ? totalScansRef.current / (elapsedSeconds / 60) : 0;

      // Calcular tendencia
      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (scanEvents.length >= trendWindowSize * 2) {
        const half = Math.floor(scanEvents.length / 2);
        const firstHalf = scanEvents.slice(0, half);
        const secondHalf = scanEvents.slice(half);

        const firstRate = firstHalf.reduce((s, e) => s + e.count, 0) / Math.max(1, half);
        const secondRate =
          secondHalf.reduce((s, e) => s + e.count, 0) / Math.max(1, scanEvents.length - half);

        const diff = secondRate - firstRate;
        if (diff > 0.5) trend = 'up';
        else if (diff < -0.5) trend = 'down';
      }

      // Calcular progreso
      const progressPercent =
        expectedSkus > 0 ? Math.min(100, (totalScansRef.current / expectedSkus) * 100) : 0;

      // Estimar tiempo restante
      let estimatedRemainingSeconds = 0;
      let projectedFinishTime: Date | null = null;

      if (scanRate > 0 && expectedSkus > 0) {
        const remaining = expectedSkus - totalScansRef.current;
        estimatedRemainingSeconds = Math.floor((remaining / scanRate) * 60);
        projectedFinishTime = new Date(now + estimatedRemainingSeconds * 1000);
      }

      setMetrics({
        skusScanned: totalScansRef.current,
        expectedSkus,
        progressPercent,
        scanRate,
        averageRate,
        trend,
        elapsedSeconds,
        estimatedRemainingSeconds,
        projectedFinishTime,
        errorCount: metrics.errorCount,
        duplicateCount: metrics.duplicateCount,
        errorRate: metrics.errorRate,
      });

      lastUpdateRef.current = now;
    }, updateIntervalMs);

    return () => clearInterval(interval);
  }, [
    scanEvents,
    startTime,
    expectedSkus,
    updateIntervalMs,
    trendWindowSize,
    metrics.errorCount,
    metrics.duplicateCount,
    metrics.errorRate,
  ]);

  // Formatear tiempo
  const formatDuration = useCallback((seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  }, []);

  return {
    metrics,
    recordScan,
    recordError,
    recordDuplicate,
    formatDuration,
    // Getters útiles
    isComplete: expectedSkus > 0 && totalScansRef.current >= expectedSkus,
    isOnTrack: metrics.scanRate >= metrics.averageRate * 0.8,
  };
}
