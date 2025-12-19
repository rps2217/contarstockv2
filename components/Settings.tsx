
import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, ArrowLeft, Cloud, Key, Save, Share2, 
  Sun, Moon, Monitor, XCircle, QrCode, Copy, Camera
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { AppSettings } from '../types';

// Atómicos
import { OperationalSection } from './settings/OperationalSection';
import { NavigationSection } from './settings/NavigationSection';
import { SupportSection } from './settings/SupportSection';
import { CameraScanner } from './CameraScanner';

export const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { settings, updateSetting } = useAppStore(); 
  
  const [appSheetConfig, setAppSheetConfig] = useState(settings.appSheetConfig || { appId: '', accessKey: '', countsTableName: '', productsTableName: '', receptionTableName: '' });
  const [showSaveFeedback, setShowSaveFeedback] = useState(false);
  
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareMode, setShareMode] = useState<'export' | 'import'>('export');
  const [importString, setImportString] = useState('');
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  const handleAppSheetSave = (e: React.FormEvent) => {
      e.preventDefault();
      updateSetting('appSheetConfig', appSheetConfig);
      setShowSaveFeedback(true);
      setTimeout(() => setShowSaveFeedback(false), 3000);
  };

  const handleImportConfig = () => {
      try {
          const raw = importString.trim();
          if (!raw.startsWith('LGC://')) throw new Error("Formato inválido.");
          const json = atob(raw.replace('LGC://', ''));
          const parsed = JSON.parse(json);
          setAppSheetConfig(parsed);
          updateSetting('appSheetConfig', parsed);
          alert("Configuración importada!");
          setShowShareModal(false);
      } catch (e: any) { alert(`Error: ${e.message}`); }
  };

  return (
    <div className="max-w-3xl mx-auto pb-24 px-4 pt-6 animate-in fade-in duration-300">
      
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-black/5 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2 text-slate-800">
                <SettingsIcon className="w-6 h-6 text-slate-400" /> Ajustes Globales
            </h1>
        </div>
        <button onClick={() => { setShareMode('export'); setShowShareModal(true); }} className="p-2 bg-blue-50 text-blue-600 rounded-full">
            <Share2 className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-6">
        
        {/* MODULO 1: OPERACIONAL (Capa aislada) */}
        <OperationalSection settings={settings} updateSetting={updateSetting} />

        {/* MODULO 2: NAVEGACION (Capa aislada) */}
        <NavigationSection settings={settings} updateSetting={updateSetting} />

        {/* MODULO 3: CLOUD SYNC (Integrado en el padre por ahora, fácil de extraer luego) */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Cloud className="w-5 h-5 text-indigo-600" /> AppSheet Cloud Sync
            </h2>
            <form onSubmit={handleAppSheetSave} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block ml-1">App ID</label>
                        <input value={appSheetConfig.appId} onChange={(e) => setAppSheetConfig({...appSheetConfig, appId: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-mono outline-none" placeholder="xxxx-xxxx" />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block ml-1">Access Key</label>
                        <input type="password" value={appSheetConfig.accessKey} onChange={(e) => setAppSheetConfig({...appSheetConfig, accessKey: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-mono outline-none" placeholder="••••••••" />
                    </div>
                </div>
                <button type="submit" className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2">
                    <Save className="w-4 h-4" /> {showSaveFeedback ? 'Guardado ✓' : 'Guardar Cloud'}
                </button>
            </form>
        </section>

        {/* MODULO 4: SOPORTE Y BACKUP (Capa aislada) */}
        <SupportSection />

        {/* MODULO 5: APARIENCIA */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Sun className="w-5 h-5 text-blue-500" /> Apariencia
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {['light', 'dark', 'warm', 'navy', 'contrast'].map(t => (
                    <button key={t} onClick={() => updateSetting('theme', t)} className={`p-3 rounded-xl border-2 text-xs font-bold capitalize ${settings.theme === t ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-100'}`}>
                        {t}
                    </button>
                ))}
            </div>
        </section>
      </div>

      {/* MODALES DE COMPARTIR */}
      {showShareModal && (
          <div className="fixed inset-0 z-[70] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="w-full max-w-md bg-white rounded-3xl p-6 relative">
                  <button onClick={() => setShowShareModal(false)} className="absolute top-4 right-4 text-slate-400"><XCircle /></button>
                  {shareMode === 'export' ? (
                      <div className="text-center">
                          <QrCode className="w-12 h-12 mx-auto mb-4 text-blue-600" />
                          <h3 className="font-bold mb-4">Exportar Configuración</h3>
                          <div className="bg-slate-50 p-4 rounded-xl border mb-4">
                              <img src={`https://quickchart.io/qr?text=${encodeURIComponent('LGC://' + btoa(JSON.stringify(appSheetConfig)))}&size=200`} className="mx-auto" />
                          </div>
                          <button onClick={() => { navigator.clipboard.writeText('LGC://' + btoa(JSON.stringify(appSheetConfig))); alert("Copiado"); }} className="flex items-center gap-2 mx-auto text-blue-600 font-bold"><Copy className="w-4 h-4" /> Copiar texto</button>
                      </div>
                  ) : (
                      <div className="text-center">
                          <h3 className="font-bold mb-4">Importar Configuración</h3>
                          <div className="flex gap-2 mb-4">
                              <input value={importString} onChange={(e) => setImportString(e.target.value)} className="flex-1 border p-3 rounded-xl text-xs font-mono" placeholder="LGC://..." />
                              <button onClick={() => setIsCameraOpen(true)} className="p-3 bg-slate-100 rounded-xl"><Camera /></button>
                          </div>
                          <button onClick={handleImportConfig} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold">Cargar</button>
                      </div>
                  )}
              </div>
          </div>
      )}

      {isCameraOpen && <CameraScanner onScan={(c) => { setImportString(c); setIsCameraOpen(false); }} onClose={() => setIsCameraOpen(false)} />}
    </div>
  );
};
