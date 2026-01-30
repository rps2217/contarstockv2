/**
 * LOGICOUNT PRO - CLOUD ENGINE V10 (SERVER SIDE) - FIX 10.1
 * Este código soluciona el error 'Cannot read properties of null'
 */

const CONFIG = {
  LOG_SHEET_NAME: "SYSTEM_LOGS",
  DATE_COLUMN_NAME: "FECHA_MODIFICACION"
};

/**
 * Función auxiliar para obtener el Spreadsheet de forma segura
 */
function getSafeSpreadsheet() {
  const ss = SpreadsheetApp.getActive();
  if (!ss) {
    throw new Error("ERROR_VINCULO: El script no detecta el Excel activo. Asegúrate de desplegarlo como 'Cualquiera' y que el script esté dentro del archivo de Google Sheets (Extensiones > Apps Script).");
  }
  return ss;
}

function doPost(e) {
  const startTime = new Date().getTime();
  let response = { success: false, error: "Unknown Error" };
  
  try {
    const requestData = JSON.parse(e.postData.contents);
    const action = requestData.action;
    const metadata = requestData.metadata || {};
    
    // Log inicial
    try { logToSheet("INFO", action, "Petición recibida", metadata); } catch(e) {}

    // Manejo de Compresión
    let rows = requestData.rows;
    if (metadata.compressed && typeof rows === 'string') {
      rows = decompressData(rows);
    }

    // Enrutador
    switch (action) {
      case 'append_rows':
        response = appendRows(requestData.tableName, rows);
        break;
        
      case 'fetch_rows':
        response = fetchRows(requestData.tableName, requestData.since);
        break;

      case 'ping':
        response = { success: true, message: "Engine v10.1 Online", timestamp: new Date().getTime() };
        break;

      default:
        throw new Error("Acción no reconocida: " + action);
    }

    response.server_timestamp = new Date().getTime();
    response.latency = response.server_timestamp - startTime;

  } catch (err) {
    response.success = false;
    response.error = err.message;
    console.error("CRITICAL_FAIL: " + err.message);
  }

  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

function appendRows(tableName, rows) {
  if (!rows || !Array.isArray(rows)) throw new Error("Rows must be an array");
  
  const ss = getSafeSpreadsheet();
  let sheet = ss.getSheetByName(tableName);
  
  if (!sheet) {
    sheet = ss.insertSheet(tableName);
    const headers = Object.keys(rows[0]);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const dataToAppend = rows.map(row => headers.map(h => row[h] || ""));

  sheet.getRange(sheet.getLastRow() + 1, 1, dataToAppend.length, headers.length)
       .setValues(dataToAppend);

  return { 
    success: true, 
    rows_written: dataToAppend.length,
    tableName: tableName 
  };
}

function fetchRows(tableName, since = 0) {
  const ss = getSafeSpreadsheet();
  const sheet = ss.getSheetByName(tableName);
  if (!sheet) {
    throw new Error("No existe la hoja llamada: " + tableName + ". Crea una pestaña con ese nombre exactamente.");
  }

  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return { success: true, rows: [] };

  const headers = values[0];
  const rows = [];
  const sinceTs = parseInt(since) || 0;

  let dateColIdx = headers.findIndex(h => {
    const head = String(h).toUpperCase();
    return head.includes("FECHA") || head === CONFIG.DATE_COLUMN_NAME;
  });

  for (let i = 1; i < values.length; i++) {
    const rowObj = {};
    headers.forEach((h, idx) => rowObj[h] = values[i][idx]);
    
    if (sinceTs > 0 && dateColIdx !== -1) {
      const cellVal = values[i][dateColIdx];
      if (cellVal instanceof Date) {
        if (cellVal.getTime() <= sinceTs) continue;
      }
    }
    rows.push(rowObj);
  }

  return { success: true, rows: rows, server_timestamp: new Date().getTime() };
}

function decompressData(base64String) {
  try {
    const decoded = Utilities.base64Decode(base64String);
    const unzipped = Utilities.ungzip(Utilities.newBlob(decoded));
    return JSON.parse(unzipped.getDataAsString());
  } catch (e) {
    throw new Error("Fallo descompresión: " + e.message);
  }
}

function logToSheet(level, module, msg, details) {
  try {
    const ss = SpreadsheetApp.getActive();
    let sheet = ss.getSheetByName(CONFIG.LOG_SHEET_NAME);
    if (!sheet) return;
    sheet.appendRow([new Date(), level, module, msg, JSON.stringify(details)]);
  } catch (e) {}
}