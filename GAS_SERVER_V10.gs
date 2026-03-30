/**
 * GOOGLE APPS SCRIPT - LOGICOUNT v8.3.5 (Enterprise Core)
 * Sincronización Bidireccional de Vencimientos y Gestión de Inventario
 */

function normalizeHeader(h) {
  return String(h).toUpperCase().replace(/[^A-Z0-9_]/g, "");
}

function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  var action = data.action;
  
  // Autenticación básica
  var secret = PropertiesService.getScriptProperties().getProperty('GAS_SECRET');
  if (secret && data.secret !== secret) {
    return JSONResponse({ success: false, error: "No autorizado" });
  }
  
  switch(action) {
    case 'get_metadata': return JSONResponse(getMetadata(data));
    case 'update_config': return JSONResponse(updateConfig(data));
    case 'updateConfig': return JSONResponse(updateConfig(data));
    case 'upload_photo': return JSONResponse(uploadPhoto(data));
    case 'append_rows': return JSONResponse(appendRows(data));
    case 'upsert_rows': return JSONResponse(upsertRows(data));
    case 'fetch_rows': return JSONResponse(fetchRows(data));
    case 'upsert_products': return JSONResponse(upsertProducts(data));
    case 'get_summary': return JSONResponse(getSummary(data));
    case 'add_expiration': return JSONResponse(addExpiration(data));
    case 'bulk_add_expirations': return JSONResponse(bulkAddExpirations(data));
    case 'remove_expiration': return JSONResponse(removeExpiration(data));
    case 'bulk_remove_expirations': return JSONResponse(bulkRemoveExpirations(data));
    case 'ping': return JSONResponse({ success: true, message: "Engine Online" });
    default: return JSONResponse({ success: false, error: "Acción no válida: " + action });
  }
}

function JSONResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function logErrorAndReturnGeneric(e) {
  console.error("Error en backend: " + e.toString());
  return { success: false, error: "Error interno del servidor" };
}

// --- FUNCIONES DE VENCIMIENTO (NUEVAS Y CORREGIDAS) ---

