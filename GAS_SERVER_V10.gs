
/**
 * LOGICOUNT PRO - CLOUD ENGINE V11.6 (FIXED FETCH_ORDER)
 */

const SPREADSHEET_ID = ""; 

function getSpreadsheet() {
  if (SPREADSHEET_ID && SPREADSHEET_ID !== "") {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  }
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    throw new Error("ERROR: Coloque el ID del Excel en SPREADSHEET_ID.");
  }
  return ss;
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000); 
  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false, 
      error: "Servidor ocupado. Intente nuevamente."
    })).setMimeType(ContentService.MimeType.JSON);
  }

  let response = { success: false, error: "Error no identificado" };
  
  try {
    const requestData = JSON.parse(e.postData.contents);
    const action = requestData.action;
    let rows = requestData.rows;

    if (requestData.metadata && requestData.metadata.compressed && typeof rows === 'string') {
      const decoded = Utilities.base64Decode(rows);
      const zipBlob = Utilities.newBlob(decoded, "application/zip");
      const unzippedFiles = Utilities.unzip(zipBlob);
      if (unzippedFiles.length > 0) {
        rows = JSON.parse(unzippedFiles[0].getDataAsString());
      }
    }

    switch (action) {
      case 'append_rows':
        response = appendRows(requestData.tableName, rows);
        break;
      case 'fetch_rows':
        response = fetchRows(requestData.tableName, requestData.since);
        break;
      case 'fetch_order':
        // NUEVA ACCIÓN: Búsqueda de pedido específico
        response = fetchOrder(requestData.erpOrder);
        break;
      case 'ping':
        const ssTest = getSpreadsheet();
        response = { success: true, message: "Conectado a: " + ssTest.getName() };
        break;
      default:
        throw new Error("Acción '" + action + "' no soportada.");
    }
  } catch (err) {
    response.success = false;
    response.error = err.toString();
  } finally {
    lock.releaseLock();
  }
  
  return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Busca todas las filas de un pedido específico en la pestaña de pedidos.
 */
function fetchOrder(erpId) {
  if (!erpId) throw new Error("ID de pedido no proporcionado.");
  
  const ss = getSpreadsheet();
  // Intenta buscar en PEDIDOS, ORDENES o la configurada. 
  // Por defecto buscamos en PEDIDOS si no se especifica otra.
  let sheet = ss.getSheetByName("PEDIDOS") || ss.getSheetByName("ORDENES") || ss.getSheets()[0];
  
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return { success: true, rows: [] };
  
  const headers = values[0].map(h => String(h).trim().toUpperCase());
  const erpColIdx = headers.findIndex(h => h.includes("ERP") || h.includes("ORDEN") || h.includes("DOC") || h.includes("NUMERO"));
  
  if (erpColIdx === -1) throw new Error("No se encontró columna de Identificador (ERP/ORDEN) en la hoja de pedidos.");
  
  const cleanSearch = String(erpId).trim().toUpperCase();
  const results = [];
  
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const cellValue = String(row[erpColIdx]).trim().toUpperCase();
    
    if (cellValue === cleanSearch) {
      const obj = {};
      headers.forEach((h, idx) => {
        if (h) obj[h] = row[idx];
      });
      results.push(obj);
    }
  }
  
  return { success: true, rows: results };
}

function appendRows(tableName, rows) {
  if (!rows || rows.length === 0) throw new Error("No hay filas para procesar.");
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(tableName);
  if (!sheet) sheet = ss.insertSheet(tableName);

  let lastCol = sheet.getLastColumn();
  let headers = [];
  
  if (lastCol === 0) {
    headers = Object.keys(rows[0]);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight("bold");
  } else {
    headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  }

  const dataToAppend = rows.map(row => {
    return headers.map(h => {
      const key = Object.keys(row).find(k => k.trim().toUpperCase() === String(h).trim().toUpperCase());
      return key ? row[key] : "";
    });
  });

  if (dataToAppend.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, dataToAppend.length, headers.length).setValues(dataToAppend);
  }
  
  return { success: true, rows_written: dataToAppend.length };
}

function fetchRows(tableName, sinceTimestamp) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(tableName);
  if (!sheet) return { success: false, error: "Pestaña no encontrada." };

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow < 2) return { success: true, rows: [] };

  const values = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  const headers = values[0];
  const sinceTime = sinceTimestamp ? parseInt(sinceTimestamp) : 0;

  const tsIdx = headers.findIndex(h => {
    const clean = String(h).toUpperCase();
    return clean.includes("MODIFICADO") || clean.includes("TIMESTAMP") || clean.includes("FECHA");
  });

  const results = [];
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    if (tsIdx !== -1 && sinceTime > 0) {
      const rowDate = new Date(row[tsIdx]).getTime();
      if (rowDate <= sinceTime) continue; 
    }
    const obj = {};
    headers.forEach((h, idx) => {
      if (h) obj[String(h).trim().toUpperCase()] = row[idx];
    });
    results.push(obj);
  }
  return { success: true, rows: results, server_timestamp: new Date().getTime().toString() };
}
