
import React, { useState, useEffect } from 'react';
import { Activity, Bug } from 'lucide-react';
import { SettingsCard, SettingsCardHeader, SettingsButton } from '../common/settings-ui';
import { checkSystemHealth, repairSystem, HealthReport } from '../../../../services/maintenance';

export const MaintenanceCard: React.FC = () => {
 const [health, setHealth] = useState<HealthReport | null>(null);
 const [isRepairing, setIsRepairing] = useState(false);

 const loadHealth = async () => setHealth(await checkSystemHealth());
 
 useEffect(() => { loadHealth(); }, []);

 const handleRepair = async () => {
 setIsRepairing(true);
 await repairSystem();
 await loadHealth();
 setIsRepairing(false);
 };

 return (
 <SettingsCard className="border-4 border-slate-100 dark:border-white/5 bg-white dark:bg-slate-900">
 <SettingsCardHeader 
 icon={Activity} 
 title="Salud Local" 
 subtitle="Estado de Base de Datos"
 color="bg-blue-500"
 >
 <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${health?.status === 'healthy' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
 {health?.status === 'healthy' ? 'Estable' : 'Alerta'}
 </div>
 </SettingsCardHeader>

 <div className="grid grid-cols-2 gap-3 mb-6">
 <div className="bg-slate-50 dark:bg-black/40 p-4 rounded-2xl text-center border border-slate-100 dark:border-white/5">
 <div className="text-[8px] font-black text-slate-400 uppercase mb-1">Total Registros</div>
 <div className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">{health?.totalRecords || 0}</div>
 </div>
 <div className="bg-slate-50 dark:bg-black/40 p-4 rounded-2xl text-center border border-slate-100 dark:border-white/5">
 <div className="text-[8px] font-black text-slate-400 uppercase mb-1">Tamaño Estimado</div>
 <div className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">{((health?.storageUsage || 0) / 1024 / 1024).toFixed(1)}<span className="text-xs">M</span></div>
 </div>
 </div>

 <SettingsButton 
 onClick={handleRepair}
 isLoading={isRepairing}
 label="Limpieza Estructural"
 icon={Bug}
 variant="outline"
 />
 </SettingsCard>
 );
};
