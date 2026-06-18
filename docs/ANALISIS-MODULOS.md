# Análisis de Módulos - ContarStock v2

## Resumen Ejecutivo

La aplicación tiene **18 módulos** en `src/features/`. Se identificaron varias redundancias y oportunidades de consolidación.

---

## 1. MÓDULOS IDENTIFICADOS

### Módulos de NAVEGACIÓN PRINCIPAL
| Módulo | Archivos | Función Principal |
|--------|----------|------------------|
| `dashboard` | 3 | Panel principal de inicio |
| `reports` | 13 | Generación de reportes |
| `inventory` | 15 | Vista de inventario |
| `sync` | 30 | Gestión de sincronización |
| `settings` | 22 | Configuración de la app |

### Módulos OPERATIVOS (Conteo/Procesos)
| Módulo | Archivos | Función Principal |
|--------|----------|------------------|
| `events` | 33 | Eventos de inventario (ALTA) |
| `reception` | 14 | Recepción de mercancía |
| `counting` | 9 | Conteo de stock físico |
| `expiry` | 12 | Control de vencimientos |
| `hammer` | 5 | Conteo rápido |

### Módulos de GESTIÓN (CRUD)
| Módulo | Archivos | Función Principal |
|--------|----------|------------------|
| `customers` | 4 | Gestión de clientes |
| `suppliers` | 7 | Gestión de proveedores |
| `sessions` | 1 | Tipos de sesión |
| `slices` | 13 | Cortes de inventario |

---

## 2. REDUNDANCIAS IDENTIFICADAS

### 🔴 CRÍTICA: session vs sessions

```
src/features/session/    → types/, store/ (TypeScript types)
src/features/sessions/   → constants/ (constantes de sesión)
```

**Problema:** Nombres confusos y split artificial.
**Solución:** Unificar en `session/` con subdirectorios `types/`, `store/`, `constants/`

---

### 🟡 MODERADA: counting vs hammer

| Módulo | Propósito | ¿Es similar? |
|--------|-----------|-------------- |
| `counting` | Conteo físico de stock | Similar a hammer |
| `hammer` | Conteo rápido | Es un atajo de counting |

**Análisis:**
- Ambos usan el mismo flujo: escanear → contar → guardar
- `hammer` es un "alias" de funcionalidad de counting
- La diferencia está en la UI (minimal vs completo)

---

### 🟡 MODERADA: inventory vs DatabaseView

En `App.tsx`:
```typescript
const DatabaseView = lazyWithRetry(() => import('@/features/inventory/InventoryPage'));
```

**Problema:** Mismo componente referenciado con 2 nombres.

---

## 3. FLUJO DE DEPENDENCIAS

```
DASHBOARD (Punto de entrada)
        │
        ├── INVENTORY ──► SYNC ──► Supabase/DexieDB
        ├── EVENTS ──────► SYNC
        ├── RECEPTION ───► SYNC
        ├── COUNTING ────► SYNC
        ├── EXPIRY ──────► SYNC
        │
        └── REPORTS (consume de todos)
```

---

## 4. RECOMENDACIONES

### Prioridad ALTA

| Acción | Motivo |
|--------|--------|
| **Unificar `session` + `sessions`** | Duplicación de nombres |
| **Renombrar `DatabaseView`** | Alias innecesario |
| **Investigar `dynamic`** | Propósito poco claro |

### Prioridad MEDIA

| Acción | Motivo |
|--------|--------|
| **Evaluar `hammer` vs `counting`** | Posible unificación |
| **Consolidar stores** | Muchos stores dispersos |

---

## 5. CONCLUSIÓN

### Módulos potencialmente REDUNDANTES:
1. **`session` vs `sessions`** - Claramente duplicado
2. **`hammer` vs `counting`** - Similar funcionalidad
3. **`DatabaseView` vs `InventoryPage`** - Alias innecesario
4. **`dynamic`** - Propósito poco claro

### Siguiente paso recomendado:
**FASE 9: Unificar `session` + `sessions` y limpiar `DatabaseView`**

---

*Análisis generado: 2026-06-18*
