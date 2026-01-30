/**
 * LOGICOUNT PRO - CLOUD ENGINE V10 (HYBRID LEGACY/TURBO)
 * Combina la velocidad de v10 con la estructura de datos de v9.
 */

const CONFIG = {
  LOG_SHEET_NAME: "SYSTEM_LOGS",
  DATE_COLUMN_NAME: "FECHA_MODIFICACION"
};

// MAPA DE CABECERAS (Heredado de v9 para compatibilidad total)
const HEADERS_MAP = {
  "CONTEOS": [
    "ID_REGISTRO", "CLAVE_UNICA", "FECHA", "ERP", 
    "CODIGO", "PRODUCTO", "CANTIDAD", "ETIQUETAS", "FRC"
  ],
  "CONSOLIDADOS": [
    "ID_CONSOLIDADO", "CLAVE_UNICA", "FECHA", "ERP", 
    "ETIQUETA", "CODIGO", "PRODUCTO", "CANTIDAD", "INCIDENCIAS"
  ],
  "PRODUCTOS": [
    "CODIGO", "PRODUCTO", "CATEGORIA", "PROVEEDOR", "RUT"
  ],
  "RECEPCION_BULTOS": [
    "ID_RECEPCION", "FECHA_HORA", "ETIQUETA", "ESTADO"
  ]
};

/**
 * PUNTO DE ENTRADA HTTP POST
 * Maneja la concurrencia y distribuye la carga.
 */
function doPost(e) {
  // 1. PROTECCIÓN CONTRA EJECUCIÓN MANUAL (Consola)
  if (!e || !e.postData) {
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      error: "Modo Consola Detectado: Use la función 'testDoPost()' para pruebas manuales." 
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // 2. LOCK SERVICE (Heredado de v9) - Vital para Modo Martillo
  var lock = LockService.getScriptLock();
  // Esperamos hasta 30s para obtener turno exclusivo de escritura
  if (!lock.tryLock(30000)) {
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      error: "Servidor ocupado (High Traffic). Reintente en unos segundos." 
    })).setMimeType(ContentService.MimeType.JSON);
  }

  const startTime = new Date().getTime();
  let response = { success: false, error: "Unknown Error" };

  try {
    const requestData = JSON.parse(e.postData.contents);
    const action = requestData.action;
    const metadata = requestData.metadata || {};
    
    // Log ligero
    logToSheet("INFO", action, "Recibido", metadata);

    // 3. DESCOMPRESIÓN (Motor v10)
    let rows = requestData.rows;
    if (metadata.compressed && typeof rows === 'string') {
      rows = decompressData(rows);
    }

    // 4. ENRUTADOR
    switch (action) {
      case 'append_rows':
        response = appendRows(requestData.tableName, rows);
        break;
      case 'fetch_rows':
        response = fetchRows(requestData.tableName, requestData.since);
        break;
      case 'ping':
        response = { success: true, message: "Engine v10 Hybrid Online", timestamp: new Date().getTime() };
        break;
      default:
        throw new Error("Acción no reconocida: " + action);
    }

    response.server_timestamp = new Date().getTime();
    response.latency = response.server_timestamp - startTime;

  } catch (err) {
    response.success = false;
    response.error = err.message;
    logToSheet("ERROR", "CRITICAL", err.message, e.postData ? "POST Payload" : "No Data");
  } finally {
    lock.releaseLock(); // Liberar semáforo siempre
  }

  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * ESCRIBIR FILAS CON MAPEO ESTRICTO (Legacy Compatible)
 */
function appendRows(tableName, rows) {
  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    return { success: true, message: "Nada que insertar", rows_written: 0 };
  }
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(tableName);
  
  // Crear hoja si no existe usando HEADERS_MAP
  if (!sheet) {
    sheet = ss.insertSheet(tableName);
    const defaultHeaders = HEADERS_MAP[tableName] || Object.keys(rows[0]);
    sheet.appendRow(defaultHeaders);
    // Formato visual v9
    sheet.getRange("1:1").setFontWeight("bold").setBackground("#3b82f6").setFontColor("white").setVerticalAlignment("middle");
    sheet.setFrozenRows(1);
  }

  // Mapeo Inteligente: Alinea el JSON entrante con las columnas existentes
  const currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  const dataToAppend = rows.map(row => {
    return currentHeaders.map(header => {
      // Normalización de claves para ser tolerante a mayúsculas/minúsculas
      const key = Object.keys(row).find(k => k.toUpperCase() === header.toUpperCase());
      const val = key ? row[key] : "";
      // Forzamos String para evitar bugs de formato en Google Sheets
      return (val !== undefined && val !== null) ? String(val) : "";
    });
  });

  // Escritura en bloque
  if (dataToAppend.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, dataToAppend.length, currentHeaders.length)
         .setValues(dataToAppend);
  }

  return { 
    success: true, 
    rows_written: dataToAppend.length,
    tableName: tableName 
  };
}

/**
 * LEER FILAS CON DELTA SYNC (Motor v10)
 */
function fetchRows(tableName, since = 0) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(tableName);
  if (!sheet) return { success: true, rows: [] };

  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return { success: true, rows: [] };

  const headers = values[0];
  const rows = [];
  const sinceTs = parseInt(since) || 0;

  // Buscar columna de fecha compatible con v9 o v10
  let dateColIdx = headers.findIndex(h => 
    h === CONFIG.DATE_COLUMN_NAME || h === "FECHA" || h === "FECHA_HORA"
  );

  for (let i = 1; i < values.length; i++) {
    const rowObj = {};
    // Limpieza: solo columnas con nombre
    for (let j = 0; j < headers.length; j++) {
      if (headers[j]) rowObj[headers[j]] = values[i][j];
    }
    
    // Filtro Delta Sync
    if (sinceTs > 0 && dateColIdx !== -1) {
      // Intentamos parsear la fecha del sheet
      const cellValue = values[i][dateColIdx];
      let rowDate = 0;
      
      if (cellValue instanceof Date) {
        rowDate = cellValue.getTime();
      } else if (typeof cellValue === 'string') {
        // Soporte para fechas string v9 ("DD/MM/YYYY HH:mm")
        rowDate = new Date(cellValue).getTime(); 
      }

      if (rowDate > 0 && rowDate <= sinceTs) continue; 
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
    throw new Error("Error Descompresión: " + e.message);
  }
}

function logToSheet(level, module, msg, details) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(CONFIG.LOG_SHEET_NAME);
    if (!sheet) {
        try { sheet = ss.insertSheet(CONFIG.LOG_SHEET_NAME); sheet.appendRow(["TIME", "LVL", "MOD", "MSG", "DTL"]); } catch(e) { return; }
    }
    sheet.appendRow([new Date(), level, module, msg, String(details)]);
  } catch (e) {}
}

/**
 * HERRAMIENTA DE PRUEBA (Ejecutar manualmente en el editor)
 */
function testDoPost() {
  const mockEvent = {
    postData: {
      contents: JSON.stringify({
        action: "ping",
        metadata: { source: "test_console" }
      })
    }
  };
  Logger.log("Iniciando prueba...");
  const result = doPost(mockEvent);
  Logger.log("Resultado: " + result.getContent());
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({ status: "online", version: "v10-Hybrid" }))
    .setMimeType(ContentService.MimeType.JSON);
}