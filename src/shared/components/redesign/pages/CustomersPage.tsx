import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, Plus, Search, Phone, Mail, MapPin, Edit2, Trash2, MessageSquare, 
  X, User, Send, ChevronRight, UserCheck, UserX, Clock, CheckCircle2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCustomers } from '@/features/customers/hooks/useCustomers'
import type { Customer } from '@/types'
import { toast } from 'sonner'

// ============================================================================
// Constantes de UI
// ============================================================================
const FILTERS = [
  { value: 'all' as const, label: 'Todos' },
  { value: 'active' as const, label: 'Activos' },
  { value: 'inactive' as const, label: 'Inactivos' },
]

// ============================================================================
// Componentes de UI
// ============================================================================
const SummaryCard = ({ label, value, color = 'text-primary', icon: Icon }: { 
  label: string; value: number; color?: string; icon: React.ElementType 
}) => (
  <motion.div 
    initial={{ opacity: 0, scale: 0.9 }} 
    animate={{ opacity: 1, scale: 1 }}
    className="bg-surface border border-subtle rounded-2xl p-4 flex flex-col gap-3 min-w-[140px]">
    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
      <Icon className={cn('w-5 h-5', color)} />
    </div>
    <div>
      <p className={cn('text-2xl font-bold', color)}>{value}</p>
      <p className="text-xs text-muted mt-1">{label}</p>
    </div>
  </motion.div>
)

const CustomerRow = ({ customer, onClick }: { 
  customer: Customer; 
  onClick: () => void;
}) => {
  const isActive = customer.isActive !== false
  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }} 
      animate={{ opacity: 1, x: 0 }}
      onClick={onClick}
      className="flex items-center gap-3 p-3 hover:bg-elevated transition-colors group cursor-pointer rounded-xl">
      <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
        <User className="w-5 h-5 text-blue-500" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-primary truncate">
            {customer.firstName} {customer.lastName}
          </p>
          {isActive ? (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-500">Activo</span>
          ) : (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-muted/20 text-muted">Inactivo</span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
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
      <ChevronRight className="w-5 h-5 text-muted group-hover:text-primary transition-colors shrink-0" />
    </motion.div>
  )
}

const Section = ({ label, count, icon: Icon, color, children }: {
  label: string;
  count: number;
  icon: React.ElementType;
  color: string;
  children: React.ReactNode;
}) => (
  <div className="bg-surface border border-subtle rounded-2xl overflow-hidden">
    <div className="px-4 py-3 border-b border-subtle flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center bg-blue-500/10')}>
          <Icon className={cn('w-4 h-4', color)} />
        </div>
        <span className="text-sm font-semibold text-primary">{label}</span>
      </div>
      <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full', color.includes('emerald') ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted/10 text-muted')}>
        {count}
      </span>
    </div>
    <div className="flex flex-col divide-y divide-subtle">
      {children}
    </div>
  </div>
)

