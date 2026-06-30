import React from 'react';
import { Minimize2, Maximize2, Calendar } from 'lucide-react';
import { motion } from 'motion/react';
import { EventItemCard } from './EventItemCard';
import { LucideIcon } from 'lucide-react';

interface EventListPanelProps {
  title: string;
  count?: number;
  theme?: 'dark' | 'light' | 'high-contrast';
  virtualizer: any;
  grouped?: any[];
  groupedItems?: any[];
  onTogglePanel?: () => void | ((panel?: any) => void) | ((panel: any) => void);
  expandedPanel?: 'pending' | 'destined' | 'adjusted' | 'dual';
  icon?: LucideIcon | React.ReactNode;
  headerColor?: string;
  onUpdateStatus?: (id: string, isAdjusted: boolean) => void;
  onRemove?: (item: any) => void;
  onEdit?: (item: any) => void;
  onFrcClick?: (frc: string) => void;
  onEventClick?: (event: string) => void;
  onDestinoClick?: (destino: string) => void;
  onViewDetail?: (item: any) => void;
  isCompact?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  emptyIcon?: React.ReactNode;
  emptyText?: string;
  scrollRef?: React.RefObject<HTMLDivElement>;
}

// Colores por defecto por tipo
const DEFAULT_HEADER_COLORS: Record<string, string> = {
  pending: 'bg-amber-600',
  destined: 'bg-blue-600',
  adjusted: 'bg-emerald-600',
};

export const EventListPanel: React.FC<EventListPanelProps> = ({
  title,
  count = 0,
  theme = 'dark',
  virtualizer,
  groupedItems,
  grouped,
  onTogglePanel,
  expandedPanel,
  icon: IconProp,
  headerColor,
  onUpdateStatus,
  onRemove,
  onEdit,
  onFrcClick,
  onEventClick,
  onDestinoClick,
  onViewDetail,
  isCompact = false,
  selectedIds = new Set(),
  onToggleSelect,
  emptyIcon,
  emptyText,
  scrollRef,
}) => {
  // Compatibilidad: groupedItems o grouped
  const items = groupedItems || grouped || [];
  
  // Compatibilidad: isExpanded o expandedPanel
  const isExpanded = expandedPanel === undefined ? true : expandedPanel !== null;
  
  // Compatibilidad: onTogglePanel con o sin argumentos
  const handleToggle = () => {
    if (onTogglePanel) {
      if (onTogglePanel.length > 0) {
        (onTogglePanel as (panel?: any) => void)();
      } else {
        (onTogglePanel as () => void)();
      }
    }
  };
  
  // Compatibilidad: icon como LucideIcon
  const iconElement = IconProp ? (
    typeof IconProp === 'function' ? <IconProp className="w-5 h-5 text-white" /> : IconProp
  ) : null;
  
  // Color del header por defecto basado en el título
  const defaultColor = Object.entries(DEFAULT_HEADER_COLORS).find(([key]) => 
    title.toLowerCase().includes(key)
  )?.[1] || 'bg-slate-600';
  
  const bgColor = headerColor || defaultColor;
  return (
    <motion.div 
      layout
      className={`flex-1 flex flex-col overflow-hidden rounded-[2.5rem] border-4 border-black transition-all relative ${
        theme === 'dark' || theme === 'night' || theme === 'high-contrast' || theme === 'appsheet-dark' ? 'bg-base/60' : 'bg-stone-100/80'
      }`}
    >
      <div className={`${bgColor} p-4 flex items-center justify-between border-b-4 border-black`}>
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-xl">
            {iconElement}
          </div>
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-tighter italic leading-none">{title}</h3>
            <p className="text-[8px] font-bold text-white/70 uppercase tracking-widest mt-1">{count} Registros</p>
          </div>
        </div>
        <button 
          onClick={handleToggle}
          className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
        >
          {isExpanded ? <Minimize2 className="w-4 h-4 text-white" /> : <Maximize2 className="w-4 h-4 text-white" />}
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 no-scrollbar">
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow: any) => {
            const entry = items[virtualRow.index];
            
            if (entry.type === 'header') {
              return (
                <div
                  key={`header-${entry.date}`}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualRow.start}px)`,
                    padding: '8px 0',
                  }}
                >
                  <div className={`flex items-center gap-3 px-4 py-2 rounded-xl border shadow-lg ${headerColor} text-white`}>
                    <Calendar className="w-3.5 h-3.5" />
                    <span className="text-xs font-black uppercase tracking-[0.2em] italic">{entry.date}</span>
                  </div>
                </div>
              );
            }

            const item = entry.data;
            return (
              <div
                key={item.id}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start}px)`,
                  paddingBottom: '12px',
                }}
              >
                <EventItemCard 
                  item={item}
                  isSelected={selectedIds.has(item.id)}
                  onToggleSelect={onToggleSelect || (() => {})}
                  onUpdateStatus={onUpdateStatus}
                  onRemove={onRemove}
                  onEdit={onEdit}
                  onFrcClick={onFrcClick}
                  onEventClick={onEventClick}
                  onDestinoClick={onDestinoClick}
                  onViewDetail={onViewDetail}
                  theme={theme}
                  isCompact={isCompact}
                  isExpanded={isExpanded}
                />
              </div>
            );
          })}
        </div>
        {items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
            {emptyIcon}
            <p className="text-xs font-black uppercase tracking-widest mt-4">{emptyText}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

