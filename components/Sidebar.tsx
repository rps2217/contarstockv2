
import React from 'react';
import { Home, Database, History, Container, Cloud, Box, Settings, Zap, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AppSettings } from '../types';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';

interface SidebarProps {
 view: string;
 settings: AppSettings;
}

export const Sidebar: React.FC<SidebarProps> = ({ view }) => {
 const navigate = useNavigate();
 const pendingCount = useLiveQuery(() => db.scans.where('synced').equals(0).count(), [], 0);
 
 const NavItem = ({ path, label, icon: Icon, badge, activeKey }: { path: string, label: string, icon: any, badge?: number, activeKey: string }) => {
 const isActive = view === activeKey;
 return (
 <button
 onClick={() => navigate(path)}
 className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-200 group relative border-2 ${
 isActive 
 ? 'bg-blue-600 border-blue-400 text-white shadow-xl shadow-blue-900/40' 
 : 'text-slate-500 border-transparent hover:bg-white/5 hover:text-slate-200'
 }`}
 >
 <Icon className={`w-5 h-5 transition-transform group-hover:scale-110 group-active:scale-90 ${isActive ? 'text-white' : 'text-slate-600 group-hover:text-blue-400'}`} />
 <span className="font-black text-[10px] font-mono uppercase tracking-[0.2em]">{label}</span>
 
 {badge && badge > 0 && (
 <span className="absolute right-3 bg-amber-500 text-black text-[9px] font-black px-2 py-0.5 rounded-lg border-2 border-slate-900 shadow-md animate-pulse">
 {badge}
 </span>
 )}
 </button>
 );
 };

 return (
 <aside className="hidden md:flex flex-col w-64 h-screen fixed left-0 top-0 bg-slate-950 border-r-4 border-white/5 z-50 overflow-hidden">
 <div className="p-8 flex items-center gap-4 border-b-4 border-white/5 bg-slate-900/30">
 <div className="bg-blue-600 p-2.5 rounded-xl shadow-2xl border-2 border-blue-400">
 <Box className="w-6 h-6 text-white" />
 </div>
 <div>
 <h1 className="text-white font-black text-xl leading-none uppercase tracking-tighter italic">LogiCount</h1>
 <p className="text-blue-500 text-[8px] font-black uppercase tracking-[0.5em] mt-1">Enterprise_v4</p>
 </div>
 </div>

 <nav className="flex-1 px-4 space-y-2 overflow-y-auto no-scrollbar py-8">
 <div className="text-[9px] font-black text-slate-600 uppercase tracking-[0.4em] px-5 mb-6">Execution_Layer</div>
 <NavItem path="/dashboard" activeKey="dashboard" label="Metrics" icon={Home} />
 <NavItem path="/reports" activeKey="reports" label="History" icon={History} />
 <NavItem path="/database" activeKey="database" label="Master_DB" icon={Database} />
 
 <div className="text-[9px] font-black text-slate-600 uppercase tracking-[0.4em] px-5 mb-6 mt-10">Advanced_Tools</div>
 <NavItem path="/massive/BURST-MODE" activeKey="massive" label="Modo_Martillo" icon={Zap} />
 <NavItem path="/reception" activeKey="reception" label="Reception" icon={Container} />
 <NavItem path="/documents" activeKey="documents" label="Doc_Scanner" icon={FileText} />
 <NavItem path="/sync" activeKey="sync" label="Cloud_Sync" icon={Cloud} badge={pendingCount} />
 </nav>

 <div className="p-6 border-t-4 border-white/5 bg-slate-900/50">
 <button 
 onClick={() => navigate('/settings')}
 className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all border-2 ${view === 'settings' ? 'bg-slate-800 border-white/10 text-white' : 'text-slate-600 border-transparent hover:text-white'}`}
 >
 <Settings className="w-5 h-5" />
 <span className="font-black text-[10px] font-mono uppercase tracking-[0.3em]">Setup</span>
 </button>
 </div>
 </aside>
 );
};
