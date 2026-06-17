# Architecture Rules
- Use Lego Architecture: Deeply decouple components.
- Extracted layouts go to `src/shared/components/layout/`.
- Repositories must isolate Dexie DB operations (`src/repositories/`).
- Modules should use `VirtualList` for 100+ items, not inline manual generic virtualizers to avoid duplicated boilerplate.
- Use Domain feature hooks (e.g., `useHammerLogic`, `useExpiryDatabase`) returning `{ state, actions }` interface to eliminate logic from React components.
- Do NOT merge components; split them when they exceed 150-200 lines if feasible (specially extract Modals and lists).

## Refactoring Progress (2024-06-17)
### Completed Phases:
- **FASE 1**: Componentes refactorizados (5/5) - SlicesPage, ReportsPage, SyncCenterPage, CreateEventModal, SupabaseAuditorModal
- **FASE 2**: TypeScript - Tipos globales en `src/types/global/`
- **FASE 3**: Hooks divididos - useEventQueries, useEventMutations, useEventFilters

### Standard Module Structure:
```
src/features/{module}/
├── {Module}Page.tsx          # Orchestrator (~150-350 lines)
├── hooks/
│   ├── index.ts
│   ├── use{Module}Queries.ts  # Data fetching + reactive queries
│   ├── use{Module}Mutations.ts # CRUD operations
│   └── use{Module}Filters.ts # Filters + search + selection
├── components/
│   ├── index.ts
│   ├── {Component}Header.tsx
│   ├── {Component}Form.tsx
│   ├── {Component}List.tsx
│   └── {Component}Modal.tsx
├── types/
│   └── {Module}.ts
└── constants/
    └── {Module}Constants.ts

src/types/global/
├── common.ts   # SyncStatus, AppTheme, OperationResult, etc.
├── sync.ts     # Sync-specific types
└── index.ts
```

### UI Components Library:
- `src/shared/components/ui/buttons.tsx` - Button, SecondaryButton, DangerButton, GhostButton
- `src/shared/components/ui/inputs.tsx` - Input, Textarea, Select, Checkbox
- `src/shared/components/ErrorBoundary.tsx` - Error handling

### Shared Utils:
- `src/shared/utils/common.ts` - normalizeSku, formatDate, debounce, retryWithBackoff, etc.
