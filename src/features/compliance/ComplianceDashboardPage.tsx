import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  Clock, 
  Calendar, 
  ArrowLeft, 
  Download,
  Info,
  ChevronRight,
  Package,
  FileText,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useComplianceData } from './hooks/useComplianceData';

const ComplianceDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const stats = useComplianceData();

  if (!stats) return null;

  return (
    <div className="h-screen bg-slate-950 text-slate-100 flex flex-col overflow-hidden">
      {/* HEADER TÉCNICO */}
      <header className="p-6 border-b border-white/5 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-20 shrink-0">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/')}
              className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-black uppercase tracking-tighter italic">Control de <span className="text-blue-500">Cumplimiento</span></h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Auditoría de Retiros y Políticas</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
             <button className="p-2.5 rounded-xl bg-white/5 text-slate-400 hover:bg-white/10 transition-all flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
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
            <div className="w-1.5 h-6 bg-blue-500 rounded-full" />
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-300 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
              Matriz de Acción Operativa
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest bg-white/5 px-3 py-1 rounded-full border border-white/5">
              {stats.riskItems.length} Registros activos detectados
            </span>
          </div>
        </div>

        {/* LISTA DE ALERTAS - MAXIMA PRIORIDAD */}
        <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar h-full min-h-0 pb-10">
          {stats.riskItems.length === 0 ? (
            <div className="p-20 bg-slate-900/30 rounded-[3rem] border border-dashed border-white/5 text-center flex flex-col items-center justify-center h-64">
              <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mb-6">
                <CheckCircle2 className="w-10 h-10 text-emerald-500/40" />
              </div>
              <p className="text-lg font-bold text-slate-400 italic">Estado Nominal</p>
              <p className="text-sm text-slate-600 mt-2">Todos los registros están dentro de los plazos de retiro acordados.</p>
            </div>
          ) : (
            stats.riskItems.map((item, idx) => (
              <RiskItemRow key={`${item.barcode}-${idx}`} item={item} />
            ))
          )}
        </div>
      </main>
    </div>
  );
};

const RiskItemRow = ({ item }: { item: any }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="group p-5 rounded-[2rem] bg-slate-900/50 border border-white/5 hover:bg-slate-900 hover:border-white/10 transition-all flex items-center gap-6"
    >
      <div className={`w-14 h-14 rounded-2xl shrink-0 flex items-center justify-center ${
        item.status === 'critical' ? 'bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.3)]' : 
        item.status === 'warning' ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'
      }`}>
        {item.status === 'critical' ? <AlertCircle className="w-7 h-7" /> : 
         item.status === 'warning' ? <Clock className="w-7 h-7" /> : <ShieldCheck className="w-7 h-7" />}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-1.5">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{item.barcode}</span>
          <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${
            item.hasExchange ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
          }`}>
            {item.hasExchange ? 'POLÍTICA CANJE: SÍ' : 'POLÍTICA CANJE: NO'}
          </span>
        </div>
        <h4 className="text-base font-black text-white truncate uppercase tracking-tight italic">{item.name}</h4>
        <div className="flex items-center gap-2 mt-1">
          <p className="text-[11px] text-slate-400 font-bold uppercase truncate">{item.providerName}</p>
          <span className="text-slate-700">•</span>
          <span className="text-[10px] text-slate-500 font-bold uppercase">Exp: {item.expiryDate}</span>
        </div>
      </div>

      <div className="text-right shrink-0 px-6 border-l border-white/5">
        <div className="text-lg font-black text-white tracking-tighter">{item.quantity} <span className="text-[10px] text-slate-500 tracking-normal uppercase">Unid</span></div>
        <div className={`text-[10px] font-black uppercase mt-1 tracking-widest ${
          item.daysToWithdraw < 0 ? 'text-rose-500' : 'text-amber-500'
        }`}>
          {item.daysToWithdraw < 0 ? `PASADO POR ${Math.abs(item.daysToWithdraw)}d` : `EN SALA ${item.daysToWithdraw}d MÁS`}
        </div>
      </div>
    </motion.div>
  );
};

export default ComplianceDashboardPage;
