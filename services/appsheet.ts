
import { CountingSession, Product } from "../types";
import { getSettings } from "./settings"; 
import { generateUUID } from "./utils";
import { markScansAsSynced } from "./sessionService"; 
import { db } from "../db";
import { sendToGas, fetchFromGas } from "./gasService";
import { sendToAppSheet } from "../infrastructure/api/appsheetClient";
import { aggregateScans } from "./aggregator";

/**
 * Sincronización Inteligente Enrutada
 * MODO_MARTILLO -> Pestaña "CONTEOS"
 * NORMAL / NUEVA CARGA -> Pestaña "CONSOLIDADOS"
 */
export const syncToAppSheet = async (session: CountingSession, onProgress?: (msg: string) => void): Promise<void> => {
  const config = getSettings().appSheetConfig;
  const unsynced = await db.scans.where('sessionId').equals(session.id).filter(s => s.synced === 0).toArray();
  
  if (unsynced.length === 0) return;

  if (onProgress) onProgress(`Consolidando registros...`);
  const consolidated = await aggregateScans(unsynced);
  
  // Mapeo de columnas estándar para Script Turbo v5.2
  const rows = consolidated.map(item => ({
      "ID_REGISTRO": generateUUID(),
      "CLAVE_UNICA": `${session.erpOrder}_${session.logisticsLabel}_${item.barcode}_${item.mm || 0}_${item.yyyy || 0}`,
      "FECHA": new Date().toISOString().split('T')[0],
      "ERP": session.erpOrder, 
      "CODIGO": item.barcode,
      "PRODUCTO": item.productName,
      "CANTIDAD": item.totalQuantity,
      "ETIQUETAS": session.logisticsLabel, 
      "MM": item.mm || 0,
      "YYYY": item.yyyy || 0,
      "FRC": item.isIncident ? "FRC" : ""
  }));

  // LÓGICA DE ENRUTAMIENTO DE PESTAÑA
  let tableName = config?.countsTableName || "CONSOLIDADOS";
  
  if (session.erpOrder === "MODO_MARTILLO") {
      tableName = "CONTEOS"; // El martillo siempre va a Conteos
  }

  if (onProgress) onProgress(`Subiendo a ${tableName}...`);

  try {
      if (config?.gasWebAppUrl) {
          const result = await sendToGas({ tableName, rows });
          if (!result.success) throw new Error(result.error || "Fallo en Script de Google");
      } else {
          await sendToAppSheet(config!, tableName, {
              Action: "Add",
              Properties: { Locale: "es-ES", Timezone: "UTC" },
              Rows: rows
          });
      }

      await markScansAsSynced(unsynced.map(s => s.id));
      if (onProgress) onProgress(`Sincronización en ${tableName} Exitosa.`);
  } catch (e: any) {
      console.error("Sync Error:", e);
      throw new Error(`Fallo de conexión: ${e.message}`);
  }
};

export const fetchProductsFromCloud = async (): Promise<any[]> => {
  const config = getSettings().appSheetConfig;
  if (config?.gasWebAppUrl) {
      return await fetchFromGas(config.productsTableName || "PRODUCTOS", {});
  }
  return [];
};

export const fetchCloudData = async (filters: { erpFilter?: string }): Promise<any[]> => {
    const config = getSettings().appSheetConfig;
    if (config?.gasWebAppUrl) {
        // Por defecto buscamos en CONSOLIDADOS para el Detective
        return await fetchFromGas(config.countsTableName || "CONSOLIDADOS", filters);
    }
    return [];
};

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

    const tableName = config?.receptionTableName || "RECEPCION_BULTOS";

    if (config?.gasWebAppUrl) {
        await sendToGas({ tableName, rows });
    } else {
        await sendToAppSheet(config!, tableName, {
            Action: "Add", Properties: { Locale: "es-ES", Timezone: "UTC" }, Rows: rows
        });
    }
};
