import React, { useState, useCallback, useRef, useEffect } from 'react'
import { logger } from '@/services/logger';

import { motion, AnimatePresence } from 'framer-motion'
import {
  Scan,
  Package,
  FileText,
  Calendar,
  Zap,
  Camera,
  Keyboard,
  ArrowRight,
  Plus,
  Play,
  History,
  Search,
  Barcode,
  CheckCircle2,
  Package2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/stores'
import { useNavigate } from 'react-router-dom'
import { useOpticalEngine } from '@/hooks/useOpticalEngine'

const TABS = [
  {
    id: 'conteo',
    label: 'Conteo',
    icon: Scan,
    color: 'text-blue-500',
    bg: 'bg-blue-500/20',
    border: 'border-blue-500/30',
  },
  {
    id: 'recepcion',
    label: 'Recepción',
    icon: Package,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/20',
    border: 'border-emerald-500/30',
  },
  {
    id: 'eventos',
    label: 'Eventos',
    icon: FileText,
    color: 'text-amber-500',
    bg: 'bg-amber-500/20',
    border: 'border-amber-500/30',
  },
  {
    id: 'vencimiento',
    label: 'Vencimiento',
    icon: Calendar,
    color: 'text-rose-500',
    bg: 'bg-rose-500/20',
    border: 'border-rose-500/30',
  },
  {
    id: 'masivo',
    label: 'Masivo',
    icon: Zap,
    color: 'text-purple-500',
    bg: 'bg-purple-500/20',
    border: 'border-purple-500/30',
  },
]

interface CapturePageProps {
  onNavigate?: (view: string) => void
}

// Hook para obtener sesiones de conteo activas
const useActiveSessions = () => {
  // Usar el store de counting si existe, o datos mock
  const countingSessions = useAppStore(state => (state as any).countingSessions || [])
  const activeSessions = countingSessions.filter((s: any) => s.status === 'in_progress' || s.status === 'active')
  return activeSessions
}

// Hook para buscar productos
const useProductSearch = () => {
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)

  const search = useCallback(async (query: string) => {
    if (query.length < 3) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      // Importar dinámicamente para evitar dependencias circulares
      const { db } = await import('@/db')
      const products = await db.products
        .filter((p: any) => 
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          p.sku?.toLowerCase().includes(query.toLowerCase()) ||
          p.barcode?.includes(query)
        )
        .limit(10)
        .toArray()
      setSearchResults(products)
    } catch (error) {
      console.error('Error searching products:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }, [])

  return { searchResults, isSearching, search }
}

export const RedesignCapturePage: React.FC<CapturePageProps> = ({ onNavigate }) => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('conteo')
  const [inputMode, setInputMode] = useState<'camera' | 'manual'>('camera')
  const [manualCode, setManualCode] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  
  const activeSessions = useActiveSessions()

  // === INTEGRACION DEL SCANNER ===
  const scannerId = 'html5-qrcode-redesign'
  const [scanError, setScanError] = useState<string | null>(null)
  const lastScannedCode = useRef<string | null>(null)

  const handleScan = useCallback((code: string) => {
    if (lastScannedCode.current === code) return
    lastScannedCode.current = code
    console.log('Codigo escaneado:', code)
    // Ir a /massive que muestra el modal de inicio unificado
    navigate('/massive')
  }, [navigate])

  const { error: scannerHookError, videoRef } = useOpticalEngine({
    onScan: handleScan,
    isTriggered: inputMode === 'camera',
    scannerDomId: scannerId,
  })

  useEffect(() => {
    if (scannerHookError) setScanError(scannerHookError)
  }, [scannerHookError])
  // === FIN INTEGRACION ===


  const { searchResults, isSearching, search } = useProductSearch()

  // Iniciar nuevo conteo - ir a /massive para elegir tipo
  const handleNewCount = () => {
    navigate('/massive')
  }

  // Continuar conteo existente - ir a /counting/:id
  const handleContinueSession = (sessionId: string) => {
    navigate(`/counting/${sessionId}`)
  }

  // Buscar producto manual
  const handleManualSearch = () => {
    // Ir a /massive para elegir tipo de conteo
    navigate('/massive')
  }

  // Manejar búsqueda
  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    search(value)
  }

  // Navegar a detalle de producto
  const handleProductSelect = (product: any) => {
    navigate(`/data/product/${product.id}`)
  }

  // Ir a histórico de sesiones
  const handleViewHistory = () => {
    onNavigate?.('data')
  }

  return (
    <div className="h-full flex flex-col bg-base">
      {/* Header & Tabs */}
      <div className="pt-8 px-4 sm:px-6 lg:px-8 shrink-0">
        <h1 className="text-2xl sm:text-3xl font-bold text-primary tracking-tight mb-6 flex items-center gap-3">
          <Scan className="w-8 h-8 text-blue-500" />
          Capturar
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
                    ? `${tab.bg} ${tab.color} border ${tab.border}`
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
        <div className="max-w-2xl mx-auto h-full flex flex-col gap-6">
          
          {/* Sesiones Activas */}
          {activeSessions.length > 0 && (
            <div className="bg-surface border border-subtle rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-secondary flex items-center gap-2">
                  <Play className="w-4 h-4 text-emerald-500" />
                  Sesiones Activas
                </h3>
                <span className="text-xs text-muted bg-emerald-500/20 text-emerald-500 px-2 py-0.5 rounded-full">
                  {activeSessions.length}
                </span>
              </div>
              <div className="space-y-2">
                {activeSessions.slice(0, 3).map((session: any) => (
                  <button
                    key={session.id}
                    onClick={() => handleContinueSession(session.id)}
                    className="w-full flex items-center justify-between p-3 bg-base rounded-xl border border-subtle hover:border-emerald-500/50 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                        <Scan className="w-5 h-5 text-emerald-500" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-medium text-primary">
                          {session.name || 'Sesión de conteo'}
                        </p>
                        <p className="text-xs text-muted">
                          {session.items?.length || 0} productos •{' '}
                          {session.location || 'Sin ubicación'}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Mode Toggle */}
          <div className="flex bg-surface p-1 rounded-xl border border-subtle">
            <button
              onClick={() => setInputMode('camera')}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all',
                inputMode === 'camera'
                  ? 'bg-elevated text-primary shadow-sm'
                  : 'text-muted hover:text-secondary',
              )}
            >
              <Camera className="w-4 h-4" />
              Cámara
            </button>
            <button
              onClick={() => setInputMode('manual')}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all',
                inputMode === 'manual'
                  ? 'bg-elevated text-primary shadow-sm'
                  : 'text-muted hover:text-secondary',
              )}
            >
              <Keyboard className="w-4 h-4" />
              Manual
            </button>
          </div>

          {/* Scanner / Input Area */}
          <div className="bg-surface border border-subtle rounded-3xl overflow-hidden relative flex flex-col items-center justify-center min-h-[200px]">
            {inputMode === 'camera' ? (
              <>
                {/* Video del scanner - CRÍTICO para que funcione html5-qrcode */}
                <video
                  ref={videoRef}
                  className="absolute inset-0 w-full h-full object-cover"
                  playsInline
                  muted
                />
                {/* Div para html5-qrcode fallback */}
                <div id={scannerId} className="absolute inset-0 w-full h-full" />
                {/* Overlay del marco del scanner */}
                <div className="absolute inset-0 bg-black/30" />
                {/* Scanner Frame */}
                <div className="relative z-10 w-64 h-40 border-2 border-blue-500/50 rounded-2xl flex items-center justify-center">
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-blue-500 rounded-tl-xl" />
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-blue-500 rounded-tr-xl" />
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-blue-500 rounded-bl-xl" />
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-blue-500 rounded-br-xl" />

                  <motion.div
                    animate={{ y: [-50, 50, -50] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    className="w-full h-0.5 bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.8)]"
                  />
                </div>
                {scanError && (
                  <div className="absolute inset-0 bg-rose-500/20 flex items-center justify-center z-20">
                    <p className="text-rose-400 text-sm text-center px-4">{scanError}</p>
                  </div>
                )}
                <p className="absolute bottom-4 text-white text-sm font-medium z-10">
                  Apunta al código de barras
                </p>
                <button
                  onClick={handleNewCount}
                  className="absolute top-4 right-4 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-xl flex items-center gap-2 transition-colors z-10"
                >
                  <Plus className="w-4 h-4" />
                  Nuevo
                </button>
              </>
            ) : (
              <div className="w-full max-w-sm p-6 flex flex-col gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-secondary">
                    Código de producto
                  </label>
                  <div className="relative">
                    <Barcode className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
                    <input
                      type="text"
                      value={manualCode}
                      onChange={(e) => setManualCode(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleManualSearch()}
                      placeholder="Ej. 7791234567890"
                      className="w-full bg-base border border-subtle rounded-xl pl-12 pr-4 py-3 text-primary focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                    />
                  </div>
                </div>
                <button 
                  onClick={handleManualSearch}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
                >
                  <Search className="w-4 h-4" />
                  Buscar producto
                </button>
              </div>
            )}
          </div>

          {/* Búsqueda rápida de productos */}
          <div className="bg-surface border border-subtle rounded-2xl p-4">
            <h3 className="text-sm font-semibold text-secondary mb-3 flex items-center gap-2">
              <Package2 className="w-4 h-4" />
              Buscar producto
            </h3>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Nombre o código..."
                className="w-full bg-base border border-subtle rounded-xl pl-10 pr-4 py-2.5 text-sm text-primary focus:outline-none focus:border-blue-500 transition-all"
              />
            </div>
            
            {/* Resultados */}
            <AnimatePresence>
              {searchResults.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 space-y-2 max-h-60 overflow-y-auto"
                >
                  {searchResults.map((product: any) => (
                    <button
                      key={product.id}
                      onClick={() => handleProductSelect(product)}
                      className="w-full flex items-center justify-between p-3 bg-base rounded-xl border border-subtle hover:border-blue-500/50 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                          <Package2 className="w-5 h-5 text-blue-500" />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-medium text-primary">
                            {product.name}
                          </p>
                          <p className="text-xs text-muted font-mono">
                            {product.barcode || product.sku || 'Sin código'}
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted" />
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
            
            {searchQuery.length >= 3 && searchResults.length === 0 && !isSearching && (
              <p className="text-sm text-muted text-center py-4">
                No se encontraron productos
              </p>
            )}
          </div>

          {/* Acciones rápidas */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleNewCount}
              className="flex items-center justify-center gap-2 p-4 bg-blue-600 hover:bg-blue-500 rounded-2xl text-white font-medium transition-colors"
            >
              <Plus className="w-5 h-5" />
              Nuevo conteo
            </button>
            <button
              onClick={handleViewHistory}
              className="flex items-center justify-center gap-2 p-4 bg-surface hover:bg-elevated border border-subtle rounded-2xl text-primary font-medium transition-colors"
            >
              <History className="w-5 h-5" />
              Ver historial
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
