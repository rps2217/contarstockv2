
import React, { useEffect, useState } from 'react';
import { Download, X, Share } from 'lucide-react';

export const InstallPrompt: React.FC = () => {
 const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
 const [showIOSPrompt, setShowIOSPrompt] = useState(false);
 const [isVisible, setIsVisible] = useState(false);

 useEffect(() => {
 // 1. Check if already installed
 if (window.matchMedia('(display-mode: standalone)').matches) {
 return; 
 }

 // 2. iOS Detection
 const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
 if (isIOS) {
 // Show iOS prompt only if not in standalone mode
 setShowIOSPrompt(true);
 }

 // 3. Android/Chrome Event
 const handler = (e: Event) => {
 e.preventDefault();
 setDeferredPrompt(e);
 setIsVisible(true);
 };

 window.addEventListener('beforeinstallprompt', handler);

 return () => window.removeEventListener('beforeinstallprompt', handler);
 }, []);

 const handleInstallClick = async () => {
 if (!deferredPrompt) return;
 deferredPrompt.prompt();
 const { outcome } = await deferredPrompt.userChoice;
 if (outcome === 'accepted') {
 setDeferredPrompt(null);
 setIsVisible(false);
 }
 };

 if (showIOSPrompt) {
 // Simple Toast for iOS users
 return (
 <div className="fixed bottom-0 left-0 right-0 p-4 z-[100] animate-in slide-in-from-bottom-full duration-500 pointer-events-none">
 <div className="bg-slate-900/90 text-white p-4 rounded-2xl shadow-2xl border border-slate-700 pointer-events-auto relative max-w-sm mx-auto">
 <button onClick={() => setShowIOSPrompt(false)} className="absolute top-2 right-2 p-1 text-slate-400 hover:text-white"><X className="w-4 h-4"/></button>
 <div className="flex items-start gap-3">
 <div className="bg-blue-600 p-2 rounded-xl"><Share className="w-6 h-6" /></div>
 <div>
 <h3 className="font-bold text-sm">Instalar App en iPhone</h3>
 <p className="text-xs text-slate-300 mt-1">
 Toca el botón <span className="font-bold text-blue-400">Compartir</span> y selecciona <span className="font-bold text-blue-400">"Agregar a Inicio"</span> para una mejor experiencia.
 </p>
 </div>
 </div>
 </div>
 </div>
 );
 }

 if (!isVisible) return null;

 return (
 <div className="fixed bottom-20 left-4 right-4 z-50 md:bottom-6 md:left-auto md:right-6 md:w-96 animate-in slide-in-from-bottom-4">
 <div className="bg-blue-600 text-white p-4 rounded-2xl shadow-2xl shadow-blue-900/50 flex items-center justify-between gap-4">
 <div className="flex items-center gap-3">
 <div className="bg-white/20 p-2 rounded-xl"><Download className="w-6 h-6" /></div>
 <div>
 <h3 className="font-bold">Instalar Aplicación</h3>
 <p className="text-xs text-blue-100">Acceso rápido y modo offline.</p>
 </div>
 </div>
 <div className="flex gap-2">
 <button onClick={() => setIsVisible(false)} className="p-2 hover:bg-white/10 rounded-lg transition-colors"><X className="w-5 h-5"/></button>
 <button onClick={handleInstallClick} className="bg-white text-blue-600 px-4 py-2 rounded-lg font-bold text-sm shadow-sm active:scale-95 transition-transform">
 Instalar
 </button>
 </div>
 </div>
 </div>
 );
};
