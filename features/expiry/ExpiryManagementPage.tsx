
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
  CalendarDays
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, differenceInDays, isPast, isBefore, addDays, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const ExpiryManagementPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'expired' | 'soon' | 'safe'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'name'>('date');

  const scans = useLiveQuery(() => 
    db.scans.filter(s => !!s.expiryDate || (!!s.mm && !!s.yyyy)).toArray()
  );
  const sessions = useLiveQuery(() =>
    db.sessions.filter(s => !!s.mm && !!s.yyyy).toArray()
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
    const soonThreshold = addDays(now, 30);

    const individualItems = scans.map(scan => {
      let expiry: Date | null = null;
      if (scan.expiryDate) {
        expiry = parseISO(scan.expiryDate);
      } else if (scan.mm && scan.yyyy) {
        expiry = new Date(scan.yyyy, scan.mm, 0);
      }

      const productName = productMap.get(scan.barcode)?.name || 'Producto Desconocido';
      
      let status: 'expired' | 'soon' | 'safe' = 'safe';
      let daysLeft = 0;

      if (expiry) {
        daysLeft = differenceInDays(expiry, now);
        if (isPast(expiry)) {
          status = 'expired';
        } else if (isBefore(expiry, soonThreshold)) {
          status = 'soon';
        }
      }

      return {
        ...scan,
        productName,
        status,
        daysLeft,
        expiryDateObj: expiry,
        type: 'Individual'
      };
    });

    const sessionItems = (sessions || []).map(session => {
      let expiry: Date | null = null;
      if (session.mm && session.yyyy) {
        expiry = new Date(session.yyyy, session.mm, 0);
      }

      const productName = productMap.get(session.logisticsLabel)?.name || `Bulto: ${session.logisticsLabel}`;
      
      let status: 'expired' | 'soon' | 'safe' = 'safe';
      let daysLeft = 0;

      if (expiry) {
        daysLeft = differenceInDays(expiry, now);
        if (isPast(expiry)) {
          status = 'expired';
        } else if (isBefore(expiry, soonThreshold)) {
          status = 'soon';
        }
      }

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
        quantity: session.totalUnits || 0
      };
    });

    const allItems = [...individualItems, ...sessionItems];

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
  }, [scans, sessions, productMap, searchQuery, filterStatus, sortBy]);

  const stats = useMemo(() => {
    if (!processedScans) return { expired: 0, soon: 0, total: 0 };
    return {
      expired: processedScans.filter(s => s.status === 'expired').length,
      soon: processedScans.filter(s => s.status === 'soon').length,
      total: processedScans.length
    };
  }, [processedScans]);

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
            <div className="bg-rose-500/10 border border-rose-500/20 px-3 py-1 rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-3 h-3 text-rose-500" />
              <span className="text-[10px] font-black text-rose-500">{stats.expired}</span>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-lg flex items-center gap-2">
              <Clock className="w-3 h-3 text-amber-500" />
              <span className="text-[10px] font-black text-amber-500">{stats.soon}</span>
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
            {(['all', 'expired', 'soon', 'safe'] as const).map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${
                  filterStatus === s 
                    ? 'bg-amber-600 border-amber-400 text-white shadow-lg shadow-amber-900/20' 
                    : 'bg-white/5 border-white/5 text-slate-500 hover:text-white'
                }`}
              >
                {s === 'all' ? 'Todos' : s === 'expired' ? 'Vencidos' : s === 'soon' ? 'Próximos' : 'Vigentes'}
              </button>
            ))}
          </div>
        </div>
      </div>

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
              className={`bg-white/5 border rounded-2xl p-4 flex items-center justify-between group ${
                item.status === 'expired' ? 'border-rose-500/30 bg-rose-500/5' : 
                item.status === 'soon' ? 'border-amber-500/30 bg-amber-500/5' :
                'border-white/5'
              }`}
            >
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                  item.status === 'expired' ? 'bg-rose-500/20 text-rose-500' : 
                  item.status === 'soon' ? 'bg-amber-500/20 text-amber-500' :
                  'bg-emerald-500/20 text-emerald-500'
                }`}>
                  {item.status === 'expired' ? <AlertTriangle className="w-6 h-6" /> : 
                   item.status === 'soon' ? <Clock className="w-6 h-6" /> :
                   <CheckCircle2 className="w-6 h-6" />}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{item.barcode}</span>
                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest ${item.type === 'Individual' ? 'bg-blue-500/10 text-blue-500' : 'bg-purple-500/10 text-purple-500'}`}>
                      {item.type}
                    </span>
                    {item.batch && (
                      <span className="text-[8px] font-black bg-white/10 px-1.5 py-0.5 rounded text-slate-400 uppercase tracking-widest">Lote: {item.batch}</span>
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
                  item.status === 'soon' ? 'text-amber-500' :
                  'text-emerald-500'
                }`}>
                  {item.status === 'expired' ? 'Vencido' : 
                   item.status === 'soon' ? `${item.daysLeft} días` :
                   'Vigente'}
                </div>
                <div className="text-[7px] font-bold text-slate-600 uppercase tracking-widest">Estado</div>
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
