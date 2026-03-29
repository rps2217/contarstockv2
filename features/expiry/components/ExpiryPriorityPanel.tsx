
import React, { useState, useEffect } from 'react';
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
  ListTodo,
  X,
  Maximize2,
  Minimize2,
  RotateCcw,
  Settings2
} from 'lucide-react';
import { ExpiryItem } from '../../../store/useExpiryStore';

interface CardSize {
  width: string;
  height: string;
}

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

const STORAGE_KEY = 'expiry-panel-layout';

export const ExpiryPriorityPanel: React.FC<ExpiryPriorityPanelProps> = ({ stats, theme, onSelectItem, onActionClick }) => {
  const { priorityItems, volumeAlerts, suggestedActions = [] } = stats;

  // State for visibility and sizes
  const [hiddenCards, setHiddenCards] = useState<string[]>([]);
  const [cardSizes, setCardSizes] = useState<Record<string, CardSize>>({});
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const { hidden, sizes } = JSON.parse(saved);
        setHiddenCards(hidden || []);
        setCardSizes(sizes || {});
      } catch (e) {
        console.error('Error loading panel layout', e);
      }
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      hidden: hiddenCards,
      sizes: cardSizes
    }));
  }, [hiddenCards, cardSizes]);

  if (priorityItems.length === 0) return null;

  const toggleCard = (id: string) => {
    setHiddenCards(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const updateSize = (id: string, size: Partial<CardSize>) => {
    setCardSizes(prev => ({
      ...prev,
      [id]: { ...(prev[id] || { width: 'auto', height: 'auto' }), ...size }
    }));
  };

  const resetLayout = () => {
    setHiddenCards([]);
    setCardSizes({});
    localStorage.removeItem(STORAGE_KEY);
  };

  const isHidden = (id: string) => hiddenCards.includes(id);

  const CardHeader = ({ id, title, subtitle, icon: Icon, iconColor, pulse, showHeightToggle }: any) => (
    <div className="p-5 border-b border-inherit flex items-center justify-between group/header">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${iconColor}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <h3 className={`text-sm font-black uppercase tracking-tighter italic ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            {title}
          </h3>
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{subtitle}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {pulse && <Zap className="w-4 h-4 text-amber-500 animate-pulse" />}
        <div className="flex items-center gap-1 opacity-0 group-hover/header:opacity-100 transition-opacity">
          {showHeightToggle && (
            <button 
              onClick={() => updateSize(id, { height: cardSizes[id]?.height === '400px' ? 'auto' : '400px' })}
              className={`p-1.5 rounded-lg hover:bg-white/10 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}
              title="Cambiar altura"
            >
              {cardSizes[id]?.height === '400px' ? <Maximize2 className="rotate-90 w-3.5 h-3.5" /> : <Minimize2 className="rotate-90 w-3.5 h-3.5" />}
            </button>
          )}
          <button 
            onClick={() => updateSize(id, { width: cardSizes[id]?.width === '100%' ? 'auto' : '100%' })}
            className={`p-1.5 rounded-lg hover:bg-white/10 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}
            title="Cambiar ancho"
          >
            {cardSizes[id]?.width === '100%' ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          <button 
            onClick={() => toggleCard(id)}
            className={`p-1.5 rounded-lg hover:bg-rose-500/20 text-rose-500`}
            title="Ocultar"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );

  const allVisible = hiddenCards.length === 0;

  return (
    <div className="mb-8 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className={`text-xs font-black uppercase tracking-widest ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            Asistente de Priorización
          </h2>
          {!allVisible && (
            <button 
              onClick={resetLayout}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-500/10 text-amber-500 text-[10px] font-black uppercase hover:bg-amber-500/20 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Restaurar Vista
            </button>
          )}
        </div>
        <button 
          onClick={() => setIsSettingsOpen(!isSettingsOpen)}
          className={`p-2 rounded-xl border transition-all ${
            isSettingsOpen 
              ? 'bg-indigo-500 text-white border-indigo-500' 
              : theme === 'dark' ? 'bg-slate-900/50 border-white/10 text-slate-400 hover:text-white' : 'bg-white border-slate-200 text-slate-500 hover:text-slate-900 shadow-sm'
          }`}
        >
          <Settings2 className="w-4 h-4" />
        </button>
      </div>

      <AnimatePresence>
        {isSettingsOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className={`overflow-hidden rounded-3xl border p-4 mb-4 ${
              theme === 'dark' ? 'bg-slate-900/80 border-white/10' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <h4 className={`text-[10px] font-black uppercase tracking-widest mb-3 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
              Gestionar Tarjetas
            </h4>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'immediate-action', label: 'Acción Inmediata' },
                { id: 'suggested-actions', label: 'Acciones Sugeridas' },
                { id: 'volume-alerts', label: 'Alertas de Volumen' },
                { id: 'quick-tip', label: 'Quick Tip' }
              ].map(card => (
                <button
                  key={card.id}
                  onClick={() => toggleCard(card.id)}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase transition-all border ${
                    !isHidden(card.id)
                      ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-500'
                      : 'bg-slate-500/10 border-slate-500/20 text-slate-500 opacity-50'
                  }`}
                >
                  {card.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div 
        layout
        className="flex flex-wrap gap-4"
      >
        {/* CARD 1: ACCIÓN INMEDIATA */}
        {!isHidden('immediate-action') && (
          <motion.div 
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            style={{ 
              width: cardSizes['immediate-action']?.width || 'calc(66.66% - 0.5rem)',
              height: cardSizes['immediate-action']?.height || 'auto',
              minWidth: '300px',
              flexGrow: cardSizes['immediate-action']?.width === '100%' ? 1 : 0
            }}
            className={`rounded-3xl border overflow-hidden flex flex-col transition-all ${
              theme === 'dark' ? 'bg-slate-900/50 border-white/10' : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <CardHeader 
              id="immediate-action"
              title="Acción Inmediata"
              subtitle="Top Riesgo Crítico"
              icon={AlertTriangle}
              iconColor="bg-rose-500/10 border-rose-500/20 text-rose-500"
              pulse={true}
              showHeightToggle={true}
            />
            
            <div className={`flex-1 p-2 space-y-1 overflow-y-auto ${cardSizes['immediate-action']?.height === '400px' ? 'max-h-[300px]' : ''}`}>
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
          </motion.div>
        )}

        <div className="flex-1 flex flex-col gap-4 min-w-[300px]">
          {/* CARD 2: ACCIONES SUGERIDAS */}
          {!isHidden('suggested-actions') && (
            <motion.div 
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              style={{ 
                height: cardSizes['suggested-actions']?.height || 'auto'
              }}
              className={`p-5 rounded-3xl border relative group transition-all overflow-hidden flex flex-col ${
                theme === 'dark' ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-indigo-50 border-indigo-200'
              }`}
            >
              <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => updateSize('suggested-actions', { height: cardSizes['suggested-actions']?.height === '300px' ? 'auto' : '300px' })}
                  className={`p-1.5 rounded-lg hover:bg-indigo-500/20 text-indigo-500`}
                  title="Cambiar altura"
                >
                  {cardSizes['suggested-actions']?.height === '300px' ? <Maximize2 className="rotate-90 w-3.5 h-3.5" /> : <Minimize2 className="rotate-90 w-3.5 h-3.5" />}
                </button>
                <button 
                  onClick={() => toggleCard('suggested-actions')}
                  className="p-1.5 rounded-lg hover:bg-indigo-500/20 text-indigo-500"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

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
              
              <div className={`space-y-2 flex-1 overflow-y-auto ${cardSizes['suggested-actions']?.height === '300px' ? 'max-h-[200px]' : ''}`}>
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
            </motion.div>
          )}

          {/* CARD 3: ALERTAS DE VOLUMEN */}
          {!isHidden('volume-alerts') && (
            <motion.div 
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              style={{ 
                height: cardSizes['volume-alerts']?.height || 'auto'
              }}
              className={`p-5 rounded-3xl border relative group transition-all overflow-hidden flex flex-col ${
                theme === 'dark' ? 'bg-slate-900/50 border-white/10' : 'bg-white border-slate-200 shadow-sm'
              }`}
            >
              <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => updateSize('volume-alerts', { height: cardSizes['volume-alerts']?.height === '300px' ? 'auto' : '300px' })}
                  className={`p-1.5 rounded-lg hover:bg-white/10 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}
                  title="Cambiar altura"
                >
                  {cardSizes['volume-alerts']?.height === '300px' ? <Maximize2 className="rotate-90 w-3.5 h-3.5" /> : <Minimize2 className="rotate-90 w-3.5 h-3.5" />}
                </button>
                <button 
                  onClick={() => toggleCard('volume-alerts')}
                  className={`p-1.5 rounded-lg hover:bg-rose-500/20 text-rose-500`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                  <TrendingUp className="w-4 h-4 text-amber-500" />
                </div>
                <h3 className={`text-[10px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  Alertas de Volumen
                </h3>
              </div>
              
              <div className={`space-y-3 flex-1 overflow-y-auto ${cardSizes['volume-alerts']?.height === '300px' ? 'max-h-[200px]' : ''}`}>
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
            </motion.div>
          )}

          {/* CARD 4: QUICK TIP */}
          {!isHidden('quick-tip') && (
            <motion.div 
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={`p-4 rounded-3xl border border-dashed relative group transition-all ${
                theme === 'dark' ? 'border-white/10 bg-white/5' : 'border-slate-300 bg-slate-50'
              }`}
            >
              <button 
                onClick={() => toggleCard('quick-tip')}
                className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-slate-500/20 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              <div className="flex items-start gap-3">
                <Package className="w-4 h-4 text-slate-500 mt-0.5" />
                <p className="text-[10px] font-bold text-slate-500 leading-relaxed">
                  <span className="text-amber-500 font-black">TIP:</span> Prioriza los productos de <span className="underline">Merma</span> para rebajas de precio inmediatas.
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
