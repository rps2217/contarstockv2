import { useLiveQuery, useLiveQuery as useLQ } from 'dexie-react-hooks';
import { ProviderRepository } from '../../../repositories/ProviderRepository';
import { differenceInDays } from 'date-fns';
import { Provider } from '../../../types';
import { expiryRepository } from '../../../repositories/ExpiryRepository';
import { useAppStore } from '@/stores';
import { useMemo, useCallback } from 'react';

export type RiskStatus = 'critical' | 'warning' | 'protected';
export type RiskFilter = 'all' | 'critical' | 'warning' | 'protected';

export interface RiskItem {
  barcode: string;
  name: string;
  expiryDate: string;
  daysToWithdraw: number;
  quantity: number;
  providerName: string;
  status: RiskStatus;
  hasExchange: boolean;
}

export interface ComplianceStats {
  riskItems: RiskItem[];
  filter: RiskFilter;
  criticalCount: number;
  warningCount: number;
  protectedCount: number;
  totalItems: number;
}

export const useComplianceData = (initialFilter: RiskFilter = 'all') => {
  const { settings } = useAppStore();
  const tableName = settings?.cloudConfig?.inventoryRegistryTableName || 
                    settings?.cloudConfig?.expiryTableName || 
                    'VENCIMIENTOS';

  const data = useLiveQuery(async (): Promise<ComplianceStats> => {
    const expiries = await expiryRepository.getAll(tableName);
    const providers = await ProviderRepository.getAll();
    
    const normalizeSearch = (s: string) => s.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z0-9]/g, "").trim();

    const providerMap = new Map<string, Provider>();
    providers.forEach(p => {
      providerMap.set(p.rut, p);
      if (p.name) {
        providerMap.set(p.name.toUpperCase(), p);
        providerMap.set(normalizeSearch(p.name), p);
      }
    });

    const now = new Date();
    const riskItems: RiskItem[] = [];

    expiries.forEach(item => {
      const qty = item.quantity || 0;
      const providerName = item.providerName || '';
      const normProviderName = normalizeSearch(providerName);

      let provider = providerMap.get(providerName.toUpperCase()) || 
                       providerMap.get(normProviderName) ||
                       (providerName ? providerMap.get(providerName) : null);
                       
      if (!provider && providerName) {
        provider = providers.find(p => {
          const pNorm = normalizeSearch(p.name);
          return pNorm.includes(normProviderName) || normProviderName.includes(pNorm);
        }) || null;
      }
      
      const withdrawalDays = provider?.withdrawalDays ?? 0;
      const hasExchange = provider?.hasExchange ?? true;

      // Calcular fecha de vencimiento
      const expiryDate = new Date(item.yyyy, item.mm - 1, 1);
      const withdrawalDate = new Date(expiryDate);
      withdrawalDate.setDate(withdrawalDate.getDate() - withdrawalDays);
      
      const daysToWithdraw = differenceInDays(withdrawalDate, now);
      
      let status: RiskStatus = 'protected';
      
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

    // Calcular estadísticas
    const criticalCount = riskItems.filter(i => i.status === 'critical').length;
    const warningCount = riskItems.filter(i => i.status === 'warning').length;
    const protectedCount = riskItems.filter(i => i.status === 'protected').length;

    return {
      riskItems,
      filter: 'all',
      criticalCount,
      warningCount,
      protectedCount,
      totalItems: riskItems.length
    };
  }, [tableName], {
    riskItems: [],
    filter: 'all',
    criticalCount: 0,
    warningCount: 0,
    protectedCount: 0,
    totalItems: 0
  });

  return data;
};

// Hook para exportar alertas
export const useComplianceExport = () => {
  const exportToCSV = useCallback(async (items: RiskItem[]) => {
    const headers = [
      'Barcode',
      'Nombre',
      'Proveedor',
      'Vencimiento',
      'Días Restantes',
      'Cantidad',
      'Estado',
      'Política Canje',
      'Acción Requerida'
    ];

    const rows = items.map(item => {
      let action = 'Ninguna';
      if (item.status === 'critical') {
        action = item.hasExchange ? 'RETIRAR Y GESTIONAR CANJE' : 'RETIRAR INMEDIATAMENTE';
      } else if (item.status === 'warning') {
        action = 'MONITOREAR - Preparar para retiro';
      }

      return [
        item.barcode,
        item.name,
        item.providerName,
        item.expiryDate,
        item.daysToWithdraw,
        item.quantity,
        item.status.toUpperCase(),
        item.hasExchange ? 'SÍ' : 'NO',
        action
      ];
    });

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Descargar archivo
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `alertas-cumplimiento-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return items.length;
  }, []);

  const exportCriticalOnly = useCallback(async (items: RiskItem[]) => {
    const critical = items.filter(i => i.status === 'critical');
    if (critical.length === 0) return 0;
    return exportToCSV(critical);
  }, [exportToCSV]);

  return {
    exportToCSV,
    exportCriticalOnly
  };
};
