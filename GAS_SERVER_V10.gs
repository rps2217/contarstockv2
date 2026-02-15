
/**
 * LOGICOUNT PRO - CLOUD ENGINE V12.9 (RESILIENT EDITION)
 */

// OPCIONAL: Si el script es independiente, puedes pegar aquí el ID del Excel 
// (Ej: "1abc123..."). Si lo dejas vacío, el sistema lo pedirá desde la App.
const HARDCODED_SPREADSHEET_ID = ""; 

function getSpreadsheet(requestSpreadsheetId) {
  try {
    // 1. Prioridad: ID enviado desde la App móvil
    if (requestSpreadsheetId && requestSpreadsheetId !== "") {
      return SpreadsheetApp.openById(requestSpreadsheetId);
    }
    
    // 2. Segunda opción: ID fijo en el servidor (Configurado arriba)
    if (HARDCODED_SPREADSHEET_ID !== "") {
      return SpreadsheetApp.openById(HARDCODED_SPREADSHEET_ID);
    }

    // 3. Tercera opción: Script "Vinculado" (Creado desde Extensiones > Apps Script)
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    if (!ss) {
      throw new Error(
        "IDENTIDAD_EXCEL_NO_DETECTADA. " +
        "Solución: Copia el ID de tu Excel de la URL (entre /d/ y /edit) " +
        "y pégalo en la configuración de la App LogiCount."
      );
    }
    return ss;
  } catch (e) {
    throw new Error("FALLO_CRITICO_CONEXION_EXCEL: " + e.toString());
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000); 
  } catch (e) {
    return createJsonResponse({success: false, error: "Servidor ocupado (Lock Timeout)"});
  }

  let response = { success: false, error: "Error de ejecución" };
  
  try {
    const postContent = e.postData.contents;
    if (!postContent) throw new Error("Request body is empty");
    
    const requestData = JSON.parse(postContent);
    const action = requestData.action;
    const spreadsheetId = requestData.spreadsheetId;
    let rows = requestData.rows;

    // Manejo de compresión para firmas IA pesadas
    if (requestData.metadata && requestData.metadata.compressed && typeof rows === 'string') {
      const decoded = Utilities.base64Decode(rows);
      const zipBlob = Utilities.newBlob(decoded, "application/zip");
      const unzippedFiles = Utilities.unzip(zipBlob);
      if (unzippedFiles.length > 0) {
        rows = JSON.parse(unzippedFiles[0].getDataAsString());
      }
    }

    // Obtener acceso al Excel
    const ss = getSpreadsheet(spreadsheetId);

    switch (action) {
      case 'append_rows':
        response = appendRows(ss, requestData.tableName, rows);
        break;
      case 'upsert_products':
        response = upsertProductsHighSpeed(ss, requestData.tableName, rows);
        break;
      case 'fetch_rows':
        response = fetchRows(ss, requestData.tableName, requestData.since);
        break;
      case 'ping':
        response = { 
          success: true, 
          message: "Engine Online", 
          spreadsheet_name: ss.getName(),
          spreadsheet_id: ss.getId() 
        };
        break;
      default:
        throw new Error("Acción '" + action + "' no reconocida.");
    }
  } catch (err) {
    response.success = false;
    response.error = err.toString();
  } finally {
    lock.releaseLock();
  }
  
  return createJsonResponse(response);
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function upsertProductsHighSpeed(ss, tableName, inboundRows) {
  let sheet = ss.getSheetByName(tableName || "PRODUCTOS");
  if (!sheet) {
    sheet = ss.insertSheet(tableName || "PRODUCTOS");
    sheet.appendRow(["PROVEEDOR", "COD PRODUCTO", "DESCRIPCION", "MUNDO", "FIRMA_IA", "RUT PROVEEDOR"]);
  }

  const fullRange = sheet.getDataRange();
  const currentValues = fullRange.getValues();
  const headers = currentValues[0].map(h => String(h).trim().toUpperCase());
  
  const skuIdx = headers.findIndex(h => h.includes("COD") || h.includes("SKU"));
  if (skuIdx === -1) throw new Error("La tabla no tiene columna 'COD PRODUCTO'.");

  const rowMap = {};
  for (let i = 1; i < currentValues.length; i++) {
    const sku = String(currentValues[i][skuIdx]).trim().toUpperCase();
    if (sku) rowMap[sku] = i;
  }

  let updated = 0;
  let added = 0;
  const newRowsToAppend = [];

  inboundRows.forEach(inboundRow => {
    const inboundSku = String(inboundRow["COD PRODUCTO"] || inboundRow["SKU"]).trim().toUpperCase();
    
    const newRowData = headers.map(h => {
      const key = Object.keys(inboundRow).find(k => k.trim().toUpperCase() === h);
      return key ? inboundRow[key] : "";
    });

    const existingRowIdx = rowMap[inboundSku];
    if (existingRowIdx !== undefined) {
      currentValues[existingRowIdx] = newRowData;
      updated++;
    } else {
      newRowsToAppend.push(newRowData);
      added++;
    }
  });

  if (updated > 0) fullRange.setValues(currentValues);
  if (newRowsToAppend.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, newRowsToAppend.length, headers.length).setValues(newRowsToAppend);
  }

  return { success: true, updated, added, totalProcessed: inboundRows.length };
}

function fetchRows(ss, tableName, sinceTimestamp) {
  try {
    const sheet = ss.getSheetByName(tableName);
    if (!sheet) return { success: false, error: "Tabla no encontrada: " + tableName };

    const dataRange = sheet.getDataRange();
    if (dataRange.getNumRows() < 2) return { success: true, rows: [] };

    const values = dataRange.getValues();
    const headers = values[0];
    
    const results = values.slice(1).map(row => {
      const obj = {};
      headers.forEach((h, idx) => { if (h) obj[String(h).trim().toUpperCase()] = row[idx]; });
      return obj;
    });

    return { success: true, rows: results, server_timestamp: new Date().toISOString() };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

function appendRows(ss, tableName, rows) {
  let sheet = ss.getSheetByName(tableName);
  if (!sheet) sheet = ss.insertSheet(tableName);
  const headers = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0];
  
  const dataToAppend = rows.map(row => headers.map(h => {
    const key = Object.keys(row).find(k => k.trim().toUpperCase() === String(h).trim().toUpperCase());
    return key ? row[key] : "";
  }));

  if (dataToAppend.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, dataToAppend.length, headers.length).setValues(dataToAppend);
  }
  return { success: true, rows_written: dataToAppend.length };
}
