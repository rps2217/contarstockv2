# Plan de Remediación de Debilidades - ContarStock v2

## Resumen Ejecutivo

Este documento detalla el plan para corregir las debilidades identificadas en el análisis de código. El plan está estructurado en fases progresivas, priorizando seguridad crítica primero.

---

## 📊 Resumen de Problemas Identificados

| Categoría | Cantidad | Prioridad |
|-----------|----------|-----------|
| Críticas | 3 | 🔴 Inmediata |
| Altas | 4 | 🟠 Esta semana |
| Medias | 4 | 🟡 Esta semana |
| Bajas | 4 | 🟢 Cuando haya tiempo |

---

## 🚀 Fases de Implementación

---

## Fase 0: Limpieza Inicial (Semana 1)
**Objetivo:** Reducir ruido y deuda técnica sin riesgo

### Tareas

#### 0.1 Eliminar Archivos de Backup
```bash
# Archivos a eliminar
rm src/services/cloud/EventsSyncService.ts.backup
find src -name "*.backup" -delete
find src -name "*.old" -delete
```

#### 0.2 Eliminar Console.log de Debug
```bash
# Reemplazar con logger estructurado
# ANTES:
console.log('[SessionService] starting...');
console.error("Error:", err);

// DESPUÉS:
logger.debug('Starting session');
logger.error('Session failed', { error: err.message });
```

#### 0.3 Scripts de Limpieza Automatizados
```typescript
// scripts/cleanup.ts
import { exec } from 'child_process';

// 1. Encontrar todos los console.log
// 2. Clasificar: debug (eliminar) vs error (mantener)
// 3. Reemplazar con logger
```

### Entregables
- [ ] 0 archivos .backup en src/
- [ ] 0 console.log de debug en producción
- [ ] Logger estructurado configurado

---

## Fase 1: Seguridad Crítica (Semanas 2-4)
**Objetivo:** Eliminar vulnerabilidades críticas de seguridad

### 1.1 RBAC con Supabase RLS

**Problema:** Roles almacenados en localStorage, manipulables por cliente.

**Solución:** Implementar Row Level Security en Supabase

```sql
-- Habilitar RLS
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE sesiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE conteos ENABLE ROW LEVEL SECURITY;

-- Política para operarios: solo sus datos
CREATE POLICY "operadores_own_data" ON productos
  FOR ALL
  USING (
    auth.jwt() ->> 'role' = 'operador'
    AND ubicacion = (auth.jwt() ->> 'warehouse')
  );

-- Política para supervisores: su sección
CREATE POLICY "supervisores_section" ON productos
  FOR ALL
  USING (
    auth.jwt() ->> 'role' = 'supervisor'
    AND seccion = (auth.jwt() ->> 'section')
  );

-- Política para admins: todo
CREATE POLICY "admins_all" ON productos
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin');
```

**Cambios en código:**
```typescript
// src/store/usePermissionStore.ts
export const usePermissionStore = create<PermissionState>()(
  persist(
    (set, get) => ({
      // ... existente
      
      // AGREGAR: Verificación server-side
      hasPermission: async (permission) => {
        const state = get();
        if (!state.isEnabled) return true;
        
        // Verificar contra servidor para operaciones sensibles
        if (CRITICAL_PERMISSIONS.includes(permission)) {
          return await verifyPermissionWithServer(permission);
        }
        
        return ROLE_PERMISSIONS[state.currentRole]?.includes(permission) ?? false;
      }
    })
  )
);
```

**Archivos a modificar:**
- `src/store/usePermissionStore.ts`
- `src/lib/supabase.ts` (agregar auth)
- Crear `src/lib/auth.ts`

### 1.2 Sanitizar Expression Engine

**Problema:** Expresiones dinámicas podrían ser explotadas.

**Solución:** Whitelist de funciones y validación de contexto

```typescript
// src/lib/expressionEngine.ts - AGREGAR

// Funciones permitidas (whitelist)
const ALLOWED_FUNCTIONS = new Set([
  'now', 'today', 'diffDays', 'contains', 'startsWith', 'endsWith',
  'if', 'abs', 'min', 'max', 'round', 'floor', 'ceil',
  'concat', 'upper', 'lower', 'trim', 'len', 'left', 'right',
  'year', 'month', 'day', 'date', 'datediff'
]);

// Campos permitidos (whitelist por dominio)
const ALLOWED_FIELDS = {
  products: ['stock', 'minStock', 'price', 'name', 'barcode', 'expiryDate'],
  sessions: ['status', 'createdAt', 'erpOrder', 'totalUnits'],
  inventory: ['quantity', 'location', 'batch']
};

// Validador de expresiones
export function validateExpression(expression: string, context: string[]): ValidationResult {
  // 1. Tokenizar expresión
  // 2. Verificar que solo use funciones permitidas
  // 3. Verificar que campos existan en contexto
  // 4. Verificar no haya tokens maliciosos
}
```

