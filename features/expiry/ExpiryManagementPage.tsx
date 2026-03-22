
import React, { useState, useMemo, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { ScanRecord, Product, Provider } from '../../types';
import { 
  Calendar, 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ChevronRight, 
  Filter,
  ArrowUpDown,
  Package,
  CalendarDays,
  Download,
  Printer,
  Trash2,
  CheckSquare,
  Square,
  FileText,
  ShieldAlert,
  MapPin,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, differenceInDays, isPast, isBefore, addDays, parseISO, startOfMonth, addMonths, endOfMonth, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { importExpirationsFromCloud, importProvidersFromCloud } from '../../services/syncManager';
import { normalizeSku } from '../../services/utils';
import { toast } from 'sonner';

type ExpiryStatus = 'expired' | 'critical' | 'next_expiry' | 'safe' | 'withdrawal';

const ExpiryManagementPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<ExpiryStatus[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [displayLimit, setDisplayLimit] = useState(50);
  const [isChangingLocation, setIsChangingLocation] = useState(false);
  const [newLocationInput, setNewLocationInput] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [verifiedIds, setVerifiedIds] = useState<Set<string>>(new Set());

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setDisplayLimit(50); // Reset limit on search
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset limit on filter change
  useEffect(() => {
    setDisplayLimit(50);
  }, [selectedStatuses, selectedCategories]);

  const handleRemoveItem = async (item: any) => {
    const confirm = window.confirm(`¿RETIRAR ${item.productName}? ESTA ACCIÓN ES IRREVERSIBLE.`);
    if (!confirm) return;

    try {
      if (item.type === 'Individual') {
        await db.scans.delete(item.id);
      } else if (item.type === 'Bulto/Caja') {
        await db.sessions.delete(item.id);
        await db.scans.where('sessionId').equals(item.id).delete();
      } else if (item.type === 'Nube') {
        await db.cloudExpirations.delete(item.id);
      }
      toast.success('Ítem retirado correctamente');
    } catch (error) {
      toast.error('Error al retirar el ítem');
    }
  };

  const handleSyncExpirations = async () => {
    try {
      setIsSyncing(true);
      const [expCount, provCount] = await Promise.all([
        importExpirationsFromCloud(),
        importProvidersFromCloud()
      ]);
      toast.success(`Sincronización completa: ${expCount} vencimientos y ${provCount} proveedores.`);
    } catch (error: any) {
      toast.error(`Error al sincronizar: ${error.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedStatuses([]);
    setSelectedCategories([]);
    toast.info('Filtros restablecidos');
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleVerified = (id: string) => {
    const newVerified = new Set(verifiedIds);
    if (newVerified.has(id)) {
      newVerified.delete(id);
    } else {
      newVerified.add(id);
    }
    setVerifiedIds(newVerified);
  };

  const toggleSelectAll = (items: any[]) => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map(i => i.id)));
    }
  };

  const handleBulkRemove = async () => {
    if (selectedIds.size === 0) return;
    
    const confirm = window.confirm(`¿EstÁS SEGURO DE RETIRAR ${selectedIds.size} ÍTEMS SELECCIONADOS? ESTA ACCIÓN NO SE PUEDE DESHACER.`);
    if (!confirm) return;

    try {
      const selectedItems = processedScans.filter(s => selectedIds.has(s.id));

      for (const item of selectedItems) {
        if (item.type === 'Individual') {
          await db.scans.delete(item.id);
        } else if (item.type === 'Bulto/Caja') {
          await db.sessions.delete(item.id);
          await db.scans.where('sessionId').equals(item.id).delete();
        } else if (item.type === 'Nube') {
          await db.cloudExpirations.delete(item.id);
        }
      }

      setSelectedIds(new Set());
      toast.success(`${selectedItems.length} ítems retirados correctamente`);
    } catch (error) {
      console.error('Error in bulk remove:', error);
      toast.error('Error al retirar los ítems');
    }
  };

  const handleBulkChangeLocation = async () => {
    if (!newLocationInput.trim()) return;
    
    try {
      const selectedItems = processedScans.filter(s => selectedIds.has(s.id));
      
      for (const item of selectedItems) {
        if (item.type === 'Individual') {
          await db.scans.update(item.id, { location: newLocationInput });
        } else if (item.type === 'Bulto/Caja') {
          await db.sessions.update(item.id, { logisticsLabel: newLocationInput });
        } else if (item.type === 'Nube') {
          await db.cloudExpirations.update(item.id, { location: newLocationInput });
        }
      }

      setSelectedIds(new Set());
      setIsChangingLocation(false);
      setNewLocationInput('');
      toast.success(`Ubicación actualizada para ${selectedItems.length} ítems`);
    } catch (error) {
      console.error('Error changing location:', error);
      toast.error('Error al cambiar la ubicación');
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const content = `
      <html>
        <head>
          <title>Reporte de Vencimientos - ${format(new Date(), 'dd/MM/yyyy')}</title>
          <style>
            body { font-family: sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
            th { background-color: #f2f2f2; }
            .header { text-align: center; margin-bottom: 30px; }
            .status-expired { color: red; font-weight: bold; }
            .status-critical { color: orange; font-weight: bold; }
            .status-next { color: blue; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>REPORTE DE VENCIMIENTOS</h1>
            <p>Generado el: ${format(new Date(), 'PPPP', { locale: es })}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Producto</th>
                <th>Vencimiento</th>
                <th>Días</th>
                <th>Estado</th>
                <th>Ubicación</th>
              </tr>
            </thead>
            <tbody>
              ${processedScans.map(item => `
                <tr>
                  <td>${item.barcode}</td>
                  <td>${item.productName}</td>
                  <td>${item.expiryDateObj ? format(item.expiryDateObj, 'dd/MM/yyyy') : 'N/A'}</td>
                  <td>${item.daysLeft}</td>
                  <td class="status-${item.status}">${
                    item.status === 'expired' ? 'VENCIDO' : 
                    item.status === 'critical' ? 'CRÍTICO' : 
                    item.status === 'next_expiry' ? 'PRÓX. VENC' : 'VIGENTE'
                  }</td>
                  <td>${item.location || 'N/A'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;

    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.print();
  };

  const handleExportCSV = () => {
    const headers = ["SKU", "Producto", "Vencimiento", "Estado", "Ubicacion"];
    const rows = processedScans.map(item => [
      item.barcode,
      item.productName,
      item.expiryDateObj ? format(item.expiryDateObj, 'yyyy-MM-dd') : '',
      item.status.toUpperCase(),
      item.location || ''
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `vencimientos_${format(new Date(), 'yyyyMMdd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const scans = useLiveQuery(() => 
    db.scans.filter(s => !!s.expiryDate || (!!s.mm && !!s.yyyy)).toArray()
  );
  const sessions = useLiveQuery(() =>
    db.sessions.filter(s => !!s.mm && !!s.yyyy).toArray()
  );
  const cloudExpirations = useLiveQuery(() =>
    db.cloudExpirations.toArray()
  );
  const products = useLiveQuery(() => db.products.toArray());
  const providers = useLiveQuery(() => db.providers.toArray());

  const productMap = useMemo(() => {
    const map = new Map<string, Product>();
    products?.forEach(p => map.set(normalizeSku(p.barcode), p));
    return map;
  }, [products]);

  const providerMap = useMemo(() => {
    const map = new Map<string, Provider>();
    providers?.forEach(p => map.set(normalizeSku(p.rut), p));
    return map;
  }, [providers]);

  const baseProcessedData = useMemo(() => {
    if (!scans) return [];

    const now = new Date();
    const criticalThreshold = addDays(now, 30);
    const startOfNextMonth = startOfMonth(addMonths(now, 1));
    const endOfFourMonths = endOfMonth(addMonths(now, 4));
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);

    const getStatus = (expiry: Date | null, withdrawalDate: Date | null): ExpiryStatus => {
      if (!expiry) return 'safe';
      if (isPast(expiry)) return 'expired';
      
      // Prioritize Critical (Urgent) over Withdrawal policy
      if (isBefore(expiry, criticalThreshold)) return 'critical';

      // If there's a withdrawal date and it's past or in current month
      if (withdrawalDate && (isPast(withdrawalDate) || isWithinInterval(withdrawalDate, { start: currentMonthStart, end: currentMonthEnd }))) {
        return 'withdrawal';
      }

      if (isWithinInterval(expiry, { start: startOfNextMonth, end: endOfFourMonths })) {
        return 'next_expiry';
      }
      return 'safe';
    };

    const processItem = (item: any) => {
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
      if (expiry && provider?.withdrawalDays && provider.withdrawalDays > 0) {
        withdrawalDate = addDays(expiry, -provider.withdrawalDays);
      }

      const status = getStatus(expiry, withdrawalDate);
      const daysLeft = expiry ? differenceInDays(expiry, now) : 0;

      return {
        ...item,
        productName,
        providerName: provider?.name || product?.supplier || 'N/A',
        category: product?.category || 'GENERAL',
        withdrawalDays: provider?.withdrawalDays || 0,
        status,
        daysLeft,
        expiryDateObj: expiry,
        withdrawalDate,
        location: item.location || 'N/A'
      };
    };

    const individualItems = scans.map(scan => processItem({ ...scan, type: 'Individual' }));
    const sessionItems = (sessions || []).map(session => processItem({
      id: session.id,
      barcode: session.logisticsLabel,
      mm: session.mm,
      yyyy: session.yyyy,
      batch: session.batch || 'N/A',
      type: 'Bulto/Caja',
      timestamp: session.createdAt,
      quantity: session.totalUnits || 0,
      location: session.logisticsLabel || 'N/A'
    }));
    const cloudItems = (cloudExpirations || []).map(exp => processItem({
      id: exp.id,
      barcode: exp.barcode,
      productName: exp.productName,
      mm: exp.mm,
      yyyy: exp.yyyy,
      batch: 'N/A',
      type: 'Nube',
      timestamp: exp.timestamp,
      quantity: exp.quantity || 0,
      location: exp.location || 'N/A'
    }));

    return [...individualItems, ...sessionItems, ...cloudItems];
  }, [scans, sessions, cloudExpirations, productMap, providerMap]);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    baseProcessedData.forEach(item => {
      if (item.category) cats.add(item.category);
    });
    return Array.from(cats).sort();
  }, [baseProcessedData]);

  const processedScans = useMemo(() => {
    const query = debouncedSearch.toLowerCase();
    
    return baseProcessedData.filter(item => {
      const matchesSearch = 
        item.productName.toLowerCase().includes(query) ||
        item.barcode.includes(query) ||
        (item.batch && item.batch.toLowerCase().includes(query));
      
      const matchesFilter = 
        selectedStatuses.length === 0 || 
        selectedStatuses.includes(item.status);

      const matchesCategory = 
        selectedCategories.length === 0 || 
        selectedCategories.includes(item.category);

      return matchesSearch && matchesFilter && matchesCategory;
    }).sort((a, b) => {
      // Default sort: expired first, then by date
      if (a.status === 'expired' && b.status !== 'expired') return -1;
      if (a.status !== 'expired' && b.status === 'expired') return 1;
      
      if (!a.expiryDateObj) return 1;
      if (!b.expiryDateObj) return -1;
      return a.expiryDateObj.getTime() - b.expiryDateObj.getTime();
    }).map(item => {
      // Calculate life cycle percentage (assuming 2 years max life for visualization)
      const maxLifeDays = 730; 
      const percent = Math.max(0, Math.min(100, (item.daysLeft / maxLifeDays) * 100));
      return { ...item, lifePercent: percent };
    });
  }, [baseProcessedData, debouncedSearch, selectedStatuses, selectedCategories, productMap]);

  const filteredAndSortedScans = useMemo(() => {
    return processedScans.slice(0, displayLimit);
  }, [processedScans, displayLimit]);

  const stats = useMemo(() => {
    if (!baseProcessedData) return { expired: 0, critical: 0, next_expiry: 0, withdrawal: 0, total: 0 };
    
    const filteredByCat = baseProcessedData.filter(item => 
      selectedCategories.length === 0 || selectedCategories.includes(item.category)
    );

    const expiredCount = filteredByCat.filter(s => s.status === 'expired').length;
    const criticalCount = filteredByCat.filter(s => s.status === 'critical').length;
    const nextExpiryCount = filteredByCat.filter(s => s.status === 'next_expiry').length;
    const withdrawalCount = filteredByCat.filter(s => s.status === 'withdrawal').length;
    
    return {
      expired: expiredCount,
      critical: criticalCount,
      next_expiry: nextExpiryCount,
      withdrawal: withdrawalCount,
      total: filteredByCat.length
    };
  }, [baseProcessedData, selectedCategories]);

  return (
    <div className="h-full bg-slate-950 text-white font-mono flex flex-col overflow-hidden">
      {/* HEADER */}
      <div className="p-6 bg-slate-900/50 backdrop-blur-md border-b border-white/5 shrink-0">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tighter italic leading-none">
              CONTROL <span className="text-amber-500">VENCIMIENTOS</span>
            </h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Gestión de Vida Útil de Productos</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="bg-slate-800 border border-white/10 px-3 py-2 rounded-xl flex items-center gap-2 hover:bg-slate-700 transition-colors"
              title="Imprimir Reporte"
            >
              <Printer className="w-4 h-4 text-slate-400" />
            </button>
            <button
              onClick={handleExportCSV}
              className="bg-slate-800 border border-white/10 px-3 py-2 rounded-xl flex items-center gap-2 hover:bg-slate-700 transition-colors"
              title="Exportar CSV"
            >
              <Download className="w-4 h-4 text-slate-400" />
            </button>
            <button
              onClick={handleSyncExpirations}
              disabled={isSyncing}
              className="bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
            >
              <Package className={`w-4 h-4 text-emerald-500 ${isSyncing ? 'animate-spin' : ''}`} />
              <span className="text-xs font-black text-emerald-500 uppercase">Sync</span>
            </button>
          </div>
        </div>

        {/* COMPACT STATS PILLS */}
        <div className="flex flex-wrap gap-2 mb-6">
          <div className="bg-rose-500/10 border border-rose-500/20 px-3 py-1 rounded-full flex items-center gap-2">
            <AlertTriangle className="w-3 h-3 text-rose-500" />
            <span className="text-[10px] font-black text-rose-500 uppercase tracking-tighter">{stats.expired} Vencidos</span>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full flex items-center gap-2">
            <ShieldAlert className="w-3 h-3 text-amber-500" />
            <span className="text-[10px] font-black text-amber-500 uppercase tracking-tighter">{stats.critical} Críticos</span>
          </div>
          <div className="bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full flex items-center gap-2">
            <Download className="w-3 h-3 text-indigo-500" />
            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-tighter">{stats.withdrawal} Retiros</span>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-full flex items-center gap-2">
            <Clock className="w-3 h-3 text-blue-500" />
            <span className="text-[10px] font-black text-blue-500 uppercase tracking-tighter">{stats.next_expiry} Próx</span>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full flex items-center gap-2">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-tighter">{stats.total - stats.expired - stats.critical - stats.next_expiry - stats.withdrawal} Vigentes</span>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          {/* SEARCH & CLEAR */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input 
                type="text"
                placeholder="BUSCAR POR NOMBRE, SKU O LOTE..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-black border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:outline-none focus:border-amber-500 transition-colors shadow-2xl"
              />
            </div>
            <button
              onClick={handleClearFilters}
              className="bg-slate-800 border border-white/10 px-6 rounded-2xl flex items-center gap-2 hover:bg-slate-700 transition-all group shrink-0"
            >
              <X className="w-4 h-4 text-slate-400 group-hover:rotate-90 transition-transform" />
              <span className="hidden sm:inline text-[10px] font-black uppercase tracking-widest text-slate-300">Limpiar Filtros</span>
            </button>
          </div>

          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
            {/* STATUS FILTERS - PROMINENT */}
            <div className="space-y-3 lg:w-[400px] shrink-0 min-w-0">
              <div className="flex items-center gap-2 px-1">
                <Filter className="w-3 h-3 text-slate-500" />
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Filtrar por Estado</span>
              </div>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {(['expired', 'critical', 'withdrawal', 'next_expiry', 'safe'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => {
                      setSelectedStatuses(prev => 
                        prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
                      );
                    }}
                    className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border flex items-center gap-2 shadow-lg ${
                      selectedStatuses.includes(s)
                        ? s === 'expired' ? 'bg-rose-600 border-rose-400 text-white scale-105' :
                          s === 'critical' ? 'bg-amber-600 border-amber-400 text-white scale-105' :
                          s === 'withdrawal' ? 'bg-indigo-600 border-indigo-400 text-white scale-105' :
                          s === 'next_expiry' ? 'bg-blue-600 border-blue-400 text-white scale-105' :
                          'bg-emerald-600 border-emerald-400 text-white scale-105'
                        : 'bg-white/5 border-white/5 text-slate-500 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {s === 'expired' && <AlertTriangle className="w-3 h-3" />}
                    {s === 'critical' && <ShieldAlert className="w-3 h-3" />}
                    {s === 'withdrawal' && <Download className="w-3 h-3" />}
                    {s === 'next_expiry' && <Clock className="w-3 h-3" />}
                    {s === 'safe' && <CheckCircle2 className="w-3 h-3" />}
                    
                    {s === 'expired' ? 'Vencidos' : 
                     s === 'critical' ? 'Críticos' : 
                     s === 'withdrawal' ? 'Retiros' :
                     s === 'next_expiry' ? 'Próximos' : 'Vigentes'}
                  </button>
                ))}
              </div>
            </div>

            {/* MUNDOS FILTER - PROMINENT */}
            <div className="space-y-3 lg:flex-1 min-w-0">
              <div className="flex items-center gap-2 px-1">
                <Package className="w-3 h-3 text-slate-500" />
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Filtrar por Mundo / Categoría</span>
              </div>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => {
                      setSelectedCategories(prev => 
                        prev.includes(cat) ? prev.filter(x => x !== cat) : [...prev, cat]
                      );
                    }}
                    className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border shadow-md ${
                      selectedCategories.includes(cat)
                        ? 'bg-amber-500 border-amber-400 text-black scale-105'
                        : 'bg-white/5 border-white/5 text-slate-500 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BULK ACTIONS BAR */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 border border-white/10 px-6 py-4 rounded-[2rem] flex items-center gap-8 shadow-2xl z-50 backdrop-blur-xl"
          >
            <div className="flex items-center gap-4 border-r border-white/10 pr-8">
              <button 
                onClick={() => toggleSelectAll(processedScans)}
                className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all"
              >
                {selectedIds.size === processedScans.length ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
              </button>
              <div>
                <div className="text-xl font-black text-white leading-none">{selectedIds.size}</div>
                <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Seleccionados</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsChangingLocation(true)}
                className="bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl flex items-center gap-2 transition-all group"
              >
                <MapPin className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-black uppercase tracking-widest">Ubicación</span>
              </button>
              
              <button 
                onClick={handleBulkRemove}
                className="bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-all border border-rose-500/20 group"
              >
                <Trash2 className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                <span className="text-[10px] font-black uppercase tracking-widest">Retirar</span>
              </button>

              <div className="w-px h-8 bg-white/10 mx-2" />

              <button 
                onClick={() => setSelectedIds(new Set())}
                className="text-slate-500 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL CAMBIO UBICACIÓN */}
      <AnimatePresence>
        {isChangingLocation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl"
            >
              <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 bg-indigo-500/20 rounded-2xl flex items-center justify-center">
                  <MapPin className="w-7 h-7 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-2xl font-black uppercase italic tracking-tighter">Cambiar Ubicación</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    Actualizando {selectedIds.size} ítems seleccionados
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block">
                    Nueva Ubicación (Ej: Bodega A, Estante 4)
                  </label>
                  <input
                    autoFocus
                    type="text"
                    value={newLocationInput}
                    onChange={(e) => setNewLocationInput(e.target.value)}
                    placeholder="INGRESE UBICACIÓN..."
                    className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 text-white font-black text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase italic tracking-tighter"
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    onClick={() => setIsChangingLocation(false)}
                    className="flex-1 bg-white/5 hover:bg-white/10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleBulkChangeLocation}
                    className="flex-1 bg-indigo-500 hover:bg-indigo-600 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-colors shadow-lg shadow-indigo-500/20"
                  >
                    Confirmar
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LISTA */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <AnimatePresence mode="popLayout">
          {filteredAndSortedScans.map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={() => selectedIds.size > 0 && toggleSelect(item.id)}
              className={`bg-white/5 border rounded-2xl p-3 flex items-center justify-between group cursor-pointer transition-all ${
                selectedIds.has(item.id) ? 'border-indigo-500 bg-indigo-500/10' :
                verifiedIds.has(item.id) ? 'border-emerald-500/50 bg-emerald-500/10 opacity-60' :
                item.status === 'expired' ? 'border-rose-500/30 bg-rose-500/5' : 
                item.status === 'critical' ? 'border-amber-500/30 bg-amber-500/5' :
                item.status === 'withdrawal' ? 'border-indigo-500/30 bg-indigo-500/5' :
                item.status === 'next_expiry' ? 'border-blue-500/30 bg-blue-500/5' :
                'border-white/5'
              }`}
            >
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="flex flex-col gap-1.5 shrink-0">
                  <div 
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelect(item.id);
                    }}
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-lg ${
                      selectedIds.has(item.id) ? 'bg-indigo-500 text-white' :
                      item.status === 'expired' ? 'bg-rose-500/20 text-rose-500 border border-rose-500/30' : 
                      item.status === 'critical' ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' :
                      item.status === 'withdrawal' ? 'bg-indigo-500/20 text-indigo-500 border border-indigo-500/30' :
                      item.status === 'next_expiry' ? 'bg-blue-500/20 text-blue-500 border border-blue-500/30' :
                      'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30'
                    }`}
                  >
                    {selectedIds.has(item.id) ? <CheckSquare className="w-6 h-6" /> :
                     item.status === 'expired' ? <AlertTriangle className="w-6 h-6" /> : 
                     item.status === 'critical' ? <ShieldAlert className="w-6 h-6" /> :
                     item.status === 'withdrawal' ? <Download className="w-6 h-6" /> :
                     item.status === 'next_expiry' ? <Clock className="w-6 h-6" /> :
                     <CheckCircle2 className="w-6 h-6" />}
                  </div>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleVerified(item.id);
                    }}
                    className={`w-12 py-0.5 rounded-lg text-[7px] font-black uppercase tracking-widest transition-all border ${
                      verifiedIds.has(item.id)
                        ? 'bg-emerald-500 border-emerald-400 text-white'
                        : 'bg-white/5 border-white/10 text-slate-500 hover:border-emerald-500/50'
                    }`}
                  >
                    {verifiedIds.has(item.id) ? 'OK' : 'VERIF'}
                  </button>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-black bg-slate-800 text-slate-200 px-2 py-0.5 rounded-md uppercase tracking-widest border border-white/10">
                      {item.barcode}
                    </span>
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest truncate max-w-[120px]">
                      {item.providerName}
                    </span>
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest ${
                      item.type === 'Individual' ? 'bg-blue-500/20 text-blue-400' : 
                      item.type === 'Bulto/Caja' ? 'bg-purple-500/20 text-purple-400' :
                      'bg-emerald-500/20 text-emerald-400'
                    }`}>
                      {item.type}
                    </span>
                    {item.location && item.location !== 'N/A' && (
                      <span className="text-[9px] font-black bg-indigo-500/20 px-1.5 py-0.5 rounded text-indigo-400 uppercase tracking-widest border border-indigo-500/20">
                        {item.location}
                      </span>
                    )}
                    {item.batch && item.batch !== 'N/A' && (
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-auto">
                        LOTE: {item.batch}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between gap-4 mb-1.5">
                    <h3 className="font-black text-xl tracking-tighter uppercase italic leading-none truncate text-white group-hover:text-amber-400 transition-colors flex-1">
                      {item.productName}
                    </h3>
                    
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded-lg border border-white/5">
                        <CalendarDays className="w-3.5 h-3.5 text-amber-500" />
                        <span className="text-sm font-black text-white uppercase tracking-tighter">
                          VENCE: {item.expiryDateObj ? format(item.expiryDateObj, "dd MMM yyyy", { locale: es }) : 'Sin fecha'}
                        </span>
                      </div>

                      {item.withdrawalDate && (
                        <div className="flex items-center gap-1.5 bg-indigo-500/10 px-2 py-1 rounded-lg border border-indigo-500/20">
                          <Download className="w-3 h-3 text-indigo-500" />
                          <span className="text-[10px] font-black text-indigo-400 uppercase tracking-tighter">
                            RETIRO: {format(item.withdrawalDate, "dd MMM yyyy", { locale: es })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${item.lifePercent}%` }}
                      className={`h-full rounded-full ${
                        item.status === 'expired' ? 'bg-rose-500' :
                        item.status === 'critical' ? 'bg-amber-500' :
                        item.status === 'next_expiry' ? 'bg-blue-500' :
                        'bg-emerald-500'
                      }`}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 ml-4 shrink-0">
                <div className="text-right">
                  <div className={`text-3xl font-black uppercase tracking-tighter leading-none mb-0.5 italic ${
                    item.status === 'expired' ? 'text-rose-500 drop-shadow-[0_0_10px_rgba(244,63,94,0.3)]' : 
                    item.status === 'critical' ? 'text-amber-500 drop-shadow-[0_0_10px_rgba(245,158,11,0.3)]' :
                    item.status === 'withdrawal' ? 'text-indigo-500 drop-shadow-[0_0_10px_rgba(99,102,241,0.3)]' :
                    item.status === 'next_expiry' ? 'text-blue-500' :
                    'text-emerald-500'
                  }`}>
                    {item.status === 'expired' ? 'VENCIDO' : 
                     item.status === 'critical' ? `${item.daysLeft}D` :
                     item.status === 'withdrawal' ? 'RETIRO' :
                     item.status === 'next_expiry' ? 'PRÓX' :
                     'OK'}
                  </div>
                  <div className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em]">
                    {item.status === 'next_expiry' ? 'PRÓXIMO VENC' : 
                     item.status === 'withdrawal' ? 'RETIRO POR CANJE' :
                     item.status === 'critical' ? 'ESTADO CRÍTICO' : 'VIGENTE'}
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveItem(item);
                  }}
                  className="w-10 h-10 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded-xl flex items-center justify-center transition-all border border-rose-500/20 group-hover:scale-110"
                  title="Retirar Producto"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {processedScans.length > displayLimit && (
          <div className="flex justify-center py-8">
            <button
              onClick={() => setDisplayLimit(prev => prev + 50)}
              className="bg-white/5 hover:bg-white/10 border border-white/10 px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3 group"
            >
              <ChevronRight className="w-4 h-4 text-amber-500 group-hover:translate-x-1 transition-transform rotate-90" />
              Cargar más productos
              <span className="text-slate-500">({processedScans.length - displayLimit} restantes)</span>
            </button>
          </div>
        )}

        {processedScans.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-4 border border-white/5">
              <Calendar className="w-10 h-10 text-slate-700" />
            </div>
            <h3 className="text-lg font-black uppercase tracking-tighter italic text-slate-500">Sin registros</h3>
            <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest max-w-[200px] mt-2">
              No se encontraron productos con fecha de vencimiento registrada.
            </p>
          </div>
        )}
      </div>

      {/* FOOTER INFO */}
      <div className="p-4 bg-slate-900/80 backdrop-blur-xl border-t border-white/5 flex justify-between items-center shrink-0">
        <div className="flex flex-col">
          <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Total Monitoreado</span>
          <span className="text-sm font-black">{stats.total} SKUs</span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Última Sincronización</span>
          <span className="text-sm font-black uppercase italic tracking-tighter">{format(new Date(), 'HH:mm:ss')}</span>
        </div>
      </div>
    </div>
  );
};

export default ExpiryManagementPage;
