/**
 * =============================================================================
 * EXPIRY SECTION - Sección colapsable para lista de vencimientos
 * =============================================================================
 *
 * Componente de sección con colapsable para la vista de lista.
 *
 * @module ExpiryPage/expirySection
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { ExpiryRecord } from '@/features/expiry/hooks/useExpiry';
import { cn } from '@/lib/utils';
import { RecordRow } from './expiryRecordRow';
import { STATUS_META, type UxExpiryStatus } from './expiryConstants';

interface SectionProps {
  status: UxExpiryStatus;
  records: ExpiryRecord[];
  isOpen: boolean;
  onToggle: () => void;
  onRecordClick: (record: ExpiryRecord) => void;
}

export const Section: React.FC<SectionProps> = ({
  status,
  records,
  isOpen,
  onToggle,
  onRecordClick,
}) => {
  const meta = STATUS_META[status];
  const Icon = meta.icon;

  return (
    <div
      className={cn(
        'bg-surface border border-subtle rounded-2xl overflow-hidden',
        records.length === 0 && 'opacity-60'
      )}
    >
      <button
        onClick={onToggle}
        disabled={records.length === 0}
        className={cn(
          'w-full px-4 py-3 flex items-center justify-between hover:bg-elevated transition-colors',
          records.length === 0 && 'cursor-not-allowed'
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'w-9 h-9 rounded-xl flex items-center justify-center border',
              meta.bg,
              meta.border
            )}
          >
            <Icon className={cn('w-4 h-4', meta.text)} />
          </div>
          <div className="text-left">
            <span className="text-sm font-semibold text-primary">{meta.label}</span>
            <span className="text-xs text-muted ml-2 font-mono">{records.length} registros</span>
          </div>
        </div>
        {records.length > 0 && (
          <motion.div animate={{ rotate: isOpen ? 90 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronRight className="w-4 h-4 text-muted" />
          </motion.div>
        )}
      </button>
      <AnimatePresence initial={false}>
        {isOpen && records.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="divide-y divide-subtle border-t border-subtle px-2 py-2">
              {records.slice(0, 20).map(r => (
                <RecordRow key={r.id} record={r} onClick={() => onRecordClick(r)} />
              ))}
              {records.length > 20 && (
                <p className="text-center py-3 text-xs text-muted">
                  Mostrando 20 de {records.length}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
