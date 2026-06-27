/**
 * RecentActivity - Componente de actividad reciente para el dashboard
 * Muestra una lista de actividades con icono, título, tiempo y cantidad
 */

import React, { memo } from 'react';
import { motion } from 'motion/react';

interface ActivityItem {
  id: string;
  icon: React.ReactNode;
  iconColor?: string;
  title: string;
  time: string;
  user?: string;
  count?: number;
  countLabel?: string;
}

interface RecentActivityProps {
  title: string;
  items: ActivityItem[];
  onItemClick?: (item: ActivityItem) => void;
  isDark?: boolean;
  maxItems?: number;
}

export const RecentActivity: React.FC<RecentActivityProps> = memo(({
  title,
  items,
  onItemClick,
  isDark = true,
  maxItems = 5
}) => {
  const displayItems = items.slice(0, maxItems);

  return (
    <div className={`rounded-xl border ${isDark ? 'bg-neutral-900/50 border-neutral-800' : 'bg-white border-neutral-200'}`}>
      {/* Header */}
      <div className={`px-4 py-3 border-b ${isDark ? 'border-neutral-800' : 'border-neutral-200'}`}>
        <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-neutral-900'}`}>
          {title}
        </h3>
      </div>

      {/* Activity List */}
      <div className="divide-y divide-neutral-800/50">
        {displayItems.length === 0 ? (
          <div className={`px-4 py-8 text-center ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}>
            <p className="text-sm">No hay actividad reciente</p>
          </div>
        ) : (
          displayItems.map((item, index) => (
            <motion.button
              key={item.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onItemClick?.(item)}
              className={`
                w-full px-4 py-3 flex items-center gap-3 text-left transition-all
                ${isDark 
                  ? 'hover:bg-neutral-800/50' 
                  : 'hover:bg-neutral-50'
                }
              `}
            >
              {/* Icon */}
              <div className={`
                w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold
                ${item.iconColor 
                  ? isDark 
                    ? `bg-${item.iconColor}/20 text-${item.iconColor}`
                    : `bg-${item.iconColor}/10 text-${item.iconColor}`
                  : isDark 
                    ? 'bg-blue-600/20 text-blue-400' 
                    : 'bg-blue-50 text-blue-600'
                }
                ${isDark ? 'bg-blue-600/20' : 'bg-blue-50'}
                ${isDark ? 'text-blue-400' : 'text-blue-600'}
              `}>
                {item.icon}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-neutral-900'}`}>
                  {item.title}
                </p>
                <p className={`text-xs mt-0.5 ${isDark ? 'text-neutral-500' : 'text-neutral-500'}`}>
                  {item.time}
                  {item.user && ` • ${item.user}`}
                </p>
              </div>

              {/* Count Badge */}
              {item.count !== undefined && (
                <div className={`
                  px-2 py-1 rounded-lg text-xs font-bold
                  ${isDark ? 'bg-neutral-800 text-neutral-300' : 'bg-neutral-100 text-neutral-600'}
                `}>
                  <span className={isDark ? 'text-white' : 'text-neutral-900'}>{item.count}</span>
                  <span className="ml-1">{item.countLabel || 'Ítems'}</span>
                </div>
              )}
            </motion.button>
          ))
        )}
      </div>
    </div>
  );
});

RecentActivity.displayName = 'RecentActivity';

export default RecentActivity;