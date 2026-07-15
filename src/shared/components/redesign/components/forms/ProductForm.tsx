import React, { useState } from 'react'
import { logger } from '@/services/logger';

import { motion } from 'framer-motion'
import { X, Package, Save, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Product } from '@/types'

interface ProductFormProps {
  product?: Product
  onSave: (data: Partial<Product>) => Promise<void>
  onClose: () => void
}

export const ProductForm: React.FC<ProductFormProps> = ({ product, onSave, onClose }) => {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: product?.name || '',
    sku: product?.sku || '',
    barcode: product?.barcode || '',
    stock: product?.stock ?? 0,
    minStock: product?.minStock ?? 0,
    price: product?.price ?? 0,
    category: product?.category || '',
    location: product?.location || '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onSave(form)
      onClose()
    } catch (error) {
      console.error('Error saving product:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-surface border border-subtle rounded-3xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-primary flex items-center gap-2">
            <Package className="w-6 h-6 text-blue-500" />
            {product ? 'Editar Producto' : 'Nuevo Producto'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-base rounded-xl transition-colors">
            <X className="w-5 h-5 text-muted" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">Nombre *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-base border border-subtle rounded-xl px-4 py-2.5 text-primary focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary mb-1">SKU</label>
              <input
                type="text"
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
                className="w-full bg-base border border-subtle rounded-xl px-4 py-2.5 text-primary focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary mb-1">Código de Barras</label>
              <input
                type="text"
                value={form.barcode}
                onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                className="w-full bg-base border border-subtle rounded-xl px-4 py-2.5 text-primary focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary mb-1">Stock</label>
              <input
                type="number"
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })}
                className="w-full bg-base border border-subtle rounded-xl px-4 py-2.5 text-primary focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary mb-1">Stock Mín</label>
              <input
                type="number"
                value={form.minStock}
                onChange={(e) => setForm({ ...form, minStock: Number(e.target.value) })}
                className="w-full bg-base border border-subtle rounded-xl px-4 py-2.5 text-primary focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary mb-1">Precio</label>
              <input
                type="number"
                step="0.01"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                className="w-full bg-base border border-subtle rounded-xl px-4 py-2.5 text-primary focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary mb-1">Categoría</label>
              <input
                type="text"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full bg-base border border-subtle rounded-xl px-4 py-2.5 text-primary focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary mb-1">Ubicación</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="w-full bg-base border border-subtle rounded-xl px-4 py-2.5 text-primary focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-base border border-subtle rounded-xl text-primary font-medium hover:bg-elevated transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !form.name}
              className={cn(
                'flex-1 px-4 py-3 bg-blue-600 rounded-xl text-white font-medium flex items-center justify-center gap-2 transition-colors',
                loading || !form.name ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-500'
              )}
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Guardar
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
