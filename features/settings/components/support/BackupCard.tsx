
import React, { useRef, useState } from 'react';
import { Database, Download, Upload } from 'lucide-react';
import { SettingsCard, SettingsCardHeader, SettingsButton } from '../common/settings-ui';
import { createFullBackup, restoreFullBackup } from '../../../../services/backupService';
import { SoundFX } from '../../../../services/audio';

export const BackupCard: React.FC = () => {
 const [isRestoring, setIsRestoring] = useState(false);
 const backupInputRef = useRef<HTMLInputElement>(null);

 const handleBackup = async () => {
 try {
 await createFullBackup();
 SoundFX.play('success');
 } catch (e) { alert("Error al exportar"); }
 };

 const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (!file) return;
 
 if (!confirm("⚠️ ATENCIÓN\nEsta acción reemplazará TODOS los datos actuales por los del archivo. El sistema se reiniciará.\n\n¿Proceder?")) return;

 setIsRestoring(true);
 restoreFullBackup(file)
 .then(() => {
 SoundFX.play('success');
 window.location.reload();
 })
 .catch((err) => {
 SoundFX.play('error');
 alert(`Fallo Crítico: ${err.message}`);
 setIsRestoring(false);
 });
 };

 return (
 <SettingsCard className="bg-blue-600 border-blue-800 text-white">
 <SettingsCardHeader icon={Database} title="Backup Maestro" subtitle="Persistencia Completa" color="bg-blue-700" />
 <p className="text-[10px] text-blue-100 font-bold mb-6 uppercase tracking-wide leading-relaxed">
 Extrae o restaura toda la inteligencia operativa y picks en un solo archivo JSON.
 </p>
 <div className="grid grid-cols-2 gap-3">
 <SettingsButton onClick={handleBackup} label="Exportar" icon={Download} variant="primary" className="bg-white text-blue-600 hover:bg-blue-50" />
 <SettingsButton onClick={() => backupInputRef.current?.click()} isLoading={isRestoring} label="Importar" icon={Upload} variant="outline" className="bg-blue-700 border-blue-500 text-white hover:bg-blue-800" />
 </div>
 <input ref={backupInputRef} type="file" accept=".json" className="hidden" onChange={handleRestore} />
 </SettingsCard>
 );
};