function addExpiration(data) {
  try {
    var ss = SpreadsheetApp.openById(data.spreadsheetId);
    var sheet = ss.getSheetByName("REGISTRO_INV");
    if (!sheet) return { success: false, error: "Hoja REGISTRO_INV no encontrada" };

    // Normalización de datos
    var barcode = String(data.barcode || "").trim();
    var mm = parseInt(data.mm);
    var yyyy = parseInt(data.yyyy);
    var quantity = parseInt(data.quantity);

    if (isNaN(mm) || isNaN(yyyy)) return { success: false, error: "Mes o año inválido" };
    
    var lastDay = new Date(yyyy, mm, 0).getDate();
    var mmPadded = ("0" + mm).slice(-2);
    var ddPadded = ("0" + lastDay).slice(-2);
    
    // Generación de CLAVE_UNICA (SKU + YYYY + MM + DD_FIN_MES) o usar la enviada por el cliente
    var claveUnica = data.claveUnica || (barcode + yyyy + mmPadded + ddPadded);

    // Fecha de ingreso formateada dd/MM/yyyy para que Sheets la reconozca como fecha
    var now = new Date();
    var fechaIngreso = Utilities.formatDate(now, "GMT-3", "dd/MM/yyyy");

    // Mapeo exacto de datos a normalizar (usando los nombres exactos de tus columnas)
    var rowData = {
      "ID_REGISTRO": data.id || Utilities.getUuid(),
      "ID": data.id || Utilities.getUuid(),
      "CLAVE_UNICA": claveUnica,
      "CLAVE": claveUnica,
      "FECHA_INGRESO": fechaIngreso,
      "FECHA": fechaIngreso,
      "COD_BARRAS": barcode,
      "CODPRODUCTO": barcode,
      "SKU": barcode,
      "DESCRIPCION_PROD": data.productName,
      "DESCRIPCION": data.productName,
      "MM": mm,
      "MES": mm,
      "YYYY": yyyy,
      "ANO": yyyy,
      "EVENTO": data.event || "VENCIMIENTOS",
      "CANTIDAD": !isNaN(quantity) ? quantity : "",
      "FRC": data.frc || "",
      "NGUIA": data.nguia || "",
      "GUIA": data.nguia || "",
      "ETIQUETAS": "MANUAL",
      "BOD": data.location || "",
      "DESTINO": data.destino || "",
      "DOCTRASINTER": data.traspaso || "",
      "TRASPASO": data.traspaso || "",
      "OBS": data.observaciones || "",
      "OBSERVACIONES": data.observaciones || "",
      "FECHACC": data.fechaCC || "",
      "FECHA_CC": data.fechaCC || "",
      "CANT": !isNaN(quantity) ? quantity : ""
    };

    // Validación de duplicados en la nube - SI EXISTE, ACTUALIZAMOS
    var lastRow = sheet.getLastRow();
    if (lastRow >= 2) {
      var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      var normalizedHeaders = headers.map(normalizeHeader);
      var claveColIdx = normalizedHeaders.indexOf("CLAVE_UNICA");
      if (claveColIdx === -1) claveColIdx = normalizedHeaders.indexOf("CLAVEUNICA");
      if (claveColIdx === -1) claveColIdx = normalizedHeaders.indexOf("CLAVE");
      
      if (claveColIdx !== -1) {
        var existingClaves = sheet.getRange(2, claveColIdx + 1, lastRow - 1, 1).getValues().flat().map(String);
        var rowIndex = existingClaves.indexOf(claveUnica);
        
        if (rowIndex !== -1) {
          // ACTUALIZAR FILA EXISTENTE
          var rowNumber = rowIndex + 2;
          var currentRowValues = sheet.getRange(rowNumber, 1, 1, headers.length).getValues()[0];
          
          var updatedRow = normalizedHeaders.map(function(normH, idx) {
            // Permitir borrar explícitamente DESTINO, DOCTRASINTER y OBS
            if (normH === "DESTINO" && data.destino !== undefined) return data.destino;
            if (normH === "DOCTRASINTER" && data.traspaso !== undefined) return data.traspaso;
            if (normH === "TRASPASO" && data.traspaso !== undefined) return data.traspaso;
            if (normH === "OBS" && data.observaciones !== undefined) return data.observaciones;
            if (normH === "OBSERVACIONES" && data.observaciones !== undefined) return data.observaciones;
            if (normH === "FECHACC" && data.fechaCC !== undefined) return data.fechaCC;
            if (normH === "FECHA_CC" && data.fechaCC !== undefined) return data.fechaCC;
            
            // Solo actualizamos si el nuevo dato no es nulo/indefinido
            if (rowData[normH] !== undefined && rowData[normH] !== "") return rowData[normH];
            return currentRowValues[idx];
          });
          
          sheet.getRange(rowNumber, 1, 1, headers.length).setValues([updatedRow]);
          return { success: true, message: "Actualizado", id: data.id, clave: claveUnica };
        }
      }
    }

    // SI NO EXISTE, AGREGAMOS NUEVA FILA
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var normalizedHeaders = headers.map(normalizeHeader);
    
    var newRow = normalizedHeaders.map(function(normH) {
      return rowData[normH] !== undefined ? rowData[normH] : "";
    });

    sheet.appendRow(newRow);

    return { success: true, id: data.id, clave: claveUnica };
  } catch (e) {
    return logErrorAndReturnGeneric(e);
  }
}

