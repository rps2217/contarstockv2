import React, { useState } from 'react';
import { Terminal, RefreshCw, ShieldCheck, Activity, AlertCircle } from 'lucide-react';
import { SettingsCard, SettingsCardHeader } from '../common/SettingsElements';
import { runSystemHealthCheck, TestResult } from '../../../../services/diagnostics';

interface Props {
  theme?: 'dark' | 'light' | 'gray' | 'high-contrast' | 'appsheet-dark' | 'night';
}

export const DiagnosticsCard: React.FC<Props> = ({ theme = 'dark' }) => {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isTesting, setIsTesting] = useState(false);

  const isDark = theme === 'dark' || theme === 'night' || theme === 'high-contrast' || theme === 'appsheet-dark' || theme === 'gray';
  const isLight = theme === 'light';
  const isHighContrast = theme === 'high-contrast';

  // Clases según tema
  const cardBg = isHighContrast ? 'bg-black border-yellow-400' : isLight ? 'bg-white border-slate-200' : 'bg-base border-blue-900/30';
  const cardText = isHighContrast ? 'text-yellow-400' : isLight ? 'text-slate-900' : 'text-white';
  const btnRun = isHighContrast ? 'bg-yellow-400 hover:bg-yellow-300' : isLight ? 'bg-blue-600 hover:bg-blue-500' : 'bg-blue-600 hover:bg-blue-500';
  const resultBg = isHighContrast ? 'bg-yellow-900/20' : isLight ? 'bg-slate-50' : 'bg-white/5';
  const stepText = isHighContrast ? 'text-yellow-500' : isLight ? 'text-slate-600' : 'text-muted';
  const messageText = isHighContrast ? 'text-yellow-400' : isLight ? 'text-slate-700' : 'text-secondary';

  const handleRunTests = async () => {
    setIsTesting(true);
    setTestResults([]);
    const results = await runSystemHealthCheck();
    setTestResults(results);
    setIsTesting(false);
  };

  return (
    <SettingsCard className={`${cardBg} ${cardText}`} theme={theme}>
      <SettingsCardHeader
        icon={Terminal}
        title="Diagnóstico"
        subtitle="Validar conexión cloud"
        theme={theme}
      >
        <button
          onClick={handleRunTests}
          disabled={isTesting}
          className={`p-3 rounded-xl transition-all ${isTesting ? (isHighContrast ? 'bg-yellow-900/20' : isLight ? 'bg-slate-200' : 'bg-elevated') : btnRun}`}
        >
          <RefreshCw className={`w-5 h-5 ${isTesting ? '' : 'text-white'} ${isTesting ? (isHighContrast ? 'text-yellow-400' : 'text-white') : ''} ${isTesting ? 'animate-spin' : ''}`} />
        </button>
      </SettingsCardHeader>

      <div className="space-y-2 font-mono min-h-[80px]">
        {testResults.length === 0 && !isTesting && (
          <div className="text-center py-6 opacity-20">
            <Activity className={`w-8 h-8 mx-auto mb-2 ${isHighContrast ? 'text-yellow-400' : ''}`} />
            <p className={`text-[10px] font-black uppercase ${isHighContrast ? 'text-yellow-400' : ''}`}>Sin pruebas ejecutadas</p>
          </div>
        )}

        {isTesting && (
          <div className="flex items-center justify-center py-6">
            <span className={`text-[9px] font-black animate-pulse uppercase ${isHighContrast ? 'text-yellow-400' : 'text-blue-400'}`}>Ejecutando...</span>
          </div>
        )}

        {testResults.map((res, i) => (
          <div key={i} className={`flex gap-3 text-[10px] p-2 rounded-lg ${resultBg}`}>
            <div className="shrink-0 mt-0.5">
              {res.status === 'ok' ? <ShieldCheck className={`w-4 h-4 ${isHighContrast ? 'text-yellow-400' : 'text-emerald-500'}`} /> :
               res.status === 'fail' ? <AlertCircle className="w-4 h-4 text-rose-500" /> :
               <Activity className={`w-4 h-4 ${isHighContrast ? 'text-yellow-400' : 'text-amber-500'}`} />}
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-center mb-1">
                <span className={`font-black uppercase ${stepText}`}>[{res.step}]</span>
                <span className={`font-black uppercase ${
                  res.status === 'ok' ? (isHighContrast ? 'text-yellow-400' : 'text-emerald-500') : 
                  res.status === 'fail' ? 'text-rose-500' : 
                  (isHighContrast ? 'text-yellow-400' : 'text-amber-500')
                }`}>{res.status}</span>
              </div>
              <p className={messageText}>{res.message}</p>
            </div>
          </div>
        ))}
      </div>
    </SettingsCard>
  );
};
