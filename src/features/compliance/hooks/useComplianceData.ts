import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../db';
import { differenceInDays } from 'date-fns';
import { Provider } from '../../../types';
import { expiryRepository } from '../../../repositories/ExpiryRepository';
import { useAppStore } from '../../../store/mainAppStore';

export interface ComplianceStats {
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

    const now = new Date();
    const riskItems: ComplianceStats['riskItems'] = [];

    expiries.forEach(item => {
      const qty = item.quantity || 0;
      const providerName = item.providerName || '';
      let provider = providerMap.get(providerName.toUpperCase()) || 
                       (providerName ? providerMap.get(providerName) : null);
                       
      if (!provider && providerName) {
        const cleanReqName = providerName.toUpperCase().trim();
        provider = providers.find(p => p.name.toUpperCase().includes(cleanReqName) || cleanReqName.includes(p.name.toUpperCase())) || null;
      }
      
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
      } else if (daysToWithdraw <= 10) {
        status = 'warning';
      } else {
        status = 'protected';
      }

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

    // Ordenar riesgos por urgencia (días para retiro)
    riskItems.sort((a, b) => a.daysToWithdraw - b.daysToWithdraw);

    return {
      riskItems
    };
  }, [tableName], {
    riskItems: []
  });
};
