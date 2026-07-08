import React, { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Upload, FileText, CheckCircle, Clipboard, Trash2, Save, AlertTriangle, Info, AlertCircle, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// ============================================================================
// Tipos
// ============================================================================
type EventType = 'info' | 'warning' | 'error' | 'success'

interface ParsedEvent {
  lineNumber: number
  frcNumber: string
  barcode: string
  productName: string
  batch: string
  expiryDate: string
  resolution: string
  type: EventType
}

// ============================================================================
// Utilidades
// ============================================================================
const parseResolutionType = (resolution: string): EventType => {
  const upper = resolution.toUpperCase()
  if (upper.includes('ENVIAR') || upper.includes('CARGAR') || upper.includes('TR ')) {
    return 'warning'
  }
  if (upper.includes('ERROR') || upper.includes('SIN') || upper.includes('DIFERENCIA')) {
    return 'error'
  }
  if (upper.includes('MANTENER') || upper.includes('OK') || upper.includes('OK')) {
    return 'success'
  }
  return 'info'
}

const parseExpiryDate = (dateStr: string): Date | null => {
  if (!dateStr || dateStr.toLowerCase().includes('sin')) return null
  const parts = dateStr.split('/')
  if (parts.length === 3) {
    const day = parseInt(parts[0])
    const month = parseInt(parts[1])
    const year = parseInt(parts[2])
    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      return new Date(year, month - 1, day)
    }
  }
  return null
}

const parsePlainText = (text: string): ParsedEvent[] => {
  const lines = text.split('\n').filter(line => line.trim())
  if (lines.length < 2) return []
  
  // Detectar si la primera línea es encabezado
  const firstLine = lines[0].toLowerCase()
  const hasHeaders = firstLine.includes('frc') || firstLine.includes('código') || firstLine.includes('codigo')
  const startIndex = hasHeaders ? 1 : 0
  
  const events: ParsedEvent[] = []
  
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    
    // Split por tabulador o múltiples espacios
    const cols = line.split(/\t|(?:\s{2,})/).map(c => c.trim()).filter(c => c)
    
    if (cols.length >= 4) {
      const resolution = cols[5] || cols[4] || ''
      events.push({
        lineNumber: i + 1,
        frcNumber: cols[0] || '',
        barcode: cols[1] || '',
        productName: cols[2] || '',
        batch: cols[3] || '',
        expiryDate: cols[4] || '',
        resolution: resolution,
        type: parseResolutionType(resolution)
      })
    }
  }
  
  return events
}

// ============================================================================
// Componente
// ============================================================================
interface EventsImporterProps {
  onSave: (events: ParsedEvent[]) => void
  onCancel: () => void
}

