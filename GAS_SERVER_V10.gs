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
    case 'upload_photo': return JSONResponse(uploadPhoto(data));
    case 'append_rows': return JSONResponse(appendRows(data));
    case 'upsert_rows': return JSONResponse(upsertRows(data));
    case 'fetch_rows': return JSONResponse(fetchRows(data));
    case 'upsert_products': return JSONResponse(upsertProducts(data));
    case 'add_expiration': return JSONResponse(addExpiration(data));
    case 'remove_expiration': return JSONResponse(removeExpiration(data));
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
    if (claveColIdx === -1) {
      // Si no hay columna CLAVE_UNICA, intentamos buscar en la columna 2 (B) por defecto
      claveColIdx = 1;
    }

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

// --- FUNCIONES ORIGINALES (MANTENIDAS PARA COMPATIBILIDAD) ---

function fetchRows(data) {
  try {
    var ss = SpreadsheetApp.openById(data.spreadsheetId);
    var sheet = ss.getSheetByName(data.tableName);
    if (!sheet) return { success: false, error: "Hoja no encontrada: " + data.tableName };
    
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return { success: true, rows: [], server_timestamp: new Date().toISOString() };
    
    var values = sheet.getDataRange().getValues();
    var headers = values[0];
    var rows = [];
    
    for (var i = 1; i < values.length; i++) {
      var row = {};
      for (var j = 0; j < headers.length; j++) {
        row[headers[j]] = values[i][j];
      }
      rows.push(row);
    }
    
    return { success: true, rows: rows, server_timestamp: new Date().toISOString() };
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
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var normalizedHeaders = headers.map(normalizeHeader);
    
    // Identificar columna de ID (ID o ID_REGISTRO)
    var idColIdx = normalizedHeaders.indexOf("ID");
    if (idColIdx === -1) idColIdx = normalizedHeaders.indexOf("ID_REGISTRO");
    
    if (idColIdx === -1) {
      // Si no hay columna de ID, hacemos append normal
      return appendRows(data);
    }
    
    var rows = data.rows;
    var updated = 0;
    var added = 0;
    
    // Obtener todos los IDs existentes si hay filas
    var existingIds = [];
    if (lastRow >= 2) {
      existingIds = sheet.getRange(2, idColIdx + 1, lastRow - 1, 1).getValues().flat().map(String);
    }
    
    for (var i = 0; i < rows.length; i++) {
      var rowData = rows[i];
      var normalizedRowData = {};
      for (var key in rowData) {
        normalizedRowData[normalizeHeader(key)] = rowData[key];
      }
      
      // Buscar el ID en los datos normalizados
      var rowId = String(normalizedRowData["ID"] || normalizedRowData["ID_REGISTRO"] || "");
      var rowIndex = rowId ? existingIds.indexOf(rowId) : -1;
      
      var valuesRow = normalizedHeaders.map(function(normH) {
        return normalizedRowData[normH] !== undefined ? normalizedRowData[normH] : "";
      });
      
      if (rowIndex !== -1) {
        // Actualizar
        sheet.getRange(rowIndex + 2, 1, 1, headers.length).setValues([valuesRow]);
        updated++;
      } else {
        // Agregar
        sheet.appendRow(valuesRow);
        // Actualizar lista de IDs para evitar duplicados en el mismo lote
        existingIds.push(rowId);
        added++;
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
    
    var values = sheet.getDataRange().getValues();
    var headers = values[0];
    var normalizedHeaders = headers.map(normalizeHeader);
    var skuIdx = normalizedHeaders.indexOf("COD_BARRAS");
    if (skuIdx === -1) return { success: false, error: "Columna 'barcode' no encontrada" };
    
    var products = data.rows;
    var updated = 0;
    var added = 0;
    
    products.forEach(function(p) {
      var found = false;
      for (var i = 1; i < values.length; i++) {
        if (String(values[i][skuIdx]) === String(p.barcode)) {
          var range = sheet.getRange(i + 1, 1, 1, headers.length);
          var rowData = headers.map(function(h) { return p[h] !== undefined ? p[h] : values[i][headers.indexOf(h)]; });
          range.setValues([rowData]);
          found = true;
          updated++;
          break;
        }
      }
      if (!found) {
        var newRow = headers.map(function(h) { return p[h] || ""; });
        sheet.appendRow(newRow);
        added++;
      }
    });
    
    return { success: true, updated: updated, added: added };
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
