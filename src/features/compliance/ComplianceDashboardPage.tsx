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

  const totalItems = React.useMemo(() => 
    (stats?.statusDistribution || []).reduce((acc, g) => acc + g.value, 0) || 1
  , [stats?.statusDistribution]);

  if (!stats) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* HEADER TÉCNICO */}
      <header className="p-6 border-b border-white/5 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-20">
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

      <main className="flex-1 p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
        {/* BENTO GRID DE MÉTRICAS OPERATIVAS - REDUCIDO */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard 
            label="Alertas Críticas" 
            value={`${stats.criticalAlertsCount}`}
            subLabel="Fuera de plazo de retiro"
            icon={AlertCircle}
            color="rose"
            isCritical={stats.criticalAlertsCount > 0}
          />
          <MetricCard 
            label="Próximos Retiros" 
            value={`${stats.upcomingRetiralsCount}`}
            subLabel="Vencen en menos de 10 días"
            icon={Clock}
            color="amber"
          />
          <MetricCard 
            label="Total Unidades" 
            value={`${stats.totalUnitsAtRisk.toLocaleString()}`}
            subLabel="Unidades bajo seguimiento"
            icon={Package}
            color="blue"
          />
          <MetricCard 
            label="Salud de Políticas" 
            value={`${stats.providerPolicyHealth}%`}
            subLabel="Proveedores con canje activo"
            icon={ShieldCheck}
            color="emerald"
          />
        </div>

        <div className="space-y-6">
          {/* BARRA DE ESTADO DE GESTIÓN INTEGRADA - HORIZONTAL */}
          <div className="p-4 rounded-3xl bg-slate-900/40 border border-white/5 flex flex-col md:flex-row items-center gap-6">
             <div className="shrink-0 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-slate-500" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Segmentación de Riesgo:</span>
             </div>
             
             <div className="flex-1 w-full h-3 bg-white/5 rounded-full overflow-hidden flex">
                {stats.statusDistribution.map((group) => (
                  <motion.div 
                    key={group.label}
                    initial={{ width: 0 }}
                    animate={{ width: `${(group.value / totalItems) * 100}%` }}
                    className="h-full first:rounded-l-full last:rounded-r-full"
                    style={{ backgroundColor: group.color }}
                    title={`${group.label}: ${group.value}`}
                  />
                ))}
             </div>

             <div className="flex items-center gap-4 shrink-0">
                {stats.statusDistribution.map((group) => (
                  <div key={group.label} className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: group.color }} />
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">{group.label} ({group.value})</span>
                  </div>
                ))}
             </div>
          </div>

          {/* LISTA DE ALERTAS CRÍTICAS - FULL WIDTH FOCUS */}
          <section className="flex flex-col h-[70vh] lg:h-[calc(100vh-320px)]">
            <div className="flex items-center justify-between px-2 mb-4 shrink-0">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                Matriz de Acción Operativa
              </h3>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{stats.riskItems.length} Registros activos</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
              {stats.riskItems.length === 0 ? (
                <div className="p-12 bg-slate-900/30 rounded-3xl border border-dashed border-white/5 text-center">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500/20 mx-auto mb-4" />
                  <p className="text-sm text-slate-500 font-medium italic">Todos los registros están dentro del plazo de retiro acordado.</p>
                </div>
              ) : (
                stats.riskItems.map((item, idx) => (
                  <RiskItemRow key={`${item.barcode}-${idx}`} item={item} />
                ))
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

const MetricCard = ({ label, value, subLabel, icon: Icon, color, isCritical }: any) => {
  const colors: any = {
    blue: 'text-blue-500 bg-blue-500/10 border-blue-500/10',
    rose: 'text-rose-500 bg-rose-500/10 border-rose-500/10',
    amber: 'text-amber-500 bg-amber-500/10 border-amber-500/10',
    emerald: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/10'
  };

  return (
    <div className={`p-4 rounded-[1.5rem] bg-slate-900 border border-white/5 relative overflow-hidden group transition-all duration-300 ${isCritical ? 'border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.1)]' : 'hover:border-white/10'}`}>
      <div className={`absolute top-0 right-0 w-24 h-24 blur-[50px] opacity-10 transition-opacity group-hover:opacity-20 ${color === 'rose' ? 'bg-rose-500' : 'bg-blue-500'}`} />
      
      <div className="relative z-10 space-y-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${colors[color]}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-0.5">{label}</p>
          <h2 className={`text-2xl font-black tracking-tight italic ${isCritical ? 'text-rose-500' : 'text-white'}`}>{value}</h2>
          <p className="text-[8px] font-bold text-slate-600 uppercase tracking-wide">{subLabel}</p>
        </div>
      </div>
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
