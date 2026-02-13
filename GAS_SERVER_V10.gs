
/**
 * LOGICOUNT PRO - CLOUD ENGINE V12.5 (HYBRID CONTEXT)
 */

const DEFAULT_SPREADSHEET_ID = ""; // Se puede dejar vacío si se envía desde la App

function getSpreadsheet(requestSpreadsheetId) {
  try {
    // 1. Prioridad: ID enviado desde la App (Máxima flexibilidad)
    if (requestSpreadsheetId && requestSpreadsheetId !== "") {
      return SpreadsheetApp.openById(requestSpreadsheetId);
    }
    // 2. Segunda prioridad: ID hardcodeado en el script (Configuración fija)
    if (DEFAULT_SPREADSHEET_ID && DEFAULT_SPREADSHEET_ID !== "") {
      return SpreadsheetApp.openById(DEFAULT_SPREADSHEET_ID);
    }
    // 3. Último recurso: Script vinculado (Container-bound)
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) throw new Error("No se detectó ID de Excel. Asegúrese de pasar spreadsheetId en el JSON o vincular el script a una hoja.");
    return ss;
  } catch (e) {
    throw new Error("FALLO CRÍTICO AL ABRIR EXCEL: " + e.toString());
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000); 
  } catch (e) {
    return createJsonResponse({success: false, error: "Servidor ocupado. Intente en unos segundos."});
  }

  let response = { success: false, error: "Error de ejecución" };
  
  try {
    const postContent = e.postData.contents;
    if (!postContent) throw new Error("Request body is empty");
    
    const requestData = JSON.parse(postContent);
    const action = requestData.action;
    const spreadsheetId = requestData.spreadsheetId; // Capturamos el ID del contexto
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

    const ss = getSpreadsheet(spreadsheetId);

    switch (action) {
      case 'append_rows':
        response = appendRows(ss, requestData.tableName, rows);
        break;
      case 'upsert_products':
        response = upsertProducts(ss, requestData.tableName, rows);
        break;
      case 'fetch_rows':
        response = fetchRows(ss, requestData.tableName, requestData.since);
        break;
      case 'ping':
        response = { success: true, message: "Conectado a: " + ss.getName() + " (v12.5)" };
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

function fetchRows(ss, tableName, sinceTimestamp) {
  try {
    const sheet = ss.getSheetByName(tableName);
    if (!sheet) {
      return { success: false, error: "La pestaña '" + tableName + "' no existe en el archivo " + ss.getName() };
    }

    const dataRange = sheet.getDataRange();
    if (dataRange.getNumRows() < 2) {
      return { success: true, rows: [], message: "Hoja vacía" };
    }

    const values = dataRange.getValues();
    const headers = values[0];
    
    const results = values.slice(1).map(row => {
      const obj = {};
      headers.forEach((h, idx) => { 
        if (h) obj[String(h).trim().toUpperCase()] = row[idx]; 
      });
      return obj;
    });

    return { 
      success: true, 
      rows: results, 
      server_timestamp: new Date().getTime().toString() 
    };
  } catch (e) {
    return { success: false, error: "Error en fetchRows: " + e.toString() };
  }
}

function upsertProducts(ss, tableName, rows) {
  let sheet = ss.getSheetByName(tableName || "PRODUCTOS");
  if (!sheet) sheet = ss.insertSheet(tableName || "PRODUCTOS");

  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).trim().toUpperCase());
  
  const skuIdx = headers.findIndex(h => h.includes("COD") || h.includes("SKU") || h.includes("BARRAS"));
  if (skuIdx === -1) throw new Error("Falta columna SKU en " + tableName);

  const skuMap = {};
  for (let i = 1; i < data.length; i++) {
    const sku = String(data[i][skuIdx]).trim().toUpperCase();
    if (sku) skuMap[sku] = i + 1; 
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
