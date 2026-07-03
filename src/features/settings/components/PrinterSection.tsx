
import React, { useState, useEffect } from 'react';
import { Printer, Wifi, Usb, CheckCircle2, AlertTriangle, RefreshCw, Zap } from 'lucide-react';
import { thermalPrinter } from '../../../services/thermalPrinterService';
import { AppSettings } from '../../../types';

interface Props {
  settings: AppSettings;
  updateSetting: (key: keyof AppSettings, value: any) => void;
  theme?: 'dark' | 'light' | 'gray' | 'high-contrast' | 'appsheet-dark' | 'night';
}

export const PrinterSection: React.FC<Props> = ({ settings, updateSetting, theme = 'dark' }) => {
  const [isConnected, setIsConnected] = useState(thermalPrinter.isConnected());
  const [isConnecting, setIsConnecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isDark = (theme as unknown) === 'dark' || (theme as unknown) === 'night' || (theme as unknown) === 'high-contrast' || (theme as unknown) === 'appsheet-dark' || (theme as unknown) === 'gray';
  const isLight = theme === 'light';
  const isHighContrast = theme === 'high-contrast';

  // Clases según tema
  const cardBg = isHighContrast ? 'bg-black border-yellow-400' : isLight ? 'bg-white border-black' : 'bg-surface border-white/5';
  const headerText = isHighContrast ? 'text-yellow-400' : isLight ? 'text-slate-900' : 'text-white';
  const subtitleText = isHighContrast ? 'text-yellow-500' : 'text-muted';
  const dotConnected = isHighContrast ? 'bg-yellow-400' : 'bg-emerald-500';
  const dotDisconnected = 'bg-rose-500';
  const successBg = isHighContrast ? 'bg-yellow-900/20 border-yellow-400/30' : isLight ? 'bg-emerald-50 border-emerald-100' : 'bg-emerald-500/10 border-emerald-500/20';
  const successText = isHighContrast ? 'text-yellow-400' : isLight ? 'text-emerald-800' : 'text-emerald-400';
  const successSubtext = isHighContrast ? 'text-yellow-500' : isLight ? 'text-emerald-600' : 'text-emerald-500';
  const btnPrimary = isHighContrast ? 'bg-yellow-400 text-black hover:bg-yellow-300' : isLight ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white';
  const btnSecondary = isHighContrast ? 'bg-yellow-900/20 text-yellow-400 border border-yellow-400/30' : isLight ? 'bg-surface text-white' : 'bg-surface text-white';
  const errorBg = isHighContrast ? 'bg-red-500/20 border-red-500/30' : isLight ? 'bg-rose-50 border-rose-100' : 'bg-rose-500/10 border-rose-500/20';
  const errorText = isHighContrast ? 'text-red-400' : isLight ? 'text-rose-800' : 'text-rose-400';
  const errorSubtext = isHighContrast ? 'text-red-500' : isLight ? 'text-rose-600' : 'text-rose-500';
  const noteText = isHighContrast ? 'text-yellow-500' : isLight ? 'text-muted' : 'text-muted';
  const infoBg = isHighContrast ? 'bg-yellow-900/20 border-yellow-400/30' : isLight ? 'bg-blue-50 border-blue-100' : 'bg-blue-500/10 border-blue-500/20';
  const infoText = isHighContrast ? 'text-yellow-400' : isLight ? 'text-blue-800' : 'text-blue-400';

  const handleConnectUSB = async () => {
    setIsConnecting(true);
    setErrorMessage(null);
    try {
      const success = await thermalPrinter.connectUSB();
      setIsConnected(success);
      if (success) {
        updateSetting('thermalPrinter', { 
          ...settings.thermalPrinter, 
          enabled: true, 
          type: 'usb',
          deviceName: thermalPrinter.getDeviceName()
        });
      }
    } catch (err: any) {
      console.warn("Could not connect to USB printer:", err);
      setErrorMessage(err?.message || "Ocurrió un error inesperado al conectar por USB.");
      setIsConnected(false);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleConnectBT = async () => {
    setIsConnecting(true);
    setErrorMessage(null);
    try {
      const success = await thermalPrinter.connectBluetooth();
      setIsConnected(success);
      if (success) {
        updateSetting('thermalPrinter', { 
          ...settings.thermalPrinter, 
          enabled: true, 
          type: 'bluetooth',
          deviceName: thermalPrinter.getDeviceName()
        });
      }
    } catch (err: any) {
      console.warn("Could not connect to Bluetooth printer:", err);
      setErrorMessage(err?.message || "Ocurrió un error inesperado al conectar por Bluetooth.");
      setIsConnected(false);
    } finally {
      setIsConnecting(false);
    }
  };

  const testPrint = async () => {
    if (!isConnected) return;
    try {
      await thermalPrinter.printLabel("TEST-MOBILE", "PRUEBA DESDE ANDROID", 1);
    } catch (e) {
      alert("Error de impresión: Verifique que la impresora esté encendida.");
    }
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-2">
      <div className={`border-4 p-6 rounded-[2.5rem] shadow-xl ${cardBg}`}>
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-2xl ${isHighContrast ? 'bg-yellow-400 text-black' : 'bg-blue-600 text-white'}`}>
              <Printer className="w-6 h-6" />
            </div>
            <div>
              <h2 className={`text-xl font-black uppercase italic ${headerText}`}>Hardware</h2>
              <p className={`text-[10px] font-bold uppercase tracking-widest ${subtitleText}`}>Impresora Sewoo TS400</p>
            </div>
          </div>
          <div className={`w-3 h-3 rounded-full ${isConnected ? dotConnected : dotDisconnected} ${isConnected ? 'led-active' : ''}`}></div>
        </div>

        {isConnected ? (
          <div className="space-y-4">
            <div className={`border-2 p-4 rounded-2xl flex items-center gap-3 ${successBg}`}>
              <CheckCircle2 className={`w-5 h-5 ${isHighContrast ? 'text-yellow-400' : 'text-emerald-600'}`} />
              <div className="flex-1">
                <p className={`text-[10px] font-black uppercase ${successText}`}>Conectado vía {settings.thermalPrinter?.type?.toUpperCase()}</p>
                <p className={`text-xs font-bold ${successSubtext}`}>{settings.thermalPrinter?.deviceName}</p>
              </div>
            </div>
      
            <button 
              onClick={testPrint}
              className={`w-full font-black py-4 rounded-2xl uppercase tracking-widest text-xs active:scale-95 transition-all shadow-lg ${btnSecondary}`}
            >
              Imprimir Prueba
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <button 
              onClick={handleConnectUSB}
              disabled={isConnecting}
              className={`w-full font-black py-5 rounded-[2rem] flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl ${btnSecondary}`}
            >
              {isConnecting && settings.thermalPrinter?.type === 'usb' ? <RefreshCw className="animate-spin" /> : <Usb className="w-6 h-6" />}
              Vincular por USB
            </button>
      
            <button 
              onClick={handleConnectBT}
              disabled={isConnecting}
              className={`w-full font-black py-5 rounded-[2rem] flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl ${btnPrimary}`}
            >
              {isConnecting && settings.thermalPrinter?.type === 'bluetooth' ? <RefreshCw className="animate-spin" /> : <Wifi className="w-6 h-6" />}
              Vincular por Bluetooth
            </button>
      
            <p className={`text-[9px] text-center font-bold uppercase tracking-wide px-4 ${noteText}`}>
              Nota: Android requiere permisos de Ubicación y Bluetooth para detectar la impresora.
            </p>

            {errorMessage && (
              <div className={`border-2 p-4 rounded-2xl flex gap-3 text-left animate-in fade-in slide-in-from-top-1 ${errorBg}`}>
                <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${isHighContrast ? 'text-red-400' : 'text-rose-600'}`} />
                <div className="space-y-1">
                  <p className={`text-[10px] font-black uppercase ${errorText}`}>Fallo de Permisos o Entorno</p>
                  <p className={`text-[11px] font-bold leading-normal ${errorSubtext}`}>{errorMessage}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className={`border-2 p-5 rounded-[2rem] flex gap-4 ${infoBg}`}>
        <Zap className={`w-6 h-6 shrink-0 ${isHighContrast ? 'text-yellow-400' : 'text-blue-600'}`} />
        <p className={`text-[10px] font-bold uppercase leading-relaxed ${infoText}`}>
          Soporte móvil activado. Use <span className="underline italic">Bluetooth</span> para las tablets en bodega y <span className="underline italic">USB</span> para el PC de oficina.
        </p>
      </div>
    </div>
  );
};
