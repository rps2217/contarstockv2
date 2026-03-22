
import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { ScanRecord, Product } from '../../types';
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
  ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, differenceInDays, isPast, isBefore, addDays, parseISO, startOfMonth, addMonths, endOfMonth, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { importExpirationsFromCloud } from '../../services/syncManager';
import { toast } from 'sonner';

type ExpiryStatus = 'expired' | 'critical' | 'next_expiry' | 'safe';

const ExpiryManagementPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | ExpiryStatus>('all');
  const [sortBy, setSortBy] = useState<'date' | 'name'>('date');
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleSyncExpirations = async () => {
    try {
      setIsSyncing(true);
      const count = await importExpirationsFromCloud();
      toast.success(`Se sincronizaron ${count} vencimientos de la nube.`);
    } catch (error: any) {
      toast.error(`Error al sincronizar: ${error.message}`);
    } finally {
      setIsSyncing(false);
    }
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

  const toggleSelectAll = (items: any[]) => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map(i => i.id)));
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
                <th>Cant.</th>
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
                  <td>${item.quantity}</td>
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
    const headers = ["SKU", "Producto", "Vencimiento", "Estado", "Cantidad", "Ubicacion"];
    const rows = processedScans.map(item => [
      item.barcode,
      item.productName,
      item.expiryDateObj ? format(item.expiryDateObj, 'yyyy-MM-dd') : '',
      item.status.toUpperCase(),
      item.quantity,
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

  const productMap = useMemo(() => {
    const map = new Map<string, Product>();
    products?.forEach(p => map.set(p.barcode, p));
    return map;
  }, [products]);

  const processedScans = useMemo(() => {
    if (!scans) return [];

    const now = new Date();
    const criticalThreshold = addDays(now, 30);
    
    // Rango "Próximo Vencimiento" (4 meses posteriores al mes en curso)
    const startOfNextMonth = startOfMonth(addMonths(now, 1));
    const endOfFourMonths = endOfMonth(addMonths(now, 4));

    const getStatus = (expiry: Date | null): ExpiryStatus => {
      if (!expiry) return 'safe';
      
      const daysLeft = differenceInDays(expiry, now);
      
      if (isPast(expiry)) return 'expired';
      if (isBefore(expiry, criticalThreshold)) return 'critical';
      
      if (isWithinInterval(expiry, { start: startOfNextMonth, end: endOfFourMonths })) {
        return 'next_expiry';
      }
      
      return 'safe';
    };

    const individualItems = scans.map(scan => {
      let expiry: Date | null = null;
      if (scan.expiryDate) {
        expiry = parseISO(scan.expiryDate);
      } else if (scan.mm && scan.yyyy) {
        expiry = new Date(scan.yyyy, scan.mm, 0);
      }

      const productName = productMap.get(scan.barcode)?.name || 'Producto Desconocido';
      const status = getStatus(expiry);
      const daysLeft = expiry ? differenceInDays(expiry, now) : 0;

      return {
        ...scan,
        productName,
        status,
        daysLeft,
        expiryDateObj: expiry,
        type: 'Individual',
        location: scan.location || 'N/A'
      };
    });

    const sessionItems = (sessions || []).map(session => {
      let expiry: Date | null = null;
      if (session.mm && session.yyyy) {
        expiry = new Date(session.yyyy, session.mm, 0);
      }

      const productName = productMap.get(session.logisticsLabel)?.name || `Bulto: ${session.logisticsLabel}`;
      const status = getStatus(expiry);
      const daysLeft = expiry ? differenceInDays(expiry, now) : 0;

      return {
        id: session.id,
        barcode: session.logisticsLabel,
        productName,
        status,
        daysLeft,
        expiryDateObj: expiry,
        batch: session.batch || 'N/A',
        type: 'Bulto/Caja',
        timestamp: session.createdAt,
        quantity: session.totalUnits || 0,
        location: session.logisticsLabel || 'N/A'
      };
    });

    const cloudItems = (cloudExpirations || []).map(exp => {
      let expiry: Date | null = null;
      if (exp.mm && exp.yyyy) {
        expiry = new Date(exp.yyyy, exp.mm, 0);
      }

      const status = getStatus(expiry);
      const daysLeft = expiry ? differenceInDays(expiry, now) : 0;

      return {
        id: exp.id,
        barcode: exp.barcode,
        productName: exp.productName,
        status,
        daysLeft,
        expiryDateObj: expiry,
        batch: 'N/A',
        type: 'Nube',
        timestamp: exp.timestamp,
        quantity: exp.quantity || 0,
        location: exp.location || 'N/A'
      };
    });

    const allItems = [...individualItems, ...sessionItems, ...cloudItems];

    return allItems.filter(item => {
      const matchesSearch = 
        item.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.barcode.includes(searchQuery);
      
      const matchesFilter = 
        filterStatus === 'all' || 
        item.status === filterStatus;

      return matchesSearch && matchesFilter;
    }).sort((a, b) => {
      if (sortBy === 'date') {
        if (!a.expiryDateObj) return 1;
        if (!b.expiryDateObj) return -1;
        return a.expiryDateObj.getTime() - b.expiryDateObj.getTime();
      }
      return a.productName.localeCompare(b.productName);
    });
  }, [scans, sessions, cloudExpirations, productMap, searchQuery, filterStatus, sortBy]);

  const stats = useMemo(() => {
    if (!processedScans) return { expired: 0, critical: 0, next_expiry: 0, total: 0, valueAtRisk: 0 };
    
    const expired = processedScans.filter(s => s.status === 'expired');
    const critical = processedScans.filter(s => s.status === 'critical');
    
    const valueAtRisk = [...expired, ...critical].reduce((acc, item) => {
      const price = productMap.get(item.barcode)?.price || 0;
      return acc + (price * item.quantity);
    }, 0);

    return {
      expired: expired.length,
      critical: critical.length,
      next_expiry: processedScans.filter(s => s.status === 'next_expiry').length,
      total: processedScans.length,
      valueAtRisk
    };
  }, [processedScans, productMap]);

  return (
    <div className="h-full bg-slate-950 text-white font-mono flex flex-col overflow-hidden">
      {/* HEADER */}
      <div className="p-6 bg-slate-900/50 backdrop-blur-md border-b border-white/5 shrink-0">
        <div className="flex justify-between items-end mb-6">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tighter italic">
              CONTROL <span className="text-amber-500">VENCIMIENTOS</span>
            </h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Gestión de Vida Útil de Productos</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="bg-slate-800 border border-white/10 px-3 py-1 rounded-lg flex items-center gap-2 hover:bg-slate-700 transition-colors"
              title="Imprimir Reporte"
            >
              <Printer className="w-3 h-3 text-slate-400" />
            </button>
            <button
              onClick={handleExportCSV}
              className="bg-slate-800 border border-white/10 px-3 py-1 rounded-lg flex items-center gap-2 hover:bg-slate-700 transition-colors"
              title="Exportar CSV"
            >
              <Download className="w-3 h-3 text-slate-400" />
            </button>
            <button
              onClick={handleSyncExpirations}
              disabled={isSyncing}
              className="bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-lg flex items-center gap-2 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
            >
              <Package className={`w-3 h-3 text-emerald-500 ${isSyncing ? 'animate-spin' : ''}`} />
              <span className="text-[10px] font-black text-emerald-500 uppercase">Sync</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          <div className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-2xl">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-3 h-3 text-rose-500" />
              <span className="text-[8px] font-black text-rose-500 uppercase tracking-widest">Vencidos</span>
            </div>
            <div className="text-2xl font-black text-rose-500 leading-none">{stats.expired}</div>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-2xl">
            <div className="flex items-center gap-2 mb-1">
              <ShieldAlert className="w-3 h-3 text-amber-500" />
              <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest">Críticos</span>
            </div>
            <div className="text-2xl font-black text-amber-500 leading-none">{stats.critical}</div>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-2xl">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-3 h-3 text-blue-500" />
              <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest">Próx. Venc</span>
            </div>
            <div className="text-2xl font-black text-blue-500 leading-none">{stats.next_expiry}</div>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-2xl">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Vigentes</span>
            </div>
            <div className="text-2xl font-black text-emerald-500 leading-none">{stats.total - stats.expired - stats.critical - stats.next_expiry}</div>
          </div>
          <div className="bg-indigo-500/10 border border-indigo-500/20 p-3 rounded-2xl col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="w-3 h-3 text-indigo-400" />
              <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">Valor en Riesgo</span>
            </div>
            <div className="text-xl font-black text-indigo-400 leading-none">
              ${stats.valueAtRisk.toLocaleString('es-CL')}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text"
              placeholder="BUSCAR POR NOMBRE O SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-xs font-bold focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {(['all', 'expired', 'critical', 'next_expiry', 'safe'] as const).map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all border flex items-center gap-2 ${
                  filterStatus === s 
                    ? s === 'expired' ? 'bg-rose-600 border-rose-400 text-white' :
                      s === 'critical' ? 'bg-amber-600 border-amber-400 text-white' :
                      s === 'next_expiry' ? 'bg-blue-600 border-blue-400 text-white' :
                      'bg-emerald-600 border-emerald-400 text-white'
                    : 'bg-white/5 border-white/5 text-slate-500 hover:text-white'
                }`}
              >
                {s === 'all' && <Filter className="w-3 h-3" />}
                {s === 'expired' && <AlertTriangle className="w-3 h-3" />}
                {s === 'critical' && <ShieldAlert className="w-3 h-3" />}
                {s === 'next_expiry' && <Clock className="w-3 h-3" />}
                {s === 'safe' && <CheckCircle2 className="w-3 h-3" />}
                
                {s === 'all' ? 'Todos' : 
                 s === 'expired' ? 'Vencidos' : 
                 s === 'critical' ? 'Críticos' : 
                 s === 'next_expiry' ? 'Próx. Vencimiento' : 'Vigentes'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* BULK ACTIONS BAR */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="bg-indigo-600 px-6 py-3 flex justify-between items-center shrink-0 z-20"
          >
            <div className="flex items-center gap-4">
              <button 
                onClick={() => toggleSelectAll(processedScans)}
                className="text-white/80 hover:text-white transition-colors"
              >
                {selectedIds.size === processedScans.length ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
              </button>
              <span className="text-xs font-black uppercase tracking-widest text-white">
                {selectedIds.size} Seleccionados
              </span>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => {
                  toast.info(`Acción masiva: ${selectedIds.size} items procesados`);
                  setSelectedIds(new Set());
                }}
                className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-white border border-white/20 transition-all"
              >
                Marcar Retirado
              </button>
              <button 
                onClick={() => setSelectedIds(new Set())}
                className="text-white/60 hover:text-white text-[10px] font-black uppercase tracking-widest"
              >
                Cancelar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LISTA */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <AnimatePresence mode="popLayout">
          {processedScans.map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={() => selectedIds.size > 0 && toggleSelect(item.id)}
              className={`bg-white/5 border rounded-2xl p-4 flex items-center justify-between group cursor-pointer transition-all ${
                selectedIds.has(item.id) ? 'border-indigo-500 bg-indigo-500/10' :
                item.status === 'expired' ? 'border-rose-500/30 bg-rose-500/5' : 
                item.status === 'critical' ? 'border-amber-500/30 bg-amber-500/5' :
                item.status === 'next_expiry' ? 'border-blue-500/30 bg-blue-500/5' :
                'border-white/5'
              }`}
            >
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSelect(item.id);
                  }}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                    selectedIds.has(item.id) ? 'bg-indigo-500 text-white' :
                    item.status === 'expired' ? 'bg-rose-500/20 text-rose-500' : 
                    item.status === 'critical' ? 'bg-amber-500/20 text-amber-500' :
                    item.status === 'next_expiry' ? 'bg-blue-500/20 text-blue-500' :
                    'bg-emerald-500/20 text-emerald-500'
                  }`}
                >
                  {selectedIds.has(item.id) ? <CheckSquare className="w-5 h-5" /> :
                   item.status === 'expired' ? <AlertTriangle className="w-5 h-5" /> : 
                   item.status === 'critical' ? <ShieldAlert className="w-5 h-5" /> :
                   item.status === 'next_expiry' ? <Clock className="w-5 h-5" /> :
                   <CheckCircle2 className="w-5 h-5" />}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{item.barcode}</span>
                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest ${
                      item.type === 'Individual' ? 'bg-blue-500/10 text-blue-500' : 
                      item.type === 'Bulto/Caja' ? 'bg-purple-500/10 text-purple-500' :
                      'bg-emerald-500/10 text-emerald-500'
                    }`}>
                      {item.type}
                    </span>
                    {item.batch && item.batch !== 'N/A' && (
                      <span className="text-[8px] font-black bg-white/10 px-1.5 py-0.5 rounded text-slate-400 uppercase tracking-widest">Lote: {item.batch}</span>
                    )}
                    {item.location && (
                      <span className="text-[8px] font-black bg-indigo-500/10 px-1.5 py-0.5 rounded text-indigo-400 uppercase tracking-widest">{item.location}</span>
                    )}
                  </div>
                  <h3 className="font-black text-sm tracking-tight truncate mb-2">{item.productName}</h3>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <CalendarDays className="w-3 h-3 text-slate-500" />
                      <span className="text-[10px] font-bold text-slate-300">
                        {item.expiryDateObj ? format(item.expiryDateObj, "dd MMM yyyy", { locale: es }) : 'Sin fecha'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Package className="w-3 h-3 text-slate-500" />
                      <span className="text-[10px] font-bold text-slate-300">{item.quantity} un.</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-right ml-4">
                <div className={`text-[10px] font-black uppercase tracking-widest mb-1 ${
                  item.status === 'expired' ? 'text-rose-500' : 
                  item.status === 'critical' ? 'text-amber-500' :
                  item.status === 'next_expiry' ? 'text-blue-500' :
                  'text-emerald-500'
                }`}>
                  {item.status === 'expired' ? 'Vencido' : 
                   item.status === 'critical' ? `Crítico: ${item.daysLeft}d` :
                   item.status === 'next_expiry' ? 'Próx. Venc' :
                   'Vigente'}
                </div>
                <div className="text-[7px] font-bold text-slate-600 uppercase tracking-widest">
                  {item.status === 'next_expiry' ? '4 Meses' : 'Estado'}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

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
        <button 
          onClick={() => setSortBy(sortBy === 'date' ? 'name' : 'date')}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/10 active:scale-95 transition-all"
        >
          <ArrowUpDown className="w-3 h-3 text-amber-500" />
          <span className="text-[9px] font-black uppercase tracking-widest">Ordenar por {sortBy === 'date' ? 'Nombre' : 'Fecha'}</span>
        </button>
      </div>
    </div>
  );
};

export default ExpiryManagementPage;
