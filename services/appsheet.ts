
import { CountingSession, Product } from "../types";
import { getSettings } from "./settings"; 
import { generateUUID } from "./utils";
import { markScansAsSynced } from "./sessionService"; 
import { db } from "../db";
import { sendToGas, fetchFromGas } from "./gasService";
import { sendToAppSheet } from "../infrastructure/api/appsheetClient";
import { aggregateScans } from "./aggregator";

/**
 * Sincronización Inteligente
 * Detecta si debe usar el motor Turbo (GAS) o la API oficial.
 */
export const syncToAppSheet = async (session: CountingSession, onProgress?: (msg: string) => void): Promise<void> => {
  const config = getSettings().appSheetConfig;
  const unsynced = await db.scans.where('sessionId').equals(session.id).filter(s => s.synced === 0).toArray();
  
  if (unsynced.length === 0) return;

  if (onProgress) onProgress(`Consolidando datos...`);
  const consolidated = await aggregateScans(unsynced);
  
  // Mapeo de filas compatible con la imagen del usuario
  const rows = consolidated.map(item => ({
      "ID_REGISTRO": generateUUID(), // UUID completo para coincidir con la captura
      "CLAVE_UNICA": `${session.erpOrder}_${session.logisticsLabel}_${item.barcode}_${item.mm || 0}_${item.yyyy || 0}`,
      "FECHA": new Date().toISOString().split('T')[0], // Formato YYYY-MM-DD como en la imagen
      "ERP": session.erpOrder,
      "CODIGO": item.barcode,
      "PRODUCTO": item.productName,
      "CANTIDAD": item.totalQuantity,
      "ETIQUETAS": session.logisticsLabel,
      "MM": item.mm || 0,
      "YYYY": item.yyyy || 0,
      "FRC": item.isIncident ? "FRC" : ""
  }));

  if (onProgress) onProgress(`Sincronizando vía ${config?.gasWebAppUrl ? 'TURBO-GAS' : 'API-APPSHEET'}...`);

  try {
      if (config?.gasWebAppUrl) {
          // MODO TURBO (Google Apps Script)
          const result = await sendToGas({ tableName: config.countsTableName || "CONTEOS", rows });
          if (!result.success) throw new Error(result.error);
      } else {
          // MODO ESTÁNDAR (API AppSheet)
          await sendToAppSheet(config!, config!.countsTableName || "CONTEOS", {
              Action: "Add",
              Properties: { Locale: "es-ES", Timezone: "Central Brazilian Standard Time" },
              Rows: rows
          });
      }

      await markScansAsSynced(unsynced.map(s => s.id));
      if (onProgress) onProgress(`Éxito.`);
  } catch (e: any) {
      throw new Error(`Fallo de conexión: ${e.message}`);
  }
};

/**
 * DESCARGA DE PRODUCTOS
 */
export const fetchProductsFromCloud = async (): Promise<any[]> => {
  const config = getSettings().appSheetConfig;
  if (config?.gasWebAppUrl) {
      return await fetchFromGas(config.productsTableName || "PRODUCTOS", {});
  }
  return [];
};

/**
 * Recupera datos de conteos desde la nube (Turbo GAS o API)
 */
export const fetchCloudData = async (filters: { erpFilter?: string }): Promise<any[]> => {
    const config = getSettings().appSheetConfig;
    if (config?.gasWebAppUrl) {
        return await fetchFromGas(config.countsTableName || "CONTEOS", filters);
    }
    return [];
};

/**
 * SINCRONIZACIÓN DE PRODUCTOS AL MAESTRO
 */
export const syncProductsToAppSheet = async (products: Product[]): Promise<void> => {
    const config = getSettings().appSheetConfig;
    const rows = products.map(p => ({
        "PROVEEDOR": p.supplier || "",
        "MUNDO": p.category,
        "COD PRODUCTO": p.barcode,
        "DESCRIPCION": p.name,
        "MARCA BCM 5,0": "", 
        "RUT PROVEEDOR": p.supplierRut || ""
    }));

    if (config?.gasWebAppUrl) {
        await sendToGas({ tableName: config.productsTableName || "PRODUCTOS", rows });
    } else {
        await sendToAppSheet(config!, config.productsTableName || "PRODUCTOS", {
            Action: "Add",
            Properties: { Locale: "es-ES", Timezone: "UTC" },
            Rows: rows
        });
    }
};

export const syncReceptionToAppSheet = async (session: CountingSession): Promise<void> => {
    const config = getSettings().appSheetConfig;
    const rows = [{
        "ID_RECEPCION": generateUUID().substring(0, 8),
        "FECHA_HORA": new Date().toISOString(),
        "ETIQUETA": session.logisticsLabel,
        "ESTADO": "RECIBIDO"
    }];

    if (config?.gasWebAppUrl) {
        await sendToGas({ tableName: config.receptionTableName || "RECEPCION_BULTOS", rows });
    } else {
        await sendToAppSheet(config!, config.receptionTableName || "RECEPCION_BULTOS", {
            Action: "Add", Properties: { Locale: "es-ES", Timezone: "UTC" }, Rows: rows
        });
    }
};
