
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  Clock, 
  ArrowLeft, 
  Download,
  CheckCircle2,
  AlertCircle,
  Filter,
  FileDown,
  AlertOctagon
} from 'lucide-react';
import { useComplianceData, useComplianceExport, RiskFilter, RiskItem } from './hooks/useComplianceData';
import { toast } from 'sonner';

interface ComplianceDashboardPageProps {
  theme?: 'dark' | 'light' | 'high-contrast';
}

const ComplianceDashboardPage: React.FC<ComplianceDashboardPageProps> = ({ theme = 'dark' }) => {
  const navigate = useNavigate();
  const stats = useComplianceData();
  const { exportToCSV, exportCriticalOnly } = useComplianceExport();
  const [activeFilter, setActiveFilter] = useState<RiskFilter>('all');
  const [isExporting, setIsExporting] = useState(false);

  const isHighContrast = theme === 'high-contrast';
  const isLight = theme === 'light';
	
  // Clases según tema
  const pageBg = isHighContrast ? 'bg-black' : isLight ? 'bg-white' : 'bg-slate-950';
  const headerBg = isHighContrast ? 'bg-yellow-950/30' : isLight ? 'bg-slate-50' : 'bg-slate-900/50';
  const headerBorder = isHighContrast ? 'border-yellow-400/30' : isLight ? 'border-slate-200' : 'border-white/5';
  const titleText = isHighContrast ? 'text-yellow-400' : isLight ? 'text-slate-900' : 'text-white';
  const subtitleText = isHighContrast ? 'text-yellow-500' : isLight ? 'text-slate-500' : 'text-slate-500';
  const backBtn = isHighContrast ? 'bg-yellow-900/20 hover:bg-yellow-900/30 text-yellow-400' : isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-600' : 'bg-white/5 hover:bg-white/10 text-slate-400';
  const accentBlue = isHighContrast ? 'text-yellow-400' : isLight ? 'text-blue-600' : 'text-blue-500';
  const divider = isHighContrast ? 'bg-yellow-400' : isLight ? 'bg-blue-500' : 'bg-blue-500';
  const sectionTitle = isHighContrast ? 'text-yellow-400' : isLight ? 'text-slate-700' : 'text-slate-300';
  const emptyStateBg = isHighContrast ? 'bg-yellow-950/20 border-yellow-400/30' : isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/30 border-white/5';

  // Filtrar items según el filtro activo
  const filteredItems = useMemo(() => {
    if (!stats) return [];
    if (activeFilter === 'all') return stats.riskItems;
    return stats.riskItems.filter(item => item.status === activeFilter);
  }, [stats, activeFilter]);

  // Handlers de export
  const handleExportAll = async () => {
    if (!stats || stats.riskItems.length === 0) {
      toast.info('No hay alertas para exportar');
      return;
    }
    setIsExporting(true);
    try {
      const count = await exportToCSV(stats.riskItems);
      toast.success(`Exportadas ${count} alertas`);
    } catch {
      toast.error('Error al exportar');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCritical = async () => {
    if (!stats || stats.criticalCount === 0) {
      toast.info('No hay alertas críticas para exportar');
      return;
    }
    setIsExporting(true);
    try {
      const count = await exportCriticalOnly(stats.riskItems);
      toast.success(`Exportadas ${count} alertas críticas`);
    } catch {
      toast.error('Error al exportar');
    } finally {
      setIsExporting(false);
    }
  };

  // Filtros disponibles
  const filters: { key: RiskFilter; label: string; count: number; color: string; icon: React.ReactNode }[] = [
    { 
      key: 'all', 
      label: 'Todos', 
      count: stats?.totalItems || 0, 
      color: 'text-blue-400 bg-blue-500/20 border-blue-500/30',
      icon: <Filter className="w-3 h-3" />
    },
    { 
      key: 'critical', 
      label: 'Críticos', 
      count: stats?.criticalCount || 0, 
      color: 'text-rose-400 bg-rose-500/20 border-rose-500/30',
      icon: <AlertOctagon className="w-3 h-3" />
    },
    { 
      key: 'warning', 
      label: 'Advertencia', 
      count: stats?.warningCount || 0, 
      color: 'text-amber-400 bg-amber-500/20 border-amber-500/30',
      icon: <AlertTriangle className="w-3 h-3" />
    },
    { 
      key: 'protected', 
      label: 'OK', 
      count: stats?.protectedCount || 0, 
      color: 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30',
      icon: <ShieldCheck className="w-3 h-3" />
    },
  ];

  if (!stats) return null;

  return (
    <div className={`h-full flex flex-col overflow-hidden ${pageBg}`}>
      {/* HEADER */}
      <header className={`p-4 md:px-6 py-4 border-b backdrop-blur-xl sticky top-0 z-20 shrink-0 ${headerBg} ${headerBorder}`}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/reports')}
              className={`w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center transition-colors ${backBtn}`}
            >
              <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
            </button>
            <div>
              <h1 className={`text-base md:text-xl font-black uppercase tracking-tighter italic ${titleText}`}>
                Control de <span className={accentBlue}>Cumplimiento</span>
              </h1>
              <p className={`text-[9px] md:text-[10px] font-bold uppercase tracking-[0.2em] mt-0.5 ${subtitleText}`}>Auditoría de Retiros</p>
            </div>
          </div>
          
          {/* Botones de exportar */}
          <div className="flex items-center gap-2">
            <button 
              onClick={handleExportCritical}
              disabled={isExporting || stats.criticalCount === 0}
              className={`p-2 px-3 rounded-lg flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider transition-all disabled:opacity-50 ${
                isHighContrast ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-400' : 
                isLight ? 'bg-rose-100 hover:bg-rose-200 text-rose-600' : 
                'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400'
              }`}
            >
              <FileDown className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Críticos ({stats.criticalCount})</span>
              <span className="sm:hidden">{stats.criticalCount}</span>
            </button>
            <button 
              onClick={handleExportAll}
              disabled={isExporting || stats.totalItems === 0}
              className={`p-2 px-3 rounded-lg flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider transition-all disabled:opacity-50 ${
                isHighContrast ? 'bg-yellow-900/20 hover:bg-yellow-900/30 text-yellow-400' : 
                isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-600' : 
                'bg-white/5 hover:bg-white/10 text-slate-400'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Exportar Todo</span>
              <span className="sm:hidden">CSV</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 md:px-6 space-y-4 max-w-7xl mx-auto w-full flex flex-col min-h-0 overflow-hidden">
        {/* FILTROS */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 shrink-0">
          <div className={`w-1.5 h-5 rounded-full shrink-0 ${divider}`} />
          {filters.map((filter) => (
            <button
              key={filter.key}
              onClick={() => setActiveFilter(filter.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all shrink-0 border ${
                activeFilter === filter.key
                  ? `${filter.color}`
                  : isHighContrast ? 'text-yellow-600 border-yellow-400/20 hover:bg-yellow-900/20' : 
                    isLight ? 'text-slate-500 border-slate-200 hover:bg-slate-100' : 
                    'text-slate-500 border-white/5 hover:bg-white/5'
              }`}
            >
              {filter.icon}
              <span className="hidden xs:inline">{filter.label}</span>
              <span className="font-black">{filter.count}</span>
            </button>
          ))}
        </div>

        {/* CONTADOR */}
        <div className="flex items-center justify-between px-2 shrink-0">
          <span className={`text-[10px] font-black uppercase tracking-widest ${
            isHighContrast ? 'text-yellow-500' : isLight ? 'text-slate-500' : 'text-slate-500'
          }`}>
            {filteredItems.length} de {stats.totalItems} registros
          </span>
        </div>

        {/* LISTA DE ALERTAS */}
        <div className="flex-1 overflow-y-auto pr-1 md:pr-2 space-y-2 md:space-y-3 custom-scrollbar min-h-0 pb-20 md:pb-24">
          {filteredItems.length === 0 ? (
            <div className={`p-12 md:p-20 rounded-[2rem] border border-dashed text-center flex flex-col items-center justify-center h-48 md:h-64 ${emptyStateBg}`}>
              <div className={`w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center mb-4 md:mb-6 ${
                isHighContrast ? 'bg-green-500/20' : isLight ? 'bg-emerald-100' : 'bg-emerald-500/10'
              }`}>
                <CheckCircle2 className={`w-8 h-8 md:w-10 md:h-10 ${
                  isHighContrast ? 'text-green-400' : isLight ? 'text-emerald-500' : 'text-emerald-500/40'
                }`} />
              </div>
              <p className={`text-base md:text-lg font-bold italic ${
                isHighContrast ? 'text-yellow-500' : isLight ? 'text-slate-500' : 'text-slate-400'
              }`}>
                {activeFilter === 'all' ? 'Estado Nominal' : `Sin ${activeFilter === 'critical' ? 'críticos' : activeFilter === 'warning' ? 'advertencias' : 'items'}`}
              </p>
              <p className={`text-xs md:text-sm mt-2 ${
                isHighContrast ? 'text-yellow-600' : isLight ? 'text-slate-400' : 'text-slate-600'
              }`}>
                {activeFilter === 'all' 
                  ? 'Todos los registros están dentro de los plazos de retiro.'
                  : 'No hay alertas en esta categoría.'
                }
              </p>
            </div>
          ) : (
            filteredItems.map((item, idx) => (
              <RiskItemRow 
                key={`${item.barcode}-${idx}`} 
                item={item} 
                theme={theme}
              />
            ))
          )}
        </div>
      </main>
    </div>
  );
};

