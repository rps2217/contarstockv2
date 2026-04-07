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

  const isValidStr = (val: any) => typeof val === 'string' && val.trim() !== '' && val.trim().toUpperCase() !== 'N/A' && val.trim().toUpperCase() !== 'PRODUCTO DESCONOCIDO';

  const product = productMap.get(normalizeSku(item.barcode));
  
  let productName = 'Producto Desconocido';
  if (isValidStr(product?.name)) {
    productName = product!.name.trim();
  } else if (isValidStr(item.productName)) {
    productName = item.productName.trim();
  } else if (isValidStr((item as any).DESCRIPTOR)) {
    productName = (item as any).DESCRIPTOR.trim();
  } else if (isValidStr((item as any).DESCRIPCION_PROD)) {
    productName = (item as any).DESCRIPCION_PROD.trim();
  } else if (isValidStr((item as any).DESCRIPCION)) {
    productName = (item as any).DESCRIPCION.trim();
  } else if (isValidStr((item as any).PRODUCTO)) {
    productName = (item as any).PRODUCTO.trim();
  } else if (isValidStr((item as any).ITEM)) {
    productName = (item as any).ITEM.trim();
  }
  const supplierRut = product?.supplierRut ? normalizeSku(product.supplierRut) : null;
  const provider = supplierRut ? providerMap.get(supplierRut) : null;
  
  let withdrawalDate: Date | null = null;
  const hasCanje = provider ? (provider.hasExchange ?? false) : false;
  
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
  let lifePercent = 100;
  if (expiry) {
    const timeScore = Math.max(0, 60 - (daysLeft / 3)); 
    const commercialScore = hasCanje ? 10 : 25;
    const volumeScore = Math.min(15, (item.quantity || 1) * 0.3);
    riskScore = Math.round(timeScore + commercialScore + volumeScore);
    if (isPast(expiry)) riskScore = 100;
    
    // Calculate simple life percent (assuming 365 days total shelf life for visualization if unknown)
    // If we have a creation date or similar, we could calculate accurate total shelf life.
    // For now, we'll use a heuristic: 100% at 365 days, 0% at 0 days.
    lifePercent = Math.max(0, Math.min(100, (daysLeft / 365) * 100));
  }

  const isValidProviderStr = (val: any) => typeof val === 'string' && val.trim() !== '' && val.trim().toUpperCase() !== 'N/A' && val.trim().toUpperCase() !== 'SIN PROVEEDOR';

  let providerName = 'N/A';
  if (isValidProviderStr(provider?.name)) {
    providerName = provider!.name.trim();
  } else if (isValidProviderStr(product?.supplier)) {
    providerName = product!.supplier.trim();
  } else if (isValidProviderStr(item.providerName)) {
    providerName = item.providerName.trim();
  } else if (isValidProviderStr((item as any).PROVEEDOR)) {
    providerName = (item as any).PROVEEDOR.trim();
  } else if (isValidProviderStr((item as any).PROV)) {
    providerName = (item as any).PROV.trim();
  } else if (isValidProviderStr((item as any).proveedor)) {
    providerName = (item as any).proveedor.trim();
  } else if (isValidProviderStr((item as any).supplier)) {
    providerName = (item as any).supplier.trim();
  }

  const _searchIndex = `${item.barcode || ''} ${productName} ${providerName} ${item.batch || ''} ${item.frc || ''}`.toLowerCase();

  return {
    ...item,
    productName,
    providerName,
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
    lifePercent,
    price: product?.price || 0,
    frc: item.frc || '',
    syncStatus: item.syncStatus,
    _searchIndex
  };
};

