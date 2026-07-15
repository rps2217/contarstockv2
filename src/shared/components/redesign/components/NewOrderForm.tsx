import React, { useState, useRef } from 'react'
import { logger } from '@/services/logger';

import { motion } from 'framer-motion'
import { Upload, FileText, CheckCircle, Plus, X, Trash2, Save, Clipboard } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { ExpectedOrderRepository } from '@/repositories/ExpectedOrderRepository'
import type { ExpectedItem, ExpectedOrder } from '@/types'

interface NewOrderFormProps {
  onSaved?: () => void
  onCancel?: () => void
}

export const NewOrderForm: React.FC<NewOrderFormProps> = ({ onSaved, onCancel }) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importMode, setImportMode] = useState<'csv' | 'paste'>('csv')
  const [docId, setDocId] = useState('')
  const [purchaseOrder, setPurchaseOrder] = useState('')
  const [orderNote, setOrderNote] = useState('')
  const [documentType, setDocumentType] = useState('Picking List')
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [parsedItems, setParsedItems] = useState<ExpectedItem[]>([])
  const [pasteText, setPasteText] = useState('')
  const [savingOrder, setSavingOrder] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const handleCsvFile = async (file: File) => {
    setCsvFile(file)
    try {
      const text = await file.text()
      const lines = text.split('\n').filter(line => line.trim())
      if (lines.length < 2) {
        toast.error('El archivo debe tener encabezado y datos')
        return
      }
      
      const headers = lines[0].split(/[,\t;]/).map(h => h.trim().replace(/"/g, ''))
      const barcodeCol = headers.findIndex(h => /barcode|ean|sku|codigo/i.test(h))
      const nameCol = headers.findIndex(h => /nombre|descripcion|name|producto/i.test(h))
      const qtyCol = headers.findIndex(h => /cantidad|qty|cant|quantity|units/i.test(h))
      
      const items: ExpectedItem[] = []
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(/[,\t;]/).map(c => c.trim().replace(/"/g, ''))
        if (cols.length > 0 && cols[0]) {
          items.push({
            barcode: barcodeCol >= 0 ? cols[barcodeCol] : cols[0],
            name: nameCol >= 0 && cols[nameCol] ? cols[nameCol] : `Producto ${i}`,
            expectedQty: qtyCol >= 0 ? parseInt(cols[qtyCol]) || 1 : 1
          })
        }
      }
      
      setParsedItems(items)
      toast.success(`${items.length} items parseados`)
    } catch (err: unknown) {
      logger.error('NewOrderForm', 'Error CSV', err instanceof Error ? err.message : String(err));
      toast.error('Error al procesar CSV')
    }
  }

  const handlePasteText = (text: string) => {
    setPasteText(text)
    const lines = text.split('\n').filter(line => line.trim())
    const items: ExpectedItem[] = []
    
    for (let i = 0; i < lines.length; i++) {
      const cols = lines[i].split(/[\t,]/).map(c => c.trim())
      if (cols.length >= 2 && cols[0]) {
        items.push({
          barcode: cols[0],
          name: cols[1] || `Producto ${i + 1}`,
          expectedQty: cols[2] ? parseInt(cols[2]) || 1 : 1
        })
      }
    }
    
    setParsedItems(items)
  }

  const handleSaveOrder = async () => {
    if (parsedItems.length === 0) {
      toast.error('No hay items para guardar')
      return
    }
    
    setSavingOrder(true)
    try {
      const totalExpectedUnits = parsedItems.reduce((sum, i) => sum + (i.expectedQty || 0), 0)
      const totalExpectedSKUs = parsedItems.length
      
      const newOrder: ExpectedOrder = {
        id: `TL-${Date.now().toString(36).toUpperCase()}`,
        internalId: docId || `ORDEN-${Date.now()}`,
        importedAt: Date.now(),
        items: parsedItems,
        totalExpectedUnits,
        totalExpectedSKUs,
        metadata: {
          documentType,
          purchaseOrder,
          orderNote,
          internalGuide: docId
        }
      }
      
      await ExpectedOrderRepository.save(newOrder)
      toast.success('Carga teorica guardada exitosamente')
      onSaved?.()
    } catch (err: unknown) {
      logger.error('NewOrderForm', 'Error guardando', err instanceof Error ? err.message : String(err));
      toast.error(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSavingOrder(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file && file.name.endsWith('.csv')) {
      handleCsvFile(file)
    }
  }

  const totalUnits = parsedItems.reduce((acc, item) => acc + (item.expectedQty || 1), 0)

  return (
    <div className="space-y-6">
      {/* Selector de modo */}
      <div className="flex gap-2 p-1 bg-surface rounded-xl border border-subtle max-w-md">
        <button
          onClick={() => { setImportMode('csv'); setParsedItems([]); setCsvFile(null); }}
          className={cn(
            "flex-1 py-2.5 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-colors",
            importMode === 'csv' ? 'bg-blue-600 text-white' : 'text-muted hover:text-white'
          )}
        >
          <Upload className="w-4 h-4" />
          Subir CSV
        </button>
        <button
          onClick={() => { setImportMode('paste'); setParsedItems([]); setPasteText(''); }}
          className={cn(
            "flex-1 py-2.5 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-colors",
            importMode === 'paste' ? 'bg-blue-600 text-white' : 'text-muted hover:text-white'
          )}
        >
          <Clipboard className="w-4 h-4" />
          Copiar/Pegar
        </button>
      </div>

      {/* Tipo de documento */}
      <div className="bg-surface rounded-xl p-4 border border-subtle">
        <h4 className="text-xs font-black uppercase text-muted mb-3">Tipo de Documento</h4>
        <div className="flex flex-wrap gap-2">
          {['Picking List', 'Remision', 'Factura Compra', 'Manifiesto', 'Inventario Teorico'].map(type => (
            <button
              key={type}
              onClick={() => setDocumentType(type)}
              className={cn(
                "px-3 py-2 rounded-lg text-xs font-medium border transition-colors",
                documentType === type
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-base border-subtle text-muted hover:text-white'
              )}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Datos del documento */}
      <div className="bg-surface rounded-xl p-4 border border-subtle space-y-4">
        <h4 className="text-xs font-black uppercase text-muted">Datos del Documento</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-muted mb-1">Folio/Guia</label>
            <input
              type="text"
              value={docId}
              onChange={(e) => setDocId(e.target.value)}
              placeholder="Ej. FACTURA-4822"
              className="w-full bg-base border border-subtle rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">Orden de Compra</label>
            <input
              type="text"
              value={purchaseOrder}
              onChange={(e) => setPurchaseOrder(e.target.value)}
              placeholder="Ej. OC-2023"
              className="w-full bg-base border border-subtle rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">Observacion</label>
            <input
              type="text"
              value={orderNote}
              onChange={(e) => setOrderNote(e.target.value)}
              placeholder="Ej. Recibe Anen Sur"
              className="w-full bg-base border border-subtle rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Area de carga */}
      {importMode === 'csv' ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors",
            isDragging ? "border-blue-500 bg-blue-500/5" :
            csvFile ? "border-emerald-500 bg-emerald-500/5" :
            "border-subtle hover:border-white/20"
          )}
        >
          <input
            type="file"
            ref={fileInputRef}
            accept=".csv"
            onChange={(e) => e.target.files?.[0] && handleCsvFile(e.target.files[0])}
            className="hidden"
          />
          {csvFile ? (
            <div>
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <p className="text-sm font-medium text-emerald-500">{csvFile.name}</p>
              <p className="text-xs text-muted mt-1">{parsedItems.length} items encontrados</p>
            </div>
          ) : (
            <div>
              <Upload className="w-12 h-12 text-muted mx-auto mb-3" />
              <p className="text-sm font-medium text-primary">Arrastra CSV o haz clic</p>
              <p className="text-xs text-muted mt-1">Archivo .csv con columnas de barcode y cantidad</p>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-surface rounded-xl p-4 border border-subtle">
          <h4 className="text-xs font-black uppercase text-muted mb-3">Pegar datos (formato: barcode, nombre, cantidad)</h4>
          <textarea
            rows={8}
            value={pasteText}
            onChange={(e) => handlePasteText(e.target.value)}
            placeholder={"770200105312\tProducto A\t10\n770200114002\tProducto B\t20"}
            className="w-full bg-base border border-subtle rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-blue-500 resize-none"
          />
          {parsedItems.length > 0 && (
            <p className="text-xs text-emerald-500 mt-2">{parsedItems.length} items detectados</p>
          )}
        </div>
      )}

      {/* Preview de items */}
      {parsedItems.length > 0 && (
        <div className="bg-surface rounded-xl border border-subtle overflow-hidden">
          <div className="p-4 border-b border-subtle flex items-center justify-between">
            <h4 className="text-xs font-black uppercase text-muted">
              Preview ({parsedItems.length} SKUs, {totalUnits} unidades)
            </h4>
            <button
              onClick={() => setParsedItems([])}
              className="p-1.5 hover:bg-rose-500/10 text-rose-500 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {parsedItems.slice(0, 20).map((item, idx) => (
              <div key={idx} className="flex items-center justify-between px-4 py-2 border-b border-subtle last:border-b-0 text-xs">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="text-muted font-mono shrink-0">{idx + 1}</span>
                  <span className="font-mono text-muted truncate">{item.barcode}</span>
                  <span className="truncate">{item.name}</span>
                </div>
                <span className="font-bold text-blue-400 ml-3 shrink-0">{item.expectedQty}</span>
              </div>
            ))}
            {parsedItems.length > 20 && (
              <p className="text-xs text-center text-muted py-2">+{parsedItems.length - 20} items mas...</p>
            )}
          </div>
        </div>
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
          onClick={handleSaveOrder}
          disabled={savingOrder || parsedItems.length === 0}
          className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
        >
          {savingOrder ? (
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
              <Save className="w-5 h-5" />
            </motion.div>
          ) : (
            <>
              <Plus className="w-5 h-5" />
              Guardar Carga
            </>
          )}
        </button>
      </div>
    </div>
  )
}
