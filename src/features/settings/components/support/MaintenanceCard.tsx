
import React, { useState, useEffect } from 'react';
import { Activity, Bug, Snowflake } from 'lucide-react';
import { SettingsCard, SettingsCardHeader, SettingsButton } from '../common/SettingsElements';
import { checkSystemHealth, repairSystem, purgeOldData, HealthReport } from '../../../../services/maintenance';

interface Props {
  theme?: 'dark' | 'light' | 'high-contrast';
}

export const MaintenanceCard: React.FC<Props> = ({ theme = 'dark' }) => {
  const [health, setHealth] = useState<HealthReport | null>(null);
  const [isRepairing, setIsRepairing] = useState(false);
  const [isPurging, setIsPurging] = useState(false);

  const isDark = theme === 'dark' || theme === 'night' || theme === 'high-contrast' || theme === 'appsheet-dark';
  const isLight = theme === 'light';
  const isHighContrast = theme === 'high-contrast';

  // Clases según tema
  const cardBg = isHighContrast ? 'bg-black border-yellow-400' : isLight ? 'bg-white border-slate-100' : 'bg-surface border-white/5';
  const cardText = isHighContrast ? 'text-yellow-400' : isLight ? 'text-slate-900' : 'text-white';
  const statBg = isHighContrast ? 'bg-yellow-900/20 border-yellow-400/30' : isLight ? 'bg-slate-50 border-slate-100' : 'bg-black/40 border-white/5';
  const statLabel = isHighContrast ? 'text-yellow-500' : isLight ? 'text-muted' : 'text-muted';
  const statValue = isHighContrast ? 'text-yellow-400' : isLight ? 'text-slate-900' : 'text-white';
  const badgeHealthy = isHighContrast ? 'bg-yellow-400/20 text-yellow-400' : isLight ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-100 text-emerald-700';
  const badgeAlert = isHighContrast ? 'bg-yellow-400/20 text-yellow-400' : isLight ? 'bg-amber-100 text-amber-700' : 'bg-amber-100 text-amber-700';

  const loadHealth = async () => setHealth(await checkSystemHealth());
  
  useEffect(() => { loadHealth(); }, []);

  const handleRepair = async () => {
    setIsRepairing(true);
    await repairSystem();
    await loadHealth();
    setIsRepairing(false);
  };

  const handlePurge = async () => {
    if (confirm("❄️ ARCHIVADO EN FRÍO\nSe eliminarán sesiones completadas hace más de 30 días de la memoria local.\n\nLos datos seguirán seguros en la nube.\n\n¿Continuar?")) {
      setIsPurging(true);
      await purgeOldData(30);
      await loadHealth();
      setIsPurging(false);
    }
  };

  return (
    <SettingsCard className={`border-4 ${cardBg}`} theme={theme}>
      <SettingsCardHeader 
        icon={Activity} 
        title="Salud Local" 
        subtitle="Estado de Base de Datos"
        color="bg-blue-500"
        theme={theme}
      >
        <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${health?.status === 'healthy' ? badgeHealthy : badgeAlert}`}>
          {health?.status === 'healthy' ? 'Estable' : 'Alerta'}
        </div>
      </SettingsCardHeader>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className={`p-4 rounded-2xl text-center border ${statBg}`}>
          <div className={`text-[8px] font-black uppercase mb-1 ${statLabel}`}>Total Registros</div>
          <div className={`text-2xl font-black tabular-nums ${statValue}`}>{health?.totalRecords || 0}</div>
        </div>
        <div className={`p-4 rounded-2xl text-center border ${statBg}`}>
          <div className={`text-[8px] font-black uppercase mb-1 ${statLabel}`}>Tamaño Estimado</div>
          <div className={`text-2xl font-black tabular-nums ${statValue}`}>{((health?.storageUsage || 0) / 1024 / 1024).toFixed(1)}<span className="text-xs">M</span></div>
        </div>
      </div>

      <div className="space-y-3">
        <SettingsButton 
          onClick={handleRepair}
          isLoading={isRepairing}
          label="Limpieza Estructural"
          icon={Bug}
          variant="outline"
          theme={theme}
        />

        <SettingsButton 
          onClick={handlePurge}
          isLoading={isPurging}
          label="Archivado Automático (30d)"
          icon={Snowflake}
          variant="outline"
          theme={theme}
        />
      </div>
    </SettingsCard>
  );
};
