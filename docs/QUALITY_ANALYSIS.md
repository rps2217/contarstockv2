# Análisis de Calidad - ContarStock v2

**Fecha:** 2026-07-17  
**Analista:** OpenHands Agent  
**Versión:** Main branch

---

## 📊 RESUMEN EJECUTIVO

| Categoría          | Score  | Estado             |
| ------------------ | ------ | ------------------ |
| **Testing**        | 7.2/10 | ⚠️ Necesita mejora |
| **Seguridad**      | 8.5/10 | ✅ Aceptable       |
| **Performance**    | 8.0/10 | ✅ Bueno           |
| **Mantenibilidad** | 5.5/10 | 🔴 Crítico         |
| **Accesibilidad**  | 6.0/10 | ⚠️ Necesita mejora |

---

## 🔴 PRIORIDAD CRÍTICA (Atender inmediatamente)

### 1. 📦 Archivos Monolíticos (>1000 LOC)

| Archivo                    | LOC   | Problema                    |
| -------------------------- | ----- | --------------------------- |
| `UnifiedSyncEngine.ts`     | 1,491 | Dios de sincronización      |
| `ExpiryPage.tsx`           | 1,378 | UI + lógica mezclados       |
| `TheoreticalLoadsPage.tsx` | 1,325 | UI + lógica mezclados       |
| `ThermalPrinterEngine.ts`  | 1,144 | Lógica de hardware acoplada |
| `EventsModal.tsx`          | 1,054 | Componente gigante          |

**Impacto:**

- Imposible de mantener
- Difícil de testear
- Difícil de reutilizar
- Alto acoplamiento

**Acción:** Refactorizar en módulos pequeños (máx 300 LOC)

---

### 2. 🔒 Tipos `any` (795 ocurrencias)

```typescript
// PROBLEMA: 795 uses de 'any' en el codebase
const handleData = (data: any) => { ... }
async function fetchSomething(): Promise<any> { ... }
```

**Impacto:**

- Sin type safety
- Errores solo en runtime
- IDE no puede ayudar

**Acción:**

- Reemplazar con tipos específicos
- Usar `unknown` donde sea necesario
- Crear interfaces/tipos compartidos

---

### 3. ⚠️ Memory Leaks Potenciales

| Patrón                          | Cantidad | Riesgo   |
| ------------------------------- | -------- | -------- |
| `addEventListener` sin remove   | 78       | 🔴 Alto  |
| `setInterval` sin clearInterval | 45       | 🔴 Alto  |
| `useEffect` sin cleanup         | ¿?       | 🟡 Medio |

**Impacto:**

- App se vuelve lenta con uso prolongado
- Crash eventual
- Batería agotada (mobile)

**Acción:** Auditar todos los event listeners e intervals

---

## 🟠 PRIORIDAD ALTA (Atender esta semana)

### 4. 🧪 Cobertura de Tests Baja

```
Tests actuales: 964
LOC total: 133,953
Ratio: 1 test por 139 LOC

Archivos sin tests: ~600 de 705 (85%)
```

**Problemas:**

- Features sin tests = regresiones
- Código legacy no documentado
- Miedo a refactorizar

**Acción:**

- Agregar tests para archivos críticos
- Priorizar: services, hooks, repositories
- Target: 30% coverage mínimo

---

### 5. 🔧 try/catch sin manejo de errores

```typescript
// PROBLEMA: 5 archivos con catch(err) genérico
catch (err) {
  // No se loguea ni se maneja apropiadamente
}
```

**Archivos afectados:**

- `PerformanceWorker.ts`
- `ThermalPrinterEngine.ts`
- `useAudit.ts`
- `useExpiryActions.ts`

**Acción:** Implementar manejo de errores consistente con logger

---

### 6. ♿ Accesibilidad

| Problema                 | Cantidad |
| ------------------------ | -------- |
| Botones sin `aria-label` | 5+       |
| Imágenes sin `alt`       | 4        |
| Inputs sin labels        | ¿?       |

**Impacto:**

- App no usable con lector de pantalla
- Violación WCAG 2.1

**Acción:** Audit de accesibilidad completo

---