export const filterExpiryItems = (
  items: ExpiryItem[],
  filters: {
    query: string;
    selectedCategories: string[];
    selectedCanje: string;
    actionPeriod: 'all' | 'this_month' | 'next_month' | 'next_3_months' | 'custom';
    customDateRange: { start: Date | null; end: Date | null };
    creationDateRange?: { start: Date | null; end: Date | null };
  }
): ExpiryItem[] => {
  const { query, selectedCategories, selectedCanje, actionPeriod, customDateRange, creationDateRange } = filters;
  
  // Pre-procesar la query para búsqueda ultra-rápida una sola vez
  const searchTerm = query.trim().toLowerCase();
  
  const now = new Date();
  const currentMonthStart = startOfMonth(now);
  const currentMonthEnd = endOfMonth(now);
  const nextMonthStart = startOfMonth(addMonths(now, 1));
  const nextMonthEnd = endOfMonth(addMonths(now, 1));
  const next3MonthsEnd = endOfMonth(addMonths(now, 3));

  return items.filter(item => {
    // 1. Búsqueda Ultra-Rápida usando el índice pre-calculado
    if (searchTerm && item._searchIndex && !item._searchIndex.includes(searchTerm)) {
      return false;
    }

    if (selectedCategories.length > 0 && !selectedCategories.includes(item.category)) {
      return false;
    }

    if (selectedCanje === 'canje' && !item.hasCanje) return false;
    if (selectedCanje === 'markdown' && item.hasCanje) return false;

    // Filtrado por Periodo Operativo basado en la Fecha de Retiro (Withdrawal Date)
    if (actionPeriod !== 'all') {
      if (!item.withdrawalDate) return false;
      
      if (actionPeriod === 'this_month') {
        if (!isWithinInterval(item.withdrawalDate, { start: currentMonthStart, end: currentMonthEnd }) && !isPast(item.withdrawalDate)) {
          return false;
        }
      } else if (actionPeriod === 'next_month') {
        if (!isWithinInterval(item.withdrawalDate, { start: nextMonthStart, end: nextMonthEnd })) {
          return false;
        }
      } else if (actionPeriod === 'next_3_months') {
        if (!isWithinInterval(item.withdrawalDate, { start: currentMonthStart, end: next3MonthsEnd }) && !isPast(item.withdrawalDate)) {
          return false;
        }
      } else if (actionPeriod === 'custom') {
        const itemDate = item.withdrawalDate.getTime();
        if (customDateRange.start) {
          const start = new Date(customDateRange.start).setHours(0, 0, 0, 0);
          if (itemDate < start) return false;
        }
        if (customDateRange.end) {
          const end = new Date(customDateRange.end).setHours(23, 59, 59, 999);
          if (itemDate > end) return false;
        }
      }
    }

    // Filtrado por Fecha de Creación (timestamp)
    if (creationDateRange && (creationDateRange.start || creationDateRange.end)) {
      if (!item.timestamp) return false;
      const itemCreationDate = typeof item.timestamp === 'number' ? item.timestamp : new Date(item.timestamp).getTime();
      
      if (creationDateRange.start) {
        const start = new Date(creationDateRange.start).setHours(0, 0, 0, 0);
        if (itemCreationDate < start) return false;
      }
      if (creationDateRange.end) {
        const end = new Date(creationDateRange.end).setHours(23, 59, 59, 999);
        if (itemCreationDate > end) return false;
      }
    }

    return true;
  });
};

export const calculateExpiryStats = (items: ExpiryItem[]) => {
  const stats = {
    expired: 0,
    critical: 0,
    next_expiry: 0,
    withdrawal: 0,
    total: items.length
  };

  const categoryCounts: Record<string, number> = {};
  const suggestGroups = {
    merma: [] as ExpiryItem[],
    canje: [] as ExpiryItem[],
    drenaje: [] as ExpiryItem[],
    impulso: [] as ExpiryItem[]
  };

  // ÚNICO RECORRIDO DE DATOS (O(n))
  items.forEach(item => {
    // 1. Contadores por estado
    if (item.status === 'expired') stats.expired++;
    else if (item.status === 'critical') stats.critical++;
    else if (item.status === 'next_expiry') stats.next_expiry++;
    else if (item.status === 'withdrawal') stats.withdrawal++;

    // 2. Alertar por volumen (Categorías)
    if (item.status !== 'safe') {
      categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
    }

    // 3. Agrupar para acciones sugeridas
    const isUrgent = item.status === 'critical' || item.status === 'expired';
    const isNext = item.status === 'next_expiry';

    if (isUrgent) {
      if (item.hasCanje) suggestGroups.canje.push(item);
      else suggestGroups.merma.push(item);
    } else if (isNext) {
      if (item.hasCanje) suggestGroups.impulso.push(item);
      else suggestGroups.drenaje.push(item);
    }
  });

  // Procesar resultados finales
  const volumeAlerts = Object.entries(categoryCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  const suggestedActions = [
    { type: 'merma', list: suggestGroups.merma, title: 'Solicitudes de precios especiales', desc: 'Gestionar rebajas para ítems críticos/vencidos sin opción a canje.' },
    { type: 'canje', list: suggestGroups.canje, title: 'Gestión de Canjes', desc: 'Coordinar devolución con proveedores para ítems críticos/vencidos.' },
    { type: 'drenaje', list: suggestGroups.drenaje, title: 'Plan de Drenaje (Próximos)', desc: 'Solicitar ofertas para ítems (4 meses) sin canje para evitar pérdidas.' },
    { type: 'impulso', list: suggestGroups.impulso, title: 'Impulso de Ventas (Próximos)', desc: 'Promocionar ítems (4 meses) con canje para minimizar devoluciones.' }
  ].filter(a => a.list.length > 0).map(a => ({
    title: a.title,
    description: a.desc.replace('ítems', `${a.list.length} ítems`),
    count: a.list.length,
    type: a.type
  }));

  const priorityItems = [...items]
    .filter(item => item.status !== 'safe')
    .sort((a, b) => (b.riskScore || 0) - (a.riskScore || 0))
    .slice(0, 5);

  return {
    ...stats,
    priorityItems,
    volumeAlerts,
    suggestedActions
  };
};

// Forced GitHub sync
