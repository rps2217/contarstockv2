import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Scan,
  Package,
  FileText,
  Calendar,
  Zap,
  Camera,
  Keyboard,
  ArrowRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

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

export const RedesignCapturePage: React.FC<CapturePageProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState('conteo')
  const [inputMode, setInputMode] = useState<'camera' | 'manual'>('camera')

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
          <div className="flex-1 bg-surface border border-subtle rounded-3xl overflow-hidden relative flex flex-col items-center justify-center min-h-[300px]">
            {inputMode === 'camera' ? (
              <>
                <div className="absolute inset-0 bg-black/10 dark:bg-black/40" />
                {/* Mock Scanner Frame */}
                <div className="relative w-64 h-64 border-2 border-blue-500/50 rounded-2xl flex items-center justify-center">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-xl" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-xl" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-xl" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-xl" />

                  <motion.div
                    animate={{
                      y: [-100, 100, -100],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: 'linear',
                    }}
                    className="w-full h-0.5 bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.8)]"
                  />
                </div>
                <p className="absolute bottom-8 text-secondary text-sm font-medium">
                  Apunta al código de barras
                </p>
              </>
            ) : (
              <div className="w-full max-w-sm p-6 flex flex-col gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-secondary">
                    Código de producto
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. 7791234567890"
                    className="w-full bg-base border border-subtle rounded-xl px-4 py-3 text-primary focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  />
                </div>
                <button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition-colors">
                  Buscar producto
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Recent Scans (Mock) */}
          <div className="bg-surface border border-subtle rounded-2xl p-4">
            <h3 className="text-sm font-semibold text-secondary mb-3">
              Últimos escaneos
            </h3>
            <div className="space-y-2">
              {[
                {
                  name: 'Coca Cola 2.25L',
                  code: '7790895000997',
                  qty: 12,
                },
                {
                  name: 'Galletas Oreo 117g',
                  code: '7622300732236',
                  qty: 5,
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 bg-base rounded-xl border border-subtle"
                >
                  <div>
                    <p className="text-sm font-medium text-primary">
                      {item.name}
                    </p>
                    <p className="text-xs text-muted font-mono">{item.code}</p>
                  </div>
                  <div className="bg-blue-500/10 text-blue-500 px-3 py-1 rounded-lg text-sm font-bold">
                    +{item.qty}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
