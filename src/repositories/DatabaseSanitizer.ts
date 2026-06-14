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
    
    // 3. Sanitizar Expiry Records
    const records = await db.expiry_records.toArray();
    const allProviders = await db.providers.toArray();
    
    for (const r of records) {
      let needsUpdate = false;
      
      const cleanBarcode = normalizeSku(r.barcode);
      if (r.barcode !== cleanBarcode) {
        r.barcode = cleanBarcode;
        needsUpdate = true; // Wait! If primary key changed, we can't just put(). But id is a UUID, barcode is a field. So put() is fine.
      }
      
      // Intentar forzar el cruce si falla
      if (!r.providerName || r.providerName === 'N/A' || r.providerName === 'SIN PROVEEDOR') {
        const prod = await db.products.get(r.barcode);
        if (prod) {
          // Si el producto tiene RUT, buscamos por RUT
          if (prod.supplierRut) {
            const cleanRut = normalizeIdentity(prod.supplierRut);
            const prov = allProviders.find(pv => pv.rut === cleanRut);
            if (prov) {
              r.providerName = prov.name;
              (r as any).providerRut = prov.rut;
              needsUpdate = true;
            }
          } 
          
          // Fallback a buscar por nombre en el producto
          if (!needsUpdate && prod.supplier && prod.supplier !== 'N/A') {
             const cleanName = normalizeIdentity(prod.supplier);
             const prov = allProviders.find(pv => pv.name && normalizeIdentity(pv.name) === cleanName);
             if (prov) {
               r.providerName = prov.name;
               (r as any).providerRut = prov.rut;
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
        await db.expiry_records.put(r);
      }
    }
    
    console.log("Sanitizacion completada.");
  }
}
