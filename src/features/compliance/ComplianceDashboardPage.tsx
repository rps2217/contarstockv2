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

      <main className="flex-1 p-6 md:p-8 space-y-8 max-w-7xl mx-auto w-full">
        {/* BENTO GRID DE MÉTRICAS OPERATIVAS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* LISTA DE ALERTAS CRÍTICAS */}
          <section className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                Matriz de Acción Inmediata
              </h3>
              <span className="text-[10px] font-bold text-slate-600">{stats.riskItems.length} SKUs identificados</span>
            </div>

            <div className="space-y-3">
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

          {/* LATERAL: RESUMEN DE ESTADO */}
          <aside className="space-y-6">
             <div className="p-6 rounded-[2.5rem] bg-slate-900 border border-white/5 space-y-6">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Estado de Gestión</h3>
                <div className="space-y-4">
                  {stats.statusDistribution.map((group) => (
                    <div key={group.label} className="space-y-2">
                       <div className="flex justify-between text-[10px] font-bold uppercase">
                          <span className="text-slate-500">{group.label}</span>
                          <span className="text-white">{group.value} registros</span>
                       </div>
                       <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${(group.value / totalItems) * 100}%` }}
                            className="h-full rounded-full"
                            style={{ backgroundColor: group.color }}
                          />
                       </div>
                    </div>
                  ))}
                </div>
             </div>

             <div className="p-6 rounded-[2.5rem] bg-indigo-600/10 border border-indigo-500/20">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600/20 flex items-center justify-center text-indigo-400 shrink-0">
                    <Info className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white uppercase tracking-tight italic">Cruce de Datos</h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed mt-1">
                      Este panel compara las capturas de vencimiento con los días de retiro de cada proveedor. El objetivo es que ningún producto llegue a su fecha de vencimiento dentro de la sala.
                    </p>
                  </div>
                </div>
             </div>
          </aside>
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
    <div className={`p-6 rounded-[2.5rem] bg-slate-900 border border-white/5 relative overflow-hidden group transition-all duration-300 ${isCritical ? 'border-rose-500/50 shadow-[0_0_20px_rgba(244,63,94,0.15)]' : 'hover:border-white/10'}`}>
      <div className={`absolute top-0 right-0 w-32 h-32 blur-[60px] opacity-10 transition-opacity group-hover:opacity-20 ${color === 'rose' ? 'bg-rose-500' : 'bg-blue-500'}`} />
      
      <div className="relative z-10 space-y-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${colors[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">{label}</p>
          <h2 className={`text-4xl font-black tracking-tight italic ${isCritical ? 'text-rose-500' : 'text-white'}`}>{value}</h2>
          <p className="text-[9px] font-bold text-slate-600 uppercase mt-2 tracking-wider">{subLabel}</p>
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
