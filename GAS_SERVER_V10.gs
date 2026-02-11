
/**
 * LOGICOUNT PRO - CLOUD ENGINE V12 (AI & UPSERT SUPPORT)
 */

const SPREADSHEET_ID = ""; 

function getSpreadsheet() {
  if (SPREADSHEET_ID && SPREADSHEET_ID !== "") {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  }
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error("ERROR: Falta ID del Excel.");
  return ss;
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000); 
  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({success: false, error: "Servidor ocupado"})).setMimeType(ContentService.MimeType.JSON);
  }

  let response = { success: false, error: "Error desconocido" };
  
  try {
    const requestData = JSON.parse(e.postData.contents);
    const action = requestData.action;
    let rows = requestData.rows;

    // Descompresión si viene de la PWA
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
      case 'upsert_products':
        response = upsertProducts(requestData.tableName, rows);
        break;
      case 'fetch_rows':
        response = fetchRows(requestData.tableName, requestData.since);
        break;
      case 'ping':
        response = { success: true, message: "Conectado OK" };
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
 * LÓGICA DE UPSERT: Actualiza productos existentes o añade nuevos.
 * Crucial para distribuir el entrenamiento IA entre dispositivos.
 */
function upsertProducts(tableName, rows) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(tableName || "PRODUCTOS");
  if (!sheet) sheet = ss.insertSheet(tableName || "PRODUCTOS");

  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).trim().toUpperCase());
  
  // Identificar columna clave (SKU/CODIGO)
  const skuIdx = headers.findIndex(h => h.includes("COD") || h.includes("SKU") || h.includes("BARRAS"));
  if (skuIdx === -1) throw new Error("No se encontró columna de identidad (SKU) en " + tableName);

  // Mapear SKUs existentes para acceso rápido O(1)
  const skuMap = {};
  for (let i = 1; i < data.length; i++) {
    const sku = String(data[i][skuIdx]).trim().toUpperCase();
    if (sku) skuMap[sku] = i + 1; // Guardamos el número de fila
  }

  let updated = 0;
  let added = 0;

  rows.forEach(row => {
    const rowSku = String(row["CODIGO"] || row["COD PRODUCTO"] || row["SKU"]).trim().toUpperCase();
    const existingRowNumber = skuMap[rowSku];

    const rowData = headers.map(h => {
      const key = Object.keys(row).find(k => k.trim().toUpperCase() === String(h).trim().toUpperCase());
      return key ? row[key] : "";
    });

    if (existingRowNumber) {
      sheet.getRange(existingRowNumber, 1, 1, headers.length).setValues([rowData]);
      updated++;
    } else {
      sheet.appendRow(rowData);
      added++;
    }
  });

  return { success: true, updated, added, total: rows.length };
}

function appendRows(tableName, rows) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(tableName);
  if (!sheet) sheet = ss.insertSheet(tableName);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn() || 1).getValues()[0];
  
  const dataToAppend = rows.map(row => headers.map(h => {
    const key = Object.keys(row).find(k => k.trim().toUpperCase() === String(h).trim().toUpperCase());
    return key ? row[key] : "";
  }));

  if (dataToAppend.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, dataToAppend.length, headers.length).setValues(dataToAppend);
  }
  return { success: true, rows_written: dataToAppend.length };
}

function fetchRows(tableName, sinceTimestamp) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(tableName);
  if (!sheet) return { success: false, error: "Pestaña no encontrada." };
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return { success: true, rows: [] };
  const headers = values[0];
  const results = values.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, idx) => { if (h) obj[String(h).trim().toUpperCase()] = row[idx]; });
    return obj;
  });
  return { success: true, rows: results, server_timestamp: new Date().getTime().toString() };
}
