import React, { useState, useMemo, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Database,
  Users,
  Truck,
  ClipboardList,
  Search,
  Filter,
  Package,
  AlertCircle,
  Pencil,
  Trash2,
  Loader2,
  Plus,
  Eye,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { ProductForm } from '../components/forms/ProductForm'
import { CustomerForm } from '../components/forms/CustomerForm'
import { ProviderForm } from '../components/forms/ProviderForm'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'

const TABS = [
  { id: 'inventario', label: 'Inventario', icon: Database },
  { id: 'clientes', label: 'Clientes', icon: Users },
  { id: 'proveedores', label: 'Proveedores', icon: Truck },
  { id: 'ordenes', label: 'Órdenes', icon: ClipboardList },
]

// ============================================================================
// Componentes de UI - Estilo HammerPage
// ============================================================================
const StatCard = ({ icon: Icon, label, value, color = 'text-primary' }: {
  icon: React.ElementType; label: string; value: number | string; color?: string
}) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    className="bg-surface border border-subtle rounded-xl p-3 flex items-center gap-3"
  >
    <div className="w-10 h-10 rounded-lg bg-elevated flex items-center justify-center shrink-0">
      <Icon className={cn('w-5 h-5', color)} />
    </div>
    <div className="min-w-0">
      <p className={cn('text-lg font-bold', color)}>{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  </motion.div>
)

// ============================================================================
// Card de Producto - Estilo ReceptionPage
// ============================================================================
const ProductCard = ({
  product,
  onEdit,
  onDelete,
  isDeleting
}: {
  product: any
  onEdit: () => void
  onDelete: () => void
  isDeleting: boolean
}) => {
  const isOutOfStock = (product.stock || 0) === 0
  const isLowStock = (product.stock || 0) > 0 && (product.stock || 0) <= (product.minStock || 10)
  
  const stockColor = isOutOfStock ? 'text-rose-500' : isLowStock ? 'text-amber-500' : 'text-emerald-500'
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-surface border border-subtle rounded-xl overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl bg-elevated flex items-center justify-center shrink-0">
          <Package className="w-6 h-6 text-blue-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-primary truncate flex-1">
              {product.name || 'Sin nombre'}
            </h3>
            {isOutOfStock && <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />}
            {isLowStock && !isOutOfStock && <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            <span className="font-mono">{product.barcode || product.sku || 'Sin código'}</span>
            {product.category && <span>{product.category}</span>}
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className={cn('text-lg font-bold', stockColor)}>{product.stock || 0}</p>
          <p className="text-[10px] text-muted">unidades</p>
        </div>
      </div>

      {/* Actions */}
      <div className="border-t border-subtle flex">
        <button
          onClick={onEdit}
          className="flex-1 flex items-center justify-center gap-2 py-3 text-xs text-muted hover:text-amber-500 hover:bg-elevated transition-colors"
        >
          <Pencil className="w-4 h-4" />
          Editar
        </button>
        <button
          onClick={onDelete}
          disabled={isDeleting}
          className="flex-1 flex items-center justify-center gap-2 py-3 text-xs text-muted hover:text-rose-500 hover:bg-elevated transition-colors border-l border-subtle"
        >
          {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          Eliminar
        </button>
      </div>
    </motion.div>
  )
}

// ============================================================================
// Placeholder Cards para módulos en desarrollo
// ============================================================================
const PlaceholderCard = ({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    className="bg-surface border border-subtle rounded-2xl p-8 text-center"
  >
    <div className="w-16 h-16 rounded-2xl bg-elevated flex items-center justify-center mx-auto mb-4">
      <Icon className="w-8 h-8 text-muted" />
    </div>
    <h3 className="text-lg font-semibold text-primary mb-2">{title}</h3>
    <p className="text-sm text-muted">{description}</p>
  </motion.div>
)

// ============================================================================
// Componente principal
// ============================================================================
export const RedesignDataPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('inventario')
  const [searchQuery, setSearchQuery] = useState('')
  const [showProductForm, setShowProductForm] = useState(false)
  const [showCustomerForm, setShowCustomerForm] = useState(false)
  const [showProviderForm, setShowProviderForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<any>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Datos reales de productos desde IndexedDB
  const products = useLiveQuery(async () => {
    if (activeTab !== 'inventario') return []

    let items = await db.products.toArray()
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      items = items.filter(p =>
        (p.name?.toLowerCase().includes(q) ?? false) ||
        (p.barcode?.includes(q) ?? false) ||
        (p.sku?.toLowerCase().includes(q) ?? false)
      )
    }
    return items
  }, [activeTab, searchQuery], [])

  // Conteo de productos
  const productCount = useLiveQuery(async () => {
    try {
      return await db.products.count() ?? 0
    } catch {
      return 0
    }
  }, [], 0)

  // Stats de inventario
  const inventoryStats = useMemo(() => {
    const all = products || []
    return {
      total: all.length,
      inStock: all.filter(p => (p.stock || 0) > (p.minStock || 10)).length,
      lowStock: all.filter(p => (p.stock || 0) > 0 && (p.stock || 0) <= (p.minStock || 10)).length,
      outOfStock: all.filter(p => (p.stock || 0) === 0).length,
    }
  }, [products])

  // Crear producto
  const handleCreateProduct = async (data: any) => {
    const id = crypto.randomUUID()
    await db.products.add({
      ...data,
      id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      syncStatus: 'pending',
    })
    toast.success('Producto creado exitosamente')
  }

  // Actualizar producto
  const handleUpdateProduct = async (data: any) => {
    if (!editingProduct?.id) return
    await db.products.update(editingProduct.id, {
      ...data,
      updatedAt: Date.now(),
      syncStatus: 'pending',
    })
    setEditingProduct(null)
    toast.success('Producto actualizado')
  }

  // Eliminar producto
  const handleDeleteProduct = async (id: string) => {
    if (!confirm('¿Eliminar este producto? Esta acción no se puede deshacer.')) return
    setDeletingId(id)
    try {
      await db.products.delete(id)
      toast.success('Producto eliminado')
    } catch (error) {
      toast.error('Error al eliminar producto')
    } finally {
      setDeletingId(null)
    }
  }

  // Crear cliente
  const handleCreateCustomer = async (data: any) => {
    const id = crypto.randomUUID()
    await db.customers.add({
      ...data,
      id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      syncStatus: 'pending',
    })
    toast.success('Cliente creado exitosamente')
  }

  // Crear proveedor
  const handleCreateProvider = async (data: any) => {
    const id = crypto.randomUUID()
    await db.providers.add({
      ...data,
      id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      syncStatus: 'pending',
    })
    toast.success('Proveedor creado exitosamente')
  }

  const handleCreate = () => {
    switch (activeTab) {
      case 'inventario': setShowProductForm(true); break
      case 'clientes': setShowCustomerForm(true); break
      case 'proveedores': setShowProviderForm(true); break
    }
  }

  const handleEdit = (product: any) => {
    setEditingProduct(product)
  }

  // Tab color
  const tabColors: Record<string, string> = {
    inventario: 'bg-blue-600',
    clientes: 'bg-emerald-600',
    proveedores: 'bg-amber-600',
    ordenes: 'bg-violet-600',
  }

  return (
    <div className="h-full flex flex-col bg-base">
      {/* Header */}
      <div className="px-4 sm:px-6 lg:px-8 shrink-0">
        {/* Title row */}
        <div className="flex items-start justify-between pt-8 pb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-primary tracking-tight flex items-center gap-3">
              <Database className="w-8 h-8 text-blue-500" />
              Datos
            </h1>
            <p className="text-secondary text-sm mt-1">
              {activeTab === 'inventario' && `${productCount} productos`}
              {activeTab === 'clientes' && 'Gestión de clientes'}
              {activeTab === 'proveedores' && 'Gestión de proveedores'}
              {activeTab === 'ordenes' && 'Gestión de órdenes'}
            </p>
          </div>
          <button
            onClick={handleCreate}
            className={cn(
              'flex items-center gap-2 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-lg',
              tabColors[activeTab]
            )}
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">
              {activeTab === 'inventario' && 'Producto'}
              {activeTab === 'clientes' && 'Cliente'}
              {activeTab === 'proveedores' && 'Proveedor'}
              {activeTab === 'ordenes' && 'Orden'}
            </span>
          </button>
        </div>

        {/* Stats - solo para inventario */}
        {activeTab === 'inventario' && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pb-4">
            <StatCard icon={Package} label="Total" value={inventoryStats.total} />
            <StatCard icon={Database} label="Con Stock" value={inventoryStats.inStock} color="text-emerald-500" />
            <StatCard icon={AlertCircle} label="Bajo Stock" value={inventoryStats.lowStock} color="text-amber-500" />
            <StatCard icon={X} label="Sin Stock" value={inventoryStats.outOfStock} color="text-rose-500" />
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id)
                  setSearchQuery('')
                }}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap shrink-0',
                  isActive
                    ? 'bg-surface text-primary border border-subtle'
                    : 'text-secondary hover:bg-surface/50 hover:text-primary',
                )}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden xs:inline">{tab.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pb-24 md:pb-8">
        <div className="max-w-5xl mx-auto flex flex-col gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre o código..."
              className="w-full bg-surface border border-subtle rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Data Content */}
          {activeTab === 'inventario' && (
            <div className="flex flex-col gap-3">
              {products.length === 0 ? (
                <div className="bg-surface border border-subtle rounded-2xl p-8 text-center">
                  <Package className="w-12 h-12 text-muted mx-auto mb-4" />
                  <p className="text-muted mb-2">
                    {searchQuery ? 'No se encontraron productos' : 'No hay productos en el inventario'}
                  </p>
                  {!searchQuery && (
                    <button
                      onClick={handleCreate}
                      className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium transition-colors"
                    >
                      Crear primer producto
                    </button>
                  )}
                </div>
              ) : (
                products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onEdit={() => handleEdit(product)}
                    onDelete={() => handleDeleteProduct(product.id)}
                    isDeleting={deletingId === product.id}
                  />
                ))
              )}
            </div>
          )}

          {activeTab === 'clientes' && (
            <PlaceholderCard
              icon={Users}
              title="Módulo de Clientes"
              description="Gestión de clientes en desarrollo"
            />
          )}

          {activeTab === 'proveedores' && (
            <PlaceholderCard
              icon={Truck}
              title="Módulo de Proveedores"
              description="Gestión de proveedores en desarrollo"
            />
          )}

          {activeTab === 'ordenes' && (
            <PlaceholderCard
              icon={ClipboardList}
              title="Módulo de Órdenes"
              description="Gestión de órdenes en desarrollo"
            />
          )}
        </div>
      </div>

      {/* FAB para móvil */}
      <button
        onClick={handleCreate}
        className="md:hidden fixed bottom-24 right-6 w-14 h-14 text-white rounded-full shadow-lg flex items-center justify-center transition-colors z-40"
        style={{ backgroundColor: tabColors[activeTab] }}
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Modales de formularios */}
      {showProductForm && (
        <ProductForm
          onSave={handleCreateProduct}
          onClose={() => setShowProductForm(false)}
        />
      )}
      {editingProduct && (
        <ProductForm
          product={editingProduct}
          onSave={handleUpdateProduct}
          onClose={() => setEditingProduct(null)}
        />
      )}
      {showCustomerForm && (
        <CustomerForm
          onSave={handleCreateCustomer}
          onClose={() => setShowCustomerForm(false)}
        />
      )}
      {showProviderForm && (
        <ProviderForm
          onSave={handleCreateProvider}
          onClose={() => setShowProviderForm(false)}
        />
      )}
    </div>
  )
}
