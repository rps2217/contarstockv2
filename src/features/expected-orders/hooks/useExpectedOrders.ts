import { useState, useCallback, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ExpectedOrderRepository } from '../../../repositories/ExpectedOrderRepository';
import { ExpectedOrder, ExpectedItem } from '../../../types';
import { useToastStore } from '../../../store/useToastStore';
import { parse } from 'papaparse';

export interface ColumnMappings {
  barcodeCol: string;
  nameCol: string;
  qtyCol: string;
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
  const [parsedRows, setParsedRows] = useState<any[]>([]);
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
      // Paste mode parsing: tab-separated, comma-separated or semicolon-separated
      if (!pasteText.trim()) return [];
      
      const lines = pasteText.split('\n');
      return lines.map((line) => {
        // split by tab first, then fall back to comma, then semicolon
        let parts = line.split('\t');
        if (parts.length < 2) parts = line.split(',');
        if (parts.length < 2) parts = line.split(';');
        
        const rawBarcode = String(parts[0] || '').trim();
        const rawName = parts.length > 2 ? String(parts[1] || '').trim() : `SKU ${rawBarcode}`;
        const rawQtyStr = parts.length > 2 ? parts[2] : (parts[1] || '0');
        const rawQty = parseInt(String(rawQtyStr || '0').replace(/[^0-9]/g, ''), 10);
        
        return {
          barcode: rawBarcode,
          name: rawName || `SKU ${rawBarcode}`,
          expectedQty: isNaN(rawQty) ? 1 : rawQty
        };
      }).filter(item => item.barcode !== '');
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
      
      // Sincronizar en tiempo real con la nube (Tabla PEDIDOS)
      let cloudSynced = false;
      let cloudError = '';
      
      if (navigator.onLine) {
        try {
          const cloudPayload = finalItems.map(item => ({
            id: `${cleanId}_${item.barcode}`.toUpperCase(),
            erp: cleanId,
            barcode: item.barcode,
            name: item.name,
            qty: item.expectedQty
          }));
          
          const { supabaseSyncService } = await import('../../../services/supabaseSyncService');
          const uploadResult = await supabaseSyncService.pushBatch('PEDIDOS', cloudPayload);
          if (uploadResult && uploadResult.success) {
            cloudSynced = true;
          } else {
            cloudError = uploadResult?.error || 'Error desconocido';
          }
        } catch (syncErr: any) {
          cloudError = syncErr.message || String(syncErr);
        }
      }

      if (cloudSynced) {
        addToast(`Carga teórica "${cleanId}" guardada y sincronizada con la nube con éxito (${finalItems.length} SKUs)`, "success");
      } else if (navigator.onLine && cloudError) {
        addToast(`Guardado localmente. Error al sincronizar con la nube: ${cloudError}`, "warning");
      } else {
        addToast(`Guardado en base de datos local (se sincronizará en el centro de control)`, "info");
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
          const { supabase } = await import('../../../lib/supabase');
          const { error } = await supabase
            .from('PEDIDOS')
            .delete()
            .eq('erp', id.toUpperCase());
          
          if (!error) {
            cloudDeleted = true;
          }
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
      selectedSavedOrder
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
      resetImporter
    }
  };
}
