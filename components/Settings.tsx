
import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Volume2, VolumeX, Vibrate, Zap, Moon, Sun, Monitor, AlertTriangle, ArrowLeft, Cloud, Key, Database, Lock, Check, Eye, Shield, FileText, Package, AlertOctagon, Activity, CheckCircle, XCircle, Share2, Download, QrCode, Copy, Save, Upload, RefreshCw, Loader2, Speech, Hash, Type, Gauge, BarChart3, Smartphone, LayoutTemplate, Camera, Stethoscope, Trash2, HardDrive, Terminal, Wind } from 'lucide-react';
import * as sessionService from '../services/sessionService'; 
import * as settingsService from '../services/settings';
import * as maintenanceService from '../services/maintenance';
import { createFullBackup, restoreFullBackup } from '../services/backupService';
import { AppSettings, ViewState } from '../types';
import { SoundFX } from '../services/audio';
import { CameraScanner } from './CameraScanner';
import { logger } from '../services/logger';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';

export const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { settings, updateSetting: updateGlobalSetting } = useAppStore(); 
  
  const [appSheetConfig, setAppSheetConfig] = useState(settings.appSheetConfig || { appId: '', accessKey: '', countsTableName: '', productsTableName: '', receptionTableName: '' });
  const [showSaveFeedback, setShowSaveFeedback] = useState(false);
  
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareMode, setShareMode] = useState<'export' | 'import'>('export');
  const [importString, setImportString] = useState('');
  
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  
  const [healthReport, setHealthReport] = useState<maintenanceService.HealthReport | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);
  const [repairLogs, setRepairLogs] = useState<string[]>([]);
  const [showSystemLogs, setShowSystemLogs] = useState(false);
  const [systemLogs, setSystemLogs] = useState<any[]>([]);

  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
      runHealthCheck();
  }, []);

  const runHealthCheck = async () => {
      setIsAnalyzing(true);
      try {
          const report = await maintenanceService.checkSystemHealth();
          setHealthReport(report);
      } catch (e) {
          console.error(e);
      } finally {
          setIsAnalyzing(false);
      }
  };

  const loadSystemLogs = async () => {
      const logs = await logger.getRecent(50);
      setSystemLogs(logs);
      setShowSystemLogs(true);
  };

  const updateSetting = (key: keyof AppSettings, value: any) => {
    updateGlobalSetting(key, value); 

    if (key === 'ttsEnabled' && value === true) {
        SoundFX.speak("Voz activada");
    }
  };

  const availableNavItems: {id: ViewState, label: string}[] = [
      { id: 'dashboard', label: 'Inicio' },
      { id: 'database', label: 'Datos' },
      { id: 'reports', label: 'Historial' },
      { id: 'consolidated', label: 'Consolidados' },
      { id: 'reception', label: 'Recepción' },
      { id: 'conciliator', label: 'Detective' },
      { id: 'sync', label: 'Nube' },
  ];

  const toggleNavOption = (id: ViewState) => {
      let current = settings.mobileNavConfig || ['dashboard', 'database', 'reports'];
      
      if (current.includes(id)) {
          if (current.length <= 1) return;
          current = current.filter(i => i !== id);
      } else {
          if (current.length >= 5) {
              alert("Máximo 5 elementos permitidos en la barra móvil.");
              return;
          }
          current = [...current, id];
      }
      updateSetting('mobileNavConfig', current);
  };

  const handleAppSheetSave = (e: React.FormEvent) => {
      e.preventDefault();
      updateSetting('appSheetConfig', appSheetConfig);
      setShowSaveFeedback(true);
      setTimeout(() => setShowSaveFeedback(false), 3000);
  };

  const handleRepairSystem = async () => {
      if (!confirm("¿Ejecutar optimización de base de datos? Esto eliminará registros huérfanos y limpiará la cola de sincronización.")) return;
      
      setIsRepairing(true);
      setRepairLogs([]);
      try {
        const logs = await maintenanceService.repairSystem();
        setRepairLogs(logs);
        await runHealthCheck(); 
      } catch (e) {
        console.error(e);
      } finally {
        setIsRepairing(false);
      }
  };

  const handleBackup = async () => {
      setIsBackingUp(true);
      try {
          await createFullBackup();
      } catch (e) {
          alert("Error al crear copia de seguridad");
      } finally {
          setIsBackingUp(false);
      }
  };

  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!confirm("⚠️ ADVERTENCIA: Esta acción REEMPLAZARÁ todos los datos actuales con los del archivo de respaldo. ¿Está seguro?")) {
          e.target.value = ''; 
          return;
      }

      setIsRestoring(true);
      try {
          const count = await restoreFullBackup(file);
          alert(`Restauración exitosa. ${count} registros de escaneo recuperados. La aplicación se reiniciará.`);
          window.location.reload();
      } catch (err: any) {
          alert(`Error al restaurar: ${err.message}`);
      } finally {
          setIsRestoring(false);
          e.target.value = ''; 
      }
  };

  const handleHardReset = () => {
    if (confirm("¿Forzar actualización?\n\nEsto recargará la aplicación ignorando el caché del navegador para asegurar que tengas la última versión.")) {
        window.location.href = '/?t=' + Date.now();
    }
  };

  const generateConfigString = () => {
      const json = JSON.stringify(appSheetConfig);
      return `LGC://${btoa(json)}`;
  };

  const handleImportConfig = () => {
      try {
          const raw = importString.trim();
          if (!raw.startsWith('LGC://')) {
              throw new Error("Formato inválido. Debe comenzar con LGC://");
          }
          const base64 = raw.replace('LGC://', '');
          const json = atob(base64);
          const parsed = JSON.parse(json);

          if (!parsed.appId || !parsed.accessKey) {
              throw new Error("La configuración importada parece incompleta.");
          }

          setAppSheetConfig(parsed);
          updateSetting('appSheetConfig', parsed);
          
          alert("¡Configuración importada y guardada exitosamente!");
          setShowShareModal(false);
          setImportString('');
      } catch (e: any) {
          alert(`Error al importar: ${e.message}`);
      }
  };

  const copyToClipboard = () => {
      navigator.clipboard.writeText(generateConfigString());
      alert("Configuración copiada al portapapeles.");
  };

  const formatBytes = (bytes: number) => {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="max-w-3xl mx-auto pb-24 px-4 pt-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-black/5 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <SettingsIcon className="w-6 h-6 text-slate-400" /> Ajustes Globales
            </h1>
        </div>
        <button 
            onClick={() => { setShareMode('export'); setShowShareModal(true); }}
            className="p-2 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors"
            title="Compartir Configuración"
        >
            <Share2 className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-6">
        
        {/* PREFERENCES */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-500" /> Preferencias Operativas
            </h2>
            <div className="space-y-4">
                
                {/* LOW PERFORMANCE MODE */}
                <div className="flex items-center justify-between p-2">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${settings.lowPerformanceMode ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400'}`}>
                            <Wind className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="font-bold text-slate-900">Modo Alto Rendimiento</div>
                            <div className="text-xs text-slate-400">Reduce animaciones y efectos para mayor fluidez</div>
                        </div>
                    </div>
                    <button onClick={() => updateSetting('lowPerformanceMode', !settings.lowPerformanceMode)} className={`w-12 h-6 rounded-full transition-colors relative ${settings.lowPerformanceMode ? 'bg-blue-500' : 'bg-slate-300'}`}>
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.lowPerformanceMode ? 'left-7' : 'left-1'}`} />
                    </button>
                </div>

                {/* AUTO REGISTER UNKNOWN */}
                <div className="flex items-center justify-between p-2">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${settings.autoRegisterUnknown ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-400'}`}>
                            <Zap className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="font-bold text-slate-900">Registro Rápido (Desconocidos)</div>
                            <div className="text-xs text-slate-400">Guardar items nuevos sin preguntar</div>
                        </div>
                    </div>
                    <button onClick={() => updateSetting('autoRegisterUnknown', !settings.autoRegisterUnknown)} className={`w-12 h-6 rounded-full transition-colors relative ${settings.autoRegisterUnknown ? 'bg-orange-500' : 'bg-slate-300'}`}>
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.autoRegisterUnknown ? 'left-7' : 'left-1'}`} />
                    </button>
                </div>

                <div className="flex items-center justify-between p-2">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${settings.soundEnabled ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'}`}>
                            {settings.soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                        </div>
                        <div className="font-bold text-slate-900">Sonido</div>
                    </div>
                    <button onClick={() => updateSetting('soundEnabled', !settings.soundEnabled)} className={`w-12 h-6 rounded-full transition-colors relative ${settings.soundEnabled ? 'bg-green-500' : 'bg-slate-300'}`}>
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.soundEnabled ? 'left-7' : 'left-1'}`} />
                    </button>
                </div>
                
                <div className="border border-slate-100 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${settings.ttsEnabled ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-400'}`}>
                                <Speech className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="font-bold text-slate-900">Asistente de Voz</div>
                                <div className="text-xs text-slate-400">Confirmación auditiva</div>
                            </div>
                        </div>
                        <button onClick={() => updateSetting('ttsEnabled', !settings.ttsEnabled)} className={`w-12 h-6 rounded-full transition-colors relative ${settings.ttsEnabled ? 'bg-purple-500' : 'bg-slate-300'}`}>
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.ttsEnabled ? 'left-7' : 'left-1'}`} />
                        </button>
                    </div>

                    {settings.ttsEnabled && (
                        <div className="grid grid-cols-2 gap-2 mt-2 pl-12 animate-in fade-in slide-in-from-top-2">
                            <button 
                                onClick={() => updateSetting('ttsMode', 'count')}
                                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${settings.ttsMode === 'count' ? 'bg-purple-50 border-purple-300 text-purple-700' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}
                            >
                                <Hash className="w-5 h-5" />
                                <span className="text-xs font-bold">Contador (1, 2...)</span>
                            </button>
                            <button 
                                onClick={() => updateSetting('ttsMode', 'product')}
                                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${settings.ttsMode === 'product' ? 'bg-purple-50 border-purple-300 text-purple-700' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}
                            >
                                <Type className="w-5 h-5" />
                                <span className="text-xs font-bold">Leer Nombre</span>
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-between p-2">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${settings.controlTowerEnabled ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-400'}`}>
                            <BarChart3 className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="font-bold text-slate-900">Torre de Control</div>
                            <div className="text-xs text-slate-400">Mostrar métricas en inicio</div>
                        </div>
                    </div>
                    <button onClick={() => updateSetting('controlTowerEnabled', !settings.controlTowerEnabled)} className={`w-12 h-6 rounded-full transition-colors relative ${settings.controlTowerEnabled ? 'bg-indigo-500' : 'bg-slate-300'}`}>
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.controlTowerEnabled ? 'left-7' : 'left-1'}`} />
                    </button>
                </div>

                <div className="flex items-center justify-between p-2">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${settings.speedometerEnabled ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400'}`}>
                            <Gauge className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="font-bold text-slate-900">Velocímetro</div>
                            <div className="text-xs text-slate-400">Mostrar items por minuto</div>
                        </div>
                    </div>
                    <button onClick={() => updateSetting('speedometerEnabled', !settings.speedometerEnabled)} className={`w-12 h-6 rounded-full transition-colors relative ${settings.speedometerEnabled ? 'bg-blue-500' : 'bg-slate-300'}`}>
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.speedometerEnabled ? 'left-7' : 'left-1'}`} />
                    </button>
                </div>

                <div className="flex items-center justify-between p-2">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${settings.confirmDelete ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                            <AlertTriangle className="w-5 h-5" />
                        </div>
                        <div className="font-bold text-slate-900">Confirmar Eliminación</div>
                    </div>
                    <button onClick={() => updateSetting('confirmDelete', !settings.confirmDelete)} className={`w-12 h-6 rounded-full transition-colors relative ${settings.confirmDelete ? 'bg-blue-500' : 'bg-slate-300'}`}>
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.confirmDelete ? 'left-7' : 'left-1'}`} />
                    </button>
                </div>
            </div>
        </section>

        {/* REST OF SECTIONS REMAIN THE SAME */}
        <section className={`rounded-2xl border p-6 transition-all ${healthReport?.status === 'warning' || healthReport?.status === 'critical' ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className="flex justify-between items-start mb-4">
                <h2 className={`text-lg font-bold flex items-center gap-2 ${healthReport?.status === 'healthy' ? 'text-slate-900' : 'text-amber-900'}`}>
                    <Stethoscope className="w-5 h-5 text-emerald-600" /> Diagnóstico del Sistema
                </h2>
                <div className="flex gap-2">
                    <button onClick={loadSystemLogs} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors" title="Ver Logs">
                        <Terminal className="w-4 h-4 text-slate-500" />
                    </button>
                    <button onClick={runHealthCheck} className="p-2 bg-white/50 rounded-full hover:bg-white transition-colors" disabled={isAnalyzing}>
                        {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin text-slate-500"/> : <RefreshCw className="w-4 h-4 text-slate-500"/>}
                    </button>
                </div>
            </div>

            {healthReport && (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white/60 p-3 rounded-xl border border-black/5">
                            <div className="text-xs text-slate-500 font-bold uppercase mb-1">Registros Totales</div>
                            <div className="text-xl font-black text-slate-800">{healthReport.totalRecords}</div>
                        </div>
                        <div className="bg-white/60 p-3 rounded-xl border border-black/5">
                            <div className="text-xs text-slate-500 font-bold uppercase mb-1">Uso de Disco</div>
                            <div className="text-xl font-black text-slate-800 flex items-center gap-2">
                                <HardDrive className="w-4 h-4 text-slate-400" /> {formatBytes(healthReport.storageUsage)}
                            </div>
                        </div>
                    </div>

                    {(healthReport.orphanScans > 0 || healthReport.stuckSyncJobs > 0 || healthReport.corruptProducts > 0) ? (
                        <div className="bg-white p-4 rounded-xl border border-amber-100 shadow-sm">
                            <h3 className="text-sm font-bold text-amber-800 mb-2 flex items-center gap-2"><AlertTriangle className="w-4 h-4"/> Problemas Detectados</h3>
                            <ul className="text-xs text-amber-700 space-y-1 list-disc pl-4">
                                {healthReport.orphanScans > 0 && <li><strong>{healthReport.orphanScans}</strong> registros de escaneo huérfanos (basura).</li>}
                                {healthReport.stuckSyncJobs > 0 && <li><strong>{healthReport.stuckSyncJobs}</strong> trabajos de subida atascados.</li>}
                                {healthReport.corruptProducts > 0 && <li><strong>{healthReport.corruptProducts}</strong> productos corruptos.</li>}
                            </ul>
                            
                            <button 
                                onClick={handleRepairSystem}
                                disabled={isRepairing}
                                className="w-full mt-3 bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 rounded-lg text-xs flex items-center justify-center gap-2 transition-colors shadow-sm"
                            >
                                {isRepairing ? <Loader2 className="w-3 h-3 animate-spin"/> : <Trash2 className="w-3 h-3" />}
                                Ejecutar Reparación Automática
                            </button>
                        </div>
                    ) : (
                        <div className="bg-emerald-50 text-emerald-800 text-xs font-bold p-3 rounded-xl border border-emerald-100 flex items-center gap-2">
                            <CheckCircle className="w-4 h-4" /> Base de datos saludable y optimizada.
                        </div>
                    )}
                </div>
            )}
        </section>

        {/* Rest of the settings file... */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Sun className="w-5 h-5 text-blue-500" /> Apariencia
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <button onClick={() => updateSetting('theme', 'light')} className={`p-4 rounded-xl border-2 text-left transition-all ${settings.theme === 'light' ? 'border-blue-500 bg-blue-50' : 'border-slate-100 hover:border-slate-300'}`}>
                    <div className="font-bold text-slate-900">Modo Claro</div>
                </button>
                <button onClick={() => updateSetting('theme', 'dark')} className={`p-4 rounded-xl border-2 text-left transition-all ${settings.theme === 'dark' ? 'border-blue-500 bg-slate-800' : 'border-slate-100 hover:border-slate-300 bg-slate-900'}`}>
                    <div className="font-bold text-white">Modo Oscuro</div>
                </button>
                <button onClick={() => updateSetting('theme', 'warm')} className={`p-4 rounded-xl border-2 text-left transition-all ${settings.theme === 'warm' ? 'border-orange-400 bg-[#fff8ed]' : 'border-slate-100 hover:border-slate-300 bg-[#fcf8f2]'}`}>
                    <div className="font-bold text-[#57534e]">Confort</div>
                </button>
                <button onClick={() => updateSetting('theme', 'navy')} className={`p-4 rounded-xl border-2 text-left transition-all ${settings.theme === 'navy' ? 'border-indigo-500 bg-[#1e293b]' : 'border-slate-100 hover:border-slate-300 bg-[#0f172a]'}`}>
                    <div className="font-bold text-slate-200">Navy Pro</div>
                </button>
                <button onClick={() => updateSetting('theme', 'contrast')} className={`p-4 rounded-xl border-2 text-left transition-all ${settings.theme === 'contrast' ? 'border-yellow-400 bg-black' : 'border-slate-100 hover:border-slate-300 bg-black'}`}>
                    <div className="font-bold text-yellow-400">Contraste</div>
                </button>
            </div>
        </section>
      </div>

      {showSystemLogs && (
            <div className="fixed inset-0 z-[80] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
                <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl flex flex-col h-[80vh]">
                    <div className="p-4 border-b flex justify-between items-center bg-slate-50 rounded-t-3xl">
                        <h3 className="font-bold flex items-center gap-2 text-slate-800"><Terminal className="w-5 h-5" /> Logs del Sistema (Últimos 50)</h3>
                        <button onClick={() => setShowSystemLogs(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500"><XCircle className="w-6 h-6"/></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 bg-slate-900 font-mono text-xs">
                        {systemLogs.length === 0 ? (
                            <div className="text-slate-500 italic">No hay logs registrados.</div>
                        ) : (
                            systemLogs.map((log, i) => (
                                <div key={i} className="mb-2 border-b border-slate-800 pb-2">
                                    <div className="flex gap-2 mb-1">
                                        <span className="text-slate-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                                        <span className={`font-bold ${log.level === 'error' ? 'text-red-400' : log.level === 'warn' ? 'text-amber-400' : 'text-blue-400'}`}>[{log.level.toUpperCase()}]</span>
                                        <span className="text-slate-300 font-bold">{log.module}</span>
                                    </div>
                                    <div className="text-slate-300 pl-14">{log.message}</div>
                                    {log.details && <div className="text-slate-500 pl-14 mt-1 break-all">{log.details}</div>}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        )}

      {showShareModal && (
          <div className="fixed inset-0 z-[70] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
              <div className="w-full max-w-md bg-white rounded-3xl p-6 relative shadow-2xl animate-in zoom-in-95">
                  <button onClick={() => setShowShareModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-2"><XCircle className="w-6 h-6"/></button>
                  
                  {shareMode === 'export' ? (
                      <div className="text-center">
                          <div className="mx-auto w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
                              <QrCode className="w-6 h-6" />
                          </div>
                          <h3 className="text-xl font-bold text-slate-900 mb-2">Exportar Configuración</h3>
                          <p className="text-sm text-slate-500 mb-6">Escanea este código desde el otro dispositivo para transferir las llaves de acceso.</p>
                          
                          <div className="bg-white p-4 rounded-xl border-2 border-slate-100 inline-block mb-6">
                            <img 
                                src={`https://quickchart.io/qr?text=${encodeURIComponent(generateConfigString())}&size=200`} 
                                alt="Config QR" 
                                className="w-48 h-48 mix-blend-multiply"
                            />
                          </div>
                          
                          <div className="relative">
                              <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">O copia este texto</label>
                              <div className="flex gap-2">
                                  <input readOnly value={generateConfigString()} className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono text-slate-500" />
                                  <button onClick={copyToClipboard} className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700"><Copy className="w-4 h-4"/></button>
                              </div>
                          </div>
                      </div>
                  ) : (
                      <div className="text-center">
                          <div className="mx-auto w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-4">
                              <Download className="w-6 h-6" />
                          </div>
                          <h3 className="text-xl font-bold text-slate-900 mb-2">Importar Configuración</h3>
                          <p className="text-sm text-slate-500 mb-6">Pega el código de configuración aquí o usa tu escáner físico sobre el código QR del otro dispositivo.</p>
                          
                          <div className="flex gap-2 mb-6">
                              <input 
                                autoFocus
                                placeholder="Escanea o pega LGC://..." 
                                value={importString}
                                onChange={(e) => setImportString(e.target.value)}
                                className="flex-1 bg-slate-50 border-2 border-slate-200 rounded-xl p-4 text-sm font-mono focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                              />
                              <button 
                                onClick={() => setIsCameraOpen(true)}
                                className="aspect-square bg-slate-100 border-2 border-slate-200 text-slate-600 hover:bg-slate-200 hover:text-slate-900 rounded-xl flex items-center justify-center transition-colors px-4"
                                title="Escanear QR con Cámara"
                              >
                                <Camera className="w-6 h-6" />
                              </button>
                          </div>
                          
                          <button onClick={handleImportConfig} disabled={!importString} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50">
                              Cargar Configuración
                          </button>
                      </div>
                  )}
              </div>
          </div>
      )}

      {isCameraOpen && (
          <CameraScanner 
              onScan={(code) => {
                  setImportString(code);
                  setIsCameraOpen(false);
              }} 
              onClose={() => setIsCameraOpen(false)}
          />
      )}
    </div>
  );
};
