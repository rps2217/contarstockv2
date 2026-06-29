
import React, { useState, useEffect } from 'react';
import { 
 Settings as SettingsIcon, ArrowLeft, Share2, Cloud, 
 Zap, ShieldCheck, Check, Info
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSettingsStore } from './store/useSettingsStore';

// Módulos
import { OperationalSection } from './components/OperationalSection';
import { NavigationSection } from './components/NavigationSection';
import { SupportSection } from './components/SupportSection';
import { ModulesSection } from './components/ModulesSection';
import { CloudSection } from './components/CloudSection';
import { ThemeSection } from './components/ThemeSection';
import { PrinterSection } from './components/PrinterSection';
import { PreferencesSection } from './components/PreferencesSection';

type TabId = 'general' | 'nube' | 'sistema';

export const Settings: React.FC = () => {
 const navigate = useNavigate();
 const location = useLocation();
 const { settings, updateSetting } = useSettingsStore(); 
 const [activeTab, setActiveTab] = useState<TabId>('general');
 const [copied, setCopied] = useState(false);
 const isDark = settings.theme !== 'light';

 // Deep linking logic
 useEffect(() => {
   const params = new URLSearchParams(location.search);
   const tabParam = params.get('tab') as TabId;
   if (tabParam && ['general', 'nube', 'sistema'].includes(tabParam)) {
     setActiveTab(tabParam);
   }
 }, [location]);

 const handleShare = async () => {
   const data = { title: 'CountPro', url: window.location.href };
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

 const tabs: { id: TabId; label: string; icon: any }[] = [
  { id: 'general', label: 'General', icon: Zap },
  { id: 'nube', label: 'Nube', icon: Cloud },
  { id: 'sistema', label: 'Sistema', icon: ShieldCheck },
 ];

 return (
 <div className={`flex flex-col h-screen ${isDark ? 'bg-base' : 'bg-base'} overflow-hidden`}>
 
 {/* HEADER */}
 <header className={`${isDark ? 'bg-base border-subtle' : 'bg-white border-subtle'} border-b pt-6 pb-4 shrink-0`}>
 <div className="flex items-center justify-between px-4 mb-6">
 <div className="flex items-center gap-3">
 <button 
 onClick={() => navigate('/dashboard')} 
 className={`p-2.5 rounded-xl ${isDark ? 'bg-surface hover:bg-elevated text-muted' : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-600'}`}
 >
 <ArrowLeft className="w-5 h-5" />
 </button>
 <div>
 <h1 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-neutral-900'}`}>Ajustes</h1>
 <p className={`text-xs ${isDark ? 'text-neutral-500' : 'text-neutral-500'}`}>Configuración</p>
 </div>
 </div>
 <button 
 onClick={handleShare}
 className={`p-2.5 rounded-xl border ${copied ? (isDark ? 'bg-elevated border-neutral-600 text-primary' : 'bg-neutral-200 border-neutral-300 text-neutral-800') : (isDark ? 'bg-surface border-subtle text-muted' : 'bg-neutral-100 border-subtle text-neutral-600')}`}
 >
 {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
 </button>
 </div>

 {/* Tabs */}
 <div className={`flex gap-1 px-4`}>
 {tabs.map(tab => {
 const isActive = activeTab === tab.id;
 return (
 <button
 key={tab.id}
 onClick={() => setActiveTab(tab.id)}
 className={`
 flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all
 ${isActive 
 ? (isDark ? 'bg-elevated text-white' : 'bg-surface text-white') 
 : (isDark ? 'text-neutral-500 hover:text-secondary' : 'text-neutral-500 hover:text-neutral-700')
 }
 `}
 >
 <tab.icon className="w-4 h-4" />
 {tab.label}
 </button>
 );
 })}
 </div>
 </header>

 {/* CONTENIDO */}
 <div className="flex-1 overflow-y-auto px-4 pt-6 pb-24">
 <div className="max-w-2xl mx-auto space-y-6">
 {activeTab === 'general' && (
   <>
     <PreferencesSection settings={settings} updateSetting={updateSetting} />
     <OperationalSection settings={settings} updateSetting={updateSetting} />
     <ThemeSection settings={settings} updateSetting={updateSetting} />
     <NavigationSection settings={settings} updateSetting={updateSetting} />
     <PrinterSection settings={settings} updateSetting={updateSetting} />
   </>
 )}
 {activeTab === 'nube' && <CloudSection settings={settings} updateSetting={updateSetting} />}
 {activeTab === 'sistema' && (
   <>
     <SupportSection />
     <ModulesSection />
   </>
 )}
 </div>

 {/* Footer */}
 <div className="text-center py-12">
 <p className={`text-[10px] ${isDark ? 'text-neutral-600' : 'text-muted'}`}>CountPro v5.7.5</p>
 </div>
 </div>
 </div>
);
};

export default Settings;