function removeExpiration(data) {
  try {
    var ss = SpreadsheetApp.openById(data.spreadsheetId);
    var sheet = ss.getSheetByName("REGISTRO_INV");
    if (!sheet) return { success: false, error: "Hoja REGISTRO_INV no encontrada" };

    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return { success: true }; // Nada que borrar

    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var normalizedHeaders = headers.map(normalizeHeader);
    var claveColIdx = normalizedHeaders.indexOf("CLAVE_UNICA");
    if (claveColIdx === -1) claveColIdx = normalizedHeaders.indexOf("CLAVEUNICA");
    if (claveColIdx === -1) claveColIdx = normalizedHeaders.indexOf("CLAVE");
    
    if (claveColIdx === -1) return { success: false, error: "Columna CLAVE_UNICA no encontrada" };

    var claves = sheet.getRange(2, claveColIdx + 1, lastRow - 1, 1).getValues().flat().map(String);
    var targetClave = String(data.claveUnica || "").trim();
    
    var rowIndex = claves.indexOf(targetClave);

    if (rowIndex !== -1) {
      sheet.deleteRow(rowIndex + 2); 
      return { success: true };
    } else {
      return { success: false, error: "NOT_FOUND", details: "Clave no hallada: " + targetClave };
    }
  } catch (e) {
    return logErrorAndReturnGeneric(e);
  }
}

function bulkAddExpirations(data) {
  try {
    var ss = SpreadsheetApp.openById(data.spreadsheetId);
    var sheet = ss.getSheetByName("REGISTRO_INV");
    if (!sheet) return { success: false, error: "Hoja REGISTRO_INV no encontrada" };

    var items = data.items;
    if (!items || !items.length) return { success: true, added: 0, updated: 0 };

    var lastRow = sheet.getLastRow();
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var normalizedHeaders = headers.map(normalizeHeader);
    
    var claveColIdx = normalizedHeaders.indexOf("CLAVE_UNICA");
    if (claveColIdx === -1) claveColIdx = normalizedHeaders.indexOf("CLAVEUNICA");
    if (claveColIdx === -1) claveColIdx = normalizedHeaders.indexOf("CLAVE");

    var fullData = sheet.getDataRange().getValues();
    var claveMap = {};
    if (claveColIdx !== -1) {
      for (var i = 1; i < fullData.length; i++) {
        claveMap[String(fullData[i][claveColIdx])] = i;
      }
    }

    var added = 0;
    var updated = 0;
    var now = new Date();
    var fechaIngreso = Utilities.formatDate(now, "GMT-3", "dd/MM/yyyy");

    items.forEach(function(item) {
      var barcode = String(item.barcode || "").trim();
      var mm = parseInt(item.mm);
      var yyyy = parseInt(item.yyyy);
      var quantity = parseInt(item.quantity);
      
      var mmPadded = ("0" + mm).slice(-2);
      var lastDay = new Date(yyyy, mm, 0).getDate();
      var ddPadded = ("0" + lastDay).slice(-2);
      var claveUnica = item.claveUnica || (barcode + yyyy + mmPadded + ddPadded);

      var rowData = {
        "ID_REGISTRO": item.id || Utilities.getUuid(),
        "ID": item.id || Utilities.getUuid(),
        "CLAVE_UNICA": claveUnica,
        "CLAVE": claveUnica,
        "FECHA_INGRESO": fechaIngreso,
        "FECHA": fechaIngreso,
        "COD_BARRAS": barcode,
        "CODPRODUCTO": barcode,
        "SKU": barcode,
        "DESCRIPCION_PROD": item.productName,
        "DESCRIPCION": item.productName,
        "MM": mm,
        "MES": mm,
        "YYYY": yyyy,
        "ANO": yyyy,
        "EVENTO": item.event || "VENCIMIENTOS",
        "CANTIDAD": !isNaN(quantity) ? quantity : "",
        "FRC": item.frc || "",
        "NGUIA": item.nguia || "",
        "GUIA": item.nguia || "",
        "ETIQUETAS": "MANUAL",
        "BOD": item.location || "",
        "DESTINO": item.destino || "",
        "DOCTRASINTER": item.traspaso || "",
        "TRASPASO": item.traspaso || "",
        "OBS": item.observaciones || "",
        "OBSERVACIONES": item.observaciones || "",
        "FECHACC": item.fechaCC || "",
        "FECHA_CC": item.fechaCC || "",
        "CANT": !isNaN(quantity) ? quantity : ""
      };

      var existingRowIdx = claveMap[claveUnica];
      if (existingRowIdx !== undefined) {
        var currentValues = fullData[existingRowIdx];
        var updatedRow = normalizedHeaders.map(function(normH, idx) {
          if (normH === "DESTINO" && item.destino !== undefined) return item.destino;
          if (normH === "DOCTRASINTER" && item.traspaso !== undefined) return item.traspaso;
          if (normH === "TRASPASO" && item.traspaso !== undefined) return item.traspaso;
          if (normH === "OBS" && item.observaciones !== undefined) return item.observaciones;
          if (normH === "OBSERVACIONES" && item.observaciones !== undefined) return item.observaciones;
          if (normH === "FECHACC" && item.fechaCC !== undefined) return item.fechaCC;
          if (normH === "FECHA_CC" && item.fechaCC !== undefined) return item.fechaCC;
          
          if (rowData[normH] !== undefined && rowData[normH] !== "") return rowData[normH];
          return currentValues[idx];
        });
        fullData[existingRowIdx] = updatedRow;
        updated++;
      } else {
        var newRow = normalizedHeaders.map(function(normH) {
          return rowData[normH] !== undefined ? rowData[normH] : "";
        });
        fullData.push(newRow);
        claveMap[claveUnica] = fullData.length - 1;
        added++;
      }
    });

    if (added > 0 || updated > 0) {
      sheet.getRange(1, 1, fullData.length, headers.length).setValues(fullData);
    }

    return { success: true, added: added, updated: updated };
  } catch (e) {
    return logErrorAndReturnGeneric(e);
  }
}

