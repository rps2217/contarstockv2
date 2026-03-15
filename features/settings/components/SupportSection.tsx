
import React from 'react';
import { RefreshCw, LogOut, Trash2 } from 'lucide-react';
import { SettingsSection, SettingsButton } from './common/SettingsElements';
import { DiagnosticsCard } from './support/DiagnosticsCard';
import { MaintenanceCard } from './support/MaintenanceCard';
import { BackupCard } from './support/BackupCard';
import { UnitTestsCard } from './support/UnitTestsCard';
import { SoundFX } from '../../../services/audio';

export const SupportSection: React.FC = () => {
 
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
 onClick={handleSoftUpdate} 
 label="Refrescar Interfaz" 
 icon={RefreshCw} 
 variant="dark" 
 />
 
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
 </SettingsSection>
 );
};