### 1.3 Prevenir XSS en Icon.tsx

**Problema:** `dangerouslySetInnerHTML` con path de catálogo.

**Solución:** Validar que path sea SVG válido antes de renderizar

```typescript
// src/shared/components/ui/Icon.tsx

// Validador de path SVG
const SVG_PATH_REGEX = /^[A-Za-z0-9\s\-,\.]+$/;

function sanitizeSvgPath(path: string): string | null {
  // Solo permitir caracteres seguros
  if (!SVG_PATH_REGEX.test(path)) {
    console.warn(`Icon path contains unsafe characters: ${path}`);
    return null;
  }
  
  // Verificar longitud razonable
  if (path.length > 1000) {
    console.warn('Icon path too long');
    return null;
  }
  
  return path;
}
```

### 1.4 Validar URLs de Webhooks (SSRF)

**Problema:** Webhooks pueden apuntar a URLs internas.

**Solución:** Whitelist de dominios permitidos

```typescript
// src/lib/workflowEngine.ts - MODIFICAR

const ALLOWED_WEBHOOK_DOMAINS = [
  'api.example.com',
  'hooks.slack.com',
  'webhook.site'
];

function isValidWebhookUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ALLOWED_WEBHOOK_DOMAINS.some(
      domain => parsed.hostname === domain || parsed.hostname.endsWith('.' + domain)
    );
  } catch {
    return false;
  }
}

async function executeWebhook(action: WorkflowAction, ...) {
  if (!isValidWebhookUrl(action.webhookUrl)) {
    console.error('Webhook URL not in whitelist:', action.webhookUrl);
    return;
  }
  // ... resto del código
}
```

---

## Fase 2: Consistencia de Tipos (Semanas 5-8)
**Objetivo:** Eliminar `as any` y mejorar tipado

### 2.1 Inventario de `as any`

```bash
# Generar lista de archivos con 'as any'
grep -rn "as any" src/ --include="*.ts" --include="*.tsx" | \
  awk -F: '{print $1}' | sort | uniq -c | sort -rn
```

### 2.2 Clasificación de `as any`

```typescript
// Clasificar en categorías:

// A) Mapeos de datos (más común) - Crear interfaces
interface ProductMapping {
  id: string;
  barcode: string;
  stock: number;
  minStock: number;
  // ... campos exactos
}

// B) Props de componentes - Usar genéricos
// ANTES: props as any
// DESPUÉS: props as ComponentProps

// C) Respuestas de API - Definir tipos explícitos
interface SyncResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
```

### 2.3 Interfaces Compartidas

```typescript
// src/types/api.ts
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    timestamp: number;
    requestId: string;
  };
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    hasMore: boolean;
  };
}

// src/types/sync.ts
export interface SyncableRecord {
  id: string;
  syncStatus: 'synced' | 'pending' | 'error';
  lastSyncTimestamp?: number;
  syncError?: string;
}

export interface SyncResult {
  success: boolean;
  recordsProcessed: number;
  recordsFailed: number;
  conflicts: ConflictRecord[];
  duration: number;
}
```

### 2.4 Genéricos para Repositorios

```typescript
// src/repositories/core/BaseRepository.ts
export interface Repository<T extends { id: string }> {
  getById(id: string): Promise<T | null>;
  getAll(): Promise<T[]>;
  save(item: T): Promise<void>;
  delete(id: string): Promise<void>;
  query(filter: Partial<T>): Promise<T[]>;
}

// Implementación tipada
export class ProductRepository implements Repository<Product> {
  async getById(id: string): Promise<Product | null> {
    return await db.products.get(id) ?? null;
  }
  
  async query(filter: Partial<Product>): Promise<Product[]> {
    // Query builder con tipos
  }
}
```

---

## Fase 3: Robustez de Datos (Semanas 9-11)
**Objetivo:** Prevenir pérdida de datos y mejorar resiliencia

### 3.1 PendingBuffer con Persistencia Inmediata

**Problema:** Crash del navegador pierde datos en buffer.

**Solución:** Escribir a IndexedDB inmediatamente, con batch periódico

