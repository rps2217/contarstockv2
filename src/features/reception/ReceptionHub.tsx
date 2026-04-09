import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, History } from 'lucide-react';
import ReceptionPage from './ReceptionPage';

export const ReceptionHub: React.FC = () => {
  const navigate = useNavigate();

  // We go directly to the scanning interface for boxes and closed packages
  return (
    <div className="h-screen w-full flex flex-col bg-black overflow-hidden font-mono text-white">
      <header className="h-16 px-4 flex items-center justify-between border-b border-white/10 bg-slate-900 shrink-0 z-50">
        <button 
          onClick={() => navigate('/dashboard')} 
          className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl active:bg-blue-600 transition-colors"
        >
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>
        <div className="flex flex-col items-center">
          <span className="text-[8px] font-black uppercase tracking-[0.3em] text-white/40 leading-none mb-1">CONTROL</span>
          <span className="text-xs font-black uppercase tracking-widest text-white italic">Arribo de Bultos</span>
        </div>
        <button 
          onClick={() => navigate('/reception/history')} 
          className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl active:bg-blue-600 transition-colors"
        >
          <History className="w-5 h-5 text-white" />
        </button>
      </header>
      <div className="flex-1 min-h-0 relative">
        <ReceptionPage isEmbedded />
      </div>
    </div>
  );
};

export default ReceptionHub;

// Forced GitHub sync
