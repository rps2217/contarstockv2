
import React, { useState, useEffect } from 'react';
import { 
 Settings as SettingsIcon, ArrowLeft, Share2, Palette, Cloud, 
 Zap, LayoutTemplate, ShieldCheck, Printer, Check, Info
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';

// Módulos
import { OperationalSection } from './components/OperationalSection';
import { NavigationSection } from './components/NavigationSection';
import { SupportSection } from './components/SupportSection';
import { CloudSection } from './components/CloudSection';
import { ThemeSection } from './components/ThemeSection';
import { PrinterSection } from './components/PrinterSection';

type TabId = 'general' | 'appearance' | 'cloud' | 'system';

export const Settings: React.FC = () => {
 const navigate = useNavigate();
 const location = useLocation();
 const { settings, updateSetting } = useAppStore(); 
 const [activeTab, setActiveTab] = useState<TabId>('general');
 const [copied, setCopied] = useState(false);

 // Deep linking logic
 useEffect(() => {
 const params = new URLSearchParams(location.search);
 const tabParam = params.get('tab') as TabId;
 if (tabParam && ['general', 'appearance', 'cloud', 'system'].includes(tabParam)) {
 setActiveTab(tabParam);
 }
 }, [location]);

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
 { id: 'general', label: 'General', icon: Zap, color: 'text-amber-500' },
 { id: 'appearance', label: 'Apariencia', icon: Palette, color: 'text-pink-500' },
 { id: 'cloud', label: 'Nube', icon: Cloud, color: 'text-sky-400' },
 { id: 'system', label: 'Soporte', icon: ShieldCheck, color: 'text-emerald-500' },
 ];

 return (
 <div className="flex flex-col h-screen bg-slate-50 dark:bg-black font-mono overflow-hidden">
 
 {/* HEADER DINÁMICO */}
 <header className="bg-white dark:bg-slate-900 border-b-4 border-slate-100 dark:border-white/5 pt-8 pb-4 shrink-0 z-30 shadow-sm">
 <div className="flex items-center justify-between mb-8 px-6">
 <div className="flex items-center gap-5">
 <button 
 onClick={() => navigate('/dashboard')} 
 className="w-14 h-14 bg-slate-100 dark:bg-white/5 border-2 border-slate-200 dark:border-white/10 rounded-2xl text-black dark:text-white active:scale-90 transition-all flex items-center justify-center"
 >
 <ArrowLeft className="w-7 h-7 stroke-[3px]" />
 </button>
 <div>
 <h1 className="text-4xl font-black tracking-tighter text-black dark:text-white uppercase italic leading-none">Setup</h1>
 <div className="flex items-center gap-2 mt-1.5">
 <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
 <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Configuración_Sistema_v5.0</span>
 </div>
 </div>
 </div>
 <button 
 onClick={handleShare}
 className={`w-14 h-14 flex items-center justify-center border-4 rounded-2xl transition-all active:scale-90 ${copied ? 'bg-emerald-500 border-emerald-400 text-white' : 'bg-slate-50 dark:bg-blue-900/20 border-slate-100 dark:border-blue-500/20 text-slate-400 dark:text-blue-400'}`}
 >
 {copied ? <Check className="w-6 h-6" /> : <Share2 className="w-6 h-6 stroke-[2.5px]" />}
 </button>
 </div>

 {/* NAVEGACIÓN TACTIL (CHIPS) - Deslizable horizontalmente */}
 <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 px-6 mask-fade-right">
 {tabs.map(tab => {
 const isActive = activeTab === tab.id;
 return (
 <button
 key={tab.id}
 id={`tab-btn-${tab.id}`}
 onClick={() => {
 if (navigator.vibrate) navigator.vibrate(10);
 setActiveTab(tab.id);
 }}
 className={`
 flex items-center gap-3 px-6 py-4 rounded-2xl transition-all whitespace-nowrap border-2
 ${isActive 
 ? `bg-blue-600 border-blue-500 text-white shadow-xl shadow-blue-900/20 scale-105 z-10` 
 : `bg-slate-50 dark:bg-slate-800 border-transparent text-slate-500 hover:bg-white dark:hover:bg-slate-700`
 }
 `}
 >
 <tab.icon className={`w-4 h-4 ${isActive ? 'text-white' : tab.color} stroke-[3.5px]`} />
 <span className="text-[11px] font-black uppercase tracking-widest">
 {tab.label}
 </span>
 </button>
 );
 })}
 </div>
 </header>

 {/* CONTENIDO SCROLLABLE */}
 <div className="flex-1 overflow-y-auto px-6 pt-10 pb-40 no-scrollbar relative">
 <div className="max-w-2xl mx-auto">
 <div className="animate-in fade-in slide-in-from-bottom-6 duration-500 space-y-8">
 {activeTab === 'general' && (
   <>
     <OperationalSection settings={settings} updateSetting={updateSetting} />
     <PrinterSection settings={settings} updateSetting={updateSetting} />
   </>
 )}
 {activeTab === 'appearance' && (
   <>
     <ThemeSection settings={settings} updateSetting={updateSetting} />
     <NavigationSection settings={settings} updateSetting={updateSetting} />
   </>
 )}
 {activeTab === 'cloud' && <CloudSection settings={settings} updateSetting={updateSetting} />}
 {activeTab === 'system' && <SupportSection />}
 </div>

 {/* Footer de versión */}
 <div className="text-center py-20 opacity-20">
 <div className="flex items-center justify-center gap-4 mb-4">
 <div className="h-px w-10 bg-slate-300"></div>
 <Info className="w-5 h-5" />
 <div className="h-px w-10 bg-slate-300"></div>
 </div>
 <p className="text-[10px] font-black text-black dark:text-white uppercase tracking-[0.5em]">Enterprise Core v5.7.5</p>
 <p className="text-[8px] font-bold text-slate-500 uppercase mt-2">Architecture Certified by Gemini IA</p>
 </div>
 </div>
 </div>

 <style>{`
 .mask-fade-right {
 -webkit-mask-image: linear-gradient(to right, black 85%, transparent 100%);
 mask-image: linear-gradient(to right, black 85%, transparent 100%);
 }
 `}</style>
 </div>
 );
};

export default Settings;
