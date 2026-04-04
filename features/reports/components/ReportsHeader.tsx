import React from "react";
import { ChevronLeft, CheckCircle2, Eraser, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { NetworkStatus } from "../../../shared/components/ui/NetworkStatus";

interface Props {
  isCleaning: boolean;
  onClean: () => void;
  onStartNew: () => void;
  syncedCount: number;
}

export const ReportsHeader: React.FC<Props> = ({
  isCleaning,
  onClean,
  onStartNew,
  syncedCount,
}) => {
  const navigate = useNavigate();
  return (
    <div className="flex-none">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/dashboard")}
            className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full text-slate-600 dark:text-slate-400 transition-colors"
          >
            <ChevronLeft className="w-7 h-7" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-blue-600/10 rounded-xl flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-blue-600" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">
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
          className="bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-black py-4 rounded-[1.5rem] hover:bg-slate-50 dark:hover:bg-slate-700 transition-all flex flex-col items-center justify-center gap-1 shadow-sm disabled:opacity-50 active:scale-95 relative overflow-hidden group"
        >
          <div className="flex items-center gap-2">
            {isCleaning ? (
              <div className="w-4 h-4 border-2 border-slate-900 dark:border-white border-t-transparent rounded-full animate-spin" />
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
          className="bg-blue-600 text-white font-black py-4 rounded-[1.5rem] hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-xl shadow-blue-500/20 active:scale-95 border-b-4 border-blue-800"
        >
          <Plus className="w-6 h-6" /> 
          <span className="text-sm uppercase tracking-tight">Nueva Carga</span>
        </button>
      </div>
    </div>
  );
};
