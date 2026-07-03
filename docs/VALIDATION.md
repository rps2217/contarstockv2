# Validación de Datos con Zod

**Fecha:** 2026-07-02
**Estado:** ✅ IMPLEMENTADO

---

## Resumen

Se implementó validación de datos usando **Zod** para garantizar la integridad de los datos antes de guardarlos en IndexedDB o enviarlos a Supabase.

---

## Esquemas Disponibles

| Schema | Uso | Validaciones |
|--------|-----|-------------|
| `ProductSchema` | Productos | barcode, name, price, unitsPerBox |
| `ProviderSchema` | Proveedores | rut (chileno), name, withdrawalDays |
| `CustomerSchema` | Clientes | rut, email, phone |
| `ExpiryRecordSchema` | Vencimientos | barcode, mm (1-12), yyyy, quantity |
| `SessionSchema` | Sesiones | id (uuid), status, erpOrder |
| `EventSchema` | Eventos | barcode, event type, quantity |

---

## Schemas Base

| Schema | Descripción |
|--------|-------------|
| `barcodeSchema` | 8-50 caracteres alfanuméricos |
| `rutSchema` | RUT chileno (formato XX.XXX.XXX-X) |
| `locationSchema` | Mayúsculas, números, guiones |
| `dateSchema` | Fechas ISO, timestamps, Date objects |

---

## Uso

### Validación Simple

```typescript
import { validateProduct, validateBarcode } from '@/lib/schemas';

// Validar producto
const product = validateProduct(rawData);

// Validar barcode
const barcode = validateBarcode(rawBarcode);
```

### Validación sin Throw

```typescript
import { safeValidate, ProductSchema } from '@/lib/schemas';

const result = safeValidate(ProductSchema, rawData);

if (result.success) {
  console.log('Válido:', result.data);
} else {
  console.log('Errores:', result.errors);
}
```

### Hook de Vencimientos

```typescript
import { useExpiry } from '@/features/expiry/hooks';

const { createRecord } = useExpiry();

// createRecord ahora valida con Zod antes de guardar
const id = await createRecord({
  barcode: '12345678',
  productName: 'Producto',
  mm: 6,
  yyyy: 2026,
  quantity: 10,
});

// Si los datos son inválidos, retorna null y muestra toast de error
```

---

## Integración en Hooks

###useExpiry
- ✅ `createRecord()` - Valida con `ExpiryRecordSchema`

### Próximos hooks (por integrar)

| Hook | Estado |
|------|--------|
| useProducts | Pendiente |
| useProviders | Pendiente |
| useCustomers | Pendiente |
| useEvents | Pendiente |
| useSessions | Pendiente |

---

## Cómo Agregar Validación a un Hook

```typescript
import { z } from 'zod';
import { validate, safeValidate, ValidationError } from '@/lib/schemas';

// 1. Crear schema
const MySchema = z.object({
  field1: z.string().min(1),
  field2: z.number().positive(),
});

// 2. Usar safeValidate en tu función
const createItem = async (data: unknown) => {
  const result = safeValidate(MySchema, data);
  
  if (!result.success) {
    const errors = result.errors.map(e => `${e.path}: ${e.message}`).join('; ');
    throw new ValidationError(`Invalid data: ${errors}`, result.errors);
  }
  
  // Continuar con result.data (ya validado)
  return saveToDb(result.data);
};
```

---

## Mensajes de Error

Los errores de validación se muestran al usuario como toasts:

```
Datos inválidos: barcode: Barcode mínimo 8 caracteres
```

O capturarlos programáticamente:

```typescript
import { ValidationError } from '@/lib/schemas';

try {
  validateProduct(data);
} catch (error) {
  if (error instanceof ValidationError) {
    console.log(error.errors); // Array de errores Zod
  }
}
```
