/**
 * Stats Utilities - Patrón común para calcular estadísticas
 * 
 * Unifica las múltiples implementaciones de calculateStats en los diferentes
 * módulos (counting, expiry, inventory, etc.)
 */

export interface BaseStats {
  total: number;
  today: number;
  thisWeek: number;
  thisMonth: number;
}

export interface DateStats {
  createdAt?: number;
  updatedAt?: number;
  timestamp?: number;
}

/**
 * Calcula estadísticas de un conjunto de elementos con timestamps
 */
export function calculateStats<T extends DateStats>(
  items: T[],
  dateField: keyof DateStats = 'createdAt'
): BaseStats {
  if (!items || items.length === 0) {
    return { total: 0, today: 0, thisWeek: 0, thisMonth: 0 };
  }

  const now = Date.now();
  const dayStart = new Date().setHours(0, 0, 0, 0);
  const weekStart = dayStart - 7 * 24 * 60 * 60 * 1000;
  const monthStart = new Date(new Date().setDate(1)).setHours(0, 0, 0, 0);

  return {
    total: items.length,
    today: items.filter(item => {
      const ts = item[dateField] as number | undefined;
      return ts !== undefined && ts >= dayStart;
    }).length,
    thisWeek: items.filter(item => {
      const ts = item[dateField] as number | undefined;
      return ts !== undefined && ts >= weekStart;
    }).length,
    thisMonth: items.filter(item => {
      const ts = item[dateField] as number | undefined;
      return ts !== undefined && ts >= monthStart;
    }).length,
  };
}

/**
 * Calcula estadísticas por estado
 */
export function calculateStatusStats<T extends { status?: string }>(
  items: T[]
): Record<string, number> {
  return items.reduce((acc, item) => {
    const status = item.status || 'unknown';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}

/**
 * Calcula estadísticas con suma de valores numéricos
 */
export function calculateValueStats(
  items: Record<string, unknown>[],
  valueField: string
): { total: number; average: number; min: number; max: number } {
  if (!items || items.length === 0) {
    return { total: 0, average: 0, min: 0, max: 0 };
  }

  const values: number[] = [];
  for (const item of items) {
    const value = item[valueField];
    if (typeof value === 'number' && !isNaN(value)) {
      values.push(value);
    }
  }

  if (values.length === 0) {
    return { total: 0, average: 0, min: 0, max: 0 };
  }

  const total = values.reduce((sum, v) => sum + v, 0);
  return {
    total,
    average: total / values.length,
    min: Math.min(...values),
    max: Math.max(...values),
  };
}
