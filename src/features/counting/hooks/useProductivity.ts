/**
 * useProductivity - Hook para métricas de productividad en tiempo real
 * 
 * Calcula estadísticas como:
 * - Items por minuto
 * - Tiempo promedio por item
 * - Tendencia (¿va más rápido o más lento?)
 * - Duración de la sesión
 * - Mejor ritmo (bestPace)
 */

import { useState, useEffect, useRef, useMemo } from 'react';

export interface ProductivityStats {
  totalItems: number;
  totalQuantity: number;
  itemsPerMinute: number;
  averageTimePerItem: number; // ms
  sessionDuration: number; // segundos
  trend: 'increasing' | 'stable' | 'decreasing';
  trendPercent: number; // % de cambio vs promedio
  lastScanTime: number | null;
  bestPace: number; // Mejor items/min registrado
  fatigueLevel: 'fresh' | 'normal' | 'tired'; // Nivel de fatiga estimado
}

interface ScanEvent {
  timestamp: number;
  quantity: number;
}

// Thresholds para fatiga
const FATIGUE_THRESHOLDS = {
  DECELERATING_FOR_MINUTES: 2, // Minutos antes de marcar cansancio
  TREND_DECLINE_FOR_FATIGUE: -15 // % de caída para marcar cansancio
};

export const useProductivity = (items: { barcode: string; totalQuantity: number }[]) => {
  const [scanHistory, setScanHistory] = useState<ScanEvent[]>([]);
  const sessionStartRef = useRef<number>(Date.now());
  const lastItemsCountRef = useRef<number>(0);
  const bestPaceRef = useRef<number>(0);
  const fatigueStartRef = useRef<number | null>(null);

  // Track new items added
  useEffect(() => {
    const currentCount = items.length;
    if (currentCount > lastItemsCountRef.current) {
      // New item added
      const newItems = currentCount - lastItemsCountRef.current;
      setScanHistory(prev => [
        ...prev.slice(-49), // Keep last 50 events
        { timestamp: Date.now(), quantity: newItems }
      ]);
    }
    lastItemsCountRef.current = currentCount;
  }, [items.length]);

  // Calculate stats
  const stats = useMemo<ProductivityStats>(() => {
    const now = Date.now();
    const sessionDuration = Math.floor((now - sessionStartRef.current) / 1000);
    
    // Calculate items per minute (using last 10 scans for accuracy)
    const recentScans = scanHistory.slice(-10);
    let itemsPerMinute = 0;
    let averageTimePerItem = 0;
    let trend: 'increasing' | 'stable' | 'decreasing' = 'stable';
    let trendPercent = 0;

    if (recentScans.length >= 2) {
      const firstScan = recentScans[0];
      const lastScan = recentScans[recentScans.length - 1];
      const timeSpan = (lastScan.timestamp - firstScan.timestamp) / 1000 / 60; // minutes
      
      if (timeSpan > 0) {
        itemsPerMinute = recentScans.length / timeSpan;
        averageTimePerItem = (timeSpan * 60 * 1000) / recentScans.length;
      }

      // Calculate trend by comparing first half vs second half
      const midpoint = Math.floor(recentScans.length / 2);
      const firstHalf = recentScans.slice(0, midpoint);
      const secondHalf = recentScans.slice(midpoint);
      
      if (firstHalf.length > 0 && secondHalf.length > 0) {
        const firstHalfTime = firstHalf.length > 1 
          ? (firstHalf[firstHalf.length - 1].timestamp - firstHalf[0].timestamp) / 1000 / 60 
          : 0;
        const secondHalfTime = secondHalf.length > 1 
          ? (secondHalf[secondHalf.length - 1].timestamp - secondHalf[0].timestamp) / 1000 / 60 
          : 0;

        if (firstHalfTime > 0 && secondHalfTime > 0) {
          const firstRate = firstHalf.length / firstHalfTime;
          const secondRate = secondHalf.length / secondHalfTime;
          
          if (secondRate > firstRate * 1.1) {
            trend = 'increasing';
            trendPercent = Math.round(((secondRate - firstRate) / firstRate) * 100);
          } else if (secondRate < firstRate * 0.9) {
            trend = 'decreasing';
            trendPercent = Math.round(((firstRate - secondRate) / firstRate) * 100);
          }
        }
      }
    }

    // Update best pace
    if (itemsPerMinute > bestPaceRef.current) {
      bestPaceRef.current = itemsPerMinute;
    }

    // Calculate fatigue level
    let fatigueLevel: 'fresh' | 'normal' | 'tired' = 'normal';
    if (trend === 'decreasing' && trendPercent < FATIGUE_THRESHOLDS.TREND_DECLINE_FOR_FATIGUE) {
      if (fatigueStartRef.current === null) {
        fatigueStartRef.current = now;
      } else if ((now - fatigueStartRef.current) / 60000 >= FATIGUE_THRESHOLDS.DECELERATING_FOR_MINUTES) {
        fatigueLevel = 'tired';
      }
    } else {
      fatigueStartRef.current = null;
      if (trend === 'increasing' && trendPercent > 10) {
        fatigueLevel = 'fresh';
      }
    }

    const totalQuantity = items.reduce((acc, item) => acc + item.totalQuantity, 0);

    return {
      totalItems: items.length,
      totalQuantity,
      itemsPerMinute: Math.round(itemsPerMinute * 10) / 10,
      averageTimePerItem: Math.round(averageTimePerItem),
      sessionDuration,
      trend,
      trendPercent,
      lastScanTime: scanHistory.length > 0 ? scanHistory[scanHistory.length - 1].timestamp : null,
      bestPace: Math.round(bestPaceRef.current * 10) / 10,
      fatigueLevel,
    };
  }, [items, scanHistory]);

  // Reset session
  const resetSession = () => {
    sessionStartRef.current = Date.now();
    lastItemsCountRef.current = 0;
    bestPaceRef.current = 0;
    fatigueStartRef.current = null;
    setScanHistory([]);
  };

  // Format duration
  const formattedDuration = useMemo(() => {
    const minutes = Math.floor(stats.sessionDuration / 60);
    const seconds = stats.sessionDuration % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, [stats.sessionDuration]);

  return {
    stats,
    formattedDuration,
    resetSession,
  };
};
