import React, { useState } from 'react';
import { Terminal, RefreshCw, ShieldCheck, Activity, AlertCircle } from 'lucide-react';
import { SettingsCard, SettingsCardHeader } from '../common/SettingsElements';
import { runSystemHealthCheck, TestResult } from '../../../../services/diagnostics';

export const DiagnosticsCard: React.FC = () => {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isTesting, setIsTesting] = useState(false);

  const handleRunTests = async () => {
    setIsTesting(true);
    setTestResults([]);
    const results = await runSystemHealthCheck();
    setTestResults(results);
    setIsTesting(false);
  };

  return (
    <SettingsCard className="bg-slate-950 border-blue-900/30 text-white">
      <SettingsCardHeader
        icon={Terminal}
        title="Diagnóstico"
        subtitle="Validar conexión cloud"
      >
        <button
          onClick={handleRunTests}
          disabled={isTesting}
          className={`p-3 rounded-xl transition-all ${isTesting ? 'bg-slate-800' : 'bg-blue-600 hover:bg-blue-500'}`}
        >
          <RefreshCw className={`w-5 h-5 text-white ${isTesting ? 'animate-spin' : ''}`} />
        </button>
      </SettingsCardHeader>

      <div className="space-y-2 font-mono min-h-[80px]">
        {testResults.length === 0 && !isTesting && (
          <div className="text-center py-6 opacity-20">
            <Activity className="w-8 h-8 mx-auto mb-2" />
            <p className="text-[10px] font-black uppercase">Sin pruebas ejecutadas</p>
          </div>
        )}

        {isTesting && (
          <div className="flex items-center justify-center py-6">
            <span className="text-[9px] font-black text-blue-400 animate-pulse uppercase">Ejecutando...</span>
          </div>
        )}

        {testResults.map((res, i) => (
          <div key={i} className="flex gap-3 text-[10px] p-2 rounded-lg bg-white/5">
            <div className="shrink-0 mt-0.5">
              {res.status === 'ok' ? <ShieldCheck className="w-4 h-4 text-emerald-500" /> :
               res.status === 'fail' ? <AlertCircle className="w-4 h-4 text-rose-500" /> :
               <Activity className="w-4 h-4 text-amber-500" />}
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-center mb-1">
                <span className="font-black uppercase text-slate-400">[{res.step}]</span>
                <span className={`font-black uppercase ${res.status === 'ok' ? 'text-emerald-500' : res.status === 'fail' ? 'text-rose-500' : 'text-amber-500'}`}>{res.status}</span>
              </div>
              <p className="text-slate-300">{res.message}</p>
            </div>
          </div>
        ))}
      </div>
    </SettingsCard>
  );
};
