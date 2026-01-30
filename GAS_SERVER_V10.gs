
/**
 * LOGICOUNT PRO - CLOUD ENGINE V10.7 (FIX: NULL SPREADSHEET)
 * Instrucciones: Pega el ID de tu Excel abajo.
 */

const SPREADSHEET_ID = ""; // <--- PEGA AQUÍ EL ID DE TU EXCEL ENTRE LAS COMILLAS

function getSpreadsheet() {
  if (SPREADSHEET_ID && SPREADSHEET_ID !== "") {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  }
  // Si no hay ID, intenta el modo vinculado
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    throw new Error("ERROR CRÍTICO: El script no está vinculado a un Excel. Por favor, coloca el ID del Excel en la variable SPREADSHEET_ID al principio del código.");
  }
  return ss;
}

function doPost(e) {
  let response = { success: false, error: "Error no identificado" };
  try {
    const requestData = JSON.parse(e.postData.contents);
    const action = requestData.action;
    let rows = requestData.rows;

    if (requestData.metadata && requestData.metadata.compressed && typeof rows === 'string') {
      const decoded = Utilities.base64Decode(rows);
      const unzipped = Utilities.ungzip(Utilities.newBlob(decoded));
      rows = JSON.parse(unzipped.getDataAsString());
    }

    switch (action) {
      case 'append_rows':
        response = appendRows(requestData.tableName, rows);
        break;
      case 'fetch_rows':
        response = fetchRows(requestData.tableName);
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
  }
  return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(ContentService.MimeType.JSON);
}

function appendRows(tableName, rows) {
  if (!rows || rows.length === 0) throw new Error("No hay filas para procesar.");
  
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(tableName);
  
  if (!sheet) {
    sheet = ss.insertSheet(tableName);
  }

  let lastCol = sheet.getLastColumn();
  let headers = [];
  
  if (lastCol === 0 || sheet.getRange(1, 1).getValue() === "") {
    headers = Object.keys(rows[0]);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#f3f3f3");
    sheet.setFrozenRows(1);
  } else {
    headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  }

  const dataToAppend = rows.map(row => {
    return headers.map(h => {
      const hClean = String(h).trim().toUpperCase();
      const key = Object.keys(row).find(k => k.trim().toUpperCase() === hClean);
      return key ? row[key] : "";
    });
  });

  sheet.getRange(sheet.getLastRow() + 1, 1, dataToAppend.length, headers.length).setValues(dataToAppend);
  
  return { 
    success: true, 
    rows_written: dataToAppend.length,
    sheet: tableName 
  };
}

function fetchRows(tableName) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(tableName);
  if (!sheet) return { success: false, error: "La pestaña '" + tableName + "' no existe en este Excel." };

  const values = sheet.getDataRange().getValues();
  if (values.length < 1) return { success: true, rows: [] };

  const headers = values[0];
  const results = values.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, idx) => {
      if (h) obj[String(h).trim().toUpperCase()] = row[idx];
    });
    return obj;
  });

  return { success: true, rows: results };
}
