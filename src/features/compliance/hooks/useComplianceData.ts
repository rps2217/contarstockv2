import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../db';
import { differenceInDays } from 'date-fns';
import { Provider } from '../../../types';
import { expiryRepository } from '../../../repositories/ExpiryRepository';
import { useAppStore } from '../../../store/mainAppStore';

export interface ComplianceStats {
  criticalAlertsCount: number;
  upcomingRetiralsCount: number;
  totalUnitsAtRisk: number;
  providerPolicyHealth: number;
  riskItems: {
    barcode: string;
    name: string;
    expiryDate: string;
    daysToWithdraw: number;
    quantity: number;
    providerName: string;
    status: 'critical' | 'warning' | 'protected';
    hasExchange: boolean;
  }[];
  statusDistribution: {
    label: string;
    value: number;
    color: string;
  }[];
}

export const useComplianceData = () => {
  const { settings } = useAppStore();
  const tableName = settings?.cloudConfig?.inventoryRegistryTableName || 
                    settings?.cloudConfig?.expiryTableName || 
                    'VENCIMIENTOS';

  return useLiveQuery(async (): Promise<ComplianceStats> => {
    const expiries = await expiryRepository.getAll(tableName);
    const providers = await db.providers.toArray();
    
    const providerMap = new Map<string, Provider>();
    providers.forEach(p => {
      providerMap.set(p.rut, p);
      if (p.name) providerMap.set(p.name.toUpperCase(), p);
    });

    let criticalAlertsCount = 0;
    let upcomingRetiralsCount = 0;
    let totalUnitsAtRisk = 0;
    
    const now = new Date();
    const riskItems: ComplianceStats['riskItems'] = [];
    
    let criticalCount = 0;
    let warningCount = 0;
    let okCount = 0;

    expiries.forEach(item => {
      const qty = item.quantity || 0;
      
      const providerName = item.providerName || '';
      const provider = providerMap.get(providerName.toUpperCase()) || 
                       (providerName ? providerMap.get(providerName) : null);
      
      const withdrawalDays = provider?.withdrawalDays ?? 0;
      const hasExchange = provider?.hasExchange ?? true;

      // Calcular fecha de vencimiento
      const expiryDate = new Date(item.yyyy, item.mm - 1, 1);
      const withdrawalDate = new Date(expiryDate);
      withdrawalDate.setDate(withdrawalDate.getDate() - withdrawalDays);
      
      const daysToWithdraw = differenceInDays(withdrawalDate, now);
      
      let status: 'critical' | 'warning' | 'protected' = 'protected';
      
      if (daysToWithdraw < 0) {
        status = 'critical';
        criticalCount++;
        criticalAlertsCount++;
      } else if (daysToWithdraw <= 10) {
        status = 'warning';
        warningCount++;
        upcomingRetiralsCount++;
      } else {
        status = 'protected';
        okCount++;
      }

      totalUnitsAtRisk += qty;
      
      riskItems.push({
        barcode: item.barcode,
        name: item.productName,
        expiryDate: `${item.mm}/${item.yyyy}`,
        daysToWithdraw,
        quantity: qty,
        providerName: provider?.name || item.providerName || 'Desconocido',
        status,
        hasExchange
      });
    });

    // Ordenar riesgos por urgencia
    riskItems.sort((a, b) => a.daysToWithdraw - b.daysToWithdraw);

    return {
      criticalAlertsCount,
      upcomingRetiralsCount,
      totalUnitsAtRisk,
      providerPolicyHealth: providers.length > 0 ? Math.round((providers.filter(p => p.hasExchange).length / providers.length) * 100) : 100,
      riskItems: riskItems.slice(0, 50),
      statusDistribution: [
        { label: 'Fuera de Plazo', value: criticalCount, color: '#f43f5e' },
        { label: 'Próximos Retiros', value: warningCount, color: '#f59e0b' },
        { label: 'En Plazo', value: okCount, color: '#10b981' }
      ]
    };
  }, [tableName], {
    criticalAlertsCount: 0,
    upcomingRetiralsCount: 0,
    totalUnitsAtRisk: 0,
    providerPolicyHealth: 100,
    riskItems: [],
    statusDistribution: []
  });
};
