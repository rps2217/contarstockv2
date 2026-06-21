/**
 * RecordDetailView - Vista Detalle Estilo AppSheet
 * 
 * Proporciona una vista completa de registro con:
 * - Header con información clave
 * - Secciones colapsables
 * - Tabs: Detalle | Historial | Acciones
 * - Acciones rápidas
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  Pencil,
  Trash2,
  Copy,
  Clock,
  FileText,
  Zap,
  MoreVertical,
  RefreshCw,
  ExternalLink,
  Shield,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2
} from 'lucide-react';
import { AuditPanel } from './AuditPanel';
import { useAudit } from '@/hooks/useAudit';

export interface InfoRow {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  copyable?: boolean;
}

export interface Section {
  id: string;
  title: string;
  icon?: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  rows?: InfoRow[];
  content?: React.ReactNode;
}

export interface RecordDetailViewProps {
  /** Título del registro */
  title: string;
  /** Subtítulo / descripción */
  subtitle?: string;
  /** Icono principal */
  icon?: React.ReactNode;
  /** Color del header (badge) */
  status?: 'success' | 'warning' | 'error' | 'info' | 'default';
  statusLabel?: string;
  /** Secciones de información */
  sections: Section[];
  /** Tabs adicionales */
  tabs?: ('detail' | 'history' | 'actions')[];
  /** Tab activo por defecto */
  defaultTab?: 'detail' | 'history' | 'actions';
  /** ID del registro para auditoría */
  recordId?: string;
  /** Nombre de tabla para auditoría */
  tableName?: string;
  /** Acciones disponibles */
  actions?: Array<{
    id: string;
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'danger';
    loading?: boolean;
  }>;
  /** Metadata (creado, actualizado, etc.) */
  metadata?: Array<{
    label: string;
    value: string;
    icon?: React.ReactNode;
  }>;
  /** Callbacks */
  onEdit?: () => void;
  onDelete?: () => void;
  onClose?: () => void;
  onRefresh?: () => void;
  /** Loading state */
  loading?: boolean;
  /** Info de estado del sync */
  syncStatus?: 'synced' | 'pending' | 'error';
  lastSyncTime?: number;
}

// Componente de fila de información
const InfoRow: React.FC<InfoRow & { index: number }> = ({ label, value, icon, copyable, index }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (copyable && typeof value === 'string') {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex items-start justify-between py-3 border-b border-slate-800 last:border-0"
    >
      <div className="flex items-center gap-2 min-w-[120px]">
        {icon && <span className="text-slate-500">{icon}</span>}
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
          {label}
        </span>
      </div>
      <div 
        className={`flex-1 text-right font-medium text-sm ${
          copyable ? 'cursor-pointer hover:text-blue-400' : ''
        }`}
        onClick={handleCopy}
      >
        <span className="text-slate-200">{value}</span>
        {copyable && (
          <span className="ml-2">
            {copied ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 inline" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-slate-500 inline" />
            )}
          </span>
        )}
      </div>
    </motion.div>
  );
};

