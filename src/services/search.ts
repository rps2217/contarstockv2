
import { Product } from '../types';

/**
 * MOTOR DE BÚSQUEDA INDUSTRIAL v2.0
 * Realiza una búsqueda ponderada:
 * 1. Coincidencia exacta de SKU (Prioridad Máxima)
 * 2. SKU que contiene el término
 * 3. Nombre que contiene el término
 */
export const fuzzySearchProducts = (products: Product[], query: string, limit: number = 50): Product[] => {
 const cleanQuery = query.trim().toLowerCase();
 if (!cleanQuery) return products.slice(0, limit);

 const tokens = cleanQuery.split(/\s+/);
 
 return products
 .map(p => {
 let score = 0;
 const name = p.name.toLowerCase();
 const sku = p.barcode.toLowerCase();
 
 // Prioridad absoluta: SKU exacto
 if (sku === cleanQuery) score += 1000;
 
 // Prioridad alta: El SKU contiene el número
 if (sku.includes(cleanQuery)) score += 500;

 // Coincidencia por tokens en el nombre
 tokens.forEach(token => {
 if (name.includes(token)) score += 10;
 if (name.startsWith(token)) score += 5;
 });

 return { product: p, score };
 })
 .filter(item => item.score > 0)
 .sort((a, b) => b.score - a.score)
 .map(item => item.product)
 .slice(0, limit);
};

// Forced GitHub sync
