import { differenceInDays, isPast, isBefore, addDays, parseISO, startOfMonth, addMonths, endOfMonth, isWithinInterval } from 'date-fns';
import { format } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { Product, Provider } from '../../../types';
import { ExpiryItem, ExpiryStatus } from '../../../store/useExpiryStore';
import { normalizeSku } from '../../../services/utils';

export const getExpiryStatus = (expiry: Date | null, withdrawalDate: Date | null, now: Date): ExpiryStatus => {
  if (!expiry) return 'safe';
  if (isPast(expiry)) return 'expired';
  
  const criticalThreshold = addDays(now, 30);
  if (isBefore(expiry, criticalThreshold)) return 'critical';
  
  const currentMonthStart = startOfMonth(now);
  const currentMonthEnd = endOfMonth(now);
  if (withdrawalDate && (isPast(withdrawalDate) || isWithinInterval(withdrawalDate, { start: currentMonthStart, end: currentMonthEnd }))) {
    return 'withdrawal';
  }
  
  const startOfNextMonth = startOfMonth(addMonths(now, 1));
  const endOfFourMonths = endOfMonth(addMonths(now, 4));
  if (isWithinInterval(expiry, { start: startOfNextMonth, end: endOfFourMonths })) {
    return 'next_expiry';
  }
  
  return 'safe';
};

export const processExpiryItem = (
  item: any, 
  productMap: Map<string, Product>, 
  providerMap: Map<string, Provider>, 
  now: Date
): ExpiryItem => {
  let expiry: Date | null = null;
  if (item.expiryDate) {
    expiry = parseISO(item.expiryDate);
  } else if (item.mm && item.yyyy) {
    expiry = new Date(item.yyyy, item.mm, 0);
  } else if (item.expiryDateObj) {
    expiry = item.expiryDateObj;
  }

  const product = productMap.get(normalizeSku(item.barcode));
  const productName = product?.name || item.productName || 'Producto Desconocido';
  const supplierRut = product?.supplierRut ? normalizeSku(product.supplierRut) : null;
  const provider = supplierRut ? providerMap.get(supplierRut) : null;
  
  let withdrawalDate: Date | null = null;
  const hasCanje = provider ? (provider.withdrawalDays ?? 0) > 0 : false;
  
  if (item.fechaCC) {
    withdrawalDate = parseISO(item.fechaCC);
  } else if (expiry) {
    const rawDays = provider?.withdrawalDays ?? 30;
    const days = rawDays === 0 ? 30 : rawDays;
    withdrawalDate = addDays(expiry, -days);
  }

  const status = getExpiryStatus(expiry, withdrawalDate, now);
  const daysLeft = expiry ? differenceInDays(expiry, now) : 0;
  const estado = !withdrawalDate 
    ? "" 
    : `${hasCanje ? "Canje" : "Merma"} ${format(withdrawalDate, 'MMM yyyy', { locale: es })}`;

  let riskScore = 0;
  if (expiry) {
    const timeScore = Math.max(0, 60 - (daysLeft / 3)); 
    const commercialScore = hasCanje ? 10 : 25;
    const volumeScore = Math.min(15, (item.quantity || 1) * 0.3);
    riskScore = Math.round(timeScore + commercialScore + volumeScore);
    if (isPast(expiry)) riskScore = 100;
  }

  return {
    ...item,
    productName,
    providerName: provider?.name || product?.supplier || 'N/A',
    category: product?.category || 'GENERAL',
    withdrawalDays: provider?.withdrawalDays || 0,
    hasCanje,
    status,
    daysLeft,
    expiryDateObj: expiry,
    withdrawalDate,
    location: item.location || 'N/A',
    estado,
    quantity: item.quantity || 1,
    riskScore,
    price: product?.price || 0,
    frc: item.frc || '',
    syncStatus: item.syncStatus
  };
};

