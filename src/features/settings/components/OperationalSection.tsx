
import React from 'react';
import { 
  Mic, Smartphone, CalendarRange, BellRing, Cpu, History, Truck, ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AppSettings } from '../../../types';
import { SettingsSection, SettingsToggle, SettingsInput } from './common/SettingsElements';

interface Props {
  settings: AppSettings;
  updateSetting: (key: keyof AppSettings, value: any) => void;
  theme?: 'dark' | 'light' | 'gray' | 'high-contrast' | 'appsheet-dark' | 'night';
}

export const OperationalSection: React.FC<Props> = ({ settings, updateSetting, theme = 'dark' }) => {
  const navigate = useNavigate();
  
  const isDark = theme === 'dark' || theme === 'night' || theme === 'high-contrast' || theme === 'appsheet-dark' || theme === 'gray';
  const isLight = theme === 'light';
  const isHighContrast = theme === 'high-contrast';

  const handleToggle = (key: keyof AppSettings) => {
    if (navigator.vibrate) navigator.vibrate(15);
    updateSetting(key, !settings[key]);
  };

  // Clases según tema
  const cardBg = isHighContrast ? 'bg-black border-yellow-400' : isLight ? 'bg-white border-slate-100' : 'bg-surface border-white/5';
  const cardText = isHighContrast ? 'text-yellow-400' : isLight ? 'text-slate-800' : 'text-white';
  const cardSubtext = isHighContrast ? 'text-yellow-500' : isLight ? 'text-muted' : 'text-muted';
  const cardHover = isHighContrast ? 'hover:border-yellow-300' : isLight ? 'hover:border-blue-500/50' : 'hover:border-blue-500/50';
  const iconBg = isHighContrast ? 'bg-yellow-900/30 text-yellow-400' : isLight ? 'bg-blue-50 text-blue-500' : 'bg-blue-500/10 text-blue-500';
  const arrowBg = isHighContrast ? 'bg-yellow-900/20 text-yellow-400' : isLight ? 'bg-slate-100 text-muted' : 'bg-elevated text-muted';
  const inputUnitBg = isHighContrast ? 'bg-yellow-900/20 border-yellow-400/30' : isLight ? 'bg-slate-50 border-slate-100' : 'bg-black/40 border-white/5';

  return (
    <SettingsSection title="Operativa" theme={theme}>

      {/* ADMINISTRAR PROVEEDORES */}
      <button 
        onClick={() => {
          if (navigator.vibrate) navigator.vibrate(15);
          navigate('/providers');
        }}
        className={`w-full border-4 p-6 rounded-[2.5rem] mb-6 shadow-sm flex items-center justify-between active:scale-[0.98] transition-all ${cardBg} ${cardHover}`}
      >
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconBg}`}>
            <Truck className="w-6 h-6 stroke-[3px]" />
          </div>
          <div className="text-left">
            <h4 className={`text-[11px] font-black uppercase leading-none ${cardText}`}>Políticas de Retiro / Canjes</h4>
            <p className={`text-[9px] font-bold uppercase mt-1 ${cardSubtext}`}>Administrar bases y condiciones por proveedor</p>
          </div>
        </div>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${arrowBg}`}>
          <ArrowRight className="w-4 h-4 stroke-[3px]" />
        </div>
      </button>

      <div className={`border-4 p-6 rounded-[2.5rem] mb-6 shadow-sm ${cardBg}`}>
        <div className="flex items-center gap-4 mb-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isHighContrast ? 'bg-orange-500/20 text-orange-400' : isLight ? 'bg-orange-50 text-orange-500' : 'bg-orange-500/10 text-orange-500'}`}>
            <History className="w-6 h-6 stroke-[3px]" />
          </div>
          <div className="flex-1">
            <h4 className={`text-[11px] font-black uppercase leading-none ${cardText}`}>Días de Retiro (Standard)</h4>
            <p className={`text-[9px] font-bold uppercase mt-1 ${cardSubtext}`}>Margen para proveedores sin política</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <SettingsInput 
            type="number"
            value={settings.withdrawalDaysDefault || 30}
            onChange={(e: any) => updateSetting('withdrawalDaysDefault', parseInt(e.target.value) || 0)}
            className="text-center text-xl h-14"
            theme={theme}
          />
          <div className={`w-16 h-14 rounded-2xl flex items-center justify-center font-black text-[10px] uppercase ${inputUnitBg} ${cardSubtext}`}>
            Días
          </div>
        </div>
      </div>

      <SettingsToggle 
        active={settings.batchTrackingEnabled} 
        onClick={() => handleToggle('batchTrackingEnabled')}
        label="Trazabilidad Pharma"
        description="Control de lotes y vencimientos"
        icon={CalendarRange}
        theme={theme}
      />

      <SettingsToggle 
        active={settings.ttsEnabled} 
        onClick={() => handleToggle('ttsEnabled')}
        label="Asistente de Voz"
        description="Confirmación audible de conteo"
        icon={Mic}
        theme={theme}
      />

      <SettingsToggle 
        active={settings.soundEnabled} 
        onClick={() => handleToggle('soundEnabled')}
        label="Alertas de Audio"
        description="Beeps de feedback industrial"
        icon={BellRing}
        theme={theme}
      />
  
      <SettingsToggle 
        active={settings.hapticsEnabled} 
        onClick={() => handleToggle('hapticsEnabled')}
        label="Respuesta Háptica"
        description="Vibración inteligente al scanear"
        icon={Smartphone}
        theme={theme}
      />

      <SettingsToggle 
        active={settings.lowEndMode || false} 
        onClick={() => handleToggle('lowEndMode')}
        label="Modo Bajo Rendimiento"
        description="Desactiva IA local para ahorrar RAM"
        icon={Cpu}
        theme={theme}
      />

    </SettingsSection>
  );
};
