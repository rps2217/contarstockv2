
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

  const tabs: { id: TabId; label: string; icon: any; }[] = [
      { id: 'general', label: 'Operativa', icon: Zap },
      { id: 'theme', label: 'Estilo', icon: Palette },
      { id: 'printer', label: 'Hardware', icon: Printer },
      { id: 'nav', label: 'Dock', icon: LayoutTemplate },
      { id: 'cloud', label: 'Nube', icon: Cloud },
      { id: 'system', label: 'Soporte', icon: ShieldCheck },
  ];

  return (
    <div className="flex flex-col h-screen bg-app-main font-sans text-app-text">
      
      <header className="bg-app-surface border-b-4 border-app-border px-4 pt-4 pb-3 shrink-0 z-30">
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
                <button 
                    onClick={() => navigate(-1)} 
                    className="p-3 bg-app-main border-2 border-app-border rounded-app text-app-text active:scale-90 transition-all"
                >
                    <ArrowLeft className="w-6 h-6 stroke-[3px]" />
                </button>
                <h1 className="text-2xl font-black tracking-tighter text-app-text uppercase italic">Configuración</h1>
            </div>
            <button 
                onClick={handleShare}
                className={`p-3 border-2 rounded-app transition-all active:scale-90 flex items-center gap-2 ${copied ? 'bg-app-success/10 border-app-success text-app-success' : 'bg-app-main border-app-border text-app-muted'}`}
            >
                {copied ? <Check className="w-6 h-6" /> : <Share2 className="w-6 h-6 stroke-[2.5px]" />}
                {copied && <span className="text-[10px] font-black uppercase pr-1">Copiado</span>}
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
                            flex items-center gap-2 px-5 py-3 rounded-app transition-all whitespace-nowrap border-2
                            ${isActive 
                                ? `bg-app-accent border-app-accent text-white shadow-lg` 
                                : `bg-app-main border-app-border text-app-muted`
                            }
                        `}
                    >
                        <tab.icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-app-muted'} stroke-[3px]`} />
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
                <p className="text-[10px] font-black text-app-muted uppercase tracking-[0.3em]">LogiCount Enterprise v2.6.0</p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
