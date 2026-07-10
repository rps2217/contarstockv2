import React, { useState } from 'react';
import { Database, RefreshCw, Zap, Activity, Cloud, CheckCircle2, AlertCircle, UploadCloud, DownloadCloud, Server } from 'lucide-react';
import { configSyncService } from '../../../services/configSyncService';
import { AppSettings } from '../../../types';
import { SettingsSection, SettingsCard, SettingsButton } from './common/SettingsElements';
import { SoundFX } from '../../../services/audio';
import { toast } from 'sonner';
import { SyncLogsModal } from './SyncLogsModal';
import { SupabaseAuditorModal } from './SupabaseAuditorModal';
import { useSyncStore } from '@/stores';

interface Props {
  settings: AppSettings;
  updateSetting: (key: keyof AppSettings, value: any) => void;
  theme?: 'dark' | 'light' | 'gray' | 'high-contrast' | 'appsheet-dark' | 'night';
}

export const CloudSection: React.FC<Props> = ({ settings, theme = 'dark' }) => {
  const [showLogs, setShowLogs] = useState(false);
  const [showAuditor, setShowAuditor] = useState(false);
  const [isSyncingConfig, setIsSyncingConfig] = useState(false);
  
  const { latencyMs, pendingItems, isSupabaseConnected, isSyncing } = useSyncStore();

  const isDark = (theme as unknown) === 'dark' || (theme as unknown) === 'night' || (theme as unknown) === 'high-contrast' || (theme as unknown) === 'appsheet-dark' || (theme as unknown) === 'gray';
  const isLight = theme === 'light';
  const isHighContrast = theme === 'high-contrast';

  // Clases según tema
  const cardBg = isHighContrast ? 'bg-black border-yellow-400' : isLight ? 'bg-white border-indigo-200' : 'bg-surface border-indigo-500/30';
  const cardText = isHighContrast ? 'text-yellow-400' : isLight ? 'text-slate-900' : 'text-white';
  const accentBg = isHighContrast ? 'bg-yellow-900/30' : isLight ? 'bg-indigo-50' : 'bg-indigo-600';
  const headerText = isHighContrast ? 'text-yellow-400' : isLight ? 'text-slate-700' : 'text-muted';
  const subText = isHighContrast ? 'text-yellow-500' : isLight ? 'text-slate-500' : 'text-muted';
  
  const subCardBg = isHighContrast ? 'bg-yellow-900/20 border-yellow-400/30' : isLight ? 'bg-slate-50 border-slate-200' : 'bg-black/40 border-white/5';
  const subCardBorder = isHighContrast ? 'border-yellow-400/30' : isLight ? 'border-slate-100' : 'border-white/5';
  const mainBorder = isHighContrast ? 'border-yellow-400/30' : isLight ? 'border-slate-200' : 'border-white/5';

  const handlePushConfig = async () => {
    if (!isSupabaseConnected) {
      toast.error("Sin conexión a Supabase");
      return;
    }
    setIsSyncingConfig(true);
    try {
      await configSyncService.pushSettings();
      SoundFX.play('success');
      toast.success("Configuración y plantillas respaldadas");
    } catch (e) {
      SoundFX.play('error');
      toast.error("Error al respaldar configuración");
    } finally {
      setIsSyncingConfig(false);
    }
  };

  const handlePullConfig = async () => {
    if (!isSupabaseConnected) {
      toast.error("Sin conexión a Supabase");
      return;
    }
    setIsSyncingConfig(true);
    try {
      const success = await configSyncService.pullSettings();
      if (success) {
        SoundFX.play('success');
        toast.success("Configuración restaurada. Reiniciando...");
        setTimeout(() => window.location.reload(), 1500);
      } else {
        toast.info("No se encontró configuración previa");
      }
    } catch (e) {
      SoundFX.play('error');
      toast.error("Error al restaurar configuración");
    } finally {
      setIsSyncingConfig(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <SettingsSection title="Infraestructura Cloud (Supabase)" theme={theme}>
        <SettingsCard className={`${cardBg} ${cardText}`} theme={theme}>
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className={`p-4 rounded-[1.5rem] shadow-lg ${accentBg}`}>
                <Cloud className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className={`text-xl font-black uppercase italic tracking-tighter leading-none ${isHighContrast ? 'text-yellow-400' : isLight ? 'text-slate-900' : 'text-white'}`}>Estado de la Nube</h3>
                <p className={`text-[9px] font-bold uppercase tracking-widest mt-2 ${subText}`}>Conexión Directa a Postgres Engine</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Estado de Conexión */}
              <div className={`p-4 rounded-2xl border flex items-center justify-between ${subCardBg} ${subCardBorder}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${isSupabaseConnected ? (isHighContrast ? 'bg-yellow-400 animate-pulse' : 'bg-emerald-500 animate-pulse') : 'bg-rose-500'}`} />
                  <div>
                    <p className={`text-[10px] font-black uppercase tracking-widest ${subText}`}>Servicio</p>
                    <p className={`text-xs font-bold uppercase tracking-tighter ${cardText}`}>
                      {isSupabaseConnected ? 'Supabase Conectado' : 'Sin Conexión'}
                    </p>
                  </div>
                </div>
                {isSupabaseConnected 
                  ? <CheckCircle2 className={`w-5 h-5 ${isHighContrast ? 'text-yellow-400' : 'text-emerald-500'}`} /> 
                  : <AlertCircle className="w-5 h-5 text-rose-500" />
                }
              </div>

              {/* Latencia */}
              <div className={`p-4 rounded-2xl border flex items-center justify-between ${subCardBg} ${subCardBorder}`}>
                <div className="flex items-center gap-3">
                  <Activity className={`w-5 h-5 ${latencyMs && latencyMs < 200 ? (isHighContrast ? 'text-yellow-400' : 'text-emerald-400') : 'text-amber-400'}`} />
                  <div>
                    <p className={`text-[10px] font-black uppercase tracking-widest ${subText}`}>Latencia</p>
                    <p className={`text-xs font-bold uppercase tracking-tighter ${cardText}`}>
                      {latencyMs ? `${latencyMs} ms` : '--'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Pendientes */}
              <div className={`p-4 rounded-2xl border flex items-center justify-between ${subCardBg} ${subCardBorder}`}>
                <div className="flex items-center gap-3">
                  <Database className={`w-5 h-5 ${isHighContrast ? 'text-yellow-400' : 'text-blue-400'}`} />
                  <div>
                    <p className={`text-[10px] font-black uppercase tracking-widest ${subText}`}>Cola de Subida</p>
                    <p className={`text-xs font-bold uppercase tracking-tighter ${cardText}`}>
                      {pendingItems} Registros Locales
                    </p>
                  </div>
                </div>
              </div>

              {/* Sincronización */}
              <div className={`p-4 rounded-2xl border flex items-center justify-between ${subCardBg} ${subCardBorder}`}>
                <div className="flex items-center gap-3">
                  <RefreshCw className={`w-5 h-5 ${isHighContrast ? 'text-yellow-400' : 'text-indigo-400'} ${isSyncing ? 'animate-spin' : ''}`} />
                  <div>
                    <p className={`text-[10px] font-black uppercase tracking-widest ${subText}`}>Sincronización</p>
                    <p className={`text-xs font-bold uppercase tracking-tighter ${cardText}`}>
                      {isSyncing ? 'En Progreso...' : 'En Reposo'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className={`grid grid-cols-1 md:grid-cols-2 gap-3 pt-4 border-t ${mainBorder}`}>
              <SettingsButton 
                onClick={handlePushConfig}
                isLoading={isSyncingConfig}
                label={isSyncingConfig ? "Respaldando..." : "Respaldar Plantillas/Esquemas"}
                icon={UploadCloud}
                variant="outline"
                theme={theme}
                className={`${isHighContrast ? 'bg-yellow-900/20 border-yellow-400/50 text-yellow-400' : isLight ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-blue-500/10 border-blue-500/30 text-blue-400'} h-14`}
              />
              <SettingsButton 
                onClick={handlePullConfig}
                isLoading={isSyncingConfig}
                label={isSyncingConfig ? "Restaurando..." : "Restaurar Plantillas/Esquemas"}
                icon={DownloadCloud}
                variant="outline"
                theme={theme}
                className={`${isHighContrast ? 'bg-yellow-900/20 border-yellow-400/50 text-yellow-400' : isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'} h-14`}
              />
              <SettingsButton 
                onClick={() => setShowLogs(true)}
                label="Ver Logs de Sincronización"
                icon={Activity}
                variant="outline"
                theme={theme}
                className={`${isHighContrast ? 'bg-yellow-900/20 border-yellow-400/50 text-yellow-400' : isLight ? 'bg-slate-100 border-slate-200 text-slate-600' : 'bg-elevated border-indigo-500/10 text-indigo-400'} h-14`}
              />
              <SettingsButton 
                onClick={() => setShowAuditor(true)}
                label="Auditar Esquemas y Tablas"
                icon={Server}
                variant="outline"
                theme={theme}
                className={`${isHighContrast ? 'bg-yellow-400 text-black border-yellow-600' : isLight ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-indigo-500/10 border-indigo-500/30 text-white'} h-14 font-black`}
              />
            </div>
          </div>
        </SettingsCard>
      </SettingsSection>

      <SyncLogsModal isOpen={showLogs} onClose={() => setShowLogs(false)} theme={theme} />
      <SupabaseAuditorModal isOpen={showAuditor} onClose={() => setShowAuditor(false)} theme={theme} />
    </div>
  );
};
