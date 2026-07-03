/**
 * EventMainFields - Campos principales del formulario de eventos
 */

import React from 'react';
import { FileText, Truck } from 'lucide-react';
import { EventTypeSelector } from './EventTypeSelector';

interface Props {
  frc: string;
  onFrcChange: (value: string) => void;
  nguia: string;
  onNguiaChange: (value: string) => void;
  eventType: string;
  onEventTypeChange: (value: string) => void;
  theme: 'dark' | 'light' | 'high-contrast';
}

export const EventMainFields: React.FC<Props> = ({
  frc,
  onFrcChange,
  nguia,
  onNguiaChange,
  eventType,
  onEventTypeChange,
  theme,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-3xl bg-black/5 border-2 border-black/10">
      {/* Folio FRC */}
      <div className="space-y-2">
        <label className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${
          theme === 'dark' || theme === 'night' || theme === 'high-contrast' || theme === 'appsheet-dark' || theme === 'gray' ? 'text-muted' : 'text-slate-500'
        }`}>
          <FileText className="w-3 h-3" /> Folio FRC
        </label>
        <input
          type="text"
          required
          value={frc}
          onChange={(e) => onFrcChange(e.target.value.toUpperCase())}
          placeholder="Obligatorio"
          className={`w-full px-4 py-3 rounded-xl text-sm font-bold border-2 transition-all outline-none ${
            theme === 'dark' || theme === 'night' || theme === 'high-contrast' || theme === 'appsheet-dark' || theme === 'gray'
              ? 'bg-black/40 border-white/10 focus:border-blue-500 text-white'
              : 'bg-white border-slate-200 focus:border-blue-500 text-slate-900'
          }`}
        />
      </div>

      {/* Guía */}
      <div className="space-y-2">
        <label className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${
          theme === 'dark' || theme === 'night' || theme === 'high-contrast' || theme === 'appsheet-dark' || theme === 'gray' ? 'text-muted' : 'text-slate-500'
        }`}>
          <Truck className="w-3 h-3" /> Guía
        </label>
        <input
          type="text"
          required
          value={nguia}
          onChange={(e) => onNguiaChange(e.target.value.toUpperCase())}
          placeholder="Obligatorio"
          className={`w-full px-4 py-3 rounded-xl text-sm font-bold border-2 transition-all outline-none ${
            theme === 'dark' || theme === 'night' || theme === 'high-contrast' || theme === 'appsheet-dark' || theme === 'gray'
              ? 'bg-black/40 border-white/10 focus:border-blue-500 text-white'
              : 'bg-white border-slate-200 focus:border-blue-500 text-slate-900'
          }`}
        />
      </div>

      {/* Tipo de Evento */}
      <EventTypeSelector value={eventType} onChange={onEventTypeChange} theme={theme} />
    </div>
  );
};
