import React, { memo, useRef, useEffect, useState } from 'react';
import { LucideIcon } from 'lucide-react';

export interface SmartDockItem {
  id: string;
  label?: string;
  icon: LucideIcon;
  onClick: () => void;
  isActive?: boolean;
  badge?: number;
  badgeStyle?: 'default' | 'error' | 'warning';
  activeColor?: string;
  activeBg?: string;
}

interface SmartDockProps {
  items: SmartDockItem[];
  variant?: 'global' | 'contextual';
}

const SmartDockInner: React.FC<SmartDockProps> = ({ items, variant = 'global' }) => {
  const isGlobal = variant === 'global';
  const containerRef = useRef<HTMLDivElement>(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(true);

  // Monitor scroll to dynamically fade left/right edges
  const handleScroll = () => {
    if (containerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = containerRef.current;
      setShowLeft(scrollLeft > 6);
      setShowRight(scrollLeft + clientWidth < scrollWidth - 6);
    }
  };

  useEffect(() => {
    const el = containerRef.current;
    if (el) {
      el.addEventListener('scroll', handleScroll, { passive: true });
      handleScroll();
    }
    return () => {
      if (el) el.removeEventListener('scroll', handleScroll);
    };
  }, [items]);

  // Center active element on mount/selection change
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    
    const activeEl = el.querySelector('[data-active="true"]');
    if (!activeEl) return;
    
    const timer = setTimeout(() => {
      activeEl.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest'
      });
    }, 150);
    return () => clearTimeout(timer);
  }, [items]);

  return (
    <nav className={`md:hidden z-[100] relative ${
      isGlobal 
        ? 'fixed bottom-0 left-0 right-0 bg-base/95 border-t border-subtle px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2.5 shadow-[0_-15px_40px_rgba(0,0,0,0.65)]'
        : 'flex items-center bg-brand-surface/95 backdrop-blur-3xl border border-subtle px-2 py-2 mb-6 mx-6 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden'
    }`}>
      {/* Scrollable Indicator - Left Edge Gradient */}
      {isGlobal && showLeft && (
        <div className="absolute left-0 top-0 bottom-[calc(env(safe-area-inset-bottom)+0.5rem)] w-10 bg-gradient-to-r from-slate-950 via-slate-950/70 to-transparent pointer-events-none z-20 transition-opacity duration-300" />
      )}

      {/* Scrollable Indicator - Right Edge Gradient */}
      {isGlobal && showRight && (
        <div className="absolute right-0 top-0 bottom-[calc(env(safe-area-inset-bottom)+0.5rem)] w-10 bg-gradient-to-l from-slate-950 via-slate-950/70 to-transparent pointer-events-none z-20 transition-opacity duration-300" />
      )}

      <div 
        ref={containerRef}
        className={`flex items-center overflow-x-auto no-scrollbar w-full ${
          isGlobal 
            ? 'h-16 gap-3 px-6 snap-x snap-mandatory' 
            : 'px-2 py-1 gap-1'
        }`}
      >
        {items.map((item, index) => {
          const Icon = item.icon;
          const isActive = item.isActive;
          
          return (
            <React.Fragment key={item.id}>
              <button
                data-active={isActive ? 'true' : 'false'}
                onClick={() => {
                  if (navigator.vibrate) navigator.vibrate(12);
                  item.onClick();
                }}
                className={`flex flex-col items-center justify-center gap-1 transition-all shrink-0 snap-center relative py-1 ${
                  isGlobal 
                    ? 'min-w-[65px] px-1' 
                    : ''
                } ${
                  isActive 
                    ? (item.activeColor || (isGlobal ? 'text-blue-400' : 'text-blue-400 scale-110'))
                    : 'text-muted hover:text-secondary'
                }`}
              >
                <div className={`p-2 rounded-2xl transition-all duration-300 ${
                  isActive ? (item.activeBg || (isGlobal ? 'bg-blue-500/15' : 'bg-white/10')) : 'bg-transparent'
                } ${isGlobal && isActive ? 'scale-105' : ''}`}>
                  <Icon className={`w-5 h-5 ${isActive && isGlobal ? 'stroke-[2.5px]' : 'stroke-[2px]'}`} />
                </div>
                
                {isGlobal && item.label && (
                  <span className={`text-[7.5px] font-black tracking-widest uppercase leading-none transition-opacity ${
                    isActive ? 'opacity-100 text-blue-400' : 'opacity-40 text-secondary'
                  }`}>
                    {item.label}
                  </span>
                )}

                {isGlobal && isActive && (
                  <div className="absolute -bottom-1.5 w-1.25 h-1.25 bg-blue-400 rounded-full shadow-[0_0_8px_#60a5fa] animate-pulse" />
                )}

                {item.badge !== undefined && item.badge > 0 && (
                  <span className={`absolute top-0 right-0 text-[8px] font-black px-1.5 py-0.5 rounded-md border-2 border-slate-950 ${
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

export const SmartDock = memo(SmartDockInner);
