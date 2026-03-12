import React from 'react';
import { ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ActionCardProps {
 title: string;
 sub: string;
 icon: any;
 colorClass: string;
 to: string;
 span?: number;
}

export const ActionCard: React.FC<ActionCardProps> = ({ title, sub, icon: Icon, colorClass, to, span = 1 }) => {
 const navigate = useNavigate();
 const isPrimary = colorClass.includes('bg-blue-600');
 
 return (
 <button 
 onClick={() => navigate(to)}
 className={`
 group relative overflow-hidden text-left transition-all active:scale-[0.98] duration-300
 flex flex-row items-center gap-6 p-6 rounded-3xl border shadow-sm hover:shadow-md
 md:flex-col md:justify-between md:p-8 md:h-64
 ${span === 2 ? 'md:col-span-2' : 'md:col-span-1'}
 ${colorClass}
 `}
 >
 <div className={`
 shrink-0 rounded-2xl flex items-center justify-center transition-all duration-300 
 w-14 h-14 md:w-16 md:h-16 
 ${isPrimary ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-600 group-hover:bg-blue-100'} 
 md:mb-4 group-hover:scale-110
 `}>
 <Icon className="w-7 h-7 md:w-8 md:h-8" />
 </div>

 <div className="flex-1 min-w-0">
 <h2 className={`text-xl font-bold md:text-2xl md:mb-1 tracking-tight ${isPrimary ? 'text-white' : 'text-slate-900'}`}>{title}</h2>
 <p className={`text-sm font-medium line-clamp-2 ${isPrimary ? 'text-blue-100' : 'text-slate-500'}`}>{sub}</p>
 </div>

 <div className={`p-2 rounded-full transition-all ${isPrimary ? 'bg-white/10 text-white' : 'bg-slate-50 text-slate-300 group-hover:text-blue-600 group-hover:bg-blue-50'}`}>
 <ChevronRight className="w-6 h-6" />
 </div>
 </button>
 );
};