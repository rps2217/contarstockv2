
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AlertTriangle, 
  TrendingUp, 
  ArrowRight, 
  Package, 
  Clock,
  ChevronRight,
  Zap,
  CheckCircle2,
  ListTodo
} from 'lucide-react';
import { ExpiryItem } from '../../../store/useExpiryStore';

interface ExpiryPriorityPanelProps {
  stats: {
    priorityItems: ExpiryItem[];
    volumeAlerts: { name: string; count: number }[];
    suggestedActions?: { title: string; description: string; count: number; type: string }[];
  };
  theme: 'dark' | 'light';
  onSelectItem: (id: string) => void;
  onActionClick?: (type: string) => void;
}

export const ExpiryPriorityPanel: React.FC<ExpiryPriorityPanelProps> = ({ stats, theme, onSelectItem, onActionClick }) => {
  const { priorityItems, volumeAlerts, suggestedActions = [] } = stats;

  if (priorityItems.length === 0) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
    >
      {/* CARD 1: ACCIÓN INMEDIATA (TOP RIESGO) */}
      <div className={`md:col-span-2 rounded-3xl border overflow-hidden flex flex-col ${
        theme === 'dark' ? 'bg-slate-900/50 border-white/10' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="p-5 border-b border-inherit flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
            </div>
            <div>
              <h3 className={`text-sm font-black uppercase tracking-tighter italic ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                Acción Inmediata
              </h3>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Top Riesgo Crítico</p>
            </div>
          </div>
          <Zap className="w-4 h-4 text-amber-500 animate-pulse" />
        </div>
        
        <div className="flex-1 p-2 space-y-1">
          {priorityItems.map((item, idx) => (
            <button
              key={item.id}
              onClick={() => onSelectItem(item.id)}
              className={`w-full flex items-center gap-4 p-3 rounded-2xl transition-all group ${
                theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-slate-50'
              }`}
            >
              <div className="relative">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${
                  item.riskScore && item.riskScore > 80 
                    ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' 
                    : 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                }`}>
                  {item.riskScore}
                </div>
                {idx === 0 && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full border-2 border-slate-900 animate-ping" />
                )}
              </div>
              
              <div className="flex-1 text-left">
                <h4 className={`text-xs font-black uppercase truncate max-w-[200px] ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>
                  {item.productName}
                </h4>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    {item.daysLeft < 0 ? 'Vencido' : `${item.daysLeft} días`}
                  </span>
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase ${
                    item.hasCanje ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                  }`}>
                    {item.hasCanje ? 'Canje' : 'Merma'}
                  </span>
                </div>
              </div>

              <div className="text-right hidden sm:block">
                <div className={`text-[10px] font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  {item.quantity} uds
                </div>
                <div className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">
                  {item.location}
                </div>
              </div>

              <ChevronRight className={`w-4 h-4 text-slate-600 transition-transform group-hover:translate-x-1`} />
            </button>
          ))}
        </div>
      </div>

      {/* COLUMNA DERECHA: INSIGHTS */}
      <div className="space-y-4">
        {/* CARD 2: ACCIONES SUGERIDAS */}
        <div className={`p-5 rounded-3xl border ${
          theme === 'dark' ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-indigo-50 border-indigo-200'
        }`}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
              <ListTodo className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className={`text-[10px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-700'}`}>
                Acciones Sugeridas
              </h3>
              <p className={`text-xs font-bold ${theme === 'dark' ? 'text-indigo-300' : 'text-indigo-600'}`}>
                Gestiones recomendadas
              </p>
            </div>
          </div>
          
          <div className="space-y-2">
            {suggestedActions.length > 0 ? (
              suggestedActions.map((action, idx) => (
                <button 
                  key={idx} 
                  onClick={() => onActionClick && onActionClick(action.type)}
                  className={`w-full flex items-start gap-2 p-2 rounded-xl transition-colors text-left ${
                    theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-indigo-100/50'
                  }`}
                >
                  <CheckCircle2 className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${
                    action.type === 'merma' ? 'text-rose-500' : 
                    action.type === 'canje' ? 'text-emerald-500' : 'text-amber-500'
                  }`} />
                  <div className="flex-1">
                    <h4 className={`text-[10px] font-black uppercase ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>
                      {action.title}
                    </h4>
                    <p className={`text-[9px] font-medium leading-tight mt-0.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                      {action.description}
                    </p>
                  </div>
                  <ChevronRight className={`w-3 h-3 mt-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />
                </button>
              ))
            ) : (
              <div className={`text-[10px] font-medium italic px-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                No hay acciones prioritarias en este momento.
              </div>
            )}
          </div>
        </div>

        {/* CARD 3: ALERTAS DE VOLUMEN */}
        <div className={`p-5 rounded-3xl border ${
          theme === 'dark' ? 'bg-slate-900/50 border-white/10' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
              <TrendingUp className="w-4 h-4 text-amber-500" />
            </div>
            <h3 className={`text-[10px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
              Alertas de Volumen
            </h3>
          </div>
          
          <div className="space-y-3">
            {volumeAlerts.map((alert) => (
              <div key={alert.name} className="space-y-1">
                <div className="flex items-center justify-between text-[10px] font-black uppercase">
                  <span className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>{alert.name}</span>
                  <span className="text-amber-500">{alert.count} ítems</span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (alert.count / 10) * 100)}%` }}
                    className="h-full bg-amber-500"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CARD 4: QUICK TIP */}
        <div className={`p-4 rounded-3xl border border-dashed ${
          theme === 'dark' ? 'border-white/10 bg-white/5' : 'border-slate-300 bg-slate-50'
        }`}>
          <div className="flex items-start gap-3">
            <Package className="w-4 h-4 text-slate-500 mt-0.5" />
            <p className="text-[10px] font-bold text-slate-500 leading-relaxed">
              <span className="text-amber-500 font-black">TIP:</span> Prioriza los productos de <span className="underline">Merma</span> para rebajas de precio inmediatas.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
