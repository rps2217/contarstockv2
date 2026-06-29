import React, { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Users, Plus, Search, Phone, Mail, MapPin, MoreVertical,
  Edit2, Trash2, MessageSquare, ChevronRight, X, User
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCustomers } from '@/features/customers/hooks/useCustomers'
import type { Customer } from '@/types'

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

const CustomerRow = ({ customer, onEdit, onDelete }: { 
  customer: Customer; onEdit: (c: Customer) => void; onDelete: (id: string) => void 
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
    <div className="flex items-center gap-2">
      <button onClick={() => onEdit(customer)}
        className="p-2 rounded-lg hover:bg-blue-500/20 transition-colors">
        <Edit2 className="w-4 h-4 text-muted" />
      </button>
      <button onClick={() => onDelete(customer.id)}
        className="p-2 rounded-lg hover:bg-rose-500/20 transition-colors">
        <Trash2 className="w-4 h-4 text-rose-500" />
      </button>
      <ChevronRight className="w-4 h-4 text-muted" />
    </div>
  </motion.div>
)

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
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
