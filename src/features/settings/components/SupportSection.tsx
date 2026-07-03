
import React, { useState } from 'react';
import { LogOut, Trash2, Terminal } from 'lucide-react';
import { SettingsSection, SettingsButton } from './common/SettingsElements';
import { DiagnosticsCard } from './support/DiagnosticsCard';
import { MaintenanceCard } from './support/MaintenanceCard';
import { BackupCard } from './support/BackupCard';
import { KernelSystemCard } from './support/KernelSystemCard';
import { SystemLogsModal } from './support/SystemLogsModal';

interface Props {
  theme?: 'dark' | 'light' | 'gray' | 'high-contrast' | 'appsheet-dark' | 'night';
}

export const SupportSection: React.FC<Props> = ({ theme = 'dark' }) => {
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);
  
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
    <SettingsSection title="Kernel & Soporte" theme={theme}>
      <DiagnosticsCard theme={theme} />
      <MaintenanceCard theme={theme} />
      <KernelSystemCard theme={theme} />
      <BackupCard theme={theme} />

      <div className="space-y-3">
        <SettingsButton 
          onClick={() => setIsLogsModalOpen(true)} 
          label="Ver Logs del Sistema" 
          icon={Terminal} 
          variant="outline" 
          theme={theme}
        />
        
        <div className="grid grid-cols-2 gap-3">
          <SettingsButton 
            onClick={handleLogout} 
            label="Cerrar Sesión" 
            icon={LogOut} 
            variant="outline" 
            theme={theme}
          />
          <SettingsButton 
            onClick={handleMasterReset} 
            label="Master Reset" 
            icon={Trash2} 
            variant="danger" 
            theme={theme}
          />
        </div>
      </div>
      <SystemLogsModal isOpen={isLogsModalOpen} onClose={() => setIsLogsModalOpen(false)} theme={theme} />
    </SettingsSection>
  );
};