function bulkRemoveExpirations(data) {
  try {
    var ss = SpreadsheetApp.openById(data.spreadsheetId);
    var sheet = ss.getSheetByName("REGISTRO_INV");
    if (!sheet) return { success: false, error: "Hoja REGISTRO_INV no encontrada" };

    var clavesToRemove = data.claves;
    if (!clavesToRemove || !clavesToRemove.length) return { success: true, removed: 0 };

    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return { success: true, removed: 0 };

    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var normalizedHeaders = headers.map(normalizeHeader);
    var claveColIdx = normalizedHeaders.indexOf("CLAVE_UNICA");
    if (claveColIdx === -1) claveColIdx = normalizedHeaders.indexOf("CLAVEUNICA");
    if (claveColIdx === -1) claveColIdx = normalizedHeaders.indexOf("CLAVE");
    
    if (claveColIdx === -1) return { success: false, error: "Columna CLAVE_UNICA no encontrada" };

    var fullData = sheet.getDataRange().getValues();
    var newData = [fullData[0]]; // Mantener cabeceras
    var removed = 0;
    var clavesSet = {};
    clavesToRemove.forEach(function(c) { clavesSet[String(c).trim()] = true; });

    for (var i = 1; i < fullData.length; i++) {
      var clave = String(fullData[i][claveColIdx]).trim();
      if (clavesSet[clave]) {
        removed++;
      } else {
        newData.push(fullData[i]);
      }
    }

    if (removed > 0) {
      sheet.clearContents();
      sheet.getRange(1, 1, newData.length, headers.length).setValues(newData);
    }

    return { success: true, removed: removed };
  } catch (e) {
    return logErrorAndReturnGeneric(e);
  }
}

// --- FUNCIONES ORIGINALES (MANTENIDAS PARA COMPATIBILIDAD) ---