// Componente de sección colapsable
const CollapsibleSection: React.FC<Section & { children?: React.ReactNode }> = ({
  title,
  icon,
  collapsible = true,
  defaultOpen = true,
  rows,
  content,
  children
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="bg-slate-900/50 rounded-2xl border border-slate-800 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => collapsible && setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between p-4 text-left transition-colors ${
          collapsible ? 'hover:bg-slate-800/30 cursor-pointer' : ''
        }`}
      >
        <div className="flex items-center gap-2">
          {icon && <span className="text-blue-400">{icon}</span>}
          <span className="text-xs font-black text-slate-300 uppercase tracking-wider">
            {title}
          </span>
        </div>
        {collapsible && (
          isOpen ? (
            <ChevronDown className="w-4 h-4 text-slate-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-500" />
          )
        )}
      </button>

      {/* Content */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">
              {rows && rows.map((row, i) => (
                <InfoRow key={i} {...row} index={i} />
              ))}
              {content}
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Badge de estado
const StatusBadge: React.FC<{ status: 'success' | 'warning' | 'error' | 'info' | 'default'; label?: string }> = ({ 
  status, 
  label 
}) => {
  const config = {
    success: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
    warning: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
    error: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20' },
    info: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
    default: { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/20' },
  };
  const c = config[status];

  return label ? (
    <span className={`px-2.5 py-1 text-[10px] font-black uppercase rounded-full border ${c.bg} ${c.text} ${c.border}`}>
      {label}
    </span>
  ) : null;
};

export const RecordDetailView: React.FC<RecordDetailViewProps> = ({
  title,
  subtitle,
  icon,
  status = 'default',
  statusLabel,
  sections,
  tabs = ['detail', 'history'],
  defaultTab = 'detail',
  recordId,
  tableName,
  actions = [],
  metadata = [],
  onEdit,
  onDelete,
  onClose,
  onRefresh,
  loading = false,
  syncStatus,
  lastSyncTime,
}) => {
  const [activeTab, setActiveTab] = useState<'detail' | 'history' | 'actions'>(defaultTab);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const { getTableHistory } = useAudit();

  // Reset tab when recordId changes
  useEffect(() => {
    setActiveTab(defaultTab);
  }, [recordId, defaultTab]);

  const formatTimestamp = (ts?: number) => {
    if (!ts) return 'N/A';
    return format(new Date(ts), "dd MMM yyyy, HH:mm", { locale: es });
  };

  const getSyncIcon = () => {
    switch (syncStatus) {
      case 'synced':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
      case 'pending':
        return <Clock className="w-3.5 h-3.5 text-amber-400" />;
      case 'error':
        return <XCircle className="w-3.5 h-3.5 text-rose-400" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-950">
      {/* Header */}
      <div className="bg-slate-900/80 border-b border-slate-800 p-4 shrink-0">
        <div className="flex items-start justify-between gap-4">
          {/* Left: Back + Title */}
          <div className="flex items-start gap-3">
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            <div>
              <div className="flex items-center gap-2 mb-1">
                {icon && <span className="text-blue-400">{icon}</span>}
                <h1 className="text-lg font-black text-white uppercase tracking-tight">
                  {title}
                </h1>
                <StatusBadge status={status} label={statusLabel} />
              </div>
              {subtitle && (
                <p className="text-sm text-slate-400 ml-0">{subtitle}</p>
              )}
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                title="Actualizar"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
            
            <div className="relative">
              <button
                onClick={() => setShowActionsMenu(!showActionsMenu)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              
              <AnimatePresence>
                {showActionsMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute right-0 top-full mt-2 w-48 bg-slate-900 border border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden"
                  >
                    {onEdit && (
                      <button
                        onClick={() => { onEdit(); setShowActionsMenu(false); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:bg-slate-800 transition-colors"
                      >
                        <Pencil className="w-4 h-4 text-blue-400" />
                        Editar
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => { onDelete(); setShowActionsMenu(false); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-rose-400 hover:bg-slate-800 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        Eliminar
                      </button>
                    )}
                    {actions.map(action => (
                      <button
                        key={action.id}
                        onClick={() => { action.onClick(); setShowActionsMenu(false); }}
                        disabled={action.loading}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-slate-800 transition-colors ${
                          action.variant === 'danger' ? 'text-rose-400' : 'text-slate-300'
                        } ${action.loading ? 'opacity-50' : ''}`}
                      >
                        {action.icon && (
                          <span className={action.variant === 'danger' ? 'text-rose-400' : 'text-blue-400'}>
                            {action.icon}
                          </span>
                        )}
                        {action.label}
                        {action.loading && <Loader2 className="w-4 h-4 animate-spin ml-auto" />}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Sync Status */}
        {syncStatus && (
          <div className="flex items-center gap-2 mt-3 text-[10px] text-slate-500">
            {getSyncIcon()}
            <span>
              {syncStatus === 'synced' && 'Sincronizado'}
              {syncStatus === 'pending' && 'Pendiente de sincronizar'}
              {syncStatus === 'error' && 'Error de sincronización'}
              {lastSyncTime && ` • ${formatTimestamp(lastSyncTime)}`}
            </span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-950/50 p-1 shrink-0">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 text-[11px] font-black uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2 ${
              activeTab === tab
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {tab === 'detail' && <FileText className="w-3.5 h-3.5" />}
            {tab === 'history' && <Clock className="w-3.5 h-3.5" />}
            {tab === 'actions' && <Zap className="w-3.5 h-3.5" />}
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        <AnimatePresence mode="wait">
          {activeTab === 'detail' && (
            <motion.div
              key="detail"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {sections.map(section => (
                <CollapsibleSection key={section.id} {...section} />
              ))}
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {recordId && tableName ? (
                <AuditPanel
                  tableName={tableName}
                  loadHistory={getTableHistory}
                  title="Historial de Cambios"
                  limit={50}
                />
              ) : (
                <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-8 text-center">
                  <Clock className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-sm text-slate-400">
                    Historial no disponible
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Se necesita ID de registro y nombre de tabla
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'actions' && (
            <motion.div
              key="actions"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-3"
            >
              {actions.map(action => (
                <button
                  key={action.id}
                  onClick={action.onClick}
                  disabled={action.loading}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                    action.variant === 'primary'
                      ? 'bg-blue-600/10 border-blue-500/30 text-blue-400 hover:bg-blue-600/20'
                      : action.variant === 'danger'
                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20'
                      : 'bg-slate-900/50 border-slate-800 text-slate-300 hover:bg-slate-900 hover:border-slate-700'
                  } ${action.loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {action.icon && (
                    <span className={action.variant === 'primary' ? 'text-blue-400' : action.variant === 'danger' ? 'text-rose-400' : 'text-slate-400'}>
                      {action.icon}
                    </span>
                  )}
                  <span className="font-bold text-sm">{action.label}</span>
                  {action.loading && <Loader2 className="w-4 h-4 animate-spin ml-auto" />}
                  <ChevronRight className="w-4 h-4 text-slate-500 ml-auto" />
                </button>
              ))}

              {actions.length === 0 && (
                <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-8 text-center">
                  <Zap className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-sm text-slate-400">
                    No hay acciones disponibles
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer: Metadata */}
      {metadata.length > 0 && (
        <div className="border-t border-slate-800 p-4 bg-slate-900/30 shrink-0">
          <div className="grid grid-cols-2 gap-4 text-[10px]">
            {metadata.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                {item.icon && <span className="text-slate-500">{item.icon}</span>}
                <span className="text-slate-500">{item.label}:</span>
                <span className="text-slate-400 font-medium">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RecordDetailView;
