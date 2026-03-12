
import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff } from 'lucide-react';

export const NetworkStatus: React.FC = () => {
 const [isOnline, setIsOnline] = useState(navigator.onLine);
 const [showBackOnline, setShowBackOnline] = useState(false);

 useEffect(() => {
 const handleOnline = () => {
 setIsOnline(true);
 setShowBackOnline(true);
 setTimeout(() => setShowBackOnline(false), 3000);
 };

 const handleOffline = () => {
 setIsOnline(false);
 setShowBackOnline(false);
 };

 window.addEventListener('online', handleOnline);
 window.addEventListener('offline', handleOffline);

 return () => {
 window.removeEventListener('online', handleOnline);
 window.removeEventListener('offline', handleOffline);
 };
 }, []);

 if (!isOnline) {
 return (
 <div className="fixed top-0 left-0 right-0 z-[100] bg-red-600 text-white px-4 py-1 text-xs font-bold text-center shadow-md animate-in slide-in-from-top-full flex items-center justify-center gap-2">
 <WifiOff className="w-3 h-3" />
 MODO OFFLINE - Trabajando en local
 </div>
 );
 }

 if (showBackOnline) {
 return (
 <div className="fixed top-0 left-0 right-0 z-[100] bg-emerald-600 text-white px-4 py-1 text-xs font-bold text-center shadow-md animate-in slide-in-from-top-full fade-out duration-1000 flex items-center justify-center gap-2">
 <Wifi className="w-3 h-3" />
 CONEXIÓN RESTAURADA
 </div>
 );
 }

 return null;
};
