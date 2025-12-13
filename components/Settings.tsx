
import React, { useState } from 'react';
import { Settings as SettingsIcon, Volume2, VolumeX, Vibrate, Zap, Moon, Sun, Monitor, AlertTriangle, ArrowLeft, Cloud, Key, Database, Lock, Check, Eye, Shield, FileText, Package, AlertOctagon, Activity, CheckCircle, XCircle, Share2, Download, QrCode, Copy, Save, Upload, RefreshCw, Loader2, Speech, Hash, Type, Gauge, BarChart3 } from 'lucide-react';
import * as storage from '../services/storage';
import * as settingsService from '../services/settings';
import { createFullBackup, restoreFullBackup } from '../services/backupService';
import { AppSettings, Theme } from '../types';
import { runSystemDiagnostics } from '../services/businessLogic.test';
import { SoundFX } from '../services/audio';

interface SettingsProps {
  onBack: () => void;
  onSettingsChanged: (newSettings: AppSettings) => void;
}

export const Settings: React.FC<SettingsProps> = ({ onBack, onSettingsChanged }) => {
  // FIXED: Use settingsService instead of storage for getSettings to avoid circular dependency chain
  const [settings, setSettings] = useState<AppSettings>(settingsService.getSettings());
  const [appSheetConfig, setAppSheetConfig] = useState(settings.appSheetConfig || { appId: '', accessKey: '', countsTableName: '', productsTableName: '', receptionTableName: '' });
  const [showSaveFeedback, setShowSaveFeedback] = useState(false);
  
  // Share/Import State
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareMode, setShareMode] = useState<'export' | 'import'>('export');
  const [importString, setImportString] = useState('');
  
  // Diagnostics State
  const [diagResults, setDiagResults] = useState<{ passed: number, failed: number, logs: string[] } | null>(null);
  const [isRunningDiag, setIsRunningDiag] = useState(false);

  // Backup State
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const updateSetting = (key: keyof AppSettings, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    settingsService.saveSettings(newSettings);
    onSettingsChanged(newSettings);

    if (key === 'ttsEnabled' && value === true) {
        SoundFX.speak("Voz activada");
    }
  };

  const handleAppSheetSave = (e: React.FormEvent) => {
      e.preventDefault();
      updateSetting('appSheetConfig', appSheetConfig);
      setShowSaveFeedback(true);
      setTimeout(() => setShowSaveFeedback(false), 3000);
  };

  const handleRunDiagnostics = async () => {
      setIsRunningDiag(true);
      setDiagResults(null);
      try {
        const results = await runSystemDiagnostics();
        setDiagResults(results);
      } catch (e) {
        console.error(e);
      } finally {
        setIsRunningDiag(false);
      }
  };

  // --- BACKUP HANDLERS ---
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
          e.target.value = ''; // Reset input
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
          e.target.value = ''; // Reset
      }
  };

  // --- HARD RESET HANDLER ---
  const handleHardReset = () => {
    if (confirm("¿Forzar actualización?\n\nEsto recargará la aplicación ignorando el caché del navegador para asegurar que tengas la última versión.")) {
        // Cache busting reload technique
        window.location.href = '/?t=' + Date.now();
    }
  };

  // --- SHARE LOGIC ---
  const generateConfigString = () => {
      const json = JSON.stringify(appSheetConfig);
      // Encode to Base64 to make it scanner friendly and URL safe
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

          // Basic Validation
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

  return (
    <div className="max-w-3xl mx-auto pb-24 px-4 pt-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      
      <div className="flex items-center gap-3 mb-8">
        <button onClick={onBack} className="p-2 hover:bg-black/5 rounded-full transition-colors">
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
        
        {/* APPEARANCE */}
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

        {/* PREFERENCES */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-500" /> Preferencias Operativas
            </h2>
            <div className="space-y-4">
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
                
                {/* TTS Toggle */}
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

                    {/* TTS MODE SELECTION (Visible only if enabled) */}
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

                {/* Control Tower Toggle */}
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

                {/* Speedometer Toggle */}
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

        {/* DATA SECURITY */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-600" /> Seguridad de Datos
            </h2>
            <p className="text-sm text-slate-500 mb-4">Gestione copias de seguridad locales para evitar pérdida de datos.</p>
            
            <div className="flex flex-col gap-3">
                <button 
                    onClick={handleBackup}
                    disabled={isBackingUp}
                    className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition-colors border border-slate-200"
                >
                    {isBackingUp ? <div className="w-4 h-4 border-2 border-slate-600 border-t-transparent rounded-full animate-spin"></div> : <Save className="w-4 h-4" />}
                    Crear Copia de Seguridad
                </button>
                
                <label className={`w-full flex items-center justify-center gap-2 bg-white hover:bg-emerald-50 text-emerald-700 font-bold py-3 rounded-xl transition-colors border-2 border-dashed border-emerald-200 cursor-pointer ${isRestoring ? 'opacity-50 pointer-events-none' : ''}`}>
                    {isRestoring ? <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div> : <Upload className="w-4 h-4" />}
                    {isRestoring ? 'Restaurando...' : 'Restaurar desde Copia'}
                    <input type="file" accept=".json" onChange={handleRestoreFile} className="hidden" disabled={isRestoring} />
                </label>
            </div>
        </section>

        {/* APPSHEET */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Cloud className="w-5 h-5 text-indigo-500" /> Integración AppSheet
                </h2>
                <div className="flex gap-2">
                     <button 
                        onClick={() => { setShareMode('import'); setShowShareModal(true); }}
                        className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 hover:bg-indigo-100"
                     >
                        Importar
                     </button>
                     <button 
                        onClick={() => { setShareMode('export'); setShowShareModal(true); }}
                        className="text-xs font-bold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100"
                     >
                        Exportar
                     </button>
                </div>
            </div>
            
            <form onSubmit={handleAppSheetSave} className="space-y-4">
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">App ID</label>
                    <input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono" value={appSheetConfig.appId} onChange={e => setAppSheetConfig({...appSheetConfig, appId: e.target.value})} placeholder="xxxxxxxx..." />
                </div>
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Access Key</label>
                    <input type="password" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono" value={appSheetConfig.accessKey} onChange={e => setAppSheetConfig({...appSheetConfig, accessKey: e.target.value})} placeholder="V2-..." />
                </div>
                
                {/* Tables Grid */}
                <div className="grid md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                    <div className="md:col-span-2">
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Tabla de Conteos (Bitácora)</label>
                        <input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm" value={appSheetConfig.countsTableName} onChange={e => setAppSheetConfig({...appSheetConfig, countsTableName: e.target.value})} placeholder="Ej. CONSOLIDADOS" />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Tabla de Productos</label>
                        <input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm" value={appSheetConfig.productsTableName} onChange={e => setAppSheetConfig({...appSheetConfig, productsTableName: e.target.value})} placeholder="Ej. PRODUCTOS" />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-indigo-500 uppercase mb-1.5 block">Tabla de Recepción (Check-in)</label>
                        <input className="w-full p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-sm" value={appSheetConfig.receptionTableName || ''} onChange={e => setAppSheetConfig({...appSheetConfig, receptionTableName: e.target.value})} placeholder="Ej. BITACORA_RECEPCION" />
                    </div>
                </div>

                <button type="submit" className={`w-full p-3.5 rounded-xl font-bold shadow-md flex justify-center items-center gap-2 ${showSaveFeedback ? 'bg-green-600 text-white' : 'bg-indigo-600 text-white'}`}>
                    {showSaveFeedback ? <Check className="w-4 h-4" /> : <Cloud className="w-4 h-4" />} {showSaveFeedback ? 'Guardado' : 'Guardar Configuración'}
                </button>
            </form>
        </section>

        {/* DIAGNOSTICS & MAINTENANCE */}
        <section className="bg-slate-50 rounded-2xl border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-600" /> Diagnóstico y Mantenimiento
            </h2>
            <p className="text-sm text-slate-500 mb-4">Herramientas para verificar integridad y actualizar la aplicación.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button 
                    onClick={handleRunDiagnostics} 
                    disabled={isRunningDiag}
                    className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold py-3 px-4 rounded-xl text-sm shadow-sm transition-colors flex items-center justify-center gap-2"
                >
                    {isRunningDiag ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />} 
                    Ejecutar Pruebas
                </button>
                <button onClick={handleHardReset} className="bg-white border border-red-200 text-red-600 hover:bg-red-50 font-bold py-3 px-4 rounded-xl text-sm shadow-sm transition-colors flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4" /> Forzar Actualización
                </button>
            </div>

            {diagResults && (
                <div className="mt-4 bg-white p-4 rounded-xl border border-slate-200 animate-in fade-in">
                    <div className="flex gap-4 mb-2">
                        <span className="text-green-600 font-bold flex items-center gap-1"><CheckCircle className="w-4 h-4"/> Pasaron: {diagResults.passed}</span>
                        <span className="text-red-600 font-bold flex items-center gap-1"><XCircle className="w-4 h-4"/> Fallaron: {diagResults.failed}</span>
                    </div>
                    <ul className="text-xs font-mono bg-slate-900 text-slate-300 p-3 rounded-lg space-y-1">
                        {diagResults.logs.map((log, i) => (
                            <li key={i}>{log}</li>
                        ))}
                    </ul>
                </div>
            )}
        </section>

      </div>

      {/* MODAL SHARE */}
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
                          
                          <input 
                            autoFocus
                            placeholder="Escanea o pega LGC://..." 
                            value={importString}
                            onChange={(e) => setImportString(e.target.value)}
                            className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-4 text-sm font-mono focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all mb-6"
                          />
                          
                          <button onClick={handleImportConfig} disabled={!importString} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50">
                              Cargar Configuración
                          </button>
                      </div>
                  )}
              </div>
          </div>
      )}

    </div>
  );
};