```typescript
// src/services/sessionService.ts - REFACTORIZAR

interface PendingScan {
  id: string;
  sessionId: string;
  barcode: string;
  quantity: number;
  timestamp: number;
  status: 'buffered' | 'flushed';
}

class ScanBuffer {
  private buffer: PendingScan[] = [];
  private db: IDB;
  private flushThreshold = 5;
  private flushInterval = 1000; // 1 segundo

  constructor() {
    // Auto-flush periódico
    setInterval(() => this.flush(), this.flushInterval);
  }

  async add(scan: Omit<PendingScan, 'id' | 'status'>): Promise<string> {
    const id = crypto.randomUUID();
    const bufferedScan: PendingScan = { ...scan, id, status: 'buffered' };
    
    // ESCRIBIR A INDEXEDDB INMEDIATAMENTE
    await this.db.put('scans_buffered', bufferedScan);
    
    // Mantener en memoria para acceso rápido
    this.buffer.push(bufferedScan);
    
    // Flush si threshold alcanzado
    if (this.buffer.length >= this.flushThreshold) {
      await this.flush();
    }
    
    return id;
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;
    
    const toFlush = [...this.buffer];
    this.buffer = [];
    
    // Mover de buffered a scans (ya no pending)
    await this.db.transaction('rw', ['scans', 'scans_buffered'], async () => {
      for (const scan of toFlush) {
        await this.db.put('scans', scan);
        await this.db.delete('scans_buffered', scan.id);
      }
    });
  }
}

export const scanBuffer = new ScanBuffer();
```

### 3.2 Circuit Breaker Persistente

**Problema:** Estado se pierde en refresh.

**Solución:** Persistir en IndexedDB

```typescript
// src/lib/retry.ts - MODIFICAR

import { db } from '../db';

interface CircuitBreakerState {
  key: string;
  failures: number;
  lastFailure: number;
  state: 'closed' | 'open' | 'half-open';
  nextAttempt?: number;
}

const circuitBreakers: Map<string, CircuitBreakerState> = new Map();
const CACHE_TTL = 60000; // 1 minuto

// Cargar desde IndexedDB al iniciar
async function loadCircuitBreaker(key: string): Promise<CircuitBreakerState | null> {
  const cached = circuitBreakers.get(key);
  if (cached && Date.now() - cached.lastFailure < CACHE_TTL) {
    return cached;
  }
  
  const stored = await db.settings.get(`circuit_breaker_${key}`);
  if (stored?.value) {
    const state = stored.value as CircuitBreakerState;
    circuitBreakers.set(key, state);
    return state;
  }
  
  return null;
}

// Guardar cambios a IndexedDB
async function saveCircuitBreaker(key: string, state: CircuitBreakerState): Promise<void> {
  circuitBreakers.set(key, state);
  await db.settings.put({
    key: `circuit_breaker_${key}`,
    value: state
  });
}
```

### 3.3 Abstacción de localStorage

**Problema:** 121 accesos directos, difícil auditar.

**Solución:** Wrapper tipado

```typescript
// src/lib/storage.ts

type StorageKey = 
  | 'permission-storage'
  | 'theme-preference'
  | 'last-sync-timestamp'
  | 'user-preferences'
  | 'warehouse-context';

interface StorageSchema {
  'permission-storage': PermissionState;
  'theme-preference': ThemePreference;
  'last-sync-timestamp': number;
  'user-preferences': UserPreferences;
  'warehouse-context': WarehouseContext;
}

class TypedStorage {
  get<K extends StorageKey>(key: K): StorageSchema[K] | null {
    const value = localStorage.getItem(key);
    if (!value) return null;
    try {
      return JSON.parse(value) as StorageSchema[K];
    } catch {
      console.error(`Invalid JSON in storage key: ${key}`);
      return null;
    }
  }

  set<K extends StorageKey>(key: K, value: StorageSchema[K]): void {
    localStorage.setItem(key, JSON.stringify(value));
  }

  remove(key: StorageKey): void {
    localStorage.removeItem(key);
  }

  // Audit trail
  setWithAudit<K extends StorageKey>(
    key: K, 
    value: StorageSchema[K],
    reason: string
  ): void {
    const oldValue = this.get(key);
    this.set(key, value);
    
    // Log para auditoría
    logger.audit('STORAGE_CHANGE', {
      key,
      oldValue,
      newValue: value,
      reason,
      timestamp: Date.now()
    });
  }
}

export const storage = new TypedStorage();
```

---

## Fase 4: Refactorización de Arquitectura (Semanas 12+)
**Objetivo:** Simplificar y consolidar

### 4.1 Consolidar Servicios de Sync

