/**
 * SupabaseAuditorModal - Modal para auditoría de tablas en Supabase
 * 
 * Arquitectura Lego: Delega toda la lógica al hook useSupabaseAudit
 * y rendering a componentes especializados.
 * 
 * Antes: 467 líneas
 * Después: ~280 líneas
 */

import React from 'react';
import { motion } from 'motion/react';
import { 
  X, Server, CheckCircle2, AlertCircle, RefreshCw, 
  Database, Trash2, Copy, Terminal, AlertTriangle, 
  ShieldCheck, HelpCircle 
} from 'lucide-react';
import { useSupabaseAudit, SYSTEM_TABLES, TableAuditResult } from '../hooks/useSupabaseAudit';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseAuditorModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const {
    results,
    legacyResults,
    customTable,
    customLegacyList,
    selectedForDeletion,
    copied,
    setCustomTable,
    testTable,
    auditAll,
    addCustomLegacyTable,
    toggleDeletionSelection,
    getSQLDropScript,
    handleCopy,
  } = useSupabaseAudit();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-hidden font-sans">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-slate-900 border border-white/10 rounded-[2.5rem] w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl relative"
      >
        {/* Header */}
        <ModalHeader onClose={onClose} />

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 no-scrollbar space-y-8">
          
          {/* Hero Audit Action Banner */}
          <AuditBanner onAudit={auditAll} />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left: Table Status Checklist (7 Cols) */}
            <div className="lg:col-span-7 space-y-6">
              <SystemTablesList results={results} onTest={testTable} />
              <LegacyTablesList 
                results={legacyResults}
                customTable={customTable}
                customLegacyList={customLegacyList}
                selectedForDeletion={selectedForDeletion}
                onCustomTableChange={setCustomTable}
                onAddTable={addCustomLegacyTable}
                onToggleSelection={toggleDeletionSelection}
                onTest={(table) => testTable(table, true)}
              />
            </div>

            {/* Right: SQL Generator (5 Cols) */}
            <div className="lg:col-span-5">
              <SQLGeneratorPanel 
                script={getSQLDropScript()}
                copied={copied}
                hasSelection={Object.values(selectedForDeletion).some(v => v)}
                onCopy={handleCopy}
              />
            </div>

          </div>
        </div>

        {/* Footer */}
        <ModalFooter onClose={onClose} />
      </motion.div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────

const ModalHeader: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div className="p-6 md:p-8 border-b border-white/5 flex items-center justify-between shrink-0">
    <div className="flex items-center gap-3">
      <div className="p-3 bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 rounded-2xl">
        <Server className="w-6 h-6" />
      </div>
      <div>
        <h2 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter text-white">
          Auditor de Tablas <span className="text-gradient-blue">Supabase</span>
        </h2>
        <p className="text-[10px] md:text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">
          Herramienta de Diagnóstico, Depuración y Limpieza para Postgres
        </p>
      </div>
    </div>
    <button 
      onClick={onClose}
      className="w-12 h-12 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
    >
      <X className="w-5 h-5" />
    </button>
  </div>
);

const AuditBanner: React.FC<{ onAudit: () => void }> = ({ onAudit }) => (
  <div className="p-6 rounded-[2rem] bg-gradient-to-r from-indigo-950/40 to-slate-950 border border-white/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
    <div className="space-y-2">
      <h3 className="text-lg font-black text-white italic uppercase tracking-tight">¿Cómo funciona esta auditoría?</h3>
      <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
        Esta herramienta ejecuta consultas de baja prioridad directamente contra tu servidor de Supabase para comprobar de forma interactiva la integridad de los esquemas, contar el número de registros cargados y detectar tablas descontinuadas o innecesarias.
      </p>
    </div>
    <button
      onClick={onAudit}
      className="px-6 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase text-xs tracking-wider shrink-0 transition-all flex items-center gap-2 active:scale-95 shadow-lg shadow-indigo-600/20"
    >
      <RefreshCw className="w-4 h-4" />
      Auditar Base de Datos Ahora
    </button>
  </div>
);

