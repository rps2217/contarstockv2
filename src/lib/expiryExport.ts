/**
 * expiryExport - Utilidades para exportar vencimientos
 */

import type { ExpiryEntry } from '@/features/counting/hooks/useExpiryTracker';

const MONTHS_ES = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export const formatExpiryDate = (mm: number, yyyy: number): string => {
  return `${String(mm).padStart(2, '0')}/${yyyy}`;
};

export const getDaysUntilExpiry = (mm: number, yyyy: number): number => {
  const now = new Date();
  const expiry = new Date(yyyy, mm - 1, 1); // Primer día del mes de vencimiento
  const diffTime = expiry.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

export const formatStatus = (status: ExpiryEntry['status']): string => {
  switch (status) {
    case 'expired': return 'Vencido';
    case 'warning': return 'Por Vencer';
    case 'valid': return 'Válido';
    case 'pending': return 'Pendiente';
    default: return status;
  }
};

export interface ExpiryExportRow {
  Producto: string;
  'Código de Barras': string;
  'Mes Vencimiento': string;
  'Año Vencimiento': string;
  'Fecha Formato': string;
  'Días Restantes': number;
  Estado: string;
  Cantidad: number | string;
  'Fecha Registro': string;
  'ID Sesión': string;
  'Estado Sincronización': string;
}

export const prepareExportData = (entries: ExpiryEntry[]): ExpiryExportRow[] => {
  return entries.map(entry => ({
    Producto: entry.productName || 'Sin nombre',
    'Código de Barras': entry.barcode,
    'Mes Vencimiento': MONTHS_ES[entry.mm] || String(entry.mm),
    'Año Vencimiento': String(entry.yyyy),
    'Fecha Formato': formatExpiryDate(entry.mm, entry.yyyy),
    'Días Restantes': getDaysUntilExpiry(entry.mm, entry.yyyy),
    Estado: formatStatus(entry.status),
    Cantidad: entry.quantity ?? '-',
    'Fecha Registro': entry.timestamp ? new Date(entry.timestamp).toLocaleDateString('es-CL') : '-',
    'ID Sesión': entry.sessionId || '-',
    'Estado Sincronización': entry.syncStatus === 'synced' ? 'Sincronizado' : 
                              entry.syncStatus === 'pending' ? 'Pendiente' : 'Error'
  }));
};

export const exportToCSV = (entries: ExpiryEntry[], filename: string = 'vencimientos'): void => {
  const data = prepareExportData(entries);
  
  if (data.length === 0) {
    alert('No hay datos para exportar');
    return;
  }

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(';'),
    ...data.map(row => headers.map(h => String(row[h as keyof ExpiryExportRow]).replace(/;/g, ',')).join(';'))
  ].join('\n');

  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportToExcel = async (entries: ExpiryEntry[], filename: string = 'vencimientos'): Promise<void> => {
  const data = prepareExportData(entries);
  
  if (data.length === 0) {
    alert('No hay datos para exportar');
    return;
  }

  try {
    // Dynamically import xlsx
    const XLSX = await import('xlsx');
    
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    
    // Set column widths
    worksheet['!cols'] = [
      { wch: 40 }, // Producto
      { wch: 20 }, // Código de Barras
      { wch: 15 }, // Mes Vencimiento
      { wch: 12 }, // Año Vencimiento
      { wch: 15 }, // Fecha Formato
      { wch: 12 }, // Días Restantes
      { wch: 15 }, // Estado
      { wch: 10 }, // Cantidad
      { wch: 15 }, // Fecha Registro
      { wch: 20 }, // ID Sesión
      { wch: 18 }  // Estado Sincronización
    ];
    
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Vencimientos');
    XLSX.writeFile(workbook, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    // Fallback to CSV
    exportToCSV(entries, filename);
  }
};

export const generateExpirySummary = (entries: ExpiryEntry[]) => {
  const summary = {
    total: entries.length,
    expired: 0,
    warning: 0,
    valid: 0,
    pending: 0,
    byMonth: {} as Record<string, number>,
    byStatus: {} as Record<string, number>
  };

  entries.forEach(entry => {
    // Count by status
    summary[entry.status]++;
    
    // Count by month/year
    const key = `${entry.yyyy}-${String(entry.mm).padStart(2, '0')}`;
    summary.byMonth[key] = (summary.byMonth[key] || 0) + 1;
    
    summary.byStatus[formatStatus(entry.status)] = (summary.byStatus[formatStatus(entry.status)] || 0) + 1;
  });

  // Sort months
  const sortedMonths = Object.entries(summary.byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {});

  return { ...summary, byMonth: sortedMonths };
};
