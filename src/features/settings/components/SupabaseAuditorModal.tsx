/**
 * SupabaseAuditorModal - Modal para auditoría de tablas en Supabase
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
  theme?: 'dark' | 'light' | 'high-contrast';
}

export const SupabaseAuditorModal: React.FC<Props> = ({ isOpen, onClose, theme = 'dark' }) => {
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

  const isDark = theme === 'dark';
  const isLight = theme === 'light';
  const isHighContrast = theme === 'high-contrast';

  // Clases según tema
  const modalBg = isHighContrast ? 'bg-black border-yellow-400' : isLight ? 'bg-white border-slate-200' : 'bg-surface border-white/10';
  const overlayBg = isHighContrast ? 'bg-yellow-950/80' : 'bg-base/80';
  const headerBorder = isHighContrast ? 'border-yellow-400/30' : isLight ? 'border-slate-200' : 'border-white/5';
  const headerText = isHighContrast ? 'text-yellow-400' : isLight ? 'text-slate-900' : 'text-white';
  const subtitleText = isHighContrast ? 'text-yellow-500' : isLight ? 'text-slate-500' : 'text-muted';
  const accentBg = isHighContrast ? 'bg-yellow-900/30 border-yellow-400/50' : isLight ? 'bg-indigo-50 border-indigo-200' : 'bg-indigo-500/10 border-indigo-500/30';
  const accentIcon = isHighContrast ? 'text-yellow-400' : isLight ? 'text-indigo-500' : 'text-indigo-400';
  const bannerBg = isHighContrast ? 'bg-yellow-950/20 border-yellow-400/30' : isLight ? 'bg-indigo-50 border-indigo-200' : 'bg-gradient-to-r from-indigo-950/40 to-slate-950 border-white/5';

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-[150] flex items-center justify-center p-4 backdrop-blur-md overflow-hidden font-sans ${overlayBg}`}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className={`rounded-[2.5rem] w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl relative ${modalBg}`}
      >
        {/* Header */}
        <ModalHeader onClose={onClose} theme={theme} />

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 no-scrollbar space-y-8">
          
          {/* Hero Audit Action Banner */}
          <AuditBanner onAudit={auditAll} theme={theme} />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left: Table Status Checklist (7 Cols) */}
            <div className="lg:col-span-7 space-y-6">
              <SystemTablesList results={results} onTest={testTable} theme={theme} />
              <LegacyTablesList 
                results={legacyResults}
                customTable={customTable}
                customLegacyList={customLegacyList}
                selectedForDeletion={selectedForDeletion}
                onCustomTableChange={setCustomTable}
                onAddTable={addCustomLegacyTable}
                onToggleSelection={toggleDeletionSelection}
                onTest={(table) => testTable(table, true)}
                theme={theme}
              />
            </div>

            {/* Right: SQL Generator (5 Cols) */}
            <div className="lg:col-span-5">
              <SQLGeneratorPanel 
                script={getSQLDropScript()}
                copied={copied}
                hasSelection={Object.values(selectedForDeletion).some(v => v)}
                onCopy={handleCopy}
                theme={theme}
              />
            </div>

          </div>
        </div>

        {/* Footer */}
        <ModalFooter onClose={onClose} theme={theme} />
      </motion.div>
    </div>
  );
};