// ============================================================================
// Modal de Detalle Cliente
// ============================================================================
const CustomerDetailModal = ({
  customer,
  onClose,
  onEdit,
  onDelete,
  onMessage
}: {
  customer: Customer | null;
  onClose: () => void;
  onEdit: (c: Customer) => void;
  onDelete: (id: string) => void;
  onMessage: (c: Customer) => void;
}) => {
  if (!customer) return null
  
  const isActive = customer.isActive !== false

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
        {/* Header con avatar */}
        <div className="relative">
          <div className="h-24 bg-gradient-to-br from-blue-500/20 to-purple-500/20" />
          <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/30 rounded-xl backdrop-blur-sm">
            <X className="w-5 h-5 text-white" />
          </button>
          <div className="absolute -bottom-10 left-4">
            <div className="w-20 h-20 rounded-2xl bg-blue-500 flex items-center justify-center border-4 border-base shadow-lg">
              <User className="w-10 h-10 text-white" />
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="pt-12 px-4 pb-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-primary">
                {customer.firstName} {customer.lastName}
              </h2>
              {customer.rut && <p className="text-sm text-muted font-mono">{customer.rut}</p>}
            </div>
            <span className={cn(
              'px-2 py-1 rounded-full text-xs font-medium',
              isActive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted/20 text-muted'
            )}>
              {isActive ? 'Activo' : 'Inactivo'}
            </span>
          </div>
        </div>

        {/* Detalles */}
        <div className="px-4 pb-4 space-y-3">
          {customer.phone && (
            <div className="flex items-center gap-3 p-3 bg-surface rounded-xl">
              <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Phone className="w-4 h-4 text-blue-500" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted">Teléfono</p>
                <p className="text-sm font-medium text-primary">{customer.phone}</p>
              </div>
            </div>
          )}
          
          {customer.email && (
            <div className="flex items-center gap-3 p-3 bg-surface rounded-xl">
              <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Mail className="w-4 h-4 text-purple-500" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted">Email</p>
                <p className="text-sm font-medium text-primary">{customer.email}</p>
              </div>
            </div>
          )}
          
          {customer.address && (
            <div className="flex items-center gap-3 p-3 bg-surface rounded-xl">
              <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <MapPin className="w-4 h-4 text-amber-500" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted">Dirección</p>
                <p className="text-sm font-medium text-primary">{customer.address}</p>
              </div>
            </div>
          )}

          {customer.notes && (
            <div className="p-3 bg-surface rounded-xl">
              <p className="text-xs text-muted mb-1">Notas</p>
              <p className="text-sm text-secondary">{customer.notes}</p>
            </div>
          )}
        </div>

        {/* Acciones */}
        <div className="p-4 border-t border-subtle flex gap-2">
          {customer.phone && (
            <button 
              onClick={() => { onMessage(customer); onClose(); }}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl font-medium transition-colors">
              <MessageSquare className="w-4 h-4" />
              Mensaje
            </button>
          )}
          <button 
            onClick={() => { onEdit(customer); onClose(); }}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-surface hover:bg-elevated text-primary rounded-xl font-medium transition-colors">
            <Edit2 className="w-4 h-4" />
            Editar
          </button>
          <button 
            onClick={() => {
              if (confirm('¿Eliminar este cliente?')) {
                onDelete(customer.id)
                onClose()
              }
            }}
            className="px-4 py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-xl transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

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
    syncStatus: 'pending',
    isActive: true,
    createdAt: Date.now()
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
        className="bg-base border border-subtle rounded-t-3xl sm:rounded-2xl w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <div className="p-4 border-b border-subtle flex items-center justify-between shrink-0">
            <h2 className="text-lg font-bold text-primary">
              {customer ? 'Editar Cliente' : 'Nuevo Cliente'}
            </h2>
            <button type="button" onClick={onClose} className="p-2 hover:bg-elevated rounded-xl">
              <X className="w-5 h-5 text-muted" />
            </button>
          </div>

          <div className="p-4 space-y-4 overflow-y-auto flex-1">
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

          <div className="p-4 border-t border-subtle flex gap-3 shrink-0">
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
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)

  const filtered = useMemo(() => {
    let result = allCustomers || []
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(c =>
        c.firstName?.toLowerCase().includes(q) ||
        c.lastName?.toLowerCase().includes(q) ||
        c.rut?.includes(q) ||
        c.email?.toLowerCase().includes(q)
      )
    }
    
    if (activeFilter === 'active') {
      result = result.filter(c => c.isActive !== false)
    } else if (activeFilter === 'inactive') {
      result = result.filter(c => c.isActive === false)
    }
    
    return result
  }, [allCustomers, searchQuery, activeFilter])

  // Agrupar por estado
  const { activeCustomers, inactiveCustomers } = useMemo(() => {
    const filteredList = searchQuery ? filtered : allCustomers || []
    return {
      activeCustomers: filteredList.filter(c => c.isActive !== false),
      inactiveCustomers: filteredList.filter(c => c.isActive === false),
    }
  }, [filtered, allCustomers, searchQuery])

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
      <div className="pt-8 px-4 sm:px-6 lg:px-8 shrink-0 border-b border-subtle pb-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-primary tracking-tight flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-500" />
              Clientes
            </h1>
            <p className="text-secondary text-sm mt-1">Gestión de clientes y contactos.</p>
          </div>
          <button onClick={actions.openCreate}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-lg shadow-blue-900/20">
            <Plus className="w-4 h-4" />
            Nuevo
          </button>
        </div>

        {/* Stats */}
        <div className="flex gap-3 overflow-x-auto no-scrollbar">
          <SummaryCard label="Total" value={stats.total} icon={Users} color="text-primary" />
          <SummaryCard label="Activos" value={stats.active} icon={UserCheck} color="text-emerald-500" />
          <SummaryCard label="Inactivos" value={stats.inactive} icon={UserX} color="text-muted" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-4 pb-24">
        <div className="max-w-4xl mx-auto flex flex-col gap-4">
          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
              <input 
                type="text" 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nombre, RUT o email..." 
                className="w-full bg-surface border border-subtle rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-blue-500" 
              />
            </div>
            <div className="flex gap-2">
              {FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setActiveFilter(f.value)}
                  className={cn(
                    'px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors',
                    activeFilter === f.value
                      ? 'bg-blue-500/10 text-blue-500 border border-blue-500/30'
                      : 'bg-surface text-secondary hover:text-primary border border-subtle'
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Lista */}
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
            <>
              {/* Activos */}
              {activeCustomers.length > 0 && (
                <Section 
                  label="Clientes Activos" 
                  count={activeCustomers.length}
                  icon={UserCheck}
                  color="text-emerald-500"
                >
                  {activeCustomers.map(customer => (
                    <CustomerRow
                      key={customer.id}
                      customer={customer}
                      onClick={() => setSelectedCustomer(customer)}
                    />
                  ))}
                </Section>
              )}

              {/* Inactivos */}
              {inactiveCustomers.length > 0 && (
                <Section 
                  label="Clientes Inactivos" 
                  count={inactiveCustomers.length}
                  icon={UserX}
                  color="text-muted"
                >
                  {inactiveCustomers.map(customer => (
                    <CustomerRow
                      key={customer.id}
                      customer={customer}
                      onClick={() => setSelectedCustomer(customer)}
                    />
                  ))}
                </Section>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {selectedCustomer && (
          <CustomerDetailModal
            customer={selectedCustomer}
            onClose={() => setSelectedCustomer(null)}
            onEdit={actions.openEdit}
            onDelete={actions.deleteCustomer}
            onMessage={actions.openSendMessage}
          />
        )}
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
