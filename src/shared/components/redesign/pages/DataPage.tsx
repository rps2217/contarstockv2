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

// Mock data - reemplazar con datos reales
const MOCK_PRODUCTS = [
  {
    id: 1,
    name: 'Coca Cola Zero 2.25L',
    code: '7790895000997',
    stock: 145,
    minStock: 50,
    price: '$2,450.00',
    category: 'Bebidas',
  },
  {
    id: 2,
    name: 'Galletas Oreo 117g',
    code: '7622300732236',
    stock: 12,
    minStock: 20,
    price: '$850.00',
    category: 'Almacén',
  },
  {
    id: 3,
    name: 'Leche La Serenísima 1L',
    code: '7790742302705',
    stock: 89,
    minStock: 30,
    price: '$1,200.00',
    category: 'Lácteos',
  },
  {
    id: 4,
    name: 'Yerba Mate Playadito 500g',
    code: '7791720000115',
    stock: 43,
    minStock: 15,
    price: '$2,100.00',
    category: 'Almacén',
  },
  {
    id: 5,
    name: 'Cerveza Quilmes 473ml',
    code: '7792798007421',
    stock: 0,
    minStock: 24,
    price: '$1,150.00',
    category: 'Bebidas',
  },
]

export const RedesignDataPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('inventario')

  return (
    <div className="h-full flex flex-col bg-base">
      {/* Header & Tabs */}
      <div className="pt-8 px-4 sm:px-6 lg:px-8 shrink-0">
        <h1 className="text-2xl sm:text-3xl font-bold text-primary tracking-tight mb-6 flex items-center gap-3">
          <Database className="w-8 h-8 text-blue-500" />
          Datos
        </h1>

        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-4 border-b border-subtle">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
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
                placeholder="Buscar por nombre o código..."
                className="w-full bg-surface border border-subtle rounded-xl pl-10 pr-4 py-2.5 text-sm text-primary focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              />
            </div>
            <button className="flex items-center justify-center w-11 h-11 bg-surface border border-subtle rounded-xl text-secondary hover:text-primary hover:bg-elevated transition-colors shrink-0">
              <Filter className="w-5 h-5" />
            </button>
          </div>

          {/* Data List */}
          <div className="flex flex-col gap-3">
            {MOCK_PRODUCTS.map((product, idx) => (
              <motion.div
                initial={{
                  opacity: 0,
                  y: 10,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  delay: idx * 0.05,
                }}
                key={product.id}
                className="bg-surface border border-subtle rounded-2xl p-4 flex items-center gap-4 hover:bg-elevated transition-colors cursor-pointer group"
              >
                <div className="w-12 h-12 rounded-xl bg-elevated flex items-center justify-center shrink-0">
                  <Package className="w-6 h-6 text-muted" />
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-primary truncate">
                    {product.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted font-mono">
                      {product.code}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-subtle" />
                    <span className="text-xs text-secondary">
                      {product.category}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0 flex flex-col items-end gap-1">
                  <div className="flex items-center gap-2">
                    {product.stock === 0 && (
                      <AlertCircle className="w-4 h-4 text-rose-500" />
                    )}
                    {product.stock > 0 && product.stock <= product.minStock && (
                      <AlertCircle className="w-4 h-4 text-amber-500" />
                    )}
                    <span
                      className={cn(
                        'text-sm font-bold',
                        product.stock === 0
                          ? 'text-rose-500'
                          : product.stock <= product.minStock
                            ? 'text-amber-500'
                            : 'text-emerald-500',
                      )}
                    >
                      {product.stock} un.
                    </span>
                  </div>
                  <span className="text-xs text-muted">{product.price}</span>
                </div>

                <button className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:bg-subtle hover:text-primary opacity-0 group-hover:opacity-100 transition-all md:flex hidden shrink-0">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