const ModalHeader: React.FC<{ onClose: () => void; theme?: 'dark' | 'light' | 'high-contrast' }> = ({ onClose, theme = 'dark' }) => {
  const isHighContrast = theme === 'high-contrast';
  const isLight = theme === 'light';
  
  return (
    <div className={`p-6 md:p-8 border-b flex items-center justify-between shrink-0 ${isHighContrast ? 'border-yellow-400/30' : isLight ? 'border-slate-200' : 'border-white/5'}`}>
      <div className="flex items-center gap-3">
        <div className={`p-3 rounded-2xl ${isHighContrast ? 'bg-yellow-900/30 border border-yellow-400/50 text-yellow-400' : isLight ? 'bg-indigo-50 border border-indigo-200 text-indigo-500' : 'bg-indigo-500/10 border border-indigo-500/30 text-indigo-400'}`}>
          <Server className="w-6 h-6" />
        </div>
        <div>
          <h2 className={`text-xl md:text-2xl font-black italic uppercase tracking-tighter ${isHighContrast ? 'text-yellow-400' : isLight ? 'text-slate-900' : 'text-white'}`}>
            Auditor de Tablas <span className={isHighContrast ? 'text-yellow-300' : 'text-gradient-blue'}>Supabase</span>
          </h2>
          <p className={`text-[10px] md:text-xs font-bold uppercase tracking-wider mt-1 ${isHighContrast ? 'text-yellow-500' : isLight ? 'text-slate-500' : 'text-muted'}`}>
            Herramienta de Diagnóstico, Depuración y Limpieza para Postgres
          </p>
        </div>
      </div>
      <button 
        onClick={onClose}
        className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${isHighContrast ? 'bg-yellow-900/20 hover:bg-yellow-900/30 border border-yellow-400/30 text-yellow-400 hover:text-yellow-300' : isLight ? 'bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-500' : 'bg-white/5 hover:bg-white/10 border border-white/5 text-muted hover:text-white'}`}
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
};

const AuditBanner: React.FC<{ onAudit: () => void; theme?: 'dark' | 'light' | 'high-contrast' }> = ({ onAudit, theme = 'dark' }) => {
  const isHighContrast = theme === 'high-contrast';
  const isLight = theme === 'light';
  
  return (
    <div className={`p-6 rounded-[2rem] flex flex-col md:flex-row items-start md:items-center justify-between gap-6 ${isHighContrast ? 'bg-yellow-950/20 border border-yellow-400/30' : isLight ? 'bg-indigo-50 border border-indigo-200' : 'bg-gradient-to-r from-indigo-950/40 to-slate-950 border border-white/5'}`}>
      <div className="space-y-2">
        <h3 className={`text-lg font-black italic uppercase tracking-tight ${isHighContrast ? 'text-yellow-400' : isLight ? 'text-slate-900' : 'text-white'}`}>¿Cómo funciona esta auditoría?</h3>
        <p className={`text-xs max-w-xl leading-relaxed ${isHighContrast ? 'text-yellow-500' : isLight ? 'text-slate-600' : 'text-muted'}`}>
          Esta herramienta ejecuta consultas de baja prioridad directamente contra tu servidor de Supabase para comprobar de forma interactiva la integridad de los esquemas, contar el número de registros cargados y detectar tablas descontinuadas o innecesarias.
        </p>
      </div>
      <button
        onClick={onAudit}
        className={`px-6 py-4 rounded-2xl font-black uppercase text-xs tracking-wider shrink-0 transition-all flex items-center gap-2 active:scale-95 ${isHighContrast ? 'bg-yellow-400 text-black hover:bg-yellow-300 shadow-yellow-400/20' : isLight ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20'}`}
      >
        <RefreshCw className="w-4 h-4" />
        Auditar Base de Datos Ahora
      </button>
    </div>
  );
};

const SystemTablesList: React.FC<{ 
  results: Record<string, TableAuditResult>;
  onTest: (table: string) => void;
  theme?: 'dark' | 'light' | 'high-contrast';
}> = ({ results, onTest, theme = 'dark' }) => {
  const isHighContrast = theme === 'high-contrast';
  const isLight = theme === 'light';
  
  return (
    <div>
      <h4 className={`text-xs font-black uppercase tracking-[0.2em] mb-4 px-2 flex items-center gap-2 ${isHighContrast ? 'text-yellow-400' : isLight ? 'text-indigo-600' : 'text-indigo-400'}`}>
        <Database className="w-4 h-4" />
        Tablas Críticas de Operación
      </h4>
      <div className="space-y-3">
        {SYSTEM_TABLES.map(table => {
          const status = results[table.name];
          return (
            <div 
              key={table.name}
              className={`p-4 rounded-2xl border flex items-center justify-between hover:border-white/10 transition-colors ${isHighContrast ? 'bg-yellow-950/20 border-yellow-400/30' : isLight ? 'bg-slate-50 border-slate-200' : 'bg-base border-white/5'}`}
            >
              <div className="space-y-1">
                <span className={`text-xs font-black uppercase tracking-wider flex items-center gap-2 ${isHighContrast ? 'text-yellow-400' : isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                  {table.name}
                  {table.required ? (
                    <span className={`text-[8px] px-1.5 py-0.5 rounded uppercase font-black ${isHighContrast ? 'bg-red-500/20 text-red-400 border border-red-500/30' : isLight ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>Requerido</span>
                  ) : (
                    <span className={`text-[8px] px-1.5 py-0.5 rounded uppercase font-black ${isHighContrast ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : isLight ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'}`}>Adicional</span>
                  )}
                </span>
                <p className={`text-[10px] leading-none ${isHighContrast ? 'text-yellow-500' : isLight ? 'text-slate-500' : 'text-slate-500'}`}>{table.desc}</p>
              </div>

              <TableStatus status={status} onTest={() => onTest(table.name)} theme={theme} />
            </div>
          );
        })}
      </div>
    </div>
  );
};

const LegacyTablesList: React.FC<{
  results: Record<string, TableAuditResult>;
  customTable: string;
  customLegacyList: string[];
  selectedForDeletion: Record<string, boolean>;
  onCustomTableChange: (value: string) => void;
  onAddTable: () => void;
  onToggleSelection: (table: string) => void;
  onTest: (table: string) => void;
  theme?: 'dark' | 'light' | 'high-contrast';
}> = ({ results, customTable, customLegacyList, selectedForDeletion, onCustomTableChange, onAddTable, onToggleSelection, onTest, theme = 'dark' }) => {
  const isHighContrast = theme === 'high-contrast';
  const isLight = theme === 'light';
  const borderClass = isHighContrast ? 'border-yellow-400/30' : isLight ? 'border-slate-200' : 'border-white/5';
  
  return (
    <div className={`pt-4 border-t ${borderClass}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 px-2">
        <h4 className={`text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2 ${isHighContrast ? 'text-red-400' : isLight ? 'text-rose-600' : 'text-rose-400'}`}>
          <Trash2 className="w-4 h-4" />
          Tablas Legacy / Extras a Auditar
        </h4>
        <div className="flex gap-2 items-center">
          <input 
            type="text"
            value={customTable}
            onChange={(e) => onCustomTableChange(e.target.value)}
            placeholder="Ej: DETALLE_COMPRAS"
            className={`px-3 py-1.5 rounded-xl text-xs uppercase focus:outline-none ${isHighContrast ? 'bg-yellow-950 border border-yellow-400/30 text-yellow-400 placeholder:text-yellow-600' : isLight ? 'bg-slate-100 border border-slate-200 text-slate-900 placeholder:text-muted' : 'bg-base border border-white/10 text-white placeholder:text-slate-600'}`}
          />
          <button 
            onClick={onAddTable}
            className={`px-3 py-1.5 text-[10px] font-extrabold uppercase rounded-xl transition-all ${isHighContrast ? 'bg-yellow-900/30 border border-yellow-400/30 text-yellow-400 hover:bg-yellow-900/50' : isLight ? 'bg-indigo-100 border border-indigo-200 text-indigo-600 hover:bg-indigo-200' : 'bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-600/40'}`}
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
                  ? (isHighContrast ? 'bg-red-500/10 border-red-500/30' : isLight ? 'bg-rose-50 border-rose-200' : 'bg-rose-500/5 border-rose-500/20')
                  : (isHighContrast ? 'bg-yellow-950/20 border-yellow-400/30' : isLight ? 'bg-slate-50 border-slate-200' : 'bg-base/60 border-white/5')
              }`}
            >
              <div className="flex items-center gap-3">
                {status?.exists === true && (
                  <input 
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelection(table)}
                    className={`w-4 h-4 border rounded focus:ring-indigo-500 shrink-0 cursor-pointer ${isHighContrast ? 'bg-yellow-950 border-yellow-400 text-yellow-400' : isLight ? 'bg-white border-slate-300 text-indigo-600' : 'bg-base border-white/10 text-indigo-600'}`}
                  />
                )}
                <div className="space-y-1">
                  <span className={`text-xs font-black uppercase tracking-wider ${status?.exists === true ? (isHighContrast ? 'text-red-400' : isLight ? 'text-rose-600' : 'text-rose-400') : (isHighContrast ? 'text-yellow-500' : isLight ? 'text-muted' : 'text-slate-500')}`}>
                    {table}
                  </span>
                  <p className={`text-[10px] leading-none ${isHighContrast ? 'text-yellow-500' : isLight ? 'text-slate-500' : 'text-slate-500'}`}>
                    {status?.exists === true 
                      ? '⚠️ Tabla extra detectada. Se recomienda auditar' 
                      : 'Tabla descontinuada o historial de pruebas anteriores'}
                  </p>
                </div>
              </div>

              <TableStatus status={status} onTest={() => onTest(table)} showExtra theme={theme} />
            </div>
          );
        })}
      </div>
    </div>
  );
};

