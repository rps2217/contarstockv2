
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

  const tabs: { id: TabId; label: string; icon: any; color: string }[] = [
      { id: 'general', label: 'Operativa', icon: Zap, color: 'text-amber-500' },
      { id: 'theme', label: 'Estilo', icon: Palette, color: 'text-pink-500' },
      { id: 'printer', label: 'Hardware', icon: Printer, color: 'text-blue-500' },
      { id: 'nav', label: 'Dock', icon: LayoutTemplate, color: 'text-indigo-500' },
      { id: 'cloud', label: 'Nube', icon: Cloud, color: 'text-blue-400' },
      { id: 'system', label: 'Soporte', icon: ShieldCheck, color: 'text-emerald-500' },
  ];

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-black font-sans">
      
      <header className="bg-white dark:bg-slate-900 border-b-4 border-slate-100 dark:border-white/5 pt-6 pb-2 shrink-0 z-30">
        <div className="flex items-center justify-between mb-6 px-6">
            <div className="flex items-center gap-4">
                <button 
                    onClick={() => navigate(-1)} 
                    className="p-4 bg-slate-100 dark:bg-white/5 border-2 border-slate-200 dark:border-white/10 rounded-2xl text-black dark:text-white active:scale-90 transition-all"
                >
                    <ArrowLeft className="w-6 h-6 stroke-[3px]" />
                </button>
                <h1 className="text-3xl font-black tracking-tighter text-black dark:text-white uppercase italic">Setup</h1>
            </div>
            <button 
                onClick={handleShare}
                className={`p-4 border-2 rounded-2xl transition-all active:scale-90 ${copied ? 'bg-emerald-500 border-emerald-600 text-white' : 'bg-slate-50 dark:bg-blue-900/20 border-slate-200 dark:border-blue-500/20 text-slate-600 dark:text-blue-400'}`}
            >
                {copied ? <Check className="w-6 h-6" /> : <Share2 className="w-6 h-6 stroke-[2.5px]" />}
            </button>
        </div>

        {/* TABS OPTIMIZADOS PARA MOBILE SCROLL */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-3 px-6 mask-fade-edges">
            {tabs.map(tab => {
                const isActive = activeTab === tab.id;
                return (
                    <button
                        key={tab.id}
                        onClick={() => {
                            if (navigator.vibrate) navigator.vibrate(10);
                            setActiveTab(tab.id);
                        }}
                        className={`
                            flex items-center gap-3 px-6 py-4 rounded-[1.5rem] transition-all whitespace-nowrap border-2
                            ${isActive 
                                ? `bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/20` 
                                : `bg-white dark:bg-slate-800 border-slate-100 dark:border-white/5 text-slate-500`
                            }
                        `}
                    >
                        <tab.icon className={`w-4 h-4 ${isActive ? 'text-white' : tab.color} stroke-[3.5px]`} />
                        <span className="text-[11px] font-black uppercase tracking-[0.1em]">
                            {tab.label}
                        </span>
                    </button>
                );
            })}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 pt-8 pb-32 no-scrollbar">
        <div className="max-w-md mx-auto">
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                {activeTab === 'general' && <OperationalSection settings={settings} updateSetting={updateSetting} />}
                {activeTab === 'theme' && <ThemeSection settings={settings} updateSetting={updateSetting} />}
                {activeTab === 'printer' && <PrinterSection settings={settings} updateSetting={updateSetting} />}
                {activeTab === 'nav' && <NavigationSection settings={settings} updateSetting={updateSetting} />}
                {activeTab === 'cloud' && <CloudSection settings={settings} updateSetting={updateSetting} />}
                {activeTab === 'system' && <SupportSection />}
            </div>

            <div className="text-center py-12 opacity-20">
                <p className="text-[9px] font-black text-black dark:text-white uppercase tracking-[0.4em]">LogiCount Enterprise v4.5.5</p>
                <div className="mt-2 h-1 w-12 bg-slate-300 dark:bg-slate-700 mx-auto rounded-full"></div>
            </div>
        </div>
      </div>

      <style>{`
        .mask-fade-edges {
            -webkit-mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
            mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
        }
      `}</style>
    </div>
  );
};

export default Settings;
