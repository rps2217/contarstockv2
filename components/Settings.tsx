
import React, { useState } from 'react';
import { Settings as SettingsIcon, Volume2, VolumeX, Vibrate, Zap, Moon, Sun, Monitor, AlertTriangle, ArrowLeft, Cloud, Key, Database, Lock, Check, Eye, Shield, FileText, Package, AlertOctagon, Activity, CheckCircle, XCircle, Share2, Download, QrCode, Copy } from 'lucide-react';
import * as storage from '../services/storage';
import * as settingsService from '../services/settings';
import { AppSettings, Theme } from '../types';
import { runSystemDiagnostics } from '../services/businessLogic.test';

interface SettingsProps {
  onBack: () => void;
  onSettingsChanged: (newSettings: AppSettings) => void;
}

export const Settings: React.FC<SettingsProps> = ({ onBack, onSettingsChanged }) => {
  // FIXED: Use settingsService instead of storage for getSettings to avoid circular dependency chain
  const [settings, setSettings] = useState<AppSettings>(settingsService.getSettings());
  const [appSheetConfig, setAppSheetConfig] = useState(settings.appSheetConfig || { appId: '', accessKey: '', countsTableName: '', productsTableName: '' });
  const [showSaveFeedback, setShowSaveFeedback] = useState(false);
  
  // Share/Import State
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareMode, setShareMode] = useState<'export' | 'import'>('export');
  const [importString, setImportString] = useState('');
  
  // Diagnostics State
  const [diagResults, setDiagResults] = useState<{ passed: number, failed: number, logs: string[] } | null>(null);

  const updateSetting = (key: keyof AppSettings, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    settingsService.saveSettings(newSettings);
    onSettingsChanged(newSettings);
  };

  const handleAppSheetSave = (e: React.FormEvent) => {
      e.preventDefault();
      updateSetting('appSheetConfig', appSheetConfig);
      setShowSaveFeedback(true);
      setTimeout(() => setShowSaveFeedback(false), 3000);
  };

  const handleRunDiagnostics = () => {
      const results = runSystemDiagnostics();
      setDiagResults(results);
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
                <div className="grid md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Tabla de Consolidados (Bitácora)</label>
                        <input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm" value={appSheetConfig.countsTableName} onChange={e => setAppSheetConfig({...appSheetConfig, countsTableName: e.target.value})} placeholder="Ej. CONSOLIDADOS" />
                    </div>
                    <div className="md:col-span-2">
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Tabla de Productos (Maestra)</label>
                        <input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm" value={appSheetConfig.productsTableName} onChange={e => setAppSheetConfig({...appSheetConfig, productsTableName: e.target.value})} placeholder="Ej. PRODUCTOS" />
                    </div>
                </div>
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Access Key</label>
                    <input type="password" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono" value={appSheetConfig.accessKey} onChange={e => setAppSheetConfig({...appSheetConfig, accessKey: e.target.value})} placeholder="V2-..." />
                </div>
                <button type="submit" className={`w-full p-3.5 rounded-xl font-bold shadow-md flex justify-center items-center gap-2 ${showSaveFeedback ? 'bg-green-600 text-white' : 'bg-indigo-600 text-white'}`}>
                    {showSaveFeedback ? <Check className="w-4 h-4" /> : <Cloud className="w-4 h-4" />} {showSaveFeedback ? 'Guardado' : 'Guardar Configuración'}
                </button>
            </form>
        </section>

        {/* DIAGNOSTICS */}
        <section className="bg-slate-50 rounded-2xl border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-600" /> Diagnóstico y Mantenimiento
            </h2>
            <p className="text-sm text-slate-500 mb-4">Ejecute pruebas unitarias para verificar la integridad lógica del sistema.</p>
            
            <button onClick={handleRunDiagnostics} className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold py-2 px-4 rounded-lg text-sm shadow-sm transition-colors">
                Ejecutar Pruebas del Sistema v1.0
            </button>

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
