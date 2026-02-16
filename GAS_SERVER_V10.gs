
/**
 * LOGICOUNT PRO - CLOUD ENGINE V12.9.5 (FINAL STABILITY)
 */

// Si tu script es independiente, puedes pegar el ID aquí entre las comillas
const HARDCODED_SPREADSHEET_ID = ""; 

function TRIGGER_PERMISSIONS() {
  try {
    // Forzamos acceso a Sheets y Drive para despertar el OAuth
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const drive = DriveApp.getRootFolder();
    Logger.log("Servicios despertados. Estado vinculado: " + (ss ? "SÍ" : "NO (Independiente)"));
  } catch (e) {
    Logger.log("Error: " + e.toString());
  }
}

function extractId(input) {
  if (!input) return "";
  const s = input.toString().trim();
  // Si el ID es la palabra genérica, lo anulamos
  if (s.toUpperCase().includes("AUTO_DETECTED") || s === "") return "";
  const match = s.match(/\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : s;
}

function getSpreadsheet(requestSpreadsheetId) {
  try {
    let finalId = extractId(requestSpreadsheetId) || extractId(HARDCODED_SPREADSHEET_ID);
    
    if (finalId !== "") {
      try {
        return SpreadsheetApp.openById(finalId);
      } catch (e) {
        throw new Error("ID_INVALIDO: El ID '" + finalId + "' no existe o el script no tiene permiso de acceso. Comparta el Excel con el email del desarrollador o use TRIGGER_PERMISSIONS.");
      }
    }

    // Si no hay ID manual, intentamos el activo (solo funciona si el script se creó DENTRO del Excel)
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
       throw new Error("SCRIPT_INDEPENDIENTE_SIN_ID: Este script no está vinculado a ningún Excel. DEBE copiar el ID de su Excel y pegarlo en la configuración de la App.");
    }
    return ss;
  } catch (e) {
    const errorStr = e.toString();
    if (errorStr.includes("openById") || errorStr.includes("Unexpected error")) {
      throw new Error("ERROR_GOOGLE_API: Google bloqueó la conexión. Ejecute TRIGGER_PERMISSIONS en el editor de GAS.");
    }
    throw e;
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try { lock.waitLock(30000); } catch (e) { return createJsonResponse({success: false, error: "Servidor ocupado"}); }

  let response = { success: false, error: "Unknown" };
  try {
    const requestData = JSON.parse(e.postData.contents);
    const ss = getSpreadsheet(requestData.spreadsheetId);

    if (requestData.action === 'ping') {
      response = { 
        success: true, 
        message: "Engine Online", 
        spreadsheet_name: ss.getName(),
        spreadsheet_id: ss.getId() 
      };
    } else if (requestData.action === 'fetch_rows') {
      response = fetchRows(ss, requestData.tableName);
    } else if (requestData.action === 'append_rows') {
      response = appendRows(ss, requestData.tableName, requestData.rows);
    } else {
      throw new Error("Acción no soportada: " + requestData.action);
    }
  } catch (err) {
    response.success = false;
    response.error = err.message || err.toString();
  } finally {
    lock.releaseLock();
  }
  return createJsonResponse(response);
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

// ... rest of helper functions (fetchRows, appendRows) stay the same as previous versions
function fetchRows(ss, tableName) {
  const sheet = ss.getSheetByName(tableName);
  if (!sheet) return { success: false, error: "Hoja '" + tableName + "' no existe." };
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return { success: true, rows: [] };
  const headers = values[0];
  const rows = values.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { if(h) obj[h.toString().trim().toUpperCase()] = row[i]; });
    return obj;
  });
  return { success: true, rows: rows, server_timestamp: new Date().toISOString() };
}

function appendRows(ss, tableName, rows) {
  let sheet = ss.getSheetByName(tableName);
  if (!sheet) sheet = ss.insertSheet(tableName);
  const headers = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0];
  const data = rows.map(row => headers.map(h => {
    const key = Object.keys(row).find(k => k.trim().toUpperCase() === String(h).trim().toUpperCase());
    return key ? row[key] : "";
  }));
  if (data.length > 0) sheet.getRange(sheet.getLastRow() + 1, 1, data.length, headers.length).setValues(data);
  return { success: true, rows_written: data.length };
}