interface RiskItemRowProps {
  item: RiskItem;
  theme?: 'dark' | 'light' | 'high-contrast';
}

const RiskItemRow: React.FC<RiskItemRowProps> = ({ item, theme = 'dark' }) => {
  const isHighContrast = theme === 'high-contrast';
  const isLight = theme === 'light';

  const rowBg = isHighContrast 
    ? 'bg-yellow-950/20 border-yellow-400/30 hover:bg-yellow-950/30' 
    : isLight 
    ? 'bg-slate-50 border-slate-200 hover:bg-slate-100' 
    : 'bg-slate-900/50 border-white/5 hover:bg-slate-900 hover:border-white/10';
  const titleText = isHighContrast ? 'text-yellow-400' : isLight ? 'text-slate-900' : 'text-white';
  const subtitleText = isHighContrast ? 'text-yellow-500' : isLight ? 'text-slate-500' : 'text-slate-400';
  const divider = isHighContrast ? 'border-yellow-400/30' : isLight ? 'border-slate-200' : 'border-white/5';

  const getStatusBadge = () => {
    if (item.status === 'critical') {
      return {
        container: isHighContrast ? 'bg-red-500 text-white' : isLight ? 'bg-rose-500 text-white' : 'bg-rose-500 text-white',
        icon: <AlertCircle className="w-6 h-6 md:w-7 md:h-7" />
      };
    }
    if (item.status === 'warning') {
      return {
        container: isHighContrast ? 'bg-yellow-500/20 text-yellow-400' : isLight ? 'bg-amber-50 text-amber-500' : 'bg-amber-500/10 text-amber-500',
        icon: <Clock className="w-6 h-6 md:w-7 md:h-7" />
      };
    }
    return {
      container: isHighContrast ? 'bg-green-500/20 text-green-400' : isLight ? 'bg-emerald-50 text-emerald-500' : 'bg-emerald-500/10 text-emerald-500',
      icon: <ShieldCheck className="w-6 h-6 md:w-7 md:h-7" />
    };
  };

  const getExchangeBadge = () => {
    if (item.hasExchange) {
      return isHighContrast ? 'bg-green-500/20 text-green-400 border-green-500/30' 
        : isLight ? 'bg-emerald-100 text-emerald-700 border-emerald-200' 
        : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
    }
    return isHighContrast ? 'bg-red-500/20 text-red-400 border-red-500/30' 
      : isLight ? 'bg-rose-100 text-rose-700 border-rose-200' 
      : 'bg-rose-500/10 text-rose-500 border-rose-500/20';
  };

  const status = getStatusBadge();
  const daysColor = item.daysToWithdraw < 0 
    ? (isHighContrast ? 'text-red-400' : 'text-rose-500')
    : (isHighContrast ? 'text-yellow-400' : 'text-amber-500');

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`group p-3 md:p-5 rounded-2xl border transition-all flex items-center gap-3 md:gap-6 ${rowBg}`}
    >
      <div className={`${status.container} rounded-xl shrink-0 flex items-center justify-center w-11 h-11 md:w-14 md:h-14`}>
        {status.icon}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-1.5 md:gap-3 mb-1">
          <span className={`text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] ${subtitleText}`}>
            {item.barcode}
          </span>
          <span className={`text-[7px] md:text-[8px] font-black uppercase px-1.5 md:px-2 py-0.5 rounded-full border ${getExchangeBadge()}`}>
            {item.hasExchange ? 'CANJE' : 'SIN CANJE'}
          </span>
        </div>
        <h4 className={`text-sm md:text-base font-black truncate uppercase tracking-tight italic ${titleText}`}>
          {item.name}
        </h4>
        <div className={`flex items-center gap-1.5 md:gap-2 mt-0.5 md:mt-1 ${subtitleText}`}>
          <p className={`text-[9px] md:text-[11px] font-bold uppercase truncate max-w-[100px] md:max-w-none ${subtitleText}`}>
            {item.providerName}
          </p>
          <span className={isHighContrast ? 'text-yellow-700' : isLight ? 'text-slate-300' : 'text-slate-700'}>•</span>
          <span className={`text-[9px] md:text-[10px] font-bold uppercase ${subtitleText}`}>
            Exp: {item.expiryDate}
          </span>
        </div>
      </div>

      <div className={`text-right shrink-0 px-2 md:px-6 border-l ${divider}`}>
        <div className={`text-base md:text-lg font-black tracking-tighter ${titleText}`}>
          {item.quantity} 
          <span className={`text-[8px] md:text-[10px] tracking-normal uppercase ${subtitleText}`}>Unid</span>
        </div>
        <div className={`text-[9px] md:text-[10px] font-black uppercase mt-0.5 md:mt-1 tracking-widest ${daysColor}`}>
          {item.daysToWithdraw < 0 
            ? `${Math.abs(item.daysToWithdraw)}d PASADO` 
            : `${item.daysToWithdraw}d EN SALA`
          }
        </div>
      </div>
    </motion.div>
  );
};

export { ComplianceDashboardPage };
export default ComplianceDashboardPage;
