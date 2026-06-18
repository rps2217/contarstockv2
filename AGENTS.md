# ContarStock v2 - Agente de Desarrollo

## Estructura del Proyecto

```
src/
├── features/           # Modulos de dominio
│   ├── events/
│   ├── counting/
│   ├── sync/
│   └── ...
├── repositories/       # Acceso a datos
│   ├── base/           # IRepository, BaseRepository
│   └── ScanRepository.ts
├── services/          # Logica de negocio
├── shared/            # Componentes compartidos
└── types/             # Definiciones de tipos
```

## TypeScript Conventions

### Manejo de Errores
- Usar `handleError(err: unknown)` para procesar errores en catch blocks
- Para `logger.error()`, pasar strings: `logger.error('MODULE', String(err))`
- Usar `const errorMsg = handleError(err)` en catch blocks antes de usar `errorMsg`

### Tipos de Sync
- `SyncQueueItem` y tipos relacionados estan en `src/types/global/sync.ts`
- Re-exportados en `src/features/sync/types/index.ts`
- No duplicar definiciones de tipos de sync

### Servicios Sync
- `pushBatch<T extends object>()` - usa generics, no `any[]`
- `sanitizeData(data: SupabaseRow): SupabaseRow` - tipos estrictos
- `formatError(e: unknown): string` - metodo existente para formatear errores

### UI Components
- `SyncStatusBadge` usa `Record<string, string>` para acceso dinamico
- `InputProps` debe usar `Omit<InputHTMLAttributes, 'size'>` para evitar conflictos

## Repository Pattern

### Estructura
```
src/repositories/
├── base/
│   ├── IRepository.ts         # Interfaces
│   ├── BaseRepository.ts      # Implementacion Dexie
│   ├── SyncableRepository.ts  # Para entidades con sync
│   └── index.ts
├── ScanRepository.ts          # Repositorio de ejemplo
└── index.ts
```

### Uso
```typescript
// Antiguo (mantener compatibilidad)
import { ScanRepository } from '@/repositories';
await ScanRepository.getAll();

// Nuevo codigo
import { scanRepository } from '@/repositories';
await scanRepository.getAll();
```

## Scripts Disponibles

```bash
npm run dev          # Vite dev server
npm run build        # Production build
npm run typecheck   # tsc --noEmit
npm run lint         # eslint
npm run format       # prettier --write .
npm run test:run     # vitest (single run)
npm run test         # vitest (watch mode)
```

## Refactoring Progress (2024-06-18)

### Completado:
- FASE 0: Setup DX (Husky, ESLint, Prettier, Scripts)
- FASE 1: Repository Pattern Base (IRepository, BaseRepository, SyncableRepository)

### En Progreso:
- FASE 2: Repository Pattern por Dominios

### Pendiente:
- FASE 3: FSM para Sync
- FASE 4: Commands para Sync
- FASE 5: Domain Stores
- FASE 6: Design Tokens
- FASE 7: Type Ownership
- FASE 8: Testing

### Metricas:
- syncManager.ts: 495 lineas (meta: ~150)
- Repository coverage: 50% (meta: 80%)
- Errores TypeScript: 0
