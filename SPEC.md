# SPEC.md - ContarStock Industrial

## Visión

Transformar ContarStock de aplicación funcional a **sistema industrial** con:

- **Fiabilidad**: 99.9% uptime, error handling robusto
- **Mantenibilidad**: Código legible, tipado fuerte, tests comprehensivos
- **Escalabilidad**: Arquitectura modular, servicios desacoplados
- **Observabilidad**: Logging estructurado, métricas, alertas

---

## Estado Actual vs Target

### Métricas de Calidad

| Métrica                     | Actual          | Target | Prioridad  |
| --------------------------- | --------------- | ------ | ---------- |
| Tipos `any`                 | 360             | <50    | 🔴 CRÍTICA |
| Cobertura tests             | 7.2%            | 30%+   | 🔴 CRÍTICA |
| LOC en archivos grandes     | 8 archivos >400 | 0      | 🟡 ALTA    |
| Console.log residual        | 0               | 0      | 🟢 OK      |
| Memory leaks                | ~78 listeners   | 0      | 🔴 CRÍTICA |
| JSDoc en funciones públicas | <20%            | 80%+   | 🟡 ALTA    |

### Baseline 2026-07-18

```
Tipos 'any': 360
Archivos >400 LOC: 8
Tests: 915 passing
```

### Archivos Monolíticos a Refactorizar

| Archivo                  | LOC Actual | Target | Estado       |
| ------------------------ | ---------- | ------ | ------------ |
| UnifiedSyncEngine.ts     | 1,491      | <500   | ⏳ PENDIENTE |
| ExpiryPage.tsx           | 1,378      | <400   | ⏳ PENDIENTE |
| TheoreticalLoadsPage.tsx | 1,325      | <400   | ⏳ PENDIENTE |
| ThermalPrinterEngine.ts  | 1,144      | <500   | ⏳ PENDIENTE |
| EventsModal.tsx          | 1,054      | <400   | ⏳ PENDIENTE |

---

## Reglas de Código Industrial

### 1. Tipado Estricto

```typescript
// ❌ ANTES
const handleData = (data: any) => {
  return data.id;
};

// ✅ DESPUÉS
interface DataItem {
  id: string;
  name: string;
  timestamp: number;
}

const handleData = (data: DataItem): string => {
  return data.id;
};
```

### 2. Error Handling

```typescript
// ❌ ANTES
async function fetchData() {
  const data = await api.get();
  return data;
}

// ✅ DESPUÉS
async function fetchData(): Promise<DataItem> {
  try {
    const data = await api.get();
    logger.info('Data fetched', { count: data.length });
    return data;
  } catch (error) {
    logger.error('Failed to fetch data', { error: error.message });
    throw new DataFetchError('No se pudo obtener datos', { cause: error });
  }
}
```

### 3. Logging Estructurado

```typescript
// Usar logger con contexto
logger.info('Operation completed', {
  operation: 'sync',
  duration: 1500,
  recordsProcessed: 42,
  errors: 0,
});
```

### 4. Tests Mínimos por Módulo

| Tipo de Archivo | Tests Mínimos                |
| --------------- | ---------------------------- |
| Repository      | 5-10 tests por método CRUD   |
| Service         | 3-5 tests por método público |
| Hook            | 2-3 tests por estado         |
| Componente UI   | 1-2 tests de render          |

---

## Plan de Ejecución

### Sprint 1: Fundamentos (1-2 semanas)

- [ ] Eliminar tipos `any` residuales (<50 remaining)
- [ ] Configurar ESLint con reglas estrictas
- [ ] Agregar 100 tests de integración
- [ ] Documentar arquitectura en README.md

### Sprint 2: Modularización (3-4 semanas)

- [ ] Extraer SyncFSM de UnifiedSyncEngine
- [ ] Dividir ExpiryPage en componentes
- [ ] Separar TheoreticalLoadsPage
- [ ] Refactorizar ThermalPrinterEngine

### Sprint 3: Robustez (5-6 semanas)

- [ ] Error handling en todos los servicios
- [ ] Retry logic con exponential backoff
- [ ] Circuit breaker para APIs externas
- [ ] Health checks implementados

### Sprint 4: Observabilidad (7-8 semanas)

- [ ] Logging estructurado en toda la app
- [ ] Métricas de rendimiento
- [ ] Alertas configuradas
- [ ] Dashboard de salud del sistema

---

## Checklist de Entrega

### Obligatorio para Merge

- [ ] 0 errores de TypeScript (`npx tsc --noEmit`)
- [ ] 0 advertencias de ESLint
- [ ] Cobertura de tests >25%
- [ ] JSDoc en funciones exportadas
- [ ] No hay `any` sin justificación documentada

### Nice to Have

- [ ] Cobertura >40%
- [ ] Integración continua configurada
- [ ] Pre-commit hooks activos
- [ ] Dokumentation en español e inglés

---

## Definición de "Industrial"

Un sistema es **industrial** cuando:

1. **Confiable**: Funciona 24/7 sin supervisión constante
2. **Auditable**: Cada acción se registra y rastrea
3. **Testeable**: Cada función tiene tests automatizados
4. **Tipado**: El compilador previene errores antes de producción
5. **Documentado**: Un nuevo desarrollador entiende el código en <1 día
6. **Monitoreado**: Los problemas se detectan antes que los usuarios los reporten

---

_Creado: 2026-07-18_
_Última actualización: 2026-07-18_