export const filterExpiryItems = (
  items: ExpiryItem[],
  filters: {
    query: string;
    selectedCategories: string[];
    selectedCanje: string;
    selectedEstado: string | null;
    dateRange: { start: Date | null; end: Date | null };
    withdrawalDateRange: { start: Date | null; end: Date | null };
  }
): ExpiryItem[] => {
  const { query, selectedCategories, selectedCanje, selectedEstado, dateRange, withdrawalDateRange } = filters;
  
  return items.filter(item => {
    if (query) {
      const matchesSearch = 
        item.productName.toLowerCase().includes(query) ||
        item.barcode.includes(query) ||
        (item.batch && item.batch.toLowerCase().includes(query)) ||
        (item.providerName && item.providerName.toLowerCase().includes(query)) ||
        (item.frc && item.frc.toLowerCase().includes(query));
      if (!matchesSearch) return false;
    }

    if (selectedCategories.length > 0 && !selectedCategories.includes(item.category)) {
      return false;
    }

    if (selectedCanje === 'canje' && !item.hasCanje) return false;
    if (selectedCanje === 'markdown' && item.hasCanje) return false;

    if (selectedEstado && item.estado !== selectedEstado) return false;

    if (dateRange.start || dateRange.end) {
      if (!item.expiryDateObj) return false;
      const itemDate = item.expiryDateObj.getTime();
      
      if (dateRange.start) {
        const start = new Date(dateRange.start).setHours(0, 0, 0, 0);
        if (itemDate < start) return false;
      }
      if (dateRange.end) {
        const end = new Date(dateRange.end).setHours(23, 59, 59, 999);
        if (itemDate > end) return false;
      }
    }

    if (withdrawalDateRange.start || withdrawalDateRange.end) {
      if (!item.withdrawalDate) return false;
      const itemDate = item.withdrawalDate.getTime();
      
      if (withdrawalDateRange.start) {
        const start = new Date(withdrawalDateRange.start).setHours(0, 0, 0, 0);
        if (itemDate < start) return false;
      }
      if (withdrawalDateRange.end) {
        const end = new Date(withdrawalDateRange.end).setHours(23, 59, 59, 999);
        if (itemDate > end) return false;
      }
    }

    return true;
  });
};

export const calculateExpiryStats = (items: ExpiryItem[]) => {
  const expiredCount = items.filter(s => s.status === 'expired').length;
  const criticalCount = items.filter(s => s.status === 'critical').length;
  const nextExpiryCount = items.filter(s => s.status === 'next_expiry').length;
  const withdrawalCount = items.filter(s => s.status === 'withdrawal').length;
  
  const priorityItems = [...items]
    .filter(item => item.status !== 'safe')
    .sort((a, b) => (b.riskScore || 0) - (a.riskScore || 0))
    .slice(0, 5);

  const categoryCounts: Record<string, number> = {};
  items.forEach(item => {
    if (item.status !== 'safe') {
      categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
    }
  });
  const volumeAlerts = Object.entries(categoryCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  const suggestedActions = [];
  
  const mermaItems = items.filter(item => !item.hasCanje && (item.status === 'critical' || item.status === 'expired'));
  if (mermaItems.length > 0) {
    suggestedActions.push({
      title: 'Solicitudes de precios especiales',
      description: `Gestionar rebajas para ${mermaItems.length} ítems críticos/vencidos sin opción a canje.`,
      count: mermaItems.length,
      type: 'merma'
    });
  }

  const canjeItems = items.filter(item => item.hasCanje && (item.status === 'critical' || item.status === 'expired'));
  if (canjeItems.length > 0) {
    suggestedActions.push({
      title: 'Gestión de Canjes',
      description: `Coordinar devolución con proveedores para ${canjeItems.length} ítems críticos/vencidos.`,
      count: canjeItems.length,
      type: 'canje'
    });
  }

  const drenajeItems = items.filter(item => !item.hasCanje && item.status === 'next_expiry');
  if (drenajeItems.length > 0) {
    suggestedActions.push({
      title: 'Plan de Drenaje (Próximos)',
      description: `Solicitar ofertas para ${drenajeItems.length} ítems (4 meses) sin canje para evitar pérdidas.`,
      count: drenajeItems.length,
      type: 'drenaje'
    });
  }

  const impulsoItems = items.filter(item => item.hasCanje && item.status === 'next_expiry');
  if (impulsoItems.length > 0) {
    suggestedActions.push({
      title: 'Impulso de Ventas (Próximos)',
      description: `Promocionar ${impulsoItems.length} ítems (4 meses) con canje para minimizar devoluciones.`,
      count: impulsoItems.length,
      type: 'impulso'
    });
  }

  return {
    expired: expiredCount,
    critical: criticalCount,
    next_expiry: nextExpiryCount,
    withdrawal: withdrawalCount,
    total: items.length,
    priorityItems,
    volumeAlerts,
    suggestedActions
  };
};
