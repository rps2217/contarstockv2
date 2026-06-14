import { db } from '../db';
import { normalizeIdentity, normalizeSku } from '../services/utils';

export class DatabaseSanitizer {
  static async runAuditAndSanitize() {
    console.log("Iniciando auditoria y sanitizacion de DB...");
    
    // 1. Sanitizar Proveedores
    const providers = await db.providers.toArray();
    for (const p of providers) {
      const cleanRut = normalizeIdentity(p.rut);
      if (p.rut !== cleanRut) {
        console.log(`Sanitizando RUT proveedor: ${p.rut} -> ${cleanRut}`);
        await db.providers.delete(p.rut);
        p.rut = cleanRut;
        await db.providers.put(p);
      }
    }
    
    // 2. Sanitizar Productos
    const products = await db.products.toArray();
    for (const p of products) {
      let needsUpdate = false;
      const cleanBarcode = normalizeSku(p.barcode);
      
      if (p.barcode !== cleanBarcode) {
        await db.products.delete(p.barcode);
        p.barcode = cleanBarcode;
        needsUpdate = true;
      }
      
      if (p.supplierRut) {
        const cleanRut = normalizeIdentity(p.supplierRut);
        if (p.supplierRut !== cleanRut) {
          p.supplierRut = cleanRut;
          needsUpdate = true;
        }
      }
      
      if (needsUpdate) {
        await db.products.put(p);
      }
    }
    
    // 3. Sanitizar Expiry Records en dynamic_data
    const records = await db.dynamic_data.where('tableName').equals('VENCIMIENTOS').toArray();
    const allProviders = await db.providers.toArray();
    
    for (const r of records) {
      let needsUpdate = false;
      const expiryData = r.data || {};
      
      const cleanBarcode = normalizeSku(expiryData.barcode || '');
      if (expiryData.barcode !== cleanBarcode) {
        expiryData.barcode = cleanBarcode;
        needsUpdate = true; 
      }
      
      // Intentar forzar el cruce si falla
      if (!expiryData.providerName || expiryData.providerName === 'N/A' || expiryData.providerName === 'SIN PROVEEDOR') {
        const prod = await db.products.get(cleanBarcode);
        if (prod) {
          // Si el producto tiene RUT, buscamos por RUT
          if (prod.supplierRut) {
            const cleanRut = normalizeIdentity(prod.supplierRut);
            const prov = allProviders.find(pv => pv.rut === cleanRut);
            if (prov) {
              expiryData.providerName = prov.name;
              expiryData.providerRut = prov.rut;
              needsUpdate = true;
            }
          } 
          
          // Fallback a buscar por nombre en el producto
          if (!needsUpdate && prod.supplier && prod.supplier !== 'N/A') {
             const cleanName = normalizeIdentity(prod.supplier);
             const prov = allProviders.find(pv => pv.name && normalizeIdentity(pv.name) === cleanName);
             if (prov) {
               expiryData.providerName = prov.name;
               expiryData.providerRut = prov.rut;
               needsUpdate = true;
               
               // Actualizar producto también para que en el futuro no falle
               prod.supplierRut = prov.rut;
               prod.supplier = prov.name;
               await db.products.put(prod);
             }
          }
        }
      }
      
      if (needsUpdate) {
        r.data = expiryData;
        await db.dynamic_data.put(r);
      }
    }
    
    console.log("Sanitizacion completada.");
  }
}
