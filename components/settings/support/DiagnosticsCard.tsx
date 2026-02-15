
import React, { useState } from 'react';
import { Terminal, RefreshCw, ShieldCheck, Activity, AlertCircle } from 'lucide-react';
import { SettingsCard, SettingsCardHeader } from '../common/SettingsUI';
import { runStockEngineTest, TestResult } from '../../../services/diagnostics';
import { SoundFX } from '../../../services/audio';

export const DiagnosticsCard: React.FC = () => {
    const [testResults, setTestResults] = useState<TestResult[]>([]);
    const [isTesting, setIsTesting] = useState(false);

    const handleRunTests = async () => {
        setIsTesting(true);
        setTestResults([]);
        SoundFX.play('increment');
        const results = await runStockEngineTest();
        setTestResults(results);
        setIsTesting(false);
        const hasFail = results.some(r => r.status === 'fail');
        SoundFX.play(hasFail ? 'error' : 'success');
    };

    return (
        <SettingsCard className="bg-slate-950 border-blue-900/30 text-white overflow-hidden">
            <SettingsCardHeader 
                icon={Terminal} 
                title="Kernel & Diagnóstico" 
                subtitle="Validador de Integridad Cloud"
            >
                <button 
                    onClick={handleRunTests}
                    disabled={isTesting}
                    className={`p-3 rounded-xl transition-all ${isTesting ? 'bg-slate-800 animate-spin' : 'bg-blue-600 hover:bg-blue-500 active:scale-90'}`}
                >
                    <RefreshCw className="w-5 h-5 text-white" />
                </button>
            </SettingsCardHeader>

            <div className="space-y-2 font-mono min-h-[100px]">
                {testResults.length === 0 && !isTesting && (
                    <div className="text-center py-6 opacity-20">
                        <Activity className="w-10 h-10 mx-auto mb-2" />
                        <p className="text-[10px] font-black uppercase tracking-widest">Esperando inicio de pruebas</p>
                    </div>
                )}
                
                {isTesting && (
                    <div className="flex flex-col items-center py-6 gap-3">
                        <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 animate-loading-bar"></div>
                        </div>
                        <span className="text-[9px] font-black text-blue-400 animate-pulse uppercase tracking-[0.3em]">Interrogando Servidor...</span>
                    </div>
                )}

                {testResults.map((res, i) => (
                    <div key={i} className="flex gap-3 text-[10px] p-2 rounded-lg bg-white/5 animate-in slide-in-from-left-2">
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
                            <p className="text-slate-300 leading-tight">{res.message}</p>
                        </div>
                    </div>
                ))}
            </div>
            <style>{`
                @keyframes loading-bar { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
                .animate-loading-bar { animation: loading-bar 2s linear infinite; }
            `}</style>
        </SettingsCard>
    );
};