export const EventsImporter: React.FC<EventsImporterProps> = ({ onSave, onCancel }) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pasteText, setPasteText] = useState('')
  const [parsedEvents, setParsedEvents] = useState<ParsedEvent[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [saving, setSaving] = useState(false)

  const handlePasteText = (text: string) => {
    setPasteText(text)
    const parsed = parsePlainText(text)
    setParsedEvents(parsed)
    if (parsed.length > 0) {
      toast.success(`${parsed.length} eventos detectados`)
    }
  }

  const handleFileDrop = async (file: File) => {
    try {
      const text = await file.text()
      handlePasteText(text)
      toast.success('Archivo procesado')
    } catch (err) {
      toast.error('Error al leer archivo')
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleFileDrop(file)
    }
  }

  const handleSave = async () => {
    if (parsedEvents.length === 0) {
      toast.error('No hay eventos para guardar')
      return
    }
    setSaving(true)
    try {
      onSave(parsedEvents)
    } finally {
      setSaving(false)
    }
  }

  const stats = {
    total: parsedEvents.length,
    error: parsedEvents.filter(e => e.type === 'error').length,
    warning: parsedEvents.filter(e => e.type === 'warning').length,
    info: parsedEvents.filter(e => e.type === 'info').length,
    success: parsedEvents.filter(e => e.type === 'success').length,
  }

  const getTypeIcon = (type: EventType) => {
    switch (type) {
      case 'error': return <AlertCircle className="w-4 h-4 text-rose-500" />
      case 'warning': return <AlertTriangle className="w-4 h-4 text-amber-500" />
      case 'success': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />
      default: return <Info className="w-4 h-4 text-blue-500" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Instrucciones */}
      <div className="bg-surface rounded-xl p-4 border border-subtle">
        <h4 className="text-xs font-black uppercase text-muted mb-2">Formato esperado</h4>
        <p className="text-xs text-secondary leading-relaxed">
          Pega texto plano con columnas separadas por tabulador. El sistema detectará automáticamente:
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {['N° FRC', 'Código', 'Descripción', 'Lote', 'Vence', 'Resolución'].map(col => (
            <span key={col} className="px-2 py-1 bg-elevated rounded text-xs text-muted font-mono">{col}</span>
          ))}
        </div>
      </div>

      {/* Área de pega/import */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "border-2 border-dashed rounded-2xl p-8 text-center transition-colors cursor-pointer",
          isDragging ? "border-blue-500 bg-blue-500/5" :
          parsedEvents.length > 0 ? "border-emerald-500 bg-emerald-500/5" :
          "border-subtle hover:border-white/20"
        )}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          accept=".txt,.csv"
          onChange={(e) => e.target.files?.[0] && handleFileDrop(e.target.files[0])}
          className="hidden"
        />
        <Clipboard className={cn("w-12 h-12 mx-auto mb-3", parsedEvents.length > 0 ? "text-emerald-500" : "text-muted")} />
        <p className="text-sm font-medium text-primary">
          {parsedEvents.length > 0 ? `${parsedEvents.length} registros detectados` : 'Arrastra archivo o haz clic para seleccionar'}
        </p>
        <p className="text-xs text-muted mt-1">Archivos .txt, .csv o pega texto directamente</p>
      </div>

      {/* Área de texto pegado */}
      <div className="bg-surface rounded-xl p-4 border border-subtle">
        <h4 className="text-xs font-black uppercase text-muted mb-3">O pega el texto directamente</h4>
        <textarea
          rows={8}
          value={pasteText}
          onChange={(e) => handlePasteText(e.target.value)}
          placeholder={"121-192\t5412360004201\tAC. ESEN. LAVANDA VERDADERA ORG 10 ML\t1064421\t25/09/2026\tMANTENER EN EL LOCAL PARA SU VENTA HASTA SU CANJE O VENCIMIENTO\n121-179\t7804902034858\tSH. CAIDA-GRASO 350 ML\t552326\t25/05/2029\tCARGAR STOCK A B80"}
          className="w-full bg-base border border-subtle rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-blue-500 resize-none"
        />
      </div>

      {/* Preview con stats */}
      {parsedEvents.length > 0 && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <div className="bg-surface rounded-xl p-3 border border-subtle text-center">
              <p className="text-xl font-bold text-primary">{stats.total}</p>
              <p className="text-xs text-muted">Total</p>
            </div>
            <div className="bg-rose-500/10 rounded-xl p-3 border border-rose-500/30 text-center">
              <p className="text-xl font-bold text-rose-500">{stats.error}</p>
              <p className="text-xs text-rose-500">Errores</p>
            </div>
            <div className="bg-amber-500/10 rounded-xl p-3 border border-amber-500/30 text-center">
              <p className="text-xl font-bold text-amber-500">{stats.warning}</p>
              <p className="text-xs text-amber-500">Alertas</p>
            </div>
            <div className="bg-blue-500/10 rounded-xl p-3 border border-blue-500/30 text-center">
              <p className="text-xl font-bold text-blue-500">{stats.info}</p>
              <p className="text-xs text-blue-500">Info</p>
            </div>
            <div className="bg-emerald-500/10 rounded-xl p-3 border border-emerald-500/30 text-center">
              <p className="text-xl font-bold text-emerald-500">{stats.success}</p>
              <p className="text-xs text-emerald-500">OK</p>
            </div>
          </div>

          {/* Lista preview */}
          <div className="bg-surface rounded-xl border border-subtle overflow-hidden max-h-80 overflow-y-auto">
            <div className="p-3 border-b border-subtle flex items-center justify-between">
              <h4 className="text-xs font-black uppercase text-muted">
                Preview ({parsedEvents.length} registros)
              </h4>
              <button
                onClick={() => { setParsedEvents([]); setPasteText(''); }}
                className="p-1.5 hover:bg-rose-500/10 text-rose-500 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="divide-y divide-subtle">
              {parsedEvents.slice(0, 50).map((event, idx) => (
                <div key={idx} className="flex items-start gap-3 px-4 py-3 hover:bg-elevated transition-colors">
                  {getTypeIcon(event.type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono text-muted">{event.frcNumber}</span>
                      <span className="text-xs font-mono bg-elevated px-1.5 py-0.5 rounded text-blue-400">{event.barcode}</span>
                    </div>
                    <p className="text-sm text-primary truncate mt-0.5">{event.productName}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted">
                      <span>Lote: <span className="font-mono">{event.batch}</span></span>
                      <span>Vence: <span className="font-mono">{event.expiryDate}</span></span>
                    </div>
                    <p className="text-xs text-secondary mt-1 line-clamp-1">{event.resolution}</p>
                  </div>
                </div>
              ))}
              {parsedEvents.length > 50 && (
                <p className="text-xs text-center text-muted py-3">+{parsedEvents.length - 50} registros más...</p>
              )}
            </div>
          </div>
        </>
      )}

      {/* Acciones */}
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 py-3 bg-surface hover:bg-elevated text-primary rounded-xl font-medium transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={handleSave}
          disabled={saving || parsedEvents.length === 0}
          className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
        >
          {saving ? (
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
              <Save className="w-5 h-5" />
            </motion.div>
          ) : (
            <>
              <Save className="w-5 h-5" />
              Guardar {parsedEvents.length} Eventos
            </>
          )}
        </button>
      </div>
    </div>
  )
}
