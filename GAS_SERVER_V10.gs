
/**
 * LOGICOUNT PRO - CLOUD ENGINE V10.8 (FIX: BINARY BLOB ERROR)
 * Instrucciones: Pega el ID de tu Excel abajo.
 */

const SPREADSHEET_ID = ""; // <--- RECUERDA PEGAR TU ID AQUÍ

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
  let response = { success: false, error: "Error no identificado" };
  try {
    const requestData = JSON.parse(e.postData.contents);
    const action = requestData.action;
    let rows = requestData.rows;

    // --- CORRECCIÓN DE DESCOMPRESIÓN ---
    if (requestData.metadata && requestData.metadata.compressed && typeof rows === 'string') {
      const decoded = Utilities.base64Decode(rows);
      // Creamos el Blob con MIME TYPE explícito para evitar el error de objeto nulo
      const zipBlob = Utilities.newBlob(decoded, "application/zip");
      // Descomprimimos (unzip devuelve un array de Blobs)
      const unzippedFiles = Utilities.unzip(zipBlob);
      if (unzippedFiles.length > 0) {
        rows = JSON.parse(unzippedFiles[0].getDataAsString());
      } else {
        throw new Error("El paquete de datos llegó vacío o corrupto.");
      }
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
  if (!sheet) return { success: false, error: "La pestaña '" + tableName + "' no existe." };

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
