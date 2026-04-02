import React, { useState } from 'react';
import { Database, RefreshCw, Zap, Activity, Cloud, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { AppSettings } from '../../../types';
import { SettingsSection, SettingsCard, SettingsButton } from './common/SettingsElements';
import { LoadTestService, LoadTestResult } from '../../../services/loadTestService';
import { SoundFX } from '../../../services/audio';
import { toast } from 'sonner';
import { SyncLogsModal } from './SyncLogsModal';
import { useSyncStore } from '../../../store/useSyncStore';

interface Props {
  settings: AppSettings;
  updateSetting: (key: keyof AppSettings, value: any) => void;
}

export const CloudSection: React.FC<Props> = ({ settings }) => {
  const [showLogs, setShowLogs] = useState(false);
  const [isTestingLoad, setIsTestingLoad] = useState(false);
  const [testResult, setTestResult] = useState<LoadTestResult | null>(null);
  
  const { latencyMs, pendingItems, isFirestoreConnected, isSyncing } = useSyncStore();

  const handleRunLoadTest = async () => {
    setIsTestingLoad(true);
    setTestResult(null);
    try {
      const result = await LoadTestService.runReceptionLoadTest(50);
      setTestResult(result);
      if (result.success) {
        SoundFX.play('success');
        toast.success(`Test exitoso: ${result.totalRecords} registros en ${result.totalTimeMs}ms`);
      } else {
        SoundFX.play('error');
        toast.error(`Test fallido: ${result.error}`);
      }
    } catch (e) {
      SoundFX.play('error');
      toast.error("Error inesperado en el test de carga");
    } finally {
      setIsTestingLoad(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <SettingsSection title="Infraestructura Cloud (Firebase)">
        <SettingsCard className="bg-slate-900 border-indigo-500/30 text-white">
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-indigo-600 rounded-[1.5rem] shadow-lg shadow-indigo-900/40">
                <Cloud className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-black uppercase italic tracking-tighter leading-none">Estado de la Nube</h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2">Conexión Directa a Firestore</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Estado de Conexión */}
              <div className="p-4 bg-black/40 rounded-2xl border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${isFirestoreConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Servicio</p>
                    <p className="text-xs font-bold text-white uppercase tracking-tighter">
                      {isFirestoreConnected ? 'Firestore Conectado' : 'Sin Conexión'}
                    </p>
                  </div>
                </div>
                {isFirestoreConnected ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <AlertCircle className="w-5 h-5 text-rose-500" />}
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
                onClick={() => setShowLogs(true)}
                label="Ver Logs de Sincronización"
                icon={Activity}
                variant="secondary"
                className="bg-slate-800 border-indigo-500/20 text-indigo-400 h-14"
              />
              <SettingsButton 
                onClick={handleRunLoadTest}
                isLoading={isTestingLoad}
                label={isTestingLoad ? "Ejecutando Test..." : "Test de Carga Firestore"}
                icon={Zap}
                variant="secondary"
                className="bg-amber-500/10 border-amber-500/30 text-amber-500 h-14"
              />
            </div>

            {testResult && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 bg-black/60 border border-white/10 rounded-2xl space-y-2"
              >
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                  <span className="text-slate-500">Registros Procesados:</span>
                  <span className="text-white">{testResult.totalRecords}</span>
                </div>
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                  <span className="text-slate-500">Tiempo Total:</span>
                  <span className="text-amber-400">{testResult.totalTimeMs}ms</span>
                </div>
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                  <span className="text-slate-500">Promedio por Registro:</span>
                  <span className="text-emerald-400">{testResult.avgTimePerRecordMs}ms</span>
                </div>
              </motion.div>
            )}
          </div>
        </SettingsCard>
      </SettingsSection>

      <SyncLogsModal isOpen={showLogs} onClose={() => setShowLogs(false)} />
    </div>
  );
};
