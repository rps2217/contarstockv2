import React from "react";
import { ChevronLeft, CheckCircle2, Eraser, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { NetworkStatus } from "../../../shared/components/ui/NetworkStatus";

interface Props {
  isCleaning: boolean;
  onClean: () => void;
  onStartNew: () => void;
  syncedCount: number;
  theme?: 'dark' | 'light';
}

export const ReportsHeader: React.FC<Props> = ({
  isCleaning,
  onClean,
  onStartNew,
  syncedCount,
  theme = 'dark'
}) => {
  const navigate = useNavigate();
  return (
    <div className="flex-none">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/dashboard")}
            className={`p-2 rounded-full transition-colors ${
              theme === 'dark' ? 'hover:bg-white/5 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
            }`}
          >
            <ChevronLeft className="w-7 h-7" />
          </button>
          <div className="flex items-center gap-2">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              theme === 'dark' ? 'bg-brand-info/10' : 'bg-blue-600/10'
            }`}>
              <CheckCircle2 className={`w-6 h-6 ${theme === 'dark' ? 'text-brand-info' : 'text-blue-600'}`} />
            </div>
            <h1 className={`text-3xl font-black tracking-tighter uppercase italic ${
              theme === 'dark' ? 'text-white' : 'text-slate-900'
            }`}>
              Historial
            </h1>
          </div>
        </div>
        <NetworkStatus />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <button
          onClick={onClean}
          disabled={isCleaning}
          className={`border-2 font-black py-4 rounded-[1.5rem] transition-all flex flex-col items-center justify-center gap-1 shadow-sm disabled:opacity-50 active:scale-95 relative overflow-hidden group ${
            theme === 'dark' 
              ? 'bg-brand-surface border-white/10 text-white hover:bg-brand-surface/80' 
              : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-2">
            {isCleaning ? (
              <div className={`w-4 h-4 border-2 rounded-full animate-spin ${
                theme === 'dark' ? 'border-white border-t-transparent' : 'border-slate-900 border-t-transparent'
              }`} />
            ) : (
              <Eraser className="w-5 h-5" />
            )}
            <span className="text-sm uppercase tracking-tight">Limpiar Cloud</span>
          </div>
          {syncedCount > 0 && (
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
              {syncedCount} Listos para purgar
            </span>
          )}
        </button>
        <button
          onClick={onStartNew}
          className={`font-black py-4 rounded-[1.5rem] transition-all flex items-center justify-center gap-2 shadow-xl active:scale-95 border-b-4 ${
            theme === 'dark'
              ? 'bg-brand-warning text-black hover:bg-brand-warning/90 shadow-brand-warning/20 border-brand-warning/80'
              : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20 border-blue-800'
          }`}
        >
          <Plus className="w-6 h-6" /> 
          <span className="text-sm uppercase tracking-tight">Nueva Carga</span>
        </button>
      </div>
    </div>
  );
};

// Forced GitHub sync
