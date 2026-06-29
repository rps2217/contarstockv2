import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, Plus, Search, Phone, Mail,
  Edit2, Trash2, MessageSquare, X, User, Send
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCustomers } from '@/features/customers/hooks/useCustomers'
import type { Customer } from '@/types'
import { toast } from 'sonner'

// ============================================================================
// Componentes
// ============================================================================
const StatCard = ({ label, value, color = 'text-primary' }: { label: string; value: number; color?: string }) => (
  <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
    className="bg-surface border border-subtle rounded-xl p-4">
    <p className={cn('text-2xl font-bold', color)}>{value}</p>
    <p className="text-xs text-muted">{label}</p>
  </motion.div>
)

const CustomerRow = ({ customer, onEdit, onDelete, onMessage }: {
  customer: Customer; 
  onEdit: (c: Customer) => void; 
  onDelete: (id: string) => void;
  onMessage: (c: Customer) => void;
}) => (
  <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
    className="flex items-center gap-4 p-4 bg-surface hover:bg-elevated rounded-xl transition-colors">
    <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
      <User className="w-6 h-6 text-blue-500" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-semibold text-primary truncate">
        {customer.firstName} {customer.lastName}
      </p>
      <div className="flex flex-wrap items-center gap-3 mt-1">
        {customer.rut && <span className="text-xs text-muted font-mono">{customer.rut}</span>}
        {customer.phone && (
          <span className="text-xs text-secondary flex items-center gap-1">
            <Phone className="w-3 h-3" />{customer.phone}
          </span>
        )}
        {customer.email && (
          <span className="text-xs text-secondary flex items-center gap-1">
            <Mail className="w-3 h-3" />{customer.email}
          </span>
        )}
      </div>
    </div>
    <div className="flex items-center gap-1">
      {customer.phone && (
        <button onClick={() => onMessage(customer)}
          className="p-2 rounded-lg hover:bg-emerald-500/20 transition-colors" title="Enviar mensaje">
          <MessageSquare className="w-4 h-4 text-emerald-500" />
        </button>
      )}
      <button onClick={() => onEdit(customer)}
        className="p-2 rounded-lg hover:bg-blue-500/20 transition-colors" title="Editar">
        <Edit2 className="w-4 h-4 text-muted" />
      </button>
      <button onClick={() => {
        if (confirm('¿Eliminar este cliente?')) onDelete(customer.id)
      }}
        className="p-2 rounded-lg hover:bg-rose-500/20 transition-colors" title="Eliminar">
        <Trash2 className="w-4 h-4 text-rose-500" />
      </button>
    </div>
  </motion.div>
)

