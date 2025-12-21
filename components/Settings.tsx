
import React from 'react';
import { Settings as SettingsIcon, ArrowLeft, Share2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { OperationalSection } from './settings/OperationalSection';
import { NavigationSection } from './settings/NavigationSection';
import { SupportSection } from './settings/SupportSection';
import { CloudSection } from './settings/CloudSection';
import { ThemeSection } from './settings/ThemeSection';

export const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { settings, updateSetting } = useAppStore(); 

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'LogiCount Pro',
        text: 'Sistema de Gestión de Inventario Profesional',
        url: window.location.href
      }).catch(() => {});
    }
  };

  return (
    <div className="max-w-2xl mx-auto pb-24 px-2 pt-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between mb-8 px-2">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2 text-slate-800">
              <SettingsIcon className="w-6 h-6 text-slate-400" /> Ajustes Globales
          </h1>
        </div>
        <button 
          onClick={handleShare}
          className="p-2 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors"
        >
          <Share2 className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-6">
        {/* Sección 1: Nube y Sincronización (CRÍTICO) */}
        <CloudSection settings={settings} updateSetting={updateSetting} />

        {/* Sección 2: Preferencias Operativas */}
        <OperationalSection settings={settings} updateSetting={updateSetting} />
        
        {/* Sección 3: Apariencia */}
        <ThemeSection settings={settings} updateSetting={updateSetting} />

        {/* Sección 4: Navegación Móvil */}
        <NavigationSection settings={settings} updateSetting={updateSetting} />
        
        {/* Sección 5: Soporte y Sistema */}
        <SupportSection />
      </div>

      <div className="mt-12 text-center pb-10">
          <p className="text-[10px] text-slate-300 font-bold uppercase tracking-[0.3em]">LogiCount Pro Enterprise Edition</p>
          <p className="text-[9px] text-slate-200 mt-1">v2.5.0-stable</p>
      </div>
    </div>
  );
};