const TableStatus: React.FC<{
  status?: TableAuditResult;
  onTest: () => void;
  showExtra?: boolean;
  theme?: 'dark' | 'light' | 'high-contrast';
}> = ({ status, onTest, showExtra, theme = 'dark' }) => {
  const isHighContrast = theme === 'high-contrast';
  const isLight = theme === 'light';
  
  if (status?.isTesting) {
    return <div className={`animate-spin ${isHighContrast ? 'text-yellow-400' : 'text-indigo-400'}`}><RefreshCw className="w-4 h-4" /></div>;
  }
  
  if (status?.exists === true) {
    return (
      <div className="flex items-center gap-2">
        <span className={`text-[10px] font-bold rounded border px-2 py-0.5 ${isHighContrast ? 'bg-yellow-900/20 text-yellow-400 border-yellow-400/30' : isLight ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-white/5 text-muted border-white/5'}`}>
          {status.count === 0 ? '0 filas' : `${status.count} fila(s)`}
        </span>
        {showExtra ? (
          <span className={`text-[9px] font-extrabold rounded-full uppercase tracking-wider flex items-center gap-1 px-2.5 py-1 ${isHighContrast ? 'bg-red-500/20 text-red-400 border border-red-500/30' : isLight ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-red-400/10 text-red-400 border border-red-500/20'}`}>
            <AlertTriangle className="w-3 h-3" /> EXTRA
          </span>
        ) : (
          <span className={`inline-flex items-center gap-1 text-[9px] font-black rounded-full uppercase tracking-wider px-2 py-1 ${isHighContrast ? 'bg-green-500/20 text-green-400 border border-green-500/30' : isLight ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-emerald-400/10 text-emerald-400 border border-emerald-400/20'}`}>
            <CheckCircle2 className="w-3 h-3" /> ACTIVA
          </span>
        )}
      </div>
    );
  }
  
  if (status?.exists === false) {
    return (
      <span className={`inline-flex items-center gap-1 text-[9px] font-black rounded-full uppercase tracking-wider px-2 py-1 ${isHighContrast ? 'bg-red-500/20 text-red-400 border border-red-500/30' : isLight ? 'bg-rose-50 text-rose-600 border border-rose-200' : 'bg-rose-400/10 text-rose-400 border border-rose-400/20'}`}>
        <AlertCircle className="w-3 h-3" /> NO DETECTADA
      </span>
    );
  }
  
  return (
    <button 
      onClick={onTest}
      className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-lg transition-colors ${isHighContrast ? 'bg-yellow-900/20 hover:bg-yellow-900/30 border border-yellow-400/30 text-yellow-400' : isLight ? 'bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600' : 'bg-white/5 hover:bg-white/10 border border-white/5 text-muted hover:text-white'}`}
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
  theme?: 'dark' | 'light' | 'high-contrast';
}> = ({ script, copied, hasSelection, onCopy, theme = 'dark' }) => {
  const isHighContrast = theme === 'high-contrast';
  const isLight = theme === 'light';
  
  return (
    <div className={`p-6 rounded-[2.5rem] flex flex-col justify-between h-full space-y-6 ${isHighContrast ? 'bg-yellow-950 border border-yellow-400/30' : isLight ? 'bg-slate-100 border border-slate-200' : 'bg-base border border-white/5'}`}>
      <div>
        <div className={`flex items-center gap-2.5 mb-2 ${isHighContrast ? 'text-yellow-400' : isLight ? 'text-slate-900' : 'text-white'}`}>
          <Terminal className={`w-5 h-5 ${isHighContrast ? 'text-yellow-400' : isLight ? 'text-indigo-500' : 'text-indigo-400'}`} />
          <h4 className={`text-sm font-black uppercase italic tracking-tight ${isHighContrast ? 'text-yellow-400' : isLight ? 'text-slate-900' : 'text-white'}`}>SQL Terminal Clean Up</h4>
        </div>
        
        <p className={`text-xs leading-relaxed ${isHighContrast ? 'text-yellow-500' : isLight ? 'text-slate-600' : 'text-muted'}`}>
          Las políticas de seguridad nativas de Postgres de Supabase previenen que clientes web anónimos ejecuten comandos directos de manipulación de tablas (DDL) sin autenticación de superusuario. 
        </p>

        <div className={`mt-4 p-4.5 rounded-2xl border space-y-2.5 ${isHighContrast ? 'bg-yellow-900/20 border-yellow-400/30' : isLight ? 'bg-indigo-50 border-indigo-200' : 'bg-indigo-500/5 border-indigo-500/10'}`}>
          <h5 className={`text-[10px] uppercase font-black tracking-widest ${isHighContrast ? 'text-yellow-400' : isLight ? 'text-indigo-600' : 'text-indigo-400'}`}>Instrucciones de Limpieza de Tablas:</h5>
          <ol className={`text-[11px] space-y-2 leading-relaxed list-decimal list-inside ${isHighContrast ? 'text-yellow-500' : isLight ? 'text-slate-600' : 'text-muted'}`}>
            <li>Inicia sesión en tu cuenta de <strong className={isHighContrast ? 'text-yellow-300' : isLight ? 'text-indigo-600' : 'text-indigo-300'}>Supabase</strong>.</li>
            <li>Haz clic en la pestaña <strong className={isHighContrast ? 'text-yellow-300' : isLight ? 'text-indigo-600' : 'text-indigo-300'}>"SQL Editor"</strong> en el panel izquierdo.</li>
            <li>Selecciona las tablas recomendadas para eliminación a la izquierda.</li>
            <li>Presiona el botón <strong className={isHighContrast ? 'text-yellow-300' : isLight ? 'text-indigo-600' : 'text-indigo-300'}>"Copiar Script de Limpieza"</strong> abajo.</li>
            <li>Pega el código en el editor SQL de Supabase y haz clic en <strong className={`px-2 py-0.5 rounded font-bold ${isHighContrast ? 'bg-yellow-950 text-yellow-400 border border-yellow-400/30' : isLight ? 'bg-white border border-slate-200 text-slate-900' : 'bg-surface border border-white/10 text-white'}`}>"Run"</strong>.</li>
          </ol>
        </div>

        {/* Generated Code Window */}
        <div className={`mt-5 rounded-2xl overflow-hidden border shadow-lg select-all ${isHighContrast ? 'bg-yellow-950/50 border-yellow-400/30' : isLight ? 'bg-slate-200 border-slate-200' : 'bg-surface/50 border-white/10'}`}>
          <div className={`h-9 flex items-center justify-between px-4 border-b ${isHighContrast ? 'bg-yellow-900/30 border-yellow-400/30' : isLight ? 'bg-slate-200 border-slate-200' : 'bg-surface border-white/5'}`}>
            <span className={`text-[9px] font-bold uppercase tracking-wider ${isHighContrast ? 'text-yellow-500' : isLight ? 'text-slate-500' : 'text-slate-500'}`}>SQL Editor Snippet</span>
            <ShieldCheck className={`w-3.5 h-3.5 ${isHighContrast ? 'text-green-400' : isLight ? 'text-emerald-500' : 'text-emerald-400'}`} />
          </div>
          <pre className={`p-4 font-mono text-[10px] overflow-x-auto max-h-[160px] no-scrollbar leading-tight ${isHighContrast ? 'text-yellow-300 bg-yellow-950/50' : isLight ? 'text-indigo-700 bg-slate-100' : 'text-indigo-300 bg-black/60'}`}>
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
              ? (isHighContrast ? 'bg-yellow-400 text-black hover:bg-yellow-300 shadow-yellow-400/15 active:scale-95' : isLight ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/15 active:scale-95' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/15 active:scale-95')
              : (isHighContrast ? 'bg-yellow-900/20 text-yellow-500 cursor-not-allowed border border-yellow-400/30' : isLight ? 'bg-slate-200 text-muted cursor-not-allowed border border-slate-300' : 'bg-elevated text-slate-500 cursor-not-allowed border border-white/5 shadow-none')
          }`}
        >
          <Copy className="w-4 h-4" />
          {copied ? '¡Copiado con Éxito!' : 'Copiar Script de Limpieza'}
        </button>
      </div>
    </div>
  );
};

