
import React from 'react';
import { Trash2, Database } from 'lucide-react';
import { SettingsCard, SettingsCardHeader, SettingsButton } from '../common/SettingsElements';
import { toast } from 'sonner';

interface Props {
  theme?: 'dark' | 'light' | 'high-contrast';
}

/**
 * KernelSystemCard - Solo contiene "Limpiar Datos Locales"
 * Las demás funciones (sync, export) están en SyncCenter y Reports
 */
export const KernelSystemCard: React.FC<Props> = ({ theme = 'dark' }) => {
  const handleClearLocalData = () => {
    if (confirm("⚠️ ADVERTENCIA ⚠️\n\nEsto eliminará todos los registros locales (Vencimientos y Eventos). Se volverán a descargar desde la nube en la próxima sincronización.\n\n¿Estás seguro de continuar?")) {
      localStorage.removeItem('logicount_expiry_data');
      localStorage.removeItem('logicount_event_data');
      toast.success('Datos locales eliminados');
      setTimeout(() => window.location.reload(), 1000);
    }
  };

  return (
    <SettingsCard className="border-4" theme={theme}>
      <SettingsCardHeader 
        icon={Database} 
        title="Gestión de Datos & Kernel" 
        subtitle="Operaciones críticas de sincronización"
        color="bg-indigo-500"
        theme={theme}
      />

      <div className="space-y-3">
        <SettingsButton 
          onClick={handleClearLocalData}
          label="Limpiar Datos Locales"
          icon={Trash2}
          variant="danger"
          theme={theme}
        />
      </div>
    </SettingsCard>
  );
};
