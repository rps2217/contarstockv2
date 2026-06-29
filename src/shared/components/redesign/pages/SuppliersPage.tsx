import React, { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Truck, Plus, Search, Phone, Mail, MapPin, Building2,
  Edit2, Trash2, ChevronRight, Package
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'

// ============================================================================
// Tipos
// ============================================================================
interface Supplier {
  id: string
  name: string
  rut?: string
  phone?: string
  email?: string
  address?: string
  contact?: string
  isActive: boolean
  createdAt: number
}

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

const SupplierRow = ({ supplier }: { supplier: Supplier }) => (
  <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
    className="flex items-center gap-4 p-4 bg-surface hover:bg-elevated rounded-xl transition-colors">
    <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
      <Truck className="w-6 h-6 text-orange-500" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-semibold text-primary truncate">{supplier.name}</p>
      <div className="flex flex-wrap items-center gap-3 mt-1">
        {supplier.rut && <span className="text-xs text-muted font-mono">{supplier.rut}</span>}
        {supplier.phone && (
          <span className="text-xs text-secondary flex items-center gap-1">
            <Phone className="w-3 h-3" />{supplier.phone}
          </span>
        )}
        {supplier.email && (
          <span className="text-xs text-secondary flex items-center gap-1">
            <Mail className="w-3 h-3" />{supplier.email}
          </span>
        )}
      </div>
    </div>
    <div className="flex items-center gap-2">
      <span className={cn(
        'px-2 py-1 rounded-full text-xs font-medium',
        supplier.isActive ? 'bg-emerald-500/20 text-emerald-500' : 'bg-muted/20 text-muted'
      )}>
        {supplier.isActive ? 'Activo' : 'Inactivo'}
      </span>
      <ChevronRight className="w-4 h-4 text-muted" />
    </div>
  </motion.div>
)

// ============================================================================
// Componente principal
// ============================================================================
export const RedesignSuppliersPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('')

  // Datos de suppliers (usando customers como proxy ya que no hay tabla dedicada)
  const suppliers = useLiveQuery(async (): Promise<Supplier[]> => {
    const customers = await db.customers.toArray()
    return customers.slice(0, 10).map(c => ({
      id: c.id?.toString() || Math.random().toString(),
      name: (c as any).company || c.firstName || 'Proveedor',
      rut: c.rut,
      phone: c.phone,
      email: c.email,
      address: (c as any).address,
      contact: `${c.firstName} ${c.lastName}`,
      isActive: (c as any).isActive !== false,
      createdAt: c.createdAt || Date.now()
    }))
  }, [])

  const filtered = useMemo(() => {
    if (!suppliers || !searchQuery) return suppliers || []
    const q = searchQuery.toLowerCase()
    return suppliers.filter(s => 
      s.name?.toLowerCase().includes(q) ||
      s.rut?.includes(q) ||
      s.email?.toLowerCase().includes(q)
    )
  }, [suppliers, searchQuery])

  const stats = useMemo(() => {
    if (!suppliers) return { total: 0, active: 0, inactive: 0 }
    return {
      total: suppliers.length,
      active: suppliers.filter(s => s.isActive).length,
      inactive: suppliers.filter(s => !s.isActive).length
    }
  }, [suppliers])

  if (!suppliers) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-base">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-muted mt-4">Cargando proveedores...</p>
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
              <Truck className="w-8 h-8 text-orange-500" />
              Proveedores
            </h1>
            <p className="text-secondary text-sm mt-2">Gestión de proveedores y distribuidores.</p>
          </div>
          <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-lg shadow-blue-900/20">
            <Plus className="w-4 h-4" />
            Nuevo Proveedor
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
                <Truck className="w-12 h-12 text-muted mx-auto mb-4" />
                <p className="text-muted">
                  {searchQuery ? 'No se encontraron proveedores' : 'No hay proveedores registrados'}
                </p>
                {!searchQuery && (
                  <button className="mt-4 text-blue-500 hover:underline">
                    Agregar el primero
                  </button>
                )}
              </div>
            ) : (
              filtered.map(supplier => (
                <SupplierRow key={supplier.id} supplier={supplier} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
