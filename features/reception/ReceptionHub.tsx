import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, FileText, Box } from 'lucide-react';
import ReceptionPage from './ReceptionPage';
import DocumentReceptionPage from '../documents/DocumentReceptionPage';

export const ReceptionHub: React.FC = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'blind' | 'guided'>('blind');

  return (
    <div className="h-screen w-full flex flex-col bg-black overflow-hidden font-mono text-white">
      {/* HEADER UNIFICADO */}
      <header className="h-16 px-4 flex items-center justify-between border-b border-white/10 bg-slate-900 shadow-2xl shrink-0 z-50">
        <button onClick={() => navigate('/dashboard')} className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl active:bg-blue-600 transition-colors">
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>
        
        <div className="flex bg-slate-800 p-1 rounded-xl">
          <button 
            onClick={() => setMode('blind')}
            className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${mode === 'blind' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
          >
            <Box className="w-4 h-4" />
            Ciega
          </button>
          <button 
            onClick={() => setMode('guided')}
            className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${mode === 'guided' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
          >
            <FileText className="w-4 h-4" />
            Con Guía
          </button>
        </div>

        <div className="w-10"></div> {/* Spacer for balance */}
      </header>

      {/* CONTENIDO */}
      <div className="flex-1 min-h-0 relative">
        {mode === 'blind' ? <ReceptionPage isEmbedded /> : <DocumentReceptionPage isEmbedded />}
      </div>
    </div>
  );
};

export default ReceptionHub;
