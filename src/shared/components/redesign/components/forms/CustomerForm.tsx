import React, { useState } from 'react'
import { logger } from '@/services/logger';

import { motion } from 'framer-motion'
import { X, User, Save, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Customer } from '@/types'

interface CustomerFormProps {
  customer?: Partial<Customer>
  onSave: (data: Partial<Customer>) => Promise<void>
  onClose: () => void
}

export const CustomerForm: React.FC<CustomerFormProps> = ({ customer, onSave, onClose }) => {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    firstName: customer?.firstName || '',
    lastName: customer?.lastName || '',
    phone: customer?.phone || '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onSave(form)
      onClose()
    } catch (err: unknown) {
      logger.error('CustomerForm', 'Error saving customer', err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-surface border border-subtle rounded-3xl p-6 max-w-lg w-full"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-primary flex items-center gap-2">
            <User className="w-6 h-6 text-emerald-500" />
            {customer ? 'Editar Cliente' : 'Nuevo Cliente'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-base rounded-xl"><X className="w-5 h-5 text-muted" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary mb-1">Nombre *</label>
              <input type="text" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className="w-full bg-base border border-subtle rounded-xl px-4 py-2.5 text-primary focus:outline-none focus:border-emerald-500" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary mb-1">Apellido</label>
              <input type="text" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className="w-full bg-base border border-subtle rounded-xl px-4 py-2.5 text-primary focus:outline-none focus:border-emerald-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">Telefono</label>
            <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full bg-base border border-subtle rounded-xl px-4 py-2.5 text-primary focus:outline-none focus:border-emerald-500" />
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-3 bg-base border border-subtle rounded-xl text-primary font-medium hover:bg-elevated transition-colors">Cancelar</button>
            <button type="submit" disabled={loading || !form.firstName} className={cn('flex-1 px-4 py-3 bg-emerald-500 rounded-xl text-white font-medium flex items-center justify-center gap-2', loading || !form.firstName ? 'opacity-50 cursor-not-allowed' : 'hover:bg-emerald-400')}>
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Guardar
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