function fetchRows(data) {
  try {
    var ss = SpreadsheetApp.openById(data.spreadsheetId);
    var sheet = ss.getSheetByName(data.tableName);
    if (!sheet) return { success: false, error: "Hoja no encontrada: " + data.tableName };
    
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return { success: true, rows: [], server_timestamp: new Date().getTime() };
    
    var values = sheet.getDataRange().getValues();
    var headers = values[0];
    var lastSyncTimestamp = parseInt(data.lastSyncTimestamp || 0);
    var rows = [];
    
    // Identificar columnas de fecha para el filtro delta
    var normalizedHeaders = headers.map(normalizeHeader);
    var tsIdx = normalizedHeaders.indexOf("TIMESTAMP");
    if (tsIdx === -1) tsIdx = normalizedHeaders.indexOf("FECHA_INGRESO");
    if (tsIdx === -1) tsIdx = normalizedHeaders.indexOf("FECHA");
    
    for (var i = 1; i < values.length; i++) {
      var rowValues = values[i];
      
      // Aplicar filtro Delta si hay un timestamp de referencia
      if (lastSyncTimestamp > 0 && tsIdx !== -1) {
        var rawDate = rowValues[tsIdx];
        var rowTime = 0;
        if (rawDate instanceof Date) {
          rowTime = rawDate.getTime();
        } else if (rawDate) {
          rowTime = new Date(rawDate).getTime();
        }
        
        // Si no pudimos parsear la fecha o la fecha es anterior, saltamos la fila
        if (isNaN(rowTime) || rowTime <= lastSyncTimestamp) continue;
      }
      
      var row = {};
      for (var j = 0; j < headers.length; j++) {
        row[headers[j]] = rowValues[j];
      }
      rows.push(row);
    }
    
    return { success: true, rows: rows, server_timestamp: new Date().getTime() };
  } catch (e) {
    return logErrorAndReturnGeneric(e);
  }
}

function appendRows(data) {
  try {
    var ss = SpreadsheetApp.openById(data.spreadsheetId);
    var sheet = ss.getSheetByName(data.tableName);
    if (!sheet) return { success: false, error: "Hoja no encontrada" };
    
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var normalizedHeaders = headers.map(normalizeHeader);
    var rows = data.rows;
    
    for (var i = 0; i < rows.length; i++) {
      var rowData = rows[i];
      var normalizedRowData = {};
      for (var key in rowData) {
        normalizedRowData[normalizeHeader(key)] = rowData[key];
      }
      
      var newRow = normalizedHeaders.map(function(normH) {
        return normalizedRowData[normH] !== undefined ? normalizedRowData[normH] : "";
      });
      sheet.appendRow(newRow);
    }
    
    return { success: true, rows_written: rows.length };
  } catch (e) {
    return logErrorAndReturnGeneric(e);
  }
}