## 🟡 PRIORIDAD MEDIA (Atender este mes)

### 7. 📝 Deuda Técnica

| Tipo  | Cantidad |
| ----- | -------- |
| TODO  | 12       |
| FIXME | 5        |
| HACK  | 2        |

**Acción:** Resolver o crear tickets para cada uno

---

### 8. 🎨 Code Smells

- Imports no utilizados
- Variables no usadas
- Funciones duplicadas (aunque se han centralizado algunos)
- Comentarios redundantes

**Acción:** Run `eslint --fix` regularmente

---

## ✅ ESTADO ACEPTABLE

### 9. Seguridad ✅

| Aspecto                       | Estado                 |
| ----------------------------- | ---------------------- |
| Secretos hardcodeados         | ✅ No detectados       |
| XSS (dangerouslySetInnerHTML) | ✅ Solo para SVG paths |
| eval() peligroso              | ✅ No usado            |

**Nota:** Solo 2 usos de `dangerouslySetInnerHTML`, ambos para renderizar SVGs (legítimo)

---

### 10. Performance ✅

| Métrica             | Valor            |
| ------------------- | ---------------- |
| Bundle total (gzip) | 1,231 KB         |
| Bundle principal    | 440 KB           |
| Lazy loading        | ✅ Implementado  |
| Preloads críticos   | ✅ Implementados |

---

## 📈 MÉTRICAS GENERALES

```
╔════════════════════════════════════════════════════════╗
║              CONTARSTOCK v2 - QUALITY SCORE            ║
╠════════════════════════════════════════════════════════╣
║  📊 LOC Totales:          133,953                    ║
║  📁 Archivos TypeScript:      705                     ║
║  🧪 Tests:                    964                     ║
║  📈 Cobertura:              ~7.2%                      ║
║  🔴 Archivos Críticos:         5 (>1000 LOC)          ║
║  🔒 Tipos 'any':             795                      ║
║  ⚠️ Memory Leaks:            123                       ║
║  ♿ Accesibilidad:          ⚠️ Baja                   ║
╚════════════════════════════════════════════════════════╝
```

---

## 🎯 ROADMAP DE MEJORA

```
┌─────────────────────────────────────────────────────────┐
│                    FASE 1: CRÍTICO                     │
│                    (Semana 1-2)                         │
├─────────────────────────────────────────────────────────┤
│  □ Reducir UnifiedSyncEngine.ts (1491 → 300 LOC)      │
│  □ Reducir ExpiryPage.tsx (1378 → 300 LOC)            │
│  □ Reducir TheoreticalLoadsPage.tsx (1325 → 300 LOC)   │
│  □ Eliminar tipos 'any' en archivos críticos           │
│  □ Fix memory leaks en event listeners                 │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                    FASE 2: ALTO                         │
│                    (Semana 3-4)                         │
├─────────────────────────────────────────────────────────┤
│  □ Agregar tests para services críticos                │
│  □ Implementar manejo de errores consistente            │
│  □ Audit de accesibilidad WCAG 2.1                    │
│  □ Reducir ThermalPrinterEngine.ts                     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                    FASE 3: MEDIO                        │
│                    (Mes 2)                              │
├─────────────────────────────────────────────────────────┤
│  □ Resolver TODOs/FIXMEs                               │
│  □ Aumentar cobertura a 30%                            │
│  □ Refactorizar EventsModal.tsx                        │
│  □ ESLint + Prettier enforced en CI                    │
└─────────────────────────────────────────────────────────┘
```

---

## 📋 CHECKLIST DE ACCIÓN

### Esta semana:

- [ ] Reducir UnifiedSyncEngine.ts a 5 módulos
- [ ] Eliminar 50% de tipos `any` en archivos críticos
- [ ] Fix setInterval sin clearInterval

### Este mes:

- [ ] Coverage de tests: 7% → 20%
- [ ] Reducir páginas a max 300 LOC
- [ ] Audit accesibilidad
- [ ] Resolver TODOs pendientes

### Este quarter:

- [ ] Coverage de tests: 20% → 40%
- [ ] Eliminar todos los tipos `any`
- [ ] ESLint strict mode
- [ ] CI con quality gates
