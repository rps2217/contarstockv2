/**
 * RecentActivity - Componente de actividad reciente para el dashboard
 * Estilo inspirado en Magic Patterns con avatares circulares
 */

import React, { memo } from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { getIconColorClass } from '@/lib/ui';

interface ActivityItem {
  id: string;
  icon: string;
  iconColor?: string;
  title: string;
  time: string;
  user?: string;
  count?: number;
  countLabel?: string;
  onClick?: () => void;
}

interface RecentActivityProps {
  title: string;
  items: ActivityItem[];
  onItemClick?: (item: ActivityItem) => void;
  isDark?: boolean;
  maxItems?: number;
}

const getUserInitial = (title: string, user?: string): string => {
  if (user) {
    return user.charAt(0).toUpperCase();
  }
  return title.charAt(0).toUpperCase();
};

export const RecentActivity: React.FC<RecentActivityProps> = memo(({
  title,
  items,
  onItemClick,
  isDark = true,
  maxItems = 5
}) => {
  const displayItems = items.slice(0, maxItems);

  return (
    <div className="bg-surface/30 border border-subtle/60 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-4 border-b border-subtle/60">
        <h2 className="text-lg font-semibold text-primary">
          {title}
        </h2>
      </div>

      {/* Activity List */}
      <div>
        {displayItems.length === 0 ? (
          <div className="px-4 py-8 text-center text-slate-500">
            <p className="text-sm">No hay actividad reciente</p>
          </div>
        ) : (
          displayItems.map((item, index) => (
            <motion.div
              key={item.id}
              className="flex items-center justify-between p-4 border-b border-subtle/60 last:border-0 hover:bg-elevated/20 transition-colors"
            >
              <div className="flex items-center gap-4">
                {/* Avatar circular */}
                <div className="w-10 h-10 rounded-full bg-elevated flex items-center justify-center">
                  <span className={cn(
                    "text-xs font-bold",
                    getIconColorClass(item.iconColor, isDark)
                  )}>
                    {getUserInitial(item.title, item.user)}
                  </span>
                </div>

                {/* Content */}
                <div>
                  <p className="text-sm font-medium text-primary">
                    {item.title}
                  </p>
                  <p className="text-xs text-slate-500">
                    {item.time}
                    {item.user && ` • ${item.user}`}
                  </p>
                </div>
              </div>

              {/* Count Badge */}
              {item.count !== undefined && (
                <div className="text-right">
                  <p className="text-sm font-semibold text-secondary">
                    {item.count}
                  </p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">
                    {item.countLabel || 'Ítems'}
                  </p>
                </div>
              )}
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
});

RecentActivity.displayName = 'RecentActivity';

export default RecentActivity;