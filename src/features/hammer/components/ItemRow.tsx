import React from 'react'
import { motion } from 'framer-motion'
import { MapPin, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { HammerItem } from '@/features/hammer/hooks/useHammerLogic'

interface ItemRowProps {
  item: HammerItem
  onRemove: (barcode: string) => void
  onSelect: (barcode: string) => void
  isActive: boolean
}

export const ItemRow: React.FC<ItemRowProps> = ({ item, onRemove, onSelect, isActive }) => {
  const diff = item.expectedQty !== undefined ? item.totalQuantity - item.expectedQty : 0
  const diffColor = diff === 0 ? 'text-emerald-500' : diff > 0 ? 'text-blue-500' : 'text-rose-500'
  const diffLabel = diff === 0 ? 'OK' : diff > 0 ? `+${diff}` : `${diff}`

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={cn(
        'flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer',
        isActive ? 'bg-blue-500/20 border border-blue-500/50' : 'bg-surface hover:bg-elevated border border-transparent'
      )}
      onClick={() => onSelect(item.barcode)}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-primary truncate">{item.name}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-xs text-muted font-mono bg-elevated px-1.5 py-0.5 rounded">{item.barcode}</span>
          {item.loc && (
            <span className="text-xs text-secondary bg-elevated px-1.5 py-0.5 rounded flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {item.loc}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {item.expectedQty !== undefined && (
          <div className="text-right">
            <span className="text-[10px] text-muted">ESP</span>
            <p className="text-sm font-mono text-muted">{item.expectedQty}</p>
          </div>
        )}
        <div className="w-14 text-center bg-elevated rounded-lg py-1">
          <p className="text-xl font-bold text-primary">{item.totalQuantity}</p>
          {item.expectedQty !== undefined && (
            <p className={cn('text-xs font-mono', diffColor)}>{diffLabel}</p>
          )}
        </div>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(item.barcode); }}
        className="w-8 h-8 rounded-lg hover:bg-rose-500/20 flex items-center justify-center transition-colors shrink-0"
      >
        <Trash2 className="w-4 h-4 text-rose-500" />
      </button>
    </motion.div>
  )
}
