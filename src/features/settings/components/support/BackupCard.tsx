
import React, { useRef, useState } from 'react';
import { Database, Download, Upload } from 'lucide-react';
import { SettingsCard, SettingsCardHeader, SettingsButton } from '../common/SettingsElements';
import { createFullBackup, restoreFullBackup } from '../../../../services/backupService';
import { SoundFX } from '../../../../services/audio';

interface Props {
  theme?: 'dark' | 'light' | 'gray' | 'high-contrast' | 'appsheet-dark' | 'night';
}

export const BackupCard: React.FC<Props> = ({ theme = 'dark' }) => {
  const [isRestoring, setIsRestoring] = useState(false);
  const backupInputRef = useRef<HTMLInputElement>(null);

  const isDark = theme === 'dark' || theme === 'night' || theme === 'high-contrast' || theme === 'appsheet-dark' || theme === 'gray';
  const isLight = theme === 'light';
  const isHighContrast = theme === 'high-contrast';

  // Clases según tema
  const cardBg = isHighContrast ? 'bg-black border-yellow-400 text-yellow-400' : isLight ? 'bg-blue-600 border-blue-800 text-white' : 'bg-blue-600 border-blue-800 text-white';
  const cardDesc = isHighContrast ? 'text-yellow-500' : 'text-blue-100';
  const btnExport = isHighContrast 
    ? 'bg-yellow-400 text-black hover:bg-yellow-300' 
    : 'bg-white text-blue-600 hover:bg-blue-50';
  const btnImport = isHighContrast 
    ? 'bg-yellow-900/30 border-yellow-400 text-yellow-400 hover:bg-yellow-900/50' 
    : 'bg-blue-700 border-blue-500 text-white hover:bg-blue-800';

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
    <SettingsCard className={`${cardBg}`} theme={theme}>
      <SettingsCardHeader icon={Database} title="Backup Maestro" subtitle="Persistencia Completa" color="bg-blue-700" theme={theme} />
      <p className={`text-[10px] font-bold mb-6 uppercase tracking-wide leading-relaxed ${cardDesc}`}>
        Extrae o restaura toda la inteligencia operativa y picks en un solo archivo JSON.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <SettingsButton onClick={handleBackup} label="Exportar" icon={Download} variant="primary" className={btnExport} theme={theme} />
        <SettingsButton onClick={() => backupInputRef.current?.click()} isLoading={isRestoring} label="Importar" icon={Upload} variant="outline" className={btnImport} theme={theme} />
      </div>
      <input ref={backupInputRef} type="file" accept=".json" className="hidden" onChange={handleRestore} />
    </SettingsCard>
  );
};
