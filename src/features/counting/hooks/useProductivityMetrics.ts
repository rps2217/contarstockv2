/**
 * useProductivityMetrics - Métricas y análisis de productividad en tiempo real
 *
 * Calcula y rastrea:
 * - Velocidad de conteo (items/min)
 * - Tendencia de productividad
 * - Accuracy rate
 * - Predicción de tiempo de finalización
 * - Comparación con sesiones anteriores
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { logger } from '@/services/logger';
import type { ConsolidatedItem } from '@/types';

// ============================================================================
// TIPOS
// ============================================================================

export interface ProductivityDataPoint {
  timestamp: number;
  itemsPerMinute: number;
  cumulativeItems: number;
  accuracy: number;
  trend: 'up' | 'down' | 'stable';
}

export interface ProductivityMetrics {
  // Tiempo
  startTime: number;
  elapsedTime: number; // ms
  estimatedTimeRemaining: number | null; // ms
  lastUpdated: number;

  // Velocidad
  currentRate: number; // items/min actual
  averageRate: number; // items/min promedio
  peakRate: number; // items/min máximo
  trend: 'up' | 'down' | 'stable';

  // Progreso
  totalItems: number;
  completedItems: number;
  remainingItems: number;
  progressPercent: number;

  // Accuracy
  accuracy: number; // % de items correctos
  errorCount: number;
  discrepancyCount: number;

  // Histórico
  dataPoints: ProductivityDataPoint[];
  previousSessionRate: number | null;
}

export interface SessionComparison {
  currentVsAverage: number; // % sobre promedio
  currentVsPrevious: number; // % sobre sesión anterior
  ranking: number; // Posición entre últimas 10 sesiones
}

interface UseProductivityMetricsOptions {
  /** Intervalo de actualización de métricas (ms) */
  updateInterval?: number;
  /** Número de puntos de datos a mantener */
  maxDataPoints?: number;
  /** Sesión ID para comparar con historial */
  sessionId?: string;
  /** Callback cuando se alcanza un milestone */
  onMilestone?: (milestone: string, metrics: ProductivityMetrics) => void;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const DEFAULT_UPDATE_INTERVAL = 5000; // 5 segundos
const DEFAULT_MAX_DATA_POINTS = 60; // 5 minutos de datos (60 * 5s)
const MILESTONES = [10, 25, 50, 100, 200, 500, 1000];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const formatDuration = (ms: number): string => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
};

const calculateTrend = (points: number[]): 'up' | 'down' | 'stable' => {
  if (points.length < 3) return 'stable';

  const recent = points.slice(-3);
  const older = points.slice(-6, -3);

  if (older.length === 0) return 'stable';

  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;

  const changePercent = ((recentAvg - olderAvg) / olderAvg) * 100;

  if (changePercent > 10) return 'up';
  if (changePercent < -10) return 'down';
  return 'stable';
};

// ============================================================================
// HOOK PRINCIPAL
// ============================================================================

