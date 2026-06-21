import { useState, useCallback, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';

// Re-export importer modules
export * from '../importer';

import { ExpectedOrderRepository } from '../../../repositories/ExpectedOrderRepository';
import { ExpectedOrder, ExpectedItem } from '../../../types';
import { useToastStore } from '@/stores';
import { parse } from 'papaparse';

export interface ColumnMappings {
  barcodeCol: string;
  nameCol: string;
  qtyCol: string;
}

// Tipo para filas parseadas de CSV (antes de mapping)
export interface CSVRow {
  [key: string]: string | number | undefined;
}

export function useExpectedOrders() {
  const { addToast } = useToastStore();
  
  // Real-time local expected orders list
  const savedOrders = useLiveQuery(() => ExpectedOrderRepository.getAll(), [], [] as ExpectedOrder[]);

  // Importer states
  const [docId, setDocId] = useState('');
  const [purchaseOrder, setPurchaseOrder] = useState('');
  const [orderNote, setOrderNote] = useState('');
  const [documentType, setDocumentType] = useState('Picking List');
  
  // File parsing states
  const [parsedRows, setParsedRows] = useState<CSVRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState('');
  
  // Column Mappings
  const [mappings, setMappings] = useState<ColumnMappings>({
    barcodeCol: '',
    nameCol: '',
    qtyCol: ''
  });

  // Manual paste entry state
  const [pasteText, setPasteText] = useState('');
  
  // Active step: 'list' | 'import-upload' | 'import-map' | 'import-preview'
  const [activeStep, setActiveStep] = useState<'list' | 'import'>('list');
  const [importMode, setImportMode] = useState<'csv' | 'paste'>('csv');

  // Load selection
  const [selectedSavedOrderId, setSelectedSavedOrderId] = useState<string | null>(null);

  // Computed preview of products being parsed/mapped
  const previewItems = useMemo<ExpectedItem[]>(() => {
    if (importMode === 'csv') {
      if (parsedRows.length === 0 || !mappings.barcodeCol || !mappings.qtyCol) return [];
      
      return parsedRows.map((row) => {
        const rawBarcode = String(row[mappings.barcodeCol] || '').trim();
        const rawName = mappings.nameCol ? String(row[mappings.nameCol] || '').trim() : `Producto ${rawBarcode}`;
        const rawQty = parseFloat(String(row[mappings.qtyCol] || '0').replace(/[^0-9.]/g, ''));
        
        return {
          barcode: rawBarcode,
          name: rawName,
          expectedQty: isNaN(rawQty) ? 0 : rawQty,
        };
      }).filter(item => item.barcode !== '');
    } else {
      // Paste mode parsing: intelligent tab-separated (including SAP multi-line copy-paste format), comma-separated or semicolon-separated
      if (!pasteText.trim()) return [];
      
      const lines = pasteText.split('\n');
      const items: ExpectedItem[] = [];

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;

        // Skip headers
        if (
          trimmedLine.toLowerCase().includes('sku') && 
          (trimmedLine.toLowerCase().includes('descrip') || trimmedLine.toLowerCase().includes('cant'))
        ) {
          continue;
        }

        // Try to split
        let parts = trimmedLine.split('\t');
        const isTabSeparated = parts.length >= 2;
        
        if (!isTabSeparated) {
          parts = trimmedLine.split(',');
        }
        if (parts.length < 2) {
          parts = trimmedLine.split(';');
        }

        // If it doesn't split into columns, skip it (helps ignore SAP wrapped multi-line noise like lote, date, obs)
        if (parts.length < 2) {
          continue;
        }

        const rawBarcode = String(parts[0] || '').trim();

        // Extra guard to filter out invalid barcodes or single digits or labels in SAP
        if (!rawBarcode || rawBarcode.length < 3 || rawBarcode.includes('/') || ['und', 'unid', 'unidad', 'lote', 'fecha', 'observacion'].includes(rawBarcode.toLowerCase())) {
          continue;
        }

        let rawName = `SKU ${rawBarcode}`;
        let rawQty = 1;

        if (isTabSeparated && parts.length >= 4) {
          // SAP Clipboard: SKU (parts[0]), Descripción (parts[1]), U.Medida (parts[2]), Despachado (parts[3])
          rawName = String(parts[1] || '').trim();
          const p3 = String(parts[3] || '').trim();
          const cleanQtyStr = p3.replace(/[^0-9.-]/g, '');
          const parsedQty = parseInt(cleanQtyStr, 10);
          if (!isNaN(parsedQty)) {
            rawQty = parsedQty;
          }
        } else if (parts.length >= 3) {
          // Regular Tab or Column based: Barcode, Name, Qty
          rawName = String(parts[1] || '').trim();
          const cleanQtyStr = String(parts[2] || '').replace(/[^0-9.-]/g, '');
          const parsedQty = parseInt(cleanQtyStr, 10);
          if (!isNaN(parsedQty)) {
            rawQty = parsedQty;
          }
        } else if (parts.length === 2) {
          // Barcode, Qty or Barcode, Name
          const cleanQtyStr = String(parts[1] || '').replace(/[^0-9.-]/g, '');
          const parsedQty = parseInt(cleanQtyStr, 10);
          if (!isNaN(parsedQty)) {
            rawQty = parsedQty;
            rawName = `SKU ${rawBarcode}`;
          } else {
            rawName = String(parts[1] || '').trim();
          }
        }

        items.push({
          barcode: rawBarcode,
          name: rawName || `SKU ${rawBarcode}`,
          expectedQty: rawQty
        });
      }

      return items;
    }
  }, [importMode, parsedRows, mappings, pasteText]);

  // Totals for active preview
  const previewStats = useMemo(() => {
    const totalLines = previewItems.length;
    const totalUnits = previewItems.reduce((acc, curr) => acc + curr.expectedQty, 0);
    return {
      skuCount: totalLines,
      unitCount: totalUnits
    };
  }, [previewItems]);

  const resetImporter = useCallback(() => {
    setDocId('');
    setPurchaseOrder('');
    setOrderNote('');
    setParsedRows([]);
    setHeaders([]);
    setFileName('');
    setPasteText('');
    setMappings({
      barcodeCol: '',
      nameCol: '',
      qtyCol: ''
    });
  }, []);

  // Handle uploaded CSV file
  const handleCsvFile = useCallback((file: File) => {
    setFileName(file.name);
    // Auto populate document ID with the base name of the file
    const safeName = file.name.replace(/\.[^/.]+$/, "").toUpperCase();
    setDocId(prev => prev || safeName);
    
    parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data as any[];
        if (rows.length === 0) {
          addToast("El archivo CSV está vacío o es inválido", "error");
          return;
        }
        
        const foundHeaders = Object.keys(rows[0]);
        setHeaders(foundHeaders);
        setParsedRows(rows);

        // Intelligent auto-mapping of common headers
        const barcodeGuess = foundHeaders.find(h => 
          /barcode|ean|upc|codigo|código|sku|sku_id/i.test(h)
        ) || foundHeaders[0] || '';
        
        const nameGuess = foundHeaders.find(h => 
          /name|desc|nombre|descripcion|artículo|articulo|producto/i.test(h)
        ) || '';
        
        const qtyGuess = foundHeaders.find(h => 
          /qty|cant|cantidad|unidades|esperado|expected|quantity/i.test(h)
        ) || '';

        setMappings({
          barcodeCol: barcodeGuess,
          nameCol: nameGuess,
          qtyCol: qtyGuess
        });

        addToast(`CSV leído: ${rows.length} filas detectadas.`, "info");
      },
      error: (err) => {
        addToast(`Error al estructurar CSV: ${err.message}`, "error");
      }
    });
  }, [addToast]);

  // Save parsed order to DB
  const saveOrder = useCallback(async () => {
    const cleanId = docId.trim().toUpperCase();
    if (!cleanId) {
      addToast("Debes asignar un Identificador de Documento o Folio", "warning");
      return;
    }

    if (previewItems.length === 0) {
      addToast("No hay registros válidos para guardar", "warning");
      return;
    }

    // Check for duplicate barcode items in the parsed list and merge them
    const mergedMap = new Map<string, ExpectedItem>();
    previewItems.forEach(item => {
      const existing = mergedMap.get(item.barcode);
      if (existing) {
        existing.expectedQty += item.expectedQty;
      } else {
        mergedMap.set(item.barcode, { ...item });
      }
    });

    const finalItems = Array.from(mergedMap.values());

    const expectedOrder: ExpectedOrder = {
      id: cleanId,
      internalId: cleanId,
      items: finalItems,
      totalExpectedUnits: finalItems.reduce((acc, c) => acc + c.expectedQty, 0),
      totalExpectedSKUs: finalItems.length,
      importedAt: Date.now(),
      metadata: {
        documentType: documentType || 'Picking List',
        date: new Date().toLocaleDateString(),
        purchaseOrder: purchaseOrder.trim(),
        orderNote: orderNote.trim()
      }
    };

    try {
      await ExpectedOrderRepository.save(expectedOrder);
      
      // Sincronizar con la nube (Tabla PEDIDOS)
      let cloudSynced = false;
      let cloudError = '';
      
      if (navigator.onLine) {
        try {
          const result = await ExpectedOrderRepository.uploadToCloud(expectedOrder);
          if (result.success) {
            cloudSynced = true;
          } else {
            cloudError = result.error || 'Error desconocido';
          }
        } catch (syncErr: any) {
          cloudError = syncErr.message || String(syncErr);
        }
      }

      if (cloudSynced) {
        addToast(`Carga teórica "${cleanId}" guardada y sincronizada con la nube (${finalItems.length} SKUs)`, "success");
      } else if (navigator.onLine && cloudError) {
        addToast(`Guardado localmente. Error al sincronizar: ${cloudError}`, "warning");
      } else {
        addToast(`Guardado en base de datos local (sin conexión)`, "info");
      }

      resetImporter();
      setActiveStep('list');
    } catch (err: any) {
      addToast(`Error al guardar: ${err.message}`, "error");
    }
  }, [docId, documentType, purchaseOrder, orderNote, previewItems, resetImporter, addToast]);

  const deleteOrder = useCallback(async (id: string) => {
    try {
      await ExpectedOrderRepository.delete(id);
      
      // Eliminar también de la nube (Tabla PEDIDOS)
      let cloudDeleted = false;
      if (navigator.onLine) {
        try {
          const result = await ExpectedOrderRepository.deleteFromCloud(id);
          cloudDeleted = result.success;
        } catch (syncErr) {
          console.warn("No se pudo eliminar de la nube:", syncErr);
        }
      }

      if (cloudDeleted) {
        addToast("Carga teórica eliminada de la base de datos local y de la nube", "success");
      } else {
        addToast("Carga teórica eliminada localmente", "success");
      }

      if (selectedSavedOrderId === id) {
        setSelectedSavedOrderId(null);
      }
    } catch (err: any) {
      addToast(`Error al borrar: ${err.message}`, "error");
    }
  }, [selectedSavedOrderId, addToast]);

  // Sync states
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);

  // Download orders from cloud
  const downloadFromCloud = useCallback(async () => {
    if (!navigator.onLine) {
      addToast("Sin conexión a internet. No se pueden descargar pedidos desde la nube.", "warning");
      return;
    }

    setIsSyncing(true);
    try {
      const result = await ExpectedOrderRepository.downloadFromCloud();
      
      if (result.success) {
        setLastSyncTime(Date.now());
        if (result.orders.length === 0) {
          addToast("No hay pedidos en la nube para descargar.", "info");
        } else {
          addToast(`Se descargaron ${result.orders.length} cargas teóricas desde la nube.`, "success");
        }
      } else {
        addToast(`Error al descargar desde la nube: ${result.error}`, "error");
      }
    } catch (err: any) {
      addToast(`Error de conexión: ${err.message}`, "error");
    } finally {
      setIsSyncing(false);
    }
  }, [addToast]);

  // Upload a single order to cloud
  const uploadOrderToCloud = useCallback(async (order: ExpectedOrder) => {
    if (!navigator.onLine) {
      addToast("Sin conexión a internet. El pedido se guardará localmente.", "warning");
      return false;
    }

    try {
      const result = await ExpectedOrderRepository.uploadToCloud(order);
      if (result.success) {
        return true;
      } else {
        addToast(`Error al subir a la nube: ${result.error}`, "warning");
        return false;
      }
    } catch (err: any) {
      addToast(`Error de conexión: ${err.message}`, "warning");
      return false;
    }
  }, [addToast]);

  // Sync all local orders to cloud
  const syncAllToCloud = useCallback(async () => {
    if (!navigator.onLine) {
      addToast("Sin conexión a internet. No se pueden sincronizar pedidos.", "warning");
      return;
    }

    setIsSyncing(true);
    try {
      let uploadedCount = 0;
      let errorCount = 0;

      for (const order of savedOrders) {
        const result = await ExpectedOrderRepository.uploadToCloud(order);
        if (result.success) {
          uploadedCount++;
        } else {
          errorCount++;
        }
      }

      if (errorCount === 0) {
        addToast(`Se sincronizaron ${uploadedCount} cargas teóricas a la nube.`, "success");
        setLastSyncTime(Date.now());
      } else {
        addToast(`Sincronizados ${uploadedCount}, errores: ${errorCount}`, "warning");
      }
    } catch (err: any) {
      addToast(`Error de sincronización: ${err.message}`, "error");
    } finally {
      setIsSyncing(false);
    }
  }, [savedOrders, addToast]);

  const selectedSavedOrder = useMemo(() => {
    if (!selectedSavedOrderId) return null;
    return savedOrders.find(o => o.id === selectedSavedOrderId) || null;
  }, [selectedSavedOrderId, savedOrders]);

  return {
    state: {
      savedOrders,
      activeStep,
      importMode,
      docId,
      purchaseOrder,
      orderNote,
      documentType,
      parsedRows,
      headers,
      fileName,
      mappings,
      pasteText,
      previewItems,
      previewStats,
      selectedSavedOrderId,
      selectedSavedOrder,
      isSyncing,
      lastSyncTime,
    },
    actions: {
      setActiveStep,
      setImportMode,
      setDocId,
      setPurchaseOrder,
      setOrderNote,
      setDocumentType,
      setMappings,
      setPasteText,
      handleCsvFile,
      saveOrder,
      deleteOrder,
      setSelectedSavedOrderId,
      resetImporter,
      downloadFromCloud,
      uploadOrderToCloud,
      syncAllToCloud,
    }
  };
}
