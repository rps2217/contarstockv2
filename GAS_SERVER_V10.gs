/**
 * LOGICOUNT PRO - CLOUD ENGINE V10.2 (ULTRA RESILIENT)
 * Soluciona el error 'Cannot read properties of null (reading getSheetByName)'
 */

const CONFIG = {
  // SI EL ERROR PERSISTE: Copia el ID de tu Google Sheet de la URL 
  // Ejemplo: https://docs.google.com/spreadsheets/d/ESTE_ES_EL_ID/edit
  // Y pégalo aquí abajo entre las comillas:
  HARDCODED_SS_ID: "", 
  LOG_SHEET_NAME: "SYSTEM_LOGS",
  DATE_COLUMN_NAME: "FECHA_MODIFICACION"
};

/**
 * Obtiene el Spreadsheet buscando todas las vías posibles
 */
function getSafeSpreadsheet() {
  let ss = null;
  
  // Intento 1: Contexto de script vinculado
  try { ss = SpreadsheetApp.getActiveSpreadsheet(); } catch(e) {}
  
  // Intento 2: Apertura por ID (Si el usuario lo configuró)
  if (!ss && CONFIG.HARDCODED_SS_ID) {
    try { ss = SpreadsheetApp.openById(CONFIG.HARDCODED_SS_ID); } catch(e) {}
  }
  
  // Intento 3: Re-intento con API de apertura activa
  if (!ss) {
    try { ss = SpreadsheetApp.getActive(); } catch(e) {}
  }

  if (!ss) {
    throw new Error("ERROR_VINCULO: El script no tiene permisos o no está vinculado a un Excel. " +
                    "SOLUCIÓN: En el archivo GAS_SERVER_V10.gs, busca 'HARDCODED_SS_ID' y pega el ID de tu Excel.");
  }
  return ss;
}

function doPost(e) {
  const startTime = new Date().getTime();
  let response = { success: false, error: "Unknown Error" };
  
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error("Petición vacía o mal formada.");
    }

    const requestData = JSON.parse(e.postData.contents);
    const action = requestData.action;
    const metadata = requestData.metadata || {};
    
    // Log de auditoría
    try { logToSheet("INFO", action, "Petición recibida", metadata); } catch(err) {}

    // Manejo de Compresión
    let rows = requestData.rows;
    if (metadata.compressed && typeof rows === 'string') {
      rows = decompressData(rows);
    }

    // ENRUTADOR DE ACCIONES
    switch (action) {
      case 'append_rows':
        response = appendRows(requestData.tableName, rows);
        break;
        
      case 'fetch_rows':
        // El parámetro 'since' viene como timestamp (ej: 1712345678)
        response = fetchRows(requestData.tableName, requestData.since);
        break;

      case 'ping':
        const ss = getSafeSpreadsheet();
        response = { 
          success: true, 
          message: "Engine v10.2 Online", 
          ss_name: ss.getName(),
          timestamp: new Date().getTime() 
        };
        break;

      default:
        throw new Error("Acción no reconocida: " + action);
    }

    response.server_timestamp = new Date().getTime();
    response.latency = response.server_timestamp - startTime;

  } catch (err) {
    response.success = false;
    response.error = err.message;
  }

  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * ESCRIBIR FILAS
 */
function appendRows(tableName, rows) {
  if (!rows || !Array.isArray(rows)) throw new Error("Rows must be an array");
  
  const ss = getSafeSpreadsheet();
  let sheet = ss.getSheetByName(tableName);
  
  if (!sheet) {
    sheet = ss.insertSheet(tableName);
    const headers = Object.keys(rows[0]);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }

  const lastCol = sheet.getLastColumn() || 1;
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  
  const dataToAppend = rows.map(row => {
    return headers.map(h => {
      const val = row[h];
      return (val === undefined || val === null) ? "" : val;
    });
  });

  sheet.getRange(sheet.getLastRow() + 1, 1, dataToAppend.length, headers.length)
       .setValues(dataToAppend);

  return { 
    success: true, 
    rows_written: dataToAppend.length,
    tableName: tableName 
  };
}

/**
 * LEER FILAS (Con filtro Delta mejorado)
 */
function fetchRows(tableName, since = 0) {
  const ss = getSafeSpreadsheet();
  const sheet = ss.getSheetByName(tableName);
  if (!sheet) {
    throw new Error("No existe la hoja: '" + tableName + "'. Verifica las mayúsculas.");
  }

  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return { success: true, rows: [] };

  const headers = values[0];
  const rows = [];
  const sinceTs = parseInt(since) || 0;

  // Encontrar columna de fecha
  let dateColIdx = headers.findIndex(h => {
    const head = String(h).toUpperCase();
    return head.includes("FECHA") || head === CONFIG.DATE_COLUMN_NAME;
  });

  for (let i = 1; i < values.length; i++) {
    const rowObj = {};
    headers.forEach((h, idx) => rowObj[h] = values[i][idx]);
    
    // Filtro Delta Sync
    if (sinceTs > 0 && dateColIdx !== -1) {
      const cellVal = values[i][dateColIdx];
      let rowTs = 0;
      
      if (cellVal instanceof Date) {
        rowTs = cellVal.getTime();
      } else if (typeof cellVal === 'string' && cellVal.length > 0) {
        rowTs = new Date(cellVal).getTime();
      }

      // Si la fila es más antigua que el último sync, la ignoramos
      if (rowTs > 0 && rowTs <= sinceTs) continue;
    }
    
    rows.push(rowObj);
  }

  return { 
    success: true, 
    rows: rows, 
    server_timestamp: new Date().getTime(),
    count: rows.length
  };
}

function decompressData(base64String) {
  try {
    const decoded = Utilities.base64Decode(base64String);
    const unzipped = Utilities.ungzip(Utilities.newBlob(decoded));
    return JSON.parse(unzipped.getDataAsString());
  } catch (e) {
    throw new Error("Fallo descompresión servidor: " + e.message);
  }
}

function logToSheet(level, module, msg, details) {
  try {
    const ss = getSafeSpreadsheet();
    let sheet = ss.getSheetByName(CONFIG.LOG_SHEET_NAME);
    if (!sheet) return;
    sheet.appendRow([new Date(), level, module, msg, JSON.stringify(details)]);
  } catch (e) {}
}