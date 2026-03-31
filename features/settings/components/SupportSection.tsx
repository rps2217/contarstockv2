
import React, { useState } from 'react';
import { RefreshCw, LogOut, Trash2, Terminal } from 'lucide-react';
import { SettingsSection, SettingsButton } from './common/SettingsElements';
import { DiagnosticsCard } from './support/DiagnosticsCard';
import { MaintenanceCard } from './support/MaintenanceCard';
import { BackupCard } from './support/BackupCard';
import { UnitTestsCard } from './support/UnitTestsCard';
import { SystemLogsModal } from './support/SystemLogsModal';
import { SoundFX } from '../../../services/audio';

 export const SupportSection: React.FC = () => {
 const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);
 
 const handleKernelReset = () => {
  if(confirm("⚠️ REINICIAR KERNEL ⚠️\nSe limpiará el caché de la aplicación y se recargarán las nuevas características.\n\n¿Confirmar?")) {
  SoundFX.play('success');
  localStorage.clear();
  sessionStorage.clear();
  if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
  for (const registration of registrations) {
  registration.unregister();
  }
  });
  }
  window.location.href = '/?v=' + Date.now();
  }
  };

 const handleSoftUpdate = () => {
 SoundFX.play('success');
 sessionStorage.clear();
 window.location.href = '/?v=' + Date.now();
 };

 const handleLogout = () => {
 if(confirm("¿Cerrar sesión operativa?")) {
 localStorage.removeItem('logicount_auth');
 window.location.href='/';
 }
 };

 const handleMasterReset = () => {
 if(confirm("⚠️ DESTRUCCIÓN TOTAL ⚠️\nAcción irreversible. Se borrarán productos, bultos y ajustes.\n\n¿Confirmar?")) {
 localStorage.clear();
 window.location.href='/';
 }
 };

 return (
 <SettingsSection title="Kernel & Soporte">
 
 <DiagnosticsCard />

 <UnitTestsCard />

 <MaintenanceCard />

 <BackupCard />

 <div className="space-y-3">
 <SettingsButton 
 onClick={() => setIsLogsModalOpen(true)} 
 label="Ver Logs del Sistema" 
 icon={Terminal} 
 variant="outline" 
 />
 <div className="grid grid-cols-2 gap-3">
 <SettingsButton 
 onClick={handleSoftUpdate} 
 label="Refrescar Interfaz" 
 icon={RefreshCw} 
 variant="outline" 
 />
 <SettingsButton 
 onClick={handleKernelReset} 
 label="Reiniciar Kernel" 
 icon={RefreshCw} 
 variant="dark" 
 />
 </div>
 
 <div className="grid grid-cols-2 gap-3">
 <SettingsButton 
 onClick={handleLogout} 
 label="Cerrar Sesión" 
 icon={LogOut} 
 variant="outline" 
 />
 <SettingsButton 
 onClick={handleMasterReset} 
 label="Master Reset" 
 icon={Trash2} 
 variant="danger" 
 />
 </div>
 </div>
 <SystemLogsModal isOpen={isLogsModalOpen} onClose={() => setIsLogsModalOpen(false)} />
 </SettingsSection>
 );
};
