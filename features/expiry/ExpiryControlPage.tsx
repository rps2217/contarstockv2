import React, { useMemo } from 'react';
import { Calendar, Cloud, Printer, Sun, Settings, FileText, Search, Camera, Plus, Filter, X, AlertTriangle, ShieldAlert, Download, Clock, CheckCircle2 } from 'lucide-react';
import { useExpiryStore, ExpiryItem } from '../../store/useExpiryStore';
import { ExpiryCard } from './components/ExpiryCard';

const MOCK_ITEMS: ExpiryItem[] = [
  {
    id: '1',
    barcode: '78026520',
    productName: 'MENTHOLATUM UNGUENTO 18GR',
    providerName: 'DROGUERIA HOFMANN S.A.C.',
    category: 'FARMACIA',
    mm: 8,
    yyyy: 2025,
    expiryDate: '31/03/2026',
    expiryDateObj: new Date('2026-03-31'),
    withdrawalDate: new Date('2025-08-01'),
    status: 'critical',
    daysLeft: 2,
    quantity: 70,
    type: 'Individual',
    location: 'BOD. CENTRAL',
    estado: 'VIGENTE',
    hasCanje: true,
    withdrawalDays: 30
  },
  {
    id: '2',
    barcode: '8016744800181',
    productName: 'TINT. PERM. 8N RUBIO CLARO 170 ML HERBATINT',
    providerName: 'NATURALLY S.A.',
    category: 'BELLEZA',
    mm: 9,
    yyyy: 2025,
    expiryDate: '31/03/2026',
    expiryDateObj: new Date('2026-03-31'),
    withdrawalDate: new Date('2025-09-01'),
    status: 'critical',
    daysLeft: 2,
    quantity: 70,
    type: 'Individual',
    location: 'BOD. CENTRAL',
    estado: 'VIGENTE',
    hasCanje: true,
    withdrawalDays: 30
  },
  {
    id: '3',
    barcode: '78026520',
    productName: 'MENTHOLATUM UNGUENTO 18GR',
    providerName: 'DROGUERIA HOFMANN S.A.C.',
    category: 'FARMACIA',
    mm: 11,
    yyyy: 2025,
    expiryDate: '30/06/2026',
    expiryDateObj: new Date('2026-06-30'),
    withdrawalDate: new Date('2025-11-01'),
    status: 'withdrawal',
    daysLeft: 0,
    quantity: 0,
    type: 'Individual',
    location: 'BOD. CENTRAL',
    estado: 'RETIRO',
    hasCanje: true,
    withdrawalDays: 30
  },
  {
    id: '4',
    barcode: '77020189',
    productName: 'PANCRIT MIEL LIMON X 10 COMPRIMIDOS',
    providerName: 'LABORATORIOS CHILE S.A.',
    category: 'FARMACIA',
    mm: 12,
    yyyy: 2025,
    expiryDate: '31/03/2026',
    expiryDateObj: new Date('2026-03-31'),
    withdrawalDate: new Date('2025-12-01'),
    status: 'critical',
    daysLeft: 2,
    quantity: 70,
    type: 'Individual',
    location: 'BOD. CENTRAL',
    estado: 'VIGENTE',
    hasCanje: true,
    withdrawalDays: 30
  }
];

const StatusPill = ({ status, count, label, icon: Icon, colorClass, bgClass, borderClass, isActive, onClick }: any) => (
  <button 
    onClick={() => onClick(status)}
    className={`flex items-center gap-2 px-4 py-2 rounded-2xl border transition-all whitespace-nowrap ${isActive ? `${bgClass} ${borderClass} ring-1 ring-offset-1 ring-offset-slate-950 ring-${colorClass.split('-')[1]}-500` : 'bg-[#0f1219] border-white/5 hover:bg-slate-800'}`}
  >
    <Icon className={`w-4 h-4 ${colorClass}`} />
    <span className={`font-black uppercase tracking-widest text-xs ${colorClass}`}>{count} {label}</span>
  </button>
);

