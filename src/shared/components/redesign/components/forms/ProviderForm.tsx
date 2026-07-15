import React, { useState } from 'react'
import { logger } from '@/services/logger';

import { motion } from 'framer-motion'
import { X, Truck, Save, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Provider } from '@/types'

interface ProviderFormProps {
  provider?: Provider
  onSave: (data: Partial<Provider>) => Promise<void>
  onClose: () => void
}

export const ProviderForm: React.FC<ProviderFormProps> = ({ provider, onSave, onClose }) => {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: provider?.name || '',
    rut: provider?.rut || '',
    email: provider?.email || '',
    phone: provider?.phone || '',
    address: provider?.address || '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onSave(form)
      onClose()
    } catch (error) {
      console.error('Error saving provider:', error)
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
            <Truck className="w-6 h-6 text-amber-500" />
            {provider ? 'Editar Proveedor' : 'Nuevo Proveedor'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-base rounded-xl"><X className="w-5 h-5 text-muted" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">Nombre *</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full bg-base border border-subtle rounded-xl px-4 py-2.5 text-primary focus:outline-none focus:border-amber-500" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">RUT</label>
            <input type="text" value={form.rut} onChange={(e) => setForm({ ...form, rut: e.target.value })} className="w-full bg-base border border-subtle rounded-xl px-4 py-2.5 text-primary focus:outline-none focus:border-amber-500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary mb-1">Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full bg-base border border-subtle rounded-xl px-4 py-2.5 text-primary focus:outline-none focus:border-amber-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary mb-1">Telefono</label>
              <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full bg-base border border-subtle rounded-xl px-4 py-2.5 text-primary focus:outline-none focus:border-amber-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">Direccion</label>
            <input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="w-full bg-base border border-subtle rounded-xl px-4 py-2.5 text-primary focus:outline-none focus:border-amber-500" />
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-3 bg-base border border-subtle rounded-xl text-primary font-medium hover:bg-elevated transition-colors">Cancelar</button>
            <button type="submit" disabled={loading || !form.name} className={cn('flex-1 px-4 py-3 bg-amber-500 rounded-xl text-white font-medium flex items-center justify-center gap-2', loading || !form.name ? 'opacity-50 cursor-not-allowed' : 'hover:bg-amber-400')}>
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Guardar
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
