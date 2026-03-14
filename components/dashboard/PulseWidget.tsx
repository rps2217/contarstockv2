
import React, { memo } from 'react';
import { Activity } from 'lucide-react';
import { Card } from '../ui';

interface PulseWidgetProps {
  ipm: number;
  scansToday: number;
}

export const PulseWidget = memo(({ ipm, scansToday }: PulseWidgetProps) => {
  return (
    <Card className="flex items-center justify-between shadow-2xl">
      <div className="flex items-center gap-5">
        <div className={`p-4 rounded-2xl bg-black/60 border-2 ${ipm > 10 ? 'border-emerald-500/30' : 'border-white/5'}`}>
          <Activity className={`w-8 h-8 ${ipm > 10 ? 'text-emerald-500 animate-pulse' : 'text-slate-600'}`} />
        </div>
        <div>
          <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Rendimiento Actual</div>
          <div className="text-3xl font-black text-white tabular-nums">{ipm} <span className="text-xs text-slate-500">IPM</span></div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Picks Hoy</div>
        <div className="text-3xl font-black text-blue-500 tabular-nums">{scansToday}</div>
      </div>
    </Card>
  );
});

PulseWidget.displayName = 'PulseWidget';
