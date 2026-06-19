import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  Clock, 
  ArrowLeft, 
  Download,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useComplianceData } from './hooks/useComplianceData';

interface ComplianceDashboardPageProps {
  theme?: 'dark' | 'light' | 'high-contrast';
}

const ComplianceDashboardPage: React.FC<ComplianceDashboardPageProps> = ({ theme = 'dark' }) => {
  const navigate = useNavigate();
  const stats = useComplianceData();

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
  const badgeBg = isHighContrast ? 'bg-yellow-900/20 border-yellow-400/30 text-yellow-500' : isLight ? 'bg-slate-100 border-slate-200 text-slate-500' : 'bg-white/5 border-white/5 text-slate-600';
  const divider = isHighContrast ? 'bg-yellow-400' : isLight ? 'bg-blue-500' : 'bg-blue-500';
  const sectionTitle = isHighContrast ? 'text-yellow-400' : isLight ? 'text-slate-700' : 'text-slate-300';
  const emptyStateBg = isHighContrast ? 'bg-yellow-950/20 border-yellow-400/30' : isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/30 border-white/5';

  if (!stats) return null;

  return (
    <div className={`h-screen flex flex-col overflow-hidden ${pageBg}`}>
      {/* HEADER TÉCNICO */}
      <header className={`p-6 border-b backdrop-blur-xl sticky top-0 z-20 shrink-0 ${headerBg} ${headerBorder}`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/')}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${backBtn}`}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className={`text-xl font-black uppercase tracking-tighter italic ${titleText}`}>Control de <span className={accentBlue}>Cumplimiento</span></h1>
              <p className={`text-[10px] font-bold uppercase tracking-[0.2em] mt-1 ${subtitleText}`}>Auditoría de Retiros y Políticas</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
             <button className={`p-2.5 rounded-xl flex items-center gap-2 text-xs font-bold uppercase tracking-widest transition-all ${isHighContrast ? 'bg-yellow-900/20 hover:bg-yellow-900/30 text-yellow-400' : isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-600' : 'bg-white/5 hover:bg-white/10 text-slate-400'}`}>
                <Download className="w-4 h-4" />
                Exportar Alertas
             </button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full flex flex-col min-h-0 overflow-hidden">
        {/* CABECERA DE LA MATRIZ */}
        <div className="flex items-center justify-between px-2 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-1.5 h-6 rounded-full ${divider}`} />
            <h3 className={`text-sm font-black uppercase tracking-[0.2em] flex items-center gap-2 ${sectionTitle}`}>
              <AlertTriangle className={`w-5 h-5 ${isHighContrast ? 'text-red-400' : 'text-rose-500'}`} />
              Matriz de Acción Operativa
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-[10px] font-black uppercase tracking-widest rounded-full border px-3 py-1 ${badgeBg}`}>
              {stats.riskItems.length} Registros activos detectados
            </span>
          </div>
        </div>

        {/* LISTA DE ALERTAS - MAXIMA PRIORIDAD */}
        <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar h-full min-h-0 pb-10">
          {stats.riskItems.length === 0 ? (
            <div className={`p-20 rounded-[3rem] border border-dashed text-center flex flex-col items-center justify-center h-64 ${emptyStateBg}`}>
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 ${isHighContrast ? 'bg-green-500/20' : isLight ? 'bg-emerald-100' : 'bg-emerald-500/10'}`}>
                <CheckCircle2 className={`w-10 h-10 ${isHighContrast ? 'text-green-400' : isLight ? 'text-emerald-500' : 'text-emerald-500/40'}`} />
              </div>
              <p className={`text-lg font-bold italic ${isHighContrast ? 'text-yellow-500' : isLight ? 'text-slate-500' : 'text-slate-400'}`}>Estado Nominal</p>
              <p className={`text-sm mt-2 ${isHighContrast ? 'text-yellow-600' : isLight ? 'text-slate-400' : 'text-slate-600'}`}>Todos los registros están dentro de los plazos de retiro acordados.</p>
            </div>
          ) : (
            stats.riskItems.map((item, idx) => (
              <RiskItemRow key={`${item.barcode}-${idx}`} item={item} theme={theme} />
            ))
          )}
        </div>
      </main>
    </div>
  );
};

interface RiskItemRowProps {
  item: any;
  theme?: 'dark' | 'light' | 'high-contrast';
}

