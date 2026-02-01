
import React from 'react';
import { ScanLine, Database, Radio, Zap, History, Settings, Gauge, UserCircle } from 'lucide-react';
import { useDashboard } from '../hooks/useDashboard';
import { IndustrialButton } from './common/IndustrialButton';

const Dashboard: React.FC = () => {
  const { stats, operatorId, isSyncNeeded, isEnteringMartillo, handleEnterMartillo, navigate } = useDashboard();

  // Botón Principal rediseñado para usar variables CSS
  const MainButton = ({ onClick, icon: Icon, title, sub, loading, variant = 'default' }: any) => (
    <button 
        onClick={onClick}
        disabled={loading}
        className={`
            w-full h-32 flex items-center px-6 gap-6 transition-all active:translate-y-1 
            border-b-[6px] border-app-border overflow-hidden relative disabled:opacity-50 rounded-app-lg shadow-xl group
            ${variant === 'primary' ? 'bg-app-accent text-white' : 'bg-app-surface text-app-text border-2'}
        `}
    >
        <div className={`p-5 border-2 border-app-border shrink-0 rounded-app transition-transform group-hover:scale-110 ${variant === 'primary' ? 'bg-black/20' : 'bg-app-main'}`}>
            <Icon className="w-10 h-10" />
        </div>
        <div className="text-left flex-1 min-w-0">
            <h2 className="text-2xl font-black uppercase italic leading-none tracking-tighter truncate">{title}</h2>
            <div className="flex items-center gap-2 mt-2">
                <div className={`w-1.5 h-1.5 rounded-full ${variant === 'primary' ? 'bg-white/40' : 'bg-app-accent'} led-active`}></div>
                <span className={`text-[8px] font-bold uppercase tracking-[0.2em] truncate ${variant === 'primary' ? 'text-white/60' : 'text-app-muted'}`}>{sub}</span>
            </div>
        </div>
    </button>
  );

  return (
    <div className="h-full w-full bg-app-main overflow-y-auto no-scrollbar pb-32">
      
      <header className="px-6 py-6 border-b-4 border-app-border bg-app-surface/90 flex justify-between items-center sticky top-0 z-50 backdrop-blur-md">
          <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2 mb-1">
                  <UserCircle className="w-3.5 h-3.5 text-app-accent" />
                  <span className="text-[9px] font-black text-app-muted tracking-widest uppercase truncate">{operatorId}</span>
              </div>
              <h1 className="text-2xl font-black text-app-text italic tracking-tighter uppercase leading-none truncate">PANEL_DE_CONTROL</h1>
          </div>
          
          <div className="flex flex-col items-end shrink-0 gap-2">
              <div className="bg-app-main border border-app-border px-3 py-1.5 rounded-app flex items-center gap-2 shadow-inner">
                  <Gauge className="w-3 h-3 text-app-accent" />
                  <span className="text-[10px] font-black text-app-text tabular-nums tracking-widest">{stats.scansToday || 0}</span>
                  <span className="text-[6px] font-black text-app-muted uppercase opacity-60">Picks</span>
              </div>
          </div>
      </header>

      <div className="p-4 max-w-4xl mx-auto space-y-6 pt-6">
        
        <div className="grid grid-cols-1 gap-4">
            <MainButton 
                onClick={() => navigate('/reports?create=true')}
                icon={ScanLine}
                title="Nueva_Carga"
                sub="INICIAR CONTEO AHORA"
                variant="default"
            />
            <div className="relative">
                <MainButton 
                    onClick={handleEnterMartillo}
                    icon={Zap}
                    title="Modo_Martillo"
                    sub="AUDITORIA_RAPIDA"
                    loading={isEnteringMartillo}
                    variant="primary"
                />
                <button 
                    onClick={(e) => { e.stopPropagation(); navigate('/reports?type=hammer'); }}
                    className="absolute -top-2 -right-2 bg-app-card border-2 border-app-border p-3 rounded-app text-app-muted hover:text-app-accent hover:border-app-accent transition-all shadow-xl z-20 active:scale-90"
                >
                    <History className="w-5 h-5" />
                </button>
            </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
            <button onClick={() => navigate('/database')} className="h-32 bg-app-surface border-4 border-app-border flex flex-col items-center justify-center gap-3 active:bg-app-accent/10 transition-all group rounded-app-lg">
                <div className="p-4 bg-app-main rounded-app border border-app-border group-active:border-app-accent">
                    <Database className="w-7 h-7 text-app-accent" />
                </div>
                <span className="text-[8px] font-black uppercase tracking-[0.3em] text-app-muted">Catalogo_SKU</span>
            </button>
            <button onClick={() => navigate('/sync')} className={`h-32 border-4 flex flex-col items-center justify-center gap-3 transition-all rounded-app-lg ${isSyncNeeded ? 'bg-amber-600 border-amber-800 text-white' : 'bg-app-surface border-app-border text-app-muted'}`}>
                <div className={`p-4 rounded-app border ${isSyncNeeded ? 'bg-white/10 border-white/20' : 'bg-app-main border-app-border'}`}>
                    <Radio className={`w-7 h-7 ${isSyncNeeded ? 'text-white' : 'text-app-muted'}`} />
                </div>
                <span className="text-[8px] font-black uppercase tracking-[0.3em]">{isSyncNeeded ? 'Sincronizar' : 'Cloud_Link'}</span>
            </button>
        </div>

        <button 
            onClick={() => navigate('/settings')}
            className="w-full py-4 rounded-app border-2 border-app-border bg-app-main text-app-muted flex items-center justify-center gap-2 hover:text-app-text hover:border-app-text transition-all"
        >
            <Settings className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">Config_Sistema</span>
        </button>
      </div>
    </div>
  );
};

export default Dashboard;