function upsertRows(data) {
  try {
    var ss = SpreadsheetApp.openById(data.spreadsheetId);
    var sheet = ss.getSheetByName(data.tableName);
    if (!sheet) return { success: false, error: "Hoja no encontrada: " + data.tableName };
    
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    if (lastCol === 0) return { success: false, error: "Hoja vacía sin encabezados" };
    
    var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    var normalizedHeaders = headers.map(normalizeHeader);
    
    // Identificar columna de ID (ID o ID_REGISTRO o CLAVE_UNICA)
    var idColIdx = normalizedHeaders.indexOf("ID");
    if (idColIdx === -1) idColIdx = normalizedHeaders.indexOf("ID_REGISTRO");
    if (idColIdx === -1) idColIdx = normalizedHeaders.indexOf("CLAVE_UNICA");
    
    if (idColIdx === -1) {
      return appendRows(data);
    }
    
    var rows = data.rows;
    var updated = 0;
    var added = 0;
    
    // Si la hoja es pequeña (< 5000 filas), usamos Read-Modify-Write total para máxima velocidad
    if (lastRow < 5000) {
      var fullData = sheet.getDataRange().getValues();
      var idMap = {};
      for (var i = 1; i < fullData.length; i++) {
        idMap[String(fullData[i][idColIdx])] = i;
      }
      
      var newRows = [];
      for (var i = 0; i < rows.length; i++) {
        var rowData = rows[i];
        var normalizedRowData = {};
        for (var key in rowData) {
          normalizedRowData[normalizeHeader(key)] = rowData[key];
        }
        
        var rowId = String(normalizedRowData["ID"] || normalizedRowData["ID_REGISTRO"] || normalizedRowData["CLAVE_UNICA"] || "");
        var valuesRow = normalizedHeaders.map(function(normH) {
          return normalizedRowData[normH] !== undefined ? normalizedRowData[normH] : "";
        });
        
        var existingRowIdx = rowId ? idMap[rowId] : null;
        
        if (existingRowIdx !== null) {
          var currentValues = fullData[existingRowIdx];
          var hasChanges = valuesRow.some(function(val, idx) { 
            return String(val) !== String(currentValues[idx]); 
          });
          
          if (hasChanges) {
            fullData[existingRowIdx] = valuesRow;
            updated++;
          }
        } else {
          fullData.push(valuesRow);
          if (rowId) idMap[rowId] = fullData.length - 1;
          added++;
        }
      }
      
      if (updated > 0 || added > 0) {
        sheet.getRange(1, 1, fullData.length, headers.length).setValues(fullData);
      }
    } else {
      // Para hojas grandes, usamos el mapeo de IDs pero escribimos individualmente o en bloques si es posible
      // Mapeo de IDs existentes para búsqueda rápida O(1)
      var idMap = {};
      var existingIds = sheet.getRange(2, idColIdx + 1, lastRow - 1, 1).getValues();
      for (var i = 0; i < existingIds.length; i++) {
        idMap[String(existingIds[i][0])] = i + 2;
      }
      
      var pendingAppends = [];
      
      for (var i = 0; i < rows.length; i++) {
        var rowData = rows[i];
        var normalizedRowData = {};
        for (var key in rowData) {
          normalizedRowData[normalizeHeader(key)] = rowData[key];
        }
        
        var rowId = String(normalizedRowData["ID"] || normalizedRowData["ID_REGISTRO"] || normalizedRowData["CLAVE_UNICA"] || "");
        var rowNumber = rowId ? idMap[rowId] : null;
        
        var valuesRow = normalizedHeaders.map(function(normH) {
          return normalizedRowData[normH] !== undefined ? normalizedRowData[normH] : "";
        });
        
        if (rowNumber) {
          var currentValues = sheet.getRange(rowNumber, 1, 1, headers.length).getValues()[0];
          var hasChanges = valuesRow.some(function(val, idx) { 
            return String(val) !== String(currentValues[idx]); 
          });
          
          if (hasChanges) {
            sheet.getRange(rowNumber, 1, 1, headers.length).setValues([valuesRow]);
            updated++;
          }
        } else {
          pendingAppends.push(valuesRow);
          added++;
        }
      }
      
      if (pendingAppends.length > 0) {
        sheet.getRange(sheet.getLastRow() + 1, 1, pendingAppends.length, headers.length).setValues(pendingAppends);
      }
    }
    
    return { success: true, updated: updated, added: added };
  } catch (e) {
    return logErrorAndReturnGeneric(e);
  }
}

