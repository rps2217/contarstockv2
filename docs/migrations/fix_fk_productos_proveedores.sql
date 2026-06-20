-- ============================================
-- CORREGIR FK: PRODUCTOS → PROVEEDORES
-- Cambiar de supplierrut → supplierRut
-- ============================================

BEGIN;

-- 1. Dropear la FK existente (si existe)
ALTER TABLE "PRODUCTOS" DROP CONSTRAINT IF EXISTS fk_productos_proveedor;

-- 2. Crear la nueva FK con supplierRut
ALTER TABLE "PRODUCTOS" 
ADD CONSTRAINT fk_productos_proveedor 
FOREIGN KEY ("supplierRut") REFERENCES "PROVEEDORES"("rut");

-- 3. Verificar
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name = 'PRODUCTOS';

COMMIT;
