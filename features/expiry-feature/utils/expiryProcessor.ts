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
    providerName: provider?.name || 
                  product?.supplier || 
                  item.providerName || 
                  (item as any).PROVEEDOR || 
                  (item as any).PROV || 
                  (item as any).proveedor || 
                  (item as any).supplier || 
                  'N/A',
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
  
  // Pre-procesar la query para búsqueda ultra-rápida una sola vez
  const searchTerm = query.trim().toLowerCase();
  
  return items.filter(item => {
    // 1. Búsqueda Triple (SKU, Nombre, Proveedor) - PRIORIDAD ALTA
    if (searchTerm) {
      // Forzar conversión a String para evitar el crash ".includes is not a function"
      const barcodeStr = String(item.barcode || "").toLowerCase();
      const nameStr = String(item.productName || "").toLowerCase();
      const providerStr = String(item.providerName || "").toLowerCase();
      const batchStr = String(item.batch || "").toLowerCase();
      const frcStr = String(item.frc || "").toLowerCase();

      const barcodeMatch = barcodeStr.includes(searchTerm);
      const nameMatch = nameStr.includes(searchTerm);
      const providerMatch = providerStr.includes(searchTerm);
      const batchMatch = batchStr.includes(searchTerm);
      const frcMatch = frcStr.includes(searchTerm);
      
      if (!barcodeMatch && !nameMatch && !providerMatch && !batchMatch && !frcMatch) {
        return false;
      }
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
