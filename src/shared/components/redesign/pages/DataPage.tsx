import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Database,
  Users,
  Truck,
  ClipboardList,
  Search,
  Filter,
  MoreVertical,
  Package,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ProductForm } from '../components/forms/ProductForm'
import { CustomerForm } from '../components/forms/CustomerForm'
import { ProviderForm } from '../components/forms/ProviderForm'
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'

const TABS = [
  {
    id: 'inventario',
    label: 'Inventario',
    icon: Database,
  },
  {
    id: 'clientes',
    label: 'Clientes',
    icon: Users,
  },
  {
    id: 'proveedores',
    label: 'Proveedores',
    icon: Truck,
  },
  {
    id: 'ordenes',
    label: 'Órdenes',
    icon: ClipboardList,
  },
]

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
    
    let query = db.products.toArray()
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      query = db.products
        .filter(p => 
          (p.name?.toLowerCase().includes(q) ?? false) ||
          (p.barcode?.includes(q) ?? false) ||
          (p.sku?.toLowerCase().includes(q) ?? false)
        )
        .toArray()
    }
    return await query
  }, [activeTab, searchQuery], [])

  

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
  }

  // Eliminar producto
  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Eliminar este producto?')) return
    setDeletingId(id)
    try {
      await db.products.delete(id)
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
  }

  // Conteo de productos
  const productCount = useLiveQuery(async () => {
    try {
      return await db?.products?.count() ?? 0
    } catch {
      return 0
    }
  }, [], 0)

  // Renderizar contenido según tab activo
  const renderContent = () => {
    switch (activeTab) {
      case 'inventario':
        return (
          <div className="flex flex-col gap-3">
            {products.length === 0 ? (
              <div className="p-8 text-center text-muted text-sm">
                {searchQuery ? 'No se encontraron productos' : 'No hay productos en el inventario'}
              </div>
            ) : (
              products.slice(0, 50).map((product, idx) => {
                const isOutOfStock = (product.stock || 0) === 0
                const isLowStock = (product.stock || 0) > 0 && (product.stock || 0) <= (product.minStock || 10)
                
                return (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    key={product.id}
                    className="bg-surface border border-subtle rounded-2xl p-4 flex items-center gap-4 hover:bg-elevated transition-colors cursor-pointer group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-elevated flex items-center justify-center shrink-0">
                      <Package className="w-6 h-6 text-muted" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-primary truncate">
                        {product.name || 'Sin nombre'}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted font-mono">
                          {product.barcode || product.sku || 'Sin código'}
                        </span>
                        {product.category && (
                          <>
                            <span className="w-1 h-1 rounded-full bg-subtle" />
                            <span className="text-xs text-secondary">
                              {product.category}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0 flex flex-col items-end gap-1">
                      <div className="flex items-center gap-2">
                        {isOutOfStock && <AlertCircle className="w-4 h-4 text-rose-500" />}
                        {isLowStock && !isOutOfStock && <AlertCircle className="w-4 h-4 text-amber-500" />}
                        <span
                          className={cn(
                            'text-sm font-bold',
                            isOutOfStock ? 'text-rose-500' : isLowStock ? 'text-amber-500' : 'text-emerald-500',
                          )}
                        >
                          {product.stock || 0} un.
                        </span>
                      </div>
                      {product.price && (
                        <span className="text-xs text-muted">{product.price}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button
                        onClick={() => setEditingProduct(product)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:bg-subtle hover:text-blue-500"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product.id)}
                        disabled={deletingId === product.id}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:bg-subtle hover:text-rose-500"
                      >
                        {deletingId === product.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    </div>
                  </motion.div>
                )
              })
            )}
            {products.length > 50 && (
              <div className="text-center py-4 text-sm text-muted">
                Mostrando 50 de {products.length} productos
              </div>
            )}
          </div>
        )

      case 'clientes':
        return (
          <div className="p-8 text-center text-muted">
            Módulo de clientes en desarrollo
          </div>
        )

      case 'proveedores':
        return (
          <div className="p-8 text-center text-muted">
            Módulo de proveedores en desarrollo
          </div>
        )

      case 'ordenes':
        return (
          <div className="p-8 text-center text-muted">
            Módulo de órdenes en desarrollo
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="h-full flex flex-col bg-base">
      {/* Header & Tabs */}
      <div className="pt-8 px-4 sm:px-6 lg:px-8 shrink-0">
        <h1 className="text-2xl sm:text-3xl font-bold text-primary tracking-tight mb-6 flex items-center gap-3">
          <Database className="w-8 h-8 text-blue-500" />
          Datos
          {activeTab === 'inventario' && productCount > 0 && (
            <span className="text-sm font-normal text-muted ml-2">
              ({productCount} productos)
            </span>
          )}
        </h1>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-4 border-b border-subtle">
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
                  'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap shrink-0',
                  isActive
                    ? 'bg-blue-500/20 text-blue-500 border border-blue-500/30'
                    : 'text-secondary hover:bg-surface hover:text-primary border border-transparent',
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
          {activeTab === 'inventario' && (
            <button
              onClick={() => setShowProductForm(true)}
              className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-500 transition-colors shrink-0"
            >
              <Plus className="w-4 h-4" />
              Agregar
            </button>
          )}
          {activeTab === 'clientes' && (
            <button
              onClick={() => setShowCustomerForm(true)}
              className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-emerald-500 text-white hover:bg-emerald-400 transition-colors shrink-0"
            >
              <Plus className="w-4 h-4" />
              Agregar
            </button>
          )}
          {activeTab === 'proveedores' && (
            <button
              onClick={() => setShowProviderForm(true)}
              className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-amber-500 text-white hover:bg-amber-400 transition-colors shrink-0"
            >
              <Plus className="w-4 h-4" />
              Agregar
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:px-6 lg:px-8 pb-24 md:pb-8">
        <div className="max-w-5xl mx-auto h-full flex flex-col gap-4">
          {/* Search & Filter Bar */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nombre o código..."
                className="w-full bg-surface border border-subtle rounded-xl pl-10 pr-4 py-2.5 text-sm text-primary focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              />
            </div>
            <button className="flex items-center justify-center w-11 h-11 bg-surface border border-subtle rounded-xl text-secondary hover:text-primary hover:bg-elevated transition-colors shrink-0">
              <Filter className="w-5 h-5" />
            </button>
          </div>

          {/* Data Content */}
          {renderContent()}
        </div>
      </div>

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