const ModalFooter: React.FC<{ onClose: () => void; theme?: 'dark' | 'light' | 'high-contrast' }> = ({ onClose, theme = 'dark' }) => {
  const isHighContrast = theme === 'high-contrast';
  const isLight = theme === 'light';
  
  return (
    <div className={`p-6 md:p-8 border-t flex items-center justify-between shrink-0 rounded-b-[2.5rem] ${isHighContrast ? 'bg-yellow-950/20 border-yellow-400/30' : isLight ? 'bg-slate-50 border-slate-200' : 'bg-base border-white/5'}`}>
      <div className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider ${isHighContrast ? 'text-yellow-500' : isLight ? 'text-slate-500' : 'text-slate-500'}`}>
        <HelpCircle className="w-4 h-4" />
        Las operaciones DROP TABLE son destructivas e irreversibles. Úsalas con precaución.
      </div>
      <button
        onClick={onClose}
        className={`px-5 py-2.5 font-extrabold uppercase text-[10px] tracking-wider rounded-xl transition-all ${isHighContrast ? 'bg-yellow-900/30 hover:bg-yellow-900/50 text-yellow-400 border border-yellow-400/30' : isLight ? 'bg-slate-200 hover:bg-slate-300 text-slate-700 border border-slate-300' : 'bg-elevated hover:bg-slate-700 text-white border border-white/5'}`}
      >
        Cerrar Auditor
      </button>
    </div>
  );
};