**Problema:** 3 implementaciones paralelas.

**Decisión:** Mantener solo `GenericSyncEngineEnhanced` con nombre simplificado.

```typescript
// src/services/sync/SyncEngine.ts (nuevo archivo único)

/*
 * CONSOLIDAR:
 * - GenericSyncEngine.ts (legacy)
 * - GenericSyncEngineEnhanced.ts 
 * - SyncBridge.ts
 * 
 * en este único archivo
 */
```

### 4.2 Resolver Imports Circulares

```typescript
// Diagnosticar
madge --circular src/**/*.ts

// Resolver:
# Opción 1: Refactorizar a barrel exports más granulares
# Opción 2: Usar lazy imports
# Opción 3: Mover tipos compartidos a src/types/

# Ejemplo: src/stores/index.ts
# ANTES (circular):
export * from './useSyncStore';
export * from './usePermissionStore';
export { usePermissions } from '@/shared/hooks'; // CRASH

# DESPUÉS:
export * from './useSyncStore';
export * from './usePermissionStore';
// No exportar desde shared/hooks aquí
```

### 4.3 Rate Limiting en UI

```typescript
// src/lib/rateLimiter.ts

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

class RateLimiter {
  private requests: Map<string, number[]> = new Map();

  isAllowed(key: string, config: RateLimitConfig): boolean {
    const now = Date.now();
    const timestamps = this.requests.get(key) || [];
    
    // Filtrar requests antiguos
    const recent = timestamps.filter(t => now - t < config.windowMs);
    
    if (recent.length >= config.maxRequests) {
      return false;
    }
    
    recent.push(now);
    this.requests.set(key, recent);
    return true;
  }
}

// Usage en sync
const syncRateLimiter = new RateLimiter();

async function triggerSync() {
  if (!syncRateLimiter.isAllowed('sync', { maxRequests: 3, windowMs: 60000 })) {
    toast.error('Demasiadas sincronizaciones. Espera un momento.');
    return;
  }
  // proceder con sync
}
```

---

## 📅 Cronograma Visual

```
SEMANA   | 0    | 1-2   | 3-4   | 5-6   | 7-8   | 9-10  | 11-12 | 13+
---------|------|-------|-------|-------|-------|-------|-------|----
LIMPIEZA |██████|
RBAC     |      |████████|
EXPR SSRF|      |  ████  |██████|
TIPOS    |      |       |██████|██████|
DATOS    |      |       |       |██████|██████|
ARQUITECT|      |       |       |       |██████|██████|
```

---

## 📋 Checklist de Implementación

### Fase 0 - Limpieza
- [ ] Eliminar archivos .backup
- [ ] Eliminar console.log de debug
- [ ] Configurar logger estructurado

### Fase 1 - Seguridad
- [ ] Habilitar RLS en Supabase
- [ ] Implementar verifyPermissionWithServer
- [ ] Whitelist de funciones en Expression Engine
- [ ] Sanitizar SVG paths en Icon.tsx
- [ ] Validar URLs de webhooks

### Fase 2 - Tipos
- [ ] Inventario completo de `as any`
- [ ] Crear interfaces compartidas
- [ ] Refactorizar repositorios con genéricos
- [ ] Tipar respuestas de API

### Fase 3 - Robustez
- [ ] PendingBuffer con persistencia inmediata
- [ ] Circuit Breaker persistente
- [ ] Wrapper tipado de localStorage
- [ ] Agregar auditoría de cambios

### Fase 4 - Arquitectura
- [ ] Consolidar servicios de sync
- [ ] Resolver imports circulares
- [ ] Implementar rate limiting
- [ ] Documentar decisiones técnicas

---

## 🎯 Métricas de Éxito

| Métrica | Antes | Después |
|---------|-------|---------|
| `as any` | 393 | < 50 |
| console.log debug | 60+ | 0 |
| Archivos .backup | 1+ | 0 |
| localStorage directo | 121 | < 10 |
| Servicios sync | 3 | 1 |
| Circuit breaker persistente | No | Sí |
| Rate limiting | No | Sí |

---

## ⚠️ Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Romper sync existente | Alta | Crítico | Tests E2E antes/depués, feature flag |
| Pérdida de datos en refactor | Media | Crítico | Backup antes de cada fase, rollback plan |
| Performance degradada | Baja | Medio | Benchmarks antes/después |
| Conflicto con cambios paralelos | Media | Bajo | Branch dedicado, code review obligatorio |

---

*Documento generado: 2026-07-15*
*Versión del plan: 1.0*
