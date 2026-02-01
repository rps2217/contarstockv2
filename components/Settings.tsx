
import React, { useState } from 'react';
import { 
    Settings as SettingsIcon, ArrowLeft, Share2, Palette, Cloud, 
    Zap, LayoutTemplate, ShieldCheck, Printer, Check
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';

// Módulos
import { OperationalSection } from './settings/OperationalSection';
import { NavigationSection } from './settings/NavigationSection';
import { SupportSection } from './settings/SupportSection';
import { CloudSection } from './settings/CloudSection';
import { ThemeSection } from './settings/ThemeSection';
import { PrinterSection } from './settings/PrinterSection';

type TabId = 'general' | 'theme' | 'printer' | 'cloud' | 'nav' | 'system';

export const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { settings, updateSetting } = useAppStore(); 
  const [activeTab, setActiveTab] = useState<TabId>('general');
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
      const data = { title: 'LogiCount Pro', url: window.location.href };
      // Compatibilidad robusta: Si no hay share nativo, copiar al portapapeles
      if (navigator.share) {
          try { await navigator.share(data); } catch (e) {}
      } else {
          try {
              await navigator.clipboard.writeText(window.location.href);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
          } catch (e) { alert("URL: " + window.location.href); }
      }
  };

  const tabs: { id: TabId; label: string; icon: any; color: string; bg: string }[] = [
      { id: 'general', label: 'Operativa', icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50' },
      { id: 'theme', label: 'Estilo', icon: Palette, color: 'text-pink-600', bg: 'bg-pink-50' },
      { id: 'printer', label: 'Hardware', icon: Printer, color: 'text-blue-600', bg: 'bg-blue-50' },
      { id: 'nav', label: 'Dock', icon: LayoutTemplate, color: 'text-indigo-600', bg: 'bg-indigo-50' },
      { id: 'cloud', label: 'Nube', icon: Cloud, color: 'text-blue-600', bg: 'bg-blue-50' },
      { id: 'system', label: 'Soporte', icon: ShieldCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ];

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-black font-sans">
      
      <header className="bg-white dark:bg-slate-900 border-b-4 border-slate-100 dark:border-white/5 px-4 pt-4 pb-3 shrink-0 z-30">
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
                <button 
                    onClick={() => navigate(-1)} 
                    className="p-3 bg-slate-100 dark:bg-white/5 border-2 border-slate-200 dark:border-white/10 rounded-2xl text-black dark:text-white active:scale-90 transition-all"
                >
                    <ArrowLeft className="w-6 h-6 stroke-[3px]" />
                </button>
                <h1 className="text-2xl font-black tracking-tighter text-black dark:text-white uppercase italic">Configuración</h1>
            </div>
            <button 
                onClick={handleShare}
                className={`p-3 border-2 rounded-2xl transition-all active:scale-90 flex items-center gap-2 ${copied ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-500/20 text-blue-700 dark:text-blue-400'}`}
            >
                {copied ? <Check className="w-6 h-6" /> : <Share2 className="w-6 h-6 stroke-[2.5px]" />}
                {copied && <span className="text-[10px] font-black uppercase pr-1">Link Copiado</span>}
            </button>
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 px-1">
            {tabs.map(tab => {
                const isActive = activeTab === tab.id;
                return (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`
                            flex items-center gap-2 px-5 py-3 rounded-2xl transition-all whitespace-nowrap border-2
                            ${isActive 
                                ? `bg-black dark:bg-blue-600 border-black dark:border-blue-500 text-white shadow-lg` 
                                : `bg-white dark:bg-slate-800 border-slate-200 dark:border-white/5 text-slate-500`
                            }
                        `}
                    >
                        <tab.icon className={`w-4 h-4 ${isActive ? 'text-white' : tab.color} stroke-[3px]`} />
                        <span className="text-xs font-black uppercase tracking-widest">
                            {tab.label}
                        </span>
                    </button>
                );
            })}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 pt-6 pb-32 no-scrollbar">
        <div className="max-w-md mx-auto space-y-6">
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                {activeTab === 'general' && <OperationalSection settings={settings} updateSetting={updateSetting} />}
                {activeTab === 'theme' && <ThemeSection settings={settings} updateSetting={updateSetting} />}
                {activeTab === 'printer' && <PrinterSection settings={settings} updateSetting={updateSetting} />}
                {activeTab === 'nav' && <NavigationSection settings={settings} updateSetting={updateSetting} />}
                {activeTab === 'cloud' && <CloudSection settings={settings} updateSetting={updateSetting} />}
                {activeTab === 'system' && <SupportSection />}
            </div>

            <div className="text-center py-8 opacity-40">
                <p className="text-[10px] font-black text-black dark:text-white uppercase tracking-[0.3em]">LogiCount Enterprise v2.5.5</p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