function upsertProducts(data) {
  try {
    var ss = SpreadsheetApp.openById(data.spreadsheetId);
    var sheet = ss.getSheetByName("PRODUCTOS");
    if (!sheet) return { success: false, error: "Hoja PRODUCTOS no encontrada" };
    
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    if (lastCol === 0) return { success: false, error: "Hoja PRODUCTOS vacía" };
    
    var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    var normalizedHeaders = headers.map(normalizeHeader);
    var skuIdx = normalizedHeaders.indexOf("SKU");
    if (skuIdx === -1) skuIdx = normalizedHeaders.indexOf("CODBARRAS");
    if (skuIdx === -1) skuIdx = normalizedHeaders.indexOf("COD_BARRAS");
    
    if (skuIdx === -1) return { success: false, error: "Columna 'SKU' no encontrada" };
    
    var products = data.rows;
    var updated = 0;
    var added = 0;
    
    // Estrategia Read-Modify-Write para PRODUCTOS (usualmente < 5000 filas)
    var fullData = sheet.getDataRange().getValues();
    var skuMap = {};
    for (var i = 1; i < fullData.length; i++) {
      skuMap[String(fullData[i][skuIdx])] = i;
    }
    
    products.forEach(function(p) {
      var normalizedP = {};
      for (var key in p) {
        normalizedP[normalizeHeader(key)] = p[key];
      }
      
      var sku = String(normalizedP["SKU"] || normalizedP["CODBARRAS"] || normalizedP["COD_BARRAS"] || p.barcode || "");
      var existingRowIdx = sku ? skuMap[sku] : null;
      
      if (existingRowIdx !== null) {
        var currentValues = fullData[existingRowIdx];
        var newRow = normalizedHeaders.map(function(normH, idx) {
          return normalizedP[normH] !== undefined ? normalizedP[normH] : currentValues[idx];
        });
        
        var hasChanges = newRow.some(function(val, idx) { 
          return String(val) !== String(currentValues[idx]); 
        });
        
        if (hasChanges) {
          fullData[existingRowIdx] = newRow;
          updated++;
        }
      } else {
        var newRow = normalizedHeaders.map(function(normH) {
          return normalizedP[normH] !== undefined ? normalizedP[normH] : "";
        });
        fullData.push(newRow);
        if (sku) skuMap[sku] = fullData.length - 1;
        added++;
      }
    });
    
    if (updated > 0 || added > 0) {
      sheet.getRange(1, 1, fullData.length, headers.length).setValues(fullData);
    }
    
    return { success: true, updated: updated, added: added };
  } catch (e) {
    return logErrorAndReturnGeneric(e);
  }
}

function getSummary(data) {
  try {
    var ss = SpreadsheetApp.openById(data.spreadsheetId);
    var sheet = ss.getSheetByName(data.tableName);
    if (!sheet) return { success: false, error: "Hoja no encontrada" };
    
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return { success: true, totalUnits: 0, rowCount: 0 };
    
    var lastCol = sheet.getLastColumn();
    var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    var normalizedHeaders = headers.map(normalizeHeader);
    
    var qtyColIdx = normalizedHeaders.indexOf("CANTIDAD");
    if (qtyColIdx === -1) qtyColIdx = normalizedHeaders.indexOf("CANT");
    
    var filterColIdx = -1;
    if (data.filterColumn) {
      filterColIdx = normalizedHeaders.indexOf(normalizeHeader(data.filterColumn));
    }
    
    // Optimización: Si tenemos los índices, solo leemos esas columnas si están lejos una de otra,
    // o leemos el rango mínimo que las contenga.
    var totalUnits = 0;
    var rowCount = 0;
    var values;

    if (filterColIdx !== -1 && qtyColIdx !== -1) {
      var minCol = Math.min(filterColIdx, qtyColIdx) + 1;
      var maxCol = Math.max(filterColIdx, qtyColIdx) + 1;
      var numCols = maxCol - minCol + 1;
      values = sheet.getRange(2, minCol, lastRow - 1, numCols).getValues();
      
      var relFilterIdx = filterColIdx + 1 - minCol;
      var relQtyIdx = qtyColIdx + 1 - minCol;
      
      for (var i = 0; i < values.length; i++) {
        var row = values[i];
        if (String(row[relFilterIdx]) === String(data.filterValue)) {
          rowCount++;
          var val = parseFloat(row[relQtyIdx]);
          if (!isNaN(val)) totalUnits += val;
        }
      }
    } else {
      // Fallback si no hay filtros o columnas claras
      values = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
      for (var i = 0; i < values.length; i++) {
        var row = values[i];
        var matchesFilter = true;
        if (filterColIdx !== -1 && data.filterValue) {
          matchesFilter = String(row[filterColIdx]) === String(data.filterValue);
        }
        if (matchesFilter) {
          rowCount++;
          if (qtyColIdx !== -1) {
            var val = parseFloat(row[qtyColIdx]);
            if (!isNaN(val)) totalUnits += val;
          }
        }
      }
    }
    
    return { success: true, totalUnits: totalUnits, rowCount: rowCount };
  } catch (e) {
    return logErrorAndReturnGeneric(e);
  }
}

