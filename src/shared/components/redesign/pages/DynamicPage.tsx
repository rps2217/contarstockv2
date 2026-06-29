import React, { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Database, Plus, Search, Table, FileSpreadsheet, Download, Upload,
  Settings, MoreVertical, ChevronRight, RefreshCw, Table2, Rows3
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'

// ============================================================================
// Tipos
// ============================================================================
interface DynamicTable {
  id: string
  tableName: string
  displayName: string
  recordCount: number
  lastUpdated: number
  columns: string[]
}

// ============================================================================
// Componentes de UI
// ============================================================================
const TableRow = ({ table }: { table: DynamicTable }) => {
  const lastUpdated = table.lastUpdated ? new Date(table.lastUpdated).toLocaleDateString() : '-'
  
  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-4 p-4 bg-surface hover:bg-elevated rounded-xl cursor-pointer transition-colors">
      <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center">
        <Table2 className="w-6 h-6 text-violet-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-primary truncate">{table.displayName}</p>
        <div className="flex items-center gap-4 mt-1">
          <span className="text-xs text-muted font-mono">{table.tableName}</span>
          <span className="text-xs text-muted">{table.recordCount} registros</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted">{lastUpdated}</span>
        <button className="p-2 rounded-lg hover:bg-surface transition-colors">
          <MoreVertical className="w-4 h-4 text-muted" />
        </button>
        <ChevronRight className="w-4 h-4 text-muted" />
      </div>
    </motion.div>
  )
}

// ============================================================================
// Componente principal
// ============================================================================
export const RedesignDynamicPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTable, setSelectedTable] = useState<string | null>(null)

  // Obtener tablas dinámicas
  const tables = useLiveQuery(async (): Promise<DynamicTable[]> => {
    try {
      const dynamicData = await db.dynamic_data.toArray()
      const tableMap = new Map<string, DynamicTable>()
      
      dynamicData.forEach(d => {
        const name = d.tableName || 'UNKNOWN'
        if (!tableMap.has(name)) {
          tableMap.set(name, {
            id: name,
            tableName: name,
            displayName: formatTableName(name),
            recordCount: 0,
            lastUpdated: d.timestamp || 0,
            columns: d.data ? Object.keys(d.data) : []
          })
        }
        const table = tableMap.get(name)!
        table.recordCount++
        if (d.timestamp && d.timestamp > table.lastUpdated) {
          table.lastUpdated = d.timestamp
        }
      })
      
      return Array.from(tableMap.values()).sort((a, b) => b.lastUpdated - a.lastUpdated)
    } catch {
      return []
    }
  }, [])

  const formatTableName = (name: string): string => {
    return name
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim()
  }

  const filtered = useMemo(() => {
    if (!tables || !searchQuery) return tables || []
    const q = searchQuery.toLowerCase()
    return tables.filter(t => 
      t.tableName.toLowerCase().includes(q) ||
      t.displayName.toLowerCase().includes(q)
    )
  }, [tables, searchQuery])

  const totalRecords = tables?.reduce((acc, t) => acc + t.recordCount, 0) || 0

  if (!tables) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-base">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-muted mt-4">Cargando tablas dinámicas...</p>
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
              <Database className="w-8 h-8 text-violet-500" />
              Datos Dinámicos
            </h1>
            <p className="text-secondary text-sm mt-2">Gestión de tablas y registros dinámicos.</p>
          </div>
          <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-lg shadow-blue-900/20">
            <Plus className="w-4 h-4" />
            Nueva Tabla
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-surface border border-subtle rounded-xl p-4">
            <p className="text-2xl font-bold text-primary">{tables.length}</p>
            <p className="text-xs text-muted">Tablas</p>
          </div>
          <div className="bg-surface border border-subtle rounded-xl p-4">
            <p className="text-2xl font-bold text-violet-500">{totalRecords}</p>
            <p className="text-xs text-muted">Registros Totales</p>
          </div>
          <div className="bg-surface border border-subtle rounded-xl p-4">
            <p className="text-2xl font-bold text-blue-500">
              {tables.length > 0 ? Math.round(totalRecords / tables.length) : 0}
            </p>
            <p className="text-xs text-muted">Promedio/Tabla</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="max-w-4xl mx-auto flex flex-col gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar tablas..."
              className="w-full bg-surface border border-subtle rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-blue-500" />
          </div>

          {/* List */}
          <div className="flex flex-col gap-2">
            {filtered.length === 0 ? (
              <div className="bg-surface border border-subtle rounded-2xl p-8 text-center">
                <Database className="w-12 h-12 text-muted mx-auto mb-4" />
                <p className="text-muted">
                  {searchQuery ? 'No se encontraron tablas' : 'No hay tablas dinámicas'}
                </p>
              </div>
            ) : (
              filtered.map(table => (
                <TableRow key={table.id} table={table} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
