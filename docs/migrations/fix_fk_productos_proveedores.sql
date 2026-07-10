BEGIN;

ALTER TABLE "PRODUCTOS" DROP CONSTRAINT IF EXISTS fk_productos_proveedor;

ALTER TABLE "PRODUCTOS" ADD CONSTRAINT fk_productos_proveedor FOREIGN KEY ("supplierRut") REFERENCES "PROVEEDORES"("rut");

SELECT 'FK corregida exitosamente' AS resultado;

COMMIT;
