import React, { useState } from 'react';
import { Database, RefreshCw, Zap, Activity, Cloud, CheckCircle2, AlertCircle, UploadCloud, DownloadCloud, Server } from 'lucide-react';
import { configSyncService } from '../../../services/configSyncService';
import { motion } from 'motion/react';
import { AppSettings } from '../../../types';
import { SettingsSection, SettingsCard, SettingsButton } from './common/SettingsElements';
import { SoundFX } from '../../../services/audio';
import { toast } from 'sonner';
import { SyncLogsModal } from './SyncLogsModal';
import { SupabaseAuditorModal } from './SupabaseAuditorModal';
import { useSyncStore } from '../../sync/store/useSyncStore';

interface Props {
  settings: AppSettings;
  updateSetting: (key: keyof AppSettings, value: any) => void;
}

export const CloudSection: React.FC<Props> = ({ settings }) => {
  const [showLogs, setShowLogs] = useState(false);
  const [showAuditor, setShowAuditor] = useState(false);
  const [isSyncingConfig, setIsSyncingConfig] = useState(false);
  
  const { latencyMs, pendingItems, isSupabaseConnected, isSyncing } = useSyncStore();

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
      <SettingsSection title="Infraestructura Cloud (Supabase)">
        <SettingsCard className="bg-slate-900 border-indigo-500/30 text-white">
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-indigo-600 rounded-[1.5rem] shadow-lg shadow-indigo-900/40">
                <Cloud className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-black uppercase italic tracking-tighter leading-none">Estado de la Nube</h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2">Conexión Directa a Postgres Engine</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Estado de Conexión */}
              <div className="p-4 bg-black/40 rounded-2xl border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${isSupabaseConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Servicio</p>
                    <p className="text-xs font-bold text-white uppercase tracking-tighter">
                      {isSupabaseConnected ? 'Supabase Conectado' : 'Sin Conexión'}
                    </p>
                  </div>
                </div>
                {isSupabaseConnected ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <AlertCircle className="w-5 h-5 text-rose-500" />}
              </div>

              {/* Latencia */}
              <div className="p-4 bg-black/40 rounded-2xl border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Activity className={`w-5 h-5 ${latencyMs && latencyMs < 200 ? 'text-emerald-400' : 'text-amber-400'}`} />
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Latencia</p>
                    <p className="text-xs font-bold text-white uppercase tracking-tighter">
                      {latencyMs ? `${latencyMs} ms` : '--'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Pendientes */}
              <div className="p-4 bg-black/40 rounded-2xl border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Database className="w-5 h-5 text-blue-400" />
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Cola de Subida</p>
                    <p className="text-xs font-bold text-white uppercase tracking-tighter">
                      {pendingItems} Registros Locales
                    </p>
                  </div>
                </div>
              </div>

              {/* Sincronización */}
              <div className="p-4 bg-black/40 rounded-2xl border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <RefreshCw className={`w-5 h-5 text-indigo-400 ${isSyncing ? 'animate-spin' : ''}`} />
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Sincronización</p>
                    <p className="text-xs font-bold text-white uppercase tracking-tighter">
                      {isSyncing ? 'En Progreso...' : 'En Reposo'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-4 border-t border-white/5">
              <SettingsButton 
                onClick={handlePushConfig}
                isLoading={isSyncingConfig}
                label={isSyncingConfig ? "Respaldando..." : "Respaldar Plantillas/Esquemas"}
                icon={UploadCloud}
                variant="secondary"
                className="bg-blue-500/10 border-blue-500/30 text-blue-400 h-14"
              />
              <SettingsButton 
                onClick={handlePullConfig}
                isLoading={isSyncingConfig}
                label={isSyncingConfig ? "Restaurando..." : "Restaurar Plantillas/Esquemas"}
                icon={DownloadCloud}
                variant="secondary"
                className="bg-emerald-500/10 border-emerald-500/30 text-emerald-400 h-14"
              />
              <SettingsButton 
                onClick={() => setShowLogs(true)}
                label="Ver Logs de Sincronización"
                icon={Activity}
                variant="secondary"
                className="bg-slate-800 border-indigo-500/10 text-indigo-400 h-14"
              />
              <SettingsButton 
                onClick={() => setShowAuditor(true)}
                label="Auditar Esquemas y Tablas"
                icon={Server}
                variant="secondary"
                className="bg-indigo-500/10 border-indigo-500/30 text-white h-14 font-black"
              />
            </div>
          </div>
        </SettingsCard>
      </SettingsSection>

      <SyncLogsModal isOpen={showLogs} onClose={() => setShowLogs(false)} />
      <SupabaseAuditorModal isOpen={showAuditor} onClose={() => setShowAuditor(false)} />
    </div>
  );
};