export const ExpiryControlPage: React.FC = () => {
  const { 
    searchQuery, setSearchQuery, 
    selectedStatuses, toggleStatus,
    verifiedIds, toggleVerified
  } = useExpiryStore();

  const items = MOCK_ITEMS;

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (selectedStatuses.length > 0 && !selectedStatuses.includes(item.status)) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return item.productName.toLowerCase().includes(q) || item.barcode.includes(q);
      }
      return true;
    });
  }, [items, selectedStatuses, searchQuery]);

  return (
    <div className="flex flex-col h-screen bg-[#0B0E14] font-mono overflow-hidden">
      {/* Header */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between p-6 shrink-0 gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
            <Calendar className="w-7 h-7 text-amber-500" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-white uppercase italic tracking-tighter leading-none">
              Control de Vencimientos
            </h1>
            <div className="flex items-center gap-2 mt-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"></div>
              <span className="text-[10px] font-bold text-emerald-500/80 uppercase tracking-widest">
                Monitoreo de vida útil y retiros
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500/20 transition-colors">
            <AlertTriangle className="w-4 h-4" /> Eventos
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 text-[10px] font-black uppercase tracking-widest hover:bg-amber-500/20 transition-colors">
            <Cloud className="w-4 h-4" /> Sincronizar Nube
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-colors">
            <Printer className="w-4 h-4" /> Imprimir
          </button>
          <button className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-300 hover:bg-white/10 transition-colors">
            <Sun className="w-4 h-4" />
          </button>
          <button className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-300 hover:bg-white/10 transition-colors">
            <Settings className="w-4 h-4" />
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-colors">
            <FileText className="w-4 h-4" /> Exportar CSV
          </button>
        </div>
      </header>

      {/* Status Pills */}
      <div className="flex items-center gap-3 px-6 mb-6 shrink-0 overflow-x-auto no-scrollbar pb-2">
        <StatusPill status="expired" count={38} label="Vencidos" icon={AlertTriangle} colorClass="text-rose-500" bgClass="bg-rose-500/10" borderClass="border-rose-500/30" isActive={selectedStatuses.includes('expired')} onClick={toggleStatus} />
        <StatusPill status="critical" count={29} label="Críticos" icon={ShieldAlert} colorClass="text-amber-500" bgClass="bg-amber-500/10" borderClass="border-amber-500/30" isActive={selectedStatuses.includes('critical')} onClick={toggleStatus} />
        <StatusPill status="withdrawal" count={60} label="Retiros" icon={Download} colorClass="text-indigo-400" bgClass="bg-indigo-500/10" borderClass="border-indigo-500/30" isActive={selectedStatuses.includes('withdrawal')} onClick={toggleStatus} />
        <StatusPill status="next_expiry" count={92} label="Próx" icon={Clock} colorClass="text-blue-400" bgClass="bg-blue-500/10" borderClass="border-blue-500/30" isActive={selectedStatuses.includes('next_expiry')} onClick={toggleStatus} />
        <StatusPill status="safe" count={718} label="Vigentes" icon={CheckCircle2} colorClass="text-emerald-500" bgClass="bg-emerald-500/10" borderClass="border-emerald-500/30" isActive={selectedStatuses.includes('safe')} onClick={toggleStatus} />
      </div>

      {/* Search & Action Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 px-6 mb-6 shrink-0">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input 
            type="text" 
            placeholder="BUSCAR POR NOMBRE, SKU O LOTE..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0f1219] border border-amber-500/30 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500 focus:bg-slate-900 transition-colors"
          />
        </div>
        <div className="flex items-center gap-3">
          <button className="w-14 h-14 rounded-2xl bg-[#0f1219] border border-amber-500/30 flex items-center justify-center text-amber-500 hover:bg-amber-500/20 transition-colors shrink-0">
            <Camera className="w-6 h-6" />
          </button>
          <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-amber-500 text-black font-black uppercase tracking-widest text-sm hover:bg-amber-400 transition-colors shrink-0">
            <Plus className="w-5 h-5" /> Nuevo
          </button>
          <button className="flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-[#2a2f3d] border border-slate-700 text-white font-black uppercase tracking-widest text-sm hover:bg-slate-700 transition-colors shrink-0">
            <Filter className="w-5 h-5" /> Filtros
          </button>
          <button className="w-14 h-14 rounded-2xl bg-[#2a2f3d] border border-slate-700 flex items-center justify-center text-slate-400 hover:bg-slate-700 hover:text-white transition-colors shrink-0">
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* List Area */}
      <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-3 custom-scrollbar">
        {filteredItems.map(item => (
          <ExpiryCard 
            key={item.id} 
            item={item} 
            onVerify={toggleVerified} 
            onDelete={() => {}} 
            isVerified={verifiedIds.has(item.id)} 
          />
        ))}
      </div>

      {/* Footer */}
      <footer className="bg-[#0B0E14] border-t border-white/5 px-6 py-4 flex justify-between items-center shrink-0">
        <div className="flex flex-col">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Total Monitoreado</span>
          <span className="text-slate-300 font-bold text-sm">937 SKUs</span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Última Sincronización</span>
          <span className="text-slate-300 font-bold text-sm">13:13:26</span>
        </div>
      </footer>
    </div>
  );
};

export default ExpiryControlPage;
