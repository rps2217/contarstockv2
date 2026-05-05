
import { parseISO, endOfMonth, format, startOfMonth, addMonths, isWithinInterval, isPast } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { Product, Provider } from '../../../types';
import { ExpiryItem } from '../../../store/useExpiryStore';
import { normalizeSku, normalizeIdentity } from '../../../services/utils';
import { evaluateExpiry, ExpiryPolicy } from '../domain/expiryEngine';

export const processExpiryItem = (
  item: any, 
  productMap: Map<string, Product>, 
  providerMap: Map<string, Provider>, 
  now: Date
): ExpiryItem => {
  // 1. DETERMINACIÓN DE LA FECHA DE VENCIMIENTO
  let expiry: Date | null = null;
  if (item.mm && item.yyyy) {
    expiry = endOfMonth(new Date(Number(item.yyyy), Number(item.mm) - 1));
  } else if (item.expiryDateObj) {
    expiry = item.expiryDateObj;
  } else if (item.expiryDate) {
    const parsed = parseISO(item.expiryDate);
    expiry = parsed.getDate() === 1 ? endOfMonth(parsed) : parsed;
  }

  // 2. RESOLUCIÓN DE PRODUCTO Y PROVEEDOR (IDENTIDAD)
  const product = productMap.get(normalizeSku(item.barcode));
  
  // ESTRATEGIA DE RESOLUCIÓN DE NOMBRE (Source of Truth: Catálogo Maestro)
  const catalogueName = (product?.name || (product as any)?.DESCRIPTOR || (product as any)?.DESCRIPCION || '').trim();
  const recordName = (item.productName || item.DESCRIPTOR || item.DESCRIPCION || item.PRODUCTO || '').trim();
  const productName = (catalogueName || recordName || 'PRODUCTO SIN DESCRIPTOR').toUpperCase();
  
  const supplierRut = product?.supplierRut ? normalizeIdentity(product.supplierRut) : null;
  const supplierName = product?.supplier ? normalizeIdentity(product.supplier) : null;
  const itemSupplierName = item.providerName ? normalizeIdentity(item.providerName) : null;
  const effectiveSupplierName = supplierName || itemSupplierName;
  
  // MEMOIZED RESOLUTION: We use the providerMap more efficiently
  let provider = supplierRut ? providerMap.get(supplierRut) : null;
  
  if (!provider && effectiveSupplierName) {
    // Si no hay match por RUT, intentamos por nombre. 
    // Para no iterar siempre, el llamador ya debería pasar un providerMap que incluya nombres como llaves
    // o podemos buscarlo una vez.
    provider = providerMap.get(effectiveSupplierName);
    
    // Fallback para nombres no exactamente iguales (normalización profunda)
    if (!provider) {
      const normalizedQuery = normalizeIdentity(effectiveSupplierName);
      for (const p of Array.from(providerMap.values())) {
        if (p.name && normalizeIdentity(p.name) === normalizedQuery) {
          provider = p;
          break;
        }
      }
    }
  }
  
  // 3. APLICACIÓN DE POLÍTICAS DE NEGOCIO (DOMAIN ENGINE)
  const policy: ExpiryPolicy = {
    withdrawalDays: provider?.withdrawalDays || 30,
    hasCanje: provider?.hasExchange ?? false
  };

  const evaluation = evaluateExpiry(expiry, policy, now, item.quantity || 1);

  // 4. CONSTRUCCIÓN DEL OBJETO DE INTERFAZ
  const estado = !evaluation.withdrawalDate 
    ? "" 
    : `${policy.hasCanje ? "Canje" : "Merma"} ${format(evaluation.withdrawalDate, 'MMM yyyy', { locale: es })}`;

  const providerName = (provider?.name || product?.supplier || item.providerName || 'N/A').trim().toUpperCase();
  const observaciones = item.observaciones || '';

  const _searchIndex = `${item.barcode || ''} ${productName} ${providerName} ${item.batch || ''} ${item.frc || ''} ${observaciones}`.toLowerCase();

  return {
    ...item,
    productName,
    providerName,
    observaciones,
    category: product?.category || 'GENERAL',
    withdrawalDays: policy.withdrawalDays,
    hasCanje: policy.hasCanje,
    status: evaluation.status,
    daysLeft: evaluation.daysLeft,
    expiryDateObj: expiry,
    withdrawalDate: evaluation.withdrawalDate,
    location: item.location || 'N/A',
    estado,
    quantity: item.quantity || 1,
    riskScore: evaluation.riskScore,
    lifePercent: evaluation.lifePercent,
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

