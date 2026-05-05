import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface SmartDockItem {
  id: string;
  label?: string;
  icon: LucideIcon;
  onClick: () => void;
  isActive?: boolean;
  badge?: number;
  badgeStyle?: 'default' | 'error' | 'warning';
  activeColor?: string; // Tailwind class, e.g., 'text-blue-400'
  activeBg?: string;    // Tailwind class, e.g., 'bg-blue-500/20'
}

interface SmartDockProps {
  items: SmartDockItem[];
  variant?: 'global' | 'contextual';
}

export const SmartDock: React.FC<SmartDockProps> = ({ items, variant = 'global' }) => {
  const isGlobal = variant === 'global';

  return (
    <nav className={`md:hidden z-[100] ${
      isGlobal 
        ? 'fixed bottom-0 left-0 right-0 bg-slate-950/95 border-t-2 border-white/10 px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-3 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]'
        : 'flex items-center bg-brand-surface/95 backdrop-blur-3xl border border-white/10 px-2 py-2 mb-6 mx-6 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden'
    }`}>
      <div className={`flex items-center gap-1 overflow-x-auto no-scrollbar w-full ${isGlobal ? 'justify-around h-14 max-w-lg mx-auto' : 'px-2 py-1'}`}>
        {items.map((item, index) => {
          const Icon = item.icon;
          const isActive = item.isActive;
          
          return (
            <React.Fragment key={item.id}>
              <button
                onClick={() => {
                  if (navigator.vibrate) navigator.vibrate(12);
                  item.onClick();
                }}
                className={`flex flex-col items-center justify-center gap-1 transition-all shrink-0 relative ${
                  isGlobal ? 'min-w-[50px] sm:min-w-[60px]' : ''
                } ${
                  isActive 
                    ? (item.activeColor || (isGlobal ? 'text-blue-400' : 'text-blue-400 scale-110'))
                    : 'text-slate-500 hover:text-slate-400'
                }`}
              >
                <div className={`p-2.5 rounded-2xl transition-all duration-300 ${
                  isActive ? (item.activeBg || (isGlobal ? 'bg-blue-500/10' : 'bg-white/10')) : 'bg-transparent'
                } ${isGlobal && isActive ? 'scale-110' : ''}`}>
                  <Icon className={`w-5 h-5 ${isActive && isGlobal ? 'stroke-[3px]' : 'stroke-[2px]'}`} />
                </div>
                
                {isGlobal && item.label && (
                  <span className={`text-[8px] font-black tracking-[0.2em] uppercase leading-none transition-opacity ${isActive ? 'opacity-100' : 'opacity-40'}`}>
                    {item.label}
                  </span>
                )}

                {isGlobal && isActive && (
                  <div className="absolute -bottom-1 w-1 h-1 bg-blue-400 rounded-full shadow-[0_0_8px_#60a5fa] animate-pulse" />
                )}

                {item.badge !== undefined && item.badge > 0 && (
                  <span className={`absolute -top-1 right-1 text-[9px] font-black px-1.5 py-0.5 rounded-md border-2 border-slate-950 ${
                    item.badgeStyle === 'error' ? 'bg-rose-500 text-white animate-pulse' :
                    item.badgeStyle === 'warning' ? 'bg-amber-500 text-black animate-bounce' :
                    'bg-blue-500 text-white'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
              
              {!isGlobal && index < items.length - 1 && (
                <div className="w-[1px] h-6 bg-white/10 mx-1 shrink-0" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </nav>
  );
};
