/**
 * EventTypeSelector - Selector de tipo de evento
 */

import React from 'react';
import { FileText } from 'lucide-react';

const EVENT_TYPES = [
  'DIF. PED.',
  'DET. PED.',
  'VENCE CERC.',
  'DET. CALIDAD INT.',
  'DET. CALIDAD EXT.',
  'CANJES',
  'MERMAS'
];

interface Props {
  value: string;
  onChange: (value: string) => void;
  theme: 'dark' | 'light' | 'high-contrast';
}

export const EventTypeSelector: React.FC<Props> = ({ value, onChange, theme }) => {
  return (
    <div className="space-y-2">
      <label className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${
        theme === 'dark' ? 'text-muted' : 'text-slate-500'
      }`}>
        <FileText className="w-3 h-3" /> Evento
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full px-4 py-3 rounded-xl text-sm font-bold border-2 transition-all outline-none appearance-none ${
          theme === 'dark'
            ? 'bg-black/40 border-white/10 focus:border-blue-500 text-white'
            : 'bg-white border-slate-200 focus:border-blue-500 text-slate-900'
        }`}
      >
        {EVENT_TYPES.map(type => (
          <option key={type} value={type}>{type}</option>
        ))}
      </select>
    </div>
  );
};