const RiskItemRow: React.FC<RiskItemRowProps> = ({ item, theme = 'dark' }) => {
  const isHighContrast = theme === 'high-contrast';
  const isLight = theme === 'light';

  // Clases según tema
  const rowBg = isHighContrast ? 'bg-yellow-950/20 border-yellow-400/30 hover:bg-yellow-950/30' : isLight ? 'bg-slate-50 border-slate-200 hover:bg-slate-100' : 'bg-slate-900/50 border-white/5 hover:bg-slate-900 hover:border-white/10';
  const titleText = isHighContrast ? 'text-yellow-400' : isLight ? 'text-slate-900' : 'text-white';
  const subtitleText = isHighContrast ? 'text-yellow-500' : isLight ? 'text-slate-500' : 'text-slate-400';
  const divider = isHighContrast ? 'border-yellow-400/30' : isLight ? 'border-slate-200' : 'border-white/5';

  const getStatusBadge = () => {
    if (item.status === 'critical') {
      return {
        container: isHighContrast ? 'bg-red-500 text-white' : isLight ? 'bg-rose-500 text-white' : 'bg-rose-500 text-white',
        shadow: isHighContrast ? 'shadow-red-500/30' : 'shadow-[0_0_15px_rgba(244,63,94,0.3)]',
        icon: <AlertCircle className="w-7 h-7" />
      };
    }
    if (item.status === 'warning') {
      return {
        container: isHighContrast ? 'bg-yellow-500/20 text-yellow-400' : isLight ? 'bg-amber-50 text-amber-500' : 'bg-amber-500/10 text-amber-500',
        shadow: '',
        icon: <Clock className="w-7 h-7" />
      };
    }
    return {
      container: isHighContrast ? 'bg-green-500/20 text-green-400' : isLight ? 'bg-emerald-50 text-emerald-500' : 'bg-emerald-500/10 text-emerald-500',
      shadow: '',
      icon: <ShieldCheck className="w-7 h-7" />
    };
  };

  const getExchangeBadge = () => {
    if (item.hasExchange) {
      return isHighContrast ? 'bg-green-500/20 text-green-400 border-green-500/30' : isLight ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
    }
    return isHighContrast ? 'bg-red-500/20 text-red-400 border-red-500/30' : isLight ? 'bg-rose-100 text-rose-700 border-rose-200' : 'bg-rose-500/10 text-rose-500 border-rose-500/20';
  };

  const status = getStatusBadge();
  const daysColor = item.daysToWithdraw < 0 
    ? (isHighContrast ? 'text-red-400' : 'text-rose-500')
    : (isHighContrast ? 'text-yellow-400' : 'text-amber-500');

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`group p-5 rounded-[2rem] border transition-all flex items-center gap-6 ${rowBg}`}
    >
      <div className={`w-14 h-14 rounded-2xl shrink-0 flex items-center justify-center ${status.container} ${status.shadow ? `shadow-[0_0_15px_rgba(244,63,94,0.3)]` : ''}`}>
        {status.icon}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-1.5">
          <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${subtitleText}`}>{item.barcode}</span>
          <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${getExchangeBadge()}`}>
            {item.hasExchange ? 'POLÍTICA CANJE: SÍ' : 'POLÍTICA CANJE: NO'}
          </span>
        </div>
        <h4 className={`text-base font-black truncate uppercase tracking-tight italic ${titleText}`}>{item.name}</h4>
        <div className={`flex items-center gap-2 mt-1 ${subtitleText}`}>
          <p className={`text-[11px] font-bold uppercase truncate ${subtitleText}`}>{item.providerName}</p>
          <span className={isHighContrast ? 'text-yellow-700' : isLight ? 'text-slate-300' : 'text-slate-700'}>•</span>
          <span className={`text-[10px] font-bold uppercase ${subtitleText}`}>Exp: {item.expiryDate}</span>
        </div>
      </div>

      <div className={`text-right shrink-0 px-6 border-l ${divider}`}>
        <div className={`text-lg font-black tracking-tighter ${titleText}`}>{item.quantity} <span className={`text-[10px] tracking-normal uppercase ${subtitleText}`}>Unid</span></div>
        <div className={`text-[10px] font-black uppercase mt-1 tracking-widest ${daysColor}`}>
          {item.daysToWithdraw < 0 ? `PASADO POR ${Math.abs(item.daysToWithdraw)}d` : `EN SALA ${item.daysToWithdraw}d MÁS`}
        </div>
      </div>
    </motion.div>
  );
};

export default ComplianceDashboardPage;
