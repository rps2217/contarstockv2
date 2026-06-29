
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
  theme?: 'dark' | 'light' | 'high-contrast';
  hideTitleOnMobile?: boolean;
  hideBackButtonOnMobile?: boolean;
}

export const ModuleHeader: React.FC<ModuleHeaderProps> = ({
  title,
  subtitle,
  icon,
  onBack,
  actions,
  theme = 'dark',
  hideTitleOnMobile = false,
  hideBackButtonOnMobile = false
}) => {
  const navigate = useNavigate();
  const handleBack = onBack || (() => navigate(-1));

  return (
    <header className={`py-3 px-4 md:py-6 md:px-8 border-b ${theme === 'dark' ? 'bg-base border-white/5' : 'bg-white border-slate-100'}`}>
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={handleBack}
            className={`p-3 rounded-2xl transition-all active:scale-90 ${
              theme === 'dark' ? 'bg-white/5 text-muted hover:text-white' : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            } ${hideBackButtonOnMobile ? 'hidden md:flex' : ''}`}
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          
          <div className={`items-center gap-3 ${hideTitleOnMobile ? 'hidden md:flex' : 'flex'}`}>
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