// ============================================================================
// Modal de Formulario Cliente
// ============================================================================
const CustomerFormModal = ({ 
  customer, 
  onClose, 
  onSave 
}: { 
  customer: Customer | null; 
  onClose: () => void; 
  onSave: (c: Customer) => void;
}) => {
  const [form, setForm] = useState<Customer>(customer || {
    id: '',
    firstName: '',
    lastName: '',
    rut: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
    syncStatus: 'pending'
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.firstName.trim()) {
      toast.error('El nombre es requerido')
      return
    }
    onSave(form)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="bg-base border border-subtle rounded-t-3xl sm:rounded-2xl w-full max-w-md max-h-[85vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          <div className="p-4 border-b border-subtle flex items-center justify-between">
            <h2 className="text-lg font-bold text-primary">
              {customer ? 'Editar Cliente' : 'Nuevo Cliente'}
            </h2>
            <button type="button" onClick={onClose} className="p-2 hover:bg-elevated rounded-xl">
              <X className="w-5 h-5 text-muted" />
            </button>
          </div>

          <div className="p-4 space-y-4 overflow-y-auto max-h-[60vh]">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted mb-1 block">Nombre *</label>
                <input
                  type="text"
                  value={form.firstName}
                  onChange={e => setForm({ ...form, firstName: e.target.value })}
                  className="w-full bg-surface border border-subtle rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                  placeholder="Juan"
                />
              </div>
              <div>
                <label className="text-xs text-muted mb-1 block">Apellido</label>
                <input
                  type="text"
                  value={form.lastName}
                  onChange={e => setForm({ ...form, lastName: e.target.value })}
                  className="w-full bg-surface border border-subtle rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                  placeholder="Pérez"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-muted mb-1 block">RUT</label>
              <input
                type="text"
                value={form.rut}
                onChange={e => setForm({ ...form, rut: e.target.value })}
                className="w-full bg-surface border border-subtle rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                placeholder="12.345.678-9"
              />
            </div>

            <div>
              <label className="text-xs text-muted mb-1 block">Teléfono</label>
              <input
                type="tel"
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                className="w-full bg-surface border border-subtle rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                placeholder="+56 9 1234 5678"
              />
            </div>

            <div>
              <label className="text-xs text-muted mb-1 block">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                className="w-full bg-surface border border-subtle rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                placeholder="correo@ejemplo.com"
              />
            </div>

            <div>
              <label className="text-xs text-muted mb-1 block">Dirección</label>
              <input
                type="text"
                value={form.address}
                onChange={e => setForm({ ...form, address: e.target.value })}
                className="w-full bg-surface border border-subtle rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                placeholder="Av. Principal 123"
              />
            </div>

            <div>
              <label className="text-xs text-muted mb-1 block">Notas</label>
              <textarea
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                rows={3}
                className="w-full bg-surface border border-subtle rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 resize-none"
                placeholder="Notas adicionales..."
              />
            </div>
          </div>

          <div className="p-4 border-t border-subtle flex gap-3">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 bg-surface hover:bg-elevated text-primary rounded-xl font-medium transition-colors">
              Cancelar
            </button>
            <button type="submit"
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-colors">
              {customer ? 'Guardar' : 'Crear'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

// ============================================================================
// Modal de Enviar Mensaje
// ============================================================================
const SendMessageModal = ({ 
  customer, 
  onClose 
}: { 
  customer: Customer | null; 
  onClose: () => void;
}) => {
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error('Escribe un mensaje')
      return
    }
    setSending(true)
    await new Promise(r => setTimeout(r, 1000))
    toast.success('Mensaje enviado')
    setSending(false)
    onClose()
  }

  if (!customer) return null

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="bg-base border border-subtle rounded-t-3xl sm:rounded-2xl w-full max-w-md"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b border-subtle flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <Send className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-primary">Enviar mensaje</p>
              <p className="text-xs text-muted">{customer.phone}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-elevated rounded-xl">
            <X className="w-5 h-5 text-muted" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="text-xs text-muted mb-1 block">Mensaje</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={5}
              className="w-full bg-surface border border-subtle rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 resize-none"
              placeholder="Escribe tu mensaje..."
              autoFocus
            />
          </div>
        </div>

        <div className="p-4 border-t border-subtle flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-3 bg-surface hover:bg-elevated text-primary rounded-xl font-medium transition-colors">
            Cancelar
          </button>
          <button onClick={handleSend} disabled={sending}
            className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
            {sending ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Enviar
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ============================================================================
// Componente principal
// ============================================================================
export const RedesignCustomersPage: React.FC = () => {
  const { allCustomers, stats, isLoading, ui, actions } = useCustomers()
  const [searchQuery, setSearchQuery] = useState('')

  const filtered = useMemo(() => {
    if (!searchQuery) return allCustomers
    const q = searchQuery.toLowerCase()
    return allCustomers.filter(c =>
      c.firstName?.toLowerCase().includes(q) ||
      c.lastName?.toLowerCase().includes(q) ||
      c.rut?.includes(q) ||
      c.email?.toLowerCase().includes(q)
    )
  }, [allCustomers, searchQuery])

  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-base">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-muted mt-4">Cargando clientes...</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-base">
      {/* Header */}
      <div className="pt-8 px-4 sm:px-6 lg:px-8 shrink-0">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-primary tracking-tight flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-500" />
              Clientes
            </h1>
            <p className="text-secondary text-sm mt-2">Gestión de clientes y contactos.</p>
          </div>
          <button onClick={actions.openCreate}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-lg shadow-blue-900/20">
            <Plus className="w-4 h-4" />
            Nuevo Cliente
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <StatCard label="Total" value={stats.total} />
          <StatCard label="Activos" value={stats.active} color="text-emerald-500" />
          <StatCard label="Inactivos" value={stats.inactive} color="text-muted" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="max-w-4xl mx-auto flex flex-col gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre, RUT o email..."
              className="w-full bg-surface border border-subtle rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-blue-500" />
          </div>

          {/* List */}
          <div className="flex flex-col gap-2">
            {filtered.length === 0 ? (
              <div className="bg-surface border border-subtle rounded-2xl p-8 text-center">
                <Users className="w-12 h-12 text-muted mx-auto mb-4" />
                <p className="text-muted">
                  {searchQuery ? 'No se encontraron clientes' : 'No hay clientes registrados'}
                </p>
                {!searchQuery && (
                  <button onClick={actions.openCreate}
                    className="mt-4 text-blue-500 hover:underline">
                    Agregar el primero
                  </button>
                )}
              </div>
            ) : (
              filtered.map(customer => (
                <CustomerRow
                  key={customer.id}
                  customer={customer}
                  onEdit={actions.openEdit}
                  onDelete={actions.deleteCustomer}
                  onMessage={actions.openSendMessage}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {ui.isFormOpen && (
          <CustomerFormModal
            customer={ui.editingCustomer}
            onClose={actions.closeForm}
            onSave={actions.saveCustomer}
          />
        )}
        {ui.isSendModalOpen && ui.selectedCustomerForMessage && (
          <SendMessageModal
            customer={ui.selectedCustomerForMessage}
            onClose={actions.closeSendMessage}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