const SystemTablesList: React.FC<{ 
  results: Record<string, TableAuditResult>;
  onTest: (table: string) => void;
}> = ({ results, onTest }) => (
  <div>
    <h4 className="text-xs font-black uppercase tracking-[0.2em] text-indigo-400 mb-4 px-2 flex items-center gap-2">
      <Database className="w-4 h-4" />
      Tablas Críticas de Operación
    </h4>
    <div className="space-y-3">
      {SYSTEM_TABLES.map(table => {
        const status = results[table.name];
        return (
          <div 
            key={table.name}
            className="p-4 bg-slate-950 rounded-2xl border border-white/5 flex items-center justify-between hover:border-white/10 transition-colors"
          >
            <div className="space-y-1">
              <span className="text-xs font-black uppercase tracking-wider text-slate-100 flex items-center gap-2">
                {table.name}
                {table.required ? (
                  <span className="text-[8px] bg-red-500/10 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded uppercase font-black">Requerido</span>
                ) : (
                  <span className="text-[8px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded uppercase font-black">Adicional</span>
                )}
              </span>
              <p className="text-[10px] text-slate-500 leading-none">{table.desc}</p>
            </div>

            <TableStatus status={status} onTest={() => onTest(table.name)} />
          </div>
        );
      })}
    </div>
  </div>
);

