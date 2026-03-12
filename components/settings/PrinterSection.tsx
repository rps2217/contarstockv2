
import React, { useState, useEffect } from 'react';
import { Printer, Wifi, Usb, CheckCircle2, AlertTriangle, RefreshCw, Zap } from 'lucide-react';
import { thermalPrinter } from '../../services/thermalPrinterService';
import { AppSettings } from '../../types';

interface Props {
 settings: AppSettings;
 updateSetting: (key: keyof AppSettings, value: any) => void;
}

export const PrinterSection: React.FC<Props> = ({ settings, updateSetting }) => {
 const [isConnected, setIsConnected] = useState(thermalPrinter.isConnected());
 const [isConnecting, setIsConnecting] = useState(false);

 const handleConnectUSB = async () => {
 setIsConnecting(true);
 const success = await thermalPrinter.connectUSB();
 setIsConnected(success);
 setIsConnecting(false);
 if (success) {
 updateSetting('thermalPrinter', { 
 ...settings.thermalPrinter, 
 enabled: true, 
 type: 'usb',
 deviceName: thermalPrinter.getDeviceName()
 });
 }
 };

 const handleConnectBT = async () => {
 setIsConnecting(true);
 const success = await thermalPrinter.connectBluetooth();
 setIsConnected(success);
 setIsConnecting(false);
 if (success) {
 updateSetting('thermalPrinter', { 
 ...settings.thermalPrinter, 
 enabled: true, 
 type: 'bluetooth',
 deviceName: thermalPrinter.getDeviceName()
 });
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
 <div className="bg-white dark:bg-slate-900 border-4 border-black p-6 rounded-[2.5rem] shadow-xl">
 <div className="flex items-center justify-between mb-8">
 <div className="flex items-center gap-3">
 <div className="bg-blue-600 p-3 rounded-2xl text-white">
 <Printer className="w-6 h-6" />
 </div>
 <div>
 <h2 className="text-xl font-black uppercase italic">Hardware</h2>
 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Impresora Sewoo TS400</p>
 </div>
 </div>
 <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-emerald-500 led-active' : 'bg-rose-500'}`}></div>
 </div>

 {isConnected ? (
 <div className="space-y-4">
 <div className="bg-emerald-50 border-2 border-emerald-100 p-4 rounded-2xl flex items-center gap-3">
 <CheckCircle2 className="text-emerald-600 w-5 h-5" />
 <div className="flex-1">
 <p className="text-[10px] font-black text-emerald-800 uppercase">Conectado vía {settings.thermalPrinter?.type.toUpperCase()}</p>
 <p className="text-xs font-bold text-emerald-600">{settings.thermalPrinter?.deviceName}</p>
 </div>
 </div>
 
 <button 
 onClick={testPrint}
 className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl uppercase tracking-widest text-xs active:scale-95 transition-all shadow-lg"
 >
 Imprimir Prueba
 </button>
 </div>
 ) : (
 <div className="space-y-3">
 <button 
 onClick={handleConnectUSB}
 disabled={isConnecting}
 className="w-full bg-slate-900 text-white font-black py-5 rounded-[2rem] flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl"
 >
 {isConnecting && settings.thermalPrinter?.type === 'usb' ? <RefreshCw className="animate-spin" /> : <Usb className="w-6 h-6" />}
 Vincular por USB
 </button>
 
 <button 
 onClick={handleConnectBT}
 disabled={isConnecting}
 className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-5 rounded-[2rem] flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl"
 >
 {isConnecting && settings.thermalPrinter?.type === 'bluetooth' ? <RefreshCw className="animate-spin" /> : <Wifi className="w-6 h-6" />}
 Vincular por Bluetooth
 </button>
 
 <p className="text-[9px] text-center text-slate-400 font-bold uppercase tracking-wide px-4">
 Nota: Android requiere permisos de Ubicación y Bluetooth para detectar la impresora.
 </p>
 </div>
 )}
 </div>

 <div className="bg-blue-50 border-2 border-blue-100 p-5 rounded-[2rem] flex gap-4">
 <Zap className="w-6 h-6 text-blue-600 shrink-0" />
 <p className="text-[10px] text-blue-800 font-bold uppercase leading-relaxed">
 Soporte móvil activado. Use <span className="underline italic">Bluetooth</span> para las tablets en bodega y <span className="underline italic">USB</span> para el PC de oficina.
 </p>
 </div>
 </div>
 );
};
