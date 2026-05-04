import { db } from '../db';
import { ScanRepository } from '../repositories/ScanRepository';

export class AnalyticService {
  /**
   * Obtiene el total de unidades escaneadas hoy de forma eficiente.
   * Evita cargar todos los registros en memoria usando .each()
   */
  static async getTotalUnitsToday(): Promise<number> {
    const startOfDay = new Date().setHours(0, 0, 0, 0);
    let total = 0;
    
    // Optimizamos usando each para no crear un array masivo en memoria
    await db.scans
      .where('timestamp')
      .aboveOrEqual(startOfDay)
      .each(scan => {
        total += (scan.quantity || 0);
      });
      
    return total;
  }

  /**
   * Obtiene la serie histórica de los últimos 7 días.
   * Procesa los datos por flujo para minimizar el impacto en el Main Thread.
   */
  static async getWeeklyTrend(): Promise<{ date: string, v: number }[]> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);
    
    const groups: Record<string, number> = {};
    
    await db.scans
      .where('timestamp')
      .aboveOrEqual(sevenDaysAgo.getTime())
      .each(scan => {
        const date = new Date(scan.timestamp).toISOString().split('T')[0];
        groups[date] = (groups[date] || 0) + (scan.quantity || 0);
      });

    // Aseguramos que el resultado esté ordenado por fecha
    return Object.entries(groups)
      .map(([date, v]) => ({ date, v }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Obtiene un resumen de productividad por hora del día actual.
   */
  static async getTodayHourlyDistribution(): Promise<{ hour: number, count: number }[]> {
    const startOfDay = new Date().setHours(0, 0, 0, 0);
    const distribution: Record<number, number> = {};
    
    await db.scans
      .where('timestamp')
      .aboveOrEqual(startOfDay)
      .each(scan => {
        const hour = new Date(scan.timestamp).getHours();
        distribution[hour] = (distribution[hour] || 0) + (scan.quantity || 0);
      });
      
    return Object.entries(distribution).map(([hour, count]) => ({
      hour: parseInt(hour),
      count
    }));
  }
}