function uploadPhoto(data) {
  try {
    var folderName = "LogiCount_Photos";
    var folders = DriveApp.getFoldersByName(folderName);
    var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
    
    var fileName = data.erpOrder + "_" + data.label + "_" + new Date().getTime() + ".jpg";
    var blob = Utilities.newBlob(Utilities.base64Decode(data.base64), data.mimeType, fileName);
    var file = folder.createFile(blob);
    
    return { success: true, fileUrl: file.getUrl(), fileId: file.getId() };
  } catch (e) {
    return logErrorAndReturnGeneric(e);
  }
}

function getMetadata(data) {
  try {
    var ss = SpreadsheetApp.openById(data.spreadsheetId || SpreadsheetApp.getActiveSpreadsheet().getId());
    var sheets = ss.getSheets();
    var metadata = {
      spreadsheetId: ss.getId(),
      name: ss.getName(),
      sheets: []
    };
    
    sheets.forEach(function(sheet) {
      var lastCol = sheet.getLastColumn();
      var headers = [];
      if (lastCol > 0) {
        headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
      }
      
      metadata.sheets.push({
        sheetName: sheet.getName(),
        rowCount: sheet.getLastRow(),
        columnCount: lastCol,
        headers: headers
      });
    });
    
    return { success: true, metadata: metadata };
  } catch (e) {
    return logErrorAndReturnGeneric(e);
  }
}

function updateConfig(data) {
  try {
    var ss = SpreadsheetApp.openById(data.spreadsheetId || SpreadsheetApp.getActiveSpreadsheet().getId());
    var sheetName = data.tableName || "CONFIG_SISTEMA";
    var sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow(["PARAMETRO", "VALOR", "ULTIMA_ACTUALIZACION"]);
    }
    
    var configData = data.data || {};
    var keys = Object.keys(configData);
    var now = new Date().toISOString();
    
    var existingData = sheet.getDataRange().getValues();
    var header = existingData[0];
    var paramIdx = header.indexOf("PARAMETRO");
    var valIdx = header.indexOf("VALOR");
    var dateIdx = header.indexOf("ULTIMA_ACTUALIZACION");
    
    if (paramIdx === -1 || valIdx === -1) {
      // Si la tabla no tiene el formato esperado, usamos append simple o fallamos
      // En este caso, vamos a intentar reconstruir o usar la lógica de mapeo
      keys.forEach(function(key) {
        sheet.appendRow([key, configData[key], now]);
      });
    } else {
      keys.forEach(function(key) {
        var found = false;
        for (var i = 1; i < existingData.length; i++) {
          if (String(existingData[i][paramIdx]) === key) {
            sheet.getRange(i + 1, valIdx + 1).setValue(configData[key]);
            if (dateIdx !== -1) sheet.getRange(i + 1, dateIdx + 1).setValue(now);
            found = true;
            break;
          }
        }
        if (!found) {
          var newRow = [];
          newRow[paramIdx] = key;
          newRow[valIdx] = configData[key];
          if (dateIdx !== -1) newRow[dateIdx] = now;
          sheet.appendRow(newRow);
        }
      });
    }
    
    return { success: true };
  } catch (e) {
    return logErrorAndReturnGeneric(e);
  }
}
