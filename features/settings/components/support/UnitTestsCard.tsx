
import React, { useState } from 'react';
import { Beaker, CheckCircle2, XCircle, Play, ShieldCheck } from 'lucide-react';
import { SettingsCard, SettingsCardHeader, SettingsButton } from '../common/SettingsUI';
import { runUiLogicTests } from '../../../../services/tests/uiLogic.test';
import { runScannerMachineTests } from '../../../../services/tests/scannerMachine.test';
import { runAggregatorTests } from '../../../../services/tests/aggregator.test';
import { SoundFX } from '../../../../services/audio';

export const UnitTestsCard: React.FC = () => {
 const [testGroups, setTestGroups] = useState<any[]>([]);
 const [isRunning, setIsRunning] = useState(false);

 const executeSuite = async () => {
 setIsRunning(true);
 setTestGroups([]);
 SoundFX.play('increment');

 // Delay artificial para visualización industrial
 await new Promise(r => setTimeout(r, 600));

 const groups = [
 { title: 'Motor de Correlación (UI Logic)', tests: runUiLogicTests() },
 { title: 'Máquina de Estados (State Machine)', tests: runScannerMachineTests() },
 { title: 'Motor de Agregación (Data integrity)', tests: runAggregatorTests() }
 ];

 setTestGroups(groups);
 setIsRunning(false);
 
 const allPassed = groups.every(g => g.tests.every(t => t.passed));
 SoundFX.play(allPassed ? 'success' : 'error');
 };

 return (
 <SettingsCard className="bg-slate-900 border-indigo-500/20 text-white">
 <SettingsCardHeader 
 icon={Beaker} 
 title="Laboratorio Operativo" 
 subtitle="Unit Tests Core v1.0"
 color="bg-indigo-600"
 />
 
 <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-6 leading-relaxed">
 Ejecuta pruebas de estrés sobre los algoritmos de cálculo y flujo de datos para garantizar cero errores en producción.
 </p>

 <div className="space-y-4 mb-6">
 {testGroups.map((group, idx) => (
 <div key={idx} className="bg-black/40 rounded-2xl border border-white/5 overflow-hidden animate-in slide-in-from-bottom-2">
 <div className="bg-white/5 px-4 py-2 flex justify-between items-center border-b border-white/5">
 <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">{group.title}</span>
 <span className="text-[8px] font-black text-slate-500">{group.tests.filter(t => t.passed).length}/{group.tests.length} OK</span>
 </div>
 <div className="p-3 space-y-2">
 {group.tests.map((test, tidx) => (
 <div key={tidx} className="flex items-center justify-between text-[10px] font-bold">
 <span className="text-slate-300 truncate pr-4">{test.name}</span>
 {test.passed ? 
 <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : 
 <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
 }
 </div>
 ))}
 </div>
 </div>
 ))}
 </div>

 <SettingsButton 
 onClick={executeSuite}
 isLoading={isRunning}
 label={isRunning ? "Certificando..." : "Ejecutar Suite de Pruebas"}
 icon={isRunning ? ShieldCheck : Play}
 variant="primary"
 className="bg-indigo-600 border-indigo-400"
 />
 </SettingsCard>
 );
};