export function useProductivityMetrics(
  items: ConsolidatedItem[],
  options: UseProductivityMetricsOptions = {}
) {
  const {
    updateInterval = DEFAULT_UPDATE_INTERVAL,
    maxDataPoints = DEFAULT_MAX_DATA_POINTS,
    onMilestone,
  } = options;

  const startTimeRef = useRef(Date.now());
  const lastUpdateRef = useRef(Date.now());
  const previousMilestonesRef = useRef<Set<number>>(new Set());
  const peakRateRef = useRef(0);
  const dataPointsRef = useRef<ProductivityDataPoint[]>([]);

  // Estado
  const [metrics, setMetrics] = useState<ProductivityMetrics>(() => ({
    startTime: startTimeRef.current,
    elapsedTime: 0,
    estimatedTimeRemaining: null,
    lastUpdated: Date.now(),
    currentRate: 0,
    averageRate: 0,
    peakRate: 0,
    trend: 'stable',
    totalItems: 0,
    completedItems: 0,
    remainingItems: 0,
    progressPercent: 0,
    accuracy: 100,
    errorCount: 0,
    discrepancyCount: 0,
    dataPoints: [],
    previousSessionRate: null,
  }));

  // Calcular métricas
  const calculateMetrics = useCallback(() => {
    const now = Date.now();
    const elapsed = now - startTimeRef.current;
    const itemsSoFar = items.length;

    // Velocidad actual (últimos 30 segundos)
    const recentWindow = 30000;
    const recentPoints = dataPointsRef.current.filter(p => now - p.timestamp < recentWindow);
    const currentRate =
      recentPoints.length > 0
        ? recentPoints[recentPoints.length - 1]?.itemsPerMinute || 0
        : itemsSoFar / (elapsed / 60000);

    // Velocidad promedio
    const averageRate = elapsed > 0 ? (itemsSoFar / elapsed) * 60000 : 0;

    // Peak rate
    if (currentRate > peakRateRef.current) {
      peakRateRef.current = currentRate;
    }

    // Tendencia basada en últimos puntos
    const rateHistory = dataPointsRef.current.map(p => p.itemsPerMinute);
    const trend = calculateTrend(rateHistory);

    // Accuracy (items sin discrepancia)
    const itemsWithExpected = items.filter(i => i.expectedQuantity !== undefined);
    const correctItems = itemsWithExpected.filter(
      i =>
        Math.abs(i.totalQuantity - (i.expectedQuantity || 0)) <=
        Math.ceil((i.expectedQuantity || 0) * 0.05)
    );
    const accuracy =
      itemsWithExpected.length > 0 ? (correctItems.length / itemsWithExpected.length) * 100 : 100;

    // Discrepancias
    const discrepancies = itemsWithExpected.filter(
      i =>
        Math.abs(i.totalQuantity - (i.expectedQuantity || 0)) >
        Math.ceil((i.expectedQuantity || 0) * 0.05)
    );

    // Tiempo restante estimado (basado en velocidad actual)
    const estimatedTimeRemaining =
      currentRate > 0 && metrics.totalItems > 0
        ? ((metrics.totalItems - itemsSoFar) / currentRate) * 60000
        : null;

    // Check milestones
    const previousCount =
      previousMilestonesRef.current.size > 0
        ? Array.from(previousMilestonesRef.current).pop() || 0
        : 0;

    for (const milestone of MILESTONES) {
      if (itemsSoFar >= milestone && previousCount < milestone) {
        previousMilestonesRef.current.add(milestone);
        onMilestone?.(`🎉 ${milestone} items contados!`, {
          ...metrics,
          completedItems: itemsSoFar,
        });
        break;
      }
    }

    return {
      startTime: startTimeRef.current,
      elapsedTime: elapsed,
      estimatedTimeRemaining,
      lastUpdated: now,
      currentRate: Math.round(currentRate * 10) / 10,
      averageRate: Math.round(averageRate * 10) / 10,
      peakRate: Math.round(peakRateRef.current * 10) / 10,
      trend,
      totalItems: metrics.totalItems || itemsSoFar,
      completedItems: itemsSoFar,
      remainingItems: Math.max(0, (metrics.totalItems || itemsSoFar) - itemsSoFar),
      progressPercent:
        metrics.totalItems > 0 ? Math.round((itemsSoFar / metrics.totalItems) * 100) : 100,
      accuracy: Math.round(accuracy * 10) / 10,
      errorCount: discrepancies.filter(
        d =>
          Math.abs(d.totalQuantity - (d.expectedQuantity || 0)) > (d.expectedQuantity || 0) * 0.25
      ).length,
      discrepancyCount: discrepancies.length,
      dataPoints: dataPointsRef.current,
      previousSessionRate: metrics.previousSessionRate,
    };
  }, [items, metrics.totalItems, onMilestone]);

  // Actualizar métricas periódicamente
  useEffect(() => {
    const interval = setInterval(() => {
      const newMetrics = calculateMetrics();

      // Agregar data point
      dataPointsRef.current.push({
        timestamp: Date.now(),
        itemsPerMinute: newMetrics.currentRate,
        cumulativeItems: newMetrics.completedItems,
        accuracy: newMetrics.accuracy,
        trend: newMetrics.trend,
      });

      // Limitar puntos de datos
      if (dataPointsRef.current.length > maxDataPoints) {
        dataPointsRef.current = dataPointsRef.current.slice(-maxDataPoints);
      }

      setMetrics(newMetrics);
    }, updateInterval);

    return () => clearInterval(interval);
  }, [calculateMetrics, updateInterval, maxDataPoints]);

  // Reiniciar métricas
  const reset = useCallback(() => {
    startTimeRef.current = Date.now();
    peakRateRef.current = 0;
    dataPointsRef.current = [];
    previousMilestonesRef.current.clear();
    lastUpdateRef.current = Date.now();

    setMetrics(prev => ({
      ...prev,
      startTime: startTimeRef.current,
      elapsedTime: 0,
    }));
  }, []);

  // Establecer total de items esperado
  const setTotalItems = useCallback((total: number) => {
    setMetrics(prev => ({
      ...prev,
      totalItems: total,
      remainingItems: total - prev.completedItems,
      progressPercent:
        prev.completedItems > 0 ? Math.round((prev.completedItems / total) * 100) : 0,
    }));
  }, []);

  // Comparación con sesión anterior
  const comparison = useMemo((): SessionComparison | null => {
    if (!metrics.previousSessionRate) return null;

    const currentVsAverage =
      metrics.averageRate > 0
        ? ((metrics.averageRate - metrics.previousSessionRate) / metrics.previousSessionRate) * 100
        : 0;

    return {
      currentVsAverage: Math.round(currentVsAverage),
      currentVsPrevious: Math.round(currentVsAverage), // Simplificado por ahora
      ranking: 1, // TODO: Calcular basado en historial
    };
  }, [metrics.averageRate, metrics.previousSessionRate]);

  return {
    metrics,
    comparison,
    reset,
    setTotalItems,
    // Formateadores útiles
    formatElapsed: () => formatDuration(metrics.elapsedTime),
    formatRemaining: () =>
      metrics.estimatedTimeRemaining ? formatDuration(metrics.estimatedTimeRemaining) : null,
  };
}

// ============================================================================
// UTILIDADES
// ============================================================================

/**
 * Calcular resumen de productividad para exportar
 */
export function generateProductivityReport(
  metrics: ProductivityMetrics,
  sessionName: string
): string {
  const lines = [
    `# Reporte de Productividad: ${sessionName}`,
    `Fecha: ${new Date(metrics.startTime).toLocaleString()}`,
    ``,
    `## Métricas`,
    `- Items contados: ${metrics.completedItems}`,
    `- Tiempo total: ${formatDuration(metrics.elapsedTime)}`,
    `- Velocidad promedio: ${metrics.averageRate} items/min`,
    `- Velocidad pico: ${metrics.peakRate} items/min`,
    `- Tendencia: ${metrics.trend}`,
    ``,
    `## Accuracy`,
    `- Accuracy: ${metrics.accuracy}%`,
    `- Errores: ${metrics.errorCount}`,
    `- Discrepancias: ${metrics.discrepancyCount}`,
  ];

  if (metrics.estimatedTimeRemaining) {
    lines.push(``);
    lines.push(`## Tiempo Remaining`);
    lines.push(`- Estimado: ${formatDuration(metrics.estimatedTimeRemaining)}`);
  }

  return lines.join('\n');
}

export default useProductivityMetrics;
