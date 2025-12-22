
import React, { useState } from 'react';
import { 
    Settings as SettingsIcon, ArrowLeft, Share2, Palette, Cloud, 
    Zap, LayoutTemplate, ShieldCheck, ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';

// Módulos
import { OperationalSection } from './settings/OperationalSection';
import { NavigationSection } from './settings/NavigationSection';
import { SupportSection } from './settings/SupportSection';
import { CloudSection } from './settings/CloudSection';
import { ThemeSection } from './settings/ThemeSection';

type TabId = 'general' | 'theme' | 'cloud' | 'nav' | 'system';

export const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { settings, updateSetting } = useAppStore(); 
  const [activeTab, setActiveTab] = useState<TabId>('general');

  const tabs: { id: TabId; label: string; icon: any; color: string }[] = [
      { id: 'general', label: 'Operativa', icon: Zap, color: 'text-amber-500' },
      { id: 'theme', label: 'Apariencia', icon: Palette, color: 'text-pink-500' },
      { id: 'nav', label: 'Navegación', icon: LayoutTemplate, color: 'text-indigo-500' },
      { id: 'cloud', label: 'Conexiones', icon: Cloud, color: 'text-blue-500' },
      { id: 'system', label: 'Sistema', icon: ShieldCheck, color: 'text-emerald-500' },
  ];

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
    <div className="flex flex-col h-[calc(100vh-80px)] md:h-[calc(100vh-64px)] bg-slate-50 md:p-6 animate-in fade-in duration-300">
      
      {/* HEADER MOVIL / DESKTOP */}
      <div className="flex items-center justify-between mb-6 px-4 pt-4 md:pt-0 shrink-0">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2 hover:bg-white bg-slate-100 rounded-full transition-all text-slate-600 shadow-sm active:scale-90"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-black tracking-tight text-slate-900 flex items-center gap-2">
                Ajustes
            </h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden md:block">Configuración Global</p>
          </div>
        </div>
        <button 
            onClick={handleShare}
            className="p-2 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors"
        >
            <Share2 className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-6 min-h-0 overflow-hidden max-w-6xl mx-auto w-full">
        
        {/* SIDEBAR DE PESTAÑAS (Scroll Horizontal en Móvil, Vertical en Desktop) */}
        <div className="md:w-64 shrink-0 overflow-x-auto md:overflow-y-auto no-scrollbar flex md:flex-col gap-2 px-4 pb-2 md:pb-0">
            {tabs.map(tab => {
                const isActive = activeTab === tab.id;
                return (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`
                            flex items-center gap-3 p-3 md:p-4 rounded-2xl transition-all whitespace-nowrap md:whitespace-normal
                            ${isActive 
                                ? 'bg-white shadow-md border-slate-100 text-slate-900 ring-2 ring-blue-50' 
                                : 'bg-transparent hover:bg-white/50 text-slate-500 hover:text-slate-700'
                            }
                        `}
                    >
                        <div className={`p-2 rounded-xl ${isActive ? 'bg-slate-50' : 'bg-transparent'}`}>
                            <tab.icon className={`w-5 h-5 ${isActive ? tab.color : 'text-slate-400'}`} />
                        </div>
                        <div className="flex-1 text-left">
                            <span className={`text-xs font-black uppercase tracking-wide ${isActive ? 'text-slate-900' : 'text-slate-500'}`}>
                                {tab.label}
                            </span>
                        </div>
                        {isActive && <ChevronRight className="w-4 h-4 text-slate-300 hidden md:block" />}
                    </button>
                );
            })}
        </div>

        {/* ÁREA DE CONTENIDO */}
        <div className="flex-1 overflow-y-auto px-4 pb-24 md:pb-0 no-scrollbar">
            <div className="bg-white rounded-[2.5rem] p-1 shadow-sm border border-slate-200 min-h-[400px]">
                {activeTab === 'general' && <OperationalSection settings={settings} updateSetting={updateSetting} />}
                {activeTab === 'theme' && <ThemeSection settings={settings} updateSetting={updateSetting} />}
                {activeTab === 'nav' && <NavigationSection settings={settings} updateSetting={updateSetting} />}
                {activeTab === 'cloud' && <CloudSection settings={settings} updateSetting={updateSetting} />}
                {activeTab === 'system' && <SupportSection />}
            </div>

            <div className="mt-8 text-center pb-8 opacity-50">
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.3em]">LogiCount Pro Enterprise</p>
                <p className="text-[9px] text-slate-300 mt-1">v2.5.2 Stable</p>
            </div>
        </div>

      </div>
    </div>
  );
};