const LegacyTablesList: React.FC<{
  results: Record<string, TableAuditResult>;
  customTable: string;
  customLegacyList: string[];
  selectedForDeletion: Record<string, boolean>;
  onCustomTableChange: (value: string) => void;
  onAddTable: () => void;
  onToggleSelection: (table: string) => void;
  onTest: (table: string) => void;
}> = ({ results, customTable, customLegacyList, selectedForDeletion, onCustomTableChange, onAddTable, onToggleSelection, onTest }) => (
  <div className="pt-4 border-t border-white/5">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 px-2">
      <h4 className="text-xs font-black uppercase tracking-[0.2em] text-rose-400 flex items-center gap-2">
        <Trash2 className="w-4 h-4" />
        Tablas Legacy / Extras a Auditar
      </h4>
      <div className="flex gap-2 items-center">
        <input 
          type="text"
          value={customTable}
          onChange={(e) => onCustomTableChange(e.target.value)}
          placeholder="Ej: DETALLE_COMPRAS"
          className="bg-slate-950 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white uppercase placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 max-w-[150px]"
        />
        <button 
          onClick={onAddTable}
          className="px-3 py-1.5 bg-indigo-600/20 border border-indigo-500/30 hover:bg-indigo-600/40 text-indigo-400 text-[10px] font-extrabold uppercase rounded-xl transition-all"
        >
          Añadir
        </button>
      </div>
    </div>

    <div className="space-y-3">
      {customLegacyList.map(table => {
        const status = results[table];
        const isSelected = !!selectedForDeletion[table];
        return (
          <div 
            key={table}
            className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${
              status?.exists === true 
                ? 'bg-rose-500/5 border-rose-500/20' 
                : 'bg-slate-950/60 border-white/5'
            }`}
          >
            <div className="flex items-center gap-3">
              {status?.exists === true && (
                <input 
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggleSelection(table)}
                  className="w-4 h-4 border-white/10 bg-slate-950 text-indigo-600 rounded focus:ring-indigo-500 shrink-0 cursor-pointer"
                />
              )}
              <div className="space-y-1">
                <span className={`text-xs font-black uppercase tracking-wider ${status?.exists === true ? 'text-rose-400' : 'text-slate-500'}`}>
                  {table}
                </span>
                <p className="text-[10px] text-slate-500 leading-none">
                  {status?.exists === true 
                    ? '⚠️ Tabla extra detectada. Se recomienda auditar' 
                    : 'Tabla descontinuada o historial de pruebas anteriores'}
                </p>
              </div>
            </div>

            <TableStatus status={status} onTest={() => onTest(table)} showExtra />
          </div>
        );
      })}
    </div>
  </div>
);

const TableStatus: React.FC<{
  status?: TableAuditResult;
  onTest: () => void;
  showExtra?: boolean;
}> = ({ status, onTest, showExtra }) => {
  if (status?.isTesting) {
    return <div className="text-indigo-400 animate-spin"><RefreshCw className="w-4 h-4" /></div>;
  }
  
  if (status?.exists === true) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold text-slate-400 bg-white/5 px-2 py-0.5 rounded border border-white/5">
          {status.count === 0 ? '0 filas' : `${status.count} fila(s)`}
        </span>
        {showExtra ? (
          <span className="text-[9px] font-extrabold text-red-400 bg-red-400/10 border border-red-500/20 px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> EXTRA
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[9px] font-black text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-1 rounded-full uppercase tracking-wider">
            <CheckCircle2 className="w-3 h-3" /> ACTIVA
          </span>
        )}
      </div>
    );
  }
  
  if (status?.exists === false) {
    return (
      <span className="inline-flex items-center gap-1 text-[9px] font-black text-rose-400 bg-rose-400/10 border border-rose-400/20 px-2 py-1 rounded-full uppercase tracking-wider">
        <AlertCircle className="w-3 h-3" /> NO DETECTADA
      </span>
    );
  }
  
  return (
    <button 
      onClick={onTest}
      className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 text-[10px] font-bold uppercase rounded-lg text-slate-400 hover:text-white transition-colors"
    >
      Test
    </button>
  );
};

const SQLGeneratorPanel: React.FC<{
  script: string;
  copied: boolean;
  hasSelection: boolean;
  onCopy: () => void;
}> = ({ script, copied, hasSelection, onCopy }) => (
  <div className="p-6 bg-slate-950 rounded-[2.5rem] border border-white/5 flex flex-col justify-between h-full space-y-6">
    <div>
      <div className="flex items-center gap-2.5 mb-2">
        <Terminal className="w-5 h-5 text-indigo-400" />
        <h4 className="text-sm font-black uppercase text-white tracking-tight italic">SQL Terminal Clean Up</h4>
      </div>
      
      <p className="text-xs text-slate-400 leading-relaxed">
        Las políticas de seguridad nativas de Postgres de Supabase previenen que clientes web anónimos ejecuten comandos directos de manipulación de tablas (DDL) sin autenticación de superusuario. 
      </p>

      <div className="mt-4 p-4.5 bg-indigo-500/5 rounded-2xl border border-indigo-500/10 space-y-2.5">
        <h5 className="text-[10px] uppercase font-black tracking-widest text-indigo-400">Instrucciones de Limpieza de Tablas:</h5>
        <ol className="text-[11px] text-slate-400 space-y-2 leading-relaxed list-decimal list-inside">
          <li>Inicia sesión en tu cuenta de <strong className="text-indigo-300">Supabase</strong>.</li>
          <li>Haz clic en la pestaña <strong className="text-indigo-300">"SQL Editor"</strong> en el panel izquierdo.</li>
          <li>Selecciona las tablas recomendadas para eliminación a la izquierda.</li>
          <li>Presiona el botón <strong className="text-indigo-300">"Copiar Script de Limpieza"</strong> abajo.</li>
          <li>Pega el código en el editor SQL de Supabase y haz clic en <strong className="text-white bg-slate-900 border border-white/10 px-2 py-0.5 rounded font-bold">"Run"</strong>.</li>
        </ol>
      </div>

      {/* Generated Code Window */}
      <div className="mt-5 rounded-2xl overflow-hidden border border-white/10 shadow-lg select-all bg-slate-900/50">
        <div className="h-9 bg-slate-900 flex items-center justify-between px-4 border-b border-white/5">
          <span className="text-[9px] font-bold uppercase text-slate-500 tracking-wider">SQL Editor Snippet</span>
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
        </div>
        <pre className="p-4 font-mono text-[10px] text-indigo-300 overflow-x-auto max-h-[160px] no-scrollbar leading-tight bg-black/60">
          {script}
        </pre>
      </div>
    </div>

    <div className="pt-4">
      <button
        onClick={onCopy}
        disabled={!hasSelection}
        className={`w-full py-4 rounded-2xl font-black uppercase text-xs tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg ${
          hasSelection
            ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/15 active:scale-95'
            : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5 shadow-none'
        }`}
      >
        <Copy className="w-4 h-4" />
        {copied ? '¡Copiado con Éxito!' : 'Copiar Script de Limpieza'}
      </button>
    </div>
  </div>
);

const ModalFooter: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div className="p-6 md:p-8 border-t border-white/5 flex items-center justify-between shrink-0 bg-slate-950 rounded-b-[2.5rem]">
    <div className="flex items-center gap-2 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
      <HelpCircle className="w-4 h-4" />
      Las operaciones DROP TABLE son destructivas e irreversibles. Úsalas con precaución.
    </div>
    <button
      onClick={onClose}
      className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-extrabold uppercase text-[10px] tracking-wider rounded-xl transition-all"
    >
      Cerrar Auditor
    </button>
  </div>
);
