
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { motion } from 'motion/react';

interface ModuleHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  onBack?: () => void;
  actions?: React.ReactNode;
  theme?: 'dark' | 'light';
}

export const ModuleHeader: React.FC<ModuleHeaderProps> = ({
  title,
  subtitle,
  icon,
  onBack,
  actions,
  theme = 'dark'
}) => {
  const navigate = useNavigate();
  const handleBack = onBack || (() => navigate(-1));

  return (
    <header className={`p-6 border-b ${theme === 'dark' ? 'bg-slate-950 border-white/5' : 'bg-white border-slate-100'}`}>
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={handleBack}
            className={`p-3 rounded-2xl transition-all active:scale-90 ${
              theme === 'dark' ? 'bg-white/5 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          
          <div className="flex items-center gap-3">
            {icon && (
              <div className={`p-3 rounded-2xl ${theme === 'dark' ? 'bg-white/5' : 'bg-slate-100'}`}>
                {icon}
              </div>
            )}
            <div>
              <h1 className={`text-xl font-black uppercase italic tracking-tighter leading-none ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                {title}
              </h1>
              {subtitle && (
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {actions}
        </div>
      </div>
    </header>
  );
};
