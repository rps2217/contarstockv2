
/**
 * LOGICOUNT PRO - CLOUD ENGINE V10.5 (TOTAL RELIABILITY)
 * Optimizado para el esquema: APP_ID | ACCESS_KEY | TABLE_LOGS ...
 */

function doPost(e) {
  let response = { success: false, error: "Unknown Error" };
  try {
    const requestData = JSON.parse(e.postData.contents);
    const action = requestData.action;
    let rows = requestData.rows;

    // Descompresión si viene comprimido
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
        response = { success: true, message: "Conexión Establecida v10.5" };
        break;
      default:
        throw new Error("Acción no soportada: " + action);
    }
  } catch (err) {
    response.success = false;
    response.error = err.message;
  }
  return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(ContentService.MimeType.JSON);
}

function appendRows(tableName, rows) {
  if (!rows || rows.length === 0) throw new Error("Datos vacíos");
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(tableName);
  if (!sheet) sheet = ss.insertSheet(tableName);

  // Obtener cabeceras existentes
  let lastCol = sheet.getLastColumn();
  let headers = [];
  
  if (lastCol === 0) {
    // Hoja nueva: Usar las llaves del primer objeto como cabeceras en la fila 1
    headers = Object.keys(rows[0]);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  } else {
    headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  }

  // Mapear datos a las columnas de Excel
  const dataToAppend = rows.map(row => {
    return headers.map(h => {
      const hClean = String(h).trim().toUpperCase();
      // Buscar coincidencia en el objeto sin importar mayúsculas
      const key = Object.keys(row).find(k => k.trim().toUpperCase() === hClean);
      return key ? row[key] : "";
    });
  });

  sheet.getRange(sheet.getLastRow() + 1, 1, dataToAppend.length, headers.length).setValues(dataToAppend);
  
  return { success: true, rows_written: dataToAppend.length };
}

function fetchRows(tableName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(tableName);
  if (!sheet) throw new Error("No existe la pestaña: " + tableName);

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
