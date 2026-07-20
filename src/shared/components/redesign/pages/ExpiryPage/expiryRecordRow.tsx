/**
 * =============================================================================
 * EXPIRY RECORD ROW - Fila de registro de vencimiento
 * =============================================================================
 *
 * Componente de fila para la vista de lista de vencimientos.
 *
 * @module ExpiryPage/expiryRecordRow
 */

import React from 'react';
import { motion } from 'framer-motion';
import { CalendarClock, PackageX, Package, MapPin } from 'lucide-react';
import { ExpiryRecord } from '@/features/expiry/hooks/useExpiry';
import { cn } from '@/lib/utils';
import { mapStatus, STATUS_META, MONTHS } from './expiryConstants';

interface RecordRowProps {
  record: ExpiryRecord;
  onClick?: () => void;
}

const formatExpiryDate = (record: ExpiryRecord) => {
  const day = record.expiryDateObj ? record.expiryDateObj.getDate() : 1;
  const month = record.expiryDateObj ? record.expiryDateObj.getMonth() + 1 : record.mm;
  const year = record.expiryDateObj ? record.expiryDateObj.getFullYear() : record.yyyy;
  return { day, month, year };
};

const getExpiryDateColor = (daysLeft: number) => {
  if (daysLeft < 0)
    return { text: 'text-rose-400', bg: 'bg-rose-500/15', border: 'border-rose-500/40' };
  if (daysLeft === 0)
    return { text: 'text-rose-400', bg: 'bg-rose-500/15', border: 'border-rose-500/40' };
  if (daysLeft <= 7)
    return { text: 'text-amber-400', bg: 'bg-amber-500/15', border: 'border-amber-500/40' };
  if (daysLeft <= 30)
    return { text: 'text-yellow-400', bg: 'bg-yellow-500/15', border: 'border-yellow-500/40' };
  return { text: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/40' };
};

const getWithdrawalDateColor = (daysUntilWithdrawal: number, withdrawalDays: number) => {
  if (daysUntilWithdrawal < 0)
    return { text: 'text-rose-400', bg: 'bg-rose-500/15', border: 'border-rose-500/40' };
  if (daysUntilWithdrawal <= 7)
    return { text: 'text-amber-400', bg: 'bg-amber-500/15', border: 'border-amber-500/40' };
  if (daysUntilWithdrawal <= withdrawalDays)
    return { text: 'text-orange-400', bg: 'bg-orange-500/15', border: 'border-orange-500/40' };
  return { text: 'text-blue-400', bg: 'bg-blue-500/15', border: 'border-blue-500/40' };
};

export const RecordRow: React.FC<RecordRowProps> = ({ record, onClick }) => {
  const status = mapStatus(record.status);
  const meta = STATUS_META[status];
  const daysText =
    record.daysLeft < 0
      ? `${Math.abs(record.daysLeft)}d venc`
      : record.daysLeft === 0
        ? 'Vence hoy'
        : `${record.daysLeft}d`;

  const { day: expiryDay, month: expiryMonthNum, year: expiryYear } = formatExpiryDate(record);
  const expiryDateColor = getExpiryDateColor(record.daysLeft);

  const withdrawalDate =
    record.withdrawalDate instanceof Date ? record.withdrawalDate : new Date(record.withdrawalDate);
  const daysUntilWithdrawal = Math.ceil(
    (withdrawalDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  const withdrawalMonth = MONTHS[withdrawalDate.getMonth()];
  const withdrawalDaysText =
    daysUntilWithdrawal < 0
      ? `${Math.abs(daysUntilWithdrawal)}d`
      : daysUntilWithdrawal === 0
        ? 'Hoy'
        : `${daysUntilWithdrawal}d`;
  const withdrawalDateColor = getWithdrawalDateColor(daysUntilWithdrawal, record.withdrawalDays);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-3 p-3 hover:bg-elevated transition-colors group rounded-xl cursor-pointer"
      onClick={onClick}
    >
      <div className={cn('w-1.5 h-12 rounded-full shrink-0', meta.dot)} />
      <div className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center shrink-0">
        <Package className="w-5 h-5 text-muted" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-primary truncate">
            {record.productName || 'Producto sin nombre'}
          </p>
          {record.hasCanje && (
            <span className="px-1.5 py-0.5 bg-indigo-500/20 text-indigo-400 text-[10px] font-bold rounded">
              🏭 CANJE
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
          <span className="text-xs text-muted font-mono">{record.barcode || 'Sin código'}</span>
          {record.location && (
            <span className="text-xs text-secondary flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {record.location}
            </span>
          )}
          {record.providerName && record.providerName !== 'N/A' && (
            <span className="text-xs text-secondary flex items-center gap-1">
              🏭 {record.providerName}
            </span>
          )}
        </div>
      </div>

      <div
        className={cn(
          'shrink-0 px-3 py-2 rounded-xl border text-center min-w-[90px]',
          expiryDateColor.bg,
          expiryDateColor.border
        )}
      >
        <div className="flex items-center justify-center gap-1">
          <CalendarClock className={cn('w-3.5 h-3.5 shrink-0', expiryDateColor.text)} />
          <p className={cn('text-sm font-bold', expiryDateColor.text)}>
            {expiryDay} {MONTHS[expiryMonthNum - 1]}
          </p>
        </div>
        <p className="text-[10px] text-muted mt-0.5">{expiryYear}</p>
      </div>

      <div
        className={cn(
          'shrink-0 px-3 py-2 rounded-xl border text-center min-w-[90px]',
          withdrawalDateColor.bg,
          withdrawalDateColor.border
        )}
      >
        <div className="flex items-center justify-center gap-1">
          <PackageX className={cn('w-3.5 h-3.5 shrink-0', withdrawalDateColor.text)} />
          <p className={cn('text-sm font-bold', withdrawalDateColor.text)}>
            {withdrawalDate.getDate()} {withdrawalMonth}
          </p>
        </div>
        <p className="text-[10px] text-muted mt-0.5">{withdrawalDaysText} retir</p>
      </div>

      <div className="shrink-0 flex flex-col items-center gap-1 min-w-[60px]">
        <span
          className={cn(
            'text-xs font-bold px-2 py-1 rounded-lg border',
            record.daysLeft < 0
              ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
              : record.daysLeft === 0
                ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                : record.daysLeft <= 7
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                  : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
          )}
        >
          {daysText}
        </span>
      </div>
    </motion.div>
  );
};
